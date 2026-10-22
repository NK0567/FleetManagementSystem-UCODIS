<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { LayoutGrid } from '@lucide/vue'

const { t } = useI18n()
</script>

<template>
  <DashboardLayout>
    <div class="flex flex-col items-center justify-center text-center gap-3 py-24 px-4">
      <LayoutGrid class="w-10 h-10 text-muted-foreground" />
      <h1 class="text-lg font-semibold text-card-foreground">{{ t('home.noModuleTitle') }}</h1>
      <p class="max-w-md text-sm text-muted-foreground">{{ t('home.noModuleMessage') }}</p>
    </div>
  </DashboardLayout>
</template>
