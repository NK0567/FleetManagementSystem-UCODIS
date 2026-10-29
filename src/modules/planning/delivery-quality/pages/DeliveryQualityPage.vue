<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileWarning, HandCoins, ListChecks, Scale, Send, ShieldAlert } from '@lucide/vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { usePermissions } from '@/composables/usePermissions'
import { reasonListKey } from '@/modules/planning/reasons/domain/reasonLists'
import { useOptionsStore } from '@/stores/optionsStore'
import type { FileMeta } from '@/types/file.types'
import { EMPTY_CELL, formatDate, formatNumber } from '@/utils/format'
import {
  QUALITY_ACTORS,
  QUALITY_ORIGINS,
  mainActor,
  protestQuantityAllowed,
  type ProtestStatus,
  type QualityActor,
  type QualityOrigin
} from '../domain/quality'
import { useDeliveryQualityStore } from '../stores/deliveryQualityStore'
import type { ProtestRowApi, QualityRowApi } from '../types/deliveryQuality.types'

type QualityTab = 'toQualify' | 'protests' | 'credits' | 'all'

const TABS: QualityTab[] = ['toQualify', 'protests', 'credits', 'all']
const PROTEST_TONES: Record<ProtestStatus, StatusTone> = {
  preparing: 'warning',
  issued: 'info',
  closed: 'neutral'
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
const chipClass = (active: boolean) =>
  active
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-border text-card-foreground hover:bg-accent'

const { t } = useI18n()
const store = useDeliveryQualityStore()
const optionsStore = useOptionsStore()
const { canExecute } = usePermissions('DELIVERYQUALITY')

const tab = ref<QualityTab>('toQualify')

const preparing = ref<QualityRowApi | null>(null)
const protest = ref<{
  reasonNo: string
  comment: string
  quantity: number | null
  files: FileMeta[]
}>({
  reasonNo: '',
  comment: '',
  quantity: null,
  files: []
})
const issuing = ref<{ row: QualityRowApi; note: ProtestRowApi } | null>(null)
const closing = ref<{ row: QualityRowApi; note: ProtestRowApi } | null>(null)
const qualifying = ref<QualityRowApi | null>(null)
const responsibility = ref<{
  origin: QualityOrigin
  actor: QualityActor
  comment: string
  credit: number | null
}>({ origin: 'transport', actor: 'logistics', comment: '', credit: null })
const crediting = ref<QualityRowApi | null>(null)
const reference = ref('')

const openProtests = (row: QualityRowApi) => row.protests.filter((note) => note.status !== 'closed')
const creditOf = (row: QualityRowApi) =>
  row.responsibility?.impacts.find((impact) => impact.type === 'customer_credit')?.amount ?? null
const withholdingOf = (row: QualityRowApi) =>
  row.responsibility?.impacts.find((impact) => impact.type === 'carrier_withholding')?.amount ??
  null
const creditPending = (row: QualityRowApi) => creditOf(row) !== null && !row.creditReference

const matches: Record<QualityTab, (row: QualityRowApi) => boolean> = {
  toQualify: (row) => row.facts.length > 0 && !row.responsibility,
  protests: (row) => openProtests(row).length > 0,
  credits: creditPending,
  all: () => true
}

const countOf = (item: QualityTab) => store.rows.filter(matches[item]).length
const visibleRows = computed(() => store.rows.filter(matches[tab.value]))
const protestRows = computed(() =>
  store.rows.flatMap((row) => row.protests.map((note) => ({ row, note })))
)

const kpis = computed(() => [
  {
    key: 'followed',
    icon: ListChecks,
    value: store.rows.length,
    label: t('planning.quality.kpi.followed')
  },
  {
    key: 'toQualify',
    icon: ShieldAlert,
    value: countOf('toQualify'),
    label: t('planning.quality.kpi.toQualify')
  },
  {
    key: 'protests',
    icon: FileWarning,
    value: store.rows.reduce((sum, row) => sum + openProtests(row).length, 0),
    label: t('planning.quality.kpi.protests')
  },
  {
    key: 'credits',
    icon: HandCoins,
    value: countOf('credits'),
    label: t('planning.quality.kpi.credits')
  }
])

const keyOf = (row: { orderNo: string; lineNo: number }) => `${row.orderNo}-${row.lineNo}`
const orderCard = (orderNo: string) => ({
  path: '/planning/transport-orders',
  query: { no: orderNo, cardMode: 'view' }
})
const meansLabel = (row: QualityRowApi) =>
  row.means ? optionsStore.getOptionLabel('transportMeans', row.means) : EMPTY_CELL

/** The fleet driver is only liable on fleet orders, the carrier only on subcontracted ones. */
function actorAllowed(row: QualityRowApi, actor: QualityActor): boolean {
  if (actor === 'external_carrier') return row.means === 'carrier'
  if (actor === 'internal_carrier') return row.means === 'fleet'
  return true
}

const protestValid = computed(() => {
  const row = preparing.value
  const quantity = protest.value.quantity
  return (
    !!row &&
    !!protest.value.reasonNo &&
    typeof quantity === 'number' &&
    protestQuantityAllowed(quantity, row.quantity)
  )
})

function openPrepare(row: QualityRowApi) {
  protest.value = { reasonNo: '', comment: '', quantity: null, files: [] }
  preparing.value = row
}

async function onPrepare() {
  const row = preparing.value
  if (!row || !protestValid.value) return
  const body = {
    reasonNo: protest.value.reasonNo,
    comment: protest.value.comment.trim(),
    quantity: Number(protest.value.quantity),
    fileNos: protest.value.files.map((file) => file.no)
  }
  if (await store.prepareProtest(row, body)) preparing.value = null
}

/* The pieces of a note: added at its preparation, then until it is closed (TRS04-US05). */
function addDraftFile(file: FileMeta) {
  if (!protest.value.files.some((item) => item.no === file.no)) protest.value.files.push(file)
}

async function attachToNote(row: QualityRowApi, note: ProtestRowApi, file: FileMeta) {
  await store.attachProtestFile(row, note.no, file.no)
}

async function onIssue() {
  const pending = issuing.value
  if (pending && (await store.issueProtest(pending.row, pending.note.no))) issuing.value = null
}

async function onClose(outcome: string) {
  const pending = closing.value
  if (pending && (await store.closeProtest(pending.row, pending.note.no, outcome))) {
    closing.value = null
  }
}

function openResponsibility(row: QualityRowApi) {
  const current = row.responsibility
  const fallback: QualityActor =
    row.means === 'carrier'
      ? 'external_carrier'
      : row.means === 'fleet'
        ? 'internal_carrier'
        : 'logistics'
  responsibility.value = {
    origin: current?.origin ?? 'transport',
    actor: current ? mainActor(current.shares) : fallback,
    comment: current?.comment ?? '',
    credit: creditOf(row)
  }
  qualifying.value = row
}

const responsibilityValid = computed(
  () =>
    !!qualifying.value &&
    !!responsibility.value.comment.trim() &&
    actorAllowed(qualifying.value, responsibility.value.actor)
)

async function onResponsibility() {
  const row = qualifying.value
  if (!row || !responsibilityValid.value) return
  const credit = Number(responsibility.value.credit)
  const body = {
    origin: responsibility.value.origin,
    comment: responsibility.value.comment.trim(),
    shares: [{ actor: responsibility.value.actor, percent: 100 }],
    impacts: credit > 0 ? [{ type: 'customer_credit' as const, amount: credit }] : []
  }
  if (await store.setResponsibility(row, body)) qualifying.value = null
}

function openCredit(row: QualityRowApi) {
  reference.value = ''
  crediting.value = row
}

async function onCredit() {
  const row = crediting.value
  if (!row || !reference.value.trim()) return
  if (await store.issueCredit(row, reference.value.trim())) crediting.value = null
}

onMounted(() => void store.fetchRows())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('planning.quality.title') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.quality.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <LoadingBar v-if="store.loading" :height="2" bar-color="var(--color-primary)" />

    <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <div
        v-for="kpi in kpis"
        :key="kpi.key"
        class="bg-card border border-border rounded p-4 flex items-start gap-3"
      >
        <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
          <component :is="kpi.icon" class="w-5 h-5" />
        </span>
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
          <p class="text-2xl font-semibold tabular-nums text-card-foreground">{{ kpi.value }}</p>
        </div>
      </div>
    </section>

    <section class="bg-card border border-border rounded overflow-x-auto">
      <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
        {{ t('planning.quality.linesTitle') }}
      </h2>
      <nav class="flex flex-wrap gap-1 px-2 border-b border-border">
        <button
          v-for="item in TABS"
          :key="item"
          type="button"
          class="cursor-pointer px-3 py-2 text-sm border-b-2 -mb-px transition"
          :class="
            tab === item
              ? 'border-primary text-card-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-card-foreground'
          "
          @click="tab = item"
        >
          {{ t(`planning.quality.tab.${item}`) }}
          <span class="ml-1 text-xs tabular-nums text-muted-foreground">{{ countOf(item) }}</span>
        </button>
      </nav>
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold text-left">{{ t('planning.quality.col.order') }}</th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.recipient') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.product') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">{{ t('planning.quality.col.facts') }}</th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.responsibility') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.quality.col.credit') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.quality.col.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!visibleRows.length">
            <td colspan="7" class="px-3 py-4 text-muted-foreground">
              {{ store.loading ? t('planning.quality.loading') : t('planning.quality.empty') }}
            </td>
          </tr>
          <tr v-for="row in visibleRows" :key="keyOf(row)" class="border-t border-border align-top">
            <td class="px-3 py-2 whitespace-nowrap">
              <RouterLink :to="orderCard(row.orderNo)" class="text-primary hover:underline">
                {{ row.orderNo }}
              </RouterLink>
              <span class="text-xs text-muted-foreground">
                · {{ t('planning.quality.lineNo', { no: row.lineNo }) }}
              </span>
              <p class="text-xs text-muted-foreground">{{ meansLabel(row) }}</p>
            </td>
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ row.recipientName || EMPTY_CELL }}</p>
              <p class="text-xs text-muted-foreground">{{ row.deliveryPointName }}</p>
            </td>
            <td class="px-3 py-2">
              <p>{{ row.productName || EMPTY_CELL }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">
                {{ formatNumber(row.quantity) }} {{ row.unit }}
              </p>
            </td>
            <td class="px-3 py-2">
              <div v-if="row.facts.length" class="flex flex-wrap gap-1">
                <StatusPill
                  v-for="fact in row.facts"
                  :key="fact"
                  :label="t(`planning.quality.fact.${fact}`)"
                  tone="warning"
                />
              </div>
              <span v-else class="text-muted-foreground">{{ EMPTY_CELL }}</span>
            </td>
            <td class="px-3 py-2">
              <template v-if="row.responsibility">
                <StatusPill
                  :label="t(`planning.quality.actor.${mainActor(row.responsibility.shares)}`)"
                  tone="info"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  {{ t(`planning.quality.origin.${row.responsibility.origin}`) }}
                </p>
              </template>
              <StatusPill
                v-else-if="row.facts.length"
                :label="t('planning.quality.noResponsibility')"
                tone="neutral"
              />
              <span v-else class="text-muted-foreground">{{ EMPTY_CELL }}</span>
            </td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              <p>{{ formatNumber(creditOf(row)) }}</p>
              <p v-if="withholdingOf(row) !== null" class="text-xs text-muted-foreground">
                {{
                  t('planning.quality.withholding', { amount: formatNumber(withholdingOf(row)) })
                }}
              </p>
              <p v-if="row.creditReference" class="text-xs text-muted-foreground">
                {{ row.creditReference }} · {{ formatDate(row.creditIssuedAt) }}
              </p>
            </td>
            <td class="px-3 py-2">
              <div v-if="canExecute" class="flex flex-wrap justify-end gap-1">
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="openPrepare(row)"
                >
                  <FileWarning class="w-4 h-4 text-primary" />
                  {{ t('planning.quality.prepare') }}
                </button>
                <button
                  v-if="row.facts.length"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="openResponsibility(row)"
                >
                  <Scale class="w-4 h-4 text-primary" />
                  {{ t('planning.quality.responsibility') }}
                </button>
                <button
                  v-if="creditPending(row)"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="openCredit(row)"
                >
                  <HandCoins class="w-4 h-4 text-primary" />
                  {{ t('planning.quality.issueCredit') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="bg-card border border-border rounded overflow-x-auto">
      <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
        {{ t('planning.quality.protestsTitle') }}
      </h2>
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.protest') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">{{ t('planning.quality.col.order') }}</th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.recipient') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.quality.col.quantity') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.prepared') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.files') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.quality.col.status') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.quality.col.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!protestRows.length">
            <td colspan="8" class="px-3 py-4 text-muted-foreground">
              {{ t('planning.quality.noProtest') }}
            </td>
          </tr>
          <tr
            v-for="{ row, note } in protestRows"
            :key="note.no"
            class="border-t border-border align-top"
          >
            <td class="px-3 py-2 whitespace-nowrap font-medium text-card-foreground">
              {{ note.no }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <RouterLink :to="orderCard(row.orderNo)" class="text-primary hover:underline">
                {{ row.orderNo }}
              </RouterLink>
              <span class="text-xs text-muted-foreground">
                · {{ t('planning.quality.lineNo', { no: row.lineNo }) }}
              </span>
            </td>
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ row.recipientName || EMPTY_CELL }}</p>
              <p class="text-xs text-muted-foreground">{{ row.productName }}</p>
            </td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(note.quantity) }} {{ row.unit }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap text-muted-foreground">
              {{ formatDate(note.preparedAt) }}
            </td>
            <td class="px-3 py-2 min-w-56">
              <div class="space-y-1">
                <FileAttachmentField
                  v-for="file in note.files"
                  :key="file.no"
                  :file="file"
                  disabled
                />
                <p v-if="!note.files.length" class="text-xs text-muted-foreground">
                  {{ t('planning.quality.noFile') }}
                </p>
                <FileAttachmentField
                  v-if="canExecute && note.status !== 'closed'"
                  :file="null"
                  :disabled="store.acting"
                  @uploaded="(file) => attachToNote(row, note, file)"
                />
              </div>
            </td>
            <td class="px-3 py-2">
              <StatusPill
                :label="t(`planning.quality.status.${note.status}`)"
                :tone="PROTEST_TONES[note.status]"
              />
              <p v-if="note.outcome" class="text-xs text-muted-foreground mt-1">
                {{ note.outcome }}
              </p>
            </td>
            <td class="px-3 py-2">
              <div v-if="canExecute" class="flex flex-wrap justify-end gap-1">
                <button
                  v-if="note.status === 'preparing'"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="issuing = { row, note }"
                >
                  <Send class="w-4 h-4 text-primary" />
                  {{ t('planning.quality.issue') }}
                </button>
                <button
                  v-else-if="note.status === 'issued'"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="closing = { row, note }"
                >
                  {{ t('planning.quality.close') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>

  <ConfirmDialog
    :open="preparing !== null"
    :title="t('planning.quality.prepare')"
    :confirm-disabled="!protestValid"
    :loading="store.acting"
    panel-class="max-w-md"
    @confirm="onPrepare"
    @cancel="preparing = null"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('planning.reasons.dialog.reason')" required>
        <ReferenceLookup
          v-model="protest.reasonNo"
          :reference-key="reasonListKey('protest')"
          :modal-title="t('planning.reasons.dialog.reason')"
        />
      </BaseFormField>
      <BaseFormField :label="t('planning.quality.quantity')" required>
        <FormInput v-model="protest.quantity" type="number" :min="0" />
        <p class="text-xs text-muted-foreground mt-1">
          {{
            t('planning.quality.quantityHint', {
              quantity: formatNumber(preparing?.quantity),
              unit: preparing?.unit ?? ''
            })
          }}
        </p>
      </BaseFormField>
      <BaseFormField :label="t('planning.reasons.dialog.comment')">
        <FormTextarea v-model="protest.comment" :rows="3" :maxlength="500" />
      </BaseFormField>
      <BaseFormField :label="t('planning.quality.files')">
        <div class="space-y-1">
          <FileAttachmentField
            v-for="file in protest.files"
            :key="file.no"
            :file="file"
            @uploaded="
              (next) =>
                (protest.files = protest.files.map((item) => (item.no === file.no ? next : item)))
            "
            @removed="protest.files = protest.files.filter((item) => item.no !== file.no)"
          />
          <FileAttachmentField :file="null" @uploaded="addDraftFile" />
        </div>
      </BaseFormField>
    </div>
  </ConfirmDialog>
  <ConfirmDialog
    :open="issuing !== null"
    :title="t('planning.quality.issue')"
    :message="issuing ? t('planning.quality.issueMessage', { no: issuing.note.no }) : ''"
    :loading="store.acting"
    @confirm="onIssue"
    @cancel="issuing = null"
  />
  <ReasonDialog
    :open="closing !== null"
    :title="t('planning.quality.close')"
    :label="t('planning.quality.outcome')"
    :min-length="1"
    :loading="store.acting"
    @confirm="onClose"
    @cancel="closing = null"
  />
  <ConfirmDialog
    :open="qualifying !== null"
    :title="t('planning.quality.responsibility')"
    :confirm-disabled="!responsibilityValid"
    :loading="store.acting"
    panel-class="max-w-lg"
    @confirm="onResponsibility"
    @cancel="qualifying = null"
  >
    <div class="space-y-3">
      <BaseFormField :label="t('planning.quality.originLabel')" required>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="origin in QUALITY_ORIGINS"
            :key="origin"
            type="button"
            class="cursor-pointer px-3 py-1.5 border rounded text-sm transition"
            :class="chipClass(responsibility.origin === origin)"
            @click="responsibility.origin = origin"
          >
            {{ t(`planning.quality.origin.${origin}`) }}
          </button>
        </div>
      </BaseFormField>
      <BaseFormField :label="t('planning.quality.actorLabel')" required>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="actor in QUALITY_ACTORS"
            :key="actor"
            type="button"
            class="cursor-pointer px-3 py-1.5 border rounded text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            :class="chipClass(responsibility.actor === actor)"
            :disabled="!qualifying || !actorAllowed(qualifying, actor)"
            @click="responsibility.actor = actor"
          >
            {{ t(`planning.quality.actor.${actor}`) }}
          </button>
        </div>
      </BaseFormField>
      <BaseFormField :label="t('planning.quality.comment')" required>
        <FormTextarea v-model="responsibility.comment" :rows="3" :maxlength="500" />
      </BaseFormField>
      <BaseFormField :label="t('planning.quality.credit')">
        <FormInput
          v-model="responsibility.credit"
          type="number"
          :min="0"
          :disabled="!!qualifying?.creditIssuedAt"
        />
        <p class="text-xs text-muted-foreground mt-1">{{ t('planning.quality.creditHint') }}</p>
      </BaseFormField>
    </div>
  </ConfirmDialog>
  <ConfirmDialog
    :open="crediting !== null"
    :title="t('planning.quality.issueCredit')"
    :confirm-disabled="!reference.trim()"
    :loading="store.acting"
    panel-class="max-w-md"
    @confirm="onCredit"
    @cancel="crediting = null"
  >
    <BaseFormField :label="t('planning.quality.reference')" required>
      <FormInput v-model="reference" :maxlength="50" />
    </BaseFormField>
    <p v-if="crediting" class="text-xs text-muted-foreground mt-2">
      {{ t('planning.quality.creditAmount', { amount: formatNumber(creditOf(crediting)) }) }}
    </p>
  </ConfirmDialog>
</template>
