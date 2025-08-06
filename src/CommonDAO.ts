
import StringUtils from "./StringUtils";
import DBConnection from "./db/DBConnection";
import SearchCriteria from "./db/SearchCriteria";
import PaginationList from "./db/PaginationList";
import log4js, {Logger} from 'log4js';

export default abstract class CommonDAO {

    protected readonly logger: Logger;

    protected constructor() {
        this.logger = log4js.getLogger(this.constructor.name);
        this.logger.debug(`创建DAO实例:${this.constructor.name}`);
    }

    /**
     * 生成32位的uuid
     * @protected
     * @returns 生成的32位UUID字符串
     */
    protected genID(): string {
        return StringUtils.genID();
    }

    /**
     * 获取count数，默认属性是cc
     * @param data - 包含计数信息的数据对象
     * @param key - 计数字段的键名，默认为'cc'
     * @protected
     * @returns 解析后的计数值
     */
    protected getCount(data: any, key: string = 'cc'): number {
        let s = data == null ? null : data[key];
        return s == null ? 0 : parseInt(s);
    }

    /**
     * 执行count语句，返回count值
     * @param conn - 数据库连接对象
     * @param sql - 要执行的count SQL语句
     * @param params - SQL参数数组
     * @param key - 计数字段的键名，默认为'cc'
     * @protected
     * @returns Promise返回计数值
     */
    protected async executeCountSQL(conn: DBConnection, sql: string, params: Array<any>, key: string='cc'): Promise<number> {
        return this.getCount(await conn.find(sql, params), key);
    }

    /**
     * 转换布尔为整数
     * @param value - 要转换的布尔值
     * @protected
     * @returns 布尔值对应的整数 (true=1, false=0)
     */
    protected getBooleanValue(value: boolean): number {
        return value === true ? 1 : 0;
    }

    /**
     * 转换布尔为字符串
     * @param value - 要转换的布尔值
     * @protected
     * @returns 布尔值对应的字符串 (true='T', false='F')
     */
    protected getBoolean(value: boolean): string {
        return value === true ? 'T' : 'F';
    }

    /**
     * 将T/F类型的字符串字段转换为boolean类型
     * @param data - 要转换的数据对象
     * @param fields - 需要转换的字段名数组
     * @protected
     */
    protected convertBooleanFields(data: any, fields: Array<string>): void {
        fields.forEach(field => {
            data[field] = data[field] === 'T' || data[field] === 1;
        })
    }


    /**
     * 快速查询，返回分页记录
     * @param conn - 数据库连接对象
     * @param sql - 查询SQL语句
     * @param params - SQL参数数组，默认为空数组
     * @param pageNo - 页码，默认为1
     * @param rowCount - 每页行数，默认为25
     * @protected
     * @returns Promise返回包含列表数据和是否有更多数据的对象
     */
    protected async quickSearch(conn: DBConnection, sql: string,  params: Array<any>=[], pageNo: number = 1, rowCount: number=25): Promise<any> {
        let count = await this.executeCountSQL(conn, `select count(*) as cc from (${sql}) a`, params);
        let offset = (pageNo - 1) * rowCount;
        if (count > offset) {
            let list = await conn.listQuery(`${sql} offset ${offset} limit ${rowCount}`, params);
            return {
                list,
                hasMore: list.length + offset < count
            }
        } else {
            return {
                list: [],
                hasMore: false
            }
        }
    }
}