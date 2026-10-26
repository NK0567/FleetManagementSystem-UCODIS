<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { DocumentState } from '../domain/document'

const props = defineProps<{ state: DocumentState }>()

const TONES: Record<DocumentState, StatusTone> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  cancelled: 'neutral',
  lost: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('documentState', props.state))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[state]" />
</template>
