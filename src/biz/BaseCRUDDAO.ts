import BaseDAO from "./BaseDAO";
import DBConnection from "../db/DBConnection";

export default interface BaseCRUDDAO<T, K> extends BaseDAO<T, K> {

    /**
     * 删除实体
     * @param conn - 数据库连接对象
     * @param item - 要删除的实体对象
     * @returns Promise返回影响的记录数
     */
    remove(conn: DBConnection, item: T): Promise<number>;

}