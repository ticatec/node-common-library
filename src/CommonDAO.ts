import StringUtils from "./StringUtils.js";
import DBConnection from "./db/DBConnection.js";
import {getLogger, Logger} from "./Logger.js";
import TransactionManager from "./TransactionManager.js";

/**
 * Quick search result interface.
 * @template T Type of items in the list.
 */
export interface QuickSearchResult<T = any> {
    /**
     * Result list.
     */
    list: Array<T>;
    /**
     * Whether more data is available beyond the current page.
     */
    hasMore: boolean;
}

export default abstract class CommonDAO {

    protected readonly logger: Logger;

    public constructor() {
        this.logger = getLogger(this.constructor.name);
        this.logger.debug(`Created DAO instance: ${this.constructor.name}`);
    }

    /**
     * Retrieves the database connection for the current execution thread (transaction-aware).
     * - Returns active transaction connection if inside a transaction.
     * - Otherwise throws an error if no connection is active in the context.
     */
    protected async getDBConnection(): Promise<DBConnection> {
        const conn = TransactionManager.getCurrentConnection();
        if (!conn) {
            throw new Error('No database connection available. Ensure you are inside a @Transaction or using TransactionManager.execute().');
        }
        return conn;
    }

    /**
     * Generates a 32-character UUID string.
     * @protected
     * @returns Generated 32-character UUID string.
     */
    protected genID(): string {
        return StringUtils.genID();
    }

    /**
     * Executes a count query and returns the count value.
     * Handles NaN gracefully.
     * @param sql - Count SQL query to execute.
     * @param params - Array of SQL query parameters.
     * @param key - Key name of the count column, defaults to 'cc'.
     * @protected
     * @returns Promise resolving to the count number.
     */
    protected async executeCountSQL(sql: string, params: Array<any>, key: string = 'cc'): Promise<number> {
        const conn: DBConnection = await this.getDBConnection();
        const data = await conn.find(sql, params);
        if (data == null) return 0;
        const s = data[key];
        if (s == null) return 0;
        const parsed = parseInt(s, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Converts a boolean value to an integer (true=1, false=0).
     * @param value - Boolean value to convert.
     * @protected
     * @returns Integer value (1 or 0).
     */
    protected getBooleanValue(value: boolean): number {
        return value === true ? 1 : 0;
    }

    /**
     * Converts a boolean value to a character ('T' or 'F').
     * @param value - Boolean value to convert.
     * @protected
     * @returns String ('T' or 'F').
     */
    protected getBoolean(value: boolean): string {
        return value === true ? 'T' : 'F';
    }

    /**
     * Quick paginated search query using driver-independent limit/offset clauses.
     * @template T - Type of items in the result list.
     * @param sql - Base SQL query statement.
     * @param params - Array of SQL query parameters (defaults to empty array).
     * @param pageNo - Page number (defaults to 1).
     * @param rowCount - Number of rows per page (defaults to 25).
     * @param booleanFields - Field names to coerce to boolean (supports nested properties like 'user.isActive').
     * @protected
     * @returns Promise resolving to QuickSearchResult containing list data and hasMore flag.
     */
    protected async quickSearch<T = any>(
        sql: string,
        params: Array<any> = [],
        pageNo: number = 1,
        rowCount: number = 25,
        booleanFields?: Array<string>
    ): Promise<QuickSearchResult<T>> {
        const conn: DBConnection = await this.getDBConnection();
        let count = await this.executeCountSQL(`select count(*) as cc from (${sql}) a`, params);
        let offset = (pageNo - 1) * rowCount;
        if (count > offset) {
            let listSQL = `${sql} ${conn.getRowSetLimitClause(rowCount, offset)}`;
            let list = await conn.listQuery(listSQL, params, null, booleanFields);
            return {
                list: list as Array<T>,
                hasMore: list.length + offset < count
            };
        } else {
            return {
                list: [],
                hasMore: false
            };
        }
    }
}