export type SqliteValue = string | number | null;

export type SqliteParams = readonly SqliteValue[];

export type SqliteRow = Readonly<Record<string, SqliteValue>>;

export type SqliteQueryResult<T extends SqliteRow = SqliteRow> = Readonly<{
  rows: readonly T[];
}>;

export interface SqliteTransaction {
  execute(sql: string, params?: SqliteParams): Promise<void>;
  query<T extends SqliteRow = SqliteRow>(
    sql: string,
    params?: SqliteParams,
  ): Promise<SqliteQueryResult<T>>;
}

export interface SqliteDatabase extends SqliteTransaction {
  close(): Promise<void>;
  withTransaction<T>(
    operation: (transaction: SqliteTransaction) => Promise<T>,
  ): Promise<T>;
}

export type OpenSqliteDatabaseOptions = Readonly<{
  name: string;
  path?: string;
}>;

export interface SqliteDatabaseAdapter {
  openDatabase(options: OpenSqliteDatabaseOptions): Promise<SqliteDatabase>;
}

type PlusSqliteLike = Readonly<{
  sqlite?: Readonly<{
    openDatabase(options: {
      readonly name?: string;
      readonly path?: string;
      readonly success?: (result: unknown) => void;
      readonly fail?: (error: unknown) => void;
    }): void;
    isOpenDatabase(options: {
      readonly name?: string;
      readonly path?: string;
    }): boolean;
    closeDatabase(options: {
      readonly name?: string;
      readonly success?: (result: unknown) => void;
      readonly fail?: (error: unknown) => void;
    }): void;
    executeSql(options: {
      readonly name?: string;
      readonly sql?: string | readonly string[];
      readonly success?: (result: unknown) => void;
      readonly fail?: (error: unknown) => void;
    }): void;
    selectSql(options: {
      readonly name?: string;
      readonly sql?: string;
      readonly success?: (rows: unknown[]) => void;
      readonly fail?: (error: unknown) => void;
    }): void;
    transaction(options: {
      readonly name?: string;
      readonly operation?: string;
      readonly success?: (result: unknown) => void;
      readonly fail?: (error: unknown) => void;
    }): void;
  }>;
}>;

export type CreateAndroidUniAppSqliteAdapterOptions = Readonly<{
  plusObject?: PlusSqliteLike;
}>;

export function createAndroidUniAppSqliteAdapter(
  options: CreateAndroidUniAppSqliteAdapterOptions = {},
): SqliteDatabaseAdapter {
  return {
    openDatabase: async (databaseOptions) => {
      const plusObject = options.plusObject ?? readGlobalPlus();
      const sqlite = plusObject.sqlite;

      if (sqlite === undefined) {
        throw new Error(
          "Android SQLite 打开失败：当前环境没有 plus.sqlite API",
        );
      }

      const path = databaseOptions.path ?? `_doc/${databaseOptions.name}`;
      const openOptions = { name: databaseOptions.name, path };

      try {
        if (!sqlite.isOpenDatabase(openOptions)) {
          await wrapPlusCallback<void>(
            (success, fail) =>
              sqlite.openDatabase({
                ...openOptions,
                success,
                fail,
              }),
            "Android SQLite 打开失败",
          );
        }
      } catch (error) {
        throw new Error(`Android SQLite 打开失败：${getErrorMessage(error)}`);
      }

      return createAndroidUniAppDatabase(sqlite, databaseOptions.name);
    },
  };
}

export function isAndroidUniAppRuntime(): boolean {
  const maybeUni = globalThis as {
    readonly uni?: {
      readonly getSystemInfoSync?: () => { readonly platform?: string };
    };
  };

  try {
    return (
      maybeUni.uni?.getSystemInfoSync?.().platform?.toLowerCase() === "android"
    );
  } catch {
    return false;
  }
}

