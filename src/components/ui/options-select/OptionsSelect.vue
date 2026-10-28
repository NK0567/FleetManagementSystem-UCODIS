<script lang="ts" setup>
import { computed } from 'vue'
import { ChevronDown, Lock } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { EnrichOption } from '@/types/options.types'

type OptionValue = EnrichOption['value']

const props = withDefaults(
  defineProps<{
    modelValue?: OptionValue | null
    optionsKey: string
    disabled?: boolean
    invalid?: boolean
    showLockIcon?: boolean
    disabledValues?: OptionValue[]
    hiddenValues?: OptionValue[]
    /** Shown when the current value is empty or hidden. */
    placeholder?: string
  }>(),
  {
    modelValue: null,
    disabled: false,
    invalid: false,
    showLockIcon: false,
    disabledValues: () => [],
    hiddenValues: () => [],
    placeholder: ''
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: OptionValue]
}>()

const optionsStore = useOptionsStore()

const options = computed(() => optionsStore.getOptions(props.optionsKey))
const visibleOptions = computed(() =>
  options.value.filter((option) => !props.hiddenValues.includes(option.value))
)
const currentKey = computed(() => (props.modelValue == null ? '' : String(props.modelValue)))
const showPlaceholder = computed(
  () => !visibleOptions.value.some((option) => String(option.value) === currentKey.value)
)

const selectClass = computed(() => [
  'w-full h-9 min-h-0 min-w-0 pl-3 pr-8 py-1.5 border rounded text-sm text-card-foreground',
  'appearance-none bg-no-repeat focus:outline-none [&::-ms-expand]:hidden',
  props.invalid
    ? 'border-destructive focus:border-destructive'
    : 'border-border focus:border-primary',
  props.disabled ? 'bg-muted/30 cursor-not-allowed opacity-70' : 'bg-card'
])

function onChange(event: Event) {
  const key = (event.target as HTMLSelectElement).value
  const option = options.value.find((candidate) => String(candidate.value) === key)
  if (option) emit('update:modelValue', option.value)
}
</script>

<template>
  <div class="relative w-full min-w-0">
    <select :value="currentKey" :disabled="disabled" :class="selectClass" @change="onChange">
      <option v-if="showPlaceholder" :value="currentKey" disabled>{{ placeholder }}</option>
      <option
        v-for="option in visibleOptions"
        :key="String(option.value)"
        :value="String(option.value)"
        :disabled="disabledValues.includes(option.value)"
      >
        {{ option.description }}
      </option>
    </select>
    <Lock
      v-if="showLockIcon"
      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
      aria-hidden="true"
    />
    <ChevronDown
      v-else
      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
      aria-hidden="true"
    />
  </div>
</template>
