import {Scope} from "./Scope";

interface BeanClass {
    /**
     *
     */
    beanClass: any;
    /**
     *
     */
    beanInstance?: any;
    /**
     *
     */
    scope: Scope;
}

class BeanFactory {
    #map: Map<string, BeanClass> = new Map<string, BeanClass>();

    /**
     * 注册一个bean creator
     * @param name
     * @param beanClass
     * @param scope
     */
    register(name: string, beanClass: any, scope: Scope = Scope.Singleton): void {
        this.#map.set(name, {beanClass, scope});
    }

    /**
     * 获取一个实例
     * @param name
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

    createInstance(name: string): any {
        return this.getInstance(name);
    }
}

if (!global.beanFactoryInstance) {
    global.beanFactoryInstance = new BeanFactory();
}

let beanFactory = global.beanFactoryInstance;

export default beanFactory;