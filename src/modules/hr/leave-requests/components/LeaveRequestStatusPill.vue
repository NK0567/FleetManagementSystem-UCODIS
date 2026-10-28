<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { LeaveRequestStatus } from '../domain/leaveRequestStatus'

const props = defineProps<{ status: LeaveRequestStatus }>()

const TONES: Record<LeaveRequestStatus, StatusTone> = {
  pending: 'warning',
  approved: 'success',
  sent_back: 'info',
  rejected: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('leaveRequestStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
