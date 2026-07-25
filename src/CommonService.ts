import DBConnection from "./db/DBConnection.js";
import beanFactory from "./BeanFactory.js";
import { getLogger, Logger } from "./Logger.js";
import TransactionManager from './TransactionManager.js';
import {Propagation} from "./db/Transaction.js";

type dbProcessor = (conn: DBConnection) => Promise<any>;

export default abstract class CommonService {
    protected readonly logger: Logger;

    protected constructor() {
        this.logger = getLogger(this.constructor.name);
        this.logger.debug(`Created Service instance: ${this.constructor.name}`);
        this._applyTransactionAspect();
    }

    /**
     * Retrieves the database connection for the current transaction context.
     */
    protected async getDBConnection(): Promise<DBConnection> {
        const conn = TransactionManager.getCurrentConnection();
        if (!conn) {
            throw new Error('No connection in current context. Ensure the calling Service method has @Transaction.');
        }
        return conn;
    }

    /**
     * Obtains a lazy proxy for the specified Repository instance.
     * @param name - Registered Repository bean name.
     */
    protected getRepositoryInstance<T extends object>(name: string): T {
        return beanFactory.createBean<T>(name);
    }

    private _applyTransactionAspect(): void {
        let proto = Object.getPrototypeOf(this);
        const methodsToWrap: string[] = [];

        while (proto && proto !== Object.prototype) {
            const methodNames = Object.getOwnPropertyNames(proto)
                .filter(name => name !== 'constructor' && typeof proto[name] === 'function');
            for (const name of methodNames) {
                const isTx = Reflect.getMetadata('transaction:enabled', proto, name);
                if (isTx && !methodsToWrap.includes(name)) {
                    methodsToWrap.push(name);
                }
            }
            proto = Object.getPrototypeOf(proto);
        }

        for (const name of methodsToWrap) {
            const originalMethod = this[name as keyof this] as Function;
            if (typeof originalMethod !== 'function') continue;
            const propagation = Reflect.getMetadata('transaction:propagation', Object.getPrototypeOf(this), name)
                || Propagation.REQUIRED;

            (this as any)[name] = async (...args: any[]) => {
                return await TransactionManager.execute(propagation, async (conn) => {
                    return await originalMethod.apply(this, args);
                });
            };
        }
    }
}