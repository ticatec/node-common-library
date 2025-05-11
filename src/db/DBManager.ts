
import log4js from 'log4js';                                                                                                                                                                                                                                                                                                        import DBConnection from "./DBConnection";
import DBFactory from "./DBFactory";

const logger = log4js.getLogger('DBManager')

export default class DBManager {

    private factory: DBFactory;

    private constructor(factory: DBFactory) {
        this.factory = factory;
    }

    static init(factory: DBFactory): DBManager {
        logger.debug('初始化数据库管理工厂', factory);
        if (global.DBManagerInstance == null) {
            global.DBManagerInstance = new DBManager(factory)
        }
        return global.DBManagerInstance;
    }

    static getInstance(): DBManager {
        return global.DBManagerInstance;
    }

    async connect():Promise<DBConnection> {
        return await this.factory.createDBConnection();
    }
}