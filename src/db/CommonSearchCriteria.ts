import DBConnection from './DBConnection.js';
import PaginationList from "./PaginationList.js";
import StringUtils from "../StringUtils.js";
import {getLogger, Logger} from "../Logger.js";

const DEFAULT_ROWS_PAGE = 25;
const FIRST_PAGE = 1;
const ONE_DAY = 24 * 60 * 60 * 1000;

export default abstract class CommonSearchCriteria {

    protected readonly logger: Logger;
    protected sql: string;
    protected orderBy: string = '';
    protected params: Array<any> = [];
    private readonly page: number;
    private readonly rows: number;
    protected criteria: any;
    protected booleanFields?: Array<string>;

    protected constructor(criteria?: any) {
        this.logger = getLogger(this.constructor.name);
        this.page = StringUtils.parseNumber(criteria?.page, FIRST_PAGE);
        this.rows = StringUtils.parseNumber(criteria?.rows, DEFAULT_ROWS_PAGE);
        this.criteria = criteria;
    }

    /**
     * Sets fields to be coerced into boolean values.
     * @param fields - Array of field property paths (supports nested paths like 'user.isActive').
     */
    setBooleanFields(...fields: Array<string>): void {
        this.booleanFields = fields;
    }

    /**
     * Builds dynamic SQL query criteria. Subclasses should override this method.
     * @protected
     * @abstract
     */
    protected buildDynamicQuery() {

    }

    /**
     * Queries the count of matching records.
     * @param conn - Database connection object.
     * @param sql - SQL query string.
     * @param params - Array of SQL query parameters.
     * @private
     * @returns Promise resolving to the total count.
     */
    private async queryCount(conn: DBConnection, sql: string, params: Array<any>): Promise<number> {
        let countSQL = `select count(*) as cc from (${sql}) a`;
        let result = await conn.find(countSQL, params);
        return result == null ? 0 : parseInt(result['cc'], 10);
    }

    /**
     * Post-construction callback invoked after mapping rows to target objects.
     * @protected
     * @returns Post-processor function or null.
     */
    protected getPostConstructor(): any {
        return null;
    }

    /**
     * Checks if a value is not empty.
     * @param s - Value to check.
     * @protected
     * @returns True if not empty.
     */
    protected isNotEmpty(s: any): boolean {
        return StringUtils.isString(s) ? !StringUtils.isEmpty(s) : s != null;
    }

    /**
     * Escapes percentage (%) characters in a string.
     * @param s - String to escape.
     * @protected
     * @returns Escaped string.
     */
    protected escapePercentage(s: string): string {
        return s.replace(/%/g, '\\%');
    }

    /**
     * Checks if a string contains wildcard asterisk (*).
     * @param s - String to check.
     * @protected
     * @returns True if string contains *.
     */
    protected includeStar(s: string): boolean {
        return s.includes('*');
    }

    /**
     * Replaces asterisk (*) wildcards with SQL percentage (%) wildcards.
     * @param s - Input string.
     * @protected
     * @returns Converted SQL wildcard string.
     */
    protected toWildSQL(s: string): string {
        return s.replace(/\*/g, '%');
    }

    /**
     * Escapes existing percentage (%) characters and replaces wildcard asterisks (*) with %.
     * @param s - Input string to process.
     * @protected
     * @returns Processed string.
     */
    protected replaceWildStar(s: string): string {
        return s.replace(/%/g, '\\%').replace(/\*/g, '%');
    }

    protected getEndOfDay(d: any) {
        return d == null ? null : new Date(new Date(d).getTime() + ONE_DAY);
    }

    /**
     * Builds range query criteria (from / to boundaries).
     * @param fromValue - Start boundary value.
     * @param toValue - End boundary value.
     * @param field - Field name.
     * @protected
     * @returns Next parameter positional index.
     */
    protected buildRangeCriteria(fromValue: any, toValue: any, field: string): number {
        let idx = this.params.length + 1;
        if (this.isNotEmpty(fromValue)) {
            this.sql += ` and ${field} >= $${idx++}`;
            this.params.push(fromValue);
        }
        if (this.isNotEmpty(toValue)) {
            this.sql += ` and ${field} < $${idx++}`;
            this.params.push(toValue);
        }
        return idx;
    }

    /**
     * Builds wildcard query criteria (uses LIKE if * is present, otherwise equals =).
     * @param text - Search text.
     * @param field - Field name.
     * @protected
     * @returns Next parameter positional index.
     */
    protected buildStarCriteria(text: string, field: string): number {
        let idx = this.params.length + 1;
        if (this.isNotEmpty(text)) {
            if (this.includeStar(text)) {
                this.sql += ` and ${field} like $${idx++}`;
                this.params.push(this.replaceWildStar(text));
            } else {
                this.sql += ` and ${field} = $${idx++}`;
                this.params.push(text);
            }
        }
        return idx;
    }

    /**
     * Builds equality criteria (field = value).
     * @param value - Search value.
     * @param field - Field name.
     * @protected
     * @returns Next parameter positional index.
     */
    protected buildCriteria(value: any, field: string): number {
        let idx = this.params.length + 1;
        if (this.isNotEmpty(value)) {
            this.sql += ` and ${field} = $${idx++}`;
            this.params.push(value);
        }
        return idx;
    }

    /**
     * Wraps a search string with % wildcards for LIKE matching (%string%).
     * @param s - Input string.
     * @protected
     * @returns Wrapped string (%string%).
     */
    protected wrapLikeMatch(s: string): string {
        return `%${s}%`;
    }

    /**
     * Executes a paginated query and returns a PaginationList result.
     * @param conn - Database connection object.
     */
    async paginationQuery(conn: DBConnection): Promise<PaginationList> {
        this.buildDynamicQuery();
        let count = await this.queryCount(conn, this.sql, this.params);
        if (count > 0) {
            const rows = this.rows;
            let pageNo = this.page;
            const offset = (pageNo - 1) * rows;
            let listSQL = `${this.sql} ${this.orderBy} ${conn.getRowSetLimitClause(rows, offset)} `;
            this.logger.debug(`Total matching records: ${count}, need to read ${rows} records starting from ${offset}`);
            let list = count > offset ? await conn.listQuery(listSQL, this.params, this.getPostConstructor(), this.booleanFields) : [];
            const hasMore = offset + rows < count;
            const pages = (Math.floor((count - 1) / rows)) + 1;
            return {count, hasMore, list, pages};
        } else {
            return {count, hasMore: false, list: [], pages: 0};
        }
    }

    /**
     * Executes an unpaginated query, returning all matching records.
     * @param conn - Database connection object.
     * @returns Promise resolving to an array of result objects.
     */
    async query(conn: DBConnection): Promise<Array<any>> {
        return await conn.listQuery(`${this.sql} ${this.orderBy}`, this.params, null, this.booleanFields);
    }
}