<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { StockStatus } from '../domain/stock'

const props = defineProps<{ status: StockStatus }>()

const TONES: Record<StockStatus, StatusTone> = {
  available: 'success',
  low: 'warning',
  out: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('stockStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
