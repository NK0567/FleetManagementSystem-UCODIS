<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Container, FileExclamationPoint, Fuel, Route, Truck, UserRound } from '@lucide/vue'
import { LIVE_SITUATIONS } from '@/modules/fleet/live-map/domain/livePosition'
import { useOptionsStore } from '@/stores/optionsStore'
import { EMPTY_CELL, formatDate, formatNumber } from '@/utils/format'
import { againstTarget } from '../domain/park'
import { useFleetDashboardStore } from '../stores/fleetDashboardStore'
import type { FleetSupervision, SupervisedVehicle } from '../types/fleetDashboard.types'

const { t } = useI18n()
const store = useFleetDashboardStore()
const optionsStore = useOptionsStore()

/** The four columns of the control room board, each vehicle opening on the live map. */
const SUPERVISION_GROUPS: (keyof FleetSupervision)[] = [
  'onMission',
  'stopped',
  'inAlert',
  'outOfZone'
]

function supervisedDetail(vehicle: SupervisedVehicle, group: keyof FleetSupervision) {
  if (group === 'inAlert')
    return t('fleet.dashboard.supervision.alerts', { count: vehicle.alertCount })
  if (group === 'outOfZone') {
    return vehicle.corridorGapM !== null
      ? t('fleet.dashboard.supervision.offCorridor', {
          km: formatNumber(vehicle.corridorGapM / 1000, 1)
        })
      : t('fleet.dashboard.supervision.offSites')
  }
  if (vehicle.situation === 'moving') {
    return [
      t('fleet.dashboard.supervision.speed', { speed: vehicle.speedKmh }),
      vehicle.nextStopName
    ]
      .filter(Boolean)
      .join(' · ')
  }
  return vehicle.placeName || optionsStore.getOptionLabel('liveSituation', vehicle.situation)
}

const park = computed(() => store.dashboard?.park ?? null)
const parkTarget = computed(() =>
  park.value ? againstTarget(park.value.availabilityRate, park.value.availabilityTargetPct) : null
)

const SEVERITY_TONES = {
  critical: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-primary'
} as const

const kpis = computed(() => {
  const dashboard = store.dashboard
  if (!dashboard) return []
  const { tractors, trailers, drivers } = dashboard.availability
  return [
    {
      key: 'tractors',
      icon: Truck,
      value: `${tractors.available}/${tractors.total}`,
      label: t('fleet.dashboard.kpi.tractors'),
      sub: t('fleet.dashboard.kpi.readySub'),
      to: '/fleet/vehicles'
    },
    {
      key: 'trailers',
      icon: Container,
      value: `${trailers.available}/${trailers.total}`,
      label: t('fleet.dashboard.kpi.trailers'),
      sub: t('fleet.dashboard.kpi.readySub'),
      to: '/fleet/vehicles'
    },
    {
      key: 'drivers',
      icon: UserRound,
      value: `${drivers.available}/${drivers.total}`,
      label: t('fleet.dashboard.kpi.drivers'),
      sub: t('fleet.dashboard.kpi.driversSub'),
      to: '/fleet/drivers'
    },
    {
      key: 'documents',
      icon: FileExclamationPoint,
      value: dashboard.documents.expired + dashboard.documents.missing,
      label: t('fleet.dashboard.kpi.documents'),
      sub: t('fleet.dashboard.kpi.documentsSub', { expiring: dashboard.documents.expiring }),
      to: '/fleet/documents/missing'
    },
    {
      key: 'fuel',
      icon: Fuel,
      value: `${formatNumber(dashboard.fuelThisMonth.liters)} L`,
      label: t('fleet.dashboard.kpi.fuel'),
      sub: t('fleet.dashboard.kpi.fuelSub', {
        average: formatNumber(dashboard.fuelThisMonth.averageL100, 1)
      }),
      to: '/fleet/fuel-consumption'
    },
    {
      key: 'compliance',
      icon: Route,
      value:
        dashboard.compliance.tripComplianceRate === null
          ? EMPTY_CELL
          : `${dashboard.compliance.tripComplianceRate} %`,
      label: t('fleet.dashboard.kpi.compliance'),
      sub: t('fleet.dashboard.kpi.complianceSub', {
        infractions: dashboard.compliance.openInfractions,
        drivers: dashboard.compliance.driversBelowScore
      }),
      to: '/fleet/route-deviations'
    }
  ]
})

