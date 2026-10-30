<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { MoreAction } from '@/components/shared/MoreActionsMenu.vue'
import PrimaryActionButton from '@/modules/fleet/shared/components/PrimaryActionButton.vue'
import { useI18n } from 'vue-i18n'
import { Ban, Gauge, LogOut, RectangleHorizontal, Wrench } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import type { CardOpenMode } from '@/composables/cardOpenMode'
import { useEntityCard } from '@/composables/useEntityCard'
import { usePermissions } from '@/composables/usePermissions'
import { todayIso } from '@/utils/date'
import { formatNumber } from '@/utils/format'
import VehicleForm from '../components/VehicleForm.vue'
import VehicleOwnershipSection from '../components/VehicleOwnershipSection.vue'
import VehicleOnboardReadings from '@/modules/fleet/live-map/components/VehicleOnboardReadings.vue'
import VehicleTelematicsJournal from '@/modules/fleet/live-map/components/VehicleTelematicsJournal.vue'
import { vehicleService } from '../services/vehicleService'
import { useVehicleStore } from '../stores/vehicleStore'
import type { VehicleApi } from '../types/vehicle.types'

const props = defineProps<{
  vehicleNo: string
  initialOpenMode?: CardOpenMode
  showCreateSuccess?: boolean
}>()
const emit = defineEmits<{ close: []; create: [] }>()

const { t } = useI18n()
const store = useVehicleStore()
const { canUpdate, canInsert, canExecute } = usePermissions('VEHICLE')
const { canRead: canReadCosts } = usePermissions('RELIABILITY')
const { canRead: canReadTelematics } = usePermissions('TELEMATICS')
const formRef = ref<InstanceType<typeof VehicleForm> | null>(null)

const isRemoved = computed(() => store.currentItem?.status === 'removed')
const canEdit = computed(() => canUpdate.value && !isRemoved.value)

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
  no: () => props.vehicleNo,
  store,
  form: formRef,
  update: vehicleService.update,
  canUpdate: canEdit,
  label: (vehicle) => vehicle.plate,
  saveErrorFallback: t('fleet.vehicles.saveError'),
  initialOpenMode: () => props.initialOpenMode,
  justCreated: () => !!props.showCreateSuccess
})

const pageTitle = computed(() =>
  item.value
    ? `${item.value.plate} · ${item.value.make} ${item.value.model}`
    : t('fleet.vehicles.card')
)

const showActions = computed(() => !!item.value && !isRemoved.value && !isFormDirty.value)
const acting = ref(false)

/** Applies an action, then refreshes the card and the list with the record the server returns. */
async function runAction(action: () => Promise<VehicleApi>): Promise<boolean> {
  acting.value = true
  saveError.value = null
  try {
    store.setCurrentItem(await action())
    await store.fetchItems(store.pagination.page, store.pagination.limit)
    return true
  } catch (error) {
    saveError.value = apiErrorMessage(error, t('fleet.vehicles.actionError'))
    return false
  } finally {
    acting.value = false
  }
}

type Dialog = 'plate' | 'odometer' | 'outOfService' | 'removal' | null
const dialog = ref<Dialog>(null)
const plate = ref('')
const plateReason = ref('')
const km = ref<number | null>(null)
const reason = ref('')
const removal = ref({
  date: todayIso(),
  reason: '',
  finalOdometerKm: null as number | null,
  comment: ''
})

function open(next: Dialog) {
  plate.value = ''
  plateReason.value = ''
  km.value = item.value?.odometerKm ?? null
  reason.value = ''
  removal.value = {
    date: todayIso(),
    reason: '',
    finalOdometerKm: item.value?.odometerKm ?? null,
    comment: ''
  }
  dialog.value = next
}

function returnToService() {
  const no = item.value?.no
  if (no) void runAction(() => vehicleService.returnToService(no))
}

const kmTooLow = computed(() => km.value !== null && km.value < (item.value?.odometerKm ?? 0))

async function confirm() {
  if (!item.value) return
  const no = item.value.no
  const done = await runAction(() => {
    switch (dialog.value) {
      case 'plate':
        return vehicleService.changePlate(no, plate.value, plateReason.value)
      case 'odometer':
        return vehicleService.recordOdometer(no, km.value ?? 0)
      case 'outOfService':
        return vehicleService.putOutOfService(no, reason.value)
      default:
        return vehicleService.removeFromFleet(no, removal.value)
    }
  })
  if (done) dialog.value = null
}

const confirmDisabled = computed(() => {
  switch (dialog.value) {
    case 'plate':
      return !plate.value.trim()
    case 'odometer':
      return km.value === null || kmTooLow.value
    case 'outOfService':
      return !reason.value.trim()
    case 'removal':
      return !removal.value.reason.trim() || !removal.value.date
    default:
      return true
  }
})

