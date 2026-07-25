# @ticatec/node-common-library

[中文文档](README_CN.md) | English

A comprehensive Node.js database access framework providing robust abstractions for database connection management, SQL execution, declarative transaction handling, pagination, and dynamic query building.

[![Version](https://img.shields.io/npm/v/@ticatec/node-common-library)](https://www.npmjs.com/package/@ticatec/node-common-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **Dual ESM / CommonJS**: ships native ES modules and CommonJS from one package — Node picks the right format automatically based on your project
- **Multi-database Support**: adapt to any database by implementing the `DBConnection` abstract class (e.g. the sibling packages `mysql-common-library`, `pg-common-library`)
- **Declarative Transactions**: annotate service methods with `@Transaction(propagation)` — commit / rollback is handled by `TransactionManager` using `AsyncLocalStorage`, so the active connection is propagated without being passed around
- **Paginated Queries**: built-in `PaginationList` result and `CommonSearchCriteria` dynamic query builder
- **SQL File Execution**: `executeSQLFile()` strips comments and runs each statement, logging per-statement errors
- **Field Transformation**: automatic underscore → camelCase, nested object hydration via `"profile.isActive"` aliases, and 1/0/T/F → boolean coercion
- **Lazy Bean Factory**: `beanFactory.register(name, Class)` + `beanFactory.createBean<T>(name)` returns a singleton proxy that defers construction until first use, breaking circular-dependency cycles at module load time
- **Optimistic Locking**: `OptimisticLockException` for concurrent-update conflict reporting

## 📦 Installation

```bash
pnpm add @ticatec/node-common-library @ticatec/logger-wrapper pino reflect-metadata
# or npm
npm install @ticatec/node-common-library @ticatec/logger-wrapper pino reflect-metadata
```

The package is published as dual ESM/CJS. Consumers do not need any extra configuration — `require()` works in CommonJS projects and `import` works in ESM / TypeScript projects.

```typescript
// ESM / TypeScript
import { DBManager, beanFactory, CommonService, CommonDAO } from '@ticatec/node-common-library';

// CommonJS
const { DBManager, beanFactory, CommonService, CommonDAO } = require('@ticatec/node-common-library');
```

## 🚀 Quick Start

### 1. Initialize Logger (`@ticatec/logger-wrapper`)

Host applications initialize Pino logger and call `initialize()` ONCE at application startup:

```typescript
import pino from 'pino';
import { initialize } from '@ticatec/logger-wrapper';

const appLogger = pino({ level: process.env.LOG_LEVEL || 'info' });
initialize(appLogger);
```

### 2. Initialize the database manager

Implement `DBFactory` for your database driver (or use one of the sibling packages), then call `DBManager.init()` exactly once at application startup.

```typescript
import { DBManager } from '@ticatec/node-common-library';
import { MyDBFactory } from './MyDBFactory';

DBManager.init(new MyDBFactory());
```

### 2. Register DAOs and Services

The default export `beanFactory` is a singleton. `register(name, Class)` does **not** instantiate the class — `createBean(name)` returns a lazy proxy whose underlying instance is built on first access and reused thereafter.

```typescript
import { beanFactory } from '@ticatec/node-common-library';
import { UserDAO } from './dao/UserDAO';
import { UserService } from './service/UserService';

beanFactory.register('UserDAO', UserDAO);
beanFactory.register('UserService', UserService);
```

### 3. Create a DAO

`CommonDAO` exposes `getDBConnection()` which returns the connection bound to the surrounding `@Transaction` context.

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

### 4. Create a Repository

Repositories extend `CommonRepository` and encapsulate DAO operations using `getDAOInstance<T>(name)`:

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

### 5. Create a Service with `@Transaction`

Service methods are annotated with `@Transaction()`. Services extend `CommonService` and access repositories via `getRepositoryInstance<T>(name)`:

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
        // both updates commit together, or roll back together on throw
    }

    @Transaction(Propagation.NONE)
    async getUser(id: number): Promise<User> {
        const userDAO = this.getRepositoryInstance<UserDAO>('UserDAO');
        return await userDAO.findUserById(id);  // runs on a non-transactional connection
    }
}
```

### 5. Dynamic Search with `CommonSearchCriteria`

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
            this.buildStarCriteria(this.criteria.name, 'name');     // '*' → LIKE
        }
        if (this.criteria?.email) {
            this.buildCriteria(this.criteria.email, 'email');        // exact match
        }
        if (this.criteria?.dateFrom || this.criteria?.dateTo) {
            this.buildRangeCriteria(this.criteria.dateFrom, this.criteria.dateTo, 'created_at');
        }
    }
}

// inside a @Transaction or TransactionManager.execute context:
const result: PaginationList = await new UserSearchCriteria({
    name: 'John*',
    email: 'john@example.com',
    page: 1,
    rows: 20
}).paginationQuery(conn);

console.log(`Total: ${result.count}, Pages: ${result.pages}`);
```

