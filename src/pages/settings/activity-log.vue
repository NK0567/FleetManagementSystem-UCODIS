<script lang="ts" setup>
import SettingsTabs from '@/modules/settings/components/SettingsTabs.vue'
import ActivityLogList from '@/modules/settings/activity-log/pages/ActivityLogList.vue'
</script>

<template>
  <DashboardLayout>
    <div class="h-full flex flex-col">
      <SettingsTabs />
      <div class="flex-1 min-h-0 overflow-y-auto">
        <ActivityLogList />
      </div>
    </div>
  </DashboardLayout>
</template>
