<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { TrainingStatus } from '../domain/training'

const props = defineProps<{ status: TrainingStatus }>()

const TONES: Record<TrainingStatus, StatusTone> = {
  to_plan: 'warning',
  planned: 'info',
  attended: 'success',
  cancelled: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('trainingStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
