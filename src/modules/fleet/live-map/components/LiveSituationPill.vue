<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { LiveSituation } from '../domain/livePosition'

const props = defineProps<{ situation: LiveSituation }>()

const TONES: Record<LiveSituation, StatusTone> = {
  moving: 'success',
  idling: 'primary',
  stopped: 'info',
  parked: 'neutral',
  immobilized: 'danger',
  signal_lost: 'warning'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('liveSituation', props.situation))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[situation]" />
</template>
