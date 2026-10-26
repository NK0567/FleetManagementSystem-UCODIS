<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { confirmationApi, type ConfirmationLineApi } from '../api/confirmationApi'

const { t } = useI18n()
const lines = ref<ConfirmationLineApi[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const acting = ref(false)
const unavailable = ref<ConfirmationLineApi | null>(null)
const dating = ref<{ line: ConfirmationLineApi; action: 'propose-date' | 'client-date' | 'accept-date' } | null>(null)
const date = ref('')

async function load() {
  loading.value = true
  error.value = null
  try {
    lines.value = (await confirmationApi.list()).data.data
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.confirmations.loadError'))
  } finally {
    loading.value = false
  }
}

async function run(line: ConfirmationLineApi, action: string, body: Record<string, unknown> = {}) {
  acting.value = true
  error.value = null
  try {
    await confirmationApi.act(line.orderNo, line.lineNo, action, body)
    await load()
    return true
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.confirmations.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

async function onUnavailable(choice: { reasonNo: string; comment: string }) {
  const line = unavailable.value
  if (!line) return
  if (await run(line, 'unavailable', choice)) unavailable.value = null
}

async function onDate() {
  const pending = dating.value
  if (!pending || !date.value) return
  const body = pending.action === 'accept-date' ? { date: date.value } : { date: date.value }
  if (await run(pending.line, pending.action, body)) dating.value = null
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <header class="px-4 py-3 border-b border-border">
      <h1 class="text-lg font-semibold text-card-foreground">{{ t('planning.confirmations.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.confirmations.subtitle') }}</p>
    </header>
    <FormAlerts class="mx-4 mt-3" :error="error" @clear:error="error = null" />
    <p v-if="loading" class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.confirmations.loading') }}</p>
    <p v-else-if="!lines.length" class="px-4 py-6 text-sm text-muted-foreground">
      {{ t('planning.confirmations.empty') }}
    </p>
    <div v-else class="flex-1 overflow-auto px-4 py-3">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-muted-foreground">
          <tr>
            <th class="py-2 pr-3 font-medium">{{ t('planning.confirmations.col.order') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('planning.confirmations.col.recipient') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('planning.confirmations.col.point') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('planning.confirmations.col.product') }}</th>
            <th class="py-2 pr-3 font-medium">{{ t('planning.confirmations.col.state') }}</th>
            <th class="py-2 font-medium">{{ t('planning.confirmations.col.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="`${line.orderNo}-${line.lineNo}`" class="border-t border-border">
            <td class="py-2 pr-3">
              <router-link :to="`/planning/transport-orders/${line.orderNo}`" class="text-primary hover:underline">
                {{ line.orderNo }}
              </router-link>
            </td>
            <td class="py-2 pr-3">{{ line.recipientName }}</td>
            <td class="py-2 pr-3">{{ line.deliveryPointName }}</td>
            <td class="py-2 pr-3">{{ line.productName }} · {{ line.quantity }} {{ line.unit }}</td>
            <td class="py-2 pr-3">{{ t(`planning.confirmations.state.${line.state}`) }}</td>
            <td class="py-2">
              <div v-if="line.state === 'pending' || line.state === 'unavailable'" class="flex flex-wrap gap-1">
                <button
                  v-if="line.state === 'pending'"
                  type="button"
                  class="px-2 py-1 border border-border rounded"
                  :disabled="acting"
                  @click="run(line, 'confirm')"
                >
                  {{ t('planning.confirmations.action.confirm') }}
                </button>
                <button
                  v-if="line.state === 'pending'"
                  type="button"
                  class="px-2 py-1 border border-border rounded"
                  :disabled="acting"
                  @click="unavailable = line"
                >
                  {{ t('planning.confirmations.action.unavailable') }}
                </button>
                <button
                  type="button"
                  class="px-2 py-1 border border-border rounded"
                  :disabled="acting"
                  @click="((date = line.clientProposedOn ?? ''), (dating = { line, action: 'client-date' }))"
                >
                  {{ t('planning.confirmations.action.clientDate') }}
                </button>
                <button
                  type="button"
                  class="px-2 py-1 border border-border rounded"
                  :disabled="acting"
                  @click="((date = line.plannerProposedOn ?? ''), (dating = { line, action: 'propose-date' }))"
                >
                  {{ t('planning.confirmations.action.propose') }}
                </button>
                <button
                  v-if="line.clientProposedOn || line.plannerProposedOn || line.availableOn"
                  type="button"
                  class="px-2 py-1 border border-border rounded"
                  :disabled="acting"
                  @click="run(line, 'accept-date', { date: line.clientProposedOn ?? line.plannerProposedOn ?? line.availableOn })"
                >
                  {{ t('planning.confirmations.action.accept') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <PlanningReasonDialog
    :open="unavailable !== null"
    :title="t('planning.confirmations.action.unavailable')"
    kind="unavailability"
    :loading="acting"
    @confirm="onUnavailable"
    @cancel="unavailable = null"
  />
  <ConfirmDialog
    :open="dating !== null"
    :title="t('planning.confirmations.action.propose')"
    :confirm-disabled="!date"
    :loading="acting"
    @confirm="onDate"
    @cancel="dating = null"
  >
    <FormInput v-model="date" type="date" />
  </ConfirmDialog>
</template>
