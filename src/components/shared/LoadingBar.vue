<script lang="ts" setup>
withDefaults(
  defineProps<{
    height?: number
    barColor?: string
    trackColor?: string
    width?: string
    borderRadius?: number
  }>(),
  {
    height: 4,
    barColor: 'var(--color-primary)',
    trackColor: 'rgba(0,0,0,0.2)',
    width: '100%',
    borderRadius: 30
  }
)
</script>

<template>
  <div
    class="loading-bar"
    :style="{
      '--loading-bar-height': `${height}px`,
      '--loading-bar-color': barColor,
      '--loading-bar-track': trackColor,
      '--loading-bar-radius': `${borderRadius}px`,
      height: `${height}px`,
      width: width,
      borderRadius: `${borderRadius}px`
    }"
  />
</template>

<style scoped>
.loading-bar {
  display: block;
  height: var(--loading-bar-height);
  width: 100%;
  border-radius: var(--loading-bar-radius);
  background-color: var(--loading-bar-track);
  position: relative;
  overflow: hidden;
}

.loading-bar::before {
  content: '';
  position: absolute;
  background: var(--loading-bar-color);
  top: 0;
  left: 0;
  width: 0%;
  height: 100%;
  border-radius: var(--loading-bar-radius);
  animation: loading-bar-moving 1s ease-in-out infinite;
}

@keyframes loading-bar-moving {
  50% {
    width: 100%;
  }
  100% {
    width: 0;
    right: 0;
    left: unset;
  }
}
</style>
