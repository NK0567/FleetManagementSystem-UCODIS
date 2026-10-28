<script lang="ts" setup>
defineProps<{
  recordNo: string | null | undefined
}>()
</script>

<template>
  <div v-if="recordNo" class="flex flex-col h-full min-h-0">
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col">
      <slot name="details" />
    </div>
    <div
      v-if="$slots.footer"
      class="border-t border-border px-4 py-1.5 bg-background flex gap-2 shrink-0"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
