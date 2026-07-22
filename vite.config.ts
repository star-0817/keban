import { defineConfig } from "vitest/config";

export default defineConfig(async ({ mode }) => {
  const isTest = mode === "test";
  const plugins = isTest
    ? []
    : [(await import("@dcloudio/vite-plugin-uni")).default.default()];

  return {
    plugins,
    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    },
  };
});
