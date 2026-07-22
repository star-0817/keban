<script setup lang="ts">
import {
  APP_NAVIGATION_ITEMS,
  getNavigationTapFeedback,
  type AppNavigationKey,
} from "./appNavigation";

defineProps<{
  activeKey: AppNavigationKey;
}>();

function handleTap(key: AppNavigationKey): void {
  const feedback = getNavigationTapFeedback(key);

  if (feedback.type === "toast") {
    uni.showToast({
      title: feedback.message,
      icon: "none",
      duration: 1400,
    });
    return;
  }

  if (feedback.type === "reLaunch") {
    uni.reLaunch({
      url: feedback.url,
    });
  }
}
</script>

<template>
  <view class="bottom-navigation">
    <button
      v-for="item in APP_NAVIGATION_ITEMS"
      :key="item.key"
      class="bottom-navigation__item"
      :class="{ 'bottom-navigation__item--active': item.key === activeKey }"
      type="button"
      @tap="handleTap(item.key)"
    >
      <text class="bottom-navigation__icon">{{ item.icon }}</text>
      <text class="bottom-navigation__label">{{ item.label }}</text>
    </button>
  </view>
</template>

<style scoped>
.bottom-navigation {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  box-sizing: border-box;
  height: calc(var(--kb-bottom-nav-height) + env(safe-area-inset-bottom));
  padding: var(--kb-space-xs) var(--kb-space-sm)
    calc(var(--kb-space-xs) + env(safe-area-inset-bottom));
  background: var(--kb-color-surface);
  border-top: 1rpx solid var(--kb-color-border-subtle);
  box-shadow: var(--kb-shadow-nav);
}

.bottom-navigation__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: var(--kb-touch-target);
  margin: 0;
  padding: var(--kb-space-xxs) 0;
  color: var(--kb-color-text-muted);
  font-size: var(--kb-font-caption);
  line-height: 1.2;
  background: transparent;
  border: 0;
  border-radius: var(--kb-radius-md);
}

.bottom-navigation__item::after {
  border: 0;
}

.bottom-navigation__item--active {
  color: var(--kb-color-brand);
  background: var(--kb-color-brand-soft);
  font-weight: 700;
}

.bottom-navigation__icon {
  display: block;
  width: 40rpx;
  height: 38rpx;
  overflow: hidden;
  font-size: var(--kb-font-caption);
  font-weight: 700;
  line-height: 36rpx;
  text-align: center;
}

.bottom-navigation__label {
  display: block;
  margin-top: var(--kb-space-xxs);
  overflow: hidden;
  font-size: var(--kb-font-caption);
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}
</style>
