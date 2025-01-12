import {DBConnection} from "../../lib";

export default interface BaseDAO<T, K> {

    /**
     * 新增一个实体
     * @param conn
     * @param item
     */
    createNew(conn: DBConnection, item: T): Promise<number>;

    /**
     * 更新实体
     * @param conn
     * @param item
     */
    update(conn: DBConnection, item: T): Promise<number>;

    /**
     * 根据主键读取一个实体
     * @param conn
     * @param key
     */
    find(conn: DBConnection, key: K): Promise<T>;

}