/**
 * 乐观锁异常类，用于处理并发更新冲突
 */
export default class OptimisticLockException extends Error {

    #entity: any;

    /**
     * 构造函数
     * @param message - 错误信息
     * @param entity - 发生冲突的实体对象
     */
    constructor(message, entity) {
        super(message);
        //@ts-ignore
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.#entity = entity;
    }

    /**
     * 获取发生冲突的实体对象
     * @returns 实体对象
     */
    get entity():any {
        return this.#entity;
    }
}