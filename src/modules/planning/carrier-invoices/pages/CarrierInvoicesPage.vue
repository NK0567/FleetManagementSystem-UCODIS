<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import { usePermissions } from '@/composables/usePermissions'
import type { SingleResponse } from '@/types/api-response.types'

interface InvoiceRow {
  no: string
  carrierNo: string
  reference: string
  amount: number
  agreedAmount: number | null
  status: 'to_check' | 'validated' | 'refused'
  orderNos: string[]
}

const { t } = useI18n()
const { canExecute } = usePermissions('CARRIERINVOICE')
const rows = ref<InvoiceRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const reference = ref('')
const amount = ref<number | null>(null)
const orders = ref('TR-2026-0004')
const reason = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = (await httpClient.get<SingleResponse<InvoiceRow[]>>('/planning/carrier-invoices')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.carrierInvoices.loadError'))
  } finally {
    loading.value = false
  }
}

async function record() {
  if (!reference.value.trim() || amount.value === null) return
  error.value = null
  try {
    await httpClient.post('/planning/carrier-invoices', {
      carrierNo: 'PRS-016',
      reference: reference.value,
      date: '2026-09-04',
      amount: amount.value,
      orderNos: orders.value.split(',').map((no) => no.trim()).filter(Boolean)
    })
    reference.value = ''
    amount.value = null
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.carrierInvoices.saveError'))
  }
}

async function validate(row: InvoiceRow) {
  error.value = null
  try {
    await httpClient.post(`${resourcePath('/planning/carrier-invoices', row.no)}/validate`, {
      reason: reason.value
    })
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.carrierInvoices.saveError'))
  }
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.carrierInvoices.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.carrierInvoices.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <div v-if="canExecute" class="px-4 py-3 flex flex-wrap gap-2 items-center border-b border-border">
      <FormInput v-model="reference" :placeholder="t('planning.carrierInvoices.reference')" />
      <FormInput v-model="amount" type="number" :min="0" :placeholder="t('planning.carrierInvoices.amount')" />
      <FormInput v-model="orders" :placeholder="t('planning.carrierInvoices.orders')" />
      <button type="button" class="px-2 py-1 border border-border rounded" @click="record">
        {{ t('planning.carrierInvoices.record') }}
      </button>
    </div>
    <p v-if="loading" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.carrierInvoices.loading') }}</p>
    <p v-else-if="!rows.length" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.carrierInvoices.empty') }}</p>
    <div v-else class="flex-1 overflow-auto px-4 py-3">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="row in rows" :key="row.no" class="border-t border-border">
            <td class="py-2 pr-3">{{ row.no }}</td>
            <td class="py-2 pr-3">{{ row.reference }}</td>
            <td class="py-2 pr-3">{{ row.amount }}</td>
            <td class="py-2 pr-3">{{ row.agreedAmount ?? '—' }}</td>
            <td class="py-2 pr-3">{{ t(`planning.carrierInvoices.status.${row.status}`) }}</td>
            <td class="py-2 pr-3">{{ row.orderNos.join(', ') }}</td>
            <td v-if="canExecute && row.status === 'to_check'" class="py-2">
              <FormInput v-model="reason" :placeholder="t('planning.carrierInvoices.reason')" />
              <button type="button" class="ml-2 px-2 py-1 border border-border rounded" @click="validate(row)">
                {{ t('planning.carrierInvoices.validate') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
