import { describe, expect, it } from "vitest";

import { designTokens } from "./designTokens";

describe("design tokens", () => {
  it("exposes reusable foundations for the app shell", () => {
    expect(designTokens.color).toMatchObject({
      background: "#F0FDFA",
      surface: "#FFFFFF",
      textPrimary: "#134E4A",
      brand: "#0D9488",
      brandSecondary: "#14B8A6",
      accent: "#EA580C",
    });
    expect(designTokens.spacing).toHaveProperty("pageX");
    expect(designTokens.radius).toHaveProperty("card");
    expect(designTokens.shadow).toHaveProperty("nav");
    expect(designTokens.fontSize).toHaveProperty("title");
  });

  it("keeps interactive sizing mobile friendly", () => {
    expect(designTokens.component.touchTarget).toBe("96rpx");
    expect(designTokens.component.inputHeight).toBe("96rpx");
    expect(designTokens.component.bottomNavHeight).toBe("128rpx");
  });
});
