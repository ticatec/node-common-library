import Field from "./Field.js";
import fs from "fs";
import {getLogger, Logger} from "../Logger.js";
import PaginationList from "./PaginationList.js";
import CommonSearchCriteria from "./CommonSearchCriteria.js";

type PostConstructionFun = (obj: any) => void;

export {PostConstructionFun};

export default abstract class DBConnection {

    protected readonly logger: Logger;

    protected constructor() {
        this.logger = getLogger("SQL");
    }

    /**
     * Begins a database transaction.
     * @abstract
     */
    abstract beginTransaction(): Promise<void>;

    /**
     * Commits the current database transaction.
     * @abstract
     */
    abstract commit(): Promise<void>;

    /**
     * Rolls back the current database transaction.
     * @abstract
     */
    abstract rollback(): Promise<void>;

    /**
     * Closes the underlying database connection.
     * @abstract
     */
    abstract close(): Promise<void>;

    /**
     * Executes a raw SQL statement.
     * @param sql - SQL query string.
     * @protected
     * @abstract
     * @returns Promise resolving to execution result.
     */
    protected abstract executeSQL(sql: string): Promise<any>;

    /**
     * Executes an UPDATE / DELETE / INSERT query and returns the number of affected rows.
     * @param sql - SQL query string.
     * @param params - Parameter array.
     * @abstract
     * @returns Promise resolving to the number of affected rows.
     */
    abstract executeUpdate(sql: string, params: Array<any>): Promise<number>;

    /**
     * Inserts a single record.
     * @param sql - INSERT SQL query string.
     * @param params - Parameter array.
     * @abstract
     * @returns Promise resolving to insertion result.
     */
    abstract insertRecord(sql: string, params: Array<any>): Promise<any>;

    /**
     * Updates matching records.
     * @param sql - UPDATE SQL query string.
     * @param params - Parameter array.
     * @abstract
     * @returns Promise resolving to update result.
     */
    abstract updateRecord(sql: string, params: Array<any>): Promise<any>;

    /**
     * Deletes matching records.
     * @param sql - DELETE SQL query string.
     * @param params - Parameter array.
     * @abstract
     * @returns Promise resolving to the number of affected rows.
     */
    abstract deleteRecord(sql: string, params: Array<any>): Promise<number>;

    /**
     * Extracts the count value from a query result object (defaults to key 'cc').
     * @param data - Result object containing count information.
     * @param key - Column key for the count (defaults to 'cc').
     * @protected
     * @returns Parsed integer count.
     */
    protected getCount(data: any, key: string = 'cc'): number {
        const s = data == null ? null : data[key];
        return s == null ? 0 : parseInt(s, 10);
    }

    /**
     * Evaluates whether a value represents a boolean true.
     * Supports 1/0, '1'/'0', 'T'/'F', 't'/'f', true/false.
     * @param value - Target value.
     * @protected
     * @returns True if value represents boolean truth.
     */
    protected getBoolean(value: any): boolean {
        if (value === 1 || value === '1' || value === 'T' || value === 't' || value === true) {
            return true;
        }
        if (value === 0 || value === '0' || value === 'F' || value === 'f' || value === false) {
            return false;
        }
        return !!value;
    }

