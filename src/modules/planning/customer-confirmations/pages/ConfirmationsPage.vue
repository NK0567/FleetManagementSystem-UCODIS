<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalendarClock,
  CircleCheck,
  ExternalLink,
  Hand,
  PhoneCall,
  Undo2,
  UserX
} from '@lucide/vue'
import type { StatusTone } from '@/components/ui/status-pill/StatusPill.vue'
import { usePermissions } from '@/composables/usePermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import { useUserStore } from '@/stores/user'
import { formatDate, formatDateTime, formatNumber } from '@/utils/format'
import type { ConfirmationState } from '../domain/confirmation'
import { useConfirmationStore } from '../stores/confirmationStore'
import type { AnsweredLineApi, ConfirmationLineApi } from '../types/confirmation.types'

type DateAction = 'client-date'
type QueueTab = ConfirmationState | 'answered'

/* « Déjà répondu » keeps every answer given, whatever has become of the order (TRS01-US15). */
const CONFIRMATION_TABS: QueueTab[] = [
  'pending',
  'unavailable',
  'confirmed',
  'replanned',
  'answered'
]
const STATE_TONES: Record<ConfirmationState, StatusTone> = {
  pending: 'warning',
  unavailable: 'danger',
  confirmed: 'success',
  replanned: 'neutral'
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
const tabClass = (active: boolean) =>
  active
    ? 'border-primary text-card-foreground font-medium'
    : 'border-transparent text-muted-foreground hover:text-card-foreground'

const { t } = useI18n()
const store = useConfirmationStore()
const { canExecute } = usePermissions('CUSTOMERCONFIRMATION')

const userStore = useUserStore()
const optionsStore = useOptionsStore()
const me = computed(() => userStore.user?.code ?? '')
const confirmationTab = ref<QueueTab>('pending')
/** Only the calls due now, by the company's call moment (TRS01-US15). */
const onlyCalls = ref(false)
const ACTIVITY_TONES: Record<NonNullable<ConfirmationLineApi['activity']>, StatusTone> = {
  call: 'warning',
  call_later: 'neutral',
  await_answer: 'info'
}
const answeredRows = computed<AnsweredLineApi[]>(() => store.answered)
const tabCount = (tab: QueueTab) =>
  tab === 'answered' ? store.answered.length : countOf(store.lines, tab)
/** A line taken by another agent is theirs: hidden by default, shown on demand. */
const hideTakenByOthers = ref(true)

const unavailable = ref<ConfirmationLineApi | null>(null)
const dating = ref<{ line: ConfirmationLineApi; action: DateAction } | null>(null)
const date = ref('')

const countOf = <T extends { state: string }>(rows: T[], state: string) =>
  rows.filter((row) => row.state === state).length

const kpis = computed(() => [
  {
    key: 'toCall',
    icon: PhoneCall,
    value: store.lines.filter((line) => line.activity === 'call').length,
    label: t('planning.confirmations.kpi.toCall')
  },
  {
    key: 'unavailable',
    icon: UserX,
    value: countOf(store.lines, 'unavailable'),
    label: t('planning.confirmations.kpi.unavailable')
  },
  {
    key: 'confirmed',
    icon: CircleCheck,
    value: countOf(store.lines, 'confirmed'),
    label: t('planning.confirmations.kpi.confirmed')
  }
])

const takenByOther = (line: ConfirmationLineApi) => !!line.agent && line.agent !== me.value
const visibleLines = computed(() =>
  store.lines.filter(
    (line) =>
      line.state === confirmationTab.value &&
      (!onlyCalls.value || line.activity === 'call') &&
      !(hideTakenByOthers.value && isOpen(line) && takenByOther(line))
  )
)
const hiddenCount = computed(
  () =>
    store.lines.filter(
      (line) => line.state === confirmationTab.value && isOpen(line) && takenByOther(line)
    ).length
)

const keyOf = (line: { orderNo: string; lineNo: number }) => `${line.orderNo}-${line.lineNo}`
const orderCard = (orderNo: string) => ({
  path: '/planning/transport-orders',
  query: { no: orderNo, cardMode: 'view' }
})
const isOpen = (line: ConfirmationLineApi) =>
  line.state === 'pending' || line.state === 'unavailable'

function openDate(line: ConfirmationLineApi, action: DateAction) {
  date.value = line.clientProposedOn ?? line.availableOn ?? ''
  dating.value = { line, action }
}

/* The agent records the date the recipient gives on the phone; retaining it is the planner's. */
async function onDate() {
  const pending = dating.value
  if (!pending || !date.value) return
  if (await store.setClientDate(pending.line, date.value)) dating.value = null
}

async function onUnavailable(choice: { reasonNo: string; comment: string }) {
  if (unavailable.value && (await store.markUnavailable(unavailable.value, choice))) {
    unavailable.value = null
  }
}

onMounted(() => {
  void optionsStore.fetchOptions()
  void store.fetchAll()
})
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('planning.confirmations.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.confirmations.subtitle') }}</p>
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
        {{ t('planning.confirmations.confirmationTitle') }}
      </h2>
      <nav class="flex flex-wrap gap-1 px-2 border-b border-border">
        <button
          v-for="state in CONFIRMATION_TABS"
          :key="state"
          type="button"
          class="cursor-pointer px-3 py-2 text-sm border-b-2 -mb-px transition"
          :class="tabClass(confirmationTab === state)"
          @click="confirmationTab = state"
        >
          {{ t(`planning.confirmations.state.${state}`) }}
          <span class="ml-1 text-xs tabular-nums text-muted-foreground">
            {{ tabCount(state) }}
          </span>
        </button>
      </nav>
      <div
        v-if="confirmationTab !== 'answered'"
        class="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border"
      >
        <label
          v-if="confirmationTab === 'pending'"
          class="inline-flex items-center gap-2 text-sm text-card-foreground"
        >
          <input v-model="onlyCalls" type="checkbox" class="h-4 w-4 accent-primary" />
          {{ t('planning.confirmations.queue.onlyCalls') }}
        </label>
        <label class="inline-flex items-center gap-2 text-sm text-card-foreground">
          <input v-model="hideTakenByOthers" type="checkbox" class="h-4 w-4 accent-primary" />
          {{ t('planning.confirmations.queue.hideOthers') }}
        </label>
        <span v-if="hideTakenByOthers && hiddenCount" class="text-xs text-muted-foreground">
          {{ t('planning.confirmations.queue.hidden', hiddenCount) }}
        </span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ t('planning.confirmations.queue.order') }}
        </span>
      </div>
      <table v-if="confirmationTab === 'answered'" class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.departure') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.order') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.recipient') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.answer') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.origin') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.orderStatus') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!answeredRows.length">
            <td colspan="6" class="px-3 py-4 text-muted-foreground">
              {{ t('planning.confirmations.answered.empty') }}
            </td>
          </tr>
          <tr v-for="row in answeredRows" :key="keyOf(row)" class="border-t border-border">
            <td class="px-3 py-2 whitespace-nowrap tabular-nums">
              {{ row.plannedDeparture ? formatDateTime(row.plannedDeparture) : '' }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <RouterLink :to="orderCard(row.orderNo)" class="text-primary hover:underline">
                {{ row.orderNo }}
              </RouterLink>
              <span class="text-xs text-muted-foreground">
                · {{ t('planning.confirmations.lineNo', { no: row.lineNo }) }}
              </span>
            </td>
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ row.recipientName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ row.productName }} · {{ formatNumber(row.quantity) }} {{ row.unit }}
              </p>
            </td>
            <td class="px-3 py-2">
              <StatusPill
                :label="t(`planning.confirmations.state.${row.answer}`)"
                :tone="row.answer === 'confirmed' ? 'success' : 'danger'"
              />
              <p v-if="row.answeredAt" class="text-xs text-muted-foreground mt-1">
                {{ formatDateTime(row.answeredAt) }}
              </p>
              <p v-if="row.availableOn" class="text-xs text-muted-foreground">
                {{ t('planning.confirmations.date.available') }} · {{ formatDate(row.availableOn) }}
              </p>
            </td>
            <td class="px-3 py-2">
              {{ t(`planning.confirmations.answered.origin.${row.origin}`) }}
            </td>
            <td class="px-3 py-2">
              {{ optionsStore.getOptionLabel('transportOrderStatus', row.orderStatus) }}
            </td>
          </tr>
        </tbody>
      </table>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.departure') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.order') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.recipient') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.channel') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.product') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.confirmations.col.quantity') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.dates') }}
            </th>
            <th class="px-3 py-2 font-semibold text-left">
              {{ t('planning.confirmations.col.state') }}
            </th>
            <th class="px-3 py-2 font-semibold text-right">
              {{ t('planning.confirmations.col.actions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!visibleLines.length">
            <td colspan="9" class="px-3 py-4 text-muted-foreground">
              {{
                store.loading
                  ? t('planning.confirmations.loading')
                  : t('planning.confirmations.empty')
              }}
            </td>
          </tr>
          <tr v-for="line in visibleLines" :key="keyOf(line)" class="border-t border-border">
            <td class="px-3 py-2 whitespace-nowrap tabular-nums">
              {{ line.plannedDeparture ? formatDateTime(line.plannedDeparture) : '·' }}
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <RouterLink :to="orderCard(line.orderNo)" class="text-primary hover:underline">
                {{ line.orderNo }}
              </RouterLink>
              <span class="text-xs text-muted-foreground">
                · {{ t('planning.confirmations.lineNo', { no: line.lineNo }) }}
              </span>
            </td>
            <td class="px-3 py-2">
              <p class="text-card-foreground">{{ line.recipientName || '' }}</p>
              <p class="text-xs text-muted-foreground">{{ line.deliveryPointName }}</p>
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <p class="text-card-foreground">
                {{ optionsStore.getOptionLabel('notificationChannel', line.notificationChannel) }}
              </p>
              <p
                v-if="line.recipientContact && line.notificationChannel !== 'none'"
                class="text-xs text-muted-foreground"
              >
                {{ line.recipientContact }}
              </p>
              <a
                v-if="line.trackingToken && line.notificationChannel !== 'none'"
                :href="`#/suivi/${line.trackingToken}`"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink class="w-3.5 h-3.5" />
                {{ t('planning.confirmations.queue.openLink') }}
              </a>
              <p v-if="line.preferredSlot !== 'any'" class="text-xs text-muted-foreground">
                {{ optionsStore.getOptionLabel('deliverySlot', line.preferredSlot) }}
              </p>
            </td>
            <td class="px-3 py-2">{{ line.productName || '' }}</td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ formatNumber(line.quantity) }} {{ line.unit }}
            </td>
            <td class="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
              <p v-if="line.clientProposedOn">
                {{ t('planning.confirmations.date.client') }} ·
                {{ formatDate(line.clientProposedOn) }}
              </p>
              <p v-if="line.plannerProposedOn">
                {{ t('planning.confirmations.date.planner') }} ·
                {{ formatDate(line.plannerProposedOn) }}
              </p>
              <p v-if="line.availableOn">
                {{ t('planning.confirmations.date.available') }} ·
                {{ formatDate(line.availableOn) }}
              </p>
              <p v-if="!line.clientProposedOn && !line.plannerProposedOn && !line.availableOn"></p>
            </td>
            <td class="px-3 py-2">
              <StatusPill
                :label="t(`planning.confirmations.state.${line.state}`)"
                :tone="STATE_TONES[line.state]"
              />
              <div v-if="line.activity" class="mt-1">
                <StatusPill
                  :label="t(`planning.confirmations.activity.${line.activity}`)"
                  :tone="ACTIVITY_TONES[line.activity]"
                />
              </div>
              <p v-if="line.byLink" class="mt-1 text-xs text-muted-foreground">
                {{ t('planning.confirmations.queue.byLink') }}
              </p>
              <p v-if="line.agent && isOpen(line)" class="mt-1 text-xs text-muted-foreground">
                {{
                  line.agent === me
                    ? t('planning.confirmations.queue.mine')
                    : t('planning.confirmations.queue.takenBy', { agent: line.agent })
                }}
              </p>
            </td>
            <td class="px-3 py-2">
              <p
                v-if="canExecute && isOpen(line) && takenByOther(line)"
                class="text-right text-xs text-muted-foreground"
              >
                {{ t('planning.confirmations.queue.takenBy', { agent: line.agent }) }}
              </p>
              <div v-else-if="canExecute && isOpen(line)" class="flex flex-wrap justify-end gap-1">
                <button
                  v-if="!line.agent"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="store.take(line)"
                >
                  <Hand class="w-4 h-4 text-primary" />
                  {{ t('planning.confirmations.queue.take') }}
                </button>
                <button
                  v-else
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="store.release(line)"
                >
                  <Undo2 class="w-4 h-4 text-primary" />
                  {{ t('planning.confirmations.queue.release') }}
                </button>
                <button
                  v-if="line.state === 'pending'"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="store.confirm(line)"
                >
                  <CircleCheck class="w-4 h-4 text-primary" />
                  {{ t('planning.confirmations.action.confirm') }}
                </button>
                <button
                  v-if="line.state === 'pending'"
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="unavailable = line"
                >
                  <UserX class="w-4 h-4 text-primary" />
                  {{ t('planning.confirmations.action.unavailable') }}
                </button>
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="store.acting"
                  @click="openDate(line, 'client-date')"
                >
                  <CalendarClock class="w-4 h-4 text-primary" />
                  {{ t('planning.confirmations.action.clientDate') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>

  <PlanningReasonDialog
    :open="unavailable !== null"
    :title="t('planning.confirmations.action.unavailable')"
    kind="unavailability"
    :loading="store.acting"
    @confirm="onUnavailable"
    @cancel="unavailable = null"
  />
  <ConfirmDialog
    :open="dating !== null"
    :title="dating ? t(`planning.confirmations.dateDialog.${dating.action}`) : ''"
    :confirm-disabled="!date"
    :loading="store.acting"
    panel-class="max-w-md"
    @confirm="onDate"
    @cancel="dating = null"
  >
    <BaseFormField :label="t('planning.confirmations.dateDialog.date')" required>
      <DateFormInput v-model="date" />
    </BaseFormField>
    <p class="text-xs text-muted-foreground mt-2">
      {{ t('planning.confirmations.dateDialog.clientHint') }}
    </p>
  </ConfirmDialog>
</template>
