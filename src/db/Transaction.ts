// db/Transaction.ts
import 'reflect-metadata';

export enum Propagation {
    REQUIRED,   // 默认：若当前有事务则加入，否则新建
    REQUIRES_NEW, // 始终新建独立事务
    NONE,       // 不开启事务（以非事务方式执行）
}

export function Transaction(propagation: Propagation = Propagation.REQUIRED) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // 在元数据中保存传播级别
        Reflect.defineMetadata('transaction:propagation', propagation, target, propertyKey);
        // 标记为事务方法
        Reflect.defineMetadata('transaction:enabled', true, target, propertyKey);
    };
}