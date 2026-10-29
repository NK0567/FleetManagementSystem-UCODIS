<script lang="ts" setup>
import SettingsTabs from '@/modules/settings/components/SettingsTabs.vue'
import CompanySettingsPage from '@/modules/settings/company/pages/CompanySettingsPage.vue'
</script>

<template>
  <DashboardLayout>
    <div class="h-full flex flex-col">
      <SettingsTabs />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <CompanySettingsPage />
      </div>
    </div>
  </DashboardLayout>
</template>
