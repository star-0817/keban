import { describe, expect, it } from "vitest";

import { designTokens } from "./designTokens";

describe("design tokens", () => {
  it("exposes reusable foundations for the app shell", () => {
    expect(designTokens.color).toMatchObject({
      background: "#F6F8FC",
      surface: "#FFFFFF",
      textPrimary: "#172033",
      brand: "#2F6FED",
    });
    expect(designTokens.spacing).toHaveProperty("pageX");
    expect(designTokens.radius).toHaveProperty("card");
    expect(designTokens.shadow).toHaveProperty("nav");
    expect(designTokens.fontSize).toHaveProperty("title");
  });
});
