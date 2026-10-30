<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import type { SubListColumn } from '@/components/shared/RecordSubList.vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { apiErrorMessage } from '@/core/api/apiError'
import { vehicleTypeService, type VehicleTypeApi } from '@/modules/fleet/vehicle-types'
import type { FileMeta } from '@/types/file.types'
import { vehicleService } from '../services/vehicleService'
import { useOptionsStore } from '@/stores/optionsStore'
import VehicleMaintenanceLog from './VehicleMaintenanceLog.vue'
import { formatDate, formatDateTime, formatNumber } from '@/utils/format'
import type {
  AcquisitionMode,
  FuelType,
  VehicleApi,
  VehicleCompartment
} from '../types/vehicle.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<VehicleApi>
    disabled?: boolean
    isNew?: boolean
    validationErrors?: string[]
    /** Equipment and photos are saved as soon as they change, outside the edit mode of the card. */
    canEditDirectly?: boolean
  }>(),
  {
    initialData: () => ({}),
    disabled: false,
    isNew: false,
    validationErrors: () => [],
    canEditDirectly: false
  }
)

const emit = defineEmits<{ updated: [vehicle: VehicleApi] }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const photoError = ref<string | null>(null)

async function changePhotos(change: () => Promise<VehicleApi>) {
  photoError.value = null
  try {
    emit('updated', await change())
  } catch (cause) {
    photoError.value = apiErrorMessage(cause, t('fleet.vehicles.photoError'))
  }
}

function addPhoto(photo: FileMeta) {
  const no = props.initialData.no
  if (no) void changePhotos(() => vehicleService.addPhoto(no, photo.no))
}

