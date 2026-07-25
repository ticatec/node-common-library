# 动态条件分页查询框架

English | [中文文档](SEARCH_CRITERIA_CN.md)

## 概述

这是一个基于 TypeScript 的动态条件分页查询框架，提供灵活的数据库查询和分页功能。通过继承抽象基类 `CommonSearchCriteria`（或其别名 `SearchCriteria`），你可以快速构建包含动态条件的数据库分页查询。

## 核心特性

- **动态条件构建**：支持精确匹配、范围查询、通配符模糊查询等多种查询类型
- **分页查询**：内置分页计算逻辑，支持自定义单页条数
- **通配符支持**：支持 `*` 通配符自动转换为 SQL `%` 通配符并自动转义 `%`
- **防 SQL 注入**：基于参数化查询，防止 SQL 注入风险
- **灵活扩展**：可通过覆写方法及行后处理器来自定义复杂逻辑

## 核心 API 与方法说明

### 1. 条件构建方法

##### addEqualsCriteria(value, field) / buildCriteria(value, field)
- **用途**：构建精确相等匹配条件（`field = $N`）
- **别名**：`buildCriteria(value, field)`

##### addWildcardCriteria(text, field) / buildStarCriteria(text, field)
- **用途**：构建支持 `*` 通配符的匹配条件
- **逻辑**：包含 `*` 时转换为 `LIKE`，不含 `*` 时使用 `=` 精确匹配
- **别名**：`buildStarCriteria(text, field)`

##### buildRangeCriteria(fromValue, toValue, field)
- **用途**：构建范围查询条件（`field >= $N AND field < $M`）
- **说明**：当 `toValue` 为 Date 实例时，自动调用 `getNextDayStart(toValue)` 计算次日零点

#### 2. 处理器与工具方法

##### getPostProcessor() / getPostConstructor()
- **用途**：返回一个回调函数 `(obj: any) => void`，用于在行数据映射完成后进行自定义后置处理
- **别名**：`getPostConstructor()`

##### getNextDayStart(d) / getEndOfDay(d)
- **用途**：计算次日零点时间（00:00:00.000），用于范围查询中的开区间上限（`field < nextDayStart`）
- **别名**：`getEndOfDay(d)`

---

## 使用示例

```typescript
import { CommonSearchCriteria } from '@ticatec/node-common-library';

export default class ProductSearchCriteria extends CommonSearchCriteria {
    constructor(tenantCode: string, criteria: any) {
        super(criteria);
        this.sql = `SELECT * FROM products WHERE tenant_code = $1`;
        this.params = [tenantCode];
        this.orderBy = `ORDER BY created_at DESC`;
    }

    protected buildDynamicQuery() {
        // 名称通配符匹配
        this.addWildcardCriteria(this.criteria.name, 'name');
        
        // 状态精确匹配
        this.addEqualsCriteria(this.criteria.status, 'status');
        
        // 日期范围匹配
        this.buildRangeCriteria(this.criteria.createdFrom, this.criteria.createdTo, 'created_at');
    }
    
    protected getPostProcessor() {
        return (row: any) => {
            row.customFormattedField = `${row.code} - ${row.name}`;
        };
    }
}
```