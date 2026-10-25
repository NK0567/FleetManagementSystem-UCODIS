<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { PurchaseRequestStatus } from '../domain/purchaseRequest'

const props = defineProps<{ status: PurchaseRequestStatus }>()

const TONES: Record<PurchaseRequestStatus, StatusTone> = {
  requested: 'warning',
  ordered: 'info',
  received: 'success',
  cancelled: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('purchaseRequestStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
