# @ticatec/node-common-library

[English](README.md) | 中文文档

一个全面的 Node.js 数据库访问框架，为数据库连接管理、SQL执行、事务处理、分页查询和动态查询构建提供强大的抽象层。

[![Version](https://img.shields.io/npm/v/@ticatec/node-common-library)](https://www.npmjs.com/package/@ticatec/node-common-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 特性

- **多数据库支持**：通过 `DBConnection` 实现轻松适配不同数据库类型
- **事务管理**：支持 `beginTransaction()`、`commit()` 和 `rollback()` 确保操作可靠性
- **分页查询**：内置 `PaginationList` 分页支持
- **动态查询构建**：通过 `CommonSearchCriteria` 灵活构建查询条件
- **SQL文件执行**：执行SQL脚本，支持注释处理和错误日志
- **字段转换**：自动下划线转驼峰命名和嵌套对象支持
- **依赖注入**：Bean工厂管理单例/原型实例
- **乐观锁**：内置并发更新冲突处理支持

## 📦 安装

```bash
npm install @ticatec/node-common-library
```

## 🚀 快速开始

### 1. 基础设置

```typescript
import { DBManager, BeanFactory, CommonService, CommonDAO } from '@ticatec/node-common-library';
import { Scope } from '@ticatec/node-common-library';

// 使用你的数据库工厂初始化数据库管理器
const dbManager = DBManager.init(yourDBFactory);

// 注册 DAOs 和 Services
const beanFactory = BeanFactory.getInstance();
beanFactory.register('UserDAO', UserDAO, Scope.Singleton);
beanFactory.register('UserService', UserService, Scope.Singleton);
```

### 2. 创建 DAO

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

### 3. 创建 Service

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

### 4. 使用 SearchCriteria 进行分页搜索

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

// 使用示例
const criteria = new UserSearchCriteria({
    name: 'John*',  // 使用 LIKE 查询
    email: 'john@example.com',  // 精确匹配
    page: 1,
    rows: 20
});

const result = await criteria.paginationQuery(conn);
console.log(`总计: ${result.count}, 总页数: ${result.pages}`);
console.log('用户列表:', result.list);
```

## 🏗️ 核心组件

### CommonDAO
数据访问对象抽象基类，提供常见数据库操作的实用方法：

- `genID()`：生成32位UUID
- `executeCountSQL()`：执行计数查询
- `quickSearch()`：执行带默认行数限制的分页查询
- `convertBooleanFields()`：将T/F字符串转换为布尔值

### CommonService
服务层抽象类，用于管理数据库连接和事务：

- `executeInTx()`：在事务中运行函数，自动提交/回滚
- `executeNonTx()`：在非事务中运行函数
- `getDAOInstance()`：通过BeanFactory获取DAO实例

#### executeInTx() 方法详解

`executeInTx()` 方法用于在数据库事务中执行操作。它会自动处理事务的开始、提交和回滚，确保数据一致性。

**方法签名：**
```typescript
executeInTx(dbProcessor: (conn: DBConnection) => Promise<any>): Promise<any>
```

**使用场景：**
- 需要确保多个数据库操作原子性执行
- 涉及多个表的关联操作
- 需要在出错时自动回滚的复杂业务逻辑

**基本用法示例：**

```typescript
// 1. 用户注册 - 需要同时创建用户和初始化配置
async createUserWithProfile(userData: User, profileData: UserProfile): Promise<number> {
    return this.executeInTx(async (conn: DBConnection) => {
        const userDAO = this.getDAOInstance('UserDAO');
        const profileDAO = this.getDAOInstance('UserProfileDAO');
        
        // 创建用户
        const userId = await userDAO.createUser(conn, userData);
        
        // 创建用户配置，关联到新用户
        profileData.userId = userId;
        await profileDAO.createProfile(conn, profileData);
        
        return userId;
    });
}

// 2. 转账操作 - 需要同时更新两个账户余额
async transferMoney(fromAccountId: number, toAccountId: number, amount: number): Promise<void> {
    return this.executeInTx(async (conn: DBConnection) => {
        const accountDAO = this.getDAOInstance('AccountDAO');
        
        // 检查源账户余额
        const fromAccount = await accountDAO.findById(conn, fromAccountId);
        if (fromAccount.balance < amount) {
            throw new Error('余额不足');
        }
        
        // 扣除源账户余额
        await accountDAO.updateBalance(conn, fromAccountId, fromAccount.balance - amount);
        
        // 增加目标账户余额  
        const toAccount = await accountDAO.findById(conn, toAccountId);
        await accountDAO.updateBalance(conn, toAccountId, toAccount.balance + amount);
        
        // 记录转账日志
        const logDAO = this.getDAOInstance('TransferLogDAO');
        await logDAO.createLog(conn, {
            fromAccountId,
            toAccountId,
            amount,
            timestamp: new Date()
        });
    });
}

// 3. 批量操作 - 需要确保全部成功或全部失败
async batchUpdateUsers(users: User[]): Promise<number[]> {
    return this.executeInTx(async (conn: DBConnection) => {
        const userDAO = this.getDAOInstance('UserDAO');
        const results: number[] = [];
        
        for (const user of users) {
            const result = await userDAO.updateUser(conn, user);
            results.push(result);
            
            // 如果任何一个更新失败，整个事务会回滚
            if (result === 0) {
                throw new Error(`更新用户 ${user.id} 失败`);
            }
        }
        
        return results;
    });
}
```

#### executeNonTx() 方法详解

`executeNonTx()` 方法用于在非事务环境中执行数据库操作。适用于单一查询操作或不需要事务保证的场景。

**方法签名：**
```typescript
executeNonTx(dbProcessor: (conn: DBConnection) => Promise<any>): Promise<any>
```

**使用场景：**
- 单一的查询操作
- 不需要事务保证的独立操作
- 读取数据的场景
- 性能要求较高的简单操作

**基本用法示例：**

```typescript
// 1. 简单查询操作
async getUserById(id: number): Promise<User> {
    return this.executeNonTx(async (conn: DBConnection) => {
        const userDAO = this.getDAOInstance('UserDAO');
        return await userDAO.findById(conn, id);
    });
}

// 2. 分页查询
async getUserList(criteria: any): Promise<PaginationList<User>> {
    return this.executeNonTx(async (conn: DBConnection) => {
        const searchCriteria = new UserSearchCriteria(criteria);
        return await searchCriteria.paginationQuery(conn);
    });
}

// 3. 统计查询
async getUserCount(): Promise<number> {
    return this.executeNonTx(async (conn: DBConnection) => {
        const userDAO = this.getDAOInstance('UserDAO');
        return await userDAO.countAll(conn);
    });
}

// 4. 复杂查询（不涉及数据修改）
async getUserStatistics(startDate: Date, endDate: Date): Promise<any> {
    return this.executeNonTx(async (conn: DBConnection) => {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                AVG(age) as avg_age
            FROM users 
            WHERE created_at BETWEEN $1 AND $2
        `;
        return await conn.find(sql, [startDate, endDate]);
    });
}

// 5. 单独的更新操作（不需要与其他操作关联）
async updateUserLastLogin(userId: number): Promise<number> {
    return this.executeNonTx(async (conn: DBConnection) => {
        const userDAO = this.getDAOInstance('UserDAO');
        return await userDAO.updateLastLogin(conn, userId, new Date());
    });
}
```

**使用建议：**

1. **选择原则：**
   - 涉及多个相关操作时使用 `executeInTx()`
   - 单一独立操作时使用 `executeNonTx()`
   - 查询操作优先使用 `executeNonTx()`

2. **错误处理：**
   ```typescript
   try {
       const result = await this.executeInTx(async (conn) => {
           // 数据库操作
       });
   } catch (error) {
       this.logger.error('事务执行失败', error);
       throw error;
   }
   ```

3. **性能考虑：**
   - `executeNonTx()` 性能更好，适合高频查询
   - `executeInTx()` 有事务开销，仅在必要时使用

### DBConnection
定义核心数据库操作的抽象类：

- 事务控制：`beginTransaction()`、`commit()`、`rollback()`
- SQL执行：`executeUpdate()`、`insertRecord()`、`updateRecord()`、`deleteRecord()`
- 查询方法：`find()`、`listQuery()`、`executePaginationSQL()`
- SQL文件处理：`executeSQLFile()`
- 结果转换：`resultToList()` 带驼峰命名转换
- **布尔字段转换**：自动将数据库布尔值（1/0、T/F）转换为 JavaScript 布尔值

#### 布尔字段自动转换

许多数据库不支持原生布尔类型，框架提供自动转换功能：

```typescript
// 简单的布尔字段
const user = await conn.find(
    'SELECT * FROM users WHERE id = $1',
    [id],
    null,
    ['isActive', 'isVerified']  // 自动转换这些字段
);

// 嵌套的布尔字段
const userWithProfile = await conn.find(
    'SELECT u.*, p.is_active as "profile.isActive" FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1',
    [id],
    null,
    ['profile.isActive']  // 支持嵌套路径
);
```

### CommonSearchCriteria
构建动态搜索查询和分页的基类：

- `buildDynamicQuery()`：重写以定义自定义搜索逻辑
- `buildCriteria()`：构建相等条件
- `buildStarCriteria()`：构建带通配符支持的LIKE条件
- `buildRangeCriteria()`：构建范围条件（从/到）
- `paginationQuery()`：执行分页查询
- `query()`：执行非分页查询

### BeanFactory
管理DAO和Service实例的单例工厂：

```typescript
import { BeanFactory, Scope } from '@ticatec/node-common-library';

const factory = BeanFactory.getInstance();
factory.register('UserDAO', UserDAO, Scope.Singleton);
factory.register('TempDAO', TempDAO, Scope.Prototype);

const userDAO = factory.getInstance('UserDAO'); // 同一实例
const tempDAO = factory.createBean('TempDAO'); // 每次新实例
```

## 🔧 高级特性

### 批量处理
```typescript
import { BatchRecord, BatchRecords } from '@ticatec/node-common-library';

const batchRecords: BatchRecords<User> = [
    { recNo: 1, data: { name: 'User1', email: 'user1@test.com' }, error: null },
    { recNo: 2, data: { name: 'User2', email: 'user2@test.com' }, error: null }
];

// 处理批量记录
for (const record of batchRecords) {
    try {
        await userDAO.createUser(conn, record.data);
    } catch (error) {
        record.error = error;
    }
}
```

### 位操作
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

### 字符串工具
```typescript
import { StringUtils } from '@ticatec/node-common-library';

const id = StringUtils.genID(); // 32字符无短划线UUID
const uuid = StringUtils.uuid(); // 标准带短划线UUID
const isNum = StringUtils.isNumber('123'); // true
const parsed = StringUtils.parseNumber('abc', 0); // 0（默认值）
```

## 📋 API 参考

### QuickSearchResult 接口

类型安全的分页查询结果接口：

```typescript
import { QuickSearchResult } from '@ticatec/node-common-library';

interface User {
    id: string;
    name: string;
    email: string;
}

class UserDAO extends CommonDAO {
    async searchUsers(keyword: string): Promise<QuickSearchResult<User>> {
        const sql = `SELECT * FROM users WHERE name LIKE '%${keyword}%'`;
        return await this.quickSearch<User>(conn, sql, [], 1, 20);
    }
}

// 使用时完全类型安全
const result: QuickSearchResult<User> = await userDAO.searchUsers('John');
result.list.forEach(user => {
    console.log(user.name); // IDE 知道这是 User 对象
});
```

### 接口

- **BaseDAO<T, K>**：基础CRUD操作接口
- **BaseCRUDDAO<T, K>**：扩展的CRUD带删除功能
- **DBFactory**：数据库连接工厂接口
- **Field**：数据库字段元数据接口
- **PaginationList**：分页查询结果接口

### 类型

- **PostConstructionFun**：后处理函数类型
- **BeanLoader**：Bean加载函数类型
- **BatchRecord<T>**：批处理记录接口
- **BatchRecords<T>**：批处理记录数组

### 枚举

- **Scope**：Bean作用域枚举（Singleton、Prototype）
- **FieldType**：数据库字段类型枚举（Text、Number、Date）

## 🔒 错误处理

该库提供专门的异常：

```typescript
import { OptimisticLockException } from '@ticatec/node-common-library';

try {
    await userDAO.updateUser(conn, user);
} catch (error) {
    if (error instanceof OptimisticLockException) {
        console.log('并发更新冲突:', error.entity);
        // 处理乐观锁冲突
    }
}
```


## 📝 依赖

- **uuid**：用于UUID生成
- **log4js**：用于日志记录（对等依赖）


## 🤝 贡献

1. Fork 该仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

该项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

**Henry Feng** - [huili.f@gmail.com](mailto:huili.f@gmail.com)

## 🔗 链接

- [GitHub 仓库](https://github.com/ticatec/node-common-library)
- [NPM 包](https://www.npmjs.com/package/@ticatec/node-common-library)
- [问题跟踪](https://github.com/ticatec/node-common-library/issues)

---

**注意**：该库旨在为各种数据库驱动程序创建一致的数据访问层。确保为日志记录正确配置 `log4js`，并为您选择的数据库系统实现特定的 `DBConnection` 类。