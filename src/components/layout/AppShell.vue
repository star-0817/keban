<script setup lang="ts">
import AppBottomNavigation from "@/components/navigation/AppBottomNavigation.vue";
import type { AppNavigationKey } from "@/components/navigation/appNavigation";

defineProps<{
  activeTab: AppNavigationKey;
}>();
</script>

<template>
  <view class="app-shell">
    <scroll-view class="app-shell__content" scroll-y>
      <view class="app-shell__inner">
        <slot />
      </view>
    </scroll-view>

    <AppBottomNavigation :active-key="activeTab" />
  </view>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  background: var(--kb-color-background);
}

.app-shell__content {
  height: 100vh;
  box-sizing: border-box;
}

.app-shell__inner {
  box-sizing: border-box;
  min-height: 100%;
  padding: var(--kb-space-xl) var(--kb-space-page-x)
    calc(
      var(--kb-bottom-nav-height) + var(--kb-space-xl) +
        env(safe-area-inset-bottom)
    );
}
</style>
