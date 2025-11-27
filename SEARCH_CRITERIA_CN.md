# 动态条件分页查询框架

## 概述

这是一个基于 TypeScript 的动态条件分页查询框架，提供了灵活的数据库查询和分页功能。通过继承抽象基类 `SearchCriteria`，可以快速构建具有动态查询条件的分页查询功能。

## 核心特性

- **动态查询条件构建**：支持等值查询、范围查询、模糊匹配等多种查询类型
- **分页查询**：内置分页逻辑，支持自定义每页记录数
- **通配符支持**：支持 `*` 通配符转换为 SQL `%` 通配符
- **SQL 注入防护**：使用参数化查询防止 SQL 注入
- **灵活扩展**：通过重写方法实现自定义查询逻辑

## 架构设计

### 基础类：SearchCriteria

抽象基类，提供通用的查询功能和分页逻辑。

#### 核心属性

```typescript
protected readonly logger: Logger;        // 日志记录器
protected sql: string;                   // SQL 查询语句
protected orderBy: string;              // 排序子句
protected params: Array<any>;           // SQL 参数数组
private readonly page: number;          // 页码
private readonly rows: number;          // 每页记录数
protected criteria: any;                // 查询条件对象
```

#### 关键常量

- `DEFAULT_ROWS_PAGE = 25`：默认每页记录数
- `FIRST_PAGE = 1`：首页页码

### 核心方法

#### 1. 抽象方法

```typescript
protected buildDynamicQuery(): void
```
**作用**：构建动态查询条件，子类必须实现此方法来定义具体的查询逻辑。

#### 2. 查询构建方法

##### buildCriteria(value, field)
```typescript
protected buildCriteria(value: any, field: string): number
```
- **作用**：构建等值查询条件
- **参数**：
    - `value`: 查询值
    - `field`: 数据库字段名
- **返回**：下一个参数索引
- **示例**：`buildCriteria(this.criteria.status, 'p.status')`

##### buildStarCriteria(text, field)
```typescript
protected buildStarCriteria(text: string, field: string): number
```
- **作用**：构建支持通配符的查询条件
- **逻辑**：
    - 包含 `*` → 使用 `LIKE` 查询
    - 不包含 `*` → 使用等值查询
- **示例**：`buildStarCriteria(this.criteria.name, 'p.name')`

##### buildRangeCriteria(fromValue, toValue, field)
```typescript
protected buildRangeCriteria(fromValue: any, toValue: any, field: string): number
```
- **作用**：构建范围查询条件
- **参数**：
    - `fromValue`: 起始值（包含）
    - `toValue`: 结束值（不包含）
    - `field`: 数据库字段名
- **示例**：`buildRangeCriteria(startDate, endDate, 'created_at')`

#### 3. 查询执行方法

##### paginationQuery(conn)
```typescript
async paginationQuery(conn: DBConnection): Promise<PaginationList>
```
- **作用**：执行分页查询
- **返回**：包含分页信息的结果对象
- **返回结构**：
```typescript
{
  count: number,    // 总记录数
  hasMore: boolean, // 是否有更多数据
  list: Array<any>, // 当前页数据
  pages: number     // 总页数
}
```

##### query(conn)
```typescript
async query(conn: DBConnection): Promise<Array<any>>
```
- **作用**：执行不分页查询，返回所有符合条件的记录

#### 4. 工具方法

##### isNotEmpty(s)
```typescript
protected isNotEmpty(s: any): boolean
```
判断值是否不为空（字符串检查是否非空，其他类型检查是否非 null）

##### 通配符处理方法
```typescript
protected includeStar(s: string): boolean        // 检查是否包含 *
protected toWildSQL(s: string): string           // 将 * 转换为 %
protected replaceWildStar(s: string): string     // 转义 % 并将 * 转换为 %
protected escapePercentage(s: string): string    // 转义 % 字符
protected wrapLikeMatch(s: string): string       // 在字符串两端添加 %
```

## 使用示例

