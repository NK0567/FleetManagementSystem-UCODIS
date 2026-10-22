<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface AlertProps {
  variant?: 'default' | 'destructive'
  class?: string
}

const props = withDefaults(defineProps<AlertProps>(), {
  variant: 'default'
})

const variantStyles = {
  default: 'bg-background text-foreground',
  destructive:
    'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'
}

const alertClass = computed(() =>
  cn(
    'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
    variantStyles[props.variant],
    props.class
  )
)
</script>

<template>
  <div :class="alertClass" role="alert">
    <slot />
  </div>
</template>
