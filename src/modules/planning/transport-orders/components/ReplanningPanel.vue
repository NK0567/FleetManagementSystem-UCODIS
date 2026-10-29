<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarCheck, CalendarClock, CalendarPlus, ExternalLink } from '@lucide/vue'
import { addDays, todayIso } from '@/utils/date'
import { formatDate, formatNumber } from '@/utils/format'
import { replanCandidate, type ReplanCandidate } from '../domain/replanning'
import type { TransportOrderLineApi } from '../types/transportOrder.types'

/**
 * The lines that left the order and wait for a new date (TRS01-US16, US17, TRS03-US13): what was
 * not delivered or was postponed on site (« reliquats »), and the recipients unavailable before
 * loading. A retained date takes the line into the pending order of that day.
 */
const props = defineProps<{
  lines: TransportOrderLineApi[]
  canReplan: boolean
  busy: boolean
}>()
const emit = defineEmits<{
  replan: [line: TransportOrderLineApi, date: string | null]
  propose: [line: TransportOrderLineApi, date: string]
}>()

const { t } = useI18n()

interface Row {
  line: TransportOrderLineApi
  candidate: ReplanCandidate
}

const rows = computed<Row[]>(() =>
  props.lines
    .map((line) => ({ line, candidate: replanCandidate(line) }))
    .filter((row): row is Row => row.candidate !== null)
)
const remainders = computed(() => rows.value.filter((row) => row.candidate.kind !== 'unavailable'))
const unavailable = computed(() => rows.value.filter((row) => row.candidate.kind === 'unavailable'))
const replanned = computed(() => props.lines.filter((line) => line.replannedToOrderNo))

const reasonOf = (row: Row) => {
  if (row.candidate.kind === 'postponed') {
    return row.line.postponementReasonName || t('planning.transportOrders.replan.postponed')
  }
  if (row.candidate.kind === 'refused') {
    return row.line.returnReasonName || t('planning.transportOrders.replan.refused')
  }
  return row.line.undeliveredReasonName || t('planning.transportOrders.replan.partial')
}

