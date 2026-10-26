<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { useNavLayout } from '@/composables/useNavLayout'

const { t } = useI18n()
const { currentMenu, isSubItemActive } = useNavLayout()
</script>

<template>
  <aside
    v-if="currentMenu && currentMenu.subItems.length"
    class="w-60 shrink-0 bg-card border-r border-border overflow-y-auto"
  >
    <p class="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {{ t(currentMenu.labelKey) }}
    </p>
    <nav class="px-2 pb-4 space-y-0.5">
      <RouterLink
        v-for="item in currentMenu.subItems"
        :key="item.to"
        :to="item.to"
        class="block px-3 py-2 text-sm rounded border-l-2 transition-colors"
        :class="
          isSubItemActive(item.to)
            ? 'border-primary bg-primary/10 text-primary font-medium'
            : 'border-transparent text-card-foreground hover:bg-accent'
        "
      >
        {{ t(item.labelKey) }}
      </RouterLink>
    </nav>
  </aside>
</template>
