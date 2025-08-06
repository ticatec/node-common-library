import DBConnection from "./DBConnection";

/**
 * 数据库连接工厂接口
 */
export default interface DBFactory {
    /**
     * 创建数据库连接
     * @returns Promise返回数据库连接对象
     */
    createDBConnection():Promise<DBConnection>;
}