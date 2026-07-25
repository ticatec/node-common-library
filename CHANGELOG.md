# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-07-26

Third review pass. The release focuses on declarative-transaction correctness, type safety of public APIs, defensive defaults for SQL utilities, and the first real unit-test coverage of core logic.

### ⚠️ Breaking Changes

Behavior of public APIs changed in a way that may require caller updates. Review carefully before upgrading from 3.0.x.

- **`executeSQLFile()` now throws by default.** Previously it swallowed per-statement errors and returned a boolean. The new default is `{ stopOnError: true, throwOnError: true }` so a failed migration statement aborts the run with a descriptive `Error`. Pass `{ stopOnError: false }` to restore the old tolerant behavior (still returns `hasError: boolean`).
- **`BeanFactory.createBean<T>()` now returns `T | undefined`.** Callers that relied on the silently-typed `T` must handle the missing-bean case. `CommonService.getRepositoryInstance()` and `CommonRepository.getDAOInstance()` were updated to throw a descriptive error when a bean is not registered.
- **`CommonDAO.convertBooleanFields()` removed.** Use `DBConnection.listQuery()` / `find()` with the `booleanFields` parameter (auto-applies), or call `DBConnection.convertBooleanFields()` directly — its visibility was raised from `protected` to `public`.
- **`DBConnection.buildFieldsMap()` default now applies underscore → camelCase.** Drivers that did not override this method previously got identity mapping; they now get camelCase automatically. Override the method if you need raw column names preserved.
- **`CommonService` / `CommonRepository` / `CommonDAO` / `DBConnection` constructors changed from `protected` to `public`.** Concrete subclasses no longer need to redeclare the constructor just to be instantiable.

### 🚀 New Features

- **`Propagation.REQUIRES_NEW` is now fully implemented.** Calling `@Transaction(Propagation.REQUIRES_NEW)` (nested or top-level) correctly opens an isolated connection and suspends the surrounding context via `AsyncLocalStorage`. Previously this propagation threw `"Unsupported propagation"`.
- **`@Transaction` decorator now supports inheritance.** `CommonService._applyTransactionAspect()` walks the entire prototype chain, records where each method's metadata was declared, and wraps the method on the most-derived prototype. A `WeakSet` guards against double-wrapping. Inherited `@Transaction` methods from abstract parent classes are now correctly aspect-woven with their original propagation — previously they were silently downgraded to `REQUIRED`.
- **Generic types on query methods.** `DBConnection.find<T>()` returns `Promise<T | null>` and `listQuery<T>()` returns `Promise<Array<T>>`, both defaulting to `any` for backward compatibility.
- **`DBManager.getInstance()` fails fast.** Throws a clear `Error('DBManager is not initialized. Please call DBManager.init(factory) first ...')` instead of returning `undefined` and crashing on the next call. `DBManager.resetInstance()` added as a test hook.
- **`executeSQLFile()` options object** (`ExecuteSQLFileOptions`) exposes `stopOnError` and `throwOnError` for fine-grained control over migration failure handling.
- **`BitsBoolean` unsigned 32-bit safety.** All bitwise operations use `>>> 0`; bit-position range tightened to `0–30`; `fromBooleanArray()` capped at 31 elements.

### 🐛 Bug Fixes

- **`TransactionManager.execute()` no longer loses the original error on rollback / close failure.** The original error is re-thrown; secondary failures from `rollback()` and `close()` are logged and swallowed.
- **`CommonDAO.quickSearch()` uses driver-independent pagination.** Replaced hard-coded `offset ${o} limit ${r}` with `conn.getRowSetLimitClause(rowCount, offset)` so non-MySQL/PG drivers work correctly.
- **`CommonSearchCriteria.buildRangeCriteria()` includes the entire end day.** When `toValue` is a `Date` instance, the upper bound is automatically converted via `getEndOfDay()` (exclusive `< nextDay`). Previously the raw value produced `< toValue`, excluding the entire end date.
- **`CommonSearchCriteria.query()` applies `getPostConstructor()`.** Unpaginated queries now run the same post-processing hook as `paginationQuery()`.
- **`CommonSearchCriteria.paginationQuery()` page count uses `Math.ceil()`.** More readable; produces the same result for `count > 0`.
- **`CommonSearchCriteria.queryCount()` guards against `NaN`.** Returns `0` for null results, missing `cc` field, or non-numeric values, matching the behavior of `DBConnection.getCount()`.
- **`DBConnection.getCount()` guards against `NaN`.** Same fix as above.
- **`DBConnection.buildFieldsMap()` default no longer returns `null`.** Returns an empty `Map` (or a camelCase identity map when fields are present), eliminating the NPE in `resultToList` if a subclass forgot to override.
- **`DBConnection.resultToList()` defensively handles missing fields.** Falls back to `{ ...row }` spread when no field map is available; early-returns `[]` when `result.rows` is absent.
- **`getEndOfDay()` returns `null` for invalid dates** and `buildRangeCriteria()` skips the SQL clause when the computed upper bound is empty — avoids generating `field < NULL` (which never matches any row).

### 🧪 Tests

First meaningful test coverage on the framework core. Five suites, fifteen tests:

- `BeanFactory.test.ts` — lazy construction, circular-dependency detection, missing-bean handling
- `TransactionManager.test.ts` — REQUIRED / REQUIRES_NEW / NONE propagation, inherited `@Transaction` from abstract parent, nested REQUIRED→REQUIRES_NEW opens two separate connections, `DBManager` initialization guard
- `CommonSearchCriteria.test.ts` — `buildStarCriteria` wildcard→LIKE, `buildRangeCriteria` Date handling, `Math.ceil` page count, `getPostConstructor` applied in `query()`
- `BitsBoolean.test.ts` — set/get bit positions, `toBooleanArray`, `fromBooleanArray`, unsigned safety
- `Logger.test.ts` — `getLogger` before/after `initialize()`

### 📚 Documentation

- README numbering fixed (the previous release had two `### 2.` and two `### 5.` sections)
- README / README_CN wording aligned
- JSDoc on `executeSQLFile`, `buildFieldsMap`, `getEndOfDay`, `buildRangeCriteria`, `listQuery<T>`, `find<T>` expanded to document new contracts

### 🔧 Internal

- `package.json` devDependency `@ticatec/logger-wrapper` switched from `file:../logger_warpper` to `^0.1.0` so fresh clones resolve from npm
- `tsconfig.json` paths entry for `@ticatec/logger-wrapper` keeps local sibling path first for cross-package development, with a `node_modules` fallback for CI / external contributors
- `.gitignore` now excludes `.DS_Store`, `coverage/`, `*.log`, `*.iml`

### ⚠️ Known Limitations (unchanged, called out for clarity)

- `loadAndSplitSQL()` is a lightweight regex splitter — it does not parse string literals or PL/SQL `BEGIN ... END` / `$$ ... $$` blocks. Document your migration files accordingly.
- `tsconfig.json` is still `strict: false`. A full strict-mode pass is planned for a later release.
- The `@Transaction` decorator uses TypeScript's legacy `experimentalDecorators` spec. Migration to ECMAScript stage-3 decorators is tracked as future work.

---

## [3.0.0] - 2026-07-21

- Adopted `@ticatec/logger-wrapper` as the logging backend
- Dual ESM / CommonJS build