import DBConnection from './DBConnection.js';
import PaginationList from "./PaginationList.js";
import StringUtils from "../StringUtils.js";
import {getLogger, Logger} from "../Logger.js";

const DEFAULT_PAGE_SIZE = 25;
const FIRST_PAGE = 1;
const ONE_DAY = 24 * 60 * 60 * 1000;

export default abstract class CommonSearchCriteria {

    protected readonly logger: Logger;
    protected sql: string;
    protected orderBy: string = '';
    protected params: Array<any> = [];
    private readonly page: number;
    private readonly pageSize: number;
    protected criteria: any;
    protected booleanFields?: Array<string>;

    protected constructor(criteria?: any) {
        this.logger = getLogger(this.constructor.name);
        this.page = StringUtils.parseNumber(criteria?.page, FIRST_PAGE);
        this.pageSize = StringUtils.parseNumber(criteria?.pageSize, DEFAULT_PAGE_SIZE);
        this.criteria = criteria;
    }

    /**
     * Sets fields to be coerced into boolean values.
     * @param fields - Array of field property paths (supports nested paths like 'user.isActive').
     */
    protected setBooleanFields(...fields: Array<string>): void {
        this.booleanFields = fields;
    }

    /**
     * Builds dynamic SQL query criteria. Subclasses should override this method.
     * @protected
     * @abstract
     */
    protected abstract buildDynamicQuery(): any;

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
        if (result == null || result['cc'] == null) return 0;
        const parsed = parseInt(result['cc'], 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Post-construction row processor function invoked after mapping database rows to target objects.
     * Subclasses can override this method.
     * @protected
     * @returns Post-processor function or null.
     */
    protected getPostProcessor(): ((obj: any) => void) | null {
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

    /**
     * Calculates the start of the following day (00:00:00.000) for exclusive upper-bound date queries (< nextDayStart).
     * @param d - Input date or date string.
     * @protected
     * @returns Next day start Date or null if invalid.
     */
    protected getNextDayStart(d: any): Date | null {
        if (d == null) return null;
        const dateObj = d instanceof Date ? d : new Date(d);
        return isNaN(dateObj.getTime()) ? null : new Date(dateObj.getTime() + ONE_DAY);
    }

    /**
     * Adds range query criteria (from / to boundaries).
     * Automatically applies getNextDayStart to toValue if it is a Date instance.
     * @param fromValue - Start boundary value (inclusive >=).
     * @param toValue - End boundary value (exclusive <).
     * @param field - Database column name.
     * @protected
     * @returns Next parameter positional index.
     */
    protected addRangeCriteria(fromValue: any, toValue: any, field: string): number {
        let idx = this.params.length + 1;
        if (this.isNotEmpty(fromValue)) {
            this.sql += ` and ${field} >= $${idx++}`;
            this.params.push(fromValue);
        }
        if (this.isNotEmpty(toValue)) {
            let actualTo = toValue;
            if (toValue instanceof Date) {
                actualTo = this.getNextDayStart(toValue);
            }
            if (this.isNotEmpty(actualTo)) {
                this.sql += ` and ${field} < $${idx++}`;
                this.params.push(actualTo);
            }
        }
        return idx;
    }

    /**
     * Adds wildcard/LIKE query criteria (uses LIKE if * is present, otherwise equals =).
     * @param text - Search text.
     * @param field - Field name.
     * @protected
     * @returns Next parameter positional index.
     */
    protected addWildcardCriteria(text: string, field: string): number {
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
     * Adds equality query criteria (field = value).
     * @param value - Search value.
     * @param field - Field name.
     * @protected
     * @returns Next parameter positional index.
     */
    protected addEqualsCriteria(value: any, field: string): number {
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
            const pageSize = this.pageSize;
            let pageNo = this.page;
            const offset = (pageNo - 1) * pageSize;
            let listSQL = `${this.sql} ${this.orderBy} ${conn.getRowSetLimitClause(pageSize, offset)} `;
            this.logger.debug(`Total matching records: ${count}, need to read ${pageSize} records starting from ${offset}`);
            let list = count > offset ? await conn.listQuery(listSQL, this.params, this.getPostProcessor(), this.booleanFields) : [];
            const hasMore = offset + pageSize < count;
            const pages = Math.ceil(count / pageSize);
            return {count, hasMore, list, pages};
        } else {
            return {count, hasMore: false, list: [], pages: 0};
        }
    }

    /**
     * Executes an unpaginated query, returning all matching records.
     * Applies getPostProcessor() post-processing callback consistently.
     * @param conn - Database connection object.
     * @returns Promise resolving to an array of result objects.
     */
    async query(conn: DBConnection): Promise<Array<any>> {
        this.buildDynamicQuery();
        return await conn.listQuery(`${this.sql} ${this.orderBy}`, this.params, this.getPostProcessor(), this.booleanFields);
    }
}