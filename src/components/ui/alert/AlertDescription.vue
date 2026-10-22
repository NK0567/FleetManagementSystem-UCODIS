<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface AlertDescriptionProps {
  class?: string
}

const props = defineProps<AlertDescriptionProps>()

const descriptionClass = computed(() => cn('text-sm [&_p]:leading-relaxed', props.class))
</script>

<template>
  <div :class="descriptionClass">
    <slot />
  </div>
</template>
