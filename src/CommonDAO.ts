
import StringUtils from "./StringUtils";
import DBConnection from "./db/DBConnection";
import SearchCriteria from "./db/SearchCriteria";
import PaginationList from "./db/PaginationList";
import log4js from "log4js";


export default abstract class CommonDAO {

    protected logger = log4js.getLogger("DAO");

    /**
     * 生成32位的uuid
     * @protected
     */
    protected genID(): string {
        return StringUtils.genID();
    }

    /**
     * 获取count数，默认属性是cc
     * @param data
     * @param key
     * @protected
     */
    protected getCount(data: any, key: string = 'cc'): number {
        let s = data == null ? null : data[key];
        return s == null ? 0 : parseInt(s);
    }

    /**
     * 执行count语句，返回count值
     * @param conn
     * @param sql
     * @param params
     * @param key
     * @protected
     */
    protected async executeCountSQL(conn: DBConnection, sql: string, params: Array<any>, key: string='cc'): Promise<number> {
        return this.getCount(await conn.find(sql, params), key);
    }

    /**
     * 转换布尔为整数
     * @param value
     * @protected
     */
    protected getBooleanValue(value: boolean): number {
        return value === true ? 1 : 0;
    }

    /**
     * 转换布尔为字符串
     * @param value
     * @protected
     */
    protected getBoolean(value: boolean): string {
        return value === true ? 'T' : 'F';
    }

    /**
     * 将T/F类型的字符串字段转换为boolean类型
     * @param data
     * @param fields
     * @protected
     */
    protected convertBooleanFields(data: any, fields: Array<string>): void {
        fields.forEach(field => {
            data[field] = data[field] === 'T' || data[field] === 1;
        })
    }


    /**
     * 根据组合条件查询
     * @param conn
     * @param criteria
     * @param page
     * @param rowCount
     * @protected
     */
    protected async searchByCriteria(conn: DBConnection, criteria: SearchCriteria, page: string, rowCount: string): Promise<PaginationList> {
        return await criteria.paginationQuery(conn, page, rowCount);
    }

    /**
     * 快速查询，返回复合记录的
     * @param conn
     * @param sql
     * @param params
     * @param rowCount
     * @protected
     */
    protected async quickSearch(conn: DBConnection, sql: string,  params: Array<any>=[], rowCount: number=25): Promise<any> {
        let count = await this.executeCountSQL(conn, `select count(*) as cc from (${sql}) a`, params);
        if (count > 0) {
            let list = await conn.listQuery(`${sql} limit ${rowCount}`, params);
            return {
                list,
                hasMore: list.length < count
            }
        } else {
            return {
                list: [],
                hasMore: false
            }
        }
    }
}