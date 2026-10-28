<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { OrgUnitStatus } from '../types/orgUnit.types'

const props = defineProps<{ status: OrgUnitStatus }>()

const TONES: Record<OrgUnitStatus, StatusTone> = {
  validated: 'success',
  pending_validation: 'warning'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('orgUnitStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
