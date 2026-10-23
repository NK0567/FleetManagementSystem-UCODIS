<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { TripStatus } from '../domain/trip'

const props = defineProps<{ status: TripStatus }>()

const TONES: Record<TripStatus, StatusTone> = {
  planned: 'info',
  in_progress: 'info',
  completed: 'warning',
  closed: 'success',
  cancelled: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('tripStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
