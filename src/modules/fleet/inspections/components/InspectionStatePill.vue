<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { InspectionState } from '../domain/inspection'

const props = defineProps<{ state: InspectionState }>()

const TONES: Record<InspectionState, StatusTone> = {
  conforming: 'success',
  recheck_pending: 'warning',
  recheck_overdue: 'danger',
  rechecked: 'success'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('inspectionState', props.state))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[state]" />
</template>
