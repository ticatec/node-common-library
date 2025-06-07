# DB Management Module

## [[中文文档]](./README_CN.md)

This module provides an abstract framework for database connection and access, supporting database connection management, SQL execution, transaction control, paginated queries, and dynamic query building, facilitating the creation of a consistent data access layer across various database drivers.

## 📦 Module Structure

```bash
.
├── DBFactory.ts             # Database connection factory interface
├── DBManager.ts             # Singleton global database manager
├── DBConnection.ts          # Abstract database connection class, defining SQL operation interfaces
├── CommonSearchCriteria.ts  # Abstract query condition builder class, supporting pagination and dynamic SQL construction
├── PaginationList.ts        # Paginated query result type definition
├── Field.ts                 # Query field definition (field name, type, length)
└── ...
```

---

## ✨ Core Class Overview

### 1. `DBFactory`

```ts
export default interface DBFactory {
  createDBConnection(): Promise<DBConnection>;
}
```

Database connection factory interface for creating database connections. Implement this interface to support different database types (e.g., PostgreSQL, MySQL).

---

### 2. `DBManager`

Singleton database connection manager class. Responsible for managing `DBFactory` and providing the `connect()` method to obtain `DBConnection` instances.

#### Usage:

```ts
import DBManager from './DBManager';
import MyDBFactory from './MyDBFactory'; // Implements DBFactory interface

// Initialize
const manager = DBManager.init(new MyDBFactory());

// Get connection
const conn = await DBManager.getInstance().connect();
```

---

### 3. `DBConnection`

Abstract database connection class, defining the following core functionalities:

* Transaction control: `beginTransaction()`, `commit()`, `rollback()`
* Execute SQL: `executeUpdate()`, `insertRecord()`, `updateRecord()`, `deleteRecord()`
* Query data: `find()`, `listQuery()`, `executeCountSQL()`, `executePaginationSQL()`
* SQL file execution: `executeSQLFile(file: string)`
* Data transformation support: row-to-object conversion, underscore-to-camelCase field names, nested object construction, etc.

This class must be extended, implementing abstract methods like `fetchData`, `executeSQL`, `getFields`, `getRowSet`, `getAffectRows`, and `getFirstRow`.

---

### 4. `CommonSearchCriteria`

Database query builder for constructing paginated or conditional queries. Provides rich query construction methods, such as:

* `buildRangeCriteria()`: Builds range queries (from/to)
* `buildStarCriteria()`: Supports wildcard `*` queries (automatically converted to SQL `%`)
* `buildCriteria()`: Constructs equality queries
* `paginationQuery()`: Paginated query, returns `PaginationList`
* `query()`: Non-paginated query, returns all matching results

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

Paginated query result structure:

```ts
export default interface PaginationList {
  count: number;         // Total record count
  hasMore: boolean;      // Whether there is a next page
  list: Array<any>;      // Current page data
  pages: number;         // Total number of pages
}
```

---

### 6. `Field` and `FieldType`

Defines the structure of fields returned by queries:

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

## 🛠 Custom Extensions

You can implement your own database factory and connection classes, for example:

```ts
class MyDBConnection extends DBConnection {
  async executeSQL(sql: string): Promise<any> {
    // Connect to database and execute
  }

  protected async fetchData(sql: string, params?: Array<any>): Promise<any> {
    // Fetch data and return results
  }

  // Implement other abstract methods...
}
```

---

## 📋 Example: Paginated Query

```ts
const conn = await DBManager.getInstance().connect();
const criteria = new MySearchCriteria("A001", 1, 10);
const pageResult = await criteria.paginationQuery(conn);

console.log(pageResult.list); // Current page data
```

---

## ✅ Feature Overview

* Supports multiple database adapters
* Transaction support
* Paginated queries and condition construction
* Batch execution of SQL files
* Automatic camelCase naming for query fields
* Support for nested result structures

---

## 📎 Dependencies

* `log4js`: Logging
* `fs`: For loading SQL files