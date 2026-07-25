# Dependency Injection & Bean Management Guide

[中文文档](DEPENDENCY_INJECTION_GUIDE_CN.md) | English

This document explains how to perform dependency management using `beanFactory` in `@ticatec/node-common-library`.

## 📚 Table of Contents

1. [DI Overview](#di-overview)
2. [Lazy Bean Proxies](#lazy-bean-proxies)
3. [Registering & Retrieving Beans](#registering--retrieving-beans)
4. [Circular Dependency Prevention](#circular-dependency-prevention)

---

## Lazy Bean Proxies

The package provides a default exported singleton instance: `beanFactory`.

When calling `beanFactory.register(name, Class)`, the class is **not** instantiated immediately. Instead, calling `beanFactory.createBean<T>(name)` returns a transparent Proxy. The underlying instance is lazily instantiated upon first property or method invocation and cached as a singleton thereafter.

```typescript
import { beanFactory } from '@ticatec/node-common-library';
import { UserDAO } from './UserDAO';
import { UserService } from './UserService';

// 1. Register Bean constructors
beanFactory.register('UserDAO', UserDAO);
beanFactory.register('UserService', UserService);

// 2. Retrieve lazy singleton proxy
const userService = beanFactory.createBean<UserService>('UserService');
```

---

## Circular Dependency Prevention

Because instantiation is deferred until first invocation, circular dependencies during module loading (`import`/`require`) do not throw `ReferenceError: Cannot access before initialization`.

If a true runtime cycle occurs during instantiation, `beanFactory` throws a clear diagnostic error:
`Error: Circular dependency detected: BeanA -> BeanB -> BeanA`