<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    required?: boolean
    /** Target of useFormValidationUi when scrolling to the first error. */
    field?: string
  }>(),
  {
    required: false
  }
)
</script>

<template>
  <div
    class="flex flex-col gap-1.5 min-w-0 xl:flex-row xl:items-center xl:gap-4"
    :data-field="field || undefined"
  >
    <label v-if="label || $slots.label" class="text-sm text-muted-foreground xl:w-52 xl:shrink-0">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="text-destructive"> *</span>
    </label>
    <div class="flex-1 min-w-0 w-full">
      <slot />
    </div>
  </div>
</template>
