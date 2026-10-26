<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { TelematicsEventStatus } from '../domain/telematicsEvent'

const props = defineProps<{ status: TelematicsEventStatus }>()

const TONES: Record<TelematicsEventStatus, StatusTone> = {
  new: 'warning',
  acknowledged: 'neutral',
  infraction: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('telematicsEventStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
