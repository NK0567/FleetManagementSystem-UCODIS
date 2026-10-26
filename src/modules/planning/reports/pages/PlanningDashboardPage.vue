<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'

interface Board {
  orders: number
  punctuality: number | null
  confirmation: number | null
  contestation: number | null
}

const { t } = useI18n()
const board = ref<Board | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    board.value = (await httpClient.get<SingleResponse<Board>>('/planning/dashboard')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.dashboard.loadError'))
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.dashboard.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.dashboard.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <div v-if="board" class="grid grid-cols-2 gap-3 p-4 text-sm">
      <p>{{ t('planning.dashboard.orders', board.orders) }}</p>
      <p>{{ t('planning.dashboard.punctuality', { n: board.punctuality ?? '—' }) }}</p>
      <p>{{ t('planning.dashboard.confirmation', { n: board.confirmation ?? '—' }) }}</p>
      <p>{{ t('planning.dashboard.contestation', { n: board.contestation ?? '—' }) }}</p>
    </div>
  </div>
</template>
