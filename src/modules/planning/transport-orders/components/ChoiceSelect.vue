<script lang="ts" setup>
import { ChevronDown } from '@lucide/vue'

/** A select over choices computed on the screen (free resources, open trips), styled as OptionsSelect. */
export interface Choice {
  value: string
  label: string
  disabled?: boolean
}

withDefaults(
  defineProps<{
    choices: Choice[]
    placeholder?: string
    /** Lets the empty value be picked back, as "none". */
    clearable?: boolean
    disabled?: boolean
    invalid?: boolean
  }>(),
  { placeholder: '', clearable: false, disabled: false, invalid: false }
)

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative w-full min-w-0">
    <select
      v-model="model"
      :disabled="disabled"
      class="w-full h-9 min-h-0 min-w-0 pl-3 pr-8 py-1.5 border rounded text-sm text-card-foreground appearance-none focus:outline-none"
      :class="[
        invalid
          ? 'border-destructive focus:border-destructive'
          : 'border-border focus:border-primary',
        disabled ? 'bg-muted/30 cursor-not-allowed opacity-70' : 'bg-card'
      ]"
    >
      <option value="" :disabled="!clearable">{{ placeholder }}</option>
      <option
        v-for="choice in choices"
        :key="choice.value"
        :value="choice.value"
        :disabled="choice.disabled"
      >
        {{ choice.label }}
      </option>
    </select>
    <ChevronDown
      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
      aria-hidden="true"
    />
  </div>
</template>
