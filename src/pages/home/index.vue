<script setup lang="ts">
import { storeToRefs } from "pinia";

import AppShell from "@/components/layout/AppShell.vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const { appName, tagline } = storeToRefs(appStore);

const upcomingTools = [
  "班级名单与随机抽取",
  "课程表、作业和倒计时",
  "作业封面与图片转 PDF",
] as const;
</script>

<template>
  <AppShell active-tab="home">
    <view class="home-page">
      <view class="hero-section">
        <text class="app-name">{{ appName }}</text>
        <text class="tagline">{{ tagline }}</text>
        <text class="description">
          面向在校学生与班委的 Android 优先校园工具
          App，常用任务尽量在本机离线完成。
        </text>
      </view>

      <view class="offline-card">
        <text class="offline-card__label">离线优先</text>
        <text class="offline-card__title">数据默认只保存在你的手机上</text>
        <text class="offline-card__body">
          课伴不强制登录，也不依赖自建服务器。后续班级、学习和文档工具会继续围绕本地处理设计。
        </text>
      </view>

      <view class="tools-section">
        <text class="section-title">即将推出的工具</text>
        <view class="tool-list">
          <view v-for="tool in upcomingTools" :key="tool" class="tool-item">
            <text class="tool-item__dot"></text>
            <text class="tool-item__text">{{ tool }}</text>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-lg);
  width: 100%;
  overflow-x: hidden;
}

.hero-section {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-md);
}

.app-name {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-hero);
  font-weight: 700;
  line-height: 1.2;
}

.tagline {
  color: var(--kb-color-brand);
  font-size: var(--kb-font-title);
  font-weight: 700;
  line-height: 1.3;
}

.description {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body-large);
  line-height: 1.45;
}

.offline-card,
.tools-section {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-sm);
  padding: var(--kb-space-lg);
  background: var(--kb-color-surface);
  border: 1rpx solid var(--kb-color-border);
  border-radius: var(--kb-radius-card);
  box-shadow: var(--kb-shadow-card);
}

.offline-card__label {
  align-self: flex-start;
  padding: var(--kb-space-xxs) var(--kb-space-sm);
  color: var(--kb-color-success);
  font-size: var(--kb-font-caption);
  font-weight: 700;
  line-height: 1.2;
  background: var(--kb-color-surface-muted);
  border-radius: var(--kb-radius-pill);
}

.offline-card__title,
.section-title {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body-large);
  font-weight: 700;
  line-height: 1.35;
}

.offline-card__body {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.55;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-xs);
}

.tool-item {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: var(--kb-space-sm);
  background: var(--kb-color-surface-muted);
  border-radius: var(--kb-radius-md);
}

.tool-item__dot {
  flex: 0 0 auto;
  width: var(--kb-space-xs);
  height: var(--kb-space-xs);
  margin-right: var(--kb-space-sm);
  background: var(--kb-color-brand);
  border-radius: var(--kb-radius-pill);
}

.tool-item__text {
  min-width: 0;
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body);
  line-height: 1.4;
}
</style>
