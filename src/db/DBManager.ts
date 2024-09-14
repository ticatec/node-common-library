                                                                                                                                                                                                                                                                                                        import DBConnection from "./DBConnection";
import DBFactory from "./DBFactory";
import log4js from "log4js";

const logger = log4js.getLogger('DBManager')

export default class DBManager {

    private factory: DBFactory;
    private static instance: DBManager;

    private constructor(factory: DBFactory) {
        this.factory = factory;
    }

    static init(factory: DBFactory): DBManager {
        logger.debug('初始化数据库管理工厂', factory);
        if (DBManager.instance == null) {
            DBManager.instance = new DBManager(factory)
        }
        return DBManager.instance;
    }

    static getInstance(): DBManager {
        return DBManager.instance;
    }

    async connect():Promise<DBConnection> {
        return await this.factory.createDBConnection();
    }
}

// const init =  (factory: DBFactory): void => {
//     DBManager.init(factory);
// }
//
// const connect = async ():Promise<DBConnection> => {
//     return await DBManager.getInstance().connect();
// }
//
// export default {init, connect}