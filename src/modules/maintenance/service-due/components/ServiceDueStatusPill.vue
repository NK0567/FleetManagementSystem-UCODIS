<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { ServiceDueStatus } from '../domain/serviceDue'

const props = defineProps<{ status: ServiceDueStatus }>()

const TONES: Record<ServiceDueStatus, StatusTone> = {
  unknown: 'neutral',
  upcoming: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  blocking: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('serviceDueStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
