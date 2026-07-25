# Service 层开发指南

[English](SERVICE_GUIDE.md) | 中文文档

本文档详细说明如何使用 `@ticatec/node-common-library` 创建和管理业务逻辑层（Service）以及持久化 Repository 层。

## 📚 4层架构规范 (Architecture)

在框架中，为了保证职责清晰与分层收敛，**Service 层不能直接调用 DAO**，必须通过 **Repository** 访问持久化数据：

```
┌─────────────────────────────────────────┐
│          Controller / Router            │  HTTP 请求处理
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Service Layer                │  业务逻辑 + 声明式事务 (@Transaction)
│  - 继承 CommonService                    │
│  - 调用 Repository (getRepositoryInstance)│
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Repository Layer              │  领域持久化与数据聚合
│  - 继承 CommonRepository                │
│  - 调用 DAO (getDAOInstance)             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             DAO Layer                   │  单表 CRUD & 原生 SQL 查询
│  - 继承 CommonDAO                        │
│  - 获取连接 (await getDBConnection())    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             Database                    │  数据存储
└─────────────────────────────────────────┘
```

---

## 1. 编写 Repository 层 (`CommonRepository`)

Repository 负责封装一个或多个 DAO 的底层数据操作：

```typescript
import { CommonRepository } from '@ticatec/node-common-library';
import type { UserDAO } from '../dao/UserDAO';
import type { ProfileDAO } from '../dao/ProfileDAO';

export interface User {
  id?: string;
  name: string;
  email: string;
  bio?: string;
}

export class UserRepository extends CommonRepository {
  private userDAO = this.getDAOInstance<UserDAO>('UserDAO');
  private profileDAO = this.getDAOInstance<ProfileDAO>('ProfileDAO');

  async findUserWithProfile(id: string): Promise<User | null> {
    const user = await this.userDAO.findById(id);
    if (!user) return null;
    const profile = await this.profileDAO.findByUserId(id);
    return { ...user, bio: profile?.bio };
  }

  async saveUser(user: User): Promise<string> {
    const userId = user.id || this.userDAO.genID();
    await this.userDAO.create({ ...user, id: userId });
    if (user.bio) {
      await this.profileDAO.saveProfile(userId, user.bio);
    }
    return userId;
  }
}
```

---

## 2. 编写 Service 层 (`CommonService`)

Service 继承 `CommonService`，只能调用 `getRepositoryInstance<T>(name)` 获取 Repository 代理，配合 `@Transaction` 管理声明式事务：

```typescript
import { CommonService, Transaction, Propagation, getLogger } from '@ticatec/node-common-library';
import type { UserRepository, User } from '../repository/UserRepository';

export class UserService extends CommonService {
  private readonly logger = getLogger('UserService');

  @Transaction(Propagation.REQUIRED)
  async registerUser(user: User): Promise<string> {
    const userRepo = this.getRepositoryInstance<UserRepository>('UserRepository');

    this.logger.info({ email: user.email }, 'Registering new user');

    const existing = await userRepo.findUserWithProfile(user.id || '');
    if (existing) {
      throw new Error('User already exists');
    }

    return await userRepo.saveUser(user);
  }

  @Transaction(Propagation.SUPPORTS)
  async getUser(id: string): Promise<User | null> {
    const userRepo = this.getRepositoryInstance<UserRepository>('UserRepository');
    return await userRepo.findUserWithProfile(id);
  }
}
```

---

## 🔑 核心规则总结

1. **Service 严禁直接调用 DAO**：Service 中使用 `this.getRepositoryInstance<T>(name)` 获取 Repository。
2. **Repository 调用 DAO**：Repository 继承 `CommonRepository`，使用 `this.getDAOInstance<T>(name)` 获取 DAO。
3. **DAO 执行 SQL**：DAO 继承 `CommonDAO`，使用 `await this.getDBConnection()` 自动获取事务上下文中的连接。
