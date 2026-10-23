<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { VehicleStatus } from '../types/vehicle.types'

const props = defineProps<{ status: VehicleStatus }>()

const TONES: Record<VehicleStatus, StatusTone> = {
  available: 'success',
  assigned: 'info',
  in_mission: 'info',
  immobilized: 'warning',
  out_of_service: 'danger',
  removed: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('vehicleStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
