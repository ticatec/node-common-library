
import {getLogger} from "../Logger.js";
import DBConnection from "./DBConnection.js";
import DBFactory from "./DBFactory.js";

const logger = getLogger('DBManager');

export default class DBManager {

    private static instance: DBManager;

    private factory: DBFactory;

    private constructor(factory: DBFactory) {
        this.factory = factory;
    }

    /**
     * 初始化数据库管理器
     * @param factory - 数据库连接工厂
     * @returns 数据库管理器实例
     */
    static init(factory: DBFactory): DBManager {
        if (DBManager.instance == null) {
            logger.debug({factory}, '初始化数据库管理工厂');
            DBManager.instance = new DBManager(factory)
        }
        return DBManager.instance;
    }

    /**
     * 获取数据库管理器实例
     * @returns 数据库管理器实例
     */
    static getInstance(): DBManager {
        return DBManager.instance;
    }

    /**
     * 获取数据库连接
     * @returns Promise返回数据库连接对象
     */
    async connect():Promise<DBConnection> {
        return await this.factory.createDBConnection();
    }
}