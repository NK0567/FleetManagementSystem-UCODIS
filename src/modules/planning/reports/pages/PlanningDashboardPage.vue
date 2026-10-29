<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  AlarmClock,
  ClipboardCheck,
  Clock,
  FileDown,
  FileSpreadsheet,
  Inbox,
  MessageSquareWarning,
  Receipt,
  ShieldCheck,
  Truck,
  TriangleAlert
} from '@lucide/vue'
import type { ReportTable } from '@/modules/fleet/reports/composables/useReportFormat'
import { usePermissions } from '@/composables/usePermissions'
import { TRANSPORT_ORDER_STATUSES } from '@/modules/planning/transport-orders/domain/transportOrder'
import { useOptionsStore } from '@/stores/optionsStore'
import { EMPTY_CELL, formatDate, formatDateTime, formatNumber } from '@/utils/format'
import ReportFiltersBar from '../components/ReportFiltersBar.vue'
import { cellOf, useReportExport, type ExportFormat } from '../composables/useReportExport'
import { usePlanningDashboardStore } from '../stores/planningDashboardStore'
import type { ReportFilters } from '../types/planningReport.types'

const { t } = useI18n()
const store = usePlanningDashboardStore()
const { dashboard } = storeToRefs(store)
const optionsStore = useOptionsStore()
/* The director exports the dashboard (TRS08-US05). */
const { canExport } = usePermissions('PLANNINGDASHBOARD')

const filters = ref<ReportFilters>({ from: '', to: '', depotNo: '', region: '', ordererNo: '' })
const choices = computed(() => dashboard.value?.choices ?? null)
const { exporting, exportError, exportAs, subtitle } = useReportExport(filters, choices)

const percent = (value: number | null) => (value === null ? EMPTY_CELL : `${value} %`)
const statusLabel = (status: string) =>
  optionsStore.getOptionLabel('transportOrderStatus', status) || status
const orderCard = (no: string) => ({
  path: '/planning/transport-orders',
  query: { no, cardMode: 'view' }
})

