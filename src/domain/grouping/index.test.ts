import { describe, expect, it } from "vitest";

import type { EntityId } from "../ids";

import {
  drawRandomMembers,
  groupRandomMembers,
  type GroupingMember,
} from "./index";

const members = [
  member("student-1", "Student 1"),
  member("student-2", "Student 2"),
  member("student-3", "Student 3"),
  member("student-4", "Student 4"),
  member("student-5", "Student 5"),
  member("student-6", "Student 6"),
  member("student-7", "Student 7"),
];

describe("drawRandomMembers", () => {
  it("returns the same non-repeating draw for the same seed and excludes members", () => {
    const first = drawRandomMembers({
      members,
      count: 3,
      excludedMemberIds: [id("student-2"), id("student-5")],
      seed: "lesson-1",
    });
    const second = drawRandomMembers({
      members,
      count: 3,
      excludedMemberIds: [id("student-2"), id("student-5")],
      seed: "lesson-1",
    });

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);

    if (!first.ok) {
      return;
    }

    const selectedIds = first.value.selectedMembers.map((item) => item.id);

    expect(selectedIds).toHaveLength(3);
    expect(new Set(selectedIds).size).toBe(3);
    expect(selectedIds).not.toContain(id("student-2"));
    expect(selectedIds).not.toContain(id("student-5"));
    expect(first.value.seed).toBe("lesson-1");
  });

  it("supports drawing a single member", () => {
    const result = drawRandomMembers({
      members: [member("student-1", "Student 1")],
      count: 1,
      seed: "single",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        mode: "draw",
        seed: "single",
        selectedMembers: [member("student-1", "Student 1")],
        excludedMemberIds: [],
      },
    });
  });

  it("returns Chinese errors for empty members and invalid counts", () => {
    expect(drawRandomMembers({ members: [], count: 1, seed: "x" })).toEqual({
      ok: false,
      error: "成员名单不能为空",
    });

    expect(drawRandomMembers({ members, count: 0, seed: "x" })).toEqual({
      ok: false,
      error: "抽取人数必须大于 0",
    });

    expect(drawRandomMembers({ members, count: 8, seed: "x" })).toEqual({
      ok: false,
      error: "抽取人数不能超过可抽取成员人数",
    });
  });

  it("returns an error when exclusions remove every member", () => {
    const result = drawRandomMembers({
      members: [member("student-1", "Student 1")],
      count: 1,
      excludedMemberIds: [id("student-1")],
      seed: "x",
    });

    expect(result).toEqual({ ok: false, error: "排除后没有可用成员" });
  });

  it("does not draw duplicate member ids even when input contains duplicates", () => {
    const result = drawRandomMembers({
      members: [
        member("student-1", "Student 1"),
        member("student-1", "Student 1 duplicate"),
      ],
      count: 2,
      seed: "duplicates",
    });

    expect(result).toEqual({
      ok: false,
      error: "抽取人数不能超过可抽取成员人数",
    });
  });
});

describe("groupRandomMembers", () => {
  it("groups by group count deterministically with balanced sizes", () => {
    const first = groupRandomMembers({
      members,
      mode: { type: "group-count", groupCount: 3 },
      seed: "groups",
    });
    const second = groupRandomMembers({
      members,
      mode: { type: "group-count", groupCount: 3 },
      seed: "groups",
    });

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);

    if (!first.ok) {
      return;
    }

    const flattened = first.value.groups.flatMap((group) =>
      group.members.map((item) => item.id),
    );
    const sizes = first.value.groups.map((group) => group.members.length);

    expect(first.value.groups).toHaveLength(3);
    expect(flattened).toHaveLength(members.length);
    expect(new Set(flattened).size).toBe(members.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(sizes).toEqual([3, 2, 2]);
  });

  it("groups by max members per group and excludes members", () => {
    const result = groupRandomMembers({
      members,
      excludedMemberIds: [id("student-7")],
      mode: { type: "max-members-per-group", maxMembersPerGroup: 2 },
      seed: "max-size",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const flattened = result.value.groups.flatMap((group) =>
      group.members.map((item) => item.id),
    );
    const sizes = result.value.groups.map((group) => group.members.length);

    expect(result.value.groups).toHaveLength(3);
    expect(flattened).toHaveLength(6);
    expect(new Set(flattened).size).toBe(6);
    expect(flattened).not.toContain(id("student-7"));
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(2);
  });

  it("returns Chinese errors for invalid grouping inputs", () => {
    expect(
      groupRandomMembers({
        members: [],
        mode: { type: "group-count", groupCount: 2 },
        seed: "x",
      }),
    ).toEqual({ ok: false, error: "成员名单不能为空" });

    expect(
      groupRandomMembers({
        members,
        mode: { type: "group-count", groupCount: 0 },
        seed: "x",
      }),
    ).toEqual({ ok: false, error: "组数必须大于 0" });

    expect(
      groupRandomMembers({
        members,
        mode: { type: "group-count", groupCount: 8 },
        seed: "x",
      }),
    ).toEqual({ ok: false, error: "组数不能超过可分组成员人数" });

    expect(
      groupRandomMembers({
        members,
        mode: { type: "max-members-per-group", maxMembersPerGroup: 0 },
        seed: "x",
      }),
    ).toEqual({ ok: false, error: "每组最大人数必须大于 0" });
  });

  it("returns an error when group mode is not exactly one supported mode", () => {
    expect(
      groupRandomMembers({
        members,
        mode: { groupCount: 2, maxMembersPerGroup: 4 },
        seed: "x",
      }),
    ).toEqual({ ok: false, error: "分组方式必须且只能选择一种" });
  });

  it("returns an error when typed group mode also includes the other mode parameter", () => {
    expect(
      groupRandomMembers({
        members,
        mode: {
          type: "group-count",
          groupCount: 2,
          maxMembersPerGroup: 4,
        },
        seed: "x",
      }),
    ).toEqual({ ok: false, error: "分组方式必须且只能选择一种" });
  });

  it("returns an error when exclusions remove every member", () => {
    const result = groupRandomMembers({
      members: [member("student-1", "Student 1")],
      excludedMemberIds: [id("student-1")],
      mode: { type: "group-count", groupCount: 1 },
      seed: "x",
    });

    expect(result).toEqual({ ok: false, error: "排除后没有可用成员" });
  });

  it("does not place duplicate member ids into groups", () => {
    const result = groupRandomMembers({
      members: [
        member("student-1", "Student 1"),
        member("student-1", "Student 1 duplicate"),
        member("student-2", "Student 2"),
      ],
      mode: { type: "group-count", groupCount: 2 },
      seed: "dedupe",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const groupedIds = result.value.groups.flatMap((group) =>
      group.members.map((item) => item.id),
    );

    expect(groupedIds).toHaveLength(2);
    expect(new Set(groupedIds).size).toBe(2);
  });
});

function member(memberId: string, name: string): GroupingMember {
  return { id: id(memberId), name };
}

function id(value: string): EntityId {
  return value as EntityId;
}
