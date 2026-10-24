<script lang="ts" setup>
import { ref, watch } from 'vue'
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
const expandedSections = ref({ trips: true, fuel: true, compliance: true })

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
        <p v-if="!activity.trips.length" class="text-sm text-muted-foreground">
          {{ t('fleet.drivers.activity.noTrip') }}
        </p>
        <table v-else class="w-full text-sm border border-border rounded">
          <tbody>
            <tr
              v-for="trip in activity.trips"
              :key="trip.no"
              class="border-t border-border first:border-t-0"
            >
              <td class="px-3 py-1.5 whitespace-nowrap">
                <RouterLink
                  :to="card('/fleet/trips', trip.no)"
                  class="text-primary hover:underline"
                >
                  {{ trip.no }}
                </RouterLink>
              </td>
              <td class="px-3 py-1.5">{{ trip.routeName }}</td>
              <td class="px-3 py-1.5">{{ trip.vehiclePlate }}</td>
              <td class="px-3 py-1.5">{{ formatDate(trip.plannedDeparture) }}</td>
              <td class="px-3 py-1.5">{{ label('tripStatus', trip.status) }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">
                {{ trip.distanceKm === null ? '' : `${formatNumber(trip.distanceKm)} km` }}
              </td>
            </tr>
          </tbody>
        </table>
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
        <p v-if="!activity.refills.length" class="text-sm text-muted-foreground">
          {{ t('fleet.drivers.activity.noRefill') }}
        </p>
        <table v-else class="w-full text-sm border border-border rounded">
          <tbody>
            <tr
              v-for="refill in activity.refills"
              :key="refill.no"
              class="border-t border-border first:border-t-0"
            >
              <td class="px-3 py-1.5 whitespace-nowrap">
                <RouterLink
                  :to="card('/fleet/fuel-refills', refill.no)"
                  class="text-primary hover:underline"
                >
                  {{ refill.no }}
                </RouterLink>
              </td>
              <td class="px-3 py-1.5">{{ formatDate(refill.refueledAt) }}</td>
              <td class="px-3 py-1.5">{{ refill.vehiclePlate }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">
                {{ formatNumber(refill.liters) }} L
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ formatNumber(refill.amount) }}</td>
              <td class="px-3 py-1.5">{{ label('refillStatus', refill.status) }}</td>
            </tr>
          </tbody>
        </table>
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
