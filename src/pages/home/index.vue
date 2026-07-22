<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const { appName, tagline } = storeToRefs(appStore);
</script>

<template>
  <view class="home-page">
    <view class="brand-panel">
      <text class="app-name">{{ appName }}</text>
      <text class="tagline">{{ tagline }}</text>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 96rpx 40rpx 40rpx;
  background: #f5f7fb;
}

.brand-panel {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.app-name {
  color: #172033;
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1.2;
}

.tagline {
  color: #546179;
  font-size: 34rpx;
  line-height: 1.45;
}
</style>
