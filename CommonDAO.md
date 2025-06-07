
# CommonDAO, BaseDAO, and BaseCRUDDAO

This document describes the `CommonDAO` abstract class, along with the `BaseDAO` and `BaseCRUDDAO` interfaces, which form the foundation for Data Access Objects (DAOs) in a TypeScript-based database access framework. These components provide utility methods and interfaces for common database operations, such as CRUD (Create, Read, Update, Delete) operations, UUID generation, count queries, boolean conversions, and paginated searches. They are designed to be extended or implemented by concrete DAO classes to interact with specific database entities.

## 📦 Features

- **CRUD Operations**: Defined by `BaseDAO` and `BaseCRUDDAO` for creating, reading, updating, and deleting entities.
- **UUID Generation**: Generates 32-bit UUIDs for unique identifiers (`CommonDAO`).
- **Count Queries**: Executes SQL count queries to retrieve the number of matching records (`CommonDAO`).
- **Boolean Handling**: Converts boolean values to integers or strings and transforms string/integer fields to booleans (`CommonDAO`).
- **Paginated Queries**: Supports paginated queries using `SearchCriteria` and returns results in a `PaginationList` format (`CommonDAO`).
- **Quick Search**: Provides a simplified method for paginated queries with a default row limit (`CommonDAO`).
- **Logging**: Integrates with `log4js` for debugging and logging DAO activities (`CommonDAO`).

## 🛠 Component Overview


### 1. `CommonDAO`
An abstract class providing utility methods for common database operations, designed to be extended by concrete DAO implementations that may implement `BaseDAO` or `BaseCRUDDAO`.

- **Constructor**: Initializes the logger for the extending class.
  ```ts
  protected constructor() {
      this.logger = log4js.getLogger(this.constructor.name);
      this.logger.debug(`创建DAO实例:${this.constructor.name}`);
  }
  ```

- **Key Methods**:
    - `genID(): string`: Generates a 32-bit UUID using `StringUtils.genID()`.
    - `getCount(data: any, key: string = 'cc'): number`: Extracts the count value from query results, defaulting to the `cc` key.
    - `executeCountSQL(conn: DBConnection, sql: string, params: Array<any>, key: string = 'cc'): Promise<number>`: Executes a count SQL query and returns the number of matching records.
    - `getBooleanValue(value: boolean): number`: Converts a boolean to an integer (`true` → `1`, `false` → `0`).
    - `getBoolean(value: boolean): string`: Converts a boolean to a string (`true` → `'T'`, `false` → `'F'`).
    - `convertBooleanFields(data: any, fields: Array<string>): void`: Converts specified fields from `'T'`/`'F'` or `1`/`0` to boolean values.
    - `searchByCriteria(conn: DBConnection, criteria: SearchCriteria, page: string, rowCount: string): Promise<PaginationList>`: Performs a paginated query using a `SearchCriteria` instance.
    - `quickSearch(conn: DBConnection, sql: string, params: Array<any> = [], rowCount: number = 25): Promise<any>`: Executes a quick paginated query, returning a result object with a `list` of records and a `hasMore` flag.

### 2. `BaseDAO`
An interface defining the basic CRUD operations for a specific entity type `T` with a primary key type `K`.

```ts
export default interface BaseDAO<T, K> {
  /**
   * Creates a new entity
   * @param conn Database connection
   * @param item Entity to create
   */
  createNew(conn: DBConnection, item: T): Promise<number>;

  /**
   * Updates an existing entity
   * @param conn Database connection
   * @param item Entity to update
   */
  update(conn: DBConnection, item: T): Promise<number>;

  /**
   * Finds an entity by its primary key
   * @param conn Database connection
   * @param key Primary key
   */
  find(conn: DBConnection, key: K): Promise<T>;
}
```

### 3. `BaseCRUDDAO`
An interface extending `BaseDAO` to include delete functionality for a specific entity type `T` with a primary key type `K`.

```ts
export default interface BaseCRUDDAO<T, K> extends BaseDAO<T, K> {
  /**
   * Deletes an entity
   * @param conn Database connection
   * @param item Entity to delete
   */
  remove(conn: DBConnection, item: T): Promise<number>;
}
```
## 📋 Usage Example

