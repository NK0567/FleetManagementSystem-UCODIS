<script lang="ts" setup>
import SettingsTabs from '@/modules/settings/components/SettingsTabs.vue'
import ModuleTogglesPage from '@/modules/settings/module-toggles/pages/ModuleTogglesPage.vue'
</script>

<template>
  <DashboardLayout>
    <div class="h-full flex flex-col">
      <SettingsTabs />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <ModuleTogglesPage />
      </div>
    </div>
  </DashboardLayout>
</template>
