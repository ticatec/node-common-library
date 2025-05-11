import Field from "./Field";
import fs from "fs";
import log4js, {Logger} from 'log4js';
import PaginationList from "./PaginationList";
import CommonSearchCriteria from "./CommonSearchCriteria";

type PostConstructionFun = (obj: any) => void;

export {PostConstructionFun};


export default abstract class DBConnection {

    protected readonly logger: Logger;

    protected constructor() {
        this.logger = log4js.getLogger(this.constructor.name);
    }

    /**
     * 开始事务
     */
    abstract beginTransaction(): Promise<void>;

    /**
     * 提交
     */
    abstract commit(): Promise<void>;

    /**
     * 回滚
     */
    abstract rollback(): Promise<void>;

    /**
     * 关闭
     */
    abstract close(): Promise<void>;

    /**
     * 执行一个sql语句
     * @param sql
     */
    protected abstract executeSQL(sql: string): Promise<any>;

    /**
     * 执行update/delete查询，返回影响记录的数量
     * @param sql
     * @param params
     */
    abstract executeUpdate(sql: string, params: Array<any>): Promise<number>;

    /**
     * 插入一条记录
     * @param sql
     * @param params
     */
    abstract insertRecord(sql: string, params: Array<any>): Promise<any>;

    /**
     * 更新符合条件的记录
     * @param sql
     * @param params
     */
    abstract updateRecord(sql: string, params: Array<any>): Promise<number>;

    /**
     * 删除符合条件的记录
     * @param sql
     * @param params
     */
    abstract deleteRecord(sql: string, params: Array<any>): Promise<number>;


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
     * @param sql
     * @param params
     * @param key
     * @protected
     */
    async executeCountSQL(sql: string, params: Array<any>, key: string = 'cc'): Promise<number> {
        return this.getCount(await this.find(sql, params), key);
    }

    /**
     *
     * @param sql
     * @param params
     * @param pageNo
     * @param rowCount
     * @protected
     */
    async quickSearch(sql: string, params: Array<any> = [], pageNo: number = 1, rowCount: number = 25): Promise<any> {
        pageNo = pageNo < 1 ? 1 : pageNo;
        let offset = (pageNo - 1) * rowCount;
        let count = await this.executeCountSQL(`select count(*) as cc
                                                from (${sql}) a`, params);
        if (count > 0 && offset < count) {
            let list = await this.listQuery(`${sql} ${this.getRowSetLimitClause(rowCount, offset)}`, params);
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

    /**
     * 执行select查询语句，返回数据列表
     * @param sql
     * @param params
     * @param postConstruction
     */
    async listQuery(sql: string, params: Array<any> | null = null, postConstruction: PostConstructionFun | null = null): Promise<Array<any>> {
        let result = await this.fetchData(sql, params);
        let list = this.resultToList(result);
        if (postConstruction) {
            list.forEach(data => postConstruction(data));
        }
        return list;
    }

    /**
     * 查询单条记录，如果有多条，返回第一条
     * @param sql
     * @param params
     * @param postConstruction
     */
    async find(sql: string, params: Array<any> | null = null, postConstruction: PostConstructionFun | null = null): Promise<any> {
        let result = await this.fetchData(sql, params);
        let row = this.getFirstRow(result);
        if (row && postConstruction) {
            postConstruction(row)
        }
        return row;
    }

    /**
     * 处理SQL文件，去除注释行，分割sql语句
     * @param file
     * @private
     */
    private loadAndSplitSQL(file: string) {
        let sql = fs.readFileSync(file, 'utf8');

        // 去除多行注释 /* ... */
        sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

        // 去除单行注释 -- ... 和 // ...
        sql = sql.replace(/--.*$/gm, '');
        sql = sql.replace(/\/\/.*$/gm, '');

        // 按 ; 分割（适用于简单语句，不解析字符串中的 ;）
        return  sql
            .split(/;\s*[\r\n]+|;\s*$/) // 按换行或文件结尾的分号切分
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
    }
    /**
     * 执行一个SQL文件
     * @param file
     */
    async executeSQLFile(file: string): Promise<boolean> {
        let hasError = false;
        const sqlStatements = this.loadAndSplitSQL(file);
        for (const statement of sqlStatements) {
            try {
                this.logger.debug('execute sql statement: ', statement);
                await this.executeSQL(statement);
            } catch (error) {
                hasError = true;
                this.logger.error('execute sql statement with error.', error);
            }
        }
        return hasError;
    }

    /**
     * 执行分页查询，按照分页条件返回分页结果
     * @param criteria
     */
    async executePaginationSQL(criteria: CommonSearchCriteria): Promise<PaginationList> {
        return criteria.paginationQuery(this);
    }

    /**
     * 根据条件查询返回所有符合条件的结果，忽略分页
     * @param criteria
     */
    async queryByCriteria(criteria: CommonSearchCriteria): Promise<Array<any>> {
        return criteria.query(this);
    }


    /**
     * 执行sql，获取数据
     * @param sql
     * @param params
     */
    protected abstract fetchData(sql: string, params?: Array<any>): Promise<any>;

    /**
     * 获取查询结果对应的字段名列表
     * @param result
     */
    abstract getFields(result): Array<Field>;

    /**
     * 从结果中获得数据集
     * @param result
     */
    protected abstract getRowSet(result): Array<any>;

    /**
     * 返回受影响的行数
     * @param result
     */
    protected abstract getAffectRows(result): number;

    /**
     * 下划线转换驼峰
     * @param name
     * @returns {*}
     */
    protected toCamel(name) {
        return name.replace(/\_(\w)/g, (all, letter) => {
            return letter.toUpperCase();
        });
    }

    /**
     * 构建字段对应列表
     * @param fields
     * @protected
     */
    protected buildFieldsMap(fields: Array<any>): Map<string, string> {
        return null;
    }

    protected setNestObj(obj: any, field: string, value: any): void {
        if (value != null) {
            let attrs = field.split('.');
            let attr = this.toCamel(attrs[0]);
            let nestObj = obj;
            for (let i = 0; i < attrs.length - 1; i++) {
                nestObj[attr] = nestObj[attr] ?? {};
                nestObj = nestObj[attr]
                attr = this.toCamel(attrs[i + 1]);
            }
            nestObj[attr] = value;
        }
    }

    /**
     * 将返回的多行数据转换成数组对象
     * @param result
     * @protected
     */
    protected resultToList(result): Array<any> {
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
     * 返回设定结果集大小的附加语句
     * @param rowCount
     * @param offset
     */
    getRowSetLimitClause(rowCount: number, offset: number): string {
        return ` limit ${rowCount} offset ${offset}`;
    }

    /**
     * 将首行转换为对象，如果首行不存在，返回空
     * @param result
     * @protected
     */
    protected abstract getFirstRow(result): any;

}