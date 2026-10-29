<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, FileText, Receipt, TriangleAlert } from '@lucide/vue'
import { usePermissions } from '@/composables/usePermissions'
import { formatDate, formatNumber } from '@/utils/format'
import { useCustomerBillingStore } from '../stores/customerBillingStore'
import type { BillRow } from '../types/customerBilling.types'

type BillState = 'ready' | 'blocked' | 'invoiced'
type BillFilter = 'all' | BillState

const FILTERS: readonly BillFilter[] = ['all', 'ready', 'blocked', 'invoiced']

const { t } = useI18n()
const store = useCustomerBillingStore()
const { canExecute } = usePermissions('CUSTOMERBILLING')

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'

const filter = ref<BillFilter>('all')
const target = ref<BillRow | null>(null)
const reference = ref('')

const stateOf = (row: BillRow): BillState =>
  row.reference ? 'invoiced' : row.issue ? 'blocked' : 'ready'

const rowsOf = (state: BillState) => store.rows.filter((row) => stateOf(row) === state)
const total = (rows: BillRow[]) => rows.reduce((sum, row) => sum + (row.amount ?? 0), 0)

const kpis = computed(() => {
  const ready = rowsOf('ready')
  const blocked = rowsOf('blocked')
  const invoiced = rowsOf('invoiced')
  return [
    {
      key: 'ready',
      icon: Receipt,
      value: ready.length,
      label: t('planning.billing.kpi.ready'),
      sub: t('planning.billing.kpi.amountSub', { amount: formatNumber(total(ready)) })
    },
    {
      key: 'blocked',
      icon: TriangleAlert,
      value: blocked.length,
      label: t('planning.billing.kpi.blocked'),
      sub: t('planning.billing.kpi.blockedSub')
    },
    {
      key: 'invoiced',
      icon: CircleCheck,
      value: invoiced.length,
      label: t('planning.billing.kpi.invoiced'),
      sub: t('planning.billing.kpi.amountSub', { amount: formatNumber(total(invoiced)) })
    },
    {
      key: 'all',
      icon: FileText,
      value: store.rows.length,
      label: t('planning.billing.kpi.all'),
      sub: t('planning.billing.kpi.allSub')
    }
  ]
})

const visibleRows = computed(() => (filter.value === 'all' ? store.rows : rowsOf(filter.value)))

const countOf = (item: BillFilter) => (item === 'all' ? store.rows.length : rowsOf(item).length)

function pill(row: BillRow): { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' } {
  const state = stateOf(row)
  if (state === 'invoiced') return { label: t('planning.billing.state.invoiced'), tone: 'success' }
  if (state === 'ready') return { label: t('planning.billing.state.ready'), tone: 'info' }
  return {
    label: t(`planning.billing.issue.${row.issue}`),
    tone: row.issue === 'internal' ? 'neutral' : 'warning'
  }
}

const orderCard = (row: BillRow) => ({
  path: '/planning/transport-orders',
  query: { no: row.orderNo, cardMode: 'view' }
})

function openInvoice(row: BillRow) {
  store.error = null
  reference.value = ''
  target.value = row
}

async function confirmInvoice() {
  if (!target.value || !reference.value.trim()) return
  if (await store.invoice(target.value, reference.value.trim())) target.value = null
}

