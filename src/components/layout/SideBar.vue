<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ChevronDown } from '@lucide/vue'
import type { NavSubItem } from '@/core/navigation/moduleRegistry'
import { useNavLayout } from '@/composables/useNavLayout'

const COLLAPSED_STORAGE_KEY = 'fms:nav-collapsed-sections'

/** The settings sections of the reference menu start folded; the others start open. */
const FOLDED_BY_DEFAULT = 'nav.group.ref'

function readChoices(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, boolean>)
      : {}
  } catch {
    return {}
  }
}

/*
 * Every page wraps itself in the layout, so the menu is built again at each navigation. What the
 * user chose (sections folded, scroll position) is kept here, outside the component, so a click
 * does not send the menu back to the top.
 */
let savedScroll = 0
/** Open (true) or folded (false), for the sections the user has opened or folded. */
const choices = ref<Record<string, boolean>>(readChoices())

function writeChoices(): void {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(choices.value))
  } catch {
    // The choice simply won't survive a reload.
  }
}

const { t } = useI18n()
const route = useRoute()
const { currentMenu, isSubItemActive } = useNavLayout()
const asideEl = ref<HTMLElement | null>(null)

/** Sections in the order their first entry appears in the module's menu. */
const sections = computed(() => {
  const menuKey = currentMenu.value?.labelKey ?? ''
  const byGroup = new Map<string, NavSubItem[]>()
  for (const item of currentMenu.value?.subItems ?? []) {
    const key = item.group ?? ''
    byGroup.set(key, [...(byGroup.get(key) ?? []), item])
  }
  return [...byGroup].map(([group, items]) => ({
    group,
    id: `${menuKey}:${group}`,
    items,
    hasActive: items.some((item) => isSubItemActive(item.to))
  }))
})

function isOpen(section: { id: string; group: string }): boolean {
  return choices.value[section.id] ?? !section.group.startsWith(FOLDED_BY_DEFAULT)
}

function toggle(section: { id: string; group: string }): void {
  choices.value = { ...choices.value, [section.id]: !isOpen(section) }
  writeChoices()
}

/** Reaching a screen opens its section, so the active entry is never hidden. */
function openActiveSection(): void {
  const active = sections.value.find((section) => section.hasActive)
  if (active && !isOpen(active)) {
    choices.value = { ...choices.value, [active.id]: true }
    writeChoices()
  }
}

function keepActiveInView(): void {
  const el = asideEl.value
  if (!el) return
  const active = el.querySelector<HTMLElement>('[data-active="true"]')
  if (!active) return
  const box = el.getBoundingClientRect()
  const item = active.getBoundingClientRect()
  if (item.top < box.top || item.bottom > box.bottom) active.scrollIntoView({ block: 'nearest' })
}

onMounted(() => {
  openActiveSection()
  void nextTick(() => {
    if (asideEl.value) asideEl.value.scrollTop = savedScroll
    keepActiveInView()
  })
})

watch(() => route.path, openActiveSection)

function rememberScroll(): void {
  if (asideEl.value) savedScroll = asideEl.value.scrollTop
}
</script>

<template>
  <aside
    v-if="currentMenu && currentMenu.subItems.length"
    ref="asideEl"
    class="w-60 shrink-0 bg-card border-r border-border overflow-y-auto py-2"
    @scroll.passive="rememberScroll"
  >
    <section v-for="section in sections" :key="section.id" class="mb-1.5">
      <button
        v-if="section.group"
        type="button"
        class="w-full flex items-center justify-between px-5 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-card-foreground cursor-pointer"
        :aria-expanded="isOpen(section)"
        :title="t(isOpen(section) ? 'nav.section.collapse' : 'nav.section.expand')"
        @click="toggle(section)"
      >
        <span class="text-left">{{ t(section.group) }}</span>
        <ChevronDown
          class="w-3.5 h-3.5 shrink-0 transition-transform"
          :class="isOpen(section) ? '' : '-rotate-90'"
        />
      </button>
      <nav v-show="!section.group || isOpen(section)" class="px-2 space-y-0.5">
        <RouterLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          :data-active="isSubItemActive(item.to)"
          class="flex items-center gap-2.5 px-3 py-1.5 text-sm rounded border-l-2 transition-colors"
          :class="
            isSubItemActive(item.to)
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-transparent text-card-foreground hover:bg-accent'
          "
        >
          <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0" />
          <span class="truncate">{{ t(item.labelKey) }}</span>
        </RouterLink>
      </nav>
    </section>
  </aside>
</template>
