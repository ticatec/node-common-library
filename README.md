# @ticatec/node-common-library

[中文文档](README_CN.md) | English

A comprehensive Node.js database access framework providing robust abstractions for database connection management, SQL execution, transaction handling, pagination, and dynamic query building.

[![Version](https://img.shields.io/npm/v/@ticatec/node-common-library)](https://www.npmjs.com/package/@ticatec/node-common-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **Multi-database Support**: Easily adaptable to different database types via `DBConnection` implementations
- **Transaction Management**: Supports `beginTransaction()`, `commit()`, and `rollback()` for reliable operations
- **Paginated Queries**: Built-in support for pagination with `PaginationList`
- **Dynamic Query Building**: Flexible query construction with `CommonSearchCriteria`
- **SQL File Execution**: Execute SQL scripts with comment handling and error logging
- **Field Transformation**: Automatic underscore-to-camelCase conversion and nested object support
- **Dependency Injection**: Bean factory for managing singleton/prototype instances
- **Optimistic Locking**: Built-in support for concurrent update conflict handling

## 📦 Installation

```bash
npm install @ticatec/node-common-library
```

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { DBManager, BeanFactory, CommonService, CommonDAO } from '@ticatec/node-common-library';
import { Scope } from '@ticatec/node-common-library';

// Initialize database manager with your database factory
const dbManager = DBManager.init(yourDBFactory);

// Register DAOs and Services
const beanFactory = BeanFactory.getInstance();
beanFactory.register('UserDAO', UserDAO, Scope.Singleton);
beanFactory.register('UserService', UserService, Scope.Singleton);
```

### 2. Create a DAO

```typescript
import { CommonDAO } from '@ticatec/node-common-library';
import DBConnection from '@ticatec/node-common-library/lib/db/DBConnection';

class UserDAO extends CommonDAO {
    async createUser(conn: DBConnection, user: User): Promise<number> {
        const sql = 'INSERT INTO users (name, email) VALUES ($1, $2)';
        return await conn.insertRecord(sql, [user.name, user.email]);
    }

    async findUserById(conn: DBConnection, id: number): Promise<User> {
        const sql = 'SELECT * FROM users WHERE id = $1';
        return await conn.find(sql, [id]);
    }

    async updateUser(conn: DBConnection, user: User): Promise<number> {
        const sql = 'UPDATE users SET name = $1, email = $2 WHERE id = $3';
        return await conn.updateRecord(sql, [user.name, user.email, user.id]);
    }
}
```

### 3. Create a Service

```typescript
import { CommonService } from '@ticatec/node-common-library';
import DBConnection from '@ticatec/node-common-library/lib/db/DBConnection';

class UserService extends CommonService {
    async createUser(userData: User): Promise<number> {
        return this.executeInTx(async (conn: DBConnection) => {
            const userDAO = this.getDAOInstance('UserDAO');
            return await userDAO.createUser(conn, userData);
        });
    }

    async getUser(id: number): Promise<User> {
        return this.executeNonTx(async (conn: DBConnection) => {
            const userDAO = this.getDAOInstance('UserDAO');
            return await userDAO.findUserById(conn, id);
        });
    }
}
```

### 4. Paginated Search with SearchCriteria

```typescript
import { CommonSearchCriteria } from '@ticatec/node-common-library';
import DBConnection from '@ticatec/node-common-library/lib/db/DBConnection';

class UserSearchCriteria extends CommonSearchCriteria {
    constructor(criteria?: any) {
        super(criteria);
        this.sql = 'SELECT id, name, email, created_at FROM users WHERE 1=1';
        this.orderBy = 'ORDER BY created_at DESC';
    }

    protected buildDynamicQuery(): void {
        if (this.criteria?.name) {
            this.buildStarCriteria(this.criteria.name, 'name');
        }
        if (this.criteria?.email) {
            this.buildCriteria(this.criteria.email, 'email');
        }
        if (this.criteria?.dateFrom || this.criteria?.dateTo) {
            this.buildRangeCriteria(this.criteria.dateFrom, this.criteria.dateTo, 'created_at');
        }
    }
}

// Usage
const criteria = new UserSearchCriteria({
    name: 'John*',  // Will use LIKE query
    email: 'john@example.com',  // Will use exact match
    page: 1,
    rows: 20
});

const result = await criteria.paginationQuery(conn);
console.log(`Total: ${result.count}, Pages: ${result.pages}`);
console.log('Users:', result.list);
```

## 🏗️ Core Components

### CommonDAO
Abstract base class for Data Access Objects, providing utility methods for common database operations:

- `genID()`: Generates a 32-bit UUID
- `executeCountSQL()`: Executes count queries
- `quickSearch()`: Performs paginated queries with default row limits
- `convertBooleanFields()`: Converts T/F strings to boolean values

### CommonService
Abstract service layer class for managing database connections and transactions:

- `executeInTx()`: Runs functions within transactions with automatic commit/rollback
- `executeNonTx()`: Runs functions without transactions
- `getDAOInstance()`: Retrieves DAO instances via BeanFactory

### DBConnection
Abstract class defining core database operations:

- Transaction control: `beginTransaction()`, `commit()`, `rollback()`
- SQL execution: `executeUpdate()`, `insertRecord()`, `updateRecord()`, `deleteRecord()`
- Query methods: `find()`, `listQuery()`, `executePaginationSQL()`
- SQL file processing: `executeSQLFile()`
- Result transformation: `resultToList()` with camelCase conversion

### CommonSearchCriteria
Base class for building dynamic search queries with pagination:

- `buildDynamicQuery()`: Override to define custom search logic
- `buildCriteria()`: Builds equality conditions
- `buildStarCriteria()`: Builds LIKE conditions with wildcard support
- `buildRangeCriteria()`: Builds range conditions (from/to)
- `paginationQuery()`: Executes paginated queries
- `query()`: Executes non-paginated queries

### BeanFactory
Singleton factory for managing DAO and Service instances:

```typescript
import { BeanFactory, Scope } from '@ticatec/node-common-library';

const factory = BeanFactory.getInstance();
factory.register('UserDAO', UserDAO, Scope.Singleton);
factory.register('TempDAO', TempDAO, Scope.Prototype);

const userDAO = factory.getInstance('UserDAO'); // Same instance
const tempDAO = factory.createBean('TempDAO'); // New instance each time
```

## 🔧 Advanced Features

### Batch Processing
```typescript
import { BatchRecord, BatchRecords } from '@ticatec/node-common-library';

const batchRecords: BatchRecords<User> = [
    { recNo: 1, data: { name: 'User1', email: 'user1@test.com' }, error: null },
    { recNo: 2, data: { name: 'User2', email: 'user2@test.com' }, error: null }
];

// Process batch records
for (const record of batchRecords) {
    try {
        await userDAO.createUser(conn, record.data);
    } catch (error) {
        record.error = error;
    }
}
```

### Bit Operations
```typescript
import BitsBoolean from '@ticatec/node-common-library/lib/BitsBoolean';

class UserPermissions extends BitsBoolean {
    constructor(value: number = 0) {
        super(value);
    }

    setCanRead(value: boolean): void {
        this.setBitValue(0, value);
    }

    getCanRead(): boolean {
        return this.getBitValue(0);
    }

    setCanWrite(value: boolean): void {
        this.setBitValue(1, value);
    }

    getCanWrite(): boolean {
        return this.getBitValue(1);
    }
}
```

### String Utilities
```typescript
import { StringUtils } from '@ticatec/node-common-library';

const id = StringUtils.genID(); // 32-character UUID without dashes
const uuid = StringUtils.uuid(); // Standard UUID with dashes
const isNum = StringUtils.isNumber('123'); // true
const parsed = StringUtils.parseNumber('abc', 0); // 0 (default value)
```

## 📋 API Reference

### Interfaces

- **BaseDAO<T, K>**: Basic CRUD operations interface
- **BaseCRUDDAO<T, K>**: Extended CRUD with delete functionality
- **DBFactory**: Database connection factory interface
- **Field**: Database field metadata interface
- **PaginationList**: Paginated query result interface

### Types

- **PostConstructionFun**: Post-processing function type
- **BeanLoader**: Bean loading function type
- **BatchRecord<T>**: Batch processing record interface
- **BatchRecords<T>**: Array of batch processing records

### Enums

- **Scope**: Bean scope enumeration (Singleton, Prototype)
- **FieldType**: Database field type enumeration (Text, Number, Date)

## 🔒 Error Handling

The library provides specialized exceptions:

```typescript
import { OptimisticLockException } from '@ticatec/node-common-library';

try {
    await userDAO.updateUser(conn, user);
} catch (error) {
    if (error instanceof OptimisticLockException) {
        console.log('Concurrent update conflict:', error.entity);
        // Handle optimistic lock conflict
    }
}
```

## 📝 Dependencies

- **uuid**: For UUID generation
- **log4js**: For logging (peer dependency)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Henry Feng** - [huili.f@gmail.com](mailto:huili.f@gmail.com)

## 🔗 Links

- [GitHub Repository](https://github.com/ticatec/node-library)
- [NPM Package](https://www.npmjs.com/package/@ticatec/node-common-library)
- [Issues](https://github.com/ticatec/node-library/issues)

---

**Note**: This library is designed to create a consistent data access layer across various database drivers. Ensure proper configuration of `log4js` for logging and implement your specific `DBConnection` class for your chosen database system.