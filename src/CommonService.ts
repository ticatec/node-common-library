import DBManager from './db/DBManager'
import DBConnection from "./db/DBConnection";
import beanFactory from "./BeanFactory";
import log4js from '@ticatec/singleton-log4js';

type dbProcessor = (conn: DBConnection) => Promise<any>

export default abstract class CommonService {

    protected readonly logger;

    protected constructor() {
        this.logger = log4js.getLogger(this.constructor.name);
        this.logger.debug(`创建Service实例:${this.constructor.name}`);
    }


    private async getDBConnection():Promise<DBConnection> {
        const dbMgr = DBManager.getInstance();
        return await dbMgr.connect();
    }

    /**
     * 获取对应的DAO实例
     * @param name
     * @protected
     */
    protected getDAOInstance(name: string): any {
        return beanFactory.getInstance(name);
    }

    /**
     * 在事务中运行
     * @param dbProcessor
     */
    executeInTx = async (dbProcessor): Promise<any> =>  {
        let conn = await this.getDBConnection();
        try {
            await conn.beginTransaction();
            let result = await dbProcessor(conn);
            await conn.commit();
            return result;
        } catch (ex) {
            await conn.rollback();
            throw ex;
        } finally {
            await conn.close();
        }
    }

    /**
     * 在非事务中运行
     * @param dbProcessor
     */
    executeNonTx = async (dbProcessor): Promise<any> =>  {
        let conn = await this.getDBConnection();
        try {
            return await dbProcessor(conn);
        } finally {
            await conn.close();
        }
    }

}