const kpis = computed(() => {
  const board = dashboard.value
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
      key: 'late',
      icon: AlarmClock,
      value: formatNumber(board.late.length),
      label: t('planning.dashboard.kpi.late'),
      sub: t('planning.dashboard.kpi.lateSub', board.alerts.length),
      to: '/planning/transport-orders'
    },
    {
      key: 'pending',
      icon: Inbox,
      value: formatNumber(board.pendingRequests.length),
      label: t('planning.dashboard.kpi.pending'),
      sub: t(
        'planning.dashboard.kpi.pendingSub',
        board.pendingRequests.filter((request) => request.overdue).length
      ),
      to: '/planning/delivery-requests'
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

const statuses = computed(() => {
  const board = dashboard.value
  if (!board) return []
  return TRANSPORT_ORDER_STATUSES.map((status) => ({
    status,
    count: board.byStatus[status] ?? 0,
    share: board.orders ? Math.round(((board.byStatus[status] ?? 0) / board.orders) * 100) : 0
  }))
})

/** The same content as the screen, one table per block, for the PDF and Excel exports. */
const exportTables = computed<ReportTable[]>(() => {
  const board = dashboard.value
  if (!board) return []
  const col = (key: string) => t(`planning.dashboard.col.${key}`)
  return [
    {
      title: t('planning.dashboard.indicators'),
      headers: [col('indicator'), col('value'), col('detail')],
      numeric: [false, false, false],
      rows: kpis.value.map((kpi) => [cellOf(kpi.label), cellOf(kpi.value), cellOf(kpi.sub)])
    },
    {
      title: t('planning.dashboard.byStatus'),
      headers: [col('status'), col('count')],
      numeric: [false, true],
      rows: statuses.value.map((item) => [
        cellOf(statusLabel(item.status)),
        cellOf(String(item.count), item.count)
      ])
    },
    {
      title: t('planning.dashboard.late'),
      headers: [col('order'), col('status'), col('recipients'), col('kind'), col('planned')],
      numeric: [false, false, false, false, false],
      rows: board.late.map((item) => [
        cellOf(item.orderNo),
        cellOf(statusLabel(item.status)),
        cellOf(item.recipientSummary || EMPTY_CELL),
        cellOf(t(`planning.dashboard.lateKind.${item.kind}`)),
        cellOf(
          formatDateTime(item.kind === 'departure' ? item.plannedDeparture : item.plannedArrival)
        )
      ])
    },
    {
      title: t('planning.dashboard.alerts'),
      headers: [col('order'), col('status'), col('recipients'), col('alert'), col('count')],
      numeric: [false, false, false, false, true],
      rows: board.alerts.map((item) => [
        cellOf(item.orderNo),
        cellOf(statusLabel(item.status)),
        cellOf(item.recipientSummary || EMPTY_CELL),
        cellOf(t(`planning.dashboard.alert.${item.kind}`)),
        cellOf(String(item.count), item.count)
      ])
    },
    {
      title: t('planning.dashboard.pending'),
      headers: [col('request'), col('orderer'), col('recipient'), col('product'), col('desired')],
      numeric: [false, false, false, false, false],
      rows: board.pendingRequests.map((item) => [
        cellOf(item.no),
        cellOf(item.ordererName || EMPTY_CELL),
        cellOf(item.recipientName || EMPTY_CELL),
        cellOf(item.productName || EMPTY_CELL),
        cellOf(formatDate(item.desiredDate))
      ])
    },
    {
      title: t('planning.dashboard.carriers'),
      headers: [
        t('planning.reports.col.carrier'),
        t('planning.reports.col.orders'),
        t('planning.reports.col.punctuality'),
        t('planning.reports.col.confirmation'),
        t('planning.reports.col.contestation')
      ],
      numeric: [false, true, true, true, true],
      rows: board.carriers.map((carrier) => [
        cellOf(carrier.carrierName ?? carrier.carrierNo),
        cellOf(String(carrier.orders), carrier.orders),
        cellOf(percent(carrier.punctuality), carrier.punctuality),
        cellOf(percent(carrier.confirmation), carrier.confirmation),
        cellOf(percent(carrier.contestation), carrier.contestation)
      ])
    }
  ]
})

function exportBoard(format: ExportFormat) {
  void exportAs(format, t('planning.dashboard.title'), exportTables.value)
}

watch(filters, () => void store.fetchDashboard(filters.value), { deep: true, immediate: true })

const panelClass = 'bg-card border border-border rounded overflow-x-auto min-w-0'
const headClass = 'px-4 py-3 border-b border-border flex items-center justify-between gap-2'
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('planning.dashboard.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('planning.dashboard.subtitle') }}</p>
      </div>
      <div v-if="canExport" class="flex gap-2">
        <button
          v-for="format in ['xlsx', 'pdf'] as const"
          :key="format"
          type="button"
          class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="store.loading || exporting || !dashboard"
          @click="exportBoard(format)"
        >
          <FileSpreadsheet v-if="format === 'xlsx'" class="w-5 h-5 text-primary" />
          <FileDown v-else class="w-5 h-5 text-primary" />
          {{ t(`planning.reports.export.${format}`) }}
        </button>
      </div>
    </header>

    <ReportFiltersBar v-model="filters" :choices="choices" />
    <p class="text-xs text-muted-foreground">{{ subtitle() }}</p>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <FormAlerts :error="exportError" @clear:error="exportError = null" />
    <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

    <template v-if="dashboard">
      <section class="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-3">
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
        <div :class="panelClass">
          <div :class="headClass">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('planning.dashboard.byStatus') }}
            </h2>
          </div>
          <ul class="p-4 space-y-2">
            <li v-for="item in statuses" :key="item.status" class="text-sm">
              <div class="flex justify-between gap-2">
                <TransportOrderStatusPill :status="item.status" />
                <span class="tabular-nums text-card-foreground">{{ item.count }}</span>
              </div>
              <div class="h-1.5 mt-1 rounded bg-muted overflow-hidden">
                <div class="h-full rounded bg-primary" :style="{ width: `${item.share}%` }" />
              </div>
            </li>
          </ul>
        </div>

        <div :class="[panelClass, 'xl:col-span-2']">
          <div :class="headClass">
            <h2 class="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <AlarmClock class="w-4 h-4 text-warning" />
              {{ t('planning.dashboard.late') }}
            </h2>
            <span class="text-xs text-muted-foreground">{{ dashboard.late.length }}</span>
          </div>
          <table v-if="dashboard.late.length" class="w-full text-sm">
            <tbody>
              <tr v-for="item in dashboard.late" :key="item.orderNo" class="border-t border-border">
                <td class="px-3 py-1.5 whitespace-nowrap">
                  <RouterLink :to="orderCard(item.orderNo)" class="text-primary hover:underline">
                    {{ item.orderNo }}
                  </RouterLink>
                </td>
                <td class="px-3 py-1.5"><TransportOrderStatusPill :status="item.status" /></td>
                <td class="px-3 py-1.5 text-card-foreground">
                  {{ item.recipientSummary || EMPTY_CELL }}
                </td>
                <td class="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                  {{ t(`planning.dashboard.lateKind.${item.kind}`) }} ·
                  {{
                    formatDateTime(
                      item.kind === 'departure' ? item.plannedDeparture : item.plannedArrival
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('planning.dashboard.noLate') }}
          </p>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div :class="panelClass">
          <div :class="headClass">
            <h2 class="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <TriangleAlert class="w-4 h-4 text-warning" />
              {{ t('planning.dashboard.alerts') }}
            </h2>
            <span class="text-xs text-muted-foreground">{{ dashboard.alerts.length }}</span>
          </div>
          <table v-if="dashboard.alerts.length" class="w-full text-sm">
            <tbody>
              <tr
                v-for="item in dashboard.alerts"
                :key="`${item.orderNo}-${item.kind}`"
                class="border-t border-border"
              >
                <td class="px-3 py-1.5 whitespace-nowrap">
                  <RouterLink :to="orderCard(item.orderNo)" class="text-primary hover:underline">
                    {{ item.orderNo }}
                  </RouterLink>
                </td>
                <td class="px-3 py-1.5 text-card-foreground">
                  {{ item.recipientSummary || EMPTY_CELL }}
                </td>
                <td class="px-3 py-1.5">
                  <StatusPill :label="t(`planning.dashboard.alert.${item.kind}`)" tone="warning" />
                </td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ item.count }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('planning.dashboard.noAlert') }}
          </p>
        </div>

        <div :class="panelClass">
          <div :class="headClass">
            <h2 class="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Inbox class="w-4 h-4 text-primary" />
              {{ t('planning.dashboard.pending') }}
            </h2>
            <RouterLink
              to="/planning/delivery-requests"
              class="text-xs text-primary hover:underline"
            >
              {{ t('planning.dashboard.seeRequests') }}
            </RouterLink>
          </div>
          <table v-if="dashboard.pendingRequests.length" class="w-full text-sm">
            <tbody>
              <tr
                v-for="item in dashboard.pendingRequests"
                :key="item.no"
                class="border-t border-border"
              >
                <td class="px-3 py-1.5 whitespace-nowrap font-medium text-card-foreground">
                  {{ item.no }}
                </td>
                <td class="px-3 py-1.5">
                  <p class="text-card-foreground">{{ item.recipientName || EMPTY_CELL }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.ordererName }}</p>
                </td>
                <td class="px-3 py-1.5 text-muted-foreground">{{ item.productName }}</td>
                <td class="px-3 py-1.5 whitespace-nowrap text-right">
                  <StatusPill
                    :label="formatDate(item.desiredDate)"
                    :tone="item.overdue ? 'danger' : 'neutral'"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('planning.dashboard.noPending') }}
          </p>
        </div>
      </section>

      <section :class="panelClass">
        <div :class="headClass">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ t('planning.dashboard.carriers') }}
          </h2>
          <RouterLink to="/planning/reports" class="text-xs text-primary hover:underline">
            {{ t('planning.dashboard.seeReports') }}
          </RouterLink>
        </div>
        <table v-if="dashboard.carriers.length" class="w-full text-sm">
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
              v-for="carrier in dashboard.carriers"
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
      </section>
    </template>
  </div>
</template>
