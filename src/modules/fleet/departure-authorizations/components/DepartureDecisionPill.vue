<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DepartureDecision } from '../domain/departure'

const props = defineProps<{ decision: DepartureDecision }>()

const TONES: Record<DepartureDecision, StatusTone> = {
  pending: 'warning',
  granted: 'success',
  refused: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('departureDecision', props.decision))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[decision]" />
</template>
