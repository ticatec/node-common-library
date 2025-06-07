# 数据库访问框架

本项目提供了一个健壮且灵活的数据库访问框架，包含数据库连接管理、SQL执行、事务处理、分页查询和动态查询构建的抽象功能。它旨在为多种数据库驱动（如PostgreSQL、MySQL）提供一致的数据访问层。

## 📦 项目结构

```bash
.
├── CommonDAO.ts            # 包含通用数据库操作的抽象DAO类
├── BaseDAO.ts              # 定义基本CRU操作的接口
├── BaseCRUDDAO.ts          # 扩展的CRUD接口，包含删除功能
├── CommonService.ts        # 用于事务管理的抽象服务层类
├── BatchRecord.ts          # 用于批量记录处理的接口
├── DBConnection.ts         # 抽象数据库连接类
├── BeanFactory.ts          # 用于管理DAO和服务实例的单例工厂
└── ...
```

## ✨ 主要特性

- **多数据库支持**：通过`DBConnection`实现轻松适配不同数据库类型。
- **事务管理**：支持`beginTransaction()`、`commit()`和`rollback()`，确保操作的可靠性。
- **分页查询**：内置支持分页功能，通过`PaginationList`实现。
- **动态查询构建**：通过`CommonSearchCriteria`提供灵活的查询构造。
- **SQL文件执行**：支持执行SQL脚本，包含注释处理和错误日志记录。
- **字段转换**：自动将下划线转换为驼峰命名，支持嵌套对象。
- **依赖注入**：通过Bean工厂管理单例和原型实例。

## 🛠 核心组件

### 1. `CommonDAO`
数据访问对象（DAO）的抽象基类，提供通用数据库操作的实用方法。

- **关键方法**：
    - `genID()`：生成32位UUID。
    - `executeCountSQL()`：执行计数查询并返回结果。
    - `searchByCriteria()`：使用`SearchCriteria`执行分页查询。
    - `quickSearch()`：执行快速分页查询，带有默认行数限制。
    - `convertBooleanFields()`：将字符串/布尔字段（例如'T'/'F'）转换为`true`/`false`。

```ts
class MyDAO extends CommonDAO {
  async findByCode(conn: DBConnection, code: string): Promise<any> {
    return await conn.find(conn, [code]);
  }
}
```

### 2. `CommonService`
用于管理数据库连接和事务的抽象服务层类。

- **关键方法**：
    - `executeInTx()`：在事务中运行函数，处理提交和回滚。
    - `executeNonTx()`：在非事务环境中运行函数。
    - `getDAOInstance()`：通过`BeanFactory`获取DAO实例。

```ts
class MyService extends CommonService {
  async createItem(data: any): Promise<number> {
    return this.executeInTx(async (conn: DBConnection) => {
      const dao = this.getDAOInstance('MyDAO');
      return await dao.createNew(conn, data);
    });
  }
}
```

### 3. `BaseDAO` 和 `BaseCRUDDAO`
定义标准CRUD操作（`createNew`、`update`、`find`）和扩展删除功能（`remove`）的接口。

### 4. `BatchRecord`
用于批量处理的接口，支持记录处理和错误跟踪。

```ts
const batchRecords: BatchRecords<MyData> = [
  { recNo: 1, data: { id: "1", name: "Item1" }, error: null },
  { recNo: 2, data: { id: "2", name: "Item2" }, error: null }
];
```

### 5. `DBConnection`
定义核心数据库操作的抽象类，包括事务控制、SQL执行和查询处理。

- **关键方法**：
    - `executeSQL()`、`executeUpdate()`、`insertRecord()`、`updateRecord()`、`deleteRecord()`：SQL执行方法。
    - `executePaginationSQL()`：使用`CommonSearchCriteria`执行分页查询。
    - `executeSQLFile()`：处理并执行SQL文件，移除注释并处理错误。
    - `resultToList()`：将查询结果转换为驼峰命名的对象列表。

[更多细节](./src/db/README.md)

### 6. `BeanFactory`
用于管理DAO和服务实例的单例工厂，支持`Singleton`和`Prototype`作用域。

```ts
beanFactory.register('MyDAO', MyDAO, Scope.Singleton);
const dao = beanFactory.getInstance('MyDAO');
```

## 📋 使用示例

### 使用DAO和服务进行分页查询

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
    return await criteria.paginationQuery(conn);
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
console.log(result.list); // 当前页面数据
```

## ✅ 特性总结

- **数据库无关**：通过`DBConnection`实现支持多种数据库类型。
- **事务支持**：通过事务管理确保操作的可靠性。
- **灵活查询**：支持动态查询构建和分页。
- **SQL文件执行**：批量执行SQL脚本，包含错误处理。
- **数据转换**：自动字段名称转换和嵌套对象支持。
- **依赖管理**：通过Bean工厂管理DAO和服务实例。

## 📎 依赖项

- `log4js`：用于日志记录。
- `fs`：用于读取SQL文件。
- 特定数据库驱动所需的其他依赖项。

## 🚀 入门指南

1. **实现`DBConnection`**：为您的数据库驱动（如PostgreSQL、MySQL）实现`DBConnection`。
2. **扩展`CommonDAO`**：为特定实体创建DAO。
3. **扩展`CommonService`**：管理事务和DAO访问。
4. **注册DAO/服务**：使用`BeanFactory`进行依赖注入。
5. **使用`SearchCriteria`**：实现动态查询构建和分页。

## 📝 注意事项

- 确保正确配置`log4js`以进行日志记录。
- SQL文件需格式正确，以避免在`executeSQLFile`期间出现解析问题。
- 扩展`CommonSearchCriteria`以实现适合应用的自定义查询逻辑。

## 许可证

MIT许可证

## 联系方式

huili.f@gmail.com

https://github.com/ticatec/pg-common-library