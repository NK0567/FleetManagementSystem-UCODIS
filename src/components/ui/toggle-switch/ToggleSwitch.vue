<script lang="ts" setup>
import { computed, useId } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    label?: string
    disabled?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: false,
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)

const rootClass = computed(() =>
  cn(
    'flex flex-col gap-1',
    props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    props.class
  )
)

function onChange(event: Event) {
  if (props.disabled) return
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label :class="rootClass">
    <span v-if="label || $slots.default" class="block text-xs text-muted-foreground">
      <slot>{{ label }}</slot>
    </span>
    <span class="relative inline-flex h-6 w-11 shrink-0 items-center">
      <input
        :id="inputId"
        type="checkbox"
        class="peer sr-only"
        role="switch"
        :checked="modelValue"
        :disabled="disabled"
        :aria-checked="modelValue"
        @change="onChange"
      />
      <span
        class="absolute inset-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
      />
      <span
        class="pointer-events-none relative ml-0.5 inline-block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform peer-checked:translate-x-5"
      />
    </span>
  </label>
</template>
