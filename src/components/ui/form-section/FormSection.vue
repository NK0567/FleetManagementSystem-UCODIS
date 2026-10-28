<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

defineProps<{
  title: string
  /** Shown as chips while the section is collapsed. */
  summary?: (string | null | undefined)[]
}>()

const open = defineModel<boolean>('open', { default: true })
</script>

<template>
  <section class="mb-6">
    <div class="flex items-center justify-between gap-4 mb-4 border-b-[3px] border-primary">
      <button
        type="button"
        class="flex items-center gap-2 text-left cursor-pointer min-w-0"
        :aria-expanded="open"
        @click="open = !open"
      >
        <ChevronRight
          :class="[
            'w-4 h-4 transition-transform text-muted-foreground shrink-0',
            open ? 'rotate-90' : ''
          ]"
        />
        <h2 class="text-lg font-semibold text-card-foreground">{{ title }}</h2>
      </button>
      <div v-if="!open" class="flex items-center gap-2 flex-wrap justify-end text-sm shrink-0">
        <template v-for="(chip, index) in summary ?? []" :key="index">
          <span v-if="chip" class="bg-muted text-muted-foreground py-1.5 px-3 rounded">{{
            chip
          }}</span>
        </template>
      </div>
    </div>

    <transition name="section-expand">
      <div v-if="open" class="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-3">
        <slot />
      </div>
    </transition>
  </section>
</template>

<style scoped>
.section-expand-enter-active,
.section-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.section-expand-enter-from,
.section-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.section-expand-enter-to,
.section-expand-leave-from {
  max-height: 1000px;
}
</style>
