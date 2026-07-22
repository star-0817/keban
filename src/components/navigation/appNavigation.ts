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
  readonly url?: string;
}

export type NavigationTapFeedback =
  | { readonly type: "reLaunch"; readonly url: string }
  | { readonly type: "toast"; readonly message: string };

export const APP_NAVIGATION_ITEMS: readonly AppNavigationItem[] = [
  {
    key: "home",
    label: "首页",
    icon: "H",
    implemented: true,
    url: "/pages/home/index",
  },
  {
    key: "class",
    label: "班级",
    icon: "C",
    implemented: true,
    url: "/pages/class/index",
  },
  {
    key: "study",
    label: "学习",
    icon: "S",
    implemented: true,
    url: "/pages/study/index",
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
    implemented: true,
    url: "/pages/profile/index",
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

  if (item?.url !== undefined) {
    return {
      type: "reLaunch",
      url: item.url,
    };
  }

  return {
    type: "toast",
    message: "功能开发中",
  };
}