## 🏗️ Core Components

### CommonDAO

Abstract base class for Data Access Objects. Key members available to subclasses:

| Member | Purpose |
| --- | --- |
| `getDBConnection()` | Returns the connection bound to the surrounding transaction context |
| `genID()` | 32-char UUID v7 with dashes stripped |
| `executeCountSQL(sql, params, key?)` | Runs a `count(*)` query and returns a number |
| `quickSearch<T>(sql, params, pageNo?, rowCount?, booleanFields?)` | Paginated query returning `{ list, hasMore }` |
| `convertBooleanFields(data, fields)` | In-place T/F → boolean coercion |
| `getBooleanValue(b)` / `getBoolean(b)` | `1`/`0` or `'T'`/`'F'` coercion |

### CommonService

Abstract service base class. The constructor scans the prototype chain and wraps every method annotated with `@Transaction` so the body runs inside `TransactionManager.execute(propagation, …)`.

| Member | Purpose |
| --- | --- |
| `@Transaction(propagation?)` | Method decorator that opens a transactional context |
| `getDBConnection()` | Returns the connection of the current transaction |
| `getRepositoryInstance<T>(name)` | Returns the registered DAO proxy |
| `logger` | pino child logger scoped to the subclass name |

### Transaction propagation

Defined in `Propagation`:

- `REQUIRED` (default) — join the surrounding transaction, or start a new one if none exists
- `REQUIRES_NEW` — always start an independent transaction
- `NONE` — run on a fresh, non-transactional connection

For ad-hoc use without the decorator, call `TransactionManager.execute(propagation, fn)` directly:

```typescript
import { TransactionManager, Propagation } from '@ticatec/node-common-library';

await TransactionManager.execute(Propagation.REQUIRED, async (conn) => {
    // conn is committed on resolve, rolled back on throw
});
```

### DBConnection

Abstract class defining the database primitive operations a driver must implement. The library calls into these methods; the driver maps them to its native client.

- **Transactions**: `beginTransaction()`, `commit()`, `rollback()`, `close()`
- **Writes**: `executeUpdate()`, `insertRecord()`, `updateRecord()`, `deleteRecord()`
- **Reads**: `find()` (single row), `listQuery()` (many rows), `executeCountSQL()`, `quickSearch()`
- **Criteria helpers**: `executePaginationSQL(criteria)`, `queryByCriteria(criteria)`
- **SQL files**: `executeSQLFile(path)` — strips `/* */`, `--`, `//` comments and runs statements one-by-one, swallowing and logging per-statement errors
- **Result shaping**: automatic underscore → camelCase, nested paths via `"parent.child.field"`, boolean coercion

#### Boolean field auto-conversion

```typescript
// Simple fields
const user = await conn.find(
    'SELECT * FROM users WHERE id = $1',
    [id],
    null,
    ['isActive', 'isVerified']          // converted in place
);

// Nested fields via SQL aliasing
const userWithProfile = await conn.find(
    `SELECT u.*, p.is_active AS "profile.isActive"
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = $1`,
    [id],
    null,
    ['profile.isActive']                // walks the dotted path
);
```

### CommonSearchCriteria / SearchCriteria

Dynamic query builder. `CommonSearchCriteria` is the concrete base; `SearchCriteria` is a thin alias you may extend for marker purposes.

| Method | Purpose |
| --- | --- |
| `buildDynamicQuery()` | Override to append `and …` clauses and push params |
| `buildCriteria(value, field)` | Appends `field = $N` when value is non-empty |
| `buildStarCriteria(text, field)` | `*` wildcards → `LIKE`, otherwise `=` |
| `buildRangeCriteria(from, to, field)` | Appends `field >= $N` and/or `field < $N+1` |
| `wrapLikeMatch(s)` / `replaceWildStar(s)` | String helpers for LIKE values |
| `setBooleanFields(...fields)` | Sets which result fields to coerce to boolean |
| `paginationQuery(conn)` | Returns `{ count, hasMore, list, pages }` |
| `query(conn)` | Non-paginated run returning every matching row |

### BeanFactory

`beanFactory` is the default-export singleton. The `BeanFactory` class is also named-exported if you need a separate registry.

