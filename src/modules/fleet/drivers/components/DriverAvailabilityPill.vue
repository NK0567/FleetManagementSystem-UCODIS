<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DriverAvailability } from '../domain/driver'

const props = defineProps<{ availability: DriverAvailability }>()

const TONES: Record<DriverAvailability, StatusTone> = {
  available: 'success',
  on_trip: 'info',
  trip_planned: 'info',
  on_leave: 'warning',
  unavailable: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('driverAvailability', props.availability))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[availability]" />
</template>
