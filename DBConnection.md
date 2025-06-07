
# DBConnection

`DBConnection` is an abstract TypeScript class that serves as the core component for database interactions in a database access framework. It defines a comprehensive set of methods for executing SQL queries, managing transactions, handling pagination, and processing SQL files. This class is designed to be extended by concrete implementations tailored to specific database drivers (e.g., PostgreSQL, MySQL).

## 📦 Features

- **Transaction Management**: Supports `beginTransaction()`, `commit()`, `rollback()`, and `close()` for reliable database operations.
- **SQL Execution**: Provides methods for executing SQL queries, including updates, inserts, deletes, and selects.
- **Paginated Queries**: Supports paginated queries via `CommonSearchCriteria` and returns results in a `PaginationList` format.
- **Quick Search**: Offers a simplified method for paginated queries with a default row limit.
- **SQL File Execution**: Processes and executes SQL files, handling comments and errors.
- **Data Transformation**: Converts query results to objects with camelCase field names and supports nested object structures.
- **Logging**: Integrates with `log4js` for debugging and error logging.

## 🛠 Class Overview

### Constructor
Initializes the `DBConnection` with a logger instance specific to the extending class.

```ts
protected constructor() {
    this.logger = log4js.getLogger(this.constructor.name);
}
```

### Key Methods

- **`beginTransaction(): Promise<void>`**: Starts a new transaction.
- **`commit(): Promise<void>`**: Commits the current transaction.
- **`rollback(): Promise<void>`**: Rolls back the current transaction.
- **`close(): Promise<void>`**: Closes the database connection.
- **`executeSQL(sql: string): Promise<any>`**: Executes a raw SQL statement.
- **`executeUpdate(sql: string, params: Array<any>): Promise<number>`**: Executes an update or delete query, returning the number of affected rows.
- **`insertRecord(sql: string, params: Array<any>, keyName: string): Promise<any>`**: Inserts a record and returns the generated key.
- **`updateRecord(sql: string, params: Array<any>): Promise<number>`**: Updates records matching the conditions.
- **`deleteRecord(sql: string, params: Array<any>): Promise<number>`**: Deletes records matching the conditions.
- **`executeCountSQL(sql: string, params: Array<any>, key: string = 'cc'): Promise<number>`**: Executes a count query and returns the number of matching records.
- **`quickSearch(sql: string, params: Array<any> = [], pageNo: number = 1, rowCount: number = 25): Promise<any>`**: Performs a quick paginated query, returning a `list` of records and a `hasMore` flag.
- **`listQuery(sql: string, params: Array<any> | null = null, postConstruction: PostConstructionFun | null = null): Promise<Array<any>>`**: Executes a select query and returns a list of results, optionally applying a post-construction function.
- **`find(sql: string, params: Array<any> | null = null, postConstruction: PostConstructionFun | null = null): Promise<any>`**: Retrieves a single record (first row) from a query.
- **`executeSQLFile(file: string): Promise<boolean>`**: Executes an SQL file, processing statements and handling errors.
- **`executePaginationSQL(criteria: CommonSearchCriteria): Promise<PaginationList>`**: Executes a paginated query using a `CommonSearchCriteria` instance.
- **`queryByCriteria(criteria: CommonSearchCriteria): Promise<Array<any>>`**: Executes a non-paginated query using a `CommonSearchCriteria` instance.
- **`toCamel(name: string)`**: Converts underscore-separated names to camelCase.
- **`resultToList(result): Array<any>`**: Converts query results to a list of objects with camelCase field names.
- **`getRowSetLimitClause(rowCount: number, offset: number): string`**: Generates a SQL `LIMIT` and `OFFSET` clause for pagination.

### Abstract Methods
Concrete implementations must provide the following methods:
- `fetchData(sql: string, params?: Array<any>): Promise<any>`: Executes a query and fetches raw data.
- `getFields(result): Array<Field>`: Retrieves the field metadata from query results.
- `getRowSet(result): Array<any>`: Extracts the row set from query results.
- `getAffectRows(result): number`: Returns the number of affected rows from a query result.
- `getFirstRow(result): any`: Extracts the first row from query results.

## 📋 Usage Example

Below is an example of a concrete `DBConnection` implementation for a PostgreSQL database, demonstrating transaction management, query execution, and pagination.

