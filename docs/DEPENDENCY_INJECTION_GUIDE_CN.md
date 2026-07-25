# 依赖注入和 Bean 管理指南

[English](DEPENDENCY_INJECTION_GUIDE.md) | 中文文档

本文档详细说明如何使用 `@ticatec/node-common-library` 的 `beanFactory` 进行依赖注入与 Bean 管理。

## 📚 目录

1. [依赖注入基础](#依赖注入基础)
2. [BeanFactory 懒加载单例代理](#beanfactory-懒加载单例代理)
3. [注册和获取 Bean](#注册和获取-bean)
4. [循环依赖自动解耦](#循环依赖自动解耦)
5. [最佳实践](#最佳实践)

---

## BeanFactory 懒加载单例代理

`@ticatec/node-common-library` 导出了全局单例 `beanFactory`。

通过 `beanFactory.register(name, Class)` 注册 Bean 时，**不会立即实例化该对象**。在调用 `beanFactory.createBean<T>(name)`（或 `getDAOInstance` / `getRepositoryInstance`）时，框架会返回一个 ES Proxy 代理。直到真正调用代理方法或属性时，底层的对象实例才会被延迟构造并缓存。

```typescript
import { beanFactory } from '@ticatec/node-common-library';
import { UserDAO } from './UserDAO';
import { UserService } from './UserService';

// 1. 注册 Bean 类（零构造开销）
beanFactory.register('UserDAO', UserDAO);
beanFactory.register('UserService', UserService);

// 2. 获取单例代理
const userService = beanFactory.createBean<UserService>('UserService');
```

---

## 循环依赖自动解耦

因为实例构造推迟到方法首次调用时，这彻底解耦了模块加载阶段（`import`/`require`）容易发生的循环引用死锁或 `undefined` 构造器错误。
如果在实例化过程中触发真正的硬循环逻辑，`beanFactory` 代理会自动抛出可预测的异常：
`Error: 检测到循环依赖: BeanA -> BeanB -> BeanA`
