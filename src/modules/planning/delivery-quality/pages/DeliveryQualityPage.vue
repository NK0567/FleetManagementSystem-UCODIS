<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import { usePermissions } from '@/composables/usePermissions'
import type { SingleResponse } from '@/types/api-response.types'

interface ProtestRow {
  no: string
  quantity: number
  status: 'preparing' | 'issued' | 'closed'
  outcome: string
}

interface QualityRow {
  orderNo: string
  lineNo: number
  recipientName: string
  productName: string
  means: 'fleet' | 'carrier' | null
  facts: string[]
  protests: ProtestRow[]
  responsibility: { impacts: { type: string; amount: number }[] } | null
  creditReference: string | null
}

const { t } = useI18n()
const { canExecute } = usePermissions('DELIVERYQUALITY')
const rows = ref<QualityRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const acting = ref(false)
const quantity = ref<number | null>(null)
const preparing = ref<QualityRow | null>(null)
const outcome = ref('')
const comment = ref('')
const credit = ref<number | null>(null)
const reference = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = (await httpClient.get<SingleResponse<QualityRow[]>>('/planning/delivery-quality')).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.quality.loadError'))
  } finally {
    loading.value = false
  }
}

async function post(row: QualityRow, path: string, body: Record<string, unknown>) {
  acting.value = true
  error.value = null
  try {
    await httpClient.post(
      `${resourcePath('/planning/transport-orders', row.orderNo)}/lines/${row.lineNo}/${path}`,
      body
    )
    await load()
    return true
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.quality.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

async function onPrepare(choice: { reasonNo: string; comment: string }) {
  const row = preparing.value
  if (!row || quantity.value === null) return
  if (await post(row, 'protests', { reasonNo: choice.reasonNo, comment: choice.comment, quantity: quantity.value })) {
    preparing.value = null
  }
}

async function setResponsibility(row: QualityRow) {
  if (!comment.value.trim()) return
  const actor = row.means === 'carrier' ? 'external_carrier' : 'internal_carrier'
  const impacts = credit.value && credit.value > 0 ? [{ type: 'customer_credit', amount: credit.value }] : []
  await post(row, 'responsibility', {
    origin: 'transport',
    comment: comment.value,
    shares: [{ actor, percent: 100 }],
    impacts
  })
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.quality.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.quality.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <p v-if="loading" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.quality.loading') }}</p>
    <p v-else-if="!rows.length" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.quality.empty') }}</p>
    <div v-else class="flex-1 overflow-auto px-4 py-3 space-y-4">
      <article v-for="row in rows" :key="`${row.orderNo}-${row.lineNo}`" class="border border-border rounded p-3 text-sm">
        <p class="font-medium">{{ row.orderNo }} · {{ row.recipientName }} · {{ row.productName }}</p>
        <p class="text-muted-foreground">
          {{ row.facts.map((fact) => t(`planning.quality.fact.${fact}`)).join(', ') }}
        </p>
        <ul class="mt-2 space-y-1">
          <li v-for="note in row.protests" :key="note.no">
            {{ note.no }} · {{ note.quantity }} · {{ t(`planning.quality.status.${note.status}`) }}
            <button
              v-if="canExecute && note.status === 'preparing'"
              type="button"
              class="ml-2 px-2 py-1 border border-border rounded"
              :disabled="acting"
              @click="post(row, `protests/${note.no}/issue`, {})"
            >
              {{ t('planning.quality.issue') }}
            </button>
            <template v-else-if="canExecute && note.status === 'issued'">
              <FormInput v-model="outcome" class="ml-2 inline-block w-40" :placeholder="t('planning.quality.outcome')" />
              <button
                type="button"
                class="ml-2 px-2 py-1 border border-border rounded"
                :disabled="acting || !outcome.trim()"
                @click="post(row, `protests/${note.no}/close`, { outcome })"
              >
                {{ t('planning.quality.close') }}
              </button>
            </template>
          </li>
        </ul>
        <div v-if="canExecute" class="mt-2 flex flex-wrap items-center gap-2">
          <FormInput v-model="quantity" type="number" :min="0" :placeholder="t('planning.quality.quantity')" />
          <button type="button" class="px-2 py-1 border border-border rounded" :disabled="acting" @click="preparing = row">
            {{ t('planning.quality.prepare') }}
          </button>
          <FormInput v-model="comment" :placeholder="t('planning.quality.comment')" />
          <FormInput v-model="credit" type="number" :min="0" :placeholder="t('planning.quality.credit')" />
          <button type="button" class="px-2 py-1 border border-border rounded" :disabled="acting" @click="setResponsibility(row)">
            {{ t('planning.quality.responsibility') }}
          </button>
          <FormInput
            v-if="row.responsibility && !row.creditReference"
            v-model="reference"
            :placeholder="t('planning.quality.reference')"
          />
          <button
            v-if="row.responsibility && !row.creditReference"
            type="button"
            class="px-2 py-1 border border-border rounded"
            :disabled="acting || !reference.trim()"
            @click="post(row, 'issue-credit', { reference })"
          >
            {{ t('planning.quality.issueCredit') }}
          </button>
        </div>
      </article>
    </div>
  </div>
  <PlanningReasonDialog
    :open="preparing !== null"
    :title="t('planning.quality.prepare')"
    kind="protest"
    :loading="acting"
    @confirm="onPrepare"
    @cancel="preparing = null"
  />
</template>
