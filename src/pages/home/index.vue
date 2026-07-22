<script setup lang="ts">
import { storeToRefs } from "pinia";

import AppShell from "@/components/layout/AppShell.vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const { appName, tagline } = storeToRefs(appStore);

const mainTools = [
  {
    title: "班级工具",
    body: "名单导入、随机抽人、随机分组",
    url: "/pages/class/index",
    status: "已可用",
  },
  {
    title: "学习工具",
    body: "课程、日程、绩点和考勤计算",
    url: "/pages/study/index",
    status: "已可用",
  },
  {
    title: "文档工具",
    body: "作业封面、图片转 PDF 等能力开发中",
    url: "",
    status: "开发中",
  },
] as const;

function openTool(url: string): void {
  if (url.length === 0) {
    uni.showToast({ title: "文档工具开发中", icon: "none" });
    return;
  }

  uni.reLaunch({ url });
}
</script>

<template>
  <AppShell active-tab="home">
    <view class="home-page">
      <view class="hero-section">
        <view class="hero-copy">
          <text class="eyebrow">Android 优先 · 离线优先</text>
          <text class="app-name">{{ appName }}</text>
          <text class="tagline">{{ tagline }}</text>
          <text class="description">
            面向在校学生与班委的校园工具 App，常用任务尽量在本机离线完成。
          </text>
        </view>
        <image
          class="hero-image"
          src="/static/images/ui/home-campus-companion.webp"
          mode="aspectFill"
        />
      </view>

      <view class="offline-card">
        <image
          class="offline-card__image"
          src="/static/images/ui/local-data-safe.webp"
          mode="aspectFill"
        />
        <view class="offline-card__copy">
          <text class="offline-card__label">本地保存</text>
          <text class="offline-card__title">数据默认只保存在你的手机上</text>
          <text class="offline-card__body">
            课伴不强制登录，也不依赖自建服务器。真实 SQLite
            不可用时，会明确提示临时内存模式。
          </text>
        </view>
      </view>

      <view class="tools-section">
        <text class="section-title">主入口</text>
        <view class="tool-list">
          <button
            v-for="tool in mainTools"
            :key="tool.title"
            class="tool-item"
            type="button"
            @tap="openTool(tool.url)"
          >
            <view class="tool-item__icon"></view>
            <view class="tool-item__copy">
              <text class="tool-item__title">{{ tool.title }}</text>
              <text class="tool-item__text">{{ tool.body }}</text>
            </view>
            <text
              class="tool-item__status"
              :class="{ 'tool-item__status--muted': !tool.url }"
              >{{ tool.status }}</text
            >
          </button>
        </view>
      </view>

      <view class="documents-card">
        <view class="documents-card__copy">
          <text class="section-title">文档工具</text>
          <text class="documents-card__body">
            文档处理仍在开发中，后续会围绕本地处理作业封面和 PDF 工作流。
          </text>
        </view>
        <image
          class="documents-card__image"
          src="/static/images/ui/feature-documents.webp"
          mode="aspectFill"
        />
      </view>
    </view>
  </AppShell>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-md);
  width: 100%;
  overflow-x: hidden;
}

.hero-section {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-md);
  padding: var(--kb-space-lg);
  background: var(--kb-color-surface);
  border: 1rpx solid var(--kb-color-border-subtle);
  border-radius: var(--kb-radius-card);
  box-shadow: var(--kb-shadow-card);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-sm);
}

.eyebrow {
  align-self: flex-start;
  padding: var(--kb-space-xxs) var(--kb-space-sm);
  color: var(--kb-color-accent);
  font-size: var(--kb-font-caption);
  font-weight: 700;
  line-height: 1.2;
  background: var(--kb-color-accent-soft);
  border-radius: var(--kb-radius-pill);
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

.hero-image {
  width: 100%;
  height: 300rpx;
  background: var(--kb-color-brand-soft);
  border-radius: var(--kb-radius-md);
}

.offline-card,
.tools-section,
.documents-card {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-sm);
  padding: var(--kb-space-md);
  background: var(--kb-color-surface);
  border: 1rpx solid var(--kb-color-border-subtle);
  border-radius: var(--kb-radius-card);
  box-shadow: var(--kb-shadow-card);
}

.offline-card {
  flex-direction: row;
  align-items: center;
}

.offline-card__image {
  flex: 0 0 auto;
  width: 160rpx;
  height: 160rpx;
  background: var(--kb-color-brand-soft);
  border-radius: var(--kb-radius-md);
}

.offline-card__copy,
.documents-card__copy,
.tool-item__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--kb-space-xxs);
  min-width: 0;
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
  gap: var(--kb-space-sm);
  min-width: 0;
  min-height: var(--kb-touch-target);
  margin: 0;
  padding: var(--kb-space-sm);
  text-align: left;
  background: var(--kb-color-surface-raised);
  border: 1rpx solid var(--kb-color-border-subtle);
  border-radius: var(--kb-radius-md);
}

.tool-item::after {
  border: 0;
}

.tool-item__icon {
  flex: 0 0 auto;
  width: 44rpx;
  height: 44rpx;
  background: var(--kb-color-brand);
  border-radius: var(--kb-radius-sm);
}

.tool-item__title {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body);
  font-weight: 700;
  line-height: 1.35;
}

.tool-item__text {
  min-width: 0;
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-caption);
  line-height: 1.4;
}

.tool-item__status {
  flex: 0 0 auto;
  color: var(--kb-color-brand);
  font-size: var(--kb-font-caption);
  font-weight: 700;
}

.tool-item__status--muted {
  color: var(--kb-color-text-muted);
}

.documents-card__body {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.5;
}

.documents-card__image {
  width: 100%;
  height: 220rpx;
  background: var(--kb-color-brand-soft);
  border-radius: var(--kb-radius-md);
}
</style>
