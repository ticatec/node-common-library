# DAO 层开发指南

[English](DAO_GUIDE.md) | 中文文档

本文档详细说明如何使用 `@ticatec/node-common-library` 创建和管理数据访问对象（DAO）。

## 📚 目录

1. [DAO 基础概念](#dao-基础概念)
2. [创建你的第一个 DAO](#创建你的第一个-dao)
3. [CRUD 操作与 getDBConnection](#crud-操作与-getdbconnection)
4. [动态条件与分页查询](#动态条件与分页查询)
5. [最佳实践](#最佳实践)

---

## DAO 基础概念

DAO（Data Access Object）负责封装所有数据库基础 SQL 操作，保持无状态。所有 DAO 类继承 `CommonDAO`：

```typescript
import { CommonDAO, DBConnection } from '@ticatec/node-common-library';

export class UserDAO extends CommonDAO {
  async findById(conn: DBConnection, id: string): Promise<User | null> {
    return await conn.find('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

### 自动推断事务连接 (`getDBConnection`)

在与声明式事务 `@Transaction` 一起使用时，无需在方法形参中传递 `conn`，在 `CommonDAO` 方法内部直接调用 `await this.getDBConnection()` 即可获取当前事务绑定的连接：

```typescript
export class UserDAO extends CommonDAO {
  async findById(id: string): Promise<User | null> {
    const conn = await this.getDBConnection();
    return await conn.find('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

---

## 动态条件与分页查询

搭配 `CommonSearchCriteria` 类可以自动生成带防注入参数绑定、动态 WHERE 条件以及分页结果处理：

```typescript
import { CommonSearchCriteria, CommonDAO } from '@ticatec/node-common-library';

export class UserSearchCriteria extends CommonSearchCriteria {
  protected buildDynamicQuery(conn: DBConnection, sql: string, params: any[]): void {
    // 动态条件构建逻辑
  }
}
```
