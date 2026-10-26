<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeftRight, CircleArrowDown, Gauge, RotateCcw, Trash2, Wrench } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { useReferenceStore } from '@/stores/referenceStore'
import type { TyreAction } from '../api/tyreApi'
import type { TyrePositionSlot } from '../types/tyre.types'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import TyreForm from '../components/TyreForm.vue'
import { tyreService } from '../services/tyreService'
import { useTyreStore } from '../stores/tyreStore'

const props = defineProps<{
  tyreNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useTyreStore()
const { canUpdate, canInsert, canExecute } = usePermissions('TYRE')
const formRef = ref<InstanceType<typeof TyreForm> | null>(null)

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
  no: () => props.tyreNo,
  store,
  form: formRef,
  update: tyreService.update,
  canUpdate,
  label: (record) => record.serialNumber,
  saveErrorFallback: t('maintenance.tyres.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value ? `${item.value.no} · ${item.value.serialNumber}` : t('maintenance.tyres.card')
)

/** Same floor as the server for the reason of a scrapping. */
const MIN_REASON = 10

const referenceStore = useReferenceStore()
const technicians = computed(() =>
  referenceStore.getItems('technicians').filter((technician) => technician.active !== false)
)

type Dialog = 'mount' | 'reading' | 'rotate' | 'dismount' | 'backFromRetread' | null
const dialog = ref<Dialog>(null)
const scrapping = ref(false)
const acting = ref(false)
const form = ref({
  vehicleNo: '',
  positionCode: '',
  pressureBar: null as number | null,
  treadMm: null as number | null,
  technicianNo: '',
  reason: '',
  cost: null as number | null
})
const slots = ref<TyrePositionSlot[]>([])

async function loadSlots(vehicleNo: string) {
  slots.value = vehicleNo ? await tyreService.positions(vehicleNo).catch(() => []) : []
}

watch(
  () => form.value.vehicleNo,
  (vehicleNo) => {
    form.value.positionCode = ''
    if (dialog.value === 'mount') void loadSlots(vehicleNo)
  }
)

async function openDialog(next: Exclude<Dialog, null>) {
  form.value = {
    vehicleNo: '',
    positionCode: '',
    pressureBar: null,
    treadMm: null,
    technicianNo: '',
    reason: '',
    cost: null
  }
  dialog.value = next
  if (next === 'rotate' && item.value?.vehicleNo) await loadSlots(item.value.vehicleNo)
}

const confirmDisabled = computed(() => {
  const value = form.value
  switch (dialog.value) {
    case 'mount':
      return !value.vehicleNo || !value.positionCode
    case 'reading':
      return value.pressureBar === null || value.treadMm === null
    case 'rotate':
      return !value.positionCode || !value.technicianNo
    case 'backFromRetread':
      return value.cost === null
    default:
      return false
  }
})

async function act(action: TyreAction, body: Record<string, unknown> = {}) {
  const no = item.value?.no
  if (!no) return false
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await tyreService.act(no, action, body))
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('maintenance.tyres.saveError'))
    return false
  } finally {
    acting.value = false
  }
}

async function confirm() {
  const value = form.value
  const done = await (() => {
    switch (dialog.value) {
      case 'mount':
        return act('mount', { vehicleNo: value.vehicleNo, positionCode: value.positionCode })
      case 'reading':
        return act('reading', { pressureBar: value.pressureBar, treadMm: value.treadMm })
      case 'rotate':
        return act('rotate', { positionCode: value.positionCode, technicianNo: value.technicianNo })
      case 'dismount':
        return act('dismount', { reason: value.reason.trim() })
      default:
        return act('back-from-retread', { cost: value.cost })
    }
  })()
  if (done) dialog.value = null
}

async function scrap(reason: string) {
  if (await act('scrap', { reason })) scrapping.value = false
}

