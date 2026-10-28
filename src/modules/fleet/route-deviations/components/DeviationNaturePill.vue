<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DeviationNature } from '../domain/routeDeviation'

const props = defineProps<{ nature: DeviationNature }>()

const TONES: Record<DeviationNature, StatusTone> = {
  to_qualify: 'warning',
  authorized: 'success',
  endured: 'info',
  unjustified: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('deviationNature', props.nature))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[nature]" />
</template>
