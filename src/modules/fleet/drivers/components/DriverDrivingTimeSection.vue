<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import DrivingBreachList from '@/modules/fleet/trips/components/DrivingBreachList.vue'
import { drivingTimeService } from '@/modules/fleet/trips/services/drivingTimeService'
import type { DriverDrivingTimeApi } from '@/modules/fleet/trips/types/drivingTime.types'
import { formatDateTime } from '@/utils/format'

/** The driving-time breaches of the driver's recent trips, on the driver record. */
const props = defineProps<{ driverNo: string }>()

const { t } = useI18n()
const open = ref(true)
const detail = ref<DriverDrivingTimeApi | null>(null)
const error = ref<string | null>(null)

async function load() {
  error.value = null
  try {
    detail.value = await drivingTimeService.ofDriver(props.driverNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.trips.drivingTime.loadError'))
  }
}

watch(() => props.driverNo, load, { immediate: true })
</script>

<template>
  <FormSection
    v-model:open="open"
    :title="t('fleet.drivers.section.drivingTime')"
    :summary="
      detail?.trips.length ? [t('fleet.trips.drivingTime.tripCount', detail.trips.length)] : []
    "
  >
    <div class="xl:col-span-2 min-w-0 space-y-3 text-sm" data-testid="driver-driving-time">
      <FormAlerts :error="error" @clear:error="error = null" />
      <template v-if="detail">
        <p v-if="!detail.trips.length" class="text-success">
          {{ t('fleet.trips.drivingTime.driverClean', { days: detail.periodDays }) }}
        </p>
        <div v-for="trip in detail.trips" :key="trip.tripNo" class="space-y-1">
          <RouterLink
            :to="{ path: '/fleet/trips', query: { no: trip.tripNo, cardMode: 'view' } }"
            class="font-medium text-primary hover:underline"
          >
            {{ trip.tripNo }}
          </RouterLink>
          <span class="text-xs text-muted-foreground">
            · {{ formatDateTime(trip.plannedDeparture) }} ·
            {{ t(`fleet.trips.drivingTime.source.${trip.source}`) }}
          </span>
          <DrivingBreachList :breaches="trip.breaches" />
        </div>
      </template>
    </div>
  </FormSection>
</template>
