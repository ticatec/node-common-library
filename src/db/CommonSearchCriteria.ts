import DBConnection from './DBConnection';
import PaginationList from "./PaginationList";
import StringUtils from "../StringUtils";
import log4js from 'log4js';

const logger = log4js.getLogger('SearchCriteria');

const DEFAULT_ROWS_PAGE = 25;
const FIRST_PAGE = 1;

export default abstract class CommonSearchCriteria {

    protected sql: string;
    protected orderBy: string = '';
    protected params: Array<any> = [];
    private readonly page: number;
    private readonly rows: number;

    protected constructor(page: number, rows: number) {
        this.page = StringUtils.parseNumber(page, FIRST_PAGE);
        this.rows = StringUtils.parseNumber(rows, DEFAULT_ROWS_PAGE);
    }

    /**
     * 查询符合条件的记录数量
     * @param conn
     * @param sql
     * @param params
     * @private
     */
    private async queryCount(conn: DBConnection, sql: string, params: Array<any>):Promise<number> {
        let countSQL = `select count(*) as cc from (${sql}) a`;
        logger.debug('根据条件查询符合的纪录数量：', countSQL, params);
        let result = await conn.find(countSQL, params);
        return result == null ? 0 : parseInt(result['cc']);
    }

    /**
     * 在将行记录转换成对象后的回调函数
     * @protected
     */
    protected getPostConstructor():any {
        return null;
    }

    /**
     * 判断是否为空
     * @param s
     * @protected
     */
    protected isNotEmpty(s: string):boolean {
        return !StringUtils.isEmpty(s);
    }

    /**
     * escape字符串中的%
     * @param s
     * @protected
     */
    protected escapePercentage(s: string): string {
        return s.replace(/%/g, '\\%');
    }

    /**
     * 是否包含*
     * @param s
     * @protected
     */
    protected includeStar(s: string): boolean {
        return s.includes('*');
    }

    /**
     * 将字符中的*替换成%
     * @param s
     * @protected
     */
    protected toWildSQL(s: string): string {
        return s.replace(/\*/g, '%');
    }

    /**
     * 替换所有的*为百分号，如果有百分号，会提前escape
     * @param s
     * @protected
     */
    protected replaceWildStar(s: string): string {
        return s.replace(/%/g, '\\%').replace(/\*/g, '%');
    }

    /**
     * 判断字段是否包含*，有*用like查询，没有的用等于条件查询
     * @param text
     * @param field
     * @param idx
     * @protected
     */
    protected buildStarCriteria(text: string, field: string, idx: number, ): number {
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
     * 处理等于条件查询
     * @param value
     * @param field
     * @param idx
     * @protected
     */
    protected buildCriteria(value: any, field: string, idx: number, ): number {
        if (this.isNotEmpty(value)) {
            this.sql += ` and ${field} = $${idx++}`;
            this.params.push(value);
        }
        return idx;
    }

    /**
     * 封装like查询值
     * @param s
     * @protected
     */
    protected wrapLikeMatch(s: string): string {
        return `%${s}%`;
    }

    /**
     * 执行查询语句，返回分页查询结果
     * @param conn
     * @param page
     * @param rowCount
     */
    async paginationQuery(conn: DBConnection, page?: any, rowCount?: any): Promise<PaginationList> {
        let count = await this.queryCount(conn, this.sql, this.params);
        if (count > 0) {
            const rows = rowCount != null ? StringUtils.parseNumber(rowCount, DEFAULT_ROWS_PAGE) : this.rows;
            let pageNo = page != null ? StringUtils.parseNumber(page, FIRST_PAGE) : this.page;
            const offset = (pageNo - 1) * rows;
            let listSQL = `${this.sql} ${this.orderBy} ${conn.getRowSetLimitClause(rows, offset)} `;
            logger.debug(`符合条件总数：${count}, 需要记录从${offset}开始读取${rows}条记录`);
            logger.debug('执行查询语句', listSQL, this.params);
            let list = count > offset ? await conn.listQuery(listSQL, this.params, this.getPostConstructor()) : [];
            const hasMore = offset + rows < count;
            const pages = (Math.floor((count - 1) / rows)) + 1;
            return {count, hasMore, list, pages}
        } else {
            return {count, hasMore: false, list: [], pages: 0}
        }
    }

    /**
     * 不分页，返回所有符合条件的记录
     * @param conn
     */
    async query(conn: DBConnection):Promise<Array<any>> {
        return await conn.listQuery(`${this.sql} ${this.orderBy}`, this.params)
    }
}