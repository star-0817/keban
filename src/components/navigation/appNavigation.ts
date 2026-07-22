export const APP_NAVIGATION_KEYS = [
  "home",
  "class",
  "study",
  "documents",
  "profile",
] as const;

export type AppNavigationKey = (typeof APP_NAVIGATION_KEYS)[number];

export interface AppNavigationItem {
  readonly key: AppNavigationKey;
  readonly label: string;
  readonly icon: string;
  readonly implemented: boolean;
}

export type NavigationTapFeedback =
  | { readonly type: "noop" }
  | { readonly type: "toast"; readonly message: string };

export const APP_NAVIGATION_ITEMS: readonly AppNavigationItem[] = [
  {
    key: "home",
    label: "首页",
    icon: "H",
    implemented: true,
  },
  {
    key: "class",
    label: "班级",
    icon: "C",
    implemented: false,
  },
  {
    key: "study",
    label: "学习",
    icon: "S",
    implemented: false,
  },
  {
    key: "documents",
    label: "文档",
    icon: "D",
    implemented: false,
  },
  {
    key: "profile",
    label: "我的",
    icon: "M",
    implemented: false,
  },
] as const;

export function getNavigationItem(
  key: AppNavigationKey,
): AppNavigationItem | undefined {
  return APP_NAVIGATION_ITEMS.find((item) => item.key === key);
}

export function getNavigationTapFeedback(
  key: AppNavigationKey,
): NavigationTapFeedback {
  const item = getNavigationItem(key);

  if (item?.implemented === false) {
    return {
      type: "toast",
      message: "功能开发中",
    };
  }

  return {
    type: "noop",
  };
}
