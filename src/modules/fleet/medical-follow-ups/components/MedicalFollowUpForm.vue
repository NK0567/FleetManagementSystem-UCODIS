<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { MedicalFollowUpKind, MedicalFollowUpResult } from '../domain/medicalFollowUp'
import type { MedicalFollowUpApi } from '../types/medicalFollowUp.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<MedicalFollowUpApi>
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
    kind: 'visit' as MedicalFollowUpKind,
    doneOn: null as string | null,
    result: 'pending' as MedicalFollowUpResult,
    provider: '',
    nextDueOn: null as string | null,
    lostDays: null as number | string | null,
    followUp: ''
  }),
  required: ['employeeNo', 'kind', 'doneOn', 'result'],
  labelOf: (field) => t(`fleet.medicalFollowUps.form.${field}`)
})

const expandedSections = ref({ general: true, follow: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { employeeNo: 'general', kind: 'general', doneOn: 'general', result: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.medicalFollowUps.form.section.general')"
      :summary="[draft.kind]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="employeeNo"
          :label="t('fleet.medicalFollowUps.form.employeeNo')"
          :required="isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="drivers"
            :modal-title="t('fleet.medicalFollowUps.form.employeeNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('employeeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="kind"
          :label="t('fleet.medicalFollowUps.form.kind')"
          :required="isRequired('kind')"
        >
          <OptionsSelect
            :model-value="draft.kind"
            options-key="medicalFollowUpKind"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('kind')"
            @update:model-value="draft.kind = String($event) as MedicalFollowUpKind"
          />
        </BaseFormField>
        <BaseFormField
          field="doneOn"
          :label="t('fleet.medicalFollowUps.form.doneOn')"
          :required="isRequired('doneOn')"
        >
          <DateFormInput v-model="draft.doneOn" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="result"
          :label="t('fleet.medicalFollowUps.form.result')"
          :required="isRequired('result')"
        >
          <OptionsSelect
            :model-value="draft.result"
            options-key="medicalFollowUpResult"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('result')"
            @update:model-value="draft.result = String($event) as MedicalFollowUpResult"
          />
        </BaseFormField>
        <BaseFormField field="provider" :label="t('fleet.medicalFollowUps.form.provider')">
          <FormInput
            v-model="draft.provider"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('provider')"
          />
        </BaseFormField>
      </div>
    </FormSection>
    <FormSection
      v-model:open="expandedSections.follow"
      :title="t('fleet.medicalFollowUps.form.section.follow')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="nextDueOn" :label="t('fleet.medicalFollowUps.form.nextDueOn')">
          <DateFormInput v-model="draft.nextDueOn" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField field="lostDays" :label="t('fleet.medicalFollowUps.form.lostDays')">
          <FormInput
            v-model="draft.lostDays"
            type="number"
            :min="0"
            :max="366"
            :disabled="disabled"
            :invalid="hasValidationError('lostDays')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="followUp" :label="t('fleet.medicalFollowUps.form.followUp')">
          <FormTextarea
            v-model="draft.followUp"
            :rows="3"
            :maxlength="500"
            :disabled="disabled"
            :invalid="hasValidationError('followUp')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
