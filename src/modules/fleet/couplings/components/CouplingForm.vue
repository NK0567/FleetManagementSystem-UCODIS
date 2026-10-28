<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDate } from '@/utils/format'
import type { CouplingApi } from '../types/coupling.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<CouplingApi>
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
    tractorNo: '',
    trailerNo: '',
    startDate: ''
  }),
  required: ['tractorNo', 'trailerNo', 'startDate'],
  labelOf: (field) => t(`fleet.couplings.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { tractorNo: 'general', trailerNo: 'general', startDate: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.couplings.form.general')"
      :summary="[initialData.tractorPlate, initialData.trailerPlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="tractorNo"
          :label="t('fleet.couplings.form.tractorNo')"
          :required="isRequired('tractorNo')"
        >
          <ReferenceLookup
            v-model="draft.tractorNo"
            reference-key="tractors"
            :modal-title="t('fleet.couplings.form.tractorNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('tractorNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="trailerNo"
          :label="t('fleet.couplings.form.trailerNo')"
          :required="isRequired('trailerNo')"
        >
          <ReferenceLookup
            v-model="draft.trailerNo"
            reference-key="trailers"
            :modal-title="t('fleet.couplings.form.trailerNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('trailerNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="startDate"
          :label="t('fleet.couplings.form.startDate')"
          :required="isRequired('startDate')"
        >
          <DateFormInput
            v-model="draft.startDate"
            :disabled="disabled"
            :invalid="hasValidationError('startDate')"
          />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.couplings.form.endDate')">
          <FormInput :model-value="formatDate(initialData.endDate ?? null)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
