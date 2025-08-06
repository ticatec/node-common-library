import DBConnection from "../db/DBConnection";

export default interface BaseDAO<T, K> {

    /**
     * 创建新实体
     * @param conn - 数据库连接对象
     * @param item - 要创建的实体对象
     * @returns Promise返回影响的记录数
     */
    createNew(conn: DBConnection, item: T): Promise<number>;

    /**
     * 更新实体
     * @param conn - 数据库连接对象
     * @param item - 要更新的实体对象
     * @returns Promise返回影响的记录数
     */
    update(conn: DBConnection, item: T): Promise<number>;

    /**
     * 根据主键查找实体
     * @param conn - 数据库连接对象
     * @param key - 主键值
     * @returns Promise返回对应的实体对象
     */
    find(conn: DBConnection, key: K): Promise<T>;

}