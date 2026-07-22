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

export function createUnavailableSqliteAdapter(): SqliteDatabaseAdapter {
  return {
    openDatabase: async () => {
      throw new Error(
        "当前环境无法打开本地数据库，请在 Android 真机或支持 SQLite 的 UniApp 运行环境中重试。",
      );
    },
  };
}
