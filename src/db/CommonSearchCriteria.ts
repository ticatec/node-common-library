import DBConnection from './DBConnection';
import PaginationList from "./PaginationList";
import StringUtils from "../StringUtils";
import log4js, {Logger} from 'log4js';

const DEFAULT_ROWS_PAGE = 25;
const FIRST_PAGE = 1;

export default abstract class CommonSearchCriteria {

    protected readonly logger: Logger;
    protected sql: string;
    protected orderBy: string = '';
    protected params: Array<any> = [];
    private readonly page: number;
    private readonly rows: number;
    protected criteria: any;

    protected constructor(criteria?: any) {
        this.logger = log4js.getLogger(this.constructor.name);
        this.page = StringUtils.parseNumber(criteria?.page, FIRST_PAGE);
        this.rows = StringUtils.parseNumber(criteria?.rows, DEFAULT_ROWS_PAGE);
        this.criteria = criteria;
    }

    /**
     * 构建动态查询条件，子类应重写此方法
     * @protected
     * @abstract
     */
    protected buildDynamicQuery() {

    }

    /**
     * 查询符合条件的记录数量
     * @param conn - 数据库连接对象
     * @param sql - SQL查询语句
     * @param params - SQL参数数组
     * @private
     * @returns Promise返回记录总数
     */
    private async queryCount(conn: DBConnection, sql: string, params: Array<any>): Promise<number> {
        let countSQL = `select count(*) as cc from (${sql}) a`;
        let result = await conn.find(countSQL, params);
        return result == null ? 0 : parseInt(result['cc']);
    }

    /**
     * 在将行记录转换成对象后的后处理回调函数
     * @protected
     * @returns 后处理函数或null
     */
    protected getPostConstructor(): any {
        return null;
    }

    /**
     * 判断值是否不为空
     * @param s - 要检查的值
     * @protected
     * @returns 如果不为空则返回true
     */
    protected isNotEmpty(s: any): boolean {
        return StringUtils.isString(s) ? !StringUtils.isEmpty(s) : s != null;
    }

    /**
     * 转义字符串中的%字符
     * @param s - 要转义的字符串
     * @protected
     * @returns 转义后的字符串
     */
    protected escapePercentage(s: string): string {
        return s.replace(/%/g, '\\%');
    }

    /**
     * 判断字符串是否包含通配符*
     * @param s - 要检查的字符串
     * @protected
     * @returns 如果包含*则返回true
     */
    protected includeStar(s: string): boolean {
        return s.includes('*');
    }

    /**
     * 将字符串中的*通配符替换成SQL的%通配符
     * @param s - 要转换的字符串
     * @protected
     * @returns 转换后的字符串
     */
    protected toWildSQL(s: string): string {
        return s.replace(/\*/g, '%');
    }

    /**
     * 替换所有的*为%通配符，先转义原有的%字符
     * @param s - 要处理的字符串
     * @protected
     * @returns 处理后的字符串
     */
    protected replaceWildStar(s: string): string {
        return s.replace(/%/g, '\\%').replace(/\*/g, '%');
    }

    /**
     * 构建范围查询条件（from/to范围）
     * @param fromValue - 起始值
     * @param toValue - 结束值
     * @param field - 字段名
     * @protected
     * @returns 下一个参数的索引
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
     * 构建带通配符的查询条件（有*用LIKE，无*用等于）
     * @param text - 搜索文本
     * @param field - 字段名
     * @protected
     * @returns 下一个参数的索引
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
     * 构建等于条件查询
     * @param value - 查询值
     * @param field - 字段名
     * @protected
     * @returns 下一个参数的索引
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
     * 封装LIKE查询值，在字符串两端添加%通配符
     * @param s - 要封装的字符串
     * @protected
     * @returns 封装后的字符串 (%字符串%)
     */
    protected wrapLikeMatch(s: string): string {
        return `%${s}%`;
    }

    /**
     * 执行分页查询，返回分页结果
     * @param conn - 数据库连接对象
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
            let list = count > offset ? await conn.listQuery(listSQL, this.params, this.getPostConstructor()) : [];
            const hasMore = offset + rows < count;
            const pages = (Math.floor((count - 1) / rows)) + 1;
            return {count, hasMore, list, pages}
        } else {
            return {count, hasMore: false, list: [], pages: 0}
        }
    }

    /**
     * 不分页查询，返回所有符合条件的记录
     * @param conn - 数据库连接对象
     * @returns Promise返回数据对象数组
     */
    async query(conn: DBConnection): Promise<Array<any>> {
        return await conn.listQuery(`${this.sql} ${this.orderBy}`, this.params)
    }
}