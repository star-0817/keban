import { setActivePinia, createPinia } from "pinia";
import { describe, expect, it, beforeEach } from "vitest";

import { useAppStore } from "./app";

describe("useAppStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("exposes the product identity for the foundation home page", () => {
    const store = useAppStore();

    expect(store.appName).toBe("课伴");
    expect(store.tagline).toBe("离线校园工具箱");
  });
});
