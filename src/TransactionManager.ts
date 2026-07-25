import DBConnection from './db/DBConnection.js';
import DBManager from './db/DBManager.js';
import ThreadLocal from './ThreadLocal.js';
import {Propagation} from "./db/Transaction.js";

interface TransactionContext {
    connection: DBConnection;
    isTransaction: boolean;
}

export default class TransactionManager {
    private static threadLocal = new ThreadLocal<TransactionContext>();

    static getCurrentConnection(): DBConnection | undefined {
        return this.threadLocal.get()?.connection;
    }

    /**
     * Executes database operations while managing connection lifecycle and transaction state automatically.
     * @param propagation Transaction propagation behavior.
     * @param fn Business processor function receiving the database connection.
     */
    static async execute(
        propagation: Propagation,
        fn: (conn: DBConnection) => Promise<any>
    ): Promise<any> {
        const currentCtx = this.threadLocal.get();

        // If propagation is NONE or REQUIRED without existing context, open a new connection
        if (propagation === Propagation.NONE ||
            (propagation === Propagation.REQUIRED && !currentCtx)) {
            const conn = await DBManager.getInstance().connect();
            const ctx: TransactionContext = { connection: conn, isTransaction: false };

            // Run within AsyncLocalStorage thread context so DAOs can access the connection
            return new Promise((resolve, reject) => {
                this.threadLocal.run(ctx, async () => {
                    try {
                        if (propagation !== Propagation.NONE) {
                            await conn.beginTransaction();
                            ctx.isTransaction = true;
                        }
                        const result = await fn(conn);
                        if (ctx.isTransaction) {
                            await conn.commit();
                        }
                        resolve(result);
                    } catch (error) {
                        if (ctx.isTransaction) {
                            await conn.rollback();
                        }
                        reject(error);
                    } finally {
                        await conn.close();
                    }
                });
            });
        }

        // Reuse active transaction connection if REQUIRED propagation and context exists
        if (propagation === Propagation.REQUIRED && currentCtx) {
            return await fn(currentCtx.connection);
        }

        throw new Error('Unsupported propagation: ' + propagation);
    }
}