onMounted(() => void store.fetchRows())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('planning.billing.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.billing.subtitle') }}</p>
    </header>

    <FormAlerts v-if="!target" :error="store.error" @clear:error="store.error = null" />
    <LoadingSpinner
      v-if="store.loading && !store.rows.length"
      :text="t('planning.billing.loading')"
    />

    <template v-else>
      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <button
          v-for="kpi in kpis"
          :key="kpi.key"
          type="button"
          class="cursor-pointer text-left bg-card border border-border rounded p-4 flex items-start gap-3 hover:bg-accent transition"
          @click="filter = kpi.key as BillFilter"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="kpi.icon" class="w-5 h-5" />
          </span>
          <span class="min-w-0">
            <span class="block text-xs text-muted-foreground">{{ kpi.label }}</span>
            <span
              class="block text-2xl font-semibold tabular-nums"
              :class="kpi.key === 'blocked' && kpi.value ? 'text-warning' : 'text-card-foreground'"
            >
              {{ kpi.value }}
            </span>
            <span class="block text-xs text-muted-foreground truncate">{{ kpi.sub }}</span>
          </span>
        </button>
      </section>

      <nav class="flex flex-wrap gap-1 border-b border-border">
        <button
          v-for="item in FILTERS"
          :key="item"
          type="button"
          class="cursor-pointer px-3 py-2 text-sm border-b-2 -mb-px transition"
          :class="
            filter === item
              ? 'border-primary text-card-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-card-foreground'
          "
          @click="filter = item"
        >
          {{ t(`planning.billing.filter.${item}`) }}
          <span class="ml-1 text-xs text-muted-foreground tabular-nums">{{ countOf(item) }}</span>
        </button>
      </nav>

      <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

      <section class="bg-card border border-border rounded overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted/40 text-xs text-muted-foreground">
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.billing.col.order') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.billing.col.customer') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.billing.col.delivery') }}
              </th>
              <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
                {{ t('planning.billing.col.quantity') }}
              </th>
              <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
                {{ t('planning.billing.col.amount') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.billing.col.status') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.billing.reference') }}
              </th>
              <th v-if="canExecute" class="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="!visibleRows.length">
              <td :colspan="canExecute ? 8 : 7" class="px-3 py-4 text-muted-foreground">
                {{ t('planning.billing.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in visibleRows"
              :key="`${row.orderNo}-${row.lineNo}`"
              class="border-t border-border align-top"
            >
              <td class="px-3 py-2 whitespace-nowrap">
                <RouterLink :to="orderCard(row)" class="text-primary hover:underline">
                  {{ row.orderNo }}
                </RouterLink>
                <span class="block text-xs text-muted-foreground">
                  {{ t('planning.billing.line', { n: row.lineNo }) }} ·
                  {{ formatDate(row.declaredAt) }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="block text-card-foreground">{{ row.customerName ?? '-' }}</span>
                <span v-if="row.customerNo" class="block text-xs text-muted-foreground">
                  {{ row.customerNo }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="block text-card-foreground">
                  {{ row.deliveryPointName ?? row.deliveryPointNo }}
                </span>
                <span class="block text-xs text-muted-foreground">
                  {{ row.productName ?? row.productNo }}
                </span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(row.quantity) }}
                <span class="text-xs text-muted-foreground">{{ row.unit }}</span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(row.amount) }}
                <span v-if="row.tariffNo" class="block text-xs text-muted-foreground">
                  {{ row.tariffNo }}
                </span>
              </td>
              <td class="px-3 py-2">
                <StatusPill v-bind="pill(row)" />
              </td>
              <td class="px-3 py-2 whitespace-nowrap">{{ row.reference ?? '-' }}</td>
              <td v-if="canExecute" class="px-3 py-2 text-right">
                <button
                  v-if="stateOf(row) === 'ready'"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.saving"
                  @click="openInvoice(row)"
                >
                  <Receipt class="w-5 h-5 text-primary" />
                  {{ t('planning.billing.invoice') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <ConfirmDialog
      :open="!!target"
      :title="t('planning.billing.invoice')"
      :confirm-label="t('planning.billing.invoice')"
      :confirm-disabled="!reference.trim()"
      :loading="store.saving"
      panel-class="max-w-md"
      @confirm="confirmInvoice"
      @cancel="target = null"
    >
      <div v-if="target" class="space-y-3">
        <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt class="text-muted-foreground">{{ t('planning.billing.col.order') }}</dt>
          <dd class="text-card-foreground">{{ target.orderNo }} · {{ target.lineNo }}</dd>
          <dt class="text-muted-foreground">{{ t('planning.billing.col.customer') }}</dt>
          <dd class="text-card-foreground">{{ target.customerName ?? target.customerNo }}</dd>
          <dt class="text-muted-foreground">{{ t('planning.billing.col.amount') }}</dt>
          <dd class="text-card-foreground tabular-nums">{{ formatNumber(target.amount) }}</dd>
        </dl>
        <BaseFormField :label="t('planning.billing.reference')" required>
          <FormInput v-model="reference" :maxlength="40" />
        </BaseFormField>
        <FormAlerts :error="store.error" @clear:error="store.error = null" />
      </div>
    </ConfirmDialog>
  </div>
</template>
