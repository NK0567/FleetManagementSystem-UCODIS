<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate, formatNumber } from '@/utils/format'
import { driverService } from '../services/driverService'
import type { DriverActivityApi } from '../types/driver.types'

const props = defineProps<{ driverNo: string }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()

const activity = ref<DriverActivityApi | null>(null)
const error = ref<string | null>(null)
/* Folded by default: their summary on the title says enough until the user opens one. */
const expandedSections = ref({ trips: false, fuel: false, compliance: false })

watch(
  () => props.driverNo,
  async (no) => {
    error.value = null
    try {
      activity.value = await driverService.activity(no)
    } catch (cause) {
      error.value = apiErrorMessage(cause, t('fleet.drivers.activity.loadError'))
    }
  },
  { immediate: true }
)

const label = (set: string, value: string) => optionsStore.getOptionLabel(set, value)
const card = (path: string, no: string) => ({ path, query: { no, cardMode: 'view' } })
const router = useRouter()
const openCard = (path: string, row: Record<string, unknown>) =>
  void router.push(card(path, String(row.no)))

const tripColumns = computed<SubListColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.drivers.activity.col.trip') },
  { sortKey: 'routeName', label: t('fleet.drivers.activity.col.route'), filter: true },
  { sortKey: 'vehiclePlate', label: t('fleet.drivers.activity.col.vehicle'), filter: true },
  {
    sortKey: 'plannedDeparture',
    label: t('fleet.drivers.activity.col.departure'),
    formatter: (v) => formatDate(v as string | null)
  },
  {
    sortKey: 'status',
    label: t('fleet.drivers.activity.col.status'),
    formatter: (v) => label('tripStatus', String(v)),
    filter: true
  },
  {
    sortKey: 'distanceKm',
    label: t('fleet.drivers.activity.col.distance'),
    align: 'right',
    formatter: (v) => (v === null ? '' : `${formatNumber(Number(v))} km`)
  }
])
const refillColumns = computed<SubListColumn[]>(() => [
  { sortKey: 'no', label: t('fleet.drivers.activity.col.refill') },
  {
    sortKey: 'refueledAt',
    label: t('fleet.drivers.activity.col.date'),
    formatter: (v) => formatDate(v as string | null)
  },
  { sortKey: 'vehiclePlate', label: t('fleet.drivers.activity.col.vehicle'), filter: true },
  {
    sortKey: 'liters',
    label: t('fleet.drivers.activity.col.liters'),
    align: 'right',
    formatter: (v) => `${formatNumber(Number(v))} L`
  },
  {
    sortKey: 'amount',
    label: t('fleet.drivers.activity.col.amount'),
    align: 'right',
    formatter: (v) => formatNumber(Number(v))
  },
  {
    sortKey: 'status',
    label: t('fleet.drivers.activity.col.status'),
    formatter: (v) => label('refillStatus', String(v)),
    filter: true
  }
])
</script>

<template>
  <FormAlerts :error="error" @clear:error="error = null" />
  <template v-if="activity">
    <FormSection
      v-model:open="expandedSections.trips"
      :title="t('fleet.drivers.section.trips')"
      :summary="[
        t('fleet.drivers.activity.tripsSummary', {
          trips: activity.tripsFinished,
          km: formatNumber(activity.kmDriven),
          days: activity.periodDays
        })
      ]"
    >
      <div class="xl:col-span-2 min-w-0">
        <RecordSubList
          :rows="activity.trips as unknown as Record<string, unknown>[]"
          :columns="tripColumns"
          row-key="no"
          :empty-text="t('fleet.drivers.activity.noTrip')"
          :initial-sort="{ key: 'plannedDeparture', direction: 'DESC' }"
          clickable
          @row-click="(row: Record<string, unknown>) => openCard('/fleet/trips', row)"
        >
          <template #cell-no="{ text }">
            <span class="text-primary">{{ text }}</span>
          </template>
        </RecordSubList>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.fuel"
      :title="t('fleet.drivers.section.fuel')"
      :summary="[
        t('fleet.drivers.activity.fuelSummary', {
          liters: formatNumber(activity.litersRefueled),
          anomalies: activity.refillAnomalies,
          days: activity.periodDays
        })
      ]"
    >
      <div class="xl:col-span-2 min-w-0">
        <RecordSubList
          :rows="activity.refills as unknown as Record<string, unknown>[]"
          :columns="refillColumns"
          row-key="no"
          :empty-text="t('fleet.drivers.activity.noRefill')"
          :initial-sort="{ key: 'refueledAt', direction: 'DESC' }"
          clickable
          @row-click="(row: Record<string, unknown>) => openCard('/fleet/fuel-refills', row)"
        >
          <template #cell-no="{ text }">
            <span class="text-primary">{{ text }}</span>
          </template>
        </RecordSubList>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.compliance"
      :title="t('fleet.drivers.section.compliance')"
      :summary="[]"
    >
      <div class="space-y-2 min-w-0 text-sm">
        <h3 class="text-xs font-semibold text-muted-foreground">
          {{ t('fleet.drivers.activity.deviations') }}
        </h3>
        <p v-if="!activity.deviations.length" class="text-muted-foreground">
          {{ t('fleet.drivers.activity.none') }}
        </p>
        <ul v-else class="space-y-1">
          <li v-for="deviation in activity.deviations" :key="deviation.no">
            <RouterLink
              :to="card('/fleet/route-deviations', deviation.no)"
              class="text-primary hover:underline"
            >
              {{ deviation.deviationTypeName }}
            </RouterLink>
            · {{ formatDate(deviation.detectedAt) }} ·
            {{ label('deviationNature', deviation.nature) }}
          </li>
        </ul>
        <h3 class="text-xs font-semibold text-muted-foreground pt-2">
          {{ t('fleet.drivers.activity.infractions') }}
        </h3>
        <p v-if="!activity.infractions.length" class="text-muted-foreground">
          {{ t('fleet.drivers.activity.none') }}
        </p>
        <ul v-else class="space-y-1">
          <li v-for="infraction in activity.infractions" :key="infraction.no">
            <RouterLink
              :to="card('/fleet/infractions', infraction.no)"
              class="text-primary hover:underline"
            >
              {{ infraction.infractionTypeName }}
            </RouterLink>
            · {{ formatDate(infraction.occurredAt) }} ·
            {{ label('infractionStatus', infraction.status) }}
          </li>
        </ul>
      </div>
      <div class="space-y-2 min-w-0 text-sm">
        <h3 class="text-xs font-semibold text-muted-foreground">
          {{ t('fleet.drivers.activity.trainings') }}
        </h3>
        <p v-if="!activity.trainings.length" class="text-muted-foreground">
          {{ t('fleet.drivers.activity.none') }}
        </p>
        <ul v-else class="space-y-1">
          <li v-for="training in activity.trainings" :key="training.no">
            <RouterLink
              :to="card('/fleet/trainings', training.no)"
              class="text-primary hover:underline"
            >
              {{ training.topic }}
            </RouterLink>
            · {{ label('trainingStatus', training.status) }}
            <template v-if="training.plannedOn"> · {{ formatDate(training.plannedOn) }}</template>
          </li>
        </ul>
      </div>
    </FormSection>
  </template>
</template>
