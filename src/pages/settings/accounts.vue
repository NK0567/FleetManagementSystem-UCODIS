<script lang="ts" setup>
import SettingsTabs from '@/modules/settings/components/SettingsTabs.vue'
import UserAccountsList from '@/modules/settings/user-accounts/pages/UserAccountsList.vue'
</script>

<template>
  <DashboardLayout>
    <div class="h-full flex flex-col">
      <SettingsTabs />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <UserAccountsList />
      </div>
    </div>
  </DashboardLayout>
</template>
