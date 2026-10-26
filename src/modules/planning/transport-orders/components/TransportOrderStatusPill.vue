<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { TransportOrderStatus } from '../domain/transportOrder'

const props = defineProps<{ status: TransportOrderStatus }>()

const TONES: Record<TransportOrderStatus, StatusTone> = {
  draft: 'neutral',
  planned: 'info',
  confirmed: 'success',
  in_progress: 'warning',
  cancelled: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('transportOrderStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
