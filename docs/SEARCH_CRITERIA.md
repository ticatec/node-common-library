# Dynamic Conditional Pagination Query Framework

[中文文档](SEARCH_CRITERIA_CN.md) | English

## Overview

This is a TypeScript-based dynamic conditional pagination query framework that provides flexible database querying and pagination functionality. By inheriting the abstract base class `CommonSearchCriteria` (or its alias `SearchCriteria`), you can quickly build pagination query functionality with dynamic query conditions.

## Core Features

- **Dynamic Query Condition Building**: Supports multiple query types including exact matching, range queries, wildcard matching, etc.
- **Pagination Query**: Built-in pagination logic with support for custom records per page
- **Wildcard Support**: Supports `*` wildcard conversion to SQL `%` wildcard with automatic escaping
- **SQL Injection Protection**: Uses parameterized queries to prevent SQL injection
- **Flexible Extension**: Implement custom query logic by overriding methods and post-processors

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

##### addEqualsCriteria(value, field) / buildCriteria(value, field)
```typescript
protected addEqualsCriteria(value: any, field: string): number
```
- **Purpose**: Build exact equality match query conditions (`field = $N`)
- **Parameters**:
    - `value`: Query value
    - `field`: Database field name
- **Returns**: Next parameter index
- **Example**: `this.addEqualsCriteria(this.criteria.status, 'p.status')`
- **Legacy Alias**: `buildCriteria(value, field)`

##### addWildcardCriteria(text, field) / buildStarCriteria(text, field)
```typescript
protected addWildcardCriteria(text: string, field: string): number
```
- **Purpose**: Build query conditions with wildcard support
- **Logic**:
    - Contains `*` → Use `LIKE` query (`field LIKE $N`)
    - Does not contain `*` → Use exact match query (`field = $N`)
- **Example**: `this.addWildcardCriteria(this.criteria.name, 'p.name')`
- **Legacy Alias**: `buildStarCriteria(text, field)`

##### buildRangeCriteria(fromValue, toValue, field)
```typescript
protected buildRangeCriteria(fromValue: any, toValue: any, field: string): number
```
- **Purpose**: Build range query conditions (`field >= $N AND field < $M`)
- **Parameters**:
    - `fromValue`: Start value (inclusive >=)
    - `toValue`: End value (exclusive <). Automatically calls `getNextDayStart(toValue)` when `toValue` is a Date instance.
    - `field`: Database field name
- **Example**: `this.buildRangeCriteria(startDate, endDate, 'created_at')`

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

#### 4. Utility & Processor Methods

##### getPostProcessor() / getPostConstructor()
```typescript
protected getPostProcessor(): ((obj: any) => void) | null
```
- **Purpose**: Returns a callback for custom post-processing mapped object rows after raw query execution.
- **Legacy Alias**: `getPostConstructor()`

##### getNextDayStart(d) / getEndOfDay(d)
```typescript
protected getNextDayStart(d: any): Date | null
```
- **Purpose**: Calculates the start of the following day (00:00:00.000) for exclusive upper-bound range queries (`field < nextDayStart`).
- **Legacy Alias**: `getEndOfDay(d)`

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
import { CommonSearchCriteria } from '@ticatec/node-common-library';

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
        this.addWildcardCriteria(this.criteria.name, 'p.name');
        
        // Product status: exact match query
        this.addEqualsCriteria(this.criteria.status, 'p.status');
        
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
this.addEqualsCriteria(value, 'field_name');
// Generates: AND field_name = $n
```

### 2. Wildcard Query
```typescript
this.addWildcardCriteria('text*', 'field_name');
// Generates: AND field_name LIKE $n (parameter value: 'text%')

this.addWildcardCriteria('exact', 'field_name');
// Generates: AND field_name = $n (parameter value: 'exact')
```

### 3. Range Query
```typescript
this.buildRangeCriteria(startValue, endValue, 'field_name');
// Generates: AND field_name >= $n AND field_name < $m
```

## Advanced Usage

### 1. Custom Post-processing

```typescript
protected getPostProcessor(): ((row: any) => void) | null {
    return (row: any) => {
        // Data transformation logic
        if (row.created_at) {
            row.created_at = new Date(row.created_at);
        }
    };
}
```

### 2. Boolean Field Auto-Conversion

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
}
```