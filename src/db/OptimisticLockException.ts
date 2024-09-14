export default class OptimisticLockException extends Error {

    #entity: any;

    constructor(message, entity) {
        super(message);
        //@ts-ignore
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.#entity = entity;
    }

    get entity():any {
        return this.#entity;
    }
}