# @ticatec/node-common-library

[English](README.md) | 中文文档

一个全面的 Node.js 数据库访问框架，为数据库连接管理、SQL 执行、声明式事务处理、分页查询和动态查询构建提供强大的抽象层。

[![Version](https://img.shields.io/npm/v/@ticatec/node-common-library)](https://www.npmjs.com/package/@ticatec/node-common-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 特性

- **同时支持 ESM 与 CommonJS**：一个包内同时发布原生 ES Modules 与 CommonJS 产物，Node 会根据你的项目类型自动选择合适的格式
- **多数据库支持**：通过实现 `DBConnection` 抽象类即可适配任意数据库（参见同仓的 `mysql-common-library`、`pg-common-library`）
- **声明式事务**：使用 `@Transaction(propagation)` 注解 Service 方法即可，提交 / 回滚由 `TransactionManager` 基于 `AsyncLocalStorage` 自动处理，无需在代码里手动传递连接
- **分页查询**：内置 `PaginationList` 结果集与 `CommonSearchCriteria` 动态查询构造器
- **SQL 文件执行**：`executeSQLFile()` 会去除注释并逐条执行，单条出错不影响后续
- **字段转换**：自动下划线转驼峰、通过 `"profile.isActive"` 别名支持嵌套对象、`1/0/T/F` 自动转布尔
- **懒加载 Bean 工厂**：`beanFactory.register(name, Class)` + `beanFactory.createBean<T>(name)` 返回单例代理，把真实构造推迟到首次访问时，从而打破模块加载阶段的循环依赖
- **乐观锁**：内置 `OptimisticLockException`，用于上报并发更新冲突

## 📦 安装

```bash
pnpm add @ticatec/node-common-library @ticatec/logger-wrapper pino reflect-metadata
# 或 npm
npm install @ticatec/node-common-library @ticatec/logger-wrapper pino reflect-metadata
```

本包以 ESM / CJS 双模式发布，使用方无需任何额外配置 —— CommonJS 项目用 `require()`，ESM / TypeScript 项目用 `import`。

```typescript
// ESM / TypeScript
import { DBManager, beanFactory, CommonService, CommonDAO } from '@ticatec/node-common-library';

// CommonJS
const { DBManager, beanFactory, CommonService, CommonDAO } = require('@ticatec/node-common-library');
```

## 🚀 快速开始

### 1. 初始化 Logger（`@ticatec/logger-wrapper`）

应用层在启动入口初始化 Pino 日志实例，并通过 `@ticatec/logger-wrapper` 的 `initialize()` 完成全局单次初始化：

```typescript
import pino from 'pino';
import { initialize } from '@ticatec/logger-wrapper';

const appLogger = pino({ level: process.env.LOG_LEVEL || 'info' });
initialize(appLogger);
```

### 2. 初始化数据库管理器

为你的数据库驱动实现 `DBFactory`（或使用同仓的兄弟包），然后在应用启动时调用一次 `DBManager.init()`。

```typescript
import { DBManager } from '@ticatec/node-common-library';
import { MyDBFactory } from './MyDBFactory';

DBManager.init(new MyDBFactory());
```

### 3. 注册 DAO 与 Service

默认导出的 `beanFactory` 为全局单例。`register(name, Class)` **不会**立即实例化 —— `createBean(name)` 返回一个懒加载代理。

```typescript
import { beanFactory } from '@ticatec/node-common-library';
import { UserDAO } from './dao/UserDAO';
import { UserService } from './service/UserService';

beanFactory.register('UserDAO', UserDAO);
beanFactory.register('UserService', UserService);
```

### 4. 创建 DAO

`CommonDAO` 暴露 `getDBConnection()`，返回绑定在周围 `@Transaction` 上下文中的数据库连接。

```typescript
import { CommonDAO, DBConnection } from '@ticatec/node-common-library';

export class UserDAO extends CommonDAO {
    async createUser(user: User): Promise<number> {
        const conn = await this.getDBConnection();
        const sql = 'INSERT INTO users (name, email) VALUES ($1, $2)';
        return await conn.insertRecord(sql, [user.name, user.email]);
    }

    async findUserById(id: number): Promise<User> {
        const conn = await this.getDBConnection();
        return await conn.find('SELECT * FROM users WHERE id = $1', [id]);
    }

    async updateUser(user: User): Promise<number> {
        const conn = await this.getDBConnection();
        const sql = 'UPDATE users SET name = $1, email = $2 WHERE id = $3';
        return await conn.updateRecord(sql, [user.name, user.email, user.id]);
    }
}
```

### 5. 创建 Repository

Repository 继承 `CommonRepository`，通过 `getDAOInstance<T>(name)` 封装 DAO 操作：

```typescript
import { CommonRepository } from '@ticatec/node-common-library';
import type { UserDAO } from './dao/UserDAO';

export class UserRepository extends CommonRepository {
    async createUser(user: User): Promise<number> {
        const userDAO = this.getDAOInstance<UserDAO>('UserDAO');
        return await userDAO.createUser(user);
    }
}
```

### 6. 创建带有 `@Transaction` 的 Service

Service 方法使用 `@Transaction()` 装饰器标记。Service 继承 `CommonService` 并通过 `getRepositoryInstance<T>(name)` 访问 Repository：

```typescript
import { CommonService, Transaction, Propagation } from '@ticatec/node-common-library';
import type { UserRepository } from './repository/UserRepository';

export class UserService extends CommonService {
    @Transaction()
    async createUser(userData: User): Promise<number> {
        const userRepo = this.getRepositoryInstance<UserRepository>('UserRepository');
        return await userRepo.createUser(userData);
    }

    @Transaction(Propagation.REQUIRED)
    async transferMoney(from: number, to: number, amount: number): Promise<void> {
        const userDAO = this.getRepositoryInstance<UserDAO>('UserDAO');
        // 两次更新要么一起提交，要么一起回滚
    }

    @Transaction(Propagation.NONE)
    async getUser(id: number): Promise<User> {
        const userDAO = this.getRepositoryInstance<UserDAO>('UserDAO');
        return await userDAO.findUserById(id);  // 以非事务方式运行
    }
}
```

### 5. 使用 `CommonSearchCriteria` 进行动态查询

```typescript
import { CommonSearchCriteria, DBConnection, PaginationList } from '@ticatec/node-common-library';

class UserSearchCriteria extends CommonSearchCriteria {
    constructor(criteria?: any) {
        super(criteria);
        this.sql = 'SELECT id, name, email, created_at FROM users WHERE 1=1';
        this.orderBy = 'ORDER BY created_at DESC';
    }

    protected buildDynamicQuery(): void {
        if (this.criteria?.name) {
            this.addWildcardCriteria(this.criteria.name, 'name');     // '*' → LIKE
        }
        if (this.criteria?.email) {
            this.addEqualsCriteria(this.criteria.email, 'email');        // exact match
        }
        if (this.criteria?.dateFrom || this.criteria?.dateTo) {
            this.addRangeCriteria(this.criteria.dateFrom, this.criteria.dateTo, 'created_at');
        }
    }
}

// 需在 @Transaction 或 TransactionManager.execute 上下文内调用：
const result: PaginationList = await new UserSearchCriteria({
    name: 'John*',
    email: 'john@example.com',
    page: 1,
    pageSize: 20
}).paginationQuery(conn);

console.log(`总计: ${result.count}, 总页数: ${result.pages}`);
```

## 🏗️ 核心组件

### CommonDAO

数据访问对象的抽象基类。子类可直接使用以下成员：

| 成员 | 用途 |
| --- | --- |
| `getDBConnection()` | 返回外层事务上下文绑定的连接 |
| `genID()` | 生成 32 位无分隔符 UUID v7 |
| `executeCountSQL(sql, params, key?)` | 执行 `count(*)` 并返回数值 |
| `quickSearch<T>(sql, params, pageNo?, rowCount?, booleanFields?)` | 分页查询，返回 `{ list, hasMore }` |
| `convertBooleanFields(data, fields)` | 原地将 T/F 转为布尔 |
| `getBooleanValue(b)` / `getBoolean(b)` | 转为 `1`/`0` 或 `'T'`/`'F'` |

### CommonService

Service 抽象基类。构造函数会扫描原型链，将所有标注了 `@Transaction` 的方法包装一层，使其方法体在 `TransactionManager.execute(propagation, …)` 内运行。

| 成员 | 用途 |
| --- | --- |
| `@Transaction(propagation?)` | 方法装饰器，打开事务上下文 |
| `getDBConnection()` | 返回当前事务的连接 |
| `getRepositoryInstance<T>(name)` | 返回已注册的 DAO 代理 |
| `logger` | 以子类名为 scope 的 pino child logger |

### 事务传播行为

定义在 `Propagation` 枚举中：

- `REQUIRED`（默认）—— 存在事务则加入，否则新建
- `REQUIRES_NEW` —— 始终开启独立事务
- `NONE` —— 以非事务方式获取连接

如果不想使用装饰器，可以直接调用 `TransactionManager.execute(propagation, fn)`：

```typescript
import { TransactionManager, Propagation } from '@ticatec/node-common-library';

await TransactionManager.execute(Propagation.REQUIRED, async (conn) => {
    // resolve 时提交，throw 时回滚
});
```

### DBConnection

定义数据库原生操作的抽象类，由各数据库驱动实现。框架内部调用这些方法，由驱动映射到底层客户端。

- **事务控制**：`beginTransaction()`、`commit()`、`rollback()`、`close()`
- **写操作**：`executeUpdate()`、`insertRecord()`、`updateRecord()`、`deleteRecord()`
- **读操作**：`find()`（单行）、`listQuery()`（多行）、`executeCountSQL()`、`quickSearch()`
- **条件查询辅助**：`executePaginationSQL(criteria)`、`queryByCriteria(criteria)`
- **SQL 文件**：`executeSQLFile(path)` —— 去除 `/* */`、`--`、`//` 注释后逐条执行，单条出错被捕获并记录日志
- **结果整形**：自动下划线转驼峰、通过 `"parent.child.field"` 支持嵌套路径、布尔转换

#### 布尔字段自动转换

```typescript
// 简单字段
const user = await conn.find(
    'SELECT * FROM users WHERE id = $1',
    [id],
    null,
    ['isActive', 'isVerified']          // 原地转换
);

// 通过 SQL 别名支持嵌套字段
const userWithProfile = await conn.find(
    `SELECT u.*, p.is_active AS "profile.isActive"
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = $1`,
    [id],
    null,
    ['profile.isActive']                // 按点分路径逐层下钻
);
```

### CommonSearchCriteria / SearchCriteria

动态查询构造器。`CommonSearchCriteria` 是具体基类；`SearchCriteria` 继承自它，可作为标记用途由你继续扩展。

| 方法 | 用途 |
| --- | --- |
| `buildDynamicQuery()` | 重写以追加 `and …` 子句并 push 参数 |
| `addEqualsCriteria(value, field)` / `buildCriteria` | 非空时追加 `field = $N` |
| `addWildcardCriteria(text, field)` / `buildStarCriteria` | 包含 `*` 走 `LIKE`，否则 `=` |
| `addRangeCriteria(from, to, field)` / `buildRangeCriteria` | 追加 `field >= $N` 与 / 或 `field < $N+1` |
| `wrapLikeMatch(s)` / `replaceWildStar(s)` | LIKE 值字符串工具 |
| `setBooleanFields(...fields)` | 设置结果集中需要转布尔的字段 |
| `paginationQuery(conn)` | 返回 `{ count, hasMore, list, pages }` |
| `query(conn)` | 不分页，返回所有匹配行 |

### BeanFactory

`beanFactory` 是默认导出的单例。如果需要独立的注册表，命名导出的 `BeanFactory` 类也可以直接使用。

```typescript
import { beanFactory, BeanFactory } from '@ticatec/node-common-library';

beanFactory.register('UserDAO', UserDAO);

// 返回一个 Proxy。真实实例在首次属性访问时才构造，
// 之后所有访问都复用同一个实例 —— 懒加载的单例语义。
const userDAO = beanFactory.createBean<UserDAO>('UserDAO');
```

代理机制可以打破循环依赖：注册互相引用的 A 和 B 不再会触发模块加载阶段的 `ReferenceError`，因为在代理上调用方法之前，两者都不会被构造。

## 🔧 高级特性

### 批量处理

```typescript
import { BatchRecord, BatchRecords } from '@ticatec/node-common-library';

const batch: BatchRecords<User> = [
    { recNo: 1, data: { name: 'User 1', email: 'u1@x.com' }, error: null },
    { recNo: 2, data: { name: 'User 2', email: 'u2@x.com' }, error: null }
];

for (const record of batch) {
    try {
        await userDAO.createUser(record.data);
    } catch (err) {
        record.error = err;
    }
}
```

### 通过 `BitsBoolean` 做位压缩标志

```typescript
import { BitsBoolean } from '@ticatec/node-common-library';

class UserPermissions extends BitsBoolean {
    constructor(value = 0) { super(value); }
    setCanRead(v: boolean)  { this.setBitValue(0, v); }
    getCanRead(): boolean   { return this.getBitValue(0); }
    setCanWrite(v: boolean) { this.setBitValue(1, v); }
    getCanWrite(): boolean  { return this.getBitValue(1); }
}

// 也可以：BitsBoolean.fromBooleanArray([true, false, true]) → 5
```

### 字符串工具

```typescript
import { StringUtils } from '@ticatec/node-common-library';

StringUtils.genID();               // 32 位无分隔符 UUID v7
StringUtils.uuid();                // 标准带分隔符 UUID v7
StringUtils.isEmpty('   ');        // true
StringUtils.isNumber('123');       // true
StringUtils.parseNumber('abc', 0); // 0（回退值）
StringUtils.leftPad('45', '0', 4); // '0045'
```

### 日志

框架底层使用 [`pino`](https://github.com/pinojs/pino)。通过 `getLogger(name)` 获取以你的类名 / 模块名为 scope 的 child logger；日志级别由环境变量 `LOG_LEVEL` 控制（默认 `info`）。

```typescript
import { getLogger, rootLogger, Logger } from '@ticatec/node-common-library';

const log: Logger = getLogger('MyService');
log.info({ userId }, 'user logged in');
```

## 📋 API 参考

### 接口（仅类型）

- **`DBFactory`** —— 产生 `DBConnection` 实例的工厂
- **`PaginationList`** —— `{ count, hasMore, list, pages }`
- **`QuickSearchResult<T>`** —— `{ list: T[], hasMore: boolean }`
- **`Field`** —— `{ name, type: FieldType, length? }`
- **`BaseDAO<T, K>`** —— `createNew`、`update`、按主键 `find`
- **`BaseCRUDDAO<T, K>`** —— 在 `BaseDAO` 之上扩展 `remove`

### 类型（仅类型）

- **`PostConstructionFun`** —— `(obj: any) => void`，用于 `find` / `listQuery`
- **`Logger`** —— `pino.Logger` 的别名
- **`BatchRecord<T>`** / **`BatchRecords<T>`** —— 批处理记录的形状

### 枚举

- **`FieldType`** —— `Text`、`Number`、`Date`
- **`Propagation`** —— `REQUIRED`、`REQUIRES_NEW`、`NONE`

### 异常

- **`OptimisticLockException`** —— 继承自 `Error`，冲突实体放在 `.entity` 上

```typescript
import { OptimisticLockException } from '@ticatec/node-common-library';

try {
    await userDAO.updateUser(user);
} catch (err) {
    if (err instanceof OptimisticLockException) {
        console.warn('并发修改冲突：', err.entity);
    }
}
```

## 🛠️ 构建与发布

| 脚本 | 作用 |
| --- | --- |
| `npm run build` | 清理 `lib/`，将 CommonJS 编译到 `lib/cjs/`、ESM 编译到 `lib/esm/`，并拷贝标记 `package.json` |
| `npm run typecheck` | 同时对 `tsconfig.cjs.json` 与 `tsconfig.esm.json` 跑 `tsc --noEmit` |
| `npm run clean` | 清理 `lib/` |
| `npm run publish-public` | `npm publish --access public` |

双模式构建依赖 `package.json` 中的 `exports` 字段：`.` 入口把 `import` 路由到 `lib/esm/index.js`，`require` 路由到 `lib/cjs/index.js`，类型由 `lib/cjs/index.d.ts` 提供。为兼容历史调用方，另保留了 `./lib/db/Field` 子路径。

## 📝 依赖

- **uuid** —— 用于 `StringUtils.genID()` / `StringUtils.uuid()` 的 UUID v7 生成
- **pino** —— 结构化日志（对等依赖）
- **reflect-metadata** —— `@Transaction` 装饰器元数据所需

## 🤝 贡献

1. Fork 该仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

该项目使用 MIT 许可证 —— 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

**Henry Feng** —— [huili.f@gmail.com](mailto:huili.f@gmail.com)

## 🔗 链接

- [GitHub 仓库](https://github.com/ticatec/node-common-library)
- [NPM 包](https://www.npmjs.com/package/@ticatec/node-common-library)
- [问题跟踪](https://github.com/ticatec/node-common-library/issues)