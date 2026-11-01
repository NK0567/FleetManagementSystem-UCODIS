<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@lucide/vue'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'

const { t } = useI18n()
const route = useRoute()
const menuPermissionsStore = useMenuPermissionsStore()

const isUnder = (path: string, to: string) => path === to || path.startsWith(`${to}/`)

/** On a settings screen, the page of the module's settings it was reached from. */
const hub = computed(() => {
  for (const menu of menuPermissionsStore.navMenus) {
    const entry = menu.subItems.find((item) =>
      item.children?.some((child) => isUnder(route.path, child.to))
    )
    if (entry) return { to: entry.to, module: menu.labelKey }
  }
  return null
})
</script>

<template>
  <div v-if="hub" class="px-2 pt-3">
    <RouterLink
      :to="hub.to"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded border border-border text-card-foreground hover:bg-accent"
    >
      <ArrowLeft class="w-4 h-4" />
      {{ t('nav.backToSetup') }}
      <span class="text-muted-foreground">· {{ t(hub.module) }}</span>
    </RouterLink>
  </div>
</template>
