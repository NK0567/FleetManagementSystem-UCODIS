<script lang="ts" setup>
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

withDefaults(
  defineProps<{
    label: string
    tone?: StatusTone
  }>(),
  { tone: 'neutral' }
)

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info-bg text-info',
  neutral: 'bg-neutral-bg text-neutral',
  primary: 'bg-primary/10 text-primary'
}
</script>

<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
    :class="TONE_CLASSES[tone]"
  >
    {{ label }}
  </span>
</template>
