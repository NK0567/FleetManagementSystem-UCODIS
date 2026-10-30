<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  CloudOff,
  PackageCheck,
  TriangleAlert,
  Wifi
} from '@lucide/vue'
import logo from '@/assets/logo-ucodis.png'
import { apiErrorMessage } from '@/core/api/apiError'
import { appConfig } from '@/core/app/appConfig'
import { formatDate, formatDateTime, formatNumber } from '@/utils/format'
import { confirmationService } from '../services/confirmationService'
import type { TrackingApi } from '../types/confirmation.types'
import DeliveryNoteView from '@/modules/planning/delivery-notes/components/DeliveryNoteView.vue'

/**
 * The page the recipient opens from the link of his SMS, WhatsApp or e-mail, without an
 * account (review of 22 October): he confirms that he can receive the delivery, or says he
 * cannot and gives another date. With no date given, the day after the planned one is proposed.
 */
const route = useRoute()
const { t } = useI18n()
const token = computed(() => String((route.params as Record<string, unknown>).token ?? ''))
const tracking = ref<TrackingApi | null>(null)
const loading = ref(true)
const sending = ref(false)
const error = ref<string | null>(null)
const askingDate = ref(false)
const date = ref('')
const reasonNo = ref('')
const comment = ref('')
/** After the driver's declaration: confirm with a name, or contest; on site: refuse. */
const acting = ref<'receive-confirm' | 'receive-contest' | 'refuse' | null>(null)
const signer = ref('')

const STEPS = ['planned', 'on_the_way', 'on_site', 'received'] as const
const stepIndex = computed(() => (tracking.value ? STEPS.indexOf(tracking.value.step) : 0))
const canAnswerReception = computed(
  () =>
    !!tracking.value?.declaredAt &&
    !tracking.value.receptionConfirmedAt &&
    !tracking.value.receptionContestedAt
)
const canRefuse = computed(
  () => !!tracking.value?.arrivedAt && !tracking.value.declaredAt && !tracking.value.refusedAt
)
const actingReasons = computed(() =>
  acting.value === 'refuse' ? tracking.value?.refusalReasons : tracking.value?.contestReasons
)

function startActing(kind: 'receive-confirm' | 'receive-contest' | 'refuse') {
  acting.value = kind
  signer.value = ''
  reasonNo.value = ''
  comment.value = ''
}

/* The survey, his own and optional, once he confirmed the receipt (TRS04-US06). */
const score = ref(0)
const opinion = ref('')
async function sendSurvey() {
  sending.value = true
  error.value = null
  try {
    tracking.value = await confirmationService.answer(token.value, 'satisfaction', {
      score: score.value,
      comment: opinion.value
    })
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.tracking.saveError'))
  } finally {
    sending.value = false
  }
}

/* ---- Without network (TRS03-US18): the confirmation or the contest of the receipt is kept on
 * the device and sent by itself as soon as the connection is back, without doing it again. The
 * demonstration has a switch to cut the network; the real device follows its own connection. */
type PendingReception = {
  kind: 'receive-confirm' | 'receive-contest'
  body: Record<string, unknown>
  label: string
}
const pendingKey = computed(() => `planning.tracking.pending.${token.value}`)
function readPending(): PendingReception | null {
  try {
    return JSON.parse(localStorage.getItem(pendingKey.value) ?? 'null') as PendingReception | null
  } catch {
    return null
  }
}
const pendingReception = ref<PendingReception | null>(null)
const offline = ref(false)
function keepPending(value: PendingReception | null) {
  pendingReception.value = value
  try {
    if (value) localStorage.setItem(pendingKey.value, JSON.stringify(value))
    else localStorage.removeItem(pendingKey.value)
  } catch {
    /* kept in memory only */
  }
}
async function sendPending() {
  const item = pendingReception.value
  if (!item || offline.value) return
  try {
    tracking.value = await confirmationService.answer(token.value, item.kind, item.body)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.tracking.saveError'))
  }
  keepPending(null)
}
function toggleNetwork() {
  offline.value = !offline.value
  if (!offline.value) void sendPending()
}

