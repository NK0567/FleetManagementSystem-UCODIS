<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { TyreStatus } from '../domain/tyre'

const props = defineProps<{ status: TyreStatus }>()

const TONES: Record<TyreStatus, StatusTone> = {
  stock: 'neutral',
  mounted: 'success',
  retreading: 'info',
  scrapped: 'danger'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('tyreStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
