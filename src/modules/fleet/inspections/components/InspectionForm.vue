<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate } from '@/utils/format'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { InspectionApi, InspectionResult } from '../types/inspection.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<InspectionApi>
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
    vehicleNo: '',
    inspectedOn: '',
    center: '',
    result: 'conforming' as InspectionResult,
    findings: ''
  }),
  required: ['vehicleNo', 'inspectedOn', 'center', 'result'],
  labelOf: (field) => t(`fleet.inspections.form.${field}`)
})

const expandedSections = ref({ general: true, recheck: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    vehicleNo: 'general',
    inspectedOn: 'general',
    center: 'general',
    result: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.inspections.form.general')"
      :summary="[initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.inspections.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('fleet.inspections.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="inspectedOn"
          :label="t('fleet.inspections.form.inspectedOn')"
          :required="isRequired('inspectedOn')"
        >
          <DateFormInput
            v-model="draft.inspectedOn"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('inspectedOn')"
          />
        </BaseFormField>
        <BaseFormField
          field="center"
          :label="t('fleet.inspections.form.center')"
          :required="isRequired('center')"
        >
          <FormInput
            v-model="draft.center"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('center')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="result"
          :label="t('fleet.inspections.form.result')"
          :required="isRequired('result')"
        >
          <OptionsSelect
            :model-value="draft.result"
            options-key="inspectionResult"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('result')"
            @update:model-value="draft.result = String($event) as InspectionResult"
          />
        </BaseFormField>
        <BaseFormField
          :label="t('fleet.inspections.form.findings')"
          :required="draft.result === 'non_conforming'"
        >
          <FormTextarea v-model="draft.findings" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew && initialData.result === 'non_conforming'"
      v-model:open="expandedSections.recheck"
      :title="t('fleet.inspections.form.recheck')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.inspections.form.recheckDueOn')">
          <FormInput :model-value="formatDate(initialData.recheckDueOn ?? null)" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.inspections.form.recheckDoneOn')">
          <FormInput
            :model-value="
              initialData.recheckDoneOn
                ? formatDate(initialData.recheckDoneOn)
                : t('fleet.inspections.form.recheckAwaited')
            "
            disabled
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
