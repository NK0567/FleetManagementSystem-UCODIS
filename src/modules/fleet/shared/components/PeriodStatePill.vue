<script lang="ts" setup>
import { computed } from 'vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { PeriodState } from '../domain/period'

const props = defineProps<{ state: PeriodState }>()

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('periodState', props.state))
</script>

<template>
  <StatusPill :label="label" :tone="state === 'active' ? 'success' : 'neutral'" />
</template>
