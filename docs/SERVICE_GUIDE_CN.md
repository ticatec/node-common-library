# Service 与 Repository 层开发指南

English | [中文文档](SERVICE_GUIDE_CN.md)

本指南详细说明了如何使用 `@ticatec/node-common-library` 构建和维护 Service 与 Repository 层。

## 📚 四层分名词架构

为了保证架构清晰与职责单一，**Service 层严禁直接引用 DAO**。Service 必须通过 **Repository** 层访问数据持久化：

```
┌─────────────────────────────────────────┐
│          Controller / Router            │  HTTP 请求处理
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Service Layer                │  业务逻辑与声明式事务 (@Transaction)
│  - 继承 CommonService                    │
│  - 通过 getRepositoryInstance<T>(name)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Repository Layer              │  领域持久化与 DAO 聚合
│  - 继承 CommonRepository                │
│  - 通过 getDAOInstance<T>(name) 访问 DAO │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             DAO Layer                   │  单表数据访问与 SQL 执行
│  - 继承 CommonDAO                       │
│  - 获取 conn = await getDBConnection()  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             Database                    │  数据库存储
└─────────────────────────────────────────┘
```

---

## 1. Repository 层 (`CommonRepository`)

Repository 封装持久化逻辑并聚合 DAO 操作：

```typescript
import { CommonRepository } from '@ticatec/node-common-library';
import type { UserDAO } from '../dao/UserDAO';

export class UserRepository extends CommonRepository {
  private userDAO = this.getDAOInstance<UserDAO>('UserDAO');

  async findUserById(id: string) {
    return await this.userDAO.findById(id);
  }
}
```

---

## 2. Service 层 (`CommonService`) 与 `@Transaction`

Service 继承 `CommonService` 并使用 `@Transaction` 装饰器定义声明式事务边界。

### 事务传播行为 (Propagation)

- **`Propagation.REQUIRED`**（默认）：如果存在外层事务则加入；否则开新连接并启动新事务。
- **`Propagation.REQUIRES_NEW`**：始终开启独立的新数据库连接和新事务，独立提交或回滚。
- **`Propagation.NONE`**：在非事务连接上执行数据库操作。

```typescript
import { CommonService, Transaction, Propagation } from '@ticatec/node-common-library';
import type { UserRepository } from '../repository/UserRepository';

export class UserService extends CommonService {
  @Transaction(Propagation.REQUIRED)
  async registerUser(user: any): Promise<string> {
    const userRepo = this.getRepositoryInstance<UserRepository>('UserRepository');
    return await userRepo.saveUser(user);
  }

  @Transaction(Propagation.REQUIRES_NEW)
  async logAudit(action: string): Promise<void> {
    // 独立事务：即使外层事务回滚，审计日志也能独立提交
  }
}
```

---

## 🔑 核心规则与保护机制

1. **Bean 注册检查**：`getRepositoryInstance` 与 `getDAOInstance` 会强校验 Bean 是否已在 `beanFactory` 中注册，未注册时会抛出明确异常。
2. **分层约束**：Service 层通过 `getRepositoryInstance` 获取 Repository，禁止直接调用 DAO。
