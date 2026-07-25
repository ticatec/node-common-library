import {getLogger} from "./Logger.js";
import beanFactory from "./BeanFactory.js";

export type BeanLoader = () => Promise<any>;

export default class Beans {

    private static instance: Beans;
    private _types = {}
    protected logger = getLogger('Beans');

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
     */
    register(name: string, loader: BeanLoader) {
        this.logger.debug(`注册类型${name}`);
        this._types[name] = {loader}
    }

    /**
     * 加载所有注册的Bean类型到BeanFactory中
     * @returns Promise完成加载操作
     */
    async load(): Promise<void> {
        this.logger.debug(this._types, '引入注册类型');
        for (let t in this._types) {
            let v = this._types[t];
            if (v.loader != null) {
                let classLoader = (await v.loader()).default;
                beanFactory.register(t, classLoader);
            }
        }
    }
}