<script lang="ts" setup>
import { computed } from 'vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { ClaimStatus } from '../domain/claim'

const props = defineProps<{ status: ClaimStatus }>()

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('claimStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="status === 'open' ? 'warning' : 'neutral'" />
</template>
