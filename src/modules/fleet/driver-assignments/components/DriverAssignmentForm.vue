<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDate } from '@/utils/format'
import type { DriverAssignmentApi } from '../types/driverAssignment.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DriverAssignmentApi>
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
    employeeNo: '',
    vehicleNo: '',
    startDate: ''
  }),
  required: ['employeeNo', 'vehicleNo', 'startDate'],
  labelOf: (field) => t(`fleet.driverAssignments.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { employeeNo: 'general', vehicleNo: 'general', startDate: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.driverAssignments.form.general')"
      :summary="[initialData.employeeName, initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="employeeNo"
          :label="t('fleet.driverAssignments.form.employeeNo')"
          :required="isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="drivers"
            :modal-title="t('fleet.driverAssignments.form.employeeNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
            :invalid="hasValidationError('employeeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.driverAssignments.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.driverAssignments.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="startDate"
          :label="t('fleet.driverAssignments.form.startDate')"
          :required="isRequired('startDate')"
        >
          <DateFormInput
            v-model="draft.startDate"
            :disabled="disabled"
            :invalid="hasValidationError('startDate')"
          />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.driverAssignments.form.endDate')">
          <FormInput :model-value="formatDate(initialData.endDate ?? null)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
