# DAO 层开发指南

English | [中文文档](DAO_GUIDE_CN.md)

本指南详细说明了如何使用 `@ticatec/node-common-library` 创建与维护数据访问对象（DAO）。

## DAO 核心概念

DAO 封装单表或特定 SQL 数据库操作。所有 DAO 均应继承 `CommonDAO`：

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

## 上下文连接解析 (`getDBConnection`)

在带 `@Transaction` 装饰器的 Service 方法上下文中，DAO 无需通过参数逐层传递 `DBConnection`。直接调用 `await this.getDBConnection()` 即可自动获取当前线程上下文绑定的数据库连接：

```typescript
export class UserDAO extends CommonDAO {
  async findById(id: string): Promise<User | null> {
    const conn = await this.getDBConnection();
    return await conn.find<User>('SELECT * FROM users WHERE id = $1', [id]);
  }
}
```

## 泛型类型与自动转换

1. **泛型查询**：`conn.find<T>` 与 `conn.listQuery<T>` 支持泛型推导，分别返回 `Promise<T | null>` 与 `Promise<Array<T>>`。
2. **驱动无关的分页**：`quickSearch<T>` 自动使用驱动子类的 `getRowSetLimitClause`，实现跨数据库的快速分页。
