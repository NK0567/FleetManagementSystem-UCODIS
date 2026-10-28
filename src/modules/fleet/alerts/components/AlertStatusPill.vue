<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { AlertStatus } from '../domain/alert'

const props = defineProps<{ status: AlertStatus }>()

const TONES: Record<AlertStatus, StatusTone> = {
  new: 'danger',
  acknowledged: 'warning',
  handled: 'success',
  resolved: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('alertStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
