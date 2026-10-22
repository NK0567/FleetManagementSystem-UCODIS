<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    rows?: number
    maxlength?: number
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    class?: string
  }>(),
  {
    modelValue: '',
    rows: 3,
    disabled: false,
    invalid: false
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const textareaClass = computed(() =>
  cn(
    'w-full min-w-0 px-3 py-1.5 border rounded text-sm text-card-foreground focus:outline-none resize-y',
    props.invalid
      ? 'border-destructive focus:border-destructive'
      : 'border-border focus:border-primary',
    props.disabled ? 'bg-muted/30 cursor-not-allowed' : 'bg-card',
    props.class
  )
)
</script>

<template>
  <textarea
    :class="textareaClass"
    :value="modelValue ?? ''"
    :rows="rows"
    :maxlength="maxlength"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  ></textarea>
</template>