async function sendActing() {
  if (!acting.value) return
  if (offline.value && acting.value !== 'refuse') {
    const reason = actingReasons.value?.find((item) => item.no === reasonNo.value)?.name ?? ''
    keepPending({
      kind: acting.value,
      body:
        acting.value === 'receive-confirm'
          ? { signer: signer.value }
          : { reasonNo: reasonNo.value, comment: comment.value },
      label: acting.value === 'receive-confirm' ? signer.value.trim() : reason
    })
    acting.value = null
    return
  }
  sending.value = true
  error.value = null
  try {
    tracking.value = await confirmationService.answer(
      token.value,
      acting.value,
      acting.value === 'receive-confirm'
        ? { signer: signer.value }
        : { reasonNo: reasonNo.value, comment: comment.value }
    )
    acting.value = null
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.tracking.saveError'))
  } finally {
    sending.value = false
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    tracking.value = await confirmationService.tracking(token.value)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.tracking.loadError'))
  } finally {
    loading.value = false
  }
  pendingReception.value = readPending()
  if (pendingReception.value && !offline.value) void sendPending()
}

async function answer(kind: 'confirm' | 'unavailable' | 'accept-proposal') {
  sending.value = true
  error.value = null
  try {
    tracking.value = await confirmationService.answer(
      token.value,
      kind,
      kind === 'unavailable'
        ? replanMode.value
          ? { date: date.value }
          : { date: date.value || null, reasonNo: reasonNo.value, comment: comment.value }
        : {}
    )
    askingDate.value = false
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.tracking.saveError'))
  } finally {
    sending.value = false
  }
}

/* Once his line left the order, he only gives the day from which he can be delivered. */
const replanMode = computed(
  () => !!tracking.value && !tracking.value.open && tracking.value.replanOpen
)
const answering = computed(
  () => !!tracking.value && (tracking.value.open || tracking.value.replanOpen)
)

function startUnavailable() {
  date.value = replanMode.value
    ? (tracking.value?.availableOn ?? '')
    : (tracking.value?.proposedDate ?? '')
  reasonNo.value = ''
  comment.value = ''
  askingDate.value = true
}

onMounted(load)
watch(token, load)
</script>

