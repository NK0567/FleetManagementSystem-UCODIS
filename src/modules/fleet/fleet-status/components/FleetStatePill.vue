<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { FleetState } from '../domain/fleetState'

const props = defineProps<{ state: FleetState }>()

const TONES: Record<FleetState, StatusTone> = {
  AVAILABLE: 'success',
  TRIP_PLANNED: 'primary',
  TO_LOADING: 'info',
  TO_DELIVERY: 'info',
  RETURNING: 'info',
  IMMOBILIZED: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('fleetState', props.state))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[state]" />
</template>
