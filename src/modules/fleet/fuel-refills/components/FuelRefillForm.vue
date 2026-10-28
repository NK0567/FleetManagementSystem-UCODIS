<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useReferenceStore } from '@/stores/referenceStore'
import type { FileMeta } from '@/types/file.types'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { FuelRefillApi } from '../types/fuelRefill.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<FuelRefillApi>
    disabled?: boolean
    isNew?: boolean
    validationErrors?: string[]
  }>(),
  {
    initialData: () => ({}),
    disabled: false,
    isNew: false,
    validationErrors: () => []
  }
)

const { t } = useI18n()

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    refueledAt: '',
    vehicleNo: '',
    driverNo: null as string | null,
    stationSiteNo: null as string | null,
    stationName: '',
    liters: 0,
    unitPrice: 0,
    odometerKm: 0,
    fullTank: true,
    receiptFileNo: null as string | null
  }),
  createOnly: ['vehicleNo'],
  required: ['refueledAt', 'vehicleNo', 'liters', 'unitPrice', 'odometerKm'],
  labelOf: (field) => t(`fleet.fuelRefills.form.${field}`)
})

const referenceStore = useReferenceStore()
const amount = computed(() => Math.round((draft.liters || 0) * (draft.unitPrice || 0)))

const receipt = ref<FileMeta | null>(props.initialData.receipt ?? null)
watch(
  () => props.initialData.receipt,
  (value) => {
    receipt.value = value ?? null
  }
)

function onUploaded(uploaded: FileMeta) {
  receipt.value = uploaded
  draft.receiptFileNo = uploaded.no
}

function onRemoved() {
  receipt.value = null
  draft.receiptFileNo = null
}

const expandedSections = ref({
  general: true,
  amounts: true,
  checks: true,
  qualification: true,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    refueledAt: 'general',
    vehicleNo: 'general',
    liters: 'amounts',
    unitPrice: 'amounts',
    odometerKm: 'amounts'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.fuelRefills.form.general')"
      :summary="[initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="refueledAt"
          :label="t('fleet.fuelRefills.form.refueledAt')"
          :required="isRequired('refueledAt')"
        >
          <FormInput
            v-model="draft.refueledAt"
            type="datetime-local"
            :disabled="disabled"
            :invalid="hasValidationError('refueledAt')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.fuelRefills.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.fuelRefills.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelRefills.form.driverNo')">
          <ReferenceLookup
            v-model="draft.driverNo"
            reference-key="drivers"
            :modal-title="t('fleet.fuelRefills.form.driverNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
          />
          <p v-if="isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.fuelRefills.form.driverHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.fuelRefills.form.stationSiteNo')">
          <ReferenceLookup
            v-model="draft.stationSiteNo"
            reference-key="sites"
            :modal-title="t('fleet.fuelRefills.form.stationSiteNo')"
            detail-path="/fleet/sites"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelRefills.form.stationName')">
          <FormInput
            v-model="draft.stationName"
            :maxlength="120"
            :disabled="disabled || !!draft.stationSiteNo"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelRefills.form.receipt')">
          <FileAttachmentField
            :file="receipt"
            :disabled="disabled"
            @uploaded="onUploaded"
            @removed="onRemoved"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.amounts"
      :title="t('fleet.fuelRefills.form.amounts')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="liters"
          :label="t('fleet.fuelRefills.form.liters')"
          :required="isRequired('liters')"
        >
          <FormInput
            v-model="draft.liters"
            type="number"
            :min="1"
            :disabled="disabled"
            :invalid="hasValidationError('liters')"
          />
        </BaseFormField>
        <BaseFormField
          field="unitPrice"
          :label="t('fleet.fuelRefills.form.unitPrice')"
          :required="isRequired('unitPrice')"
        >
          <FormInput
            v-model="draft.unitPrice"
            type="number"
            :min="1"
            :disabled="disabled"
            :invalid="hasValidationError('unitPrice')"
          />
        </BaseFormField>
      </div>
      <BaseFormField :label="t('fleet.fuelRefills.form.amount')">
        <FormInput :model-value="formatNumber(amount)" disabled />
      </BaseFormField>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="odometerKm"
          :label="t('fleet.fuelRefills.form.odometerKm')"
          :required="isRequired('odometerKm')"
        >
          <FormInput
            v-model="draft.odometerKm"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('odometerKm')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelRefills.form.fullTank')">
          <ToggleSwitch v-model="draft.fullTank" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.checks"
      :title="t('fleet.fuelRefills.form.checks')"
      :summary="[]"
    >
      <div class="xl:col-span-2 min-w-0">
        <ChecksPanel :checks="initialData.checks ?? []" options-key="refillCheck" />
      </div>
    </FormSection>

    <FormSection
      v-if="initialData.qualification"
      v-model:open="expandedSections.qualification"
      :title="t('fleet.fuelRefills.form.qualification')"
      :summary="[]"
    >
      <div class="xl:col-span-2 min-w-0 text-sm space-y-1">
        <p class="font-medium text-card-foreground">
          {{ referenceStore.getLabel('fuelGapCauses', initialData.qualification.causeNo) }}
        </p>
        <p class="text-card-foreground">{{ initialData.qualification.comment }}</p>
        <p class="text-xs text-muted-foreground">
          {{ initialData.qualification.by }} · {{ formatDateTime(initialData.qualification.at) }}
        </p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
