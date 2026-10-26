<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'

interface CarrierRow {
  carrierNo: string
  orders: number
  punctuality: number | null
  confirmation: number | null
  contestation: number | null
  invoices: number
  withoutTariff: number
}

const { t } = useI18n()
const rows = ref<CarrierRow[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    rows.value = (await httpClient.get<SingleResponse<CarrierRow[]>>('/planning/reports/carriers')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.reports.loadError'))
  }
})
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.reports.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.reports.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <p v-if="!rows.length" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.reports.empty') }}</p>
    <div v-else class="flex-1 overflow-auto px-4 py-3">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="row in rows" :key="row.carrierNo" class="border-t border-border">
            <td class="py-2 pr-3">{{ row.carrierNo }}</td>
            <td class="py-2 pr-3">{{ row.orders }}</td>
            <td class="py-2 pr-3">{{ row.punctuality ?? '—' }}</td>
            <td class="py-2 pr-3">{{ row.confirmation ?? '—' }}</td>
            <td class="py-2 pr-3">{{ row.contestation ?? '—' }}</td>
            <td class="py-2">{{ row.invoices }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
