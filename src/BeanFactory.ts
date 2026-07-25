/**
 * 创建一个懒加载代理：真正的实例只有在第一次访问其属性或方法时才会被构造。
 * 之后所有访问都会转发到这个被缓存的实例上（单例语义）。
 *
 * 这样设计的目的是把 Bean 实例的构造推迟到真正使用时，
 * 避免在模块加载阶段因为交叉引用导致 ReferenceError / 循环依赖异常。
 */
function createBeanProxy(beanClass: any, name: string, creating: Set<string>): any {
    let instance: any = null;
    const getInstance = (): any => {
        if (instance == null) {
            if (creating.has(name)) {
                const chain = [...creating, name].join(' -> ');
                throw new Error(`检测到循环依赖: ${chain}`);
            }
            creating.add(name);
            try {
                instance = new beanClass();
            } finally {
                creating.delete(name);
            }
        }
        return instance;
    };
    return new Proxy({}, {
        get: (_target, prop) => {
            const target = getInstance();
            const value = target[prop];
            return typeof value === 'function' ? value.bind(target) : value;
        },
        set: (_target, prop, value) => {
            getInstance()[prop] = value;
            return true;
        },
        has: (_target, prop) => prop in getInstance(),
        deleteProperty: (_target, prop) => delete getInstance()[prop],
        ownKeys: () => Reflect.ownKeys(getInstance()),
        getOwnPropertyDescriptor: (_target, prop) =>
            Reflect.getOwnPropertyDescriptor(getInstance(), prop),
        getPrototypeOf: () => Reflect.getPrototypeOf(getInstance())
    });
}

export class BeanFactory {
    #classes: Map<string, any> = new Map();
    #proxies: Map<string, any> = new Map();
    #creating: Set<string> = new Set();

    /**
     * 注册一个 Bean 类型。
     * 不会立即实例化，只有在通过 createBean() 拿到的代理上调用方法时才会构造。
     *
     * @param name - Bean 的名称
     * @param beanClass - Bean 类的构造函数
     */
    register(name: string, beanClass: any): void {
        this.#classes.set(name, beanClass);
        this.#proxies.delete(name);
    }

    /**
     * 返回某个 Bean 的代理。同一个 name 始终返回同一个代理，
     * 代理内部的真实实例在首次访问时懒加载构造，并在后续访问中复用。
     *
     * @param name - Bean 的名称
     * @returns Bean 代理对象；如果未注册则返回 undefined
     */
    createBean<T>(name: string): T {
        const cached = this.#proxies.get(name);
        if (cached != null) {
            return cached as T;
        }
        const beanClass = this.#classes.get(name);
        if (beanClass == null) {
            return undefined as T;
        }
        const proxy = createBeanProxy(beanClass, name, this.#creating);
        this.#proxies.set(name, proxy);
        return proxy as T;
    }
}


const beanFactory: BeanFactory = new BeanFactory()

export default beanFactory;