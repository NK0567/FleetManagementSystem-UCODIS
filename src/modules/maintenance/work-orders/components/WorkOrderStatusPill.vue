<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { WorkOrderStatus } from '../domain/workOrder'

const props = defineProps<{ status: WorkOrderStatus }>()

const TONES: Record<WorkOrderStatus, StatusTone> = {
  open: 'warning',
  diagnosed: 'warning',
  in_progress: 'info',
  awaiting_validation: 'info',
  closed: 'success',
  cancelled: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('workOrderStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
