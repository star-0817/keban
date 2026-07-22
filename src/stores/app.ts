import { defineStore } from "pinia";

export interface AppIdentityState {
  readonly appName: string;
  readonly tagline: string;
}

export const useAppStore = defineStore("app", {
  state: (): AppIdentityState => ({
    appName: "课伴",
    tagline: "离线校园工具箱",
  }),
});
