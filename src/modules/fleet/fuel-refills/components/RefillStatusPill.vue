<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { RefillStatus } from '../domain/refill'

const props = defineProps<{ status: RefillStatus }>()

const TONES: Record<RefillStatus, StatusTone> = {
  valid: 'success',
  anomaly: 'danger',
  qualified: 'info'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('refillStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
