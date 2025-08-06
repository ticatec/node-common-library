
import log4js from 'log4js';                                                                                                                                                                                                                                                                                                        import DBConnection from "./DBConnection";
import DBFactory from "./DBFactory";

const logger = log4js.getLogger('DBManager')

export default class DBManager {

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
        logger.debug('初始化数据库管理工厂', factory);
        if (global.DBManagerInstance == null) {
            global.DBManagerInstance = new DBManager(factory)
        }
        return global.DBManagerInstance;
    }

    /**
     * 获取数据库管理器实例
     * @returns 数据库管理器实例
     */
    static getInstance(): DBManager {
        return global.DBManagerInstance;
    }

    /**
     * 获取数据库连接
     * @returns Promise返回数据库连接对象
     */
    async connect():Promise<DBConnection> {
        return await this.factory.createDBConnection();
    }
}