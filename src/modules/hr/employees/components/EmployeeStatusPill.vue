<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { EmployeeStatus } from '../types/employee.types'

const props = defineProps<{ status: EmployeeStatus }>()

const TONES: Record<EmployeeStatus, StatusTone> = {
  active: 'success',
  on_leave: 'info',
  suspended: 'warning',
  contract_ended: 'neutral',
  archived: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('employeeStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
