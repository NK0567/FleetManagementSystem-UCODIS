<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'

const { t } = useI18n()
const route = useRoute()
const menuPermissionsStore = useMenuPermissionsStore()

/** The module and its settings entry, found from the address of this page. */
const found = computed(() => {
  for (const menu of menuPermissionsStore.navMenus) {
    const hub = menu.subItems.find((item) => item.to === route.path && item.children)
    if (hub) return { menu, hub }
  }
  return null
})
const items = computed(() => found.value?.hub.children ?? [])
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('nav.setupHub') }}
        <span v-if="found" class="text-muted-foreground font-normal">
          · {{ t(found.menu.labelKey) }}
        </span>
      </h1>
    </header>
    <p v-if="!items.length" class="text-sm text-muted-foreground">{{ t('nav.setupHubEmpty') }}</p>
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-3 rounded border border-border bg-card p-4 hover:border-primary hover:bg-primary/5 transition"
      >
        <span
          class="w-9 h-9 shrink-0 rounded bg-primary/10 text-primary flex items-center justify-center"
        >
          <component :is="item.icon" v-if="item.icon" class="w-5 h-5" />
        </span>
        <span class="flex-1 font-medium text-card-foreground">{{ t(item.labelKey) }}</span>
        <ChevronRight class="w-4 h-4 text-muted-foreground group-hover:text-primary" />
      </RouterLink>
    </div>
  </div>
</template>
