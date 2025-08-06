import {Scope} from "./Scope";

interface BeanClass {
    /**
     * Bean类的构造函数
     */
    beanClass: any;
    /**
     * Bean实例（用于单例模式）
     */
    beanInstance?: any;
    /**
     * Bean的作用域（单例或原型）
     */
    scope: Scope;
}

class BeanFactory {
    #map: Map<string, BeanClass> = new Map<string, BeanClass>();

    /**
     * 注册一个Bean创建器
     * @param name - Bean的名称
     * @param beanClass - Bean类的构造函数
     * @param scope - Bean的作用域，默认为单例模式
     */
    register(name: string, beanClass: any, scope: Scope = Scope.Singleton): void {
        this.#map.set(name, {beanClass, scope});
    }

    /**
     * 获取Bean实例，根据作用域返回单例或新实例
     * @param name - Bean的名称
     * @returns Bean实例对象
     */
    getInstance(name: string): any {
        let item:BeanClass = this.#map.get(name);
        if (item != null) {
            if (item.scope == Scope.Prototype) {
                return new item.beanClass();
            } else {
                if (item.beanInstance == null) {
                    item.beanInstance = new item.beanClass();
                }
            }
            return item.beanInstance;
        }
    }

    /**
     * 创建Bean实例（getInstance方法的别名）
     * @param name - Bean的名称
     * @returns Bean实例对象
     */
    createInstance(name: string): any {
        return this.getInstance(name);
    }

    /**
     * 创建Bean实例（getInstance方法的别名）
     * @param name - Bean的名称
     * @returns Bean实例对象
     */
    createBean(name: string): any {
        return this.getInstance(name);
    }
}

if (!global.beanFactoryInstance) {
    global.beanFactoryInstance = new BeanFactory();
}

let beanFactory: BeanFactory = global.beanFactoryInstance;

export default beanFactory;