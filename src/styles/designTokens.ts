export const designTokens = {
  color: {
    background: "#F6F8FC",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF3FA",
    brand: "#2F6FED",
    brandSoft: "#EAF1FF",
    textPrimary: "#172033",
    textSecondary: "#5F6B7A",
    textMuted: "#8A95A6",
    border: "#DDE5F0",
    success: "#1F9D68",
    warning: "#B7791F",
  },
  spacing: {
    xxs: "8rpx",
    xs: "12rpx",
    sm: "16rpx",
    md: "24rpx",
    lg: "32rpx",
    xl: "40rpx",
    xxl: "56rpx",
    pageX: "32rpx",
    pageTop: "56rpx",
    bottomNavHeight: "116rpx",
  },
  radius: {
    sm: "12rpx",
    md: "20rpx",
    card: "28rpx",
    pill: "999rpx",
  },
  shadow: {
    card: "0 12rpx 32rpx rgba(23, 32, 51, 0.08)",
    nav: "0 -8rpx 28rpx rgba(23, 32, 51, 0.08)",
  },
  fontSize: {
    caption: "22rpx",
    body: "28rpx",
    bodyLarge: "32rpx",
    title: "44rpx",
    hero: "64rpx",
  },
} as const;

export type DesignTokens = typeof designTokens;
