<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { FuelGapStatus } from '../domain/consumption'

const props = defineProps<{ status: FuelGapStatus }>()

const TONES: Record<FuelGapStatus, StatusTone> = {
  normal: 'success',
  to_qualify: 'danger',
  qualified: 'warning',
  deduction_proposed: 'warning',
  deduction_approved: 'info',
  deduction_rejected: 'neutral',
  dismissed: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('fuelGapStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
