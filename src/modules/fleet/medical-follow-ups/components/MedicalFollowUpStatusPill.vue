<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { MedicalFollowUpStatus } from '../domain/medicalFollowUp'

const props = defineProps<{ status: MedicalFollowUpStatus }>()

const TONES: Record<MedicalFollowUpStatus, StatusTone> = {
  compliant: 'success',
  non_compliant: 'danger',
  pending: 'warning'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('medicalFollowUpStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
