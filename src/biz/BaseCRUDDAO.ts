import BaseDAO from "./BaseDAO";
import {DBConnection} from "../../lib";

export default interface BaseCRUDDAO<T, K> extends BaseDAO<T, K> {

    /**
     *
     * @param conn
     * @param item
     */
    remove(conn: DBConnection, item: T): Promise<number>;

}