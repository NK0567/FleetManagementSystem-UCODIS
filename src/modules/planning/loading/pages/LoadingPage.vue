<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import httpClient from '@/core/api/httpClient'
import { resourcePath } from '@/core/factories'
import type { SingleResponse } from '@/types/api-response.types'

interface LoadingLine {
  orderNo: string
  lineNo: number
  productNo: string
  quantity: number
  loadedQuantity: number | null
  conformingAt: string | null
}

interface ReturnLine {
  orderNo: string
  lineNo: number
  productNo: string
  handedBackAt: string | null
}

const { t } = useI18n()
const lines = ref<LoadingLine[]>([])
const returns = ref<ReturnLine[]>([])
const returning = ref<ReturnLine | null>(null)
const quantities = ref<Record<string, number | null>>({})
const error = ref<string | null>(null)
const loading = ref(false)

const keyOf = (line: LoadingLine) => `${line.orderNo}-${line.lineNo}`

async function load() {
  loading.value = true
  try {
    lines.value = (await httpClient.get<SingleResponse<LoadingLine[]>>('/planning/loading')).data.data
    returns.value = (await httpClient.get<SingleResponse<ReturnLine[]>>('/planning/returns')).data.data
    for (const line of lines.value) {
      quantities.value[keyOf(line)] = line.loadedQuantity ?? line.quantity
    }
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.loading.loadError'))
  } finally {
    loading.value = false
  }
}

async function declare(orderNo: string) {
  error.value = null
  const body = {
    lines: lines.value
      .filter((line) => line.orderNo === orderNo)
      .map((line) => ({ lineNo: line.lineNo, loadedQuantity: quantities.value[keyOf(line)] }))
  }
  try {
    await httpClient.put(`${resourcePath('/planning/transport-orders', orderNo)}/loading`, body)
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.loading.saveError'))
  }
}

async function check(line: LoadingLine, action: 'conform' | 'nonconform') {
  error.value = null
  try {
    await httpClient.post(
      `${resourcePath('/planning/transport-orders', line.orderNo)}/lines/${line.lineNo}/${action}`,
      action === 'nonconform' ? { reasonNo: 'NCF-QUANTITY' } : {}
    )
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.loading.saveError'))
  }
}

async function onReturn(choice: { reasonNo: string; comment: string }) {
  const line = returning.value
  if (!line) return
  error.value = null
  try {
    await httpClient.post(
      `${resourcePath('/planning/transport-orders', line.orderNo)}/lines/${line.lineNo}/receive-return`,
      { conforming: false, reasonNo: choice.reasonNo, comment: choice.comment }
    )
    returning.value = null
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.loading.saveError'))
  }
}

async function receiveReturn(line: ReturnLine) {
  error.value = null
  try {
    await httpClient.post(
      `${resourcePath('/planning/transport-orders', line.orderNo)}/lines/${line.lineNo}/receive-return`,
      { conforming: true }
    )
    await load()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.loading.saveError'))
  }
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold">{{ t('planning.loading.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.loading.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <p v-if="loading" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.loading.loading') }}</p>
    <p v-else-if="!lines.length" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.loading.empty') }}</p>
    <div v-else class="flex-1 overflow-auto px-4 py-3">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="line in lines" :key="keyOf(line)" class="border-t border-border">
            <td class="py-2 pr-3">{{ line.orderNo }}</td>
            <td class="py-2 pr-3">{{ line.productNo }}</td>
            <td class="py-2 pr-3">{{ line.quantity }}</td>
            <td class="py-2 pr-3">
              <FormInput v-model="quantities[keyOf(line)]" type="number" :min="0" />
            </td>
            <td class="py-2">
              <button type="button" class="px-2 py-1 border border-border rounded mr-1" @click="declare(line.orderNo)">
                {{ t('planning.loading.declare') }}
              </button>
              <button
                type="button"
                class="px-2 py-1 border border-border rounded mr-1"
                :disabled="line.loadedQuantity === null"
                @click="check(line, 'conform')"
              >
                {{ t('planning.loading.conform') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <header class="px-4 py-3 border-t border-border">
      <h2 class="text-base font-semibold">{{ t('planning.loading.returnsTitle') }}</h2>
    </header>
    <p v-if="!loading && !returns.length" class="px-4 py-4 text-sm text-muted-foreground">
      {{ t('planning.loading.returnsEmpty') }}
    </p>
    <div v-else-if="returns.length" class="overflow-auto px-4 py-3">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="line in returns" :key="`${line.orderNo}-${line.lineNo}`" class="border-t border-border">
            <td class="py-2 pr-3">{{ line.orderNo }}</td>
            <td class="py-2 pr-3">{{ line.productNo }}</td>
            <td class="py-2">
              <button type="button" class="px-2 py-1 border border-border rounded mr-1" @click="receiveReturn(line)">
                {{ t('planning.loading.returns.receive') }}
              </button>
              <button type="button" class="px-2 py-1 border border-border rounded" @click="returning = line">
                {{ t('planning.loading.returns.nonconform') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <PlanningReasonDialog
    :open="returning !== null"
    :title="t('planning.loading.returns.nonconform')"
    kind="nonconformity"
    :loading="loading"
    @confirm="onReturn"
    @cancel="returning = null"
  />
</template>