### 1. 创建查询类

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
        // 产品名称：支持通配符查询
        this.buildStarCriteria(this.criteria.name, 'p.name');
        
        // 产品状态：等值查询
        this.buildCriteria(this.criteria.status, 'p.status');
        
        // 分类路径：自定义 LIKE 查询
        if (this.criteria.categoryPath) {
            this.params.push(`${this.criteria.categoryPath}%`);
            this.sql += ` AND pc.query_path LIKE $${this.params.length}`;
        }
        
        // 价格范围查询示例
        this.buildRangeCriteria(
            this.criteria.priceFrom, 
            this.criteria.priceTo, 
            'p.price'
        );
    }
}
```

### 2. 使用查询类

```typescript
// 创建查询条件
const searchCriteria = new ProductSearchCriteria('tenant001', {
    page: 1,
    rows: 20,
    name: 'iPhone*',        // 支持通配符
    status: 'active',       // 等值查询
    categoryPath: '/electronics/phones',  // 路径前缀匹配
    priceFrom: 100,         // 价格范围
    priceTo: 1000
});

// 执行分页查询
const result = await searchCriteria.paginationQuery(dbConnection);
console.log(`总记录数: ${result.count}`);
console.log(`总页数: ${result.pages}`);
console.log(`是否有更多: ${result.hasMore}`);
console.log('当前页数据:', result.list);

// 或执行不分页查询
const allData = await searchCriteria.query(dbConnection);
```

## 查询类型说明

### 1. 等值查询
```typescript
this.buildCriteria(value, 'field_name');
// 生成: AND field_name = $n
```

### 2. 通配符查询
```typescript
this.buildStarCriteria('text*', 'field_name');
// 生成: AND field_name LIKE $n (参数值: 'text%')

this.buildStarCriteria('exact', 'field_name');
// 生成: AND field_name = $n (参数值: 'exact')
```

### 3. 范围查询
```typescript
this.buildRangeCriteria(startValue, endValue, 'field_name');
// 生成: AND field_name >= $n AND field_name < $m
```

### 4. 自定义查询
```typescript
if (this.criteria.customField) {
    this.params.push(this.criteria.customField);
    this.sql += ` AND custom_condition = $${this.params.length}`;
}
```

## 高级用法

### 1. 复杂查询条件

```typescript
protected buildDynamicQuery() {
    // 多字段 OR 查询
    if (this.criteria.keyword) {
        this.params.push(`%${this.criteria.keyword}%`);
        const paramIndex = this.params.length;
        this.sql += ` AND (p.name LIKE $${paramIndex} OR p.description LIKE $${paramIndex})`;
    }
    
    // IN 查询
    if (this.criteria.statuses && this.criteria.statuses.length > 0) {
        const placeholders = this.criteria.statuses.map((_, index) => {
            this.params.push(this.criteria.statuses[index]);
            return `$${this.params.length}`;
        }).join(',');
        this.sql += ` AND p.status IN (${placeholders})`;
    }
}
```

### 2. 自定义后处理

```typescript
protected getPostConstructor(): any {
    return (row: any) => {
        // 数据转换逻辑
        if (row.created_at) {
            row.created_at = new Date(row.created_at);
        }
        return row;
    };
}
```

## 最佳实践

### 1. 查询性能优化
- 在 WHERE 条件中的字段上建立索引
- 避免在大表上进行全表扫描
- 合理设置分页大小

### 2. 安全考虑
- 始终使用参数化查询防止 SQL 注入
- 验证输入参数的有效性
- 对敏感字段进行权限检查

### 3. 代码组织
- 将复杂的查询逻辑封装到独立的方法中
- 使用常量定义 SQL 模板
- 添加适当的注释和日志

### 4. 错误处理
```typescript
async paginationQuery(conn: DBConnection): Promise<PaginationList> {
    try {
        return await super.paginationQuery(conn);
    } catch (error) {
        this.logger.error('查询失败:', error);
        throw new Error('数据查询异常');
    }
}
```

## 扩展示例

### 更复杂的查询类实现

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
        // 基本字段查询
        this.buildStarCriteria(this.criteria.name, 'p.name');
        this.buildCriteria(this.criteria.status, 'p.status');
        
        // 日期范围查询
        this.buildRangeCriteria(
            this.criteria.createdFrom, 
            this.criteria.createdTo, 
            'p.created_at'
        );
        
        // 价格范围查询
        this.buildRangeCriteria(
            this.criteria.priceMin, 
            this.criteria.priceMax, 
            'p.price'
        );
        
        // 库存条件
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