// ThreadLocal.ts
import { AsyncLocalStorage } from 'async_hooks';

export default class ThreadLocal<T extends object> {
    private storage = new AsyncLocalStorage<T>();

    run(value: T, fn: () => void): void {
        this.storage.run(value, fn);
    }

    get(): T | undefined {
        return this.storage.getStore();
    }

    set(value: T): void {
        const store = this.get();
        if (store) Object.assign(store, value);
    }
}