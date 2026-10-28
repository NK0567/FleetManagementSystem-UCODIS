<script lang="ts" setup>
import { CircleAlert, Check, X } from '@lucide/vue'

const props = defineProps<{
  error?: string | null
  success?: string | null
  class?: string
}>()

const emit = defineEmits<{
  'clear:error': []
  'clear:success': []
}>()
</script>

<template>
  <div :class="['space-y-2', props.class]">
    <div
      v-if="error"
      class="px-4 py-2 bg-destructive border border-destructive/30 rounded text-sm text-white flex items-center gap-2 justify-between"
    >
      <div class="flex items-center gap-2">
        <CircleAlert class="w-4 h-4 shrink-0" />
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        class="ml-2 text-white hover:text-white/70 focus:outline-none cursor-pointer"
        @click="emit('clear:error')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div
      v-if="success"
      class="px-4 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2 justify-between"
    >
      <div class="flex items-center gap-2">
        <Check class="w-4 h-4 shrink-0" />
        <span>{{ success }}</span>
      </div>
      <button
        type="button"
        class="ml-2 text-green-600/70 hover:text-green-700 focus:outline-none"
        @click="emit('clear:success')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
