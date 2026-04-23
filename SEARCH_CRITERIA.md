# Dynamic Conditional Pagination Query Framework

## Overview

This is a TypeScript-based dynamic conditional pagination query framework that provides flexible database querying and pagination functionality. By inheriting the abstract base class `SearchCriteria`, you can quickly build pagination query functionality with dynamic query conditions.

## Core Features

- **Dynamic Query Condition Building**: Supports multiple query types including exact matching, range queries, fuzzy matching, etc.
- **Pagination Query**: Built-in pagination logic with support for custom records per page
- **Wildcard Support**: Supports `*` wildcard conversion to SQL `%` wildcard
- **SQL Injection Protection**: Uses parameterized queries to prevent SQL injection
- **Flexible Extension**: Implement custom query logic by overriding methods

## Architecture Design

### Base Class: CommonSearchCriteria

Abstract base class that provides common query functionality and pagination logic. All search criteria classes should extend this class and implement the `buildDynamicQuery()` method.

#### Core Properties

```typescript
protected readonly logger: Logger;        // Logger instance
protected sql: string;                   // SQL query statement
protected orderBy: string;              // ORDER BY clause
protected params: Array<any>;           // SQL parameter array
private readonly page: number;          // Page number
private readonly rows: number;          // Records per page
protected criteria: any;                // Query criteria object
```

#### Key Constants

- `DEFAULT_ROWS_PAGE = 25`: Default records per page
- `FIRST_PAGE = 1`: First page number

### Core Methods

#### 1. Abstract Methods

```typescript
protected buildDynamicQuery(): void
```
**Purpose**: Build dynamic query conditions. Subclasses must implement this method to define specific query logic.

#### 2. Query Building Methods

##### buildCriteria(value, field)
```typescript
protected buildCriteria(value: any, field: string): number
```
- **Purpose**: Build exact match query conditions
- **Parameters**:
    - `value`: Query value
    - `field`: Database field name
- **Returns**: Next parameter index
- **Example**: `buildCriteria(this.criteria.status, 'p.status')`

##### buildStarCriteria(text, field)
```typescript
protected buildStarCriteria(text: string, field: string): number
```
- **Purpose**: Build query conditions with wildcard support
- **Logic**:
    - Contains `*` → Use `LIKE` query
    - Does not contain `*` → Use exact match query
- **Example**: `buildStarCriteria(this.criteria.name, 'p.name')`

##### buildRangeCriteria(fromValue, toValue, field)
```typescript
protected buildRangeCriteria(fromValue: any, toValue: any, field: string): number
```
- **Purpose**: Build range query conditions
- **Parameters**:
    - `fromValue`: Start value (inclusive)
    - `toValue`: End value (exclusive)
    - `field`: Database field name
- **Example**: `buildRangeCriteria(startDate, endDate, 'created_at')`

#### 3. Query Execution Methods

##### paginationQuery(conn)
```typescript
async paginationQuery(conn: DBConnection): Promise<PaginationList>
```
- **Purpose**: Execute pagination query
- **Returns**: Result object containing pagination information
- **Return Structure**:
```typescript
{
  count: number,    // Total record count
  hasMore: boolean, // Whether there is more data
  list: Array<any>, // Current page data
  pages: number     // Total pages
}
```

##### query(conn)
```typescript
async query(conn: DBConnection): Promise<Array<any>>
```
- **Purpose**: Execute non-paginated query, returns all records matching the criteria

#### 4. Utility Methods

##### isNotEmpty(s)
```typescript
protected isNotEmpty(s: any): boolean
```
Checks if a value is not empty (for strings checks if non-empty, for other types checks if not null)

##### Wildcard Handling Methods
```typescript
protected includeStar(s: string): boolean        // Check if contains *
protected toWildSQL(s: string): string           // Convert * to %
protected replaceWildStar(s: string): string     // Escape % and convert * to %
protected escapePercentage(s: string): string    // Escape % characters
protected wrapLikeMatch(s: string): string       // Add % to both ends of string
```

