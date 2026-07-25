# Service & Repository Layer Development Guide

[中文文档](SERVICE_GUIDE_CN.md) | English

This guide provides detailed instructions on how to build and maintain Services and Repositories using `@ticatec/node-common-library`.

## 📚 4-Tier Architecture

To enforce clean separation of concerns, **Services are strictly prohibited from referencing DAOs directly**. Instead, Services must operate through the **Repository** layer:

```
┌─────────────────────────────────────────┐
│          Controller / Router            │  HTTP Request Handling
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Service Layer                │  Business Logic & Declarative Transactions (@Transaction)
│  - Extends CommonService                │
│  - Calls Repositories via               │
│    getRepositoryInstance<T>(name)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Repository Layer              │  Domain Persistence & DAO Aggregation
│  - Extends CommonRepository             │
│  - Calls DAOs via getDAOInstance<T>(name)│
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             DAO Layer                   │  Single-Table Data Access / SQL Execution
│  - Extends CommonDAO                    │
│  - Acquires conn =                      │
│    await getDBConnection()              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│             Database                    │  Data Storage
└─────────────────────────────────────────┘
```

---

## 1. Repository Layer (`CommonRepository`)

Repositories encapsulate persistence logic and aggregate DAO interactions:

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

## 2. Service Layer (`CommonService`) & `@Transaction`

Services extend `CommonService` and invoke `getRepositoryInstance<T>(name)` to access Repositories, using `@Transaction` for declarative transaction boundaries.

### Transaction Propagation Behaviors

- **`Propagation.REQUIRED`** (Default): Joins the active outer transaction if present; otherwise creates a new database connection and starts a new transaction.
- **`Propagation.REQUIRES_NEW`**: Always creates a new database connection, starts an independent transaction, and runs inside an isolated context (shadowing any outer transaction).
- **`Propagation.NONE`**: Executes database operations on a non-transactional connection.

```typescript
import { CommonService, Transaction, Propagation, getLogger } from '@ticatec/node-common-library';
import type { UserRepository, User } from '../repository/UserRepository';

export class UserService extends CommonService {
  private readonly logger = getLogger('UserService');

  @Transaction(Propagation.REQUIRED)
  async registerUser(user: User): Promise<string> {
    const userRepo = this.getRepositoryInstance<UserRepository>('UserRepository');

    this.logger.info({ email: user.email }, 'Registering user');

    const existing = await userRepo.findUserWithProfile(user.id || '');
    if (existing) {
      throw new Error('User already exists');
    }

    return await userRepo.saveUser(user);
  }

  @Transaction(Propagation.REQUIRES_NEW)
  async logAuditRecord(action: string, payload: any): Promise<void> {
    // Independent transaction: commits even if outer transaction rolls back
  }
}
```

---

## 🔑 Core Rules & Safeguards

1. **Registration Requirement**: `getRepositoryInstance<T>(name)` and `getDAOInstance<T>(name)` check if the requested Bean is registered in `beanFactory`. If unregistered, an explicit `Error` is thrown (`Repository/DAO "X" is not registered in BeanFactory...`).
2. **Service Layer**: Calls `this.getRepositoryInstance<T>(name)`. Direct DAO access is disabled.
3. **Repository Layer**: Extends `CommonRepository` and calls `this.getDAOInstance<T>(name)`.
4. **DAO Layer**: Extends `CommonDAO` and resolves `await this.getDBConnection()`.