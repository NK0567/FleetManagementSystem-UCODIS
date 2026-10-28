<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useReferenceStore } from '@/stores/referenceStore'
import { nowIsoDateTime } from '@/utils/date'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { MobileInterventionApi } from '../types/mobileIntervention.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<MobileInterventionApi>
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
    missionTypeNo: '',
    vehicleNo: '',
    location: '',
    departedAt: nowIsoDateTime().slice(0, 16),
    crewNos: [] as string[]
  }),
  required: ['missionTypeNo', 'vehicleNo', 'location', 'departedAt'],
  labelOf: (field) => t(`maintenance.mobileInterventions.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (!values.crewNos.length) {
      errors.push({
        fieldKey: 'crewNos',
        label: t('maintenance.mobileInterventions.form.crewRequired')
      })
    }
    return errors
  }
})

const referenceStore = useReferenceStore()
const technicians = computed(() =>
  referenceStore
    .getItems('technicians')
    .filter((technician) => technician.active !== false || draft.crewNos.includes(technician.code))
)

function toggleCrew(no: string, picked: boolean) {
  draft.crewNos = picked ? [...draft.crewNos, no] : draft.crewNos.filter((item) => item !== no)
}

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    missionTypeNo: 'general',
    vehicleNo: 'general',
    location: 'general',
    departedAt: 'general',
    crewNos: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.mobileInterventions.form.general')"
      :summary="[initialData.vehiclePlate ?? '']"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="missionTypeNo"
          :label="t('maintenance.mobileInterventions.form.missionTypeNo')"
          :required="isRequired('missionTypeNo')"
        >
          <ReferenceLookup
            v-model="draft.missionTypeNo"
            reference-key="missionTypes"
            :modal-title="t('maintenance.mobileInterventions.form.missionTypeNo')"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('missionTypeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('maintenance.mobileInterventions.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('maintenance.mobileInterventions.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="location"
          :label="t('maintenance.mobileInterventions.form.location')"
          :required="isRequired('location')"
        >
          <FormInput
            v-model="draft.location"
            :maxlength="160"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('location')"
          />
        </BaseFormField>
        <BaseFormField
          field="departedAt"
          :label="t('maintenance.mobileInterventions.form.departedAt')"
          :required="isRequired('departedAt')"
        >
          <FormInput
            v-model="draft.departedAt"
            type="datetime-local"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('departedAt')"
          />
        </BaseFormField>
        <BaseFormField
          field="crewNos"
          :label="t('maintenance.mobileInterventions.form.crewNos')"
          required
        >
          <div class="space-y-1">
            <label
              v-for="technician in technicians"
              :key="technician.code"
              class="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                :checked="draft.crewNos.includes(technician.code)"
                :disabled="disabled || !isNew"
                @change="toggleCrew(technician.code, ($event.target as HTMLInputElement).checked)"
              />
              {{ technician.description }}
            </label>
          </div>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