## Usage Examples

### 1. Creating a Query Class

```typescript
import CommonSearchCriteria from './CommonSearchCriteria';

const BASE_SQL = `
    SELECT p.code, p.name, p.status, pc.name as "category.name"
    FROM wms_products p
    JOIN wms_product_categories pc ON pc.code = p.category_code
    WHERE p.tenant_code = $1 AND p.deleted = false`;

export default class ProductSearchCriteria extends CommonSearchCriteria {
    constructor(tenantCode: string, criteria: any) {
        super(criteria);
        this.sql = BASE_SQL;
        this.params = [tenantCode];
        this.orderBy = `ORDER BY p.name`;
    }

    protected buildDynamicQuery() {
        // Product name: supports wildcard query
        this.buildStarCriteria(this.criteria.name, 'p.name');
        
        // Product status: exact match query
        this.buildCriteria(this.criteria.status, 'p.status');
        
        // Category path: custom LIKE query
        if (this.criteria.categoryPath) {
            this.params.push(`${this.criteria.categoryPath}%`);
            this.sql += ` AND pc.query_path LIKE $${this.params.length}`;
        }
        
        // Price range query example
        this.buildRangeCriteria(
            this.criteria.priceFrom, 
            this.criteria.priceTo, 
            'p.price'
        );
    }
}
```

### 2. Using the Query Class

```typescript
// Create search criteria
const searchCriteria = new ProductSearchCriteria('tenant001', {
    page: 1,
    rows: 20,
    name: 'iPhone*',        // Supports wildcards
    status: 'active',       // Exact match query
    categoryPath: '/electronics/phones',  // Path prefix matching
    priceFrom: 100,         // Price range
    priceTo: 1000
});

// Execute pagination query
const result = await searchCriteria.paginationQuery(dbConnection);
console.log(`Total records: ${result.count}`);
console.log(`Total pages: ${result.pages}`);
console.log(`Has more: ${result.hasMore}`);
console.log('Current page data:', result.list);

// Or execute non-paginated query
const allData = await searchCriteria.query(dbConnection);
```

## Query Types

### 1. Exact Match Query
```typescript
this.buildCriteria(value, 'field_name');
// Generates: AND field_name = $n
```

### 2. Wildcard Query
```typescript
this.buildStarCriteria('text*', 'field_name');
// Generates: AND field_name LIKE $n (parameter value: 'text%')

this.buildStarCriteria('exact', 'field_name');
// Generates: AND field_name = $n (parameter value: 'exact')
```

### 3. Range Query
```typescript
this.buildRangeCriteria(startValue, endValue, 'field_name');
// Generates: AND field_name >= $n AND field_name < $m
```

### 4. Custom Query
```typescript
if (this.criteria.customField) {
    this.params.push(this.criteria.customField);
    this.sql += ` AND custom_condition = $${this.params.length}`;
}
```

## Advanced Usage

### 1. Complex Query Conditions

```typescript
protected buildDynamicQuery() {
    // Multi-field OR query
    if (this.criteria.keyword) {
        this.params.push(`%${this.criteria.keyword}%`);
        const paramIndex = this.params.length;
        this.sql += ` AND (p.name LIKE $${paramIndex} OR p.description LIKE $${paramIndex})`;
    }
    
    // IN query
    if (this.criteria.statuses && this.criteria.statuses.length > 0) {
        const placeholders = this.criteria.statuses.map((_, index) => {
            this.params.push(this.criteria.statuses[index]);
            return `$${this.params.length}`;
        }).join(',');
        this.sql += ` AND p.status IN (${placeholders})`;
    }
}
```

### 2. Custom Post-processing

```typescript
protected getPostConstructor(): any {
    return (row: any) => {
        // Data transformation logic
        if (row.created_at) {
            row.created_at = new Date(row.created_at);
        }
        return row;
    };
}
```

### 3. Boolean Field Auto-Conversion

