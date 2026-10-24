<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useReferenceStore } from '@/stores/referenceStore'
import type { TechnicianApi } from '../types/technician.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TechnicianApi>
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
const referenceStore = useReferenceStore()

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    no: '',
    competences: [] as string[],
    active: true
  }),
  createOnly: ['no'],
  required: ['no'],
  labelOf: (field) => t(`maintenance.technicians.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (!values.competences.length) {
      errors.push({
        fieldKey: 'competences',
        label: t('maintenance.technicians.form.competencesRequired')
      })
    }
    return errors
  }
})

const competences = computed(() =>
  referenceStore
    .getItems('competences')
    .filter((item) => item.active !== false || draft.competences.includes(item.code))
)

function toggleCompetence(code: string, held: boolean) {
  draft.competences = held
    ? [...draft.competences, code]
    : draft.competences.filter((item) => item !== code)
}

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', competences: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.technicians.form.general')"
      :summary="[draft.no, initialData.fullName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="no"
          :label="t('maintenance.technicians.form.no')"
          :required="isRequired('no')"
        >
          <ReferenceLookup
            v-model="draft.no"
            reference-key="employees"
            :modal-title="t('maintenance.technicians.form.no')"
            detail-path="/hr/employees"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
        <BaseFormField
          field="competences"
          :label="t('maintenance.technicians.form.competences')"
          required
        >
          <div class="space-y-1.5">
            <label
              v-for="competence in competences"
              :key="competence.code"
              class="flex items-center gap-2 text-sm text-card-foreground"
            >
              <input
                type="checkbox"
                class="accent-primary"
                :checked="draft.competences.includes(competence.code)"
                :disabled="disabled"
                @change="
                  toggleCompetence(competence.code, ($event.target as HTMLInputElement).checked)
                "
              />
              {{ competence.description }}
            </label>
          </div>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.technicians.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
