<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CalendarClock, CircleCheck, CircleX, PackageCheck, TriangleAlert } from '@lucide/vue'
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

async function sendActing() {
  if (!acting.value) return
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
}

async function answer(kind: 'confirm' | 'unavailable' | 'accept-proposal') {
  sending.value = true
  error.value = null
  try {
    tracking.value = await confirmationService.answer(
      token.value,
      kind,
      kind === 'unavailable'
        ? { date: date.value || null, reasonNo: reasonNo.value, comment: comment.value }
        : {}
    )
    askingDate.value = false
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.tracking.saveError'))
  } finally {
    sending.value = false
  }
}

function startUnavailable() {
  date.value = tracking.value?.proposedDate ?? ''
  reasonNo.value = ''
  comment.value = ''
  askingDate.value = true
}

onMounted(load)
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

        <DeliveryNoteView v-if="tracking.deliveryNote" :note="tracking.deliveryNote" />

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
              @click="sendSurvey"
            >
              {{ t('planning.tracking.send') }}
            </button>
          </template>
        </div>

        <div
          v-if="tracking.messages.length"
          class="rounded border border-border px-3 py-2 space-y-1"
        >
          <p class="font-medium">{{ t('planning.tracking.messages.title') }}</p>
          <p v-for="(message, index) in tracking.messages" :key="index" class="text-xs">
            <span class="text-muted-foreground">
              {{ formatDateTime(message.at) }} ·
              {{ t(`planning.tracking.messages.channel.${message.channel}`) }}
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

        <div v-if="!acting && (canAnswerReception || canRefuse)" class="flex flex-col gap-2">
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
            tracking.open &&
            !askingDate &&
            tracking.plannerProposedOn &&
            tracking.state !== 'confirmed'
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
          <BaseFormField :label="t('planning.tracking.reason')" required>
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
          <BaseFormField :label="t('planning.tracking.comment')">
            <FormInput v-model="comment" :maxlength="200" />
          </BaseFormField>
          <BaseFormField :label="t('planning.tracking.newDate')">
            <DateFormInput v-model="date" />
            <p class="text-xs text-muted-foreground mt-1">
              {{ t('planning.tracking.newDateHint', { date: formatDate(tracking.proposedDate) }) }}
            </p>
          </BaseFormField>
          <div class="flex gap-2">
            <button
              type="button"
              class="cursor-pointer flex-1 px-4 py-2.5 rounded bg-primary text-primary-foreground font-medium disabled:opacity-60"
              :disabled="sending || !reasonNo"
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
      </section>
    </div>
  </div>
</template>
