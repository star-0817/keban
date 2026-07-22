import type { EntityBase, EntityId, PageRequest } from "../domain";
import type { SqliteDatabase, SqliteTransaction } from "../plugins/sqlite";

export type RepositoryContext = Readonly<{
  database: SqliteDatabase;
}>;

export type RepositoryTransactionContext = Readonly<{
  transaction: SqliteTransaction;
}>;

export interface Repository<TEntity extends EntityBase> {
  findById(id: EntityId): Promise<TEntity | null>;
  list(page?: PageRequest): Promise<readonly TEntity[]>;
}

export interface WritableRepository<
  TEntity extends EntityBase,
  TCreate,
  TUpdate,
> extends Repository<TEntity> {
  create(input: TCreate): Promise<TEntity>;
  update(id: EntityId, input: TUpdate): Promise<TEntity>;
  delete(id: EntityId): Promise<void>;
}