const slotLabel = (slot: TyrePositionSlot) =>
  [
    slot.code,
    slot.spare ? t('maintenance.tyres.position.spare') : slot.axleLabel,
    slot.side ? t(`maintenance.tyres.position.${slot.side}`) : '',
    slot.tyreNo ? `(${slot.tyreNo})` : ''
  ]
    .filter(Boolean)
    .join(' · ')

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('maintenance.tyres.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving"
    :actions-disabled="isLoading || isSaving"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('maintenance.tyres.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canUpdate"
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
      <TyreStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="item && canUpdate && !isEditMode && !isFormDirty" #action-buttons>
      <template v-if="item.status === 'stock'">
        <button type="button" :class="buttonClass" :disabled="acting" @click="openDialog('mount')">
          <Wrench class="w-5 h-5 text-primary" /> {{ t('maintenance.tyres.action.mount') }}
        </button>
        <button type="button" :class="buttonClass" :disabled="acting" @click="act('retread')">
          <RotateCcw class="w-5 h-5 text-primary" /> {{ t('maintenance.tyres.action.retread') }}
        </button>
      </template>
      <template v-if="item.status === 'mounted'">
        <button
          type="button"
          :class="buttonClass"
          :disabled="acting"
          @click="openDialog('reading')"
        >
          <Gauge class="w-5 h-5 text-primary" /> {{ t('maintenance.tyres.action.reading') }}
        </button>
        <button type="button" :class="buttonClass" :disabled="acting" @click="openDialog('rotate')">
          <ArrowLeftRight class="w-5 h-5 text-primary" /> {{ t('maintenance.tyres.action.rotate') }}
        </button>
        <button
          type="button"
          :class="buttonClass"
          :disabled="acting"
          @click="openDialog('dismount')"
        >
          <CircleArrowDown class="w-5 h-5 text-primary" />
          {{ t('maintenance.tyres.action.dismount') }}
        </button>
      </template>
      <button
        v-if="item.status === 'retreading'"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="openDialog('backFromRetread')"
      >
        <RotateCcw class="w-5 h-5 text-primary" />
        {{ t('maintenance.tyres.action.backFromRetread') }}
      </button>
      <button
        v-if="canExecute && item.status !== 'scrapped'"
        type="button"
        :class="buttonClass"
        :disabled="acting"
        @click="scrapping = true"
      >
        <Trash2 class="w-5 h-5 text-primary" /> {{ t('maintenance.tyres.action.scrap') }}
      </button>
    </template>
    <template #form>
      <div class="min-h-0 flex flex-col h-full">
        <div class="sticky top-0 z-20 shrink-0 pt-1 px-6">
          <LoadingBar
            v-if="isLoading || isSaving"
            :height="2"
            bar-color="var(--color-primary)"
            track-color="rgba(0,0,0,0.2)"
          />
        </div>
        <div
          class="flex-1 min-h-0 overflow-y-auto transition-opacity duration-200"
          :class="isSaving ? 'opacity-60 pointer-events-none select-none' : ''"
        >
          <TyreForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
          />
          <TyreLifeSections v-if="item" :tyre="item" />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="dialog !== null"
    :title="dialog ? t(`maintenance.tyres.action.${dialog}`) : ''"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="confirmDisabled"
    :loading="acting"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dialog = null"
  >
    <div class="space-y-3">
      <BaseFormField
        v-if="dialog === 'mount'"
        :label="t('maintenance.tyres.dialog.vehicle')"
        required
      >
        <ReferenceLookup
          v-model="form.vehicleNo"
          reference-key="vehicles"
          :modal-title="t('maintenance.tyres.dialog.vehicle')"
        />
      </BaseFormField>
      <BaseFormField
        v-if="dialog === 'mount' || dialog === 'rotate'"
        :label="t('maintenance.tyres.dialog.position')"
        required
      >
        <select
          v-model="form.positionCode"
          class="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
        >
          <option value="" disabled>{{ t('maintenance.tyres.dialog.pickPosition') }}</option>
          <option
            v-for="slot in slots"
            :key="slot.code"
            :value="slot.code"
            :disabled="(dialog === 'mount' && !!slot.tyreNo) || slot.code === item?.positionCode"
          >
            {{ slotLabel(slot) }}
          </option>
        </select>
        <p
          v-if="dialog === 'mount' && form.vehicleNo && !slots.length"
          class="text-xs mt-1 text-muted-foreground"
        >
          {{ t('maintenance.tyres.dialog.noLayout') }}
        </p>
      </BaseFormField>
      <BaseFormField
        v-if="dialog === 'rotate'"
        :label="t('maintenance.tyres.dialog.technician')"
        required
      >
        <select
          v-model="form.technicianNo"
          class="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
        >
          <option v-for="technician in technicians" :key="technician.code" :value="technician.code">
            {{ technician.description }}
          </option>
        </select>
      </BaseFormField>
      <template v-if="dialog === 'reading'">
        <BaseFormField :label="t('maintenance.tyres.dialog.pressureBar')" required>
          <FormInput v-model="form.pressureBar" type="number" :min="0" :step="0.1" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.tyres.dialog.treadMm')" required>
          <FormInput v-model="form.treadMm" type="number" :min="0" :step="0.1" />
        </BaseFormField>
      </template>
      <BaseFormField v-if="dialog === 'dismount'" :label="t('maintenance.tyres.dialog.reason')">
        <FormTextarea v-model="form.reason" :rows="2" :maxlength="300" />
      </BaseFormField>
      <BaseFormField
        v-if="dialog === 'backFromRetread'"
        :label="t('maintenance.tyres.dialog.cost')"
        required
      >
        <FormInput v-model="form.cost" type="number" :min="0" />
      </BaseFormField>
    </div>
  </ConfirmDialog>

  <ReasonDialog
    :open="scrapping"
    :title="t('maintenance.tyres.action.scrap')"
    :label="t('maintenance.tyres.dialog.reason')"
    :confirm-label="t('common.confirm')"
    :min-length="MIN_REASON"
    :loading="acting"
    destructive
    @confirm="scrap"
    @cancel="scrapping = false"
  />
</template>
