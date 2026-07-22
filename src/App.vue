<script setup lang="ts"></script>

<template>
  <slot />
</template>

<style>
@import "@/styles/tokens.css";

page {
  min-height: 100%;
  background: var(--kb-color-background);
  color: var(--kb-color-text-primary);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;
}

view,
text {
  box-sizing: border-box;
}

button,
input,
textarea {
  font-family: inherit;
}
</style>
