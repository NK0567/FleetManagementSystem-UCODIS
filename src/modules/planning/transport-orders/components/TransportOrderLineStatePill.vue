<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import type { OrderLineState } from '../domain/transportOrder'

defineProps<{ state: OrderLineState }>()

const TONES: Record<OrderLineState, StatusTone> = {
  pending: 'neutral',
  not_loaded: 'danger',
  declared: 'success',
  refused: 'danger',
  postponed: 'warning',
  returned: 'warning',
  handed_back: 'info'
}

const { t } = useI18n()
</script>

<template>
  <StatusPill :label="t(`planning.transportOrders.lines.state.${state}`)" :tone="TONES[state]" />
</template>
