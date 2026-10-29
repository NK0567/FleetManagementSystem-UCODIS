<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@/utils/format'
import type { TransportOrderLineApi } from '../types/transportOrder.types'

/**
 * The deliveries contested by their recipient, on the order card (TRS04-US03): the driver's
 * declaration, the contest with its date and reason, and how the planner handled it. A note
 * is required to mark it handled; until then the order cannot be completed.
 */
const props = defineProps<{
  lines: TransportOrderLineApi[]
  canHandle?: boolean
  busy?: boolean
  error?: string | null
}>()
const emit = defineEmits<{ handle: [line: TransportOrderLineApi, note: string] }>()
const { t } = useI18n()

const contested = computed(() => props.lines.filter((line) => line.receptionContestedAt))
const handling = ref<number | null>(null)
const note = ref('')

function start(line: TransportOrderLineApi) {
  handling.value = line.lineNo
  note.value = ''
}
function send(line: TransportOrderLineApi) {
  emit('handle', line, note.value.trim())
}
defineExpose({ done: () => (handling.value = null) })
</script>

<template>
  <div class="xl:col-span-2 min-w-0 space-y-2">
    <FormAlerts :error="error ?? null" />
    <div
      v-for="line in contested"
      :key="line.lineNo"
      class="rounded border px-3 py-2 text-sm space-y-1"
      :class="line.contestHandledAt ? 'border-border' : 'border-destructive/40 bg-destructive/5'"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="font-medium text-card-foreground">
          {{ t('planning.transportOrders.disputes.line', { no: line.lineNo }) }} ·
          {{ line.recipientName }} · {{ line.productName }}
        </p>
        <StatusPill
          :label="
            line.contestHandledAt
              ? t('planning.transportOrders.disputes.handled')
              : t('planning.transportOrders.disputes.open')
          "
          :tone="line.contestHandledAt ? 'success' : 'warning'"
        />
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.disputes.declared') }}</dt>
        <dd>{{ formatDateTime(line.declaredAt) }}</dd>
        <dt class="text-muted-foreground">
          {{ t('planning.transportOrders.disputes.contested') }}
        </dt>
        <dd>{{ formatDateTime(line.receptionContestedAt) }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.disputes.reason') }}</dt>
        <dd>
          {{ line.contestReasonName || '·' }}
          <span v-if="line.contestComment" class="text-muted-foreground">
            · {{ line.contestComment }}
          </span>
        </dd>
        <template v-if="line.contestHandledAt">
          <dt class="text-muted-foreground">
            {{ t('planning.transportOrders.disputes.outcome') }}
          </dt>
          <dd>
            {{ line.contestNote }}
            <span class="text-muted-foreground">
              · {{ line.contestHandledBy }}, {{ formatDateTime(line.contestHandledAt) }}
            </span>
          </dd>
        </template>
      </dl>
      <template v-if="!line.contestHandledAt && canHandle">
        <div v-if="handling === line.lineNo" class="space-y-2 pt-1">
          <BaseFormField :label="t('planning.transportOrders.disputes.note')" required>
            <FormInput v-model="note" :maxlength="300" />
            <p class="text-xs text-muted-foreground mt-1">
              {{ t('planning.transportOrders.disputes.noteHint') }}
            </p>
          </BaseFormField>
          <div class="flex gap-2">
            <button
              type="button"
              class="cursor-pointer px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-60"
              :disabled="busy || !note.trim()"
              @click="send(line)"
            >
              {{ t('planning.transportOrders.disputes.markHandled') }}
            </button>
            <button
              type="button"
              class="cursor-pointer px-3 py-1.5 rounded border border-border text-sm hover:bg-accent"
              @click="handling = null"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
        <button
          v-else
          type="button"
          class="cursor-pointer px-3 py-1.5 rounded border border-border text-sm hover:bg-accent"
          :disabled="busy"
          @click="start(line)"
        >
          {{ t('planning.transportOrders.disputes.handle') }}
        </button>
      </template>
    </div>
  </div>
</template>
