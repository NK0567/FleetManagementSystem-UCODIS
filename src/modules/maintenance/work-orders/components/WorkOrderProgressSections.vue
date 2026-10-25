<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { useReferenceStore } from '@/stores/referenceStore'
import { formatDate, formatDateTime, formatNumber } from '@/utils/format'
import type { WorkOrderApi } from '../types/workOrder.types'

defineProps<{ order: WorkOrderApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const referenceStore = useReferenceStore()

const expandedSections = ref({
  diagnosis: true,
  labour: true,
  external: true,
  completion: true,
  history: false
})
const technician = (no: string) => referenceStore.getLabel('technicians', no) || no
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="expandedSections.diagnosis"
      :title="t('maintenance.workOrders.section.diagnosis')"
      :summary="[order.subsystemName]"
    >
      <p v-if="!order.diagnosis" class="text-sm text-muted-foreground xl:col-span-2">
        {{ t('maintenance.workOrders.progress.noDiagnosis') }}
      </p>
      <dl v-else class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm xl:col-span-2">
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.subsystem') }}</dt>
        <dd>{{ order.subsystemName }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.mode') }}</dt>
        <dd>{{ order.modeName || '—' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.cause') }}</dt>
        <dd>{{ order.causeName || '—' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.progress.by') }}</dt>
        <dd>{{ order.diagnosis.by }} · {{ formatDateTime(order.diagnosis.at) }}</dd>
      </dl>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.labour"
      :title="t('maintenance.workOrders.section.labour')"
      :summary="[
        t('maintenance.workOrders.progress.labourSummary', {
          hours: formatNumber(order.labourHours, 2),
          cost: formatNumber(order.labourCost)
        })
      ]"
    >
      <div class="xl:col-span-2 min-w-0">
        <p v-if="!order.labour.length" class="text-sm text-muted-foreground">
          {{ t('maintenance.workOrders.progress.noLabour') }}
        </p>
        <table v-else class="w-full text-sm border border-border rounded">
          <tbody>
            <tr
              v-for="(line, index) in order.labour"
              :key="`${line.technicianNo}-${line.date}-${index}`"
              class="border-t border-border first:border-t-0"
            >
              <td class="px-3 py-1.5 whitespace-nowrap">{{ formatDate(line.date) }}</td>
              <td class="px-3 py-1.5">{{ technician(line.technicianNo) }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">
                {{ formatNumber(line.hours, 2) }} h
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </FormSection>

    <FormSection
      v-if="order.external"
      v-model:open="expandedSections.external"
      :title="t('maintenance.workOrders.section.external')"
      :summary="[order.providerName]"
    >
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm xl:col-span-2">
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.garage') }}</dt>
        <dd>
          <RouterLink
            :to="{
              path: '/fleet/providers',
              query: { no: order.external.providerNo, cardMode: 'view' }
            }"
            class="text-primary hover:underline"
          >
            {{ order.providerName }}
          </RouterLink>
        </dd>
        <dt class="text-muted-foreground">
          {{ t('maintenance.workOrders.dialog.handedOverAt') }}
        </dt>
        <dd>{{ formatDateTime(order.external.handedOverAt) }}</dd>
        <dt class="text-muted-foreground">
          {{ t('maintenance.workOrders.dialog.expectedReturnOn') }}
        </dt>
        <dd>{{ formatDate(order.external.expectedReturnOn) || '—' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.returnedAt') }}</dt>
        <dd>{{ formatDateTime(order.external.returnedAt) || '—' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.progress') }}</dt>
        <dd class="whitespace-pre-line">{{ order.external.progress || '—' }}</dd>
        <dt class="text-muted-foreground">
          {{ t('maintenance.workOrders.dialog.quoteAmount') }}
        </dt>
        <dd class="tabular-nums">
          {{ order.external.quoteAmount === null ? '—' : formatNumber(order.external.quoteAmount) }}
        </dd>
        <dt class="text-muted-foreground">
          {{ t('maintenance.workOrders.dialog.finalAmount') }}
        </dt>
        <dd class="tabular-nums">
          {{ order.external.finalAmount === null ? '—' : formatNumber(order.external.finalAmount) }}
        </dd>
      </dl>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.completion"
      :title="t('maintenance.workOrders.section.completion')"
      :summary="[]"
    >
      <p
        v-if="!order.completedAt && !order.cancelledAt"
        class="text-sm text-muted-foreground xl:col-span-2"
      >
        {{ t('maintenance.workOrders.progress.notFinished') }}
      </p>
      <dl v-else class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm xl:col-span-2">
        <template v-if="order.completedAt">
          <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.workDone') }}</dt>
          <dd class="whitespace-pre-line">{{ order.workDone }}</dd>
          <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.odometerKm') }}</dt>
          <dd class="tabular-nums">{{ formatNumber(order.odometerKmAtCompletion) }} km</dd>
          <dt class="text-muted-foreground">
            {{ t('maintenance.workOrders.progress.completed') }}
          </dt>
          <dd>{{ order.completedBy }} · {{ formatDateTime(order.completedAt) }}</dd>
        </template>
        <template v-if="order.validatedAt">
          <dt class="text-muted-foreground">
            {{ t('maintenance.workOrders.progress.validated') }}
          </dt>
          <dd>{{ order.validatedBy }} · {{ formatDateTime(order.validatedAt) }}</dd>
        </template>
        <template v-if="order.cancelledAt">
          <dt class="text-muted-foreground">
            {{ t('maintenance.workOrders.progress.cancelled') }}
          </dt>
          <dd>
            {{ order.cancelledBy }} · {{ formatDateTime(order.cancelledAt) }} —
            {{ order.cancelReason }}
          </dd>
        </template>
      </dl>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.history"
      :title="t('maintenance.workOrders.section.history')"
      :summary="[]"
    >
      <p v-if="!order.history.length" class="text-sm text-muted-foreground xl:col-span-2">
        {{ t('maintenance.workOrders.progress.noHistory') }}
      </p>
      <ul v-else class="space-y-1 text-sm xl:col-span-2">
        <li v-for="(entry, index) in order.history" :key="`${entry.at}-${index}`">
          <span class="text-muted-foreground tabular-nums">{{ formatDateTime(entry.at) }}</span>
          · {{ optionsStore.getOptionLabel('workOrderEvent', entry.kind) }} · {{ entry.by }}
          <span v-if="entry.comment" class="text-muted-foreground">— {{ entry.comment }}</span>
        </li>
      </ul>
    </FormSection>
  </div>
</template>
