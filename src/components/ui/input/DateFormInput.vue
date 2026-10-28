<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { sanitizeDateInputValue } from '@/utils/calendarDate'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    min?: string
    max?: string
    disabled?: boolean
    invalid?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: '',
    disabled: false,
    invalid: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputClass = computed(() =>
  cn(
    'w-full px-3 py-1.5 rounded border text-sm focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed',
    props.invalid
      ? 'border-destructive focus:border-destructive'
      : 'border-border bg-card text-card-foreground focus:border-primary',
    props.disabled ? 'bg-muted/30' : 'bg-card',
    props.class
  )
)

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const next = sanitizeDateInputValue(input, {
    min: props.min,
    max: props.max
  })
  emit('update:modelValue', next)
}
</script>

<template>
  <input
    :id="id"
    type="date"
    :class="inputClass"
    :value="modelValue ?? ''"
    :min="min || undefined"
    :max="max || undefined"
    :disabled="disabled"
    @input="onInput"
  />
</template>
