<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { useReferenceStore } from '@/stores/referenceStore'
import { formatDate, formatDateTime, formatNumber } from '@/utils/format'
import type { WorkOrderApi } from '../types/workOrder.types'

const props = defineProps<{ order: WorkOrderApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const referenceStore = useReferenceStore()

/* A section opens by default only when it has something to show for the current status. */
const expandedSections = ref({
  diagnosis: !!props.order.diagnosis || !!props.order.nomenclature,
  labour: props.order.labour.length > 0 || !!props.order.planning,
  parts: props.order.parts.length > 0,
  external: true,
  completion: true,
  history: false
})
const finishedOrCancelled = computed(() => !!props.order.completedAt || !!props.order.cancelledAt)
const technician = (no: string) => referenceStore.getLabel('technicians', no) || no

const asRows = (items: readonly object[]) =>
  items.map((item, index) => ({ ...item, index })) as unknown as Record<string, unknown>[]
const labour = computed(() => asRows(props.order.labour))
const parts = computed(() =>
  asRows(props.order.parts.map((line) => ({ ...line, total: line.quantity * line.unitPrice })))
)
const history = computed(() => asRows(props.order.history))

const labourColumns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'date',
    label: t('maintenance.workOrders.progress.col.date'),
    formatter: (v) => formatDate(v as string | null)
  },
  {
    sortKey: 'technicianNo',
    label: t('maintenance.workOrders.progress.col.technician'),
    formatter: (v) => technician(String(v)),
    filter: true
  },
  {
    sortKey: 'hours',
    label: t('maintenance.workOrders.progress.col.hours'),
    align: 'right',
    formatter: (v) => `${formatNumber(Number(v), 2)} h`
  }
])
const partColumns = computed<SubListColumn[]>(() => [
  { sortKey: 'label', label: t('maintenance.workOrders.progress.col.part') },
  {
    sortKey: 'quantity',
    label: t('maintenance.workOrders.progress.col.quantity'),
    align: 'right',
    formatter: (v) => `× ${String(v)}`
  },
  {
    sortKey: 'total',
    label: t('maintenance.workOrders.progress.col.amount'),
    align: 'right',
    formatter: (v) => formatNumber(Number(v))
  },
  { sortKey: 'purchaseRequestNo', label: t('maintenance.workOrders.progress.col.purchase') }
])
const historyColumns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'at',
    label: t('maintenance.workOrders.progress.col.at'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'kind',
    label: t('maintenance.workOrders.progress.col.event'),
    formatter: (v) => optionsStore.getOptionLabel('workOrderEvent', v),
    filter: true
  },
  { sortKey: 'by', label: t('maintenance.workOrders.progress.col.by'), filter: true },
  { sortKey: 'comment', label: t('maintenance.workOrders.progress.col.comment') }
])
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="expandedSections.diagnosis"
      :title="t('maintenance.workOrders.section.diagnosis')"
      :summary="[order.subsystemName]"
    >
      <p
        v-if="order.nomenclature"
        class="text-sm xl:col-span-2"
        :class="order.nomenclature.confirmedAt ? 'text-muted-foreground' : 'text-warning'"
      >
        {{
          order.nomenclature.confirmedAt
            ? t('maintenance.workOrders.progress.nomenclatureConfirmed', {
                by: order.nomenclature.confirmedBy,
                date: formatDateTime(order.nomenclature.confirmedAt)
              })
            : t('maintenance.workOrders.progress.nomenclaturePending', {
                source: order.nomenclature.sourceText,
                name: order.proposedSubsystemName || '-'
              })
        }}
      </p>
      <p v-if="!order.diagnosis" class="text-sm text-muted-foreground xl:col-span-2">
        {{ t('maintenance.workOrders.progress.noDiagnosis') }}
      </p>
      <dl v-else class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm xl:col-span-2">
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.subsystem') }}</dt>
        <dd>{{ order.subsystemName }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.mode') }}</dt>
        <dd>{{ order.modeName || '-' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.cause') }}</dt>
        <dd>{{ order.causeName || '-' }}</dd>
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
        <p v-if="order.planning" class="text-sm mb-2">
          {{
            t('maintenance.workOrders.progress.planned', {
              date: formatDate(order.planning.date),
              hours: formatNumber(order.planning.estimatedHours, 2),
              technicians: order.planning.technicianNos.map(technician).join(', ')
            })
          }}
        </p>
        <RecordSubList
          :rows="labour"
          :columns="labourColumns"
          row-key="index"
          :empty-text="t('maintenance.workOrders.progress.noLabour')"
          :initial-sort="{ key: 'date', direction: 'DESC' }"
        />
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.parts"
      :title="t('maintenance.workOrders.section.parts')"
      :summary="[
        t('maintenance.workOrders.progress.partsSummary', {
          cost: formatNumber(order.partsCost),
          pending: order.pendingPartCount
        })
      ]"
    >
      <div class="xl:col-span-2 min-w-0">
        <p v-if="order.partsWaitDays > 0 || order.status === 'awaiting_parts'" class="text-sm mb-2">
          {{
            t('maintenance.workOrders.progress.partsWait', {
              days: formatNumber(order.partsWaitDays, 1)
            })
          }}
        </p>
        <RecordSubList
          :rows="parts"
          :columns="partColumns"
          row-key="index"
          :empty-text="t('maintenance.workOrders.progress.noParts')"
        >
          <template #cell-label="{ row }">
            {{ row.label }}
            <span v-if="row.itemNo" class="text-muted-foreground">· {{ row.itemNo }}</span>
          </template>
          <template #cell-purchaseRequestNo="{ row }">
            <RouterLink
              v-if="row.purchaseRequestNo"
              :to="{
                path: '/maintenance/purchase-requests',
                query: { no: String(row.purchaseRequestNo), cardMode: 'view' }
              }"
              class="text-primary hover:underline"
            >
              {{ row.purchaseRequestNo }}
            </RouterLink>
            <span v-if="!row.receivedAt" class="ml-1 text-warning">
              {{ t('maintenance.workOrders.progress.partPending') }}
            </span>
          </template>
        </RecordSubList>
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
        <dd>{{ formatDate(order.external.expectedReturnOn) || '-' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.returnedAt') }}</dt>
        <dd>{{ formatDateTime(order.external.returnedAt) || '-' }}</dd>
        <dt class="text-muted-foreground">{{ t('maintenance.workOrders.dialog.progress') }}</dt>
        <dd class="whitespace-pre-line">{{ order.external.progress || '-' }}</dd>
        <dt class="text-muted-foreground">
          {{ t('maintenance.workOrders.dialog.quoteAmount') }}
        </dt>
        <dd class="tabular-nums">
          {{ order.external.quoteAmount === null ? '-' : formatNumber(order.external.quoteAmount) }}
        </dd>
        <dt class="text-muted-foreground">
          {{ t('maintenance.workOrders.dialog.finalAmount') }}
        </dt>
        <dd class="tabular-nums">
          {{ order.external.finalAmount === null ? '-' : formatNumber(order.external.finalAmount) }}
        </dd>
      </dl>
    </FormSection>

    <FormSection
      v-if="finishedOrCancelled"
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
            {{ order.cancelledBy }} · {{ formatDateTime(order.cancelledAt) }} ·
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
      <div class="xl:col-span-2 min-w-0">
        <RecordSubList
          :rows="history"
          :columns="historyColumns"
          row-key="index"
          :empty-text="t('maintenance.workOrders.progress.noHistory')"
          :initial-sort="{ key: 'at', direction: 'DESC' }"
        />
      </div>
    </FormSection>
  </div>
</template>
