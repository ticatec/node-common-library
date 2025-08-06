import log4js from "log4js";
import beanFactory from "./BeanFactory";
import {Scope} from "./Scope";

export type BeanLoader = () => Promise<any>;

export default class Beans {

    private static instance: Beans;
    private _types = {}
    protected logger = log4js.getLogger('Beans');

    private constructor() {
    }

    /**
     * 获取Beans的单例实例
     * @static
     * @returns Beans单例对象
     */
    static getInstance(): Beans {
        if (Beans.instance == null) {
            Beans.instance = new Beans();
        }
        return Beans.instance;
    }

    /**
     * 注册一个Bean类型
     * @param name - Bean的名称
     * @param loader - Bean的加载器函数
     * @param scope - Bean的作用域，默认为单例模式
     */
    register(name: string, loader: BeanLoader, scope: Scope = Scope.Singleton) {
        this.logger.debug(`注册类型${name}`);
        this._types[name] = {loader, scope}
    }

    /**
     * 加载所有注册的Bean类型到BeanFactory中
     * @returns Promise完成加载操作
     */
    async load(): Promise<void> {
        this.logger.debug('引入注册类型', this._types);
        for (let t in this._types) {
            let v = this._types[t];
            if (v.loader != null) {
                let classLoader = (await v.loader()).default;
                beanFactory.register(t, classLoader, v.scope);
            }
        }
    }
}