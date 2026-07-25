import DBConnection from "./DBConnection.js";

/**
 * Database connection factory interface.
 */
export default interface DBFactory {
    /**
     * Creates a new database connection instance.
     * @returns Promise resolving to a DBConnection object.
     */
    createDBConnection(): Promise<DBConnection>;
}