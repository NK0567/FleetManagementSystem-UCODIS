<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { EMPTY_CELL, formatNumber } from '@/utils/format'
import MaintenanceTargetsPanel from '../components/MaintenanceTargetsPanel.vue'
import { useReliabilityStore } from '../stores/reliabilityStore'

const { t } = useI18n()
const store = useReliabilityStore()
const optionsStore = useOptionsStore()

const dash = (value: number | null, unit = '', digits = 0) =>
  value === null ? EMPTY_CELL : `${formatNumber(value, digits)}${unit}`

/** Each indicator with its definition, so a reader knows what is counted. */
const indicators = computed(() => {
  const reliability = store.reliability
  if (!reliability) return []
  const kpis = reliability.kpis
  return [
    { key: 'mttrHours', value: dash(kpis.mttrHours, ' h', 1) },
    { key: 'mtbfKm', value: dash(kpis.mtbfKm, ' km') },
    { key: 'preventiveShare', value: dash(kpis.preventiveShare, ' %') },
    { key: 'preventiveCompletion', value: dash(reliability.preventiveCompletion.rate, ' %') },
    { key: 'costPerKm', value: dash(kpis.costPerKm, '', 2) },
    { key: 'availabilityRate', value: dash(kpis.availabilityRate, ' %', 1) },
    { key: 'totalCost', value: dash(kpis.totalCost) }
  ]
})

/** Preventive against corrective cost, as bars of the same scale. */
const costBars = computed(() => {
  const costs = store.reliability?.costByType
  if (!costs) return []
  const max = Math.max(costs.preventive, costs.corrective, costs.improvement, 1)
  return (['preventive', 'corrective', 'improvement'] as const).map((type) => ({
    type,
    amount: costs[type],
    width: `${(costs[type] * 100) / max}%`
  }))
})

const valid = computed(() => !!store.from && !!store.to && store.from <= store.to)

