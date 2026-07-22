import { describe, expect, it } from "vitest";

import { createAndroidUniAppSqliteAdapter } from "./sqlite";

type FakeSqliteCall = Readonly<{
  method: string;
  sql?: string | readonly string[];
  operation?: string;
}>;

function createFakePlusSqlite(options?: { readonly failOnSql?: string }) {
  const calls: FakeSqliteCall[] = [];

  return {
    calls,
    sqlite: {
      isOpenDatabase: () => false,
      openDatabase: (input: {
        success?: () => void;
        fail?: (error: unknown) => void;
      }) => {
        calls.push({ method: "openDatabase" });
        input.success?.();
      },
      closeDatabase: (input: {
        success?: () => void;
        fail?: (error: unknown) => void;
      }) => {
        calls.push({ method: "closeDatabase" });
        input.success?.();
      },
      executeSql: (input: {
        sql?: string | readonly string[];
        success?: () => void;
        fail?: (error: unknown) => void;
      }) => {
        calls.push({ method: "executeSql", sql: input.sql });
        if (
          typeof input.sql === "string" &&
          options?.failOnSql !== undefined &&
          input.sql.includes(options.failOnSql)
        ) {
          input.fail?.({ message: "native failed" });
          return;
        }
        input.success?.();
      },
      selectSql: (input: {
        sql?: string;
        success?: (rows: unknown[]) => void;
        fail?: (error: unknown) => void;
      }) => {
        calls.push({ method: "selectSql", sql: input.sql });
        input.success?.([{ id: "row-1", value: null }]);
      },
      transaction: (input: {
        operation?: string;
        success?: () => void;
        fail?: (error: unknown) => void;
      }) => {
        calls.push({ method: "transaction", operation: input.operation });
        input.success?.();
      },
    },
  };
}

describe("createAndroidUniAppSqliteAdapter", () => {
  it("serializes SQL parameters in the plugin layer", async () => {
    const fakePlus = createFakePlusSqlite();
    const database = await createAndroidUniAppSqliteAdapter({
      plusObject: fakePlus,
    }).openDatabase({ name: "keban.db" });

    await database.execute(
      "INSERT INTO students (name, student_no, note) VALUES (?, ?, ?)",
      ["张三's", 2026001, null],
    );

    expect(fakePlus.calls.at(-1)).toEqual({
      method: "executeSql",
      sql: "INSERT INTO students (name, student_no, note) VALUES ('张三''s', 2026001, NULL)",
    });
  });

  it("rejects mismatched parameters with a Chinese error", async () => {
    const fakePlus = createFakePlusSqlite();
    const database = await createAndroidUniAppSqliteAdapter({
      plusObject: fakePlus,
    }).openDatabase({ name: "keban.db" });

    await expect(database.query("SELECT ? AS value")).rejects.toThrow(
      "SQLite 参数数量不匹配",
    );
  });

  it("rolls back a failed transaction and reports Chinese context", async () => {
    const fakePlus = createFakePlusSqlite({ failOnSql: "broken" });
    const database = await createAndroidUniAppSqliteAdapter({
      plusObject: fakePlus,
    }).openDatabase({ name: "keban.db" });

    await expect(
      database.withTransaction(async (transaction) => {
        await transaction.execute("INSERT INTO broken (id) VALUES (?)", [
          "row-1",
        ]);
      }),
    ).rejects.toThrow("SQLite 事务执行失败");

    expect(
      fakePlus.calls.map((call) => call.operation).filter(Boolean),
    ).toEqual(["begin", "rollback"]);
  });
});
