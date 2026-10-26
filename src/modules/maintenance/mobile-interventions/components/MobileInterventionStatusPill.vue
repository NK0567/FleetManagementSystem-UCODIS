<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { MobileInterventionStatus } from '../domain/mobileIntervention'

const props = defineProps<{ status: MobileInterventionStatus }>()

const TONES: Record<MobileInterventionStatus, StatusTone> = {
  en_route: 'warning',
  on_site: 'info',
  resolved: 'success',
  unresolved: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('mobileInterventionStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
