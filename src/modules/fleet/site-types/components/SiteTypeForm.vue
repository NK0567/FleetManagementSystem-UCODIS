<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatNumber } from '@/utils/format'
import type { SiteTypeApi } from '../types/siteType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<SiteTypeApi>
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
    defaultRadiusM: 800,
    color: '#0b4480',
    loadingDepot: false,
    restAllowed: false,
    restricted: false,
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'defaultRadiusM'],
  labelOf: (field) => t(`fleet.siteTypes.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general', defaultRadiusM: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.siteTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.siteTypes.form.no')" :required="isNew">
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
          :label="t('fleet.siteTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="defaultRadiusM"
          :label="t('fleet.siteTypes.form.defaultRadiusM')"
          :required="isRequired('defaultRadiusM')"
        >
          <FormInput
            v-model="draft.defaultRadiusM"
            type="number"
            :min="50"
            :max="20000"
            :disabled="disabled"
            :invalid="hasValidationError('defaultRadiusM')"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.siteTypes.form.defaultRadiusMHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.siteTypes.form.color')">
          <input
            v-model="draft.color"
            type="color"
            class="h-9 w-16 border border-border rounded bg-card disabled:cursor-not-allowed"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.siteTypes.form.loadingDepot')">
          <ToggleSwitch v-model="draft.loadingDepot" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.siteTypes.form.loadingDepotHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.siteTypes.form.restAllowed')">
          <ToggleSwitch v-model="draft.restAllowed" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.siteTypes.form.restAllowedHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.siteTypes.form.restricted')">
          <ToggleSwitch v-model="draft.restricted" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.siteTypes.form.restrictedHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.siteTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.siteTypes.form.siteCount')">
          <FormInput :model-value="formatNumber(initialData.siteCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
