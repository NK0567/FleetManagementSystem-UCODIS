<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DriverReportStatus } from '../domain/driverReport'

const props = defineProps<{ status: DriverReportStatus }>()

const TONES: Record<DriverReportStatus, StatusTone> = {
  open: 'warning',
  in_progress: 'info',
  closed: 'success'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('driverReportStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