```typescript
import { beanFactory, BeanFactory } from '@ticatec/node-common-library';

beanFactory.register('UserDAO', UserDAO);

// Returns a Proxy. The real instance is constructed on first property access
// and reused on every subsequent access — singletons without eager construction.
const userDAO = beanFactory.createBean<UserDAO>('UserDAO');
```

The proxy breaks circular dependencies: registering A and B that reference each other no longer triggers a `ReferenceError` at module load — neither is built until something actually calls a method on its proxy.

## 🔧 Advanced Features

### Batch processing

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

### Bit-packed flags via `BitsBoolean`

```typescript
import { BitsBoolean } from '@ticatec/node-common-library';

class UserPermissions extends BitsBoolean {
    constructor(value = 0) { super(value); }
    setCanRead(v: boolean)  { this.setBitValue(0, v); }
    getCanRead(): boolean   { return this.getBitValue(0); }
    setCanWrite(v: boolean) { this.setBitValue(1, v); }
    getCanWrite(): boolean  { return this.getBitValue(1); }
}

// also: BitsBoolean.fromBooleanArray([true, false, true]) → 5
```

### String utilities

```typescript
import { StringUtils } from '@ticatec/node-common-library';

StringUtils.genID();               // 32-char UUID v7, no dashes
StringUtils.uuid();                // canonical UUID v7 with dashes
StringUtils.isEmpty('   ');        // true
StringUtils.isNumber('123');       // true
StringUtils.parseNumber('abc', 0); // 0 (fallback)
StringUtils.leftPad('45', '0', 4); // '0045'
```

### Logging

The library uses [`pino`](https://github.com/pinojs/pino) under the hood. Pull `getLogger(name)` for a child logger scoped to your class or module; the level is read from `LOG_LEVEL` (default `info`).

```typescript
import { getLogger, rootLogger, Logger } from '@ticatec/node-common-library';

const log: Logger = getLogger('MyService');
log.info({ userId }, 'user logged in');
```

## 📋 API Reference

### Interfaces (type-only)

- **`DBFactory`** — factory that produces `DBConnection` instances
- **`PaginationList`** — `{ count, hasMore, list, pages }`
- **`QuickSearchResult<T>`** — `{ list: T[], hasMore: boolean }`
- **`Field`** — `{ name, type: FieldType, length? }`
- **`BaseDAO<T, K>`** — `createNew`, `update`, `find` by key
- **`BaseCRUDDAO<T, K>`** — extends `BaseDAO` with `remove`

### Types (type-only)

- **`PostConstructionFun`** — `(obj: any) => void`, used by `find`/`listQuery`
- **`Logger`** — alias for `pino.Logger`
- **`BatchRecord<T>`** / **`BatchRecords<T>`** — batch processing record shapes

### Enums

- **`FieldType`** — `Text`, `Number`, `Date`
- **`Propagation`** — `REQUIRED`, `REQUIRES_NEW`, `NONE`

### Errors

- **`OptimisticLockException`** — extends `Error`; carries the conflicting `entity` on `.entity`

```typescript
import { OptimisticLockException } from '@ticatec/node-common-library';

try {
    await userDAO.updateUser(user);
} catch (err) {
    if (err instanceof OptimisticLockException) {
        console.warn('concurrent edit on', err.entity);
    }
}
```

## 🛠️ Build & publish

| Script | What it does |
| --- | --- |
| `npm run build` | Cleans `lib/`, compiles CommonJS to `lib/cjs/`, ESM to `lib/esm/`, copies the marker `package.json` files |
| `npm run typecheck` | `tsc --noEmit` against both `tsconfig.cjs.json` and `tsconfig.esm.json` |
| `npm run clean` | Removes `lib/` |
| `npm run publish-public` | `npm publish --access public` |

The dual build relies on the `exports` map in `package.json`: the `.` entry routes `import` to `lib/esm/index.js` and `require` to `lib/cjs/index.js`, with `lib/cjs/index.d.ts` providing types. A backwards-compatible `./lib/db/Field` subpath is also exposed for legacy consumers.

## 📝 Dependencies

- **uuid** — UUID v7 generation for `StringUtils.genID()` / `StringUtils.uuid()`
- **pino** — structured logger (peer dependency)
- **reflect-metadata** — required for the `@Transaction` decorator metadata

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Henry Feng** — [huili.f@gmail.com](mailto:huili.f@gmail.com)

## 🔗 Links

- [GitHub Repository](https://github.com/ticatec/node-common-library)
- [NPM Package](https://www.npmjs.com/package/@ticatec/node-common-library)
- [Issues](https://github.com/ticatec/node-common-library/issues)