    /**
     * Converts specified fields on an object to boolean values.
     * Supports nested field paths (e.g. 'user.isActive').
     * @param data - Data object.
     * @param fields - Array of field property paths.
     * @protected
     */
    protected convertBooleanFields(data: any, fields: Array<string>): void {
        if (!data || !fields || fields.length === 0) {
            return;
        }

        fields.forEach(fieldPath => {
            const parts = fieldPath.split('.');
            let current = data;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (current[part] == null) {
                    return;
                }
                current = current[part];
            }

            const lastKey = parts[parts.length - 1];
            if (current && current[lastKey] != null) {
                current[lastKey] = this.getBoolean(current[lastKey]);
            }
        });
    }

    /**
     * Executes a count query and returns the count value.
     * @param sql - Count SQL query.
     * @param params - Query parameters.
     * @param key - Column key for count (defaults to 'cc').
     */
    async executeCountSQL(sql: string, params: Array<any>, key: string = 'cc'): Promise<number> {
        return this.getCount(await this.find(sql, params), key);
    }

    /**
     * Executes a quick paginated query.
     * @param sql - SQL query string.
     * @param params - Parameter array.
     * @param pageNo - Page number (defaults to 1).
     * @param rowCount - Number of rows per page (defaults to 25).
     */
    async quickSearch(sql: string, params: Array<any> = [], pageNo: number = 1, rowCount: number = 25): Promise<any> {
        pageNo = pageNo < 1 ? 1 : pageNo;
        let offset = (pageNo - 1) * rowCount;
        let count = await this.executeCountSQL(`select count(*) as cc from (${sql}) a`, params);
        if (count > 0 && offset < count) {
            let list = await this.listQuery(`${sql} ${this.getRowSetLimitClause(rowCount, offset)}`, params);
            return {
                list,
                hasMore: list.length < count
            };
        } else {
            return {
                list: [],
                hasMore: false
            };
        }
    }

    /**
     * Executes a SELECT query returning a list of mapped objects.
     * @param sql - SQL query string.
     * @param params - Parameter array.
     * @param postConstruction - Optional post-construction callback per object.
     * @param booleanFields - Field names to coerce to boolean values.
     */
    async listQuery(sql: string, params: Array<any> | null = null, postConstruction: PostConstructionFun | null = null, booleanFields?: Array<string>): Promise<Array<any>> {
        let result = await this.fetchData(sql, params);
        let list = this.resultToList(result);
        list.forEach(data => {
            if (booleanFields && booleanFields.length > 0) {
                this.convertBooleanFields(data, booleanFields);
            }
            if (postConstruction) {
                postConstruction(data);
            }
        });
        return list;
    }

    /**
     * Queries a single record. Returns the first record if multiple match.
     * @param sql - SQL query string.
     * @param params - Parameter array.
     * @param postConstruction - Optional post-construction callback for the mapped object.
     * @param booleanFields - Field names to coerce to boolean values.
     */
    async find(sql: string, params: Array<any> | null = null, postConstruction: PostConstructionFun | null = null, booleanFields?: Array<string>): Promise<any> {
        let result = await this.fetchData(sql, params);
        let row = this.getFirstRow(result);
        if (row) {
            if (booleanFields && booleanFields.length > 0) {
                this.convertBooleanFields(row, booleanFields);
            }
            if (postConstruction) {
                postConstruction(row);
            }
        }
        return row;
    }

    /**
     * Reads a SQL file, strips comments, and splits into individual SQL statements.
     * @param file - File path.
     * @private
     */
    private loadAndSplitSQL(file: string) {
        let sql = fs.readFileSync(file, 'utf8');

        // Strip multi-line comments /* ... */
        sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

        // Strip single-line comments -- ... and // ...
        sql = sql.replace(/--.*$/gm, '');
        sql = sql.replace(/\/\/.*$/gm, '');

        // Split by semicolons at line end or EOF
        return sql
            .split(/;\s*[\r\n]+|;\s*$/)
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
    }

    /**
     * Executes a SQL file containing multiple statements.
     * @param file - SQL file path.
     * @returns Promise resolving to true if any error occurred.
     */
    async executeSQLFile(file: string): Promise<boolean> {
        let hasError = false;
        const sqlStatements = this.loadAndSplitSQL(file);
        for (const statement of sqlStatements) {
            try {
                this.logger.debug({ sql: statement }, 'execute sql statement');
                await this.executeSQL(statement);
            } catch (error) {
                hasError = true;
                this.logger.error({ error, sql: statement }, 'execute sql statement with error');
            }
        }
        return hasError;
    }

    /**
     * Executes a paginated search query using the provided criteria.
     * @param criteria - CommonSearchCriteria object.
     * @returns Promise resolving to PaginationList.
     */
    async executePaginationSQL(criteria: CommonSearchCriteria): Promise<PaginationList> {
        return criteria.paginationQuery(this);
    }

    /**
     * Queries all records matching criteria, ignoring pagination.
     * @param criteria - CommonSearchCriteria object.
     * @returns Promise resolving to array of objects.
     */
    async queryByCriteria(criteria: CommonSearchCriteria): Promise<Array<any>> {
        return criteria.query(this);
    }

    /**
     * Executes a raw query statement to fetch database data.
     * @param sql - SQL query string.
     * @param params - Optional parameter array.
     * @protected
     * @abstract
     * @returns Promise resolving to raw database result.
     */
    protected abstract fetchData(sql: string, params?: Array<any>): Promise<any>;

    /**
     * Retrieves field definitions from a query result.
     * @param result - Raw query result.
     * @abstract
     * @returns Array of Field metadata objects.
     */
    abstract getFields(result: any): Array<Field>;

    /**
     * Retrieves row dataset array from a raw query result.
     * @param result - Raw query result.
     * @protected
     * @abstract
     * @returns Array of row data.
     */
    protected abstract getRowSet(result: any): Array<any>;

    /**
     * Retrieves affected row count from an execution result.
     * @param result - Raw execution result.
     * @protected
     * @abstract
     * @returns Affected row count.
     */
    protected abstract getAffectRows(result: any): number;

    /**
     * Converts underscore_case to camelCase.
     * @param name - Field name to convert.
     * @protected
     * @returns CamelCase string.
     */
    protected toCamel(name: string) {
        return name.replace(/\_(\w)/g, (all, letter) => {
            return letter.toUpperCase();
        });
    }

    /**
     * Builds field name mapping map.
     * @param fields - Array of field metadata.
     * @protected
     * @returns Field mapping Map.
     */
    protected buildFieldsMap(fields: Array<any>): Map<string, string> {
        return null;
    }

    /**
     * Sets property value on a nested object path (supports dot-separated fields like 'profile.name').
     * @param obj - Target object.
     * @param field - Field path string.
     * @param value - Value to set.
     * @protected
     */
    protected setNestObj(obj: any, field: string, value: any): void {
        if (value != null) {
            let attrs = field.split('.');
            let attr = this.toCamel(attrs[0]);
            let nestObj = obj;
            for (let i = 0; i < attrs.length - 1; i++) {
                nestObj[attr] = nestObj[attr] ?? {};
                nestObj = nestObj[attr];
                attr = this.toCamel(attrs[i + 1]);
            }
            nestObj[attr] = value;
        }
    }

    /**
     * Maps raw database rows into mapped JavaScript object array.
     * @param result - Raw query result.
     * @protected
     * @returns Array of mapped objects.
     */
    protected resultToList(result: any): Array<any> {
        let list: Array<any> = [];
        let fields = this.buildFieldsMap(result.fields);
        result.rows.forEach(row => {
            let obj = {};
            fields.forEach((value, key) => {
                this.setNestObj(obj, value, row[key]);
            });
            list.push(obj);
        });
        return list;
    }

    /**
     * Returns the LIMIT and OFFSET clause for the active database dialect.
     * @param rowCount - Maximum row count.
     * @param offset - Query offset.
     * @returns LIMIT and OFFSET clause string.
     */
    getRowSetLimitClause(rowCount: number, offset: number): string {
        return ` limit ${rowCount} offset ${offset}`;
    }

    /**
     * Converts the first row of a result into a mapped object, or null if empty.
     * @param result - Raw query result.
     * @protected
     * @abstract
     * @returns First row object or null.
     */
    protected abstract getFirstRow(result: any): any;
}