const dating = ref<{ row: Row; mode: 'replan' | 'propose' } | null>(null)
const date = ref('')
function open(row: Row, mode: 'replan' | 'propose') {
  date.value =
    (mode === 'replan' ? row.candidate.recipientDate : row.candidate.plannerDate) ??
    addDays(todayIso(), 1)
  dating.value = { row, mode }
}
function confirm() {
  const current = dating.value
  if (!current || !date.value) return
  if (current.mode === 'replan') emit('replan', current.row.line, date.value)
  else emit('propose', current.row.line, date.value)
  dating.value = null
}
const orderLink = (no: string) => ({
  path: '/planning/transport-orders',
  query: { no, cardMode: 'view' }
})

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <div class="xl:col-span-2 min-w-0 space-y-5 text-sm">
    <div>
      <h3 class="font-semibold text-card-foreground mb-1">
        {{ t('planning.transportOrders.replan.remaindersTitle') }}
      </h3>
      <p class="text-xs text-muted-foreground mb-2">
        {{ t('planning.transportOrders.replan.remaindersHint') }}
      </p>
      <p v-if="!remainders.length" class="text-muted-foreground">
        {{ t('planning.transportOrders.replan.none') }}
      </p>
      <table v-else class="w-full border border-border rounded">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.lines.col.point') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.lines.col.product') }}
            </th>
            <th class="px-3 py-2 text-right font-semibold">
              {{ t('planning.transportOrders.replan.left') }}
            </th>
            <th class="px-3 py-2 text-right font-semibold">
              {{ t('planning.transportOrders.replan.weight') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.replan.reason') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.replan.availableOn') }}
            </th>
            <th v-if="canReplan" class="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in remainders" :key="row.line.lineNo" class="border-t border-border">
            <td class="px-3 py-2">
              <p>{{ row.line.recipientName || row.line.deliveryPointName }}</p>
              <p class="text-xs text-muted-foreground">{{ row.line.deliveryPointName }}</p>
            </td>
            <td class="px-3 py-2">{{ row.line.productName }}</td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(row.candidate.quantity, 1) }} {{ row.line.unit }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{
                row.candidate.weightKg === null
                  ? ''
                  : `${formatNumber(row.candidate.weightKg, 0)} kg`
              }}
            </td>
            <td class="px-3 py-2">
              <p>{{ reasonOf(row) }}</p>
              <p
                v-if="row.line.warehouseConforming === false"
                class="text-xs text-amber-700 dark:text-amber-400"
              >
                {{
                  t('planning.transportOrders.replan.returnNonconforming', {
                    reason: row.line.returnNonconformityReasonName || '-'
                  })
                }}
              </p>
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              {{ row.candidate.recipientDate ? formatDate(row.candidate.recipientDate) : '' }}
            </td>
            <td v-if="canReplan" class="px-3 py-2 text-right">
              <button
                type="button"
                :class="buttonClass"
                :disabled="busy"
                @click="open(row, 'replan')"
              >
                <CalendarPlus class="w-3.5 h-3.5 text-primary" />
                {{ t('planning.transportOrders.replan.choose') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <h3 class="font-semibold text-card-foreground mb-1">
        {{ t('planning.transportOrders.replan.unavailableTitle') }}
      </h3>
      <p class="text-xs text-muted-foreground mb-2">
        {{ t('planning.transportOrders.replan.unavailableHint') }}
      </p>
      <p v-if="!unavailable.length" class="text-muted-foreground">
        {{ t('planning.transportOrders.replan.none') }}
      </p>
      <table v-else class="w-full border border-border rounded">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.lines.col.point') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.replan.reason') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.replan.recipientDate') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.replan.plannerDate') }}
            </th>
            <th v-if="canReplan" class="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in unavailable" :key="row.line.lineNo" class="border-t border-border">
            <td class="px-3 py-2">
              <p>{{ row.line.recipientName || row.line.deliveryPointName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ row.line.productName }} · {{ formatNumber(row.line.quantity, 1) }}
                {{ row.line.unit }}
              </p>
            </td>
            <td class="px-3 py-2">{{ row.line.unavailabilityReasonName }}</td>
            <td class="px-3 py-2 whitespace-nowrap">
              {{
                row.candidate.recipientDate
                  ? formatDate(row.candidate.recipientDate)
                  : t('planning.transportOrders.replan.noDate')
              }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <template v-if="row.candidate.plannerDate">
                {{ formatDate(row.candidate.plannerDate) }}
                <span class="block text-xs text-warning">
                  {{ t('planning.transportOrders.replan.awaitsRecipient') }}
                </span>
              </template>
            </td>
            <td v-if="canReplan" class="px-3 py-2">
              <div class="flex flex-wrap justify-end gap-1">
                <button
                  v-if="row.candidate.recipientDate"
                  type="button"
                  :class="buttonClass"
                  :disabled="busy"
                  @click="emit('replan', row.line, null)"
                >
                  <CalendarCheck class="w-3.5 h-3.5 text-primary" />
                  {{ t('planning.transportOrders.replan.accept') }}
                </button>
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="busy"
                  @click="open(row, 'propose')"
                >
                  <CalendarClock class="w-3.5 h-3.5 text-primary" />
                  {{
                    row.candidate.recipientDate
                      ? t('planning.transportOrders.replan.counter')
                      : t('planning.transportOrders.replan.propose')
                  }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="replanned.length">
      <h3 class="font-semibold text-card-foreground mb-2">
        {{ t('planning.transportOrders.replan.doneTitle') }}
      </h3>
      <ul class="space-y-1">
        <li v-for="line in replanned" :key="line.lineNo" class="flex flex-wrap items-center gap-2">
          <span>{{ line.recipientName || line.deliveryPointName }} · {{ line.productName }}</span>
          <span class="text-muted-foreground">
            {{
              t('planning.transportOrders.replan.doneOn', { date: formatDate(line.replannedOn) })
            }}
          </span>
          <RouterLink
            :to="orderLink(line.replannedToOrderNo!)"
            class="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink class="w-3.5 h-3.5" /> {{ line.replannedToOrderNo }}
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>

  <ConfirmDialog
    :open="!!dating"
    :title="
      dating?.mode === 'propose'
        ? t('planning.transportOrders.replan.proposeTitle')
        : t('planning.transportOrders.replan.chooseTitle')
    "
    :confirm-disabled="!date"
    :loading="busy"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dating = null"
  >
    <BaseFormField :label="t('planning.transportOrders.replan.date')" required>
      <DateFormInput v-model="date" />
    </BaseFormField>
    <p class="text-xs text-muted-foreground mt-2">
      {{
        dating?.mode === 'propose'
          ? t('planning.transportOrders.replan.proposeHint')
          : t('planning.transportOrders.replan.chooseHint')
      }}
    </p>
  </ConfirmDialog>
</template>
