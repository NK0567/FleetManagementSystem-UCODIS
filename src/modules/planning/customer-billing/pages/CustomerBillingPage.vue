<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import { usePermissions } from '@/composables/usePermissions'
import type { SingleResponse } from '@/types/api-response.types'

interface BillRow {
  orderNo: string
  lineNo: number
  customerNo: string | null
  amount: number | null
  tariffNo: string | null
  reference: string | null
  issue: string | null
}

const { t } = useI18n()
const { canExecute } = usePermissions('CUSTOMERBILLING')
const rows = ref<BillRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const acting = ref(false)
const reference = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = (await httpClient.get<SingleResponse<BillRow[]>>('/planning/customer-billing')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.billing.loadError'))
  } finally {
    loading.value = false
  }
}

async function invoice(row: BillRow) {
  if (!reference.value.trim()) return
  acting.value = true
  error.value = null
  try {
    await httpClient.post(
      `${resourcePath('/planning/transport-orders', row.orderNo)}/lines/${row.lineNo}/invoice`,
      { reference: reference.value }
    )
    reference.value = ''
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.billing.saveError'))
  } finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.billing.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.billing.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <p v-if="loading" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.billing.loading') }}</p>
    <p v-else-if="!rows.length" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.billing.empty') }}</p>
    <div v-else class="flex-1 overflow-auto px-4 py-3">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="row in rows" :key="`${row.orderNo}-${row.lineNo}`" class="border-t border-border">
            <td class="py-2 pr-3">{{ row.orderNo }}</td>
            <td class="py-2 pr-3">{{ row.customerNo }}</td>
            <td class="py-2 pr-3">{{ row.amount ?? '—' }}</td>
            <td class="py-2 pr-3">{{ row.tariffNo }}</td>
            <td class="py-2 pr-3">
              {{ row.reference ?? (row.issue ? t(`planning.billing.issue.${row.issue}`) : '') }}
            </td>
            <td v-if="canExecute && !row.reference" class="py-2">
              <FormInput v-model="reference" :placeholder="t('planning.billing.reference')" />
              <button
                type="button"
                class="ml-2 px-2 py-1 border border-border rounded"
                :disabled="acting || !reference.trim() || !!row.issue"
                @click="invoice(row)"
              >
                {{ t('planning.billing.invoice') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
