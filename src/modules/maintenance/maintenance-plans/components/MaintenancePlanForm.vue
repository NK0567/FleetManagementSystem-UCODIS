<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { modelLabel, operationIssues, type MaintenanceOperation } from '../domain/maintenancePlan'
import type { MaintenancePlanApi } from '../types/maintenancePlan.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<MaintenancePlanApi>
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
    name: '',
    provisional: false,
    active: true,
    source: '',
    modelCodes: [] as string[],
    operations: [] as MaintenanceOperation[]
  }),
  required: ['name'],
  labelOf: (field) => t(`maintenance.maintenancePlans.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.operations.some((operation) => operationIssues(operation).length > 0)) {
      errors.push({
        fieldKey: 'operations',
        label: t('maintenance.maintenancePlans.operations.invalid')
      })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, vehicles: true, operations: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { name: 'general', operations: 'operations' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.maintenancePlans.form.general')"
      :summary="[draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="name"
          :label="t('maintenance.maintenancePlans.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.maintenancePlans.form.provisional')">
          <ToggleSwitch v-model="draft.provisional" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('maintenance.maintenancePlans.form.provisionalHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.maintenancePlans.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.maintenancePlans.form.source')">
          <FormTextarea v-model="draft.source" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.vehicles"
      :title="t('maintenance.maintenancePlans.form.models')"
      :summary="[draft.modelCodes.map(modelLabel).join(', ')]"
    >
      <div class="xl:col-span-2 min-w-0">
        <PlanVehiclesEditor v-model="draft.modelCodes" :disabled="disabled" />
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.operations"
      :title="t('maintenance.maintenancePlans.form.operations')"
      :summary="[t('maintenance.maintenancePlans.operations.count', draft.operations.length)]"
    >
      <div class="xl:col-span-2 min-w-0" data-field="operations">
        <PlanOperationsEditor v-model="draft.operations" :disabled="disabled" />
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
