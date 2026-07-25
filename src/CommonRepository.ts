import {getLogger, Logger} from "./Logger.js";
import beanFactory from "./BeanFactory.js";

export default abstract class CommonRepository {

    protected readonly logger: Logger;

    public constructor() {
        this.logger = getLogger(this.constructor.name);
        this.logger.debug(`Create repository instance:${this.constructor.name}`);
    }

    /**
     * Obtains a lazy proxy for the specified DAO instance.
     * @param name - Registered DAO bean name.
     */
    protected getDAOInstance<T extends object>(name: string): T {
        const bean = beanFactory.createBean<T>(name);
        if (!bean) {
            throw new Error(`DAO "${name}" is not registered in BeanFactory. Please register it via beanFactory.register('${name}', Class) before usage.`);
        }
        return bean;
    }
}