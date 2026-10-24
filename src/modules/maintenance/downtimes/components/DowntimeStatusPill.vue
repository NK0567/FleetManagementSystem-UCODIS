<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DowntimeStatus } from '../domain/downtime'

const props = defineProps<{ status: DowntimeStatus }>()

const TONES: Record<DowntimeStatus, StatusTone> = {
  open: 'warning',
  closed: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('downtimeStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
