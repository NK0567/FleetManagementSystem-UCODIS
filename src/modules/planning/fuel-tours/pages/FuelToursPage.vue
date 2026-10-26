<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import type { SingleResponse } from '@/types/api-response.types'

interface FuelTourRow {
  no: string
  depotNo: string
  date: string
  validatedAt: string | null
  orderNos: string[]
  bls: { no: string; status: string }[]
}

const { t } = useI18n()
const rows = ref<FuelTourRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = (await httpClient.get<SingleResponse<FuelTourRow[]>>('/planning/fuel-tours')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.fuelTours.loadError'))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.fuelTours.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.fuelTours.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <p v-if="loading" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.fuelTours.loading') }}</p>
    <p v-else-if="!rows.length" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.fuelTours.empty') }}</p>
    <div v-else class="flex-1 overflow-auto px-4 py-3">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="row in rows" :key="row.no" class="border-t border-border">
            <td class="py-2 pr-3">{{ row.no }}</td>
            <td class="py-2 pr-3">{{ row.depotNo }}</td>
            <td class="py-2 pr-3">{{ row.date }}</td>
            <td class="py-2 pr-3">{{ row.orderNos.join(', ') }}</td>
            <td class="py-2">{{ row.bls.map((bl) => `${bl.no} ${bl.status}`).join(', ') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