/** Reading the odometer is the everyday gesture; the rarer ones wait in « Plus d'actions ». */
const moreActions = computed<MoreAction[]>(() => {
  const vehicle = item.value
  if (!showActions.value || !vehicle) return []
  return [
    {
      key: 'plate',
      label: t('fleet.vehicles.action.plate'),
      icon: RectangleHorizontal,
      hidden: !canUpdate.value,
      disabled: acting.value,
      onSelect: () => open('plate')
    },
    {
      key: 'returnToService',
      label: t('fleet.vehicles.action.returnToService'),
      icon: Wrench,
      hidden: !canExecute.value || !vehicle.outOfService,
      disabled: acting.value,
      onSelect: returnToService
    },
    {
      key: 'outOfService',
      label: t('fleet.vehicles.action.outOfService'),
      icon: Ban,
      hidden: !canExecute.value || !!vehicle.outOfService,
      disabled: acting.value,
      onSelect: () => open('outOfService')
    },
    {
      key: 'removal',
      label: t('fleet.vehicles.action.removal'),
      icon: LogOut,
      hidden: !canExecute.value,
      disabled: acting.value,
      danger: true,
      onSelect: () => open('removal')
    }
  ]
})

const dialogTitle = computed(() => (dialog.value ? t(`fleet.vehicles.action.${dialog.value}`) : ''))
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="item?.no"
    :banner-label="t('fleet.vehicles.card')"
    :is-loading="isLoading"
    :error-msg="errorMsg"
    :has-data="!!item"
    :is-edit-mode="isEditMode"
    :is-saving="isSaving || acting"
    :actions-disabled="isLoading || isSaving || acting"
    :save-error="saveError"
    :save-success="saveSuccess"
    :save-success-message="t('fleet.vehicles.saveSuccess')"
    :sidebar-items="sidebarItems"
    :current-no="item?.no ?? null"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-edit="canEdit"
    :show-title-new-button="canInsert"
    :has-unsaved-changes="isFormDirty"
    :can-save="isFormDirty"
    :more-actions="moreActions"
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
      <VehicleStatusPill v-if="item" :status="item.status" />
    </template>
    <template v-if="showActions && item && canUpdate" #action-buttons>
      <PrimaryActionButton
        :label="t('fleet.vehicles.action.odometer')"
        :icon="Gauge"
        :disabled="acting"
        @click="open('odometer')"
      />
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
          <VehicleForm
            ref="formRef"
            :initial-data="item ?? {}"
            :disabled="!isEditMode || isSaving"
            :validation-errors="validationErrors"
            :can-edit-directly="canEdit"
            @updated="store.setCurrentItem"
          />
          <VehicleOwnershipSection v-if="item && canReadCosts" :vehicle-no="item.no" />
          <VehicleCostSection v-if="item && canReadCosts" :vehicle-no="item.no" />
          <VehicleOnboardReadings v-if="item && canReadTelematics" :vehicle-no="item.no" />
          <VehicleTelematicsJournal v-if="item && canReadTelematics" :vehicle-no="item.no" />
        </div>
      </div>
    </template>
  </CardModalShell>

  <ConfirmDialog
    :open="dialog !== null"
    :title="dialogTitle"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="confirmDisabled"
    :loading="acting"
    :destructive="dialog === 'removal'"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="dialog = null"
  >
    <div class="space-y-3">
      <template v-if="dialog === 'plate'">
        <p class="text-sm text-muted-foreground">
          {{ t('fleet.vehicles.dialog.plateHint', { plate: item?.plate ?? '' }) }}
        </p>
        <BaseFormField :label="t('fleet.vehicles.dialog.newPlate')" required>
          <FormInput v-model="plate" :maxlength="20" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.dialog.reason')">
          <FormTextarea v-model="plateReason" :rows="2" :maxlength="300" />
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'odometer'">
        <BaseFormField :label="t('fleet.vehicles.dialog.km')" required>
          <FormInput v-model="km" type="number" :min="0" :invalid="kmTooLow" />
          <p class="text-xs mt-1" :class="kmTooLow ? 'text-destructive' : 'text-muted-foreground'">
            {{
              t('fleet.vehicles.dialog.lastReading', {
                km: formatNumber(item?.odometerKm ?? 0, 0)
              })
            }}
          </p>
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'outOfService'">
        <p class="text-sm text-muted-foreground">
          {{ t('fleet.vehicles.dialog.outOfServiceHint') }}
        </p>
        <BaseFormField :label="t('fleet.vehicles.dialog.reason')" required>
          <FormTextarea v-model="reason" :rows="3" :maxlength="300" />
        </BaseFormField>
      </template>
      <template v-else-if="dialog === 'removal'">
        <p class="text-sm text-muted-foreground">
          {{ t('fleet.vehicles.dialog.removalHint', { plate: item?.plate ?? '' }) }}
        </p>
        <BaseFormField :label="t('fleet.vehicles.dialog.removalDate')" required>
          <DateFormInput v-model="removal.date" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.dialog.reason')" required>
          <FormInput v-model="removal.reason" :maxlength="120" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.dialog.finalKm')">
          <FormInput v-model="removal.finalOdometerKm" type="number" :min="0" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.dialog.comment')">
          <FormTextarea v-model="removal.comment" :rows="2" :maxlength="300" />
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>
</template>
