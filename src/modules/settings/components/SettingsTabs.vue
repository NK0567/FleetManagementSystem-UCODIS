<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useMenuPermissionsStore } from '@/stores/menuPermissions'

/** The administration pages reached from the gear of the top bar. */
const TABS = [
  { to: '/settings/module-toggles', feature: 'MODULETOGGLE', labelKey: 'settings.tabs.modules' },
  { to: '/settings/company', feature: 'COMPANYSETTINGS', labelKey: 'settings.tabs.company' },
  { to: '/settings/accounts', feature: 'USERACCOUNT', labelKey: 'settings.tabs.accounts' },
  { to: '/settings/activity-log', feature: 'ACTIVITYLOG', labelKey: 'settings.tabs.activityLog' }
]

const { t } = useI18n()
const route = useRoute()
const permissions = useMenuPermissionsStore()
const tabs = computed(() => TABS.filter((tab) => permissions.can(tab.feature)))
</script>

<template>
  <nav v-if="tabs.length > 1" class="flex gap-1 border-b border-border px-2">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="px-3 py-2 text-sm border-b-2 -mb-px transition"
      :class="
        route.path === tab.to
          ? 'border-primary text-primary font-medium'
          : 'border-transparent text-muted-foreground hover:text-card-foreground'
      "
    >
      {{ t(tab.labelKey) }}
    </RouterLink>
  </nav>
</template>
