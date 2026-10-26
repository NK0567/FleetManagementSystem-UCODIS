<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NavSubItem } from '@/core/navigation/moduleRegistry'
import { useNavLayout } from '@/composables/useNavLayout'

const { t } = useI18n()
const { currentMenu, isSubItemActive } = useNavLayout()

/** Sections in the order their first entry appears in the module's menu. */
const sections = computed(() => {
  const byGroup = new Map<string, NavSubItem[]>()
  for (const item of currentMenu.value?.subItems ?? []) {
    const key = item.group ?? ''
    byGroup.set(key, [...(byGroup.get(key) ?? []), item])
  }
  return [...byGroup].map(([group, items]) => ({ group, items }))
})
</script>

<template>
  <aside
    v-if="currentMenu && currentMenu.subItems.length"
    class="w-60 shrink-0 bg-card border-r border-border overflow-y-auto py-2"
  >
    <section v-for="section in sections" :key="section.group" class="mb-1.5">
      <p
        v-if="section.group"
        class="px-5 pt-2.5 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
      >
        {{ t(section.group) }}
      </p>
      <nav class="px-2 space-y-0.5">
        <RouterLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
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
