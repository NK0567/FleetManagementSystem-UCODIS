<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { TripDebriefStatus } from '../domain/tripDebrief'

const props = defineProps<{ status: TripDebriefStatus }>()

const TONES: Record<TripDebriefStatus, StatusTone> = {
  draft: 'warning',
  partly_signed: 'info',
  signed: 'primary',
  closed: 'success'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('tripDebriefStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
