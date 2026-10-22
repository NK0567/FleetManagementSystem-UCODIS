<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface CardHeaderProps {
  class?: string
}

const props = defineProps<CardHeaderProps>()

const headerClass = computed(() => cn('flex flex-col space-y-1.5 p-6', props.class))
</script>

<template>
  <div :class="headerClass">
    <slot />
  </div>
</template>
