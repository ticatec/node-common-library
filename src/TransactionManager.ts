// TransactionManager.ts
import DBConnection from './db/DBConnection.js';
import DBManager from './db/DBManager.js';
import ThreadLocal from './ThreadLocal.js';
import {Propagation} from "./db/Transaction.js";

interface TransactionContext {
    connection: DBConnection;
    // 可扩展：传播级别、保存点等
}

// TransactionManager.ts
export default class TransactionManager {
    private static threadLocal = new ThreadLocal<{
        connection: DBConnection;
        isTransaction: boolean;   // 标记是否为事务连接
    }>();

    static getCurrentConnection(): DBConnection | undefined {
        return this.threadLocal.get()?.connection;
    }

    /**
     * 执行数据库操作，自动管理连接生命周期
     * @param propagation 传播行为
     * @param fn 业务函数
     */
    static async execute(
        propagation: Propagation,
        fn: (conn: DBConnection) => Promise<any>
    ): Promise<any> {
        const currentCtx = this.threadLocal.get();

        // 若为 NONE 或 REQUIRED 且无上下文，则新建连接（但不开启事务）
        if (propagation === Propagation.NONE ||
            (propagation === Propagation.REQUIRED && !currentCtx)) {
            const conn = await DBManager.getInstance().connect();
            const ctx = { connection: conn, isTransaction: false };

            // 在上下文中运行，确保 DAO 能获取到连接
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

        // 已有事务，直接复用
        if (propagation === Propagation.REQUIRED && currentCtx) {
            return await fn(currentCtx.connection);
        }

        // REQUIRES_NEW 等其他传播行为可类似扩展
        throw new Error('Unsupported propagation: ' + propagation);
    }
}