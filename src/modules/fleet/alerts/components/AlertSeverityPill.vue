<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { AlertSeverity } from '../domain/alert'

const props = defineProps<{ severity: AlertSeverity }>()

const TONES: Record<AlertSeverity, StatusTone> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('alertSeverity', props.severity))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[severity]" />
</template>