Below is an example of a concrete DAO implementing `BaseCRUDDAO` and extending `CommonDAO` to manage a `Product` entity.
```ts
interface Product {
  id: string;
  name: string;
  active: boolean;
}

class ProductDAO extends CommonDAO implements BaseCRUDDAO<Product, string> {
    async createNew(conn: DBConnection, item: Product): Promise<number> {
        const sql = `INSERT INTO products (id, name, active) VALUES (?, ?, ?)`;
        const params = [this.genID(), item.name, this.getBooleanValue(item.active)];
        return await conn.executeUpdate(sql, params);
    }

    async update(conn: DBConnection, item: Product): Promise<number> {
        const sql = `UPDATE products SET name = ?, active = ? WHERE id = ?`;
        const params = [item.name, this.getBooleanValue(item.active), item.id];
        return await conn.updateRecord(sql, params);
    }
    
    async find(conn: DBConnection, key: string): Promise<Product> {
        const sql = `SELECT id, name, active FROM products WHERE id = ?`;
        const result = await conn.find(sql, [key]);
        if (result) {
            this.convertBooleanFields(result, ['active']);
        }
        return result;
    }
    
    async remove(conn: DBConnection, item: Product): Promise<number> {
      const sql = `DELETE FROM products WHERE id = ?`;
      return await conn.deleteRecord(sql, [item.id]);
    }
    
    async findByName(conn: DBConnection, name: string): Promise<PaginationList> {
      const criteria = new MySearchCriteria(name, 1, 10);
      return await this.searchByCriteria(conn, criteria).paginationQuery();
    }
    
    async quickFindProducts(conn: DBConnection, name: string): Promise<any> {
      const sql = `SELECT id, name, active FROM products WHERE name LIKE ?`;
      const result = await this.quickSearch(conn, sql, [`%${name}%`], 25);
      result.list.forEach(item => this.convertBooleanFields(item, ['active']));
      return result;
    }
}

// Example usage
async function example() {
const conn = await DBManager.getInstance().connect();
const dao = new ProductDAO();

// Create a new product
const newProduct = { id: "", name: "Laptop", active: true };
await dao.createNew(conn, newProduct);

// Find a product by ID
const product = await dao.find(conn, "some-uuid");
console.log(product); // { id: "some-uuid", name: "Laptop", active: true }

// Paginated search by name
const paginatedResult = await dao.findByName(conn, "Laptop");
console.log(paginatedResult.list); // Current page data

// Quick search
const quickResult = await dao.quickFindProducts(conn, "Laptop");
console.log(quickResult.list); // Up to 25 records
}
```

## ✅ Dependencies

- **`log4js`**: Used for logging DAO activities.
- **`StringUtils`**: Provides utility for generating UUIDs.
- **`DBConnection`**: Abstract database connection class for executing SQL queries.
- **`SearchCriteria`**: Used for building dynamic queries.
- **`PaginationList`**: Defines the structure for paginated query results.

## 🚀 Getting Started

1. **Implement `BaseDAO` or `BaseCRUDDAO`**:
   Create a concrete DAO by implementing the required CRUD methods for your entity.

2. **Extend `CommonDAO`**:
   Leverage `CommonDAO`'s utility methods for common operations like UUID generation, count queries, and pagination.

3. **Configure Logging**:
   Ensure `log4js` is properly configured to capture debug and error logs.

4. **Integrate with `SearchCriteria`**:
   Use or extend `SearchCriteria` to build dynamic queries for `searchByCriteria`.

5. **Use with `DBConnection`**:
   Obtain a `DBConnection` instance (e.g., via `DBManager`) to execute queries.

## 📝 Notes

- Ensure the `SearchCriteria` implementation matches your query requirements for `searchByCriteria`.
- The `quickSearch` method uses a default row limit of 25, which can be adjusted as needed.
- Boolean field conversions in `convertBooleanFields` assume `'T'`/`'F'` or `1`/`0` as input formats; adjust if other formats are used.
- Logging is enabled by default; configure `log4js` to control log levels and output.
- When implementing `BaseDAO` or `BaseCRUDDAO`, ensure all abstract methods are implemented to avoid runtime errors.

## 📎 Related Components

- **`DBConnection`**: Provides the database connection and SQL execution methods.
- **`SearchCriteria`**: Enables dynamic query construction for paginated searches.
- **`PaginationList`**: Defines the structure for paginated query results.
