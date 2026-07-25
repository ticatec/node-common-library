import {getLogger, Logger} from "../Logger.js";
import DBConnection from "./DBConnection.js";
import DBFactory from "./DBFactory.js";

export default class DBManager {

    private static instance: DBManager;
    private static _logger: Logger | null = null;

    private static get logger(): Logger {
        if (!DBManager._logger) {
            DBManager._logger = getLogger('DBManager');
        }
        return DBManager._logger;
    }

    private factory: DBFactory;

    private constructor(factory: DBFactory) {
        this.factory = factory;
    }

    /**
     * Initializes the database manager with a database factory.
     * @param factory - Database connection factory.
     * @returns DBManager singleton instance.
     */
    static init(factory: DBFactory): DBManager {
        if (DBManager.instance == null) {
            DBManager.logger.debug({factory}, 'Initializing database manager factory');
            DBManager.instance = new DBManager(factory);
        }
        return DBManager.instance;
    }

    /**
     * Obtains the singleton instance of DBManager.
     * @returns DBManager singleton instance.
     */
    static getInstance(): DBManager {
        return DBManager.instance;
    }

    /**
     * Creates a new database connection.
     * @returns Promise resolving to a DBConnection instance.
     */
    async connect(): Promise<DBConnection> {
        return await this.factory.createDBConnection();
    }
}