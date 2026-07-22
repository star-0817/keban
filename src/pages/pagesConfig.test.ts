import pagesConfig from "../pages.json";

import { describe, expect, it } from "vitest";

describe("pages configuration", () => {
  it("registers the profile support page", () => {
    expect(pagesConfig.pages).toContainEqual(
      expect.objectContaining({
        path: "pages/profile/index",
        style: expect.objectContaining({
          navigationBarTitleText: "我的",
          navigationStyle: "custom",
        }),
      }),
    );
  });
});
