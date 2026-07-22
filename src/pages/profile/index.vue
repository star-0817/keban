<script setup lang="ts">
import { storeToRefs } from "pinia";

import AppShell from "@/components/layout/AppShell.vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const { appName } = storeToRefs(appStore);

const supportCodes = [
  {
    title: "微信支持",
    image: "/static/images/ui/wx.jpg",
  },
  {
    title: "支付宝支持",
    image: "/static/images/ui/zfb.jpg",
  },
] as const;

function previewCode(image: string): void {
  uni.previewImage({
    urls: [image],
    current: image,
  });
}
</script>

<template>
  <AppShell active-tab="profile">
    <view class="profile-page">
      <view class="hero-card">
        <image
          class="app-icon"
          src="/static/images/ui/app-icon-1024.png"
          mode="aspectFill"
        />
        <view class="hero-copy">
          <text class="eyebrow">关于课伴</text>
          <text class="page-title">感谢支持</text>
          <text class="page-description">
            课伴会一直保持离线优先、无广告、无强制登录。如果它帮到了你，欢迎自愿请作者喝杯咖啡。感谢你的支持。
          </text>
        </view>
      </view>

      <view class="notice-card">
        <text class="notice-title">完全自愿</text>
        <text class="notice-body">
          不支持也能正常使用课伴的全部功能。这里不会调用支付能力，不读取支付信息，也不会接入任何支付
          SDK。
        </text>
      </view>

      <view class="support-grid">
        <button
          v-for="code in supportCodes"
          :key="code.title"
          class="support-card"
          type="button"
          @tap="previewCode(code.image)"
        >
          <image
            class="support-card__image"
            :src="code.image"
            mode="aspectFit"
          />
          <text class="support-card__title">{{ code.title }}</text>
          <text class="support-card__hint">点击查看大图</text>
        </button>
      </view>

      <view class="info-card">
        <text class="info-title">{{ appName }}</text>
        <text class="info-line">版本：0.1.0</text>
        <text class="info-line">数据只保存在本机，不上传、统计或追踪。</text>
        <text class="info-line">
          收款码仅显示用户提供的静态图片，查看大图也只在本机完成。
        </text>
      </view>
    </view>
  </AppShell>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-md);
  width: 100%;
  overflow-x: hidden;
}

.hero-card,
.notice-card,
.support-card,
.info-card {
  background: var(--kb-color-surface);
  border: 1rpx solid var(--kb-color-border-subtle);
  border-radius: var(--kb-radius-card);
  box-shadow: var(--kb-shadow-card);
}

.hero-card {
  display: flex;
  gap: var(--kb-space-md);
  align-items: center;
  padding: var(--kb-space-lg);
}

.app-icon {
  flex: 0 0 auto;
  width: 132rpx;
  height: 132rpx;
  background: var(--kb-color-brand-soft);
  border-radius: var(--kb-radius-card);
}

.hero-copy,
.notice-card,
.info-card {
  display: flex;
  flex-direction: column;
  gap: var(--kb-space-xs);
}

.hero-copy {
  flex: 1;
  min-width: 0;
}

.eyebrow {
  color: var(--kb-color-accent);
  font-size: var(--kb-font-caption);
  font-weight: 700;
  line-height: 1.2;
}

.page-title {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-title);
  font-weight: 700;
  line-height: 1.25;
}

.page-description,
.notice-body,
.info-line,
.support-card__hint {
  color: var(--kb-color-text-secondary);
  font-size: var(--kb-font-body);
  line-height: 1.55;
}

.notice-card,
.info-card {
  padding: var(--kb-space-md);
}

.notice-card {
  background: var(--kb-color-warning-soft);
  box-shadow: none;
}

.notice-title,
.info-title,
.support-card__title {
  color: var(--kb-color-text-primary);
  font-size: var(--kb-font-body-large);
  font-weight: 700;
  line-height: 1.35;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--kb-space-sm);
}

.support-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--kb-space-xs);
  min-width: 0;
  min-height: var(--kb-touch-target);
  margin: 0;
  padding: var(--kb-space-md);
}

.support-card::after {
  border: 0;
}

.support-card__image {
  width: 220rpx;
  height: 220rpx;
  background: var(--kb-color-surface-raised);
  border: 1rpx solid var(--kb-color-border-subtle);
  border-radius: var(--kb-radius-md);
}

.support-card__hint {
  font-size: var(--kb-font-caption);
}
</style>
