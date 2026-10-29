<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/format'
import type { DrivingBreach } from '../domain/drivingTime'

/** The driving-time limits a trip breaks, one line each. */
defineProps<{ breaches: DrivingBreach[] }>()

const { t } = useI18n()
const duration = (minutes: number) =>
  t('fleet.trips.drivingTime.duration', {
    h: Math.floor(minutes / 60),
    m: String(minutes % 60).padStart(2, '0')
  })
</script>

<template>
  <ul class="space-y-1">
    <li
      v-for="breach in breaches"
      :key="`${breach.code}-${breach.day ?? ''}`"
      class="text-sm text-destructive"
    >
      {{
        t(`fleet.trips.drivingTime.breach.${breach.code}`, {
          driven: duration(breach.drivenMin),
          limit: duration(breach.limitMin),
          day: breach.day ? formatDate(breach.day) : ''
        })
      }}
    </li>
  </ul>
</template>
