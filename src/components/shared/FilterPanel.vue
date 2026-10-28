<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'

const { t } = useI18n()

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  resetFilters: []
}>()

const STORAGE_KEY = 'filter-panel.width'
const MIN_WIDTH = 240
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 288

function readStoredWidth(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored)) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

const width = ref(readStoredWidth())
const isResizing = ref(false)
let startX = 0
let startWidth = 0

function onResizeStart(event: MouseEvent) {
  event.preventDefault()
  isResizing.value = true
  startX = event.clientX
  startWidth = width.value
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

function onResizeMove(event: MouseEvent) {
  if (!isResizing.value) return
  width.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + event.clientX - startX))
}

function onResizeEnd() {
  if (!isResizing.value) return
  isResizing.value = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  try {
    localStorage.setItem(STORAGE_KEY, String(width.value))
  } catch {
    // The width is a convenience: keeping it for the session only is fine.
  }
}

onMounted(() => {
  width.value = readStoredWidth()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})

// Width goes through a CSS variable so the slide transition can still animate it.
const panelStyle = computed(() => ({ '--filter-panel-w': `${width.value}px` }))
</script>

<template>
  <transition name="filter-slide">
    <div
      v-if="open"
      class="filter-panel relative bg-card rounded border border-border flex flex-col shrink-0 overflow-visible"
      :style="panelStyle"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 class="text-sm font-semibold text-card-foreground">{{ t('common.filters') }}</h3>
        <button
          type="button"
          class="text-muted-foreground hover:text-card-foreground transition"
          :title="t('common.close')"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="px-4 py-3 flex-1 min-h-0 overflow-y-auto overflow-x-visible">
        <slot />
      </div>
      <div class="px-4 py-2 border-t border-border">
        <button
          type="button"
          class="text-sm text-muted-foreground hover:text-primary hover:underline block"
          @click="emit('resetFilters')"
        >
          {{ t('common.resetFilters') }}
        </button>
      </div>

      <div
        class="resize-handle absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none"
        :class="{ 'is-resizing': isResizing }"
        :title="t('common.resize')"
        @mousedown="onResizeStart"
      />
    </div>
  </transition>
</template>

<style scoped>
.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  width: 0;
  min-width: 0;
  padding-left: 0;
  padding-right: 0;
  margin-right: -1rem;
}

.filter-panel {
  width: var(--filter-panel-w, 18rem);
}

.resize-handle {
  background-color: transparent;
  transition: background-color 0.15s ease;
}
.resize-handle:hover,
.resize-handle.is-resizing {
  background-color: var(--color-primary);
  opacity: 0.4;
}
</style>
