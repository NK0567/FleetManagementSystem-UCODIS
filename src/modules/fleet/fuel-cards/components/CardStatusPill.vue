<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { CardStatus } from '../domain/fuelCard'

const props = defineProps<{ status: CardStatus }>()

const TONES: Record<CardStatus, StatusTone> = {
  active: 'success',
  blocked: 'danger',
  expired: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('cardStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
