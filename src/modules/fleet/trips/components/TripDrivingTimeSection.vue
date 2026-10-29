<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { drivingTimeService } from '../services/drivingTimeService'
import type { TripDrivingTimeApi } from '../types/drivingTime.types'
import DrivingBreachList from './DrivingBreachList.vue'

/** The driving time of the trip and the limits it breaks, read on the trip record. */
const props = defineProps<{ tripNo: string; refreshKey?: string }>()

const { t } = useI18n()
const open = ref(true)
const detail = ref<TripDrivingTimeApi | null>(null)
const error = ref<string | null>(null)

async function load() {
  error.value = null
  try {
    detail.value = await drivingTimeService.ofTrip(props.tripNo)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.trips.drivingTime.loadError'))
  }
}

watch(() => [props.tripNo, props.refreshKey], load, { immediate: true })

const duration = (minutes: number) =>
  t('fleet.trips.drivingTime.duration', {
    h: Math.floor(minutes / 60),
    m: String(minutes % 60).padStart(2, '0')
  })
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="open"
      :title="t('fleet.trips.drivingTime.title')"
      :summary="
        detail?.breaches.length
          ? [t('fleet.trips.drivingTime.breachCount', detail.breaches.length)]
          : []
      "
    >
      <div class="xl:col-span-2 min-w-0 space-y-2 text-sm" data-testid="trip-driving-time">
        <FormAlerts :error="error" @clear:error="error = null" />
        <template v-if="detail">
          <p class="text-card-foreground">
            {{
              t(`fleet.trips.drivingTime.driven.${detail.source}`, {
                duration: duration(detail.drivenMin)
              })
            }}
          </p>
          <DrivingBreachList v-if="detail.breaches.length" :breaches="detail.breaches" />
          <p v-else class="text-success">{{ t('fleet.trips.drivingTime.noBreach') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('fleet.trips.drivingTime.hint') }}</p>
        </template>
      </div>
    </FormSection>
  </div>
</template>
