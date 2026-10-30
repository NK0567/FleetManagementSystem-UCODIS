<script lang="ts" setup>
/**
 * « Plus d'actions » menu: the secondary actions of a toolbar or a card, behind one button.
 * An action that cannot run stays visible but disabled, and says why on hover (its title).
 */
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoreHorizontal } from '@lucide/vue'

export interface MoreAction {
  key: string
  label: string
  icon?: Component
  /** Hides the entry (e.g. the user has not the right). */
  hidden?: boolean
  disabled?: boolean
  /** Why the entry is disabled, shown on hover. */
  title?: string
  danger?: boolean
  /** Shows the entry as active (a view or a mode that is on). */
  active?: boolean
  onSelect?: () => void
}

const props = withDefaults(
  defineProps<{
    actions: MoreAction[]
    label?: string
    /** Opens the menu to the left of the button (default) or to the right. */
    align?: 'left' | 'right'
    /** Only the icon, for a row of a table. */
    iconOnly?: boolean
  }>(),
  { label: undefined, align: 'right', iconOnly: false }
)

const emit = defineEmits<{ select: [key: string] }>()

const { t } = useI18n()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)
/* The menu is placed in fixed position under its button, so that a table or a panel that
 * scrolls does not cut it. */
const menuStyle = ref<Record<string, string>>({})
function toggle() {
  if (!open.value && buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    menuStyle.value =
      props.align === 'right'
        ? { top: `${rect.bottom + 2}px`, right: `${window.innerWidth - rect.right}px` }
        : { top: `${rect.bottom + 2}px`, left: `${rect.left}px` }
  }
  open.value = !open.value
}
function close() {
  open.value = false
}
const visibleActions = computed(() => props.actions.filter((action) => !action.hidden))

function choose(action: MoreAction) {
  if (action.disabled) return
  open.value = false
  action.onSelect?.()
  emit('select', action.key)
}

function onMousedown(event: MouseEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false
  }
}
function onKeydown(event: KeyboardEvent) {
  if (open.value && event.key === 'Escape') {
    event.stopPropagation()
    open.value = false
  }
}
function onScroll(event: Event) {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}
onMounted(() => {
  document.addEventListener('mousedown', onMousedown)
  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', close)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', onMousedown)
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', close)
})
</script>

<template>
  <div v-if="visibleActions.length" ref="rootRef" class="relative shrink-0">
    <button
      ref="buttonRef"
      type="button"
      class="inline-flex items-center gap-1.5 text-sm text-card-foreground bg-card border border-border rounded hover:bg-accent transition"
      :class="[{ 'bg-accent': open }, iconOnly ? 'p-1.5' : 'px-3 py-1.5']"
      :aria-label="label ?? t('common.moreActions')"
      :aria-expanded="open"
      aria-haspopup="menu"
      :title="label ?? t('common.moreActions')"
      data-testid="more-actions"
      @click="toggle"
    >
      <MoreHorizontal class="w-4 h-4 text-primary" aria-hidden="true" />
      <template v-if="!iconOnly">{{ label ?? t('common.moreActions') }}</template>
    </button>
    <div
      v-show="open"
      role="menu"
      class="fixed z-[60] min-w-[220px] max-h-[60vh] overflow-y-auto rounded border border-border bg-card py-1 shadow-lg"
      :style="menuStyle"
    >
      <button
        v-for="action in visibleActions"
        :key="action.key"
        type="button"
        role="menuitem"
        class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        :class="[
          action.danger ? 'text-destructive' : 'text-card-foreground',
          action.active ? 'bg-primary/10 font-medium text-primary' : ''
        ]"
        :disabled="action.disabled"
        :title="action.disabled ? action.title : undefined"
        @click="choose(action)"
      >
        <component
          :is="action.icon"
          v-if="action.icon"
          class="w-4 h-4 shrink-0"
          :class="action.danger ? '' : 'text-primary'"
          aria-hidden="true"
        />
        <span class="truncate">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>
