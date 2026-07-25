# DAO Layer Development Guide

[中文文档](DAO_GUIDE_CN.md) | English

This guide provides detailed instructions on how to create and maintain Data Access Objects (DAOs) using `@ticatec/node-common-library`.

## 📚 Table of Contents

1. [DAO Core Concepts](#dao-core-concepts)
2. [Creating Your First DAO](#creating-your-first-dao)
3. [Context Connection Resolution (`getDBConnection`)](#context-connection-resolution-getdbconnection)
4. [Dynamic Queries & Pagination](#dynamic-queries--pagination)
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
  async findById(conn: DBConnection, id: string): Promise<User | null> {
    return await conn.find<User>('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

---

## Context Connection Resolution (`getDBConnection`)

When used within a `@Transaction` annotated service method, DAOs do not need to require an explicit `DBConnection` argument passed through every method. Call `await this.getDBConnection()` to retrieve the connection bound to the surrounding `AsyncLocalStorage` transaction context automatically:

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

## Best Practices

- Keep DAOs stateless so single instances can be shared safely.
- Avoid placing business logic inside DAOs — delegate validation and transaction coordination to the Service layer.
- Use `genID()` for generating UUID v7 identifiers.