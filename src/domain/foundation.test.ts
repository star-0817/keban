import { describe, expect, it } from "vitest";

import {
  createId,
  err,
  isUtcIsoDateTime,
  ok,
  parseUtcIsoDateTime,
  toUtcIsoDateTime,
  validateMaxLengthText,
  validateNonEmptyText,
  validateNonNegativeInteger,
  validatePositiveInteger,
} from "./index";

describe("domain foundation ids", () => {
  it("creates non-empty ids without duplicates in a local batch", () => {
    const ids = Array.from({ length: 200 }, () => createId());

    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("domain foundation utc iso date time", () => {
  it("accepts utc iso 8601 strings and parses them into dates", () => {
    const input = "2026-07-22T12:34:56.789Z";
    const result = parseUtcIsoDateTime(input);

    expect(isUtcIsoDateTime(input)).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.toISOString() : "").toBe(input);
  });

  it("formats dates for storage as utc iso 8601 strings", () => {
    const date = new Date(Date.UTC(2026, 6, 22, 12, 34, 56, 789));

    expect(toUtcIsoDateTime(date)).toBe("2026-07-22T12:34:56.789Z");
  });

  it("rejects invalid or non-utc iso date time strings", () => {
    const invalidValues = [
      "2026-07-22",
      "2026-07-22T12:34:56+08:00",
      "2026-02-30T12:00:00.000Z",
      "not a date",
    ];

    expect(invalidValues.map(isUtcIsoDateTime)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("domain foundation result", () => {
  it("represents explicit success and failure results", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("错误")).toEqual({ ok: false, error: "错误" });
  });
});

describe("domain foundation input validation", () => {
  it("accepts non-empty text after trimming and rejects blank text", () => {
    expect(validateNonEmptyText("  课程  ").ok).toBe(true);
    expect(validateNonEmptyText("   ")).toEqual({
      ok: false,
      error: "内容不能为空",
    });
  });

  it("rejects text beyond the configured maximum length", () => {
    expect(validateMaxLengthText("12345", 5).ok).toBe(true);
    expect(validateMaxLengthText("123456", 5)).toEqual({
      ok: false,
      error: "内容不能超过 5 个字符",
    });
  });

  it("validates positive integer boundaries", () => {
    expect(validatePositiveInteger(1).ok).toBe(true);
    expect(validatePositiveInteger(0)).toEqual({
      ok: false,
      error: "请输入大于 0 的整数",
    });
    expect(validatePositiveInteger(1.5).ok).toBe(false);
  });

  it("validates non-negative integer boundaries", () => {
    expect(validateNonNegativeInteger(0).ok).toBe(true);
    expect(validateNonNegativeInteger(-1)).toEqual({
      ok: false,
      error: "请输入不小于 0 的整数",
    });
    expect(validateNonNegativeInteger(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});
