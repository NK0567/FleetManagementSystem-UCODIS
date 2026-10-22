<script lang="ts" setup>
import { Lock } from '@lucide/vue'

defineProps<{
  disabled?: boolean
}>()
</script>

<template>
  <div class="relative inline-block w-full">
    <slot />
    <span
      v-if="disabled"
      class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-muted-foreground"
      aria-hidden="true"
    >
      <Lock class="w-4 h-4 shrink-0" />
    </span>
  </div>
</template>
