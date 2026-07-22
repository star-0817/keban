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

  if (normalizedSql.toUpperCase().startsWith("UPDATE")) {
    updateRows(state, normalizedSql, params);
    return;
  }

  if (normalizedSql.toUpperCase().startsWith("DELETE FROM")) {
    deleteRows(state, normalizedSql, params);
    return;
  }

  throw new Error(`Unsupported in-memory SQL execute statement: ${sql}`);
}

function queryStatement<T extends SqliteRow>(
  state: DatabaseState,
  sql: string,
  params: SqliteParams,
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
  const filteredRows = applyWhere(table.rows, normalizedSql, params);
  const orderedRows = applyOrderBy(filteredRows, normalizedSql);
  const pagedRows = applyLimitOffset(orderedRows, normalizedSql, params);
  const rows = pagedRows.map((row) =>
    selectedColumns[0] === "*"
      ? { ...row }
      : Object.fromEntries(
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

function updateRows(
  state: DatabaseState,
  sql: string,
  params: SqliteParams,
): void {
  const match =
    /^UPDATE\s+([a-zA-Z_][\w]*)\s+SET\s+(.+)\s+WHERE\s+([a-zA-Z_][\w]*)\s*=\s*\?$/i.exec(
      sql,
    );

  if (!match) {
    throw new Error(`Unsupported in-memory UPDATE statement: ${sql}`);
  }

  const table = getTable(state, match[1]);
  const assignments = match[2].split(",").map((assignment) => {
    const assignmentMatch = /^\s*([a-zA-Z_][\w]*)\s*=\s*\?\s*$/.exec(
      assignment,
    );

    if (!assignmentMatch) {
      throw new Error(`Unsupported in-memory UPDATE assignment: ${assignment}`);
    }

    return normalizeIdentifier(assignmentMatch[1]);
  });
  const whereColumn = normalizeIdentifier(match[3]);
  const whereValue = params[assignments.length] ?? null;

  table.rows = table.rows.map((row) =>
    row[whereColumn] === whereValue
      ? {
          ...row,
          ...Object.fromEntries(
            assignments.map((column, index) => [column, params[index] ?? null]),
          ),
        }
      : row,
  );
}

function deleteRows(
  state: DatabaseState,
  sql: string,
  params: SqliteParams,
): void {
  const match =
    /^DELETE\s+FROM\s+([a-zA-Z_][\w]*)\s+WHERE\s+([a-zA-Z_][\w]*)\s*=\s*\?$/i.exec(
      sql,
    );

  if (!match) {
    throw new Error(`Unsupported in-memory DELETE statement: ${sql}`);
  }

  const table = getTable(state, match[1]);
  const whereColumn = normalizeIdentifier(match[2]);
  const whereValue = params[0] ?? null;

  table.rows = table.rows.filter((row) => row[whereColumn] !== whereValue);
}

function applyWhere(
  rows: readonly SqliteRow[],
  sql: string,
  params: SqliteParams,
): readonly SqliteRow[] {
  const match = /\sWHERE\s+([a-zA-Z_][\w]*)\s*=\s*\?/i.exec(sql);

  if (!match) {
    return rows;
  }

  const column = normalizeIdentifier(match[1]);
  const value = params[0] ?? null;

  return rows.filter((row) => row[column] === value);
}

function applyOrderBy(
  rows: readonly SqliteRow[],
  sql: string,
): readonly SqliteRow[] {
  const match = /\sORDER\s+BY\s+([a-zA-Z_][\w]*)\s+(ASC|DESC)/i.exec(sql);

  if (!match) {
    return rows;
  }

  const column = normalizeIdentifier(match[1]);
  const direction = match[2].toUpperCase();

  return [...rows].sort((left, right) => {
    const leftValue = String(left[column] ?? "");
    const rightValue = String(right[column] ?? "");
    const comparison = leftValue.localeCompare(rightValue);

    return direction === "DESC" ? -comparison : comparison;
  });
}

function applyLimitOffset(
  rows: readonly SqliteRow[],
  sql: string,
  params: SqliteParams,
): readonly SqliteRow[] {
  if (!/\sLIMIT\s+\?\s+OFFSET\s+\?/i.test(sql)) {
    return rows;
  }

  const limit = Number(params[0]);
  const offset = Number(params[1]);

  return rows.slice(offset, offset + limit);
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
