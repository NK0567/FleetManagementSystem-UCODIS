<script lang="ts" setup>
import { computed } from 'vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { useOptionsStore } from '@/stores/optionsStore'
import type { InfractionStatus } from '../domain/infraction'

const props = defineProps<{ status: InfractionStatus }>()

const TONES: Record<InfractionStatus, StatusTone> = {
  new: 'danger',
  in_progress: 'warning',
  closed: 'neutral'
}

const optionsStore = useOptionsStore()
const label = computed(() => optionsStore.getOptionLabel('infractionStatus', props.status))
</script>

<template>
  <StatusPill :label="label" :tone="TONES[status]" />
</template>
