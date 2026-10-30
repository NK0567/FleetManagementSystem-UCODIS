<script lang="ts" setup>
import type { Component } from 'vue'

/**
 * The main action of a fleet card, the gesture the user makes next. When it cannot run, the
 * button stays visible, disabled, and says why on hover.
 */
withDefaults(
  defineProps<{
    label: string
    icon?: Component
    disabled?: boolean
    /** Why the action cannot run, shown on hover. */
    disabledReason?: string
  }>(),
  { icon: undefined, disabled: false, disabledReason: undefined }
)

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
    :disabled="disabled || !!disabledReason"
    :title="disabledReason || undefined"
    data-testid="primary-action"
    @click="emit('click')"
  >
    <component :is="icon" v-if="icon" class="w-4 h-4" aria-hidden="true" />
    {{ label }}
    <slot />
  </button>
</template>
