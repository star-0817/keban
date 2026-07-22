import { err, ok, type Result } from "./result";

export type UtcIsoDateTime = string & { readonly __brand: "UtcIsoDateTime" };

export type TimestampFields = Readonly<{
  createdAt: UtcIsoDateTime;
  updatedAt: UtcIsoDateTime;
}>;

export const UTC_TIME_FIELD_NAMING =
  "时间字段统一使用 camelCase，并以 At 结尾，例如 createdAt、updatedAt、dueAt。";

const UTC_ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isUtcIsoDateTime(value: string): value is UtcIsoDateTime {
  if (!UTC_ISO_DATE_TIME_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(value);

  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export function parseUtcIsoDateTime(value: string): Result<Date, string> {
  if (!isUtcIsoDateTime(value)) {
    return err("请输入有效的 UTC ISO 8601 时间");
  }

  return ok(new Date(value));
}

export function toUtcIsoDateTime(date: Date): UtcIsoDateTime {
  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid Date cannot be converted to UTC ISO 8601");
  }

  return date.toISOString() as UtcIsoDateTime;
}
