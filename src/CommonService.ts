import DBManager from './db/DBManager'
import DBConnection from "./db/DBConnection";
import beanFactory from "./BeanFactory";
import log4js, {Logger} from "log4js";

type dbProcessor = (conn: DBConnection) => Promise<any>

export default abstract class CommonService {

    protected readonly logger: Logger;

    protected constructor() {
        this.logger = log4js.getLogger(this.constructor.name);
        this.logger.debug(`创建Service实例:${this.constructor.name}`);
    }


    /**
     * 获取数据库连接
     * @protected
     * @returns Promise返回数据库连接对象
     */
    protected async getDBConnection():Promise<DBConnection> {
        const dbMgr = DBManager.getInstance();
        return await dbMgr.connect();
    }

    /**
     * 获取对应的DAO实例
     * @param name - DAO的名称
     * @protected
     * @returns DAO实例对象
     */
    protected getDAOInstance(name: string): any {
        return beanFactory.createBean(name);
    }

    /**
     * 在事务中运行数据库操作，自动处理事务的开始、提交和回滚
     * @param dbProcessor - 数据库处理函数，接收数据库连接作为参数
     * @returns Promise返回处理结果
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
     * 在非事务中运行数据库操作
     * @param dbProcessor - 数据库处理函数，接收数据库连接作为参数
     * @returns Promise返回处理结果
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