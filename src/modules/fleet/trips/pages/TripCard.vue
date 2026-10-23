<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, Flag, FlagTriangleRight, Lock, MapPinCheck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { formatNumber } from '@/utils/format'
import TripForm from '../components/TripForm.vue'
import { canApply, nextStopIndex } from '../domain/trip'
import { tripService } from '../services/tripService'
import { useTripStore } from '../stores/tripStore'
import type { TripApi } from '../types/trip.types'

const props = defineProps<{
  tripNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTripStore()
const { canUpdate, canInsert, canExecute } = usePermissions('TRIP')
const formRef = ref<InstanceType<typeof TripForm> | null>(null)

/** Only a planned trip changes; afterwards it moves on through its actions. */
const canEdit = computed(
  () => canUpdate.value && !!store.currentItem && canApply('edit', store.currentItem.status)
)

const {
  item,
  isLoading,
  errorMsg,
  isEditMode,
  isSaving,
  saveError,
  saveSuccess,
  validationErrors,
  isFormDirty,
  hasPrev,
  hasNext,
  sidebarItems,
  enterEditMode,
  cancelEdit,
  saveItem,
  goTo,
  goToPrev,
  goToNext
} = useEntityCard({
  no: () => props.tripNo,
  store,
  form: formRef,
  update: tripService.update,
  canUpdate: canEdit,
  label: (trip) => trip.routeName,
  saveErrorFallback: t('fleet.trips.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.routeName}` : t('fleet.trips.card')
)

const acting = ref(false)
const showActions = computed(
  () => canExecute.value && !!item.value && !isEditMode.value && !isFormDirty.value
)
const can = (action: Parameters<typeof canApply>[0]) =>
  !!item.value && canApply(action, item.value.status)
const canPassStop = computed(
  () => can('passStop') && !!item.value && nextStopIndex(item.value.stops) !== null
)

async function runAction(action: () => Promise<TripApi>): Promise<boolean> {
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.trips.actionError'))
    return false
  } finally {
    acting.value = false
  }
}

type Dialog = 'start' | 'complete' | 'cancel' | null
const dialog = ref<Dialog>(null)
const km = ref<number | null>(null)
const reason = ref('')

function open(next: Dialog) {
  km.value = next === 'complete' ? (item.value?.startOdometerKm ?? null) : null
  reason.value = ''
  dialog.value = next
}

const kmTooLow = computed(
  () =>
    dialog.value === 'complete' &&
    km.value !== null &&
    km.value < (item.value?.startOdometerKm ?? 0)
)
const confirmDisabled = computed(() => {
  if (dialog.value === 'complete') return km.value === null || kmTooLow.value
  if (dialog.value === 'cancel') return !reason.value.trim()
  return false
})

async function confirm() {
  const no = item.value?.no
  if (!no) return
  const done = await runAction(() => {
    if (dialog.value === 'start') return tripService.start(no, km.value)
    if (dialog.value === 'complete') return tripService.complete(no, km.value ?? 0)
    return tripService.cancel(no, reason.value)
  })
  if (done) dialog.value = null
}

function passStop() {
  const no = item.value?.no
  if (no) void runAction(() => tripService.passStop(no))
}

function closeTrip() {
  const no = item.value?.no
  if (no) void runAction(() => tripService.close(no))
}

const nextStopName = computed(() => {
  const index = item.value ? nextStopIndex(item.value.stops) : null
  return index === null ? '' : (item.value?.stops[index]?.siteName ?? '')
})
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.trips.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || acting"
    :actions-disabled="isLoading || isSaving || acting"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.trips.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canEdit"
    :show-title-new-button="canInsert"
    :has-unsaved-changes="isFormDirty"
    :can-save="isFormDirty"
    @close="emit('close')"
    @save="saveItem"
    @enter-edit="enterEditMode"
    @cancel-edit="cancelEdit"
    @go-prev="goToPrev"
    @go-next="goToNext"
    @select-sidebar="goTo"
    @create="emit('create')"
    @clear-save-error="saveError = null"
  >
    <template #title-badges>
      <TripStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions" #action-buttons>
      <button
        v-if="can('start')"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting || item?.authorizationDecision !== 'granted'"
        :title="
          item?.authorizationDecision !== 'granted'
            ? t('fleet.trips.needsAuthorization')
            : undefined
        "
        @click="open('start')"
      >
        <FlagTriangleRight class="w-5 h-5 text-primary" /> {{ t('fleet.trips.action.start') }}
      </button>
      <button
        v-if="canPassStop"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="passStop"
      >
        <MapPinCheck class="w-5 h-5 text-primary" />
        {{ t('fleet.trips.action.passStop', { site: nextStopName }) }}
      </button>
      <button
        v-if="can('complete')"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="open('complete')"
      >
        <Flag class="w-5 h-5 text-primary" /> {{ t('fleet.trips.action.complete') }}
      </button>
      <button
        v-if="can('close')"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="closeTrip"
      >
        <Lock class="w-5 h-5 text-primary" /> {{ t('fleet.trips.action.close') }}
      </button>
      <button
        v-if="can('cancel')"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="acting"
        @click="open('cancel')"
      >
        <Ban class="w-5 h-5 text-primary" /> {{ t('fleet.trips.action.cancel') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving || acting"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <TripForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="dialog !== null"
    :title="dialog ? t(`fleet.trips.action.${dialog}`) : ''"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="confirmDisabled"
    :loading="acting"
    :destructive="dialog === 'cancel'"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dialog = null"
  >
    <div class="space-y-3">
      <template v-if="dialog === 'start'">
        <p class="text-sm text-muted-foreground">{{ t('fleet.trips.dialog.startHint') }}</p>
        <BaseFormField :label="t('fleet.trips.dialog.startKm')">
          <FormInput v-model="km" type="number" :min="0" />
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'complete'">
        <BaseFormField :label="t('fleet.trips.dialog.endKm')" required>
          <FormInput v-model="km" type="number" :min="0" :invalid="kmTooLow" />
          <p class="text-xs mt-1" :class="kmTooLow ? 'text-destructive' : 'text-muted-foreground'">
            {{
              t('fleet.trips.dialog.startWas', {
                km: formatNumber(item?.startOdometerKm ?? 0, 0)
              })
            }}
          </p>
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'cancel'">
        <BaseFormField :label="t('fleet.trips.dialog.cancelReason')" required>
          <FormTextarea v-model="reason" :rows="3" :maxlength="300" />
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>
</template>
