import type { EntityId } from "./ids";
import type { TimestampFields } from "./time";

export type EntityMeta = TimestampFields;

export type EntityBase = Readonly<
  {
    id: EntityId;
  } & EntityMeta
>;

export type SortDirection = "asc" | "desc";

export type SortOrder<Field extends string> = Readonly<{
  field: Field;
  direction: SortDirection;
}>;

export type PageRequest = Readonly<{
  page: number;
  pageSize: number;
}>;