Many databases (such as older PostgreSQL versions) do not support native boolean types and instead use characters (T/F) or numbers (1/0) to store boolean values. The framework provides automatic conversion functionality.

#### Using setBooleanFields Method

```typescript
export default class ProductSearchCriteria extends CommonSearchCriteria {
    constructor(tenantCode: string, criteria: any) {
        super(criteria);
        this.sql = BASE_SQL;
        this.params = [tenantCode];
        this.orderBy = `ORDER BY p.name`;

        // Set fields that need automatic boolean conversion
        this.setBooleanFields('isActive', 'isDeleted', 'category.isActive');
    }

    protected buildDynamicQuery() {
        // ... query logic
    }
}
```

**Features**:
- Supports nested field paths, e.g., `'user.isActive'`
- Automatically recognizes and converts: `1/0`, `'1'/'0'`, `'T'/'F'`, `'t'/'f'`, `true/false`
- Converted fields become native JavaScript boolean values

**Database Return Value Example**:
```javascript
// Before conversion
{
    code: 'P001',
    name: 'iPhone',
    is_active: 'T',     // string
    is_deleted: 1,      // number
    category: {
        is_active: 'F'  // nested field
    }
}

// After conversion
{
    code: 'P001',
    name: 'iPhone',
    isActive: true,     // boolean
    isDeleted: true,    // boolean
    category: {
        isActive: false  // boolean
    }
}
```

## Best Practices

### 1. Query Performance Optimization
- Create indexes on fields used in WHERE conditions
- Avoid full table scans on large tables
- Set reasonable pagination sizes

### 2. Security Considerations
- Always use parameterized queries to prevent SQL injection
- Validate input parameter validity
- Perform permission checks on sensitive fields

### 3. Code Organization
- Encapsulate complex query logic into separate methods
- Use constants to define SQL templates
- Add appropriate comments and logging

### 4. Error Handling
```typescript
async paginationQuery(conn: DBConnection): Promise<PaginationList> {
    try {
        return await super.paginationQuery(conn);
    } catch (error) {
        this.logger.error('Query failed:', error);
        throw new Error('Data query exception');
    }
}
```

## Extension Example

### More Complex Query Class Implementation

```typescript
export default class AdvancedProductSearchCriteria extends CommonSearchCriteria {
    constructor(tenantCode: string, criteria: any) {
        super(criteria);
        this.initializeBaseQuery(tenantCode);
    }
    
    private initializeBaseQuery(tenantCode: string) {
        this.sql = `
            SELECT p.*, pc.name as category_name, 
                   COUNT(pi.id) as inventory_count
            FROM wms_products p
            LEFT JOIN wms_product_categories pc ON pc.code = p.category_code
            LEFT JOIN wms_product_inventory pi ON pi.product_code = p.code
            WHERE p.tenant_code = $1 AND p.deleted = false`;
        this.params = [tenantCode];
        this.orderBy = `GROUP BY p.id, pc.name ORDER BY p.created_at DESC`;
    }

    protected buildDynamicQuery() {
        // Basic field queries
        this.buildStarCriteria(this.criteria.name, 'p.name');
        this.buildCriteria(this.criteria.status, 'p.status');
        
        // Date range query
        this.buildRangeCriteria(
            this.criteria.createdFrom, 
            this.criteria.createdTo, 
            'p.created_at'
        );
        
        // Price range query
        this.buildRangeCriteria(
            this.criteria.priceMin, 
            this.criteria.priceMax, 
            'p.price'
        );
        
        // Inventory conditions
        if (this.criteria.hasInventory !== undefined) {
            if (this.criteria.hasInventory) {
                this.sql += ` AND EXISTS (SELECT 1 FROM wms_product_inventory pi2 WHERE pi2.product_code = p.code)`;
            } else {
                this.sql += ` AND NOT EXISTS (SELECT 1 FROM wms_product_inventory pi2 WHERE pi2.product_code = p.code)`;
            }
        }
    }
}
```