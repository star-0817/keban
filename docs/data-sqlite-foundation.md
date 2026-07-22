# 数据层与 SQLite 初始化基础设施

## 依赖方向

课伴的数据访问固定遵循：

```text
pages / components / stores -> services -> repositories -> plugins
domain
```

- `src/domain` 只保存纯 TypeScript 领域类型、校验和通用结果类型，不依赖仓储、SQLite、UniApp 或 Android API。
- `src/plugins/sqlite.ts` 定义类型化 SQLite 平台适配器接口，后续真实 UniApp 或 Android 原生调用只能封装在这一层。
- `src/repositories` 只依赖抽象 `SqliteDatabase` / `SqliteTransaction`，业务仓储不得直接调用 UniApp API。
- 页面、组件和 Pinia store 不得直接访问 SQLite；需要通过 service 编排后调用 repository。

## 迁移策略

- 数据库初始化器会先幂等创建 `schema_version` 表。
- 每条迁移必须声明递增的 `version` 和可读的 `name`。
- 初始化时按版本升序执行尚未记录的迁移，执行成功后写入 `schema_version`。
- 重复初始化会跳过已记录版本，因此不会重复写入业务数据。
- 每条迁移在独立事务中执行；迁移失败时回滚该版本的所有写入，不记录失败版本，并停止执行后续迁移。

当前基础迁移只建立版本机制，不创建名单、课程表、计划、PDF 等业务表。

## 测试替身

`src/repositories/testing/inMemorySqliteDatabase.ts` 提供纯内存 SQLite 替身，用于单元测试迁移顺序、幂等初始化和事务回滚。它只支持当前测试需要的 SQL 子集，不代表完整 SQLite 行为。

## Android 真机验证清单

当前任务没有接入真实 UniApp SQLite API，也没有在本环境伪造真机验证成功。后续接入真实适配器后，请在 Android 真机执行：

1. 全新安装 App，触发数据库初始化。
   预期：无崩溃，`schema_version` 创建成功，当前迁移版本被记录。
2. 关闭并重启 App，再次触发初始化。
   预期：初始化成功，已执行迁移不重复运行。
3. 从旧版本数据库升级到包含新增迁移的版本。
   预期：迁移按版本升序执行，`schema_version` 记录连续版本。
4. 临时构造失败迁移进行调试包验证。
   预期：失败迁移的表结构或写入被回滚，失败版本不写入 `schema_version`，后续迁移不执行，并显示中文错误提示。
