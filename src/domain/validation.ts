import { err, ok, type Result } from "./result";

export function validateNonEmptyText(value: string): Result<string, string> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return err("内容不能为空");
  }

  return ok(normalized);
}

export function validateMaxLengthText(
  value: string,
  maxLength: number,
): Result<string, string> {
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    return err("最大长度配置无效");
  }

  if (value.length > maxLength) {
    return err(`内容不能超过 ${maxLength} 个字符`);
  }

  return ok(value);
}

export function validatePositiveInteger(value: number): Result<number, string> {
  if (!Number.isInteger(value) || value <= 0) {
    return err("请输入大于 0 的整数");
  }

  return ok(value);
}

export function validateNonNegativeInteger(
  value: number,
): Result<number, string> {
  if (!Number.isInteger(value) || value < 0) {
    return err("请输入不小于 0 的整数");
  }

  return ok(value);
}
