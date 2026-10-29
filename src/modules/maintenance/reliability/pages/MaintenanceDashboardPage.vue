<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarClock,
  CircleAlert,
  ClipboardCheck,
  Factory,
  Package,
  ShoppingCart,
  Truck,
  Wrench
} from '@lucide/vue'
import { EMPTY_CELL, formatNumber } from '@/utils/format'
import MaintenanceTargetsPanel from '../components/MaintenanceTargetsPanel.vue'
import { useReliabilityStore } from '../stores/reliabilityStore'

const { t } = useI18n()
const store = useReliabilityStore()

const tiles = computed(() => {
  const dashboard = store.dashboard
  if (!dashboard) return []
  return [
    {
      key: 'openOrders',
      icon: Wrench,
      value: dashboard.openOrders,
      sub: t('maintenance.dashboard.sub.awaitingParts', { count: dashboard.awaitingParts }),
      to: '/maintenance/work-orders'
    },
    {
      key: 'awaitingValidation',
      icon: ClipboardCheck,
      value: dashboard.awaitingValidation,
      sub: t('maintenance.dashboard.sub.atGarage', { count: dashboard.atOutsideGarage }),
      to: '/maintenance/work-orders'
    },
    {
      key: 'unavailableVehicles',
      icon: Truck,
      value: dashboard.unavailableVehicles,
      sub: t('maintenance.dashboard.sub.unavailable'),
      to: '/maintenance/downtimes'
    },
    {
      key: 'servicesToPlan',
      icon: CalendarClock,
      value: dashboard.servicesToPlan,
      sub: t('maintenance.dashboard.sub.blocking', { count: dashboard.blockingServices }),
      to: '/maintenance/service-due'
    },
    {
      key: 'lowStockItems',
      icon: Package,
      value: dashboard.lowStockItems,
      sub: t('maintenance.dashboard.sub.lowStock'),
      to: '/maintenance/stock-items'
    },
    {
      key: 'pendingPurchases',
      icon: ShoppingCart,
      value: dashboard.pendingPurchases,
      sub: t('maintenance.dashboard.sub.purchases'),
      to: '/maintenance/purchase-requests'
    },
    {
      key: 'tyreAlerts',
      icon: CircleAlert,
      value: dashboard.tyreAlerts,
      sub: t('maintenance.dashboard.sub.tyres'),
      to: '/maintenance/tyres'
    },
    {
      key: 'workshop',
      icon: Factory,
      value:
        dashboard.last30Days.mttrHours === null
          ? EMPTY_CELL
          : `${formatNumber(dashboard.last30Days.mttrHours, 1)} h`,
      sub: t('maintenance.dashboard.sub.mttr'),
      to: '/maintenance/reliability'
    }
  ]
})

const last30 = computed(() => store.dashboard?.last30Days ?? null)
const dash = (value: number | null, unit = '', digits = 0) =>
  value === null ? EMPTY_CELL : `${formatNumber(value, digits)}${unit}`

onMounted(() => void store.fetchDashboard())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('maintenance.dashboard.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('maintenance.dashboard.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" />
    <LoadingSpinner v-if="store.loading && !store.dashboard" :text="t('common.loading')" />

    <template v-if="store.dashboard">
      <section class="bg-card border border-border rounded">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ t('maintenance.dashboard.workload.title') }}
          </h2>
          <RouterLink to="/maintenance/work-orders" class="text-xs text-primary hover:underline">
            {{ t('maintenance.dashboard.workload.open') }}
          </RouterLink>
        </div>
        <dl class="grid grid-cols-3 gap-4 p-4 text-sm">
          <div v-for="key in ['inProgress', 'planned', 'late'] as const" :key="key">
            <dt class="text-muted-foreground">{{ t(`maintenance.dashboard.workload.${key}`) }}</dt>
            <dd
              class="text-2xl font-semibold tabular-nums"
              :class="key === 'late' && store.dashboard.workload.late ? 'text-destructive' : ''"
            >
              {{ store.dashboard.workload[key] }}
            </dd>
          </div>
        </dl>
      </section>

      <MaintenanceTargetsPanel
        :kpis="store.dashboard.last30Days"
        :preventive-completion="store.dashboard.preventiveCompletion"
        :targets="store.dashboard.targets"
      />

      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <RouterLink
          v-for="tile in tiles"
          :key="tile.key"
          :to="tile.to"
          class="bg-card border border-border rounded p-4 flex items-start gap-3 hover:bg-accent transition"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="tile.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">
              {{ t(`maintenance.dashboard.kpi.${tile.key}`) }}
            </p>
            <p class="text-2xl font-semibold text-card-foreground tabular-nums">{{ tile.value }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ tile.sub }}</p>
          </div>
        </RouterLink>
      </section>

      <section v-if="last30" class="bg-card border border-border rounded">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ t('maintenance.dashboard.last30') }}
          </h2>
          <RouterLink to="/maintenance/reliability" class="text-xs text-primary hover:underline">
            {{ t('maintenance.dashboard.openReliability') }}
          </RouterLink>
        </div>
        <dl class="grid grid-cols-2 xl:grid-cols-5 gap-4 p-4 text-sm">
          <div>
            <dt class="text-muted-foreground">{{ t('maintenance.reliability.kpi.mtbfKm') }}</dt>
            <dd class="text-lg font-semibold tabular-nums">{{ dash(last30.mtbfKm, ' km') }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">
              {{ t('maintenance.reliability.kpi.preventiveShare') }}
            </dt>
            <dd class="text-lg font-semibold tabular-nums">
              {{ dash(last30.preventiveShare, ' %') }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('maintenance.reliability.kpi.costPerKm') }}</dt>
            <dd class="text-lg font-semibold tabular-nums">{{ dash(last30.costPerKm, '', 2) }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">
              {{ t('maintenance.reliability.kpi.availabilityRate') }}
            </dt>
            <dd class="text-lg font-semibold tabular-nums">
              {{ dash(last30.availabilityRate, ' %', 1) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('maintenance.reliability.kpi.totalCost') }}</dt>
            <dd class="text-lg font-semibold tabular-nums">{{ dash(last30.totalCost) }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </div>
</template>
