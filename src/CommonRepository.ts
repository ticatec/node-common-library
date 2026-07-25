import {getLogger, Logger} from "./Logger.js";
import beanFactory from "./BeanFactory.js";



export default abstract class CommonRepository {

    protected readonly logger: Logger;

    protected constructor() {
        this.logger = getLogger(this.constructor.name);
        this.logger.debug(`Create repository instance:${this.constructor.name}`);
    }

    /**
     * 获取对应的DAO实例
     */
    protected getDAOInstance<T extends object>(name: string): T {
        return beanFactory.createBean<T>(name);
    }


}