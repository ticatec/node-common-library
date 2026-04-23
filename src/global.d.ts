/**
 * 全局类型声明
 * 用于扩展 Node.js 全局对象，添加项目特定的全局变量
 */

import DBManager from './db/DBManager';
import {BeanFactory} from './BeanFactory';

declare global {
    /**
     * 数据库管理器全局实例
     */
    var DBManagerInstance: DBManager | undefined;

    /**
     * Bean工厂全局实例
     */
    var beanFactoryInstance: BeanFactory | undefined;
}

export {};