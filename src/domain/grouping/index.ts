import type { EntityId, Result } from "../index";
import { err, ok } from "../index";

export type GroupingMember = Readonly<{
  id: EntityId;
  name: string;
}>;

export type DrawRandomMembersInput<TMember extends GroupingMember> = Readonly<{
  members: readonly TMember[];
  count: number;
  excludedMemberIds?: readonly EntityId[];
  seed: string;
}>;

export type DrawRandomMembersResult<TMember extends GroupingMember> = Readonly<{
  mode: "draw";
  seed: string;
  selectedMembers: readonly TMember[];
  excludedMemberIds: readonly EntityId[];
}>;

export type GroupByCountMode = Readonly<{
  type: "group-count";
  groupCount: number;
}>;

export type GroupByMaxMembersMode = Readonly<{
  type: "max-members-per-group";
  maxMembersPerGroup: number;
}>;

export type GroupingMode = GroupByCountMode | GroupByMaxMembersMode;

type LooseGroupingMode = GroupingMode | Readonly<Record<string, unknown>>;

export type GroupRandomMembersInput<TMember extends GroupingMember> = Readonly<{
  members: readonly TMember[];
  excludedMemberIds?: readonly EntityId[];
  mode: LooseGroupingMode;
  seed: string;
}>;

export type RandomMemberGroup<TMember extends GroupingMember> = Readonly<{
  groupNumber: number;
  members: readonly TMember[];
}>;

export type GroupRandomMembersResult<TMember extends GroupingMember> =
  Readonly<{
    mode: "group";
    seed: string;
    groups: readonly RandomMemberGroup<TMember>[];
    excludedMemberIds: readonly EntityId[];
  }>;

export type RandomRosterError = string;

export type DrawHistoryRecord<TMember extends GroupingMember> = Readonly<{
  id: EntityId;
  mode: "draw";
  seed: string;
  selectedMembers: readonly TMember[];
  excludedMemberIds: readonly EntityId[];
  createdAt: string;
}>;

export type GroupingHistoryRecord<TMember extends GroupingMember> = Readonly<{
  id: EntityId;
  mode: "group";
  seed: string;
  groups: readonly RandomMemberGroup<TMember>[];
  excludedMemberIds: readonly EntityId[];
  createdAt: string;
}>;

export function drawRandomMembers<TMember extends GroupingMember>(
  input: DrawRandomMembersInput<TMember>,
): Result<DrawRandomMembersResult<TMember>, RandomRosterError> {
  if (input.members.length === 0) {
    return err("成员名单不能为空");
  }

  if (!Number.isInteger(input.count) || input.count <= 0) {
    return err("抽取人数必须大于 0");
  }

  const available = getAvailableMembers(
    input.members,
    input.excludedMemberIds ?? [],
  );

  if (available.length === 0) {
    return err("排除后没有可用成员");
  }

  if (input.count > available.length) {
    return err("抽取人数不能超过可抽取成员人数");
  }

  return ok({
    mode: "draw",
    seed: input.seed,
    selectedMembers: shuffle(available, input.seed).slice(0, input.count),
    excludedMemberIds: [...(input.excludedMemberIds ?? [])],
  });
}

export function groupRandomMembers<TMember extends GroupingMember>(
  input: GroupRandomMembersInput<TMember>,
): Result<GroupRandomMembersResult<TMember>, RandomRosterError> {
  if (input.members.length === 0) {
    return err("成员名单不能为空");
  }

  const mode = normalizeGroupingMode(input.mode);

  if (!mode.ok) {
    return mode;
  }

  const available = getAvailableMembers(
    input.members,
    input.excludedMemberIds ?? [],
  );

  if (available.length === 0) {
    return err("排除后没有可用成员");
  }

  const groupCountResult = resolveGroupCount(mode.value, available.length);

  if (!groupCountResult.ok) {
    return groupCountResult;
  }

  const shuffled = shuffle(available, input.seed);
  const groups = buildBalancedGroups(shuffled, groupCountResult.value);

  return ok({
    mode: "group",
    seed: input.seed,
    groups,
    excludedMemberIds: [...(input.excludedMemberIds ?? [])],
  });
}

