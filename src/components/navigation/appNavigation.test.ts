import { describe, expect, it } from "vitest";

import {
  APP_NAVIGATION_ITEMS,
  getNavigationItem,
  getNavigationTapFeedback,
} from "./appNavigation";

describe("app navigation", () => {
  it("defines the five foundation tabs with home selected by default", () => {
    expect(APP_NAVIGATION_ITEMS.map((item) => item.label)).toEqual([
      "首页",
      "班级",
      "学习",
      "文档",
      "我的",
    ]);
    expect(APP_NAVIGATION_ITEMS).toHaveLength(5);
    expect(getNavigationItem("home")).toMatchObject({
      key: "home",
      label: "首页",
      implemented: true,
    });
  });

  it("returns route navigation for implemented tabs", () => {
    expect(getNavigationTapFeedback("class")).toEqual({
      type: "reLaunch",
      url: "/pages/class/index",
    });
  });

  it("keeps unfinished tabs on the development toast", () => {
    expect(getNavigationTapFeedback("study")).toEqual({
      type: "toast",
      message: "功能开发中",
    });
  });
});
