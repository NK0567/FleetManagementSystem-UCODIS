<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { InsuranceStatus } from '../domain/claim'

const props = defineProps<{ status: InsuranceStatus }>()

const TONES: Record<InsuranceStatus, StatusTone> = {
  not_declared: 'neutral',
  declared: 'info',
  assessment: 'warning',
  accepted: 'success',
  refused: 'danger',
  settled: 'success'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('claimInsuranceStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
