<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ClipboardCheck,
  Clock,
  MessageSquareWarning,
  Receipt,
  ShieldCheck,
  Truck
} from '@lucide/vue'
import { formatNumber } from '@/utils/format'
import { usePlanningDashboardStore } from '../stores/planningDashboardStore'

const { t } = useI18n()
const store = usePlanningDashboardStore()

const percent = (value: number | null) => (value === null ? '—' : `${value} %`)

const kpis = computed(() => {
  const board = store.dashboard
  if (!board) return []
  return [
    {
      key: 'orders',
      icon: Truck,
      value: formatNumber(board.orders),
      label: t('planning.dashboard.kpi.orders'),
      sub: t('planning.dashboard.kpi.ordersSub', board.lines.declared),
      to: '/planning/transport-orders'
    },
    {
      key: 'punctuality',
      icon: Clock,
      value: percent(board.punctuality),
      label: t('planning.dashboard.kpi.punctuality'),
      sub: t('planning.dashboard.kpi.punctualitySub', {
        onTime: board.lines.onTime,
        arrived: board.lines.arrived
      }),
      to: '/planning/reports'
    },
    {
      key: 'confirmation',
      icon: ShieldCheck,
      value: percent(board.confirmation),
      label: t('planning.dashboard.kpi.confirmation'),
      sub: t('planning.dashboard.kpi.confirmationSub', {
        attested: board.lines.attested,
        declared: board.lines.declared
      }),
      to: '/planning/reports'
    },
    {
      key: 'contestation',
      icon: MessageSquareWarning,
      value: percent(board.contestation),
      label: t('planning.dashboard.kpi.contestation'),
      sub: t('planning.dashboard.kpi.contestationSub', board.lines.contested),
      to: '/planning/reports'
    },
    {
      key: 'toInvoice',
      icon: Receipt,
      value: formatNumber(board.toInvoice),
      label: t('planning.dashboard.kpi.toInvoice'),
      sub: t('planning.dashboard.kpi.toInvoiceSub', {
        amount: formatNumber(board.toInvoiceAmount)
      }),
      to: '/planning/customer-billing'
    },
    {
      key: 'invoicesToCheck',
      icon: ClipboardCheck,
      value: formatNumber(board.invoicesToCheck),
      label: t('planning.dashboard.kpi.invoicesToCheck'),
      sub: t('planning.dashboard.kpi.invoicesToCheckSub'),
      to: '/planning/carrier-invoices'
    }
  ]
})

const rates = computed(() => {
  const board = store.dashboard
  if (!board) return []
  return [
    { key: 'punctuality', value: board.punctuality, tone: 'bg-primary' },
    { key: 'confirmation', value: board.confirmation, tone: 'bg-success' },
    { key: 'contestation', value: board.contestation, tone: 'bg-warning' }
  ]
})

onMounted(() => void store.fetchDashboard())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('planning.dashboard.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.dashboard.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <LoadingSpinner v-if="store.loading && !store.dashboard" :text="t('common.loading')" />

    <template v-if="store.dashboard">
      <section class="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <RouterLink
          v-for="kpi in kpis"
          :key="kpi.key"
          :to="kpi.to"
          class="bg-card border border-border rounded p-4 flex items-start gap-3 hover:bg-accent transition"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="kpi.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p class="text-2xl font-semibold text-card-foreground tabular-nums">{{ kpi.value }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ kpi.sub }}</p>
          </div>
        </RouterLink>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div class="bg-card border border-border rounded">
          <div class="px-4 py-3 border-b border-border">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('planning.dashboard.rates') }}
            </h2>
          </div>
          <ul class="p-4 space-y-3">
            <li v-for="rate in rates" :key="rate.key" class="text-sm">
              <div class="flex justify-between">
                <span class="text-card-foreground">{{
                  t(`planning.dashboard.kpi.${rate.key}`)
                }}</span>
                <span class="tabular-nums text-card-foreground">{{ percent(rate.value) }}</span>
              </div>
              <div class="h-1.5 rounded bg-muted overflow-hidden">
                <div
                  class="h-full rounded"
                  :class="rate.tone"
                  :style="{ width: `${rate.value ?? 0}%` }"
                />
              </div>
            </li>
          </ul>
          <p class="px-4 pb-4 text-xs text-muted-foreground">
            {{ t('planning.dashboard.ratesHint') }}
          </p>
        </div>

        <div class="bg-card border border-border rounded xl:col-span-2 overflow-x-auto">
          <div class="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('planning.dashboard.carriers') }}
            </h2>
            <RouterLink to="/planning/reports" class="text-xs text-primary hover:underline">
              {{ t('planning.dashboard.seeReports') }}
            </RouterLink>
          </div>
          <table v-if="store.dashboard.carriers.length" class="w-full text-sm">
            <thead>
              <tr class="bg-muted/40 text-xs text-muted-foreground">
                <th class="px-3 py-2 font-semibold text-left">
                  {{ t('planning.reports.col.carrier') }}
                </th>
                <th class="px-3 py-2 font-semibold text-right">
                  {{ t('planning.reports.col.orders') }}
                </th>
                <th class="px-3 py-2 font-semibold text-right">
                  {{ t('planning.reports.col.punctuality') }}
                </th>
                <th class="px-3 py-2 font-semibold text-right">
                  {{ t('planning.reports.col.confirmation') }}
                </th>
                <th class="px-3 py-2 font-semibold text-right">
                  {{ t('planning.reports.col.contestation') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="carrier in store.dashboard.carriers"
                :key="carrier.carrierNo"
                class="border-t border-border"
              >
                <td class="px-3 py-1.5">
                  <span class="text-card-foreground">
                    {{ carrier.carrierName ?? carrier.carrierNo }}
                  </span>
                  <span class="text-xs text-muted-foreground"> · {{ carrier.carrierNo }}</span>
                </td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ carrier.orders }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">
                  {{ percent(carrier.punctuality) }}
                </td>
                <td class="px-3 py-1.5 text-right tabular-nums">
                  {{ percent(carrier.confirmation) }}
                </td>
                <td class="px-3 py-1.5 text-right tabular-nums">
                  {{ percent(carrier.contestation) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('planning.reports.empty') }}
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
