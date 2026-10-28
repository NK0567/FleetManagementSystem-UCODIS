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
  <!-- The label sits beside the input only when the field itself is wide enough, not the screen:
       in a dialog or a narrow column it stays above so the input keeps its width. -->
  <div class="@container min-w-0" :data-field="field || undefined">
    <div class="flex flex-col gap-1.5 @lg:flex-row @lg:items-center @lg:gap-4">
      <label
        v-if="label || $slots.label"
        class="text-sm text-muted-foreground @lg:w-52 @lg:shrink-0"
      >
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="text-destructive"> *</span>
      </label>
      <div class="flex-1 min-w-0 w-full">
        <slot />
      </div>
    </div>
  </div>
</template>
