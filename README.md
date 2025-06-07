# Database Access Framework

This project provides a robust and flexible framework for database access, offering abstractions for database connection management, SQL execution, transaction handling, pagination, and dynamic query building. It is designed to create a consistent data access layer across various database drivers (e.g., PostgreSQL, MySQL).

## 📦 Project Structure

```bash
.
├── CommonDAO.ts            # Abstract DAO class with common database operations
├── BaseDAO.ts              # Interface for basic CRU operations
├── BaseCRUDDAO.ts          # Extended interface for CRUD with delete functionality
├── CommonService.ts        # Abstract service layer for transaction management
├── BatchRecord.ts          # Interface for batch record processing
├── DBConnection.ts         # Abstract database connection class
├── BeanFactory.ts          # Singleton factory for managing DAO/Service instances
└── ...
```

## ✨ Key Features

- **Multi-database support**: Easily adaptable to different database types via `DBConnection` implementations.
- **Transaction management**: Supports `beginTransaction()`, `commit()`, and `rollback()` for reliable operations.
- **Paginated queries**: Built-in support for pagination with `PaginationList`.
- **Dynamic query building**: Flexible query construction with `CommonSearchCriteria`.
- **SQL file execution**: Execute SQL scripts with comment handling and error logging.
- **Field transformation**: Automatic underscore-to-camelCase conversion and nested object support.
- **Dependency injection**: Bean factory for managing singleton/prototype instances.

## 🛠 Core Components

### 1. `CommonDAO`
Abstract base class for Data Access Objects (DAOs), providing utility methods for common database operations.

- **Key Methods**:
    - `genID()`: Generates a 32-bit UUID.
    - `executeCountSQL()`: Executes a count query and returns the result.
    - `searchByCriteria()`: Performs paginated queries using `SearchCriteria`.
    - `quickSearch()`: Executes a quick paginated query with a default row limit.
    - `convertBooleanFields()`: Converts string/boolean fields (e.g., 'T'/'F' to `true`/`false`).


```ts
class MyDAO extends CommonDAO {
  async findByCode(conn: DBConnection, code: string): Promise<any> {
    return await conn.find(conn, [code]);
  }
}
```


### 2. `CommonService`
Abstract service layer class for managing database connections and transactions.

- **Key Methods**:
    - `executeInTx()`: Runs a function within a transaction, handling commit/rollback.
    - `executeNonTx()`: Runs a function without a transaction.
    - `getDAOInstance()`: Retrieves DAO instances via the `BeanFactory`.

```typescript
class MyService extends CommonService {
  async createItem(data: any): Promise<number> {
    return this.executeInTx(async (conn: DBConnection) => {
      const dao = this.getDAOInstance('MyDAO');
      return await dao.createNew(conn, data);
    });
  }
}
```

### 3. `BaseDAO` and `BaseCRUDDAO`
Interfaces defining standard CRUD operations (`createNew`, `update`, `find`) and extended delete functionality (`remove`).

### 4. `BatchRecord`
Interface for batch processing, allowing records to be processed with error tracking.

```typescript
const batchRecords: BatchRecords<MyData> = [
  { recNo: 1, data: { id: "1", name: "Item1" }, error: null },
  { recNo: 2, data: { id: "2", name: "Item2" }, error: null }
];
```

### 5. `DBConnection`
Abstract class defining core database operations, including transaction control, SQL execution, and query handling.

- **Key Methods**:
    - `executeSQL()`, `executeUpdate()`, `insertRecord()`, `updateRecord()`, `deleteRecord()`: SQL execution methods.
    - `executePaginationSQL()`: Executes paginated queries with `CommonSearchCriteria`.
    - `executeSQLFile()`: Processes and executes SQL files, removing comments and handling errors.
    - `resultToList()`: Converts query results to a list of objects with camelCase field names.

[more details](./src/db/README.md)

### 6. `BeanFactory`
Singleton factory for managing DAO and Service instances with support for `Singleton` and `Prototype` scopes.

```ts
beanFactory.register('MyDAO', MyDAO, Scope.Singleton);
const dao = beanFactory.getInstance('MyDAO');
```

## 📋 Usage Example

### Paginated Query with DAO and Service

```ts
class MySearchCriteria extends CommonSearchCriteria {
  constructor(code: string, page: number, rows: number) {
    super(page, rows);
    this.sql = `SELECT * FROM my_table WHERE code = ?`;
    this.params = [code];
    this.orderBy = 'ORDER BY created_at DESC';
  }
}

class MyDAO extends CommonDAO {
  async findItems(conn: DBConnection, code: string): Promise<PaginationList> {
    const criteria = new MySearchCriteria(code, 1, 10);
    return await MySearchCriteria.paginationQuery(conn);
  }
}

class MyService extends CommonService {
  async getItems(code: string): Promise<PaginationList> {
    return this.executeNonTx(async (conn: DBConnection) => {
      const dao = this.getDAOInstance('MyDAO');
      return await dao.findItems(conn, code);
    });
  }
}

const service = new MyService();
const result = await service.getItems("A001");
console.log(result.list); // Current page data
```

## ✅ Features Summary

- **Database Agnostic**: Supports multiple database types through `DBConnection` implementations.
- **Transaction Support**: Ensures reliable operations with transaction management.
- **Flexible Queries**: Dynamic query building with pagination and condition support.
- **SQL File Execution**: Batch execution of SQL scripts with error handling.
- **Data Transformation**: Automatic field name conversion and nested object support.
- **Dependency Management**: Bean factory for managing DAO/Service instances.

## 📎 Dependencies

- `log4js`: For logging.
- `fs`: For reading SQL files.
- Other dependencies as required by specific database drivers.

## 🚀 Getting Started

1. **Implement `DBConnection`** for your database driver (e.g., PostgreSQL, MySQL).
2. **Extend `CommonDAO`** to create DAOs for specific entities.
3. **Extend `CommonService`** to manage transactions and DAO access.
4. **Register DAOs/Services** with `BeanFactory` for dependency injection.
5. **Use `SearchCriteria`** for dynamic query building and pagination.

## 📝 Notes

- Ensure proper configuration of `log4js` for logging.
- SQL files should be formatted correctly to avoid parsing issues during `executeSQLFile`.
- Extend `CommonSearchCriteria` for custom query logic tailored to your application.

## License

MIT License

## Contact

huili.f@gmail.com

https://github.com/ticatec/pg-common-library
