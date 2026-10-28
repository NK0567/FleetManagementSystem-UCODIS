<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@/utils/format'
import type { TransportOrderEventApi } from '../types/transportOrder.types'

const props = defineProps<{ events: TransportOrderEventApi[] }>()

const { t } = useI18n()

const latestFirst = computed(() => [...props.events].reverse())
</script>

<template>
  <p v-if="!events.length" class="text-sm text-muted-foreground">
    {{ t('planning.transportOrders.history.empty') }}
  </p>
  <ol v-else class="border-l border-border ml-1.5 space-y-3">
    <li
      v-for="(event, index) in latestFirst"
      :key="`${event.at}-${event.kind}-${index}`"
      class="relative pl-5 text-sm"
    >
      <span
        class="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary"
      />
      <p class="font-medium text-card-foreground">
        {{ t(`planning.transportOrders.history.${event.kind}`) }}
        <span v-if="event.detail" class="font-normal text-muted-foreground">
          · {{ event.detail }}
        </span>
      </p>
      <p class="text-xs text-muted-foreground">{{ formatDateTime(event.at) }} · {{ event.by }}</p>
    </li>
  </ol>
</template>
