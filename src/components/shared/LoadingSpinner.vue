<script lang="ts" setup>
import { LoaderCircle } from '@lucide/vue'

withDefaults(
  defineProps<{
    text?: string
    size?: number
  }>(),
  { size: 20 }
)
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <LoaderCircle class="animate-spin text-primary" :size="size" />
    <span v-if="text" class="text-muted-foreground">{{ text }}</span>
  </div>
</template>
