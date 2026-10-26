<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { PolicyState } from '../domain/insurancePolicy'

const props = defineProps<{ state: PolicyState }>()

const TONES: Record<PolicyState, StatusTone> = {
  upcoming: 'info',
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  terminated: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('policyState', props.state))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[state]" />
</template>
