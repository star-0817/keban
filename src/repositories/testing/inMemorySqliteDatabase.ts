import type {
  SqliteDatabase,
  SqliteParams,
  SqliteQueryResult,
  SqliteRow,
  SqliteTransaction,
  SqliteValue,
} from "../../plugins/sqlite";

type Table = {
  columns: readonly string[];
  rows: SqliteRow[];
};

type DatabaseState = {
  tables: Map<string, Table>;
};

export type InMemorySqliteDatabase = SqliteDatabase &
  Readonly<{
    hasTable(name: string): boolean;
    selectAll(name: string): readonly SqliteRow[];
    getAppliedMigrationVersions(): Promise<readonly number[]>;
  }>;

export function createInMemorySqliteDatabase(): InMemorySqliteDatabase {
  const state: DatabaseState = { tables: new Map() };

  const database: InMemorySqliteDatabase = {
    execute: async (sql, params) => executeStatement(state, sql, params ?? []),
    query: async <T extends SqliteRow = SqliteRow>(
      sql: string,
      params?: SqliteParams,
    ) => queryStatement<T>(state, sql, params ?? []),
    withTransaction: async (operation) => {
      const snapshot = cloneState(state);
      const transaction = createTransaction(state);

      try {
        return await operation(transaction);
      } catch (error) {
        state.tables = snapshot.tables;
        throw error;
      }
    },
    hasTable: (name) => state.tables.has(normalizeIdentifier(name)),
    selectAll: (name) => {
      const table = getTable(state, name);

      return table.rows.map((row) => ({ ...row }));
    },
    getAppliedMigrationVersions: async () => {
      if (!state.tables.has("schema_version")) {
        return [];
      }

      const table = getTable(state, "schema_version");

      return table.rows
        .map((row) => Number(row.version))
        .sort((left, right) => left - right);
    },
  };

  return database;
}

function createTransaction(state: DatabaseState): SqliteTransaction {
  return {
    execute: async (sql, params) => executeStatement(state, sql, params ?? []),
    query: async <T extends SqliteRow = SqliteRow>(
      sql: string,
      params?: SqliteParams,
    ) => queryStatement<T>(state, sql, params ?? []),
  };
}

function executeStatement(
  state: DatabaseState,
  sql: string,
  params: SqliteParams,
): void {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.toUpperCase().startsWith("CREATE TABLE")) {
    createTable(state, normalizedSql);
    return;
  }

  if (normalizedSql.toUpperCase().startsWith("INSERT INTO")) {
    insertRow(state, normalizedSql, params);
    return;
  }

  throw new Error(`Unsupported in-memory SQL execute statement: ${sql}`);
}

function queryStatement<T extends SqliteRow>(
  state: DatabaseState,
  sql: string,
  _params: SqliteParams,
): SqliteQueryResult<T> {
  const normalizedSql = normalizeSql(sql);
  const match = /^SELECT\s+(.+)\s+FROM\s+([a-zA-Z_][\w]*)/i.exec(normalizedSql);

  if (!match) {
    throw new Error(`Unsupported in-memory SQL query statement: ${sql}`);
  }

  const selectedColumns = match[1]
    .split(",")
    .map((column) => normalizeIdentifier(column.trim()));
  const table = getTable(state, match[2]);
  const rows = table.rows.map((row) =>
    Object.fromEntries(
      selectedColumns.map((column) => [column, row[column] ?? null]),
    ),
  ) as T[];

  return { rows };
}

function createTable(state: DatabaseState, sql: string): void {
  const match =
    /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][\w]*)\s*\((.+)\)$/i.exec(
      sql,
    );

  if (!match) {
    throw new Error(`Unsupported in-memory CREATE TABLE statement: ${sql}`);
  }

  const tableName = normalizeIdentifier(match[1]);

  if (state.tables.has(tableName)) {
    return;
  }

  const columns = match[2]
    .split(",")
    .map((definition) => normalizeIdentifier(definition.trim().split(/\s+/)[0]))
    .filter((column) => column.length > 0);

  state.tables.set(tableName, { columns, rows: [] });
}

function insertRow(
  state: DatabaseState,
  sql: string,
  params: SqliteParams,
): void {
  const match =
    /^INSERT\s+INTO\s+([a-zA-Z_][\w]*)\s*\((.+)\)\s+VALUES\s*\((.+)\)$/i.exec(
      sql,
    );

  if (!match) {
    throw new Error(`Unsupported in-memory INSERT statement: ${sql}`);
  }

  const table = getTable(state, match[1]);
  const columns = match[2]
    .split(",")
    .map((column) => normalizeIdentifier(column.trim()));
  const values = parseValues(match[3], params);
  const row = Object.fromEntries(
    columns.map((column, index) => [column, values[index] ?? null]),
  );

  table.rows.push(row);
}

function parseValues(
  sqlValues: string,
  params: SqliteParams,
): readonly SqliteValue[] {
  let parameterIndex = 0;

  return sqlValues.split(",").map((value) => {
    const trimmed = value.trim();

    if (trimmed === "?") {
      const parameterValue = params[parameterIndex] ?? null;
      parameterIndex += 1;

      return parameterValue;
    }

    const quoted = /^'([^']*)'$/.exec(trimmed);

    if (quoted) {
      return quoted[1];
    }

    const numeric = Number(trimmed);

    return Number.isFinite(numeric) ? numeric : trimmed;
  });
}

function getTable(state: DatabaseState, name: string): Table {
  const tableName = normalizeIdentifier(name);
  const table = state.tables.get(tableName);

  if (!table) {
    throw new Error(`In-memory table does not exist: ${name}`);
  }

  return table;
}

function cloneState(state: DatabaseState): DatabaseState {
  return {
    tables: new Map(
      [...state.tables.entries()].map(([name, table]) => [
        name,
        {
          columns: [...table.columns],
          rows: table.rows.map((row) => ({ ...row })),
        },
      ]),
    ),
  };
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function normalizeIdentifier(identifier: string): string {
  return identifier.replace(/["`]/g, "").trim().toLowerCase();
}
