<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { vehicleTypeService, type VehicleTypeApi } from '@/modules/fleet/vehicle-types'
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
    /** Equipment is saved line by line, outside the edit mode of the card. */
    canEditEquipment?: boolean
  }>(),
  {
    initialData: () => ({}),
    disabled: false,
    isNew: false,
    validationErrors: () => [],
    canEditEquipment: false
  }
)

const { t } = useI18n()

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
  equipment: true,
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

const odometerReadings = computed(() => [...(props.initialData.odometerReadings ?? [])].reverse())
const plateHistory = computed(() => [...(props.initialData.plateHistory ?? [])].reverse())

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
      :title="t('fleet.vehicles.form.specifications')"
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
        :title="t('fleet.vehicles.form.status')"
        :summary="[initialData.statusReason]"
      >
        <div class="space-y-3 min-w-0">
          <BaseFormField :label="t('fleet.vehicles.form.status')">
            <VehicleStatusPill v-if="initialData.status" :status="initialData.status" />
          </BaseFormField>
          <BaseFormField
            v-if="initialData.statusReason"
            :label="t('fleet.vehicles.form.statusReason')"
          >
            <p class="text-sm text-card-foreground">{{ initialData.statusReason }}</p>
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
        v-model:open="expandedSections.equipment"
        :title="t('fleet.vehicles.form.equipment')"
        :summary="[]"
      >
        <div class="xl:col-span-2 min-w-0">
          <VehicleEquipmentPanel
            v-if="initialData.no"
            :vehicle-no="initialData.no"
            :editable="canEditEquipment"
          />
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.history"
        :title="t('fleet.vehicles.form.history')"
        :summary="[
          t('fleet.vehicles.form.readingCount', odometerReadings.length),
          t('fleet.vehicles.form.plateChangeCount', plateHistory.length)
        ]"
      >
        <div class="min-w-0 space-y-2">
          <h3 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.vehicles.form.odometerReadings') }}
          </h3>
          <table class="w-full text-sm border border-border rounded">
            <thead>
              <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
                <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.form.readAt') }}</th>
                <th class="px-3 py-2 font-semibold text-right">
                  {{ t('fleet.vehicles.form.km') }}
                </th>
                <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.form.source') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.form.by') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="reading in odometerReadings"
                :key="`${reading.readAt}-${reading.km}`"
                class="border-t border-border"
              >
                <td class="px-3 py-1.5">{{ formatDateTime(reading.readAt) }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">
                  {{ formatNumber(reading.km, 0) }}
                </td>
                <td class="px-3 py-1.5">
                  {{ t(`fleet.vehicles.odometerSource.${reading.source}`) }}
                </td>
                <td class="px-3 py-1.5">{{ reading.recordedBy }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="min-w-0 space-y-2">
          <h3 class="text-sm font-semibold text-card-foreground">
            {{ t('fleet.vehicles.form.plateHistory') }}
          </h3>
          <p v-if="plateHistory.length === 0" class="text-sm text-muted-foreground">
            {{ t('fleet.vehicles.form.noPlateChange') }}
          </p>
          <table v-else class="w-full text-sm border border-border rounded">
            <thead>
              <tr class="bg-muted/40 text-left text-xs text-muted-foreground">
                <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.form.changedAt') }}</th>
                <th class="px-3 py-2 font-semibold">
                  {{ t('fleet.vehicles.form.previousPlate') }}
                </th>
                <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.form.newPlate') }}</th>
                <th class="px-3 py-2 font-semibold">{{ t('fleet.vehicles.form.by') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="change in plateHistory"
                :key="change.changedAt"
                class="border-t border-border align-top"
              >
                <td class="px-3 py-1.5">{{ formatDateTime(change.changedAt) }}</td>
                <td class="px-3 py-1.5">{{ change.previousPlate }}</td>
                <td class="px-3 py-1.5">
                  {{ change.newPlate }}
                  <p v-if="change.reason" class="text-xs text-muted-foreground">
                    {{ change.reason }}
                  </p>
                </td>
                <td class="px-3 py-1.5">{{ change.changedBy }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </FormSection>

      <AuditFormSection v-model:open="expandedSections.audit" :record="initialData" />
    </template>
  </div>
</template>
