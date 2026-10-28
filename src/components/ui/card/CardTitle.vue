<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface CardTitleProps {
  class?: string
}

const props = defineProps<CardTitleProps>()

const titleClass = computed(() =>
  cn('text-2xl font-semibold leading-none tracking-tight', props.class)
)
</script>

<template>
  <h3 :class="titleClass">
    <slot />
  </h3>
</template>
