<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { CompanyDocumentStatus } from '../types/companyDocument.types'

const props = defineProps<{ status: CompanyDocumentStatus }>()

const TONES: Record<CompanyDocumentStatus, StatusTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('companyDocumentStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