const fleetTotal = computed(() =>
  (store.dashboard?.fleetByStatus ?? []).reduce((total, item) => total + item.count, 0)
)

/** The board follows the live map: refreshed while it is on screen. */
const REFRESH_MS = 30_000
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  void store.fetchDashboard()
  timer = setInterval(() => void store.fetchDashboard(), REFRESH_MS)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('fleet.dashboard.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('fleet.dashboard.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" />
    <LoadingSpinner v-if="store.loading && !store.dashboard" :text="t('common.loading')" />

    <template v-if="store.dashboard">
      <section v-if="park" class="bg-card border border-border rounded">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.dashboard.park.title') }}
          </h2>
          <RouterLink to="/fleet/fleet-status" class="text-xs text-primary hover:underline">
            {{ t('fleet.dashboard.park.openStatus') }}
          </RouterLink>
        </div>
        <dl class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 p-4 text-sm">
          <div>
            <dt class="text-muted-foreground">{{ t('fleet.dashboard.park.available') }}</dt>
            <dd class="text-2xl font-semibold tabular-nums">{{ park.available }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('fleet.dashboard.park.onMission') }}</dt>
            <dd class="text-2xl font-semibold tabular-nums">{{ park.onMission }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('fleet.dashboard.park.immobilized') }}</dt>
            <dd class="text-2xl font-semibold tabular-nums">{{ park.immobilized }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('fleet.dashboard.park.total') }}</dt>
            <dd class="text-2xl font-semibold tabular-nums">{{ park.total }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('fleet.dashboard.park.availabilityRate') }}</dt>
            <dd
              class="text-2xl font-semibold tabular-nums"
              :class="parkTarget === 'missed' ? 'text-destructive' : ''"
            >
              {{
                park.availabilityRate === null
                  ? EMPTY_CELL
                  : `${formatNumber(park.availabilityRate, 1)} %`
              }}
            </dd>
            <dd class="text-xs text-muted-foreground">
              {{ t('fleet.dashboard.park.target', { target: park.availabilityTargetPct }) }}
              <template v-if="parkTarget">
                · {{ t(`fleet.dashboard.park.targetState.${parkTarget}`) }}
              </template>
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">{{ t('fleet.dashboard.park.averageAge') }}</dt>
            <dd class="text-2xl font-semibold tabular-nums">
              {{
                park.averageAgeYears === null
                  ? EMPTY_CELL
                  : t('fleet.dashboard.park.years', {
                      years: formatNumber(park.averageAgeYears, 1)
                    })
              }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="bg-card border border-border rounded">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.dashboard.supervision.title') }}
          </h2>
          <RouterLink to="/fleet/live-map" class="text-xs text-primary hover:underline">
            {{ t('fleet.dashboard.openMap') }}
          </RouterLink>
        </div>
        <div class="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="group in SUPERVISION_GROUPS" :key="group" class="min-w-0">
            <h3 class="text-xs font-semibold text-muted-foreground mb-1">
              {{ t(`fleet.dashboard.supervision.${group}`) }}
              <span class="text-card-foreground tabular-nums">
                {{ store.dashboard.supervision[group].length }}
              </span>
            </h3>
            <ul
              v-if="store.dashboard.supervision[group].length"
              class="divide-y divide-border border border-border rounded"
            >
              <li v-for="vehicle in store.dashboard.supervision[group]" :key="vehicle.vehicleNo">
                <RouterLink
                  :to="{ path: '/fleet/live-map', query: { vehicle: vehicle.vehicleNo } }"
                  class="block px-3 py-2 hover:bg-accent"
                >
                  <span class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium text-card-foreground">
                      {{ vehicle.plate }}
                    </span>
                    <LiveSituationPill :situation="vehicle.situation" />
                  </span>
                  <span class="block text-xs text-muted-foreground truncate">
                    {{ [vehicle.driverName, vehicle.tripNo].filter(Boolean).join(' · ') }}
                  </span>
                  <span class="block text-xs text-muted-foreground truncate">
                    {{ supervisedDetail(vehicle, group) }}
                  </span>
                </RouterLink>
              </li>
            </ul>
            <p v-else class="text-xs text-muted-foreground">
              {{ t('fleet.dashboard.supervision.none') }}
            </p>
          </div>
        </div>
      </section>

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

      <section class="bg-card border border-border rounded">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.dashboard.movement') }}
          </h2>
          <RouterLink to="/fleet/live-map" class="text-xs text-primary hover:underline">
            {{ t('fleet.dashboard.openMap') }}
          </RouterLink>
        </div>
        <div class="flex flex-wrap gap-2 p-4">
          <RouterLink
            v-for="situation in LIVE_SITUATIONS"
            :key="situation"
            to="/fleet/live-map"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-border hover:bg-accent"
          >
            <LiveSituationPill :situation="situation" />
            <span class="font-semibold text-card-foreground tabular-nums">
              {{ store.dashboard.movement[situation] }}
            </span>
          </RouterLink>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div class="bg-card border border-border rounded">
          <div class="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('fleet.dashboard.latestAlerts') }}
            </h2>
            <RouterLink to="/fleet/alerts" class="text-xs text-primary hover:underline">
              {{ t('fleet.dashboard.seeAll') }}
            </RouterLink>
          </div>
          <ul v-if="store.dashboard.latestAlerts.length" class="divide-y divide-border">
            <li v-for="alert in store.dashboard.latestAlerts" :key="alert.no">
              <RouterLink
                :to="{ path: alert.path, query: { no: alert.recordNo, cardMode: 'view' } }"
                class="flex items-center gap-3 px-4 py-2.5 hover:bg-accent"
              >
                <span
                  class="w-2 h-2 rounded-full shrink-0"
                  :class="SEVERITY_TONES[alert.severity]"
                />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-card-foreground truncate">
                    {{ alert.subject }}
                  </span>
                  <span class="block text-xs text-muted-foreground truncate">
                    {{ optionsStore.getOptionLabel('alertCategory', alert.category) }} ·
                    {{ alert.detail }}
                  </span>
                </span>
                <span class="text-xs text-muted-foreground shrink-0">
                  {{ formatDate(alert.since) }}
                </span>
              </RouterLink>
            </li>
          </ul>
          <p v-else class="px-4 py-6 text-sm text-muted-foreground">
            {{ t('fleet.dashboard.noAlert') }}
          </p>
        </div>

        <div class="space-y-3">
          <div class="bg-card border border-border rounded">
            <div class="px-4 py-3 border-b border-border">
              <h2 class="text-sm font-semibold text-card-foreground">
                {{ t('fleet.dashboard.immobilized') }}
              </h2>
            </div>
            <ul v-if="store.dashboard.immobilized.length" class="divide-y divide-border">
              <li v-for="vehicle in store.dashboard.immobilized" :key="vehicle.vehicleNo">
                <RouterLink
                  :to="{
                    path: '/fleet/vehicles',
                    query: { no: vehicle.vehicleNo, cardMode: 'view' }
                  }"
                  class="block px-4 py-2.5 hover:bg-accent"
                >
                  <span class="block text-sm font-medium text-card-foreground">
                    {{ vehicle.plate }}
                  </span>
                  <span class="block text-xs text-muted-foreground truncate">
                    {{ vehicle.reason }}
                  </span>
                </RouterLink>
              </li>
            </ul>
            <p v-else class="px-4 py-6 text-sm text-muted-foreground">
              {{ t('fleet.dashboard.noImmobilized') }}
            </p>
          </div>

          <div class="bg-card border border-border rounded">
            <div class="px-4 py-3 border-b border-border">
              <h2 class="text-sm font-semibold text-card-foreground">
                {{ t('fleet.dashboard.fleetByStatus') }}
              </h2>
            </div>
            <ul class="p-4 space-y-2">
              <li v-for="item in store.dashboard.fleetByStatus" :key="item.status" class="text-sm">
                <div class="flex justify-between">
                  <span class="text-card-foreground">
                    {{ optionsStore.getOptionLabel('vehicleStatus', item.status) }}
                  </span>
                  <span class="tabular-nums text-card-foreground">{{ item.count }}</span>
                </div>
                <div class="h-1.5 rounded bg-muted overflow-hidden">
                  <div
                    class="h-full rounded bg-primary"
                    :style="{ width: `${(item.count * 100) / (fleetTotal || 1)}%` }"
                  />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
