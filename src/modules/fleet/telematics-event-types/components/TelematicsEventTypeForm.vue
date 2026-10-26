<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatNumber } from '@/utils/format'
import type {
  TelematicsEventTypeApi,
  TelematicsFamily,
  TelematicsSeverity,
  TelematicsUnit
} from '../types/telematicsEventType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TelematicsEventTypeApi>
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
    no: '',
    name: '',
    family: 'behavior' as TelematicsFamily,
    severity: 'major' as TelematicsSeverity,
    threshold: null as number | null,
    unit: null as TelematicsUnit | null,
    raisesAlert: false,
    affectsScore: false,
    infractionTypeNo: null as string | null,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'family', 'severity'],
  labelOf: (field) => t(`fleet.telematicsEventTypes.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, follow: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general', family: 'general', severity: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.telematicsEventTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="no"
          :label="t('fleet.telematicsEventTypes.form.no')"
          :required="isNew"
        >
          <FormInput
            v-model="draft.no"
            :maxlength="CODE_MAX_LENGTH"
            :disabled="disabled || !isNew"
            :show-lock-icon="!isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
        <BaseFormField
          field="name"
          :label="t('fleet.telematicsEventTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="family"
          :label="t('fleet.telematicsEventTypes.form.family')"
          :required="isRequired('family')"
        >
          <OptionsSelect
            :model-value="draft.family"
            options-key="telematicsFamily"
            :disabled="disabled"
            :invalid="hasValidationError('family')"
            @update:model-value="draft.family = String($event) as TelematicsFamily"
          />
        </BaseFormField>
        <BaseFormField
          field="severity"
          :label="t('fleet.telematicsEventTypes.form.severity')"
          :required="isRequired('severity')"
        >
          <OptionsSelect
            :model-value="draft.severity"
            options-key="telematicsSeverity"
            :disabled="disabled"
            :invalid="hasValidationError('severity')"
            @update:model-value="draft.severity = String($event) as TelematicsSeverity"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.telematicsEventTypes.form.threshold')">
          <FormInput
            v-model="draft.threshold"
            type="number"
            :min="0"
            step="0.01"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.telematicsEventTypes.form.thresholdHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.telematicsEventTypes.form.unit')">
          <OptionsSelect
            :model-value="draft.unit"
            options-key="telematicsUnit"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            @update:model-value="draft.unit = String($event) as TelematicsUnit"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.telematicsEventTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.telematicsEventTypes.form.eventCount')">
          <FormInput :model-value="formatNumber(initialData.eventCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.follow"
      :title="t('fleet.telematicsEventTypes.form.follow')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.telematicsEventTypes.form.raisesAlert')">
          <ToggleSwitch v-model="draft.raisesAlert" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.telematicsEventTypes.form.raisesAlertHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.telematicsEventTypes.form.affectsScore')">
          <ToggleSwitch v-model="draft.affectsScore" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.telematicsEventTypes.form.infractionTypeNo')">
          <ReferenceLookup
            v-model="draft.infractionTypeNo"
            reference-key="infractionTypes"
            :modal-title="t('fleet.telematicsEventTypes.form.infractionTypeNo')"
            detail-path="/fleet/infraction-types"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.telematicsEventTypes.form.infractionTypeNoHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