function createAndroidUniAppDatabase(
  sqlite: NonNullable<PlusSqliteLike["sqlite"]>,
  name: string,
): SqliteDatabase {
  const execute = async (sql: string, params?: SqliteParams): Promise<void> => {
    await wrapPlusCallback<void>(
      (success, fail) =>
        sqlite.executeSql({
          name,
          sql: bindSqlParams(sql, params ?? []),
          success,
          fail,
        }),
      "SQLite 执行 SQL 失败",
    );
  };
  const query = async <T extends SqliteRow = SqliteRow>(
    sql: string,
    params?: SqliteParams,
  ): Promise<SqliteQueryResult<T>> => {
    const rows = await wrapPlusCallback<unknown[]>(
      (success, fail) =>
        sqlite.selectSql({
          name,
          sql: bindSqlParams(sql, params ?? []),
          success,
          fail,
        }),
      "SQLite 查询 SQL 失败",
    );

    return {
      rows: rows.map(normalizeRow) as T[],
    };
  };
  const transaction = { execute, query };

  return {
    execute,
    query,
    close: async () => {
      await wrapPlusCallback<void>(
        (success, fail) =>
          sqlite.closeDatabase({
            name,
            success,
            fail,
          }),
        "Android SQLite 关闭失败",
      );
    },
    withTransaction: async (operation) => {
      await runTransactionOperation(sqlite, name, "begin");
      try {
        const result = await operation(transaction);
        await runTransactionOperation(sqlite, name, "commit");

        return result;
      } catch (error) {
        try {
          await runTransactionOperation(sqlite, name, "rollback");
        } catch (rollbackError) {
          throw new Error(
            `SQLite 事务执行失败：${getErrorMessage(error)}；回滚失败：${getErrorMessage(
              rollbackError,
            )}`,
          );
        }

        throw new Error(`SQLite 事务执行失败：${getErrorMessage(error)}`);
      }
    },
  };
}

export function createUnavailableSqliteAdapter(): SqliteDatabaseAdapter {
  return {
    openDatabase: async () => {
      throw new Error(
        "当前环境无法打开本地数据库，请在 Android 真机或支持 SQLite 的 UniApp 运行环境中重试。",
      );
    },
  };
}

function bindSqlParams(sql: string, params: SqliteParams): string {
  let index = 0;
  const boundSql = sql.replace(/\?/g, () =>
    serializeSqliteValue(params[index++]),
  );

  if (index !== params.length) {
    throw new Error(
      `SQLite 参数数量不匹配：SQL 需要 ${index} 个参数，实际传入 ${params.length} 个`,
    );
  }

  return boundSql;
}

function serializeSqliteValue(value: SqliteValue | undefined): string {
  if (value === undefined || value === null) {
    return "NULL";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("SQLite 参数序列化失败：数字参数必须是有限值");
    }

    return String(value);
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function normalizeRow(row: unknown): SqliteRow {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("SQLite 查询结果解析失败：返回行不是对象");
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
  );
}

function normalizeValue(value: unknown): SqliteValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value === null
  ) {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  return String(value);
}

function runTransactionOperation(
  sqlite: NonNullable<PlusSqliteLike["sqlite"]>,
  name: string,
  operation: "begin" | "commit" | "rollback",
): Promise<void> {
  return wrapPlusCallback<void>(
    (success, fail) =>
      sqlite.transaction({
        name,
        operation,
        success,
        fail,
      }),
    `SQLite 事务${operationToChinese(operation)}失败`,
  );
}

function operationToChinese(
  operation: "begin" | "commit" | "rollback",
): string {
  switch (operation) {
    case "begin":
      return "开始";
    case "commit":
      return "提交";
    case "rollback":
      return "回滚";
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}

function wrapPlusCallback<T>(
  start: (
    success: (result: unknown) => void,
    fail: (error: unknown) => void,
  ) => void,
  context: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    start(
      (result) => resolve(result as T),
      (error) => reject(new Error(`${context}：${getErrorMessage(error)}`)),
    );
  });
}

function readGlobalPlus(): PlusSqliteLike {
  const maybePlus = (globalThis as { readonly plus?: PlusSqliteLike }).plus;

  if (maybePlus === undefined) {
    throw new Error("当前环境没有 plus 对象");
  }

  return maybePlus;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { readonly message: unknown }).message);
  }

  return String(error);
}
