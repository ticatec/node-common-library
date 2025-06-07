# DB Management Module

本模块提供一个数据库连接与访问的抽象框架，支持数据库连接管理、SQL执行、事务控制、分页查询、动态查询构建等功能，便于在多种数据库驱动上构建一致的数据访问层。

## 📦 模块结构

```bash
.
├── DBFactory.ts             # 数据库连接工厂接口
├── DBManager.ts             # 全局数据库管理器单例
├── DBConnection.ts          # 抽象数据库连接类，定义SQL操作接口
├── CommonSearchCriteria.ts  # 抽象查询条件构建类，支持分页和动态SQL构建
├── PaginationList.ts        # 分页查询结果类型定义
├── Field.ts                 # 查询字段定义（字段名、类型、长度）
└── ...
```

---

## ✨ 核心类说明

### 1. `DBFactory`

```ts
export default interface DBFactory {
  createDBConnection(): Promise<DBConnection>;
}
```

数据库连接工厂接口，用于创建数据库连接。可实现此接口以适配不同数据库类型（如 PostgreSQL, MySQL 等）。

---

### 2. `DBManager`

数据库连接管理器的单例类。负责统一管理 `DBFactory` 和提供 `connect()` 方法获取 `DBConnection` 实例。

#### 使用方式：

```ts
import DBManager from './DBManager';
import MyDBFactory from './MyDBFactory'; // 实现 DBFactory 接口

// 初始化
const manager = DBManager.init(new MyDBFactory());

// 获取连接
const conn = await DBManager.getInstance().connect();
```

---

### 3. `DBConnection`

抽象数据库连接类，定义了如下核心功能：

* 事务控制：`beginTransaction()`, `commit()`, `rollback()`
* 执行 SQL：`executeUpdate()`, `insertRecord()`, `updateRecord()`, `deleteRecord()`
* 查询数据：`find()`, `listQuery()`, `executeCountSQL()`, `executePaginationSQL()`
* SQL 文件执行：`executeSQLFile(file: string)`
* 数据转换支持：行转对象、下划线转驼峰字段名、嵌套对象构建等

需继承该类并实现 `fetchData`, `executeSQL`, `getFields`, `getRowSet`, `getAffectRows`, `getFirstRow` 等抽象方法。

---

### 4. `CommonSearchCriteria`

数据库查询构建器，适用于构建分页或条件查询。提供丰富的查询构造方法，如：

* `buildRangeCriteria()`：构建 from/to 范围查询
* `buildStarCriteria()`：支持通配符 `*` 查询（自动转为 SQL 的 `%`）
* `buildCriteria()`：等值查询构造
* `paginationQuery()`：分页查询，返回 `PaginationList`
* `query()`：非分页查询，返回全部符合条件的结果

```ts
class MySearchCriteria extends CommonSearchCriteria {
  constructor(code?: string, page?: number, rows?: number) {
    super(page, rows);
    this.sql = `SELECT * FROM my_table WHERE 1=1`;
    let idx = 1;
    idx = this.buildCriteria(code, 'code', idx);
    this.orderBy = 'ORDER BY created_at DESC';
  }
}
```

---

### 5. `PaginationList`

分页查询返回结构体：

```ts
export default interface PaginationList {
  count: number;         // 总记录数
  hasMore: boolean;      // 是否还有下一页
  list: Array<any>;      // 当前页数据
  pages: number;         // 总页数
}
```

---

### 6. `Field` 与 `FieldType`

定义查询返回的字段结构：

```ts
export default interface Field {
  name: string;
  type: FieldType;
  length?: number;
}

export enum FieldType {
  Text = 'Text',
  Number = 'Number',
  Date = 'Date'
}
```

---

## 🛠 自定义扩展

你可以实现自己的数据库工厂与连接类，例如：

```ts
class MyDBConnection extends DBConnection {
  async executeSQL(sql: string): Promise<any> {
    // 连接数据库并执行
  }

  protected async fetchData(sql: string, params?: Array<any>): Promise<any> {
    // 查询数据并返回结果
  }

  // 其余抽象方法实现...
}
```

---

## 📋 示例：分页查询

```ts
const conn = await DBManager.getInstance().connect();
const criteria = new MySearchCriteria("A001", 1, 10);
const pageResult = await criteria.paginationQuery(conn);

console.log(pageResult.list); // 当前页数据
```

---

## ✅ 特性回顾

* 支持多数据库适配
* 支持事务
* 支持分页查询、条件拼接
* 支持 SQL 文件批量执行
* 查询字段自动驼峰命名转换
* 查询结果支持嵌套结构

---

## 📎 依赖项

* `log4js`: 日志记录
* `fs`: 用于加载 SQL 文件

