<script setup lang="ts">
import { computed } from 'vue'
import { Lock } from '@lucide/vue'
import { cn } from '@/lib/utils'

export interface FormInputProps {
  type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'search'
  modelValue?: string | number | null
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  class?: string
  showLockIcon?: boolean
  maxlength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  numericOnly?: boolean
  inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

const props = withDefaults(defineProps<FormInputProps>(), {
  type: 'text',
  disabled: false,
  invalid: false,
  showLockIcon: false,
  numericOnly: false
})

const NUMERIC_ALLOWED_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End'
])

function sanitizeNumericValue(value: string): string {
  let sanitized = value.replace(/\D/g, '')
  if (props.maxlength != null) {
    sanitized = sanitized.slice(0, props.maxlength)
  }
  return sanitized
}

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputClass = computed(() =>
  cn(
    'w-full h-9 min-w-0 px-3 py-1.5 border rounded text-sm text-card-foreground focus:outline-none',
    props.invalid
      ? 'border-destructive focus:border-destructive'
      : 'border-border focus:border-primary',
    props.disabled ? 'bg-muted/30 cursor-not-allowed' : 'bg-card',
    props.showLockIcon && 'pr-8',
    props.class
  )
)

function handleKeydown(event: KeyboardEvent) {
  if (!props.numericOnly || props.disabled) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (NUMERIC_ALLOWED_KEYS.has(event.key)) return
  if (/^\d$/.test(event.key)) return
  event.preventDefault()
}

function handlePaste(event: ClipboardEvent) {
  if (!props.numericOnly || props.disabled) return
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') ?? ''
  const target = event.target as HTMLInputElement
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  const nextValue = sanitizeNumericValue(
    `${target.value.slice(0, start)}${pasted}${target.value.slice(end)}`
  )
  target.value = nextValue
  emit('update:modelValue', nextValue)
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  let value = target.value
  if (props.numericOnly) {
    value = sanitizeNumericValue(value)
    if (target.value !== value) {
      target.value = value
    }
  }
  if (props.type === 'number' && value !== '') {
    let n = Number(value)
    if (Number.isFinite(n)) {
      if (props.min != null && n < Number(props.min)) n = Number(props.min)
      if (props.max != null && n > Number(props.max)) n = Number(props.max)
      if (n !== Number(value)) {
        value = String(n)
        target.value = value
      }
      emit('update:modelValue', n)
      return
    }
  }
  const emitted = props.type === 'number' ? (value === '' ? 0 : Number(value)) : value
  emit('update:modelValue', emitted)
}
</script>

<template>
  <div class="relative w-full min-w-0">
    <input
      :class="inputClass"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :id="id"
      :maxlength="maxlength"
      :min="min"
      :max="max"
      :step="step"
      :inputmode="inputmode ?? (numericOnly ? 'numeric' : undefined)"
      @keydown="handleKeydown"
      @paste="handlePaste"
      @input="handleInput"
    />
    <Lock
      v-if="showLockIcon"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
    />
  </div>
</template>
