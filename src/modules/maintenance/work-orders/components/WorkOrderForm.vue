<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import {
  MANUAL_ORIGINS,
  WORK_ORDER_ORIGINS,
  type MaintenanceType,
  type WorkOrderOrigin,
  type WorkOrderSeverity
} from '../domain/workOrder'
import type { WorkOrderApi } from '../types/workOrder.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<WorkOrderApi>
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

const automaticOrigins = WORK_ORDER_ORIGINS.filter((origin) => !MANUAL_ORIGINS.includes(origin))

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    vehicleNo: '',
    maintenanceType: 'corrective' as MaintenanceType,
    severity: 'major' as WorkOrderSeverity,
    origin: 'driver_report' as WorkOrderOrigin,
    symptom: '',
    declaredAt: ''
  }),
  required: ['vehicleNo', 'maintenanceType', 'severity', 'origin', 'symptom', 'declaredAt'],
  labelOf: (field) => t(`maintenance.workOrders.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    vehicleNo: 'general',
    maintenanceType: 'general',
    severity: 'general',
    origin: 'general',
    symptom: 'general',
    declaredAt: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.workOrders.form.general')"
      :summary="[initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('maintenance.workOrders.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('maintenance.workOrders.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="maintenanceType"
          :label="t('maintenance.workOrders.form.maintenanceType')"
          :required="isRequired('maintenanceType')"
        >
          <OptionsSelect
            :model-value="draft.maintenanceType"
            options-key="maintenanceType"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('maintenanceType')"
            @update:model-value="draft.maintenanceType = String($event) as MaintenanceType"
          />
        </BaseFormField>
        <BaseFormField
          field="severity"
          :label="t('maintenance.workOrders.form.severity')"
          :required="isRequired('severity')"
        >
          <OptionsSelect
            :model-value="draft.severity"
            options-key="workOrderSeverity"
            :disabled="disabled"
            :invalid="hasValidationError('severity')"
            @update:model-value="draft.severity = String($event) as WorkOrderSeverity"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="origin"
          :label="t('maintenance.workOrders.form.origin')"
          :required="isRequired('origin')"
        >
          <OptionsSelect
            :model-value="draft.origin"
            options-key="workOrderOrigin"
            :hidden-values="isNew ? automaticOrigins : []"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('origin')"
            @update:model-value="draft.origin = String($event) as WorkOrderOrigin"
          />
        </BaseFormField>
        <BaseFormField
          field="symptom"
          :label="t('maintenance.workOrders.form.symptom')"
          :required="isRequired('symptom')"
        >
          <FormTextarea v-model="draft.symptom" :rows="3" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="declaredAt"
          :label="t('maintenance.workOrders.form.declaredAt')"
          :required="isRequired('declaredAt')"
        >
          <FormInput
            v-model="draft.declaredAt"
            type="datetime-local"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('declaredAt')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
