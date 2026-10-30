<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, CircleCheck, ClipboardCheck, Plus, ShieldAlert } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import { formatDate, formatNumber } from '@/utils/format'
import type { CarrierInvoiceStatus } from '../domain/carrierInvoice'
import { useCarrierInvoiceStore } from '../stores/carrierInvoiceStore'
import type { CarrierInvoiceApi } from '../types/carrierInvoice.types'

const { t } = useI18n()
const store = useCarrierInvoiceStore()
const { canExecute } = usePermissions('CARRIERINVOICE')

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'

const STATUS_TONES: Record<CarrierInvoiceStatus, 'warning' | 'success' | 'danger'> = {
  to_check: 'warning',
  validated: 'success',
  refused: 'danger'
}

const emptyDraft = () => ({
  carrierNo: '',
  reference: '',
  date: todayIso(),
  amount: null as number | null,
  orders: ''
})

const recording = ref(false)
const draft = ref(emptyDraft())
const validating = ref<CarrierInvoiceApi | null>(null)
const refusing = ref<CarrierInvoiceApi | null>(null)

const orderNos = computed(() =>
  draft.value.orders
    .split(/[,;\s]+/)
    .map((no) => no.trim())
    .filter(Boolean)
)
const draftReady = computed(
  () =>
    !!draft.value.carrierNo &&
    !!draft.value.reference.trim() &&
    !!draft.value.date &&
    Number(draft.value.amount) > 0 &&
    orderNos.value.length > 0
)

const byStatus = (status: CarrierInvoiceStatus) =>
  store.invoices.filter((invoice) => invoice.status === status)

const kpis = computed(() => {
  const toCheck = byStatus('to_check')
  return [
    {
      key: 'to_check',
      icon: ClipboardCheck,
      value: toCheck.length,
      label: t('planning.carrierInvoices.kpi.toCheck'),
      sub: t('planning.carrierInvoices.kpi.amountSub', {
        amount: formatNumber(toCheck.reduce((sum, invoice) => sum + invoice.amount, 0))
      })
    },
    {
      key: 'untariffed',
      icon: ShieldAlert,
      value: toCheck.filter((invoice) => invoice.untariffed).length,
      label: t('planning.carrierInvoices.kpi.untariffed'),
      sub: t('planning.carrierInvoices.kpi.untariffedSub')
    },
    {
      key: 'validated',
      icon: CircleCheck,
      value: byStatus('validated').length,
      label: t('planning.carrierInvoices.kpi.validated'),
      sub: t('planning.carrierInvoices.kpi.amountSub', {
        amount: formatNumber(
          byStatus('validated').reduce((sum, invoice) => sum + invoice.amount, 0)
        )
      })
    },
    {
      key: 'refused',
      icon: Ban,
      value: byStatus('refused').length,
      label: t('planning.carrierInvoices.kpi.refused'),
      sub: t('planning.carrierInvoices.kpi.refusedSub')
    }
  ]
})

const gap = (invoice: CarrierInvoiceApi) =>
  invoice.agreedAmount === null ? null : invoice.amount - invoice.agreedAmount

const orderCard = (no: string) => ({
  path: '/planning/transport-orders',
  query: { no, cardMode: 'view' }
})

function openRecord() {
  store.error = null
  draft.value = emptyDraft()
  recording.value = true
}

async function confirmRecord() {
  if (!draftReady.value) return
  const done = await store.record({
    carrierNo: draft.value.carrierNo,
    reference: draft.value.reference.trim(),
    date: draft.value.date,
    amount: Number(draft.value.amount),
    orderNos: orderNos.value
  })
  if (done) recording.value = false
}

async function confirmValidate(reason: string) {
  const invoice = validating.value
  if (!invoice) return
  await store.validate(invoice.no, reason)
  validating.value = null
}

async function confirmRefuse(reason: string) {
  const invoice = refusing.value
  if (!invoice) return
  await store.refuse(invoice.no, reason)
  refusing.value = null
}