function getAvailableMembers<TMember extends GroupingMember>(
  members: readonly TMember[],
  excludedMemberIds: readonly EntityId[],
): readonly TMember[] {
  const excluded = new Set<EntityId>(excludedMemberIds);
  const seen = new Set<EntityId>();

  return members.filter((member) => {
    if (excluded.has(member.id) || seen.has(member.id)) {
      return false;
    }

    seen.add(member.id);

    return true;
  });
}

function normalizeGroupingMode(
  mode: LooseGroupingMode,
): Result<GroupingMode, RandomRosterError> {
  const groupCount = "groupCount" in mode ? mode.groupCount : undefined;
  const maxMembersPerGroup =
    "maxMembersPerGroup" in mode ? mode.maxMembersPerGroup : undefined;
  const hasGroupCount = typeof groupCount === "number";
  const hasMaxMembersPerGroup = typeof maxMembersPerGroup === "number";

  if (hasGroupCount && hasMaxMembersPerGroup) {
    return err("分组方式必须且只能选择一种");
  }

  const looseGroupCount =
    !("type" in mode) && "groupCount" in mode ? mode.groupCount : undefined;
  const looseMaxMembersPerGroup =
    !("type" in mode) && "maxMembersPerGroup" in mode
      ? mode.maxMembersPerGroup
      : undefined;
  const hasTypedGroupCount =
    "type" in mode &&
    mode.type === "group-count" &&
    "groupCount" in mode &&
    typeof mode.groupCount === "number";
  const hasTypedMaxMembers =
    "type" in mode &&
    mode.type === "max-members-per-group" &&
    "maxMembersPerGroup" in mode &&
    typeof mode.maxMembersPerGroup === "number";
  const hasLooseGroupCount = typeof looseGroupCount === "number";
  const hasLooseMaxMembers = typeof looseMaxMembersPerGroup === "number";

  if (hasTypedGroupCount && !hasTypedMaxMembers) {
    return ok({ type: "group-count", groupCount: mode.groupCount });
  }

  if (hasTypedMaxMembers && !hasTypedGroupCount) {
    return ok({
      type: "max-members-per-group",
      maxMembersPerGroup: mode.maxMembersPerGroup,
    });
  }

  if (hasLooseGroupCount !== hasLooseMaxMembers) {
    if (typeof looseGroupCount === "number") {
      return ok({
        type: "group-count",
        groupCount: looseGroupCount,
      });
    }

    if (typeof looseMaxMembersPerGroup !== "number") {
      return err("分组方式必须且只能选择一种");
    }

    return ok({
      type: "max-members-per-group",
      maxMembersPerGroup: looseMaxMembersPerGroup,
    });
  }

  return err("分组方式必须且只能选择一种");
}

function resolveGroupCount(
  mode: GroupingMode,
  availableCount: number,
): Result<number, RandomRosterError> {
  if (mode.type === "group-count") {
    if (!Number.isInteger(mode.groupCount) || mode.groupCount <= 0) {
      return err("组数必须大于 0");
    }

    if (mode.groupCount > availableCount) {
      return err("组数不能超过可分组成员人数");
    }

    return ok(mode.groupCount);
  }

  if (
    !Number.isInteger(mode.maxMembersPerGroup) ||
    mode.maxMembersPerGroup <= 0
  ) {
    return err("每组最大人数必须大于 0");
  }

  return ok(Math.ceil(availableCount / mode.maxMembersPerGroup));
}

function buildBalancedGroups<TMember extends GroupingMember>(
  shuffled: readonly TMember[],
  groupCount: number,
): readonly RandomMemberGroup<TMember>[] {
  const baseSize = Math.floor(shuffled.length / groupCount);
  const remainder = shuffled.length % groupCount;

  return Array.from({ length: groupCount }, (_, index) => {
    const size = baseSize + (index < remainder ? 1 : 0);
    const start = index * baseSize + Math.min(index, remainder);

    return {
      groupNumber: index + 1,
      members: shuffled.slice(start, start + size),
    };
  });
}

function shuffle<T>(items: readonly T[], seed: string): readonly T[] {
  const random = createSeededRandom(seed);
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index];

    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }

  return result;
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  return Array.from(seed).reduce((hash, char) => {
    const nextHash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);

    return nextHash >>> 0;
  }, 2166136261);
}