onMounted(() => void store.fetchReliability())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('maintenance.reliability.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('maintenance.reliability.subtitle') }}</p>
      </div>
      <form class="flex items-end gap-2" @submit.prevent="valid && store.fetchReliability()">
        <BaseFormField :label="t('maintenance.reliability.from')">
          <DateFormInput v-model="store.from" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.reliability.to')">
          <DateFormInput v-model="store.to" />
        </BaseFormField>
        <button
          type="submit"
          class="px-3 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 disabled:opacity-60"
          :disabled="!valid || store.loading"
        >
          {{ t('maintenance.reliability.apply') }}
        </button>
      </form>
    </header>

    <FormAlerts :error="store.error" />
    <LoadingSpinner v-if="store.loading && !store.reliability" :text="t('common.loading')" />

    <template v-if="store.reliability">
      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
          {{ t('maintenance.dashboard.workload.title') }}
        </h2>
        <dl class="grid grid-cols-3 gap-4 p-4 text-sm">
          <div v-for="key in ['inProgress', 'planned', 'late'] as const" :key="key">
            <dt class="text-muted-foreground">{{ t(`maintenance.dashboard.workload.${key}`) }}</dt>
            <dd
              class="text-2xl font-semibold tabular-nums"
              :class="key === 'late' && store.reliability.workload.late ? 'text-destructive' : ''"
            >
              {{ store.reliability.workload[key] }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          v-for="indicator in indicators"
          :key="indicator.key"
          class="bg-card border border-border rounded p-4"
        >
          <p class="text-xs text-muted-foreground">
            {{ t(`maintenance.reliability.kpi.${indicator.key}`) }}
          </p>
          <p class="text-2xl font-semibold text-card-foreground tabular-nums">
            {{ indicator.value }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ t(`maintenance.reliability.definition.${indicator.key}`) }}
          </p>
        </div>
      </section>
      <p class="text-xs text-muted-foreground">
        {{
          t('maintenance.reliability.basis', {
            failures: store.reliability.kpis.failures,
            km: formatNumber(store.reliability.kpis.fleetKm),
            days: formatNumber(store.reliability.kpis.lostDays, 1)
          })
        }}
      </p>

      <MaintenanceTargetsPanel
        :kpis="store.reliability.kpis"
        :preventive-completion="store.reliability.preventiveCompletion"
        :targets="store.reliability.targets"
      />

      <div class="grid gap-3 xl:grid-cols-2">
        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.costByType') }}
          </h2>
          <ul class="p-4 space-y-2 text-sm">
            <li v-for="bar in costBars" :key="bar.type">
              <div class="flex justify-between">
                <span>{{ optionsStore.getOptionLabel('maintenanceType', bar.type) }}</span>
                <span class="tabular-nums">{{ formatNumber(bar.amount) }}</span>
              </div>
              <div class="h-1.5 rounded bg-muted overflow-hidden">
                <div class="h-full rounded bg-primary" :style="{ width: bar.width }" />
              </div>
            </li>
          </ul>
        </section>

        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.lostByCause') }}
          </h2>
          <dl class="grid grid-cols-3 gap-4 p-4 text-sm">
            <div>
              <dt class="text-muted-foreground">
                {{ optionsStore.getOptionLabel('downtimeFamily', 'human') }}
              </dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{
                  t('maintenance.reliability.days', {
                    days: formatNumber(store.reliability.lostDaysByCause.human, 1)
                  })
                }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">
                {{ optionsStore.getOptionLabel('downtimeFamily', 'technical') }}
              </dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{
                  t('maintenance.reliability.days', {
                    days: formatNumber(store.reliability.lostDaysByCause.technical, 1)
                  })
                }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">{{ t('maintenance.reliability.lostRatio') }}</dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{ dash(store.reliability.lostDaysByCause.ratio, '', 2) }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.byMode') }}
          </h2>
          <p v-if="!store.reliability.byMode.length" class="p-4 text-sm text-muted-foreground">
            {{ t('maintenance.reliability.noFailure') }}
          </p>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="item in store.reliability.byMode"
              :key="item.name"
              class="px-4 py-2 flex justify-between"
            >
              <span>{{ item.name }}</span>
              <span class="tabular-nums">{{ item.count }}</span>
            </li>
          </ul>
        </section>

        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.byCause') }}
          </h2>
          <p v-if="!store.reliability.byCause.length" class="p-4 text-sm text-muted-foreground">
            {{ t('maintenance.reliability.noFailure') }}
          </p>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="item in store.reliability.byCause"
              :key="item.name"
              class="px-4 py-2 flex justify-between"
            >
              <span>{{ item.name }}</span>
              <span class="tabular-nums">{{ item.count }}</span>
            </li>
          </ul>
        </section>

        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.bySubsystem') }}
          </h2>
          <p v-if="!store.reliability.bySubsystem.length" class="p-4 text-sm text-muted-foreground">
            {{ t('maintenance.reliability.noFailure') }}
          </p>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="item in store.reliability.bySubsystem"
              :key="item.name"
              class="px-4 py-2 flex justify-between"
            >
              <span>{{ item.name }}</span>
              <span class="tabular-nums">{{ item.count }}</span>
            </li>
          </ul>
        </section>

        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.topVehicles') }}
          </h2>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="vehicle in store.reliability.topVehicles"
              :key="vehicle.plate"
              class="px-4 py-2 flex justify-between gap-3"
            >
              <span>{{ vehicle.plate }}</span>
              <span class="text-muted-foreground tabular-nums">
                {{
                  t('maintenance.reliability.vehicleLine', {
                    failures: vehicle.failures,
                    cost: formatNumber(vehicle.cost)
                  })
                }}
              </span>
            </li>
          </ul>
        </section>

        <section class="bg-card border border-border rounded">
          <h2 class="px-4 py-3 border-b border-border text-sm font-semibold">
            {{ t('maintenance.reliability.lostDays') }}
          </h2>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="item in store.reliability.lostDaysByFamily"
              :key="item.family"
              class="px-4 py-2 flex justify-between gap-3"
            >
              <span>{{ optionsStore.getOptionLabel('downtimeFamily', item.family) }}</span>
              <span class="text-muted-foreground tabular-nums">
                {{
                  t('maintenance.reliability.lostLine', {
                    days: formatNumber(item.days, 1),
                    cost: formatNumber(item.cost)
                  })
                }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
