<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Printer } from '@lucide/vue'
import { printElement } from '@/utils/printElement'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { DeliveryNoteApi } from '../types/deliveryNote.types'

/**
 * The electronic delivery note as the recipient and the planner read it (TRS05-US03): what
 * was delivered, the lines not delivered with their reason, and the signature, which is the
 * recipient's name once he confirms; until then it awaits his confirmation.
 */
const props = defineProps<{ note: DeliveryNoteApi; printable?: boolean }>()
const { t } = useI18n()
const root = ref<HTMLElement | null>(null)
const print = () =>
  printElement(root.value, `${t('planning.deliveryNote.title')} ${props.note.orderNo}`)
</script>

<template>
  <div ref="root" class="rounded border border-border text-sm text-card-foreground">
    <div
      class="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 border-b border-border"
    >
      <p class="font-semibold">{{ t('planning.deliveryNote.title') }}</p>
      <p class="text-xs text-muted-foreground">
        {{ note.orderNo }} ·
        {{
          note.openedAt
            ? t('planning.deliveryNote.openedAt', { at: formatDateTime(note.openedAt) })
            : t('planning.deliveryNote.plannedHint')
        }}
        <button
          v-if="printable"
          type="button"
          class="print-hide cursor-pointer inline-flex items-center gap-1 ml-2 text-primary hover:underline"
          @click="print"
        >
          <Printer class="w-3.5 h-3.5" /> {{ t('planning.pickup.print') }}
        </button>
      </p>
    </div>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-3 py-2 text-xs">
      <dt class="text-muted-foreground">{{ t('planning.deliveryNote.recipient') }}</dt>
      <dd>{{ note.recipientName }} · {{ note.deliveryPointName }}</dd>
      <template v-if="note.vehiclePlate">
        <dt class="text-muted-foreground">{{ t('planning.deliveryNote.vehicle') }}</dt>
        <dd>{{ note.vehiclePlate }}</dd>
      </template>
    </dl>
    <table class="w-full text-xs">
      <thead class="bg-muted/50 text-muted-foreground">
        <tr>
          <th class="px-3 py-1.5 text-left font-medium">
            {{ t('planning.deliveryNote.product') }}
          </th>
          <th class="px-3 py-1.5 text-right font-medium">
            {{ t('planning.deliveryNote.loaded') }}
          </th>
          <th class="px-3 py-1.5 text-right font-medium">
            {{ t('planning.deliveryNote.delivered') }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr v-for="line in note.lines" :key="line.lineNo">
          <td class="px-3 py-1.5">
            <span :class="line.notDelivered ? 'line-through text-muted-foreground' : ''">
              {{ line.productName }}
            </span>
            <p v-if="line.notDelivered" class="text-destructive">
              {{ t('planning.deliveryNote.notDelivered', { reason: line.reason || '—' }) }}
            </p>
          </td>
          <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
            {{ formatNumber(line.quantity) }} {{ line.unit }}
          </td>
          <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
            {{
              line.deliveredQuantity === null
                ? '0'
                : `${formatNumber(line.deliveredQuantity)} ${line.unit}`
            }}
          </td>
        </tr>
      </tbody>
    </table>
    <p
      class="px-3 py-2 border-t border-border text-xs"
      :class="
        note.state === 'signed'
          ? 'text-success'
          : note.state === 'contested'
            ? 'text-destructive'
            : note.state === 'planned'
              ? 'text-muted-foreground'
              : 'text-warning'
      "
    >
      <template v-if="note.state === 'signed'">
        {{
          t('planning.deliveryNote.signed', {
            name: note.signedBy,
            at: formatDateTime(note.signedAt)
          })
        }}
      </template>
      <template v-else-if="note.state === 'contested'">
        {{
          t('planning.deliveryNote.contested', {
            reason: note.contestReason,
            at: formatDateTime(note.contestedAt)
          })
        }}
      </template>
      <template v-else-if="note.state === 'planned'">{{
        t('planning.deliveryNote.planned')
      }}</template>
      <template v-else>{{ t('planning.deliveryNote.awaiting') }}</template>
    </p>
  </div>
</template>
