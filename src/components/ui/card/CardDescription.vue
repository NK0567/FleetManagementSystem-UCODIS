<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface CardDescriptionProps {
  class?: string
}

const props = defineProps<CardDescriptionProps>()

const descriptionClass = computed(() => cn('text-sm text-muted-foreground', props.class))
</script>

<template>
  <p :class="descriptionClass">
    <slot />
  </p>
</template>
