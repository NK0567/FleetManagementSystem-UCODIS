<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDate } from '@/utils/format'
import type { PublicHolidayApi } from '../types/publicHoliday.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<PublicHolidayApi>
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
  empty: () => ({ name: '', date: '', recurring: true }),
  required: ['name', 'date'],
  labelOf: (field) => t(`hr.publicHolidays.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { name: 'general', date: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('hr.publicHolidays.form.general')"
      :summary="[draft.name, draft.date ? formatDate(draft.date) : null]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField v-if="!isNew" :label="t('hr.publicHolidays.form.no')">
          <FormInput :model-value="initialData.no" disabled show-lock-icon />
        </BaseFormField>
        <BaseFormField
          field="name"
          :label="t('hr.publicHolidays.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="date"
          :label="t('hr.publicHolidays.form.date')"
          :required="isRequired('date')"
        >
          <DateFormInput
            v-model="draft.date"
            :disabled="disabled"
            :invalid="hasValidationError('date')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.publicHolidays.form.recurring')">
          <ToggleSwitch v-model="draft.recurring" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