onMounted(() => void store.fetchInvoices())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('planning.carrierInvoices.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('planning.carrierInvoices.subtitle') }}</p>
      </div>
      <button
        v-if="canExecute"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
        :disabled="store.saving"
        @click="openRecord"
      >
        <Plus class="w-4 h-4" />
        {{ t('planning.carrierInvoices.recordNew') }}
      </button>
    </header>

    <FormAlerts v-if="!recording" :error="store.error" @clear:error="store.error = null" />
    <LoadingSpinner
      v-if="store.loading && !store.invoices.length"
      :text="t('planning.carrierInvoices.loading')"
    />

    <template v-else>
      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="bg-card border border-border rounded p-4 flex items-start gap-3"
          :class="kpi.value ? '' : 'opacity-60'"
        >
          <span
            class="p-2 rounded shrink-0"
            :class="kpi.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
          >
            <component :is="kpi.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p
              class="text-2xl font-semibold tabular-nums"
              :class="kpi.value ? 'text-card-foreground' : 'text-muted-foreground'"
            >
              {{ kpi.value }}
            </p>
            <p class="text-xs text-muted-foreground truncate">{{ kpi.sub }}</p>
          </div>
        </div>
      </section>

      <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

      <section class="bg-card border border-border rounded overflow-x-auto">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('planning.carrierInvoices.list') }}
        </h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted/40 text-xs text-muted-foreground">
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.carrierInvoices.reference') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.carrierInvoices.carrier') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.carrierInvoices.orders') }}
              </th>
              <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
                {{ t('planning.carrierInvoices.amount') }}
              </th>
              <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
                {{ t('planning.carrierInvoices.agreed') }}
              </th>
              <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
                {{ t('planning.carrierInvoices.gap') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.carrierInvoices.statusLabel') }}
              </th>
              <th v-if="canExecute" class="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!store.invoices.length">
              <td :colspan="canExecute ? 8 : 7" class="px-3 py-4 text-muted-foreground">
                {{
                  canExecute
                    ? t('planning.carrierInvoices.emptyCreate')
                    : t('planning.carrierInvoices.empty')
                }}
              </td>
            </tr>
            <tr
              v-for="invoice in store.invoices"
              :key="invoice.no"
              class="border-t border-border align-top"
            >
              <td class="px-3 py-2 whitespace-nowrap">
                <span class="block font-medium text-card-foreground">{{ invoice.reference }}</span>
                <span class="block text-xs text-muted-foreground">
                  {{ invoice.no }} · {{ formatDate(invoice.invoiceDate) }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="block text-card-foreground">
                  {{ invoice.carrierName ?? invoice.carrierNo }}
                </span>
                <span class="block text-xs text-muted-foreground">{{ invoice.carrierNo }}</span>
              </td>
              <td class="px-3 py-2">
                <span class="flex flex-wrap gap-x-2">
                  <RouterLink
                    v-for="no in invoice.orderNos"
                    :key="no"
                    :to="orderCard(no)"
                    class="text-primary hover:underline whitespace-nowrap"
                  >
                    {{ no }}
                  </RouterLink>
                </span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(invoice.amount) }}
              </td>
              <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(invoice.agreedAmount) }}
                <span v-if="invoice.withholdingAmount" class="block text-xs text-muted-foreground">
                  {{
                    t('planning.carrierInvoices.withholding', {
                      amount: formatNumber(invoice.withholdingAmount)
                    })
                  }}
                </span>
              </td>
              <td
                class="px-3 py-2 text-right tabular-nums whitespace-nowrap"
                :class="gap(invoice) ? 'text-warning' : 'text-card-foreground'"
              >
                {{ formatNumber(gap(invoice)) }}
              </td>
              <td class="px-3 py-2">
                <StatusPill
                  :label="t(`planning.carrierInvoices.status.${invoice.status}`)"
                  :tone="STATUS_TONES[invoice.status]"
                />
                <span
                  v-if="invoice.status === 'to_check' && invoice.untariffed"
                  class="block mt-1 text-xs text-warning"
                >
                  {{ t('planning.carrierInvoices.untariffed') }}
                </span>
                <span
                  v-else-if="invoice.refusalReason || invoice.untariffedReason"
                  class="block mt-1 text-xs text-muted-foreground"
                >
                  {{ invoice.refusalReason || invoice.untariffedReason }}
                </span>
              </td>
              <td v-if="canExecute" class="px-3 py-2">
                <span v-if="invoice.status === 'to_check'" class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="store.saving"
                    @click="validating = invoice"
                  >
                    <CircleCheck class="w-4 h-4" />
                    {{ t('planning.carrierInvoices.validate') }}
                  </button>
                  <button
                    type="button"
                    :class="buttonClass"
                    :disabled="store.saving"
                    @click="refusing = invoice"
                  >
                    <Ban class="w-5 h-5 text-primary" />
                    {{ t('planning.carrierInvoices.refuse') }}
                  </button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <ConfirmDialog
      :open="recording"
      :title="t('planning.carrierInvoices.record')"
      :confirm-label="t('planning.carrierInvoices.record')"
      :confirm-disabled="!draftReady"
      :loading="store.saving"
      panel-class="max-w-lg"
      @confirm="confirmRecord"
      @cancel="recording = false"
    >
      <div class="space-y-3">
        <BaseFormField :label="t('planning.carrierInvoices.carrier')" required>
          <ReferenceLookup
            v-model="draft.carrierNo"
            reference-key="carriers"
            :modal-title="t('planning.carrierInvoices.carrier')"
          />
        </BaseFormField>
        <div class="grid gap-3 sm:grid-cols-2">
          <BaseFormField :label="t('planning.carrierInvoices.reference')" required>
            <FormInput v-model="draft.reference" :maxlength="40" />
          </BaseFormField>
          <BaseFormField :label="t('planning.carrierInvoices.date')" required>
            <DateFormInput v-model="draft.date" />
          </BaseFormField>
        </div>
        <BaseFormField :label="t('planning.carrierInvoices.amount')" required>
          <FormInput v-model="draft.amount" type="number" :min="0" />
        </BaseFormField>
        <BaseFormField :label="t('planning.carrierInvoices.orders')" required>
          <FormInput
            v-model="draft.orders"
            :placeholder="t('planning.carrierInvoices.ordersHint')"
          />
        </BaseFormField>
        <FormAlerts :error="store.error" @clear:error="store.error = null" />
      </div>
    </ConfirmDialog>

    <ReasonDialog
      :open="!!validating"
      :title="t('planning.carrierInvoices.validate')"
      :label="t('planning.carrierInvoices.reason')"
      :confirm-label="t('planning.carrierInvoices.validate')"
      :min-length="validating?.untariffed ? 1 : 0"
      :loading="store.saving"
      @confirm="confirmValidate"
      @cancel="validating = null"
    />

    <ReasonDialog
      :open="!!refusing"
      :title="t('planning.carrierInvoices.refuse')"
      :label="t('planning.carrierInvoices.reason')"
      :confirm-label="t('planning.carrierInvoices.refuse')"
      :min-length="1"
      :loading="store.saving"
      destructive
      @confirm="confirmRefuse"
      @cancel="refusing = null"
    />
  </div>
</template>