```ts
import { Pool, QueryResult } from 'pg';

class PostgresDBConnection extends DBConnection {
    private pool: Pool;
    
    constructor() {
        super();
        this.pool = new Pool({ /* PostgreSQL config */ });
    }
    
    async beginTransaction(): Promise<void> {
        const client = await this.pool.connect();
        await client.query('BEGIN');
    }
    
    async commit(): Promise<void> {
        const client = await this.pool.connect();
        await client.query('COMMIT');
    }
    
    async rollback(): Promise<void> {
        const client = await this.pool.connect();
        await client.query('ROLLBACK');
    }
    
    async close(): Promise<void> {
        await this.pool.end();
    }
    
    protected async executeSQL(sql: string): Promise<any> {
        const client = await this.pool.connect();
        try {
            return await client.query(sql);
        } finally {
            client.release();
        }
    }
    
    async executeUpdate(sql: string, params: Array<any>): Promise<number> {
        const result = await this.executeSQL(sql, params);
        return this.getAffectRows(result);
    }
    
    async insertRecord(sql: string, params: Array<any>): Promise<any> {
        const result = await this.executeSQL(`${sql}`, params);
        return result.rows[0];
    }
    
    async updateRecord(sql: string, params: Array<any>): Promise<number> {
        return this.executeUpdate(sql, params);
    }
    
    async deleteRecord(sql: string, params: Array<any>): Promise<number> {
        return this.executeUpdate(sql, params);
    }
    
    protected async fetchData(sql: string, params?: Array<any>): Promise<QueryResult> {
        const client = await this.pool.connect();
        try {
            return params ? await client.query(sql, params) : await client.query(sql);
        } finally {
            client.release();
        }
    }
    
    getFields(result: QueryResult): Array<Field> {
        return result.fields.map(field => ({
            name: field.name,
            type: this.mapPgTypeToFieldType(field.dataTypeID),
        }));
    }
    
    protected getRowSet(result: QueryResult): Array<any> {
        return result.rows;
    }
    
    protected getAffectRows(result: QueryResult): number {
        return result.rowCount;
    }
    
    protected getFirstRow(result: QueryResult): any {
        return result.rows[0] || null;
    }
    
    private mapPgTypeToFieldType(dataTypeID: number): FieldType {
    // Map PostgreSQL data types to FieldType (Text, Number, Date, etc.)
        return FieldType.Text; // Simplified for example
    }
}

// Example usage
async function example() {
const conn = new PostgresDBConnection();

// Transactional insert
await conn.beginTransaction();
try {
    const id = await conn.insertRecord(
        `INSERT INTO products (name, active) VALUES ($1, $2) returning id`,
        ['Laptop', 1],
        'id'
    );
    await conn.commit();
    console.log(`Inserted product with ID: ${id}`);
} catch (error) {
    await conn.rollback();
    console.error('Transaction failed:', error);
} finally {
    await conn.close();
}

// Paginated query
const criteria = new CommonSearchCriteria(1, 10);
criteria.sql = `SELECT * FROM products WHERE active = $1`;
criteria.params = [1];
const result = await conn.executePaginationSQL(criteria);
console.log(result.list); // Current page data
}
```

## ✅ Dependencies

- **`log4js`**: Used for logging database activities.
- **`fs`**: For reading SQL files in `executeSQLFile`.
- **`Field`**: Defines the structure of query result fields.
- **`PaginationList`**: Defines the structure for paginated query results.
- **`CommonSearchCriteria`**: Used for building dynamic queries.

## 🚀 Getting Started

1. **Implement `DBConnection`**:
   Extend `DBConnection` with a concrete implementation for your database driver (e.g., PostgreSQL, MySQL).

2. **Configure Logging**:
   Set up `log4js` to capture debug and error logs for SQL execution and connection activities.

3. **Integrate with `CommonSearchCriteria`**:
   Use `CommonSearchCriteria` for dynamic and paginated queries.

4. **Handle SQL Files**:
   Ensure SQL files are formatted correctly for `executeSQLFile` to avoid parsing issues.

5. **Manage Transactions**:
   Use `beginTransaction`, `commit`, `rollback`, and `close` for reliable database operations.

## 📝 Notes

- Implementations must provide concrete logic for all abstract methods (`fetchData`, `getFields`, `getRowSet`, `getAffectRows`, `getFirstRow`).
- The `quickSearch` method uses a default row limit of 25, adjustable via the `rowCount` parameter.
- SQL files processed by `executeSQLFile` should avoid complex statements (e.g., semicolons in string literals) to ensure correct parsing.
- The `toCamel` method assumes underscore-separated field names; adjust if your database uses a different convention.
- Logging is enabled by default; configure `log4js` to control log levels and output.

## 📎 Related Components

- **`CommonSearchCriteria`**: Enables dynamic query construction for paginated searches.
- **`PaginationList`**: Defines the structure for paginated query results.
- **`Field`**: Represents the metadata of query result fields.
