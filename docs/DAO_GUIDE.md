# DAO Layer Development Guide

[中文文档](DAO_GUIDE_CN.md) | English

This guide provides detailed instructions on how to create and maintain Data Access Objects (DAOs) using `@ticatec/node-common-library`.

## 📚 Table of Contents

1. [DAO Core Concepts](#dao-core-concepts)
2. [Creating Your First DAO](#creating-your-first-dao)
3. [Context Connection Resolution (`getDBConnection`)](#context-connection-resolution-getdbconnection)
4. [Type Safety & Automatic Coercion](#type-safety--automatic-coercion)
5. [Best Practices](#best-practices)

---

## DAO Core Concepts

DAO (Data Access Object) encapsulates single-table or specific SQL database operations. All DAOs should inherit from `CommonDAO`:

```typescript
import { CommonDAO, DBConnection } from '@ticatec/node-common-library';

export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserDAO extends CommonDAO {
  async findById(id: string): Promise<User | null> {
    const conn = await this.getDBConnection();
    return await conn.find<User>('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

---

## Context Connection Resolution (`getDBConnection`)

When used within a `@Transaction` annotated service method, DAOs do not need an explicit `DBConnection` argument passed through every method. Call `await this.getDBConnection()` to retrieve the connection bound to the surrounding `AsyncLocalStorage` transaction context automatically:

```typescript
export class UserDAO extends CommonDAO {
  async findById(id: string): Promise<User | null> {
    const conn = await this.getDBConnection();
    return await conn.find<User>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async createUser(user: User): Promise<number> {
    const conn = await this.getDBConnection();
    const sql = 'INSERT INTO users (id, name, email) VALUES ($1, $2, $3)';
    return await conn.insertRecord(sql, [user.id, user.name, user.email]);
  }
}
```

---

## Type Safety & Automatic Coercion

### 1. Generic Query Signatures
`conn.find<T>(sql, params)` and `conn.listQuery<T>(sql, params)` support generic types returning `Promise<T | null>` and `Promise<Array<T>>`.

### 2. Driver-Independent Pagination (`quickSearch`)
`quickSearch<T>(sql, params, pageNo, rowCount, booleanFields)` uses driver-independent limit/offset clauses and handles boolean coercion.

---

## Best Practices

- Keep DAOs stateless so single instances can be shared safely via `beanFactory`.
- Avoid placing business logic inside DAOs — delegate validation and transaction coordination to the Service layer.
- Use `genID()` for generating UUID identifiers.