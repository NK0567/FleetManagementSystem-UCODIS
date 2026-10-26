<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DeliveryRequestStatus } from '../domain/deliveryRequest'

const props = defineProps<{ status: DeliveryRequestStatus }>()

const TONES: Record<DeliveryRequestStatus, StatusTone> = {
  pending: 'warning',
  planned: 'info',
  expired: 'danger',
  rejected: 'danger',
  cancelled: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('deliveryRequestStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