<template>
  <div class="min-h-screen bg-muted/50 px-4 py-8 flex justify-center">
    <div class="w-full max-w-md space-y-4">
      <header class="flex items-center gap-3">
        <img :src="logo" :alt="appConfig.companyName" class="h-10" />
        <p class="text-sm text-muted-foreground">{{ t('planning.tracking.title') }}</p>
      </header>

      <LoadingSpinner v-if="loading" :text="t('common.loading')" />
      <FormAlerts :error="error" @clear:error="error = null" />

      <section
        v-if="tracking"
        class="bg-card border border-border rounded p-4 space-y-3 text-sm text-card-foreground"
      >
        <p class="text-base font-semibold">
          {{ t('planning.tracking.hello', { name: tracking.recipientName }) }}
        </p>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt class="text-muted-foreground">{{ t('planning.tracking.place') }}</dt>
          <dd>{{ tracking.deliveryPointName }}</dd>
          <dt class="text-muted-foreground">{{ t('planning.tracking.goods') }}</dt>
          <dd>
            {{ tracking.productName }} · {{ formatNumber(tracking.quantity) }} {{ tracking.unit }}
          </dd>
          <dt class="text-muted-foreground">{{ t('planning.tracking.date') }}</dt>
          <dd>{{ formatDate(tracking.plannedDeparture) }}</dd>
          <template v-if="tracking.expectedArrival && tracking.step !== 'received'">
            <dt class="text-muted-foreground">{{ t('planning.tracking.eta') }}</dt>
            <dd :class="tracking.late ? 'text-warning font-medium' : ''">
              {{ formatDateTime(tracking.expectedArrival) }}
              <template v-if="tracking.late"> · {{ t('planning.tracking.late') }}</template>
            </dd>
          </template>
          <template v-if="tracking.preferredSlot !== 'any'">
            <dt class="text-muted-foreground">{{ t('planning.tracking.slot') }}</dt>
            <dd>{{ t(`planning.tracking.slots.${tracking.preferredSlot}`) }}</dd>
          </template>
        </dl>

        <ol class="grid grid-cols-4 gap-1 text-[11px] leading-tight text-center">
          <li v-for="(step, index) in STEPS" :key="step" class="space-y-1">
            <span
              class="block h-1.5 rounded"
              :class="index <= stepIndex && !tracking.refusedAt ? 'bg-primary' : 'bg-border'"
            />
            <span
              :class="
                index === stepIndex ? 'font-semibold text-card-foreground' : 'text-muted-foreground'
              "
            >
              {{ t(`planning.tracking.steps.${step}`) }}
            </span>
          </li>
        </ol>

        <div
          v-if="tracking.cancelledAt"
          class="flex items-start gap-2 rounded bg-destructive/10 px-3 py-2"
        >
          <CircleX class="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p class="font-medium">{{ t('planning.tracking.cancelled') }}</p>
            <p v-if="tracking.cancellationReason">
              {{ t('planning.tracking.reasonIs', { reason: tracking.cancellationReason }) }}
            </p>
          </div>
        </div>
        <div
          v-else-if="tracking.postponedAt && !tracking.declaredAt && !tracking.refusedAt"
          class="flex items-start gap-2 rounded bg-warning/10 px-3 py-2"
        >
          <Clock class="w-5 h-5 text-warning shrink-0" />
          <div>
            <p class="font-medium">
              {{
                tracking.returnedAt
                  ? t('planning.tracking.postponedReturn')
                  : t('planning.tracking.postponed')
              }}
            </p>
            <p v-if="tracking.postponementReason">
              {{ t('planning.tracking.reasonIs', { reason: tracking.postponementReason }) }}
            </p>
          </div>
        </div>
        <div
          v-if="tracking.refusedAt"
          class="flex items-start gap-2 rounded bg-destructive/10 px-3 py-2"
        >
          <CircleX class="w-5 h-5 text-destructive shrink-0" />
          <p>{{ t('planning.tracking.refused', { reason: tracking.refusalReason }) }}</p>
        </div>
        <div
          v-else-if="tracking.receptionConfirmedAt"
          class="flex items-start gap-2 rounded bg-success/10 px-3 py-2"
        >
          <CircleCheck class="w-5 h-5 text-success shrink-0" />
          <p>
            {{
              t('planning.tracking.received', {
                name: tracking.receptionConfirmedBy,
                date: formatDate(tracking.receptionConfirmedAt)
              })
            }}
          </p>
        </div>
        <div
          v-else-if="tracking.receptionContestedAt"
          class="flex items-start gap-2 rounded bg-warning/10 px-3 py-2"
        >
          <TriangleAlert class="w-5 h-5 text-warning shrink-0" />
          <p>{{ t('planning.tracking.contested', { reason: tracking.contestReason }) }}</p>
        </div>

        <div
          v-if="pendingReception && canAnswerReception"
          class="rounded border border-border px-3 py-2 space-y-1"
        >
          <p class="font-medium">
            {{
              pendingReception.kind === 'receive-confirm'
                ? t('planning.tracking.pendingConfirm', { name: pendingReception.label })
                : t('planning.tracking.pendingContest', { reason: pendingReception.label })
            }}
          </p>
          <p class="text-xs text-muted-foreground flex items-center gap-1.5">
            <CloudOff class="w-4 h-4" /> {{ t('planning.tracking.pendingNetwork') }}
          </p>
        </div>
        <div v-else-if="!acting && (canAnswerReception || canRefuse)" class="flex flex-col gap-2">
          <p v-if="canAnswerReception">{{ t('planning.tracking.receptionQuestion') }}</p>
          <template v-if="canAnswerReception">
            <button
              type="button"
              class="cursor-pointer inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium"
              @click="startActing('receive-confirm')"
            >
              <PackageCheck class="w-5 h-5" /> {{ t('planning.tracking.receiveConfirm') }}
            </button>
            <button
              type="button"
              class="cursor-pointer inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded border border-border hover:bg-accent"
              @click="startActing('receive-contest')"
            >
              <TriangleAlert class="w-5 h-5 text-warning" />
              {{ t('planning.tracking.receiveContest') }}
            </button>
          </template>
          <button
            v-if="canRefuse"
            type="button"
            class="cursor-pointer inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded border border-destructive/40 text-destructive hover:bg-destructive/5"
            @click="startActing('refuse')"
          >
            <CircleX class="w-5 h-5" /> {{ t('planning.tracking.refuse') }}
          </button>
        </div>

        <div v-if="acting" class="space-y-2">
          <BaseFormField
            v-if="acting === 'receive-confirm'"
            :label="t('planning.tracking.signer')"
            required
          >
            <FormInput v-model="signer" :maxlength="80" />
          </BaseFormField>
          <template v-else>
            <BaseFormField :label="t('planning.tracking.reason')" required>
              <select
                v-model="reasonNo"
                class="w-full h-9 px-2 text-sm border border-border rounded bg-background"
              >
                <option value="" disabled>{{ t('planning.tracking.pickReason') }}</option>
                <option v-for="reason in actingReasons" :key="reason.no" :value="reason.no">
                  {{ reason.name }}
                </option>
              </select>
            </BaseFormField>
            <BaseFormField :label="t('planning.tracking.comment')">
              <FormInput v-model="comment" :maxlength="200" />
            </BaseFormField>
          </template>
          <div class="flex gap-2">
            <button
              type="button"
              class="cursor-pointer flex-1 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium disabled:opacity-60"
              :disabled="sending || (acting === 'receive-confirm' ? !signer.trim() : !reasonNo)"
              :title="
                acting === 'receive-confirm'
                  ? !signer.trim()
                    ? t('planning.tracking.needSigner')
                    : undefined
                  : !reasonNo
                    ? t('planning.tracking.needReason')
                    : undefined
              "
              @click="sendActing"
            >
              {{ t('planning.tracking.send') }}
            </button>
            <button
              type="button"
              class="cursor-pointer px-4 py-2.5 rounded border border-border hover:bg-accent"
              @click="acting = null"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>

        <!-- What was not delivered or was postponed is delivered from the day retained; its own
             link opens once its order is planned, to confirm the new date (TRS01-US16, US17). -->
        <div
          v-if="tracking.replannedOn"
          class="rounded border border-primary/30 bg-primary/5 px-3 py-2 space-y-1"
        >
          <p>
            {{
              tracking.declaredAt
                ? t('planning.tracking.remainderOn', { date: formatDate(tracking.replannedOn) })
                : t('planning.tracking.replannedOn', { date: formatDate(tracking.replannedOn) })
            }}
          </p>
          <a
            v-if="tracking.nextTrackingToken"
            :href="`#/suivi/${tracking.nextTrackingToken}`"
            class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {{ t('planning.tracking.nextDelivery') }}
          </a>
          <p v-else class="text-xs text-muted-foreground">
            {{ t('planning.tracking.nextDeliveryLater') }}
          </p>
        </div>
        <div
          v-if="tracking.open && tracking.state === 'confirmed'"
          class="flex items-start gap-2 rounded bg-success/10 px-3 py-2"
        >
          <CircleCheck class="w-5 h-5 text-success shrink-0" />
          <p>{{ t('planning.tracking.confirmed') }}</p>
        </div>
        <div
          v-else-if="tracking.state === 'unavailable'"
          class="flex items-start gap-2 rounded bg-warning/10 px-3 py-2"
        >
          <CalendarClock class="w-5 h-5 text-warning shrink-0" />
          <p>
            {{ t('planning.tracking.unavailable', { date: formatDate(tracking.availableOn) }) }}
          </p>
        </div>

        <div
          v-if="
            answering &&
            !askingDate &&
            tracking.plannerProposedOn &&
            (replanMode || tracking.state !== 'confirmed')
          "
          class="rounded border border-primary/30 bg-primary/5 px-3 py-2 space-y-2"
        >
          <p>
            {{ t('planning.tracking.proposal', { date: formatDate(tracking.plannerProposedOn) }) }}
          </p>
          <p
            v-if="tracking.availableOn === tracking.plannerProposedOn"
            class="text-xs text-muted-foreground"
          >
            {{ t('planning.tracking.proposalAccepted') }}
          </p>
          <div v-else class="flex flex-wrap gap-2">
            <button
              type="button"
              class="cursor-pointer px-3 py-2 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              :disabled="sending"
              @click="answer('accept-proposal')"
            >
              {{ t('planning.tracking.acceptProposal') }}
            </button>
            <button
              type="button"
              class="cursor-pointer px-3 py-2 rounded border border-border text-sm hover:bg-accent"
              @click="startUnavailable"
            >
              {{ t('planning.tracking.otherDate') }}
            </button>
          </div>
        </div>

        <div
          v-if="replanMode && !askingDate && !tracking.plannerProposedOn"
          class="rounded border border-primary/30 bg-primary/5 px-3 py-2 space-y-2"
        >
          <p>{{ t('planning.tracking.replanQuestion') }}</p>
          <p v-if="tracking.availableOn" class="text-xs">
            {{ t('planning.tracking.replanGiven', { date: formatDate(tracking.availableOn) }) }}
          </p>
          <button
            type="button"
            class="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded border border-border text-sm hover:bg-accent"
            @click="startUnavailable"
          >
            <CalendarClock class="w-4 h-4 text-primary" />
            {{
              tracking.availableOn
                ? t('planning.tracking.changeDate')
                : t('planning.tracking.giveDate')
            }}
          </button>
        </div>

        <template v-if="tracking.open && !askingDate">
          <p v-if="tracking.state === 'pending'">{{ t('planning.tracking.question') }}</p>
          <div class="flex flex-col gap-2">
            <button
              v-if="tracking.state !== 'confirmed'"
              type="button"
              class="cursor-pointer inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium disabled:opacity-60"
              :disabled="sending"
              @click="answer('confirm')"
            >
              <PackageCheck class="w-5 h-5" /> {{ t('planning.tracking.confirm') }}
            </button>
            <button
              type="button"
              class="cursor-pointer inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded border border-border hover:bg-accent disabled:opacity-60"
              :disabled="sending"
              @click="startUnavailable"
            >
              <CalendarClock class="w-5 h-5 text-primary" />
              {{
                tracking.state === 'unavailable'
                  ? t('planning.tracking.changeDate')
                  : t('planning.tracking.notAvailable')
              }}
            </button>
          </div>
        </template>

        <div v-if="askingDate" class="space-y-2">
          <BaseFormField v-if="!replanMode" :label="t('planning.tracking.reason')" required>
            <select
              v-model="reasonNo"
              class="w-full h-9 px-2 text-sm border border-border rounded bg-background"
            >
              <option value="" disabled>{{ t('planning.tracking.pickReason') }}</option>
              <option v-for="reason in tracking.reasons" :key="reason.no" :value="reason.no">
                {{ reason.name }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField v-if="!replanMode" :label="t('planning.tracking.comment')">
            <FormInput v-model="comment" :maxlength="200" />
          </BaseFormField>
          <BaseFormField :label="t('planning.tracking.newDate')" :required="replanMode">
            <DateFormInput v-model="date" />
            <p v-if="!replanMode" class="text-xs text-muted-foreground mt-1">
              {{ t('planning.tracking.newDateHint', { date: formatDate(tracking.proposedDate) }) }}
            </p>
          </BaseFormField>
          <div class="flex gap-2">
            <button
              type="button"
              class="cursor-pointer flex-1 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium disabled:opacity-60"
              :disabled="sending || (replanMode ? !date : !reasonNo)"
              :title="
                replanMode
                  ? !date
                    ? t('planning.tracking.needDate')
                    : undefined
                  : !reasonNo
                    ? t('planning.tracking.needReason')
                    : undefined
              "
              @click="answer('unavailable')"
            >
              {{ t('planning.tracking.send') }}
            </button>
            <button
              type="button"
              class="cursor-pointer px-4 py-2.5 rounded border border-border hover:bg-accent"
              @click="askingDate = false"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>

        <p v-if="!tracking.open && tracking.step === 'planned'" class="text-muted-foreground">
          {{ t('planning.tracking.closed') }}
        </p>
        <div
          v-if="tracking.receptionConfirmedAt"
          class="rounded border border-border px-3 py-2 space-y-2"
        >
          <p class="font-medium">{{ t('planning.tracking.survey.title') }}</p>
          <template v-if="tracking.satisfactionScore !== null">
            <p>
              {{ '★'.repeat(tracking.satisfactionScore)
              }}{{ '☆'.repeat(5 - tracking.satisfactionScore) }}
              <span v-if="tracking.satisfactionComment" class="text-muted-foreground">
                · {{ tracking.satisfactionComment }}
              </span>
            </p>
            <p class="text-xs text-muted-foreground">{{ t('planning.tracking.survey.thanks') }}</p>
          </template>
          <template v-else>
            <p class="text-xs text-muted-foreground">{{ t('planning.tracking.survey.hint') }}</p>
            <div
              class="flex gap-1"
              role="radiogroup"
              :aria-label="t('planning.tracking.survey.score')"
            >
              <button
                v-for="value in 5"
                :key="value"
                type="button"
                class="cursor-pointer text-2xl leading-none"
                :class="value <= score ? 'text-warning' : 'text-muted-foreground'"
                :aria-label="String(value)"
                @click="score = value"
              >
                ★
              </button>
            </div>
            <FormInput
              v-model="opinion"
              :maxlength="300"
              :placeholder="t('planning.tracking.survey.comment')"
            />
            <button
              type="button"
              class="cursor-pointer px-3 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-60"
              :disabled="sending || !score"
              :title="!score ? t('planning.tracking.survey.pickScore') : undefined"
              @click="sendSurvey"
            >
              {{ t('planning.tracking.send') }}
            </button>
          </template>
        </div>

        <div class="rounded border border-border px-3 py-2 space-y-1">
          <p class="font-medium">{{ t('planning.tracking.loadedTitle') }}</p>
          <p v-if="tracking.notLoaded" class="text-warning">
            {{ t('planning.tracking.notLoaded') }}
          </p>
          <p v-else-if="tracking.loadedQuantity === null" class="text-muted-foreground">
            {{ t('planning.tracking.notLoadedYet') }}
          </p>
          <template v-else>
            <p :class="tracking.refusedAt ? 'line-through text-muted-foreground' : ''">
              {{ tracking.productName }} · {{ formatNumber(tracking.loadedQuantity) }}
              {{ tracking.unit }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t('planning.tracking.loadedOn', { date: formatDate(tracking.loadedOn) }) }}
            </p>
          </template>
        </div>

        <div v-if="tracking.parts.length" class="rounded border border-border px-3 py-2 space-y-1">
          <p class="font-medium">
            {{ t('planning.tracking.parts.title', { count: tracking.parts.length }) }}
          </p>
          <div
            v-for="(part, index) in tracking.parts"
            :key="part.requestNo"
            class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs border-t border-border pt-1 first-of-type:border-t-0"
          >
            <span class="font-medium">
              {{ t('planning.tracking.parts.delivery', { no: index + 1 }) }}
            </span>
            <span class="flex-1 min-w-0 text-muted-foreground">
              {{ formatNumber(part.quantity) }} {{ part.unit }}
              <template v-if="part.vehiclePlate">
                · {{ t('planning.tracking.parts.truck', { plate: part.vehiclePlate }) }}
              </template>
              <template v-if="part.plannedDeparture">
                · {{ formatDate(part.plannedDeparture) }}
              </template>
              <template v-if="part.expectedArrival">
                · {{ t('planning.tracking.eta') }} {{ formatDateTime(part.expectedArrival) }}
              </template>
              · {{ t(`planning.tracking.parts.state.${part.state}`) }}
            </span>
            <span v-if="part.current" class="text-primary">
              {{ t('planning.tracking.parts.current') }}
            </span>
            <a
              v-else-if="part.trackingToken"
              :href="`#/suivi/${part.trackingToken}`"
              class="text-primary hover:underline"
            >
              {{ t('planning.tracking.parts.follow') }}
            </a>
          </div>
        </div>

        <details
          v-if="tracking.deliveryNote"
          :open="!!tracking.declaredAt"
          class="rounded border border-border px-3 py-2"
        >
          <summary class="cursor-pointer font-medium">
            {{ t('planning.tracking.deliveryNoteTitle') }}
          </summary>
          <DeliveryNoteView class="mt-2" :note="tracking.deliveryNote" />
        </details>
        <details
          v-if="tracking.messages.length"
          class="rounded border border-border px-3 py-2 space-y-1"
        >
          <summary class="cursor-pointer font-medium">
            {{ t('planning.tracking.messages.title') }}
          </summary>
          <p v-for="(message, index) in tracking.messages" :key="index" class="text-xs">
            <span class="text-muted-foreground">
              {{ formatDateTime(message.at) }} ·
              {{ t(`planning.tracking.messages.channel.${message.channel}`) }}
              <template v-if="message.to"> · {{ message.to }}</template>
            </span>
            <br />
            {{
              t(`planning.tracking.messages.${message.kind}`, {
                date: formatDate(tracking.plannedDeparture),
                vehicle: tracking.vehiclePlate || '·',
                driver: tracking.driverName || '·',
                eta: formatDateTime(tracking.expectedArrival)
              })
            }}
          </p>
        </details>
      </section>

      <button
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 h-8 rounded border text-xs transition"
        :class="
          offline
            ? 'border-warning text-warning bg-warning/10'
            : 'border-border text-muted-foreground hover:bg-accent'
        "
        @click="toggleNetwork"
      >
        <component :is="offline ? CloudOff : Wifi" class="w-4 h-4" />
        {{ offline ? t('selfService.offline.on') : t('selfService.offline.off') }}
      </button>
    </div>
  </div>
</template>
