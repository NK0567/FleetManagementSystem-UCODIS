<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatNumber } from '@/utils/format'
import { useReliabilityStore } from '../stores/reliabilityStore'

const { t } = useI18n()
const store = useReliabilityStore()
const optionsStore = useOptionsStore()

const dash = (value: number | null, unit = '', digits = 0) =>
  value === null ? '—' : `${formatNumber(value, digits)}${unit}`

/** Each indicator with its definition, so a reader knows what is counted. */
const indicators = computed(() => {
  const kpis = store.reliability?.kpis
  if (!kpis) return []
  return [
    { key: 'mttrHours', value: dash(kpis.mttrHours, ' h', 1) },
    { key: 'mtbfKm', value: dash(kpis.mtbfKm, ' km') },
    { key: 'preventiveShare', value: dash(kpis.preventiveShare, ' %') },
    { key: 'costPerKm', value: dash(kpis.costPerKm, '', 2) },
    { key: 'availabilityRate', value: dash(kpis.availabilityRate, ' %', 1) },
    { key: 'totalCost', value: dash(kpis.totalCost) }
  ]
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
      <section class="grid grid-cols-2 xl:grid-cols-3 gap-3">
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

      <div class="grid gap-3 xl:grid-cols-2">
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
            {{ t('maintenance.reliability.modesAndCauses') }}
          </h2>
          <ul class="divide-y divide-border text-sm">
            <li
              v-for="item in [...store.reliability.byMode, ...store.reliability.byCause]"
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