function removePhoto(fileNo: string) {
  const no = props.initialData.no
  if (no) void changePhotos(() => vehicleService.removePhoto(no, fileNo))
}

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    plate: '',
    vin: '',
    vehicleTypeNo: '',
    make: '',
    model: '',
    category: '',
    homeSiteNo: '',
    year: null as number | null,
    firstRegistrationDate: null as string | null,
    odometerKm: 0,
    fuelType: null as FuelType | null,
    tankCapacityL: null as number | null,
    maxLoadKg: null as number | null,
    maxVolumeM3: null as number | null,
    compartments: [] as VehicleCompartment[],
    productFamilies: [] as string[],
    acquisitionMode: null as AcquisitionMode | null,
    acquisitionDate: null as string | null,
    acquisitionProviderNo: null as string | null,
    acquisitionCost: null as number | null,
    residualValue: null as number | null,
    monthlyPayment: null as number | null
  }),
  createOnly: ['plate', 'vehicleTypeNo', 'odometerKm'],
  required: ['plate', 'vin', 'vehicleTypeNo', 'make', 'model', 'homeSiteNo'],
  labelOf: (field) => t(`fleet.vehicles.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (vehicleShape.value.hasCompartments && values.compartments.length === 0) {
      errors.push({
        fieldKey: 'compartments',
        label: t('fleet.vehicles.form.compartmentsRequired')
      })
    }
    return errors
  }
})

/** The type decides which specifications apply; a new vehicle reads them from its chosen type. */
const chosenType = ref<VehicleTypeApi | null>(null)
watch(
  () => (props.isNew ? draft.vehicleTypeNo : ''),
  async (code) => {
    chosenType.value = code ? await vehicleTypeService.getById(code).catch(() => null) : null
  }
)
const vehicleShape = computed(() => ({
  motorized: props.isNew ? !!chosenType.value?.motorized : !!props.initialData.motorized,
  carriesGoods: props.isNew ? !!chosenType.value?.carriesGoods : !!props.initialData.carriesGoods,
  hasCompartments: props.isNew
    ? !!chosenType.value?.hasCompartments
    : !!props.initialData.hasCompartments
}))

const expandedSections = ref({
  identification: true,
  specifications: true,
  acquisition: false,
  status: true,
  documents: true,
  photos: false,
  equipment: true,
  maintenanceLog: false,
  history: false,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    plate: 'identification',
    vin: 'identification',
    vehicleTypeNo: 'identification',
    make: 'identification',
    model: 'identification',
    homeSiteNo: 'identification',
    compartments: 'specifications'
  },
  fieldValues: () => ({ ...draft })
})

const setOption = (field: 'fuelType' | 'acquisitionMode') => (value: string | number) => {
  ;(draft as Record<string, unknown>)[field] = value === '' ? null : String(value)
}

/** The milestones of the vehicle, from its first registration to its removal. */
const lifecycle = computed(() => {
  const data = props.initialData
  const steps: { key: string; value: string }[] = []
  if (data.firstRegistrationDate) {
    steps.push({ key: 'firstRegistration', value: formatDate(data.firstRegistrationDate) })
  }
  if (data.acquisitionDate) {
    steps.push({ key: 'acquisition', value: formatDate(data.acquisitionDate) })
  }
  if (data.createdAt) steps.push({ key: 'recorded', value: formatDateTime(data.createdAt) })
  if (data.outOfService) {
    steps.push({
      key: 'outOfService',
      value: `${formatDateTime(data.outOfService.since)} · ${data.outOfService.reason}`
    })
  }
  if (data.removal) {
    steps.push({
      key: 'removal',
      value: `${formatDate(data.removal.date)} · ${data.removal.reason}`
    })
  }
  return steps
})

const odometerReadings = computed(() => [...(props.initialData.odometerReadings ?? [])].reverse())
const plateHistory = computed(() => [...(props.initialData.plateHistory ?? [])].reverse())

/* The two lists of the history read like the main lists: sortable, searchable, filterable. */
const readingColumns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'readAt',
    label: t('fleet.vehicles.form.readAt'),
    formatter: (v) => formatDateTime(String(v))
  },
  {
    sortKey: 'km',
    label: t('fleet.vehicles.form.km'),
    align: 'right',
    formatter: (v) => formatNumber(Number(v), 0)
  },
  {
    sortKey: 'source',
    label: t('fleet.vehicles.form.source'),
    formatter: (v) => t(`fleet.vehicles.odometerSource.${String(v)}`),
    filter: true
  },
  { sortKey: 'recordedBy', label: t('fleet.vehicles.form.by'), filter: true }
])
const plateColumns = computed<SubListColumn[]>(() => [
  {
    sortKey: 'changedAt',
    label: t('fleet.vehicles.form.changedAt'),
    formatter: (v) => formatDateTime(String(v))
  },
  { sortKey: 'previousPlate', label: t('fleet.vehicles.form.previousPlate') },
  { sortKey: 'newPlate', label: t('fleet.vehicles.form.newPlate') },
  { sortKey: 'changedBy', label: t('fleet.vehicles.form.by'), filter: true }
])

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.identification"
      :title="t('fleet.vehicles.form.identification')"
      :summary="[draft.plate, `${draft.make} ${draft.model}`.trim()]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField v-if="!isNew" :label="t('fleet.vehicles.form.no')">
          <FormInput :model-value="initialData.no" disabled show-lock-icon />
        </BaseFormField>
        <BaseFormField field="plate" :label="t('fleet.vehicles.form.plate')" :required="isNew">
          <FormInput
            v-model="draft.plate"
            :maxlength="20"
            :disabled="disabled || !isNew"
            :show-lock-icon="!isNew"
            :invalid="hasValidationError('plate')"
          />
          <p v-if="!isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.vehicles.form.plateHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          field="vin"
          :label="t('fleet.vehicles.form.vin')"
          :required="isRequired('vin')"
        >
          <FormInput
            v-model="draft.vin"
            :maxlength="40"
            :disabled="disabled"
            :invalid="hasValidationError('vin')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleTypeNo"
          :label="t('fleet.vehicles.form.vehicleTypeNo')"
          :required="isNew"
        >
          <ReferenceLookup
            v-model="draft.vehicleTypeNo"
            reference-key="vehicleTypes"
            :modal-title="t('fleet.vehicles.form.vehicleTypeNo')"
            detail-path="/fleet/vehicle-types"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleTypeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="homeSiteNo"
          :label="t('fleet.vehicles.form.homeSiteNo')"
          :required="isRequired('homeSiteNo')"
        >
          <ReferenceLookup
            v-model="draft.homeSiteNo"
            reference-key="sites"
            :modal-title="t('fleet.vehicles.form.homeSiteNo')"
            detail-path="/fleet/sites"
            :disabled="disabled"
            :invalid="hasValidationError('homeSiteNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.odometerKm')" :required="isNew">
          <FormInput
            v-if="isNew"
            v-model="draft.odometerKm"
            type="number"
            :min="0"
            :disabled="disabled"
          />
          <FormInput
            v-else
            :model-value="formatNumber(initialData.odometerKm ?? 0, 0)"
            disabled
            show-lock-icon
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="make"
          :label="t('fleet.vehicles.form.make')"
          :required="isRequired('make')"
        >
          <FormInput
            v-model="draft.make"
            :maxlength="40"
            :disabled="disabled"
            :invalid="hasValidationError('make')"
          />
        </BaseFormField>
        <BaseFormField
          field="model"
          :label="t('fleet.vehicles.form.model')"
          :required="isRequired('model')"
        >
          <FormInput
            v-model="draft.model"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('model')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.category')">
          <FormInput v-model="draft.category" :maxlength="60" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.year')">
          <FormInput
            v-model="draft.year"
            type="number"
            :min="1980"
            :max="2100"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.firstRegistrationDate')">
          <DateFormInput v-model="draft.firstRegistrationDate" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.specifications"
      :title="
        t(
          isNew && !draft.vehicleTypeNo
            ? 'fleet.vehicles.form.specifications'
            : vehicleShape.motorized
              ? 'fleet.vehicles.form.engineAndFuel'
              : 'fleet.vehicles.form.trailerSpecifications'
        )
      "
      :summary="[]"
    >
      <p v-if="isNew && !draft.vehicleTypeNo" class="xl:col-span-2 text-sm text-muted-foreground">
        {{ t('fleet.vehicles.form.chooseTypeFirst') }}
      </p>
      <template v-else>
        <div class="space-y-3 min-w-0">
          <template v-if="vehicleShape.motorized">
            <BaseFormField :label="t('fleet.vehicles.form.fuelType')">
              <OptionsSelect
                :model-value="draft.fuelType ?? ''"
                options-key="fuelType"
                :placeholder="t('common.notSpecified')"
                :disabled="disabled"
                @update:model-value="setOption('fuelType')($event)"
              />
            </BaseFormField>
            <BaseFormField :label="t('fleet.vehicles.form.tankCapacityL')">
              <FormInput
                v-model="draft.tankCapacityL"
                type="number"
                :min="0"
                :disabled="disabled"
              />
            </BaseFormField>
          </template>
          <BaseFormField :label="t('fleet.vehicles.form.maxLoadKg')">
            <FormInput v-model="draft.maxLoadKg" type="number" :min="0" :disabled="disabled" />
          </BaseFormField>
        </div>
        <div class="space-y-3 min-w-0">
          <BaseFormField
            v-if="vehicleShape.carriesGoods"
            :label="t('fleet.vehicles.form.maxVolumeM3')"
          >
            <FormInput
              v-model="draft.maxVolumeM3"
              type="number"
              :min="0"
              step="0.1"
              :disabled="disabled"
            />
          </BaseFormField>
          <BaseFormField
            v-if="vehicleShape.hasCompartments"
            field="compartments"
            :label="t('fleet.vehicles.form.compartments')"
            required
          >
            <VehicleCompartmentsEditor v-model="draft.compartments" :disabled="disabled" />
          </BaseFormField>
          <BaseFormField
            v-if="vehicleShape.carriesGoods"
            :label="t('fleet.vehicles.form.productFamilies')"
          >
            <ProductFamilyPicker v-model="draft.productFamilies" :disabled="disabled" />
            <p class="text-xs text-muted-foreground mt-1">
              {{ t('fleet.vehicles.form.productFamiliesHint') }}
            </p>
          </BaseFormField>
        </div>
      </template>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.acquisition"
      :title="t('fleet.vehicles.form.acquisition')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.vehicles.form.acquisitionMode')">
          <OptionsSelect
            :model-value="draft.acquisitionMode ?? ''"
            options-key="acquisitionMode"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            @update:model-value="setOption('acquisitionMode')($event)"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.acquisitionDate')">
          <DateFormInput v-model="draft.acquisitionDate" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.acquisitionProviderNo')">
          <ReferenceLookup
            v-model="draft.acquisitionProviderNo"
            reference-key="providers"
            :modal-title="t('fleet.vehicles.form.acquisitionProviderNo')"
            detail-path="/fleet/providers"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.vehicles.form.acquisitionCost')">
          <FormInput v-model="draft.acquisitionCost" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.residualValue')">
          <FormInput v-model="draft.residualValue" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.vehicles.form.monthlyPayment')">
          <FormInput v-model="draft.monthlyPayment" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <template v-if="!isNew">
      <FormSection
        v-model:open="expandedSections.status"
        :title="t('fleet.vehicles.form.statusAndLinks')"
        :summary="[initialData.statusReason]"
      >
        <div class="space-y-3 min-w-0">
          <BaseFormField :label="t('fleet.vehicles.form.administrativeStatus')">
            <p class="text-sm text-card-foreground">
              {{
                optionsStore.getOptionLabel(
                  'administrativeStatus',
                  initialData.administrativeStatus ?? 'in_service'
                )
              }}
            </p>
          </BaseFormField>
          <BaseFormField :label="t('fleet.vehicles.form.operationalStatus')">
            <VehicleStatusPill
              v-if="initialData.operationalStatus"
              :status="initialData.operationalStatus"
            />
            <p v-else class="text-sm text-muted-foreground">
              {{ t('fleet.vehicles.form.noOperationalStatus') }}
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ t('fleet.vehicles.form.operationalStatusHint') }}
            </p>
          </BaseFormField>
          <BaseFormField
            v-if="initialData.statusReason"
            :label="t('fleet.vehicles.form.statusReason')"
          >
            <p class="text-sm text-card-foreground">{{ initialData.statusReason }}</p>
            <p v-if="initialData.statusCauseCode" class="text-xs text-muted-foreground mt-1">
              {{
                t('fleet.vehicles.form.statusCauseCode', {
                  code: initialData.statusCauseCode,
                  name: initialData.statusCauseCodeName
                })
              }}
            </p>
          </BaseFormField>
          <BaseFormField :label="t('fleet.vehicles.col.driverName')">
            <FormInput
              :model-value="initialData.driverName || t('fleet.vehicles.form.noLink')"
              disabled
            />
          </BaseFormField>
          <BaseFormField :label="t('fleet.vehicles.col.coupledVehiclePlate')">
            <FormInput
              :model-value="initialData.coupledVehiclePlate || t('fleet.vehicles.form.noLink')"
              disabled
            />
          </BaseFormField>
        </div>
        <div class="space-y-3 min-w-0">
          <template v-if="initialData.outOfService">
            <BaseFormField :label="t('fleet.vehicles.form.outOfServiceSince')">
              <p class="text-sm text-card-foreground">
                {{ formatDateTime(initialData.outOfService.since) }} ·
                {{ initialData.outOfService.by }}
              </p>
            </BaseFormField>
          </template>
          <template v-if="initialData.removal">
            <BaseFormField :label="t('fleet.vehicles.form.removalDate')">
              <p class="text-sm text-card-foreground">
                {{ formatDate(initialData.removal.date) }} · {{ initialData.removal.recordedBy }}
              </p>
            </BaseFormField>
            <BaseFormField :label="t('fleet.vehicles.form.removalReason')">
              <p class="text-sm text-card-foreground">{{ initialData.removal.reason }}</p>
              <p v-if="initialData.removal.comment" class="text-xs text-muted-foreground mt-1">
                {{ initialData.removal.comment }}
              </p>
            </BaseFormField>
          </template>
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.documents"
        :title="t('fleet.vehicles.form.documents')"
        :summary="[
          initialData.documentsCompliant ? '' : t('fleet.vehicles.form.documentsNotCompliant')
        ]"
      >
        <div class="xl:col-span-2 min-w-0">
          <SubjectDocumentsPanel
            v-if="initialData.no"
            target="vehicle"
            :subject-no="initialData.no"
            :gaps="initialData.documentGaps"
          />
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.photos"
        :title="t('fleet.vehicles.form.photos')"
        :summary="[t('fleet.vehicles.form.photoCount', initialData.photos?.length ?? 0)]"
      >
        <div class="xl:col-span-2 min-w-0 space-y-2">
          <PhotoGallery
            :photos="initialData.photos ?? []"
            :editable="canEditDirectly"
            @add="addPhoto"
            @remove="removePhoto"
          />
          <p v-if="photoError" class="text-xs text-destructive">{{ photoError }}</p>
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.equipment"
        :title="t('fleet.vehicles.form.equipment')"
        :summary="[]"
      >
        <div class="xl:col-span-2 min-w-0">
          <VehicleEquipmentPanel
            v-if="initialData.no"
            :vehicle-no="initialData.no"
            :editable="canEditDirectly"
          />
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.maintenanceLog"
        :title="t('fleet.vehicles.form.maintenanceLog')"
        :summary="[]"
      >
        <div class="xl:col-span-2 min-w-0">
          <VehicleMaintenanceLog v-if="initialData.no" :vehicle-no="initialData.no" />
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.history"
        :title="t('fleet.vehicles.form.lifecycle')"
        :summary="[
          t('fleet.vehicles.form.readingCount', odometerReadings.length),
          t('fleet.vehicles.form.plateChangeCount', plateHistory.length)
        ]"
      >
        <dl
          class="xl:col-span-2 min-w-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm"
          data-testid="vehicle-lifecycle"
        >
          <template v-for="step in lifecycle" :key="step.key">
            <dt class="text-muted-foreground">{{ t(`fleet.vehicles.lifecycle.${step.key}`) }}</dt>
            <dd class="text-card-foreground">{{ step.value }}</dd>
          </template>
        </dl>
        <div class="min-w-0 space-y-2 xl:col-span-2">
          <h3 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.vehicles.form.odometerReadings') }}
          </h3>
          <RecordSubList
            :rows="odometerReadings as unknown as Record<string, unknown>[]"
            :columns="readingColumns"
            :row-key="(row: Record<string, unknown>) => `${row.readAt}-${row.km}`"
            :empty-text="t('fleet.vehicles.form.noReading')"
            :initial-sort="{ key: 'readAt', direction: 'DESC' }"
          />
        </div>
        <div class="min-w-0 space-y-2 xl:col-span-2">
          <h3 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.vehicles.form.plateHistory') }}
          </h3>
          <RecordSubList
            :rows="plateHistory as unknown as Record<string, unknown>[]"
            :columns="plateColumns"
            row-key="changedAt"
            :empty-text="t('fleet.vehicles.form.noPlateChange')"
            :initial-sort="{ key: 'changedAt', direction: 'DESC' }"
          >
            <template #cell-newPlate="{ row }">
              {{ row.newPlate }}
              <p v-if="row.reason" class="text-xs text-muted-foreground">{{ row.reason }}</p>
            </template>
          </RecordSubList>
        </div>
      </FormSection>

      <AuditFormSection v-model:open="expandedSections.audit" :record="initialData" />
    </template>
  </div>
</template>
