<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { productNeedsDensity } from '../domain/product'
import type { ProductApi } from '../types/product.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<ProductApi>
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
    family: '',
    unit: '',
    active: true,
    isFuel: false,
    referenceDensity: null as number | null,
    expansionCoefficient: null as number | null
  }),
  required: ['name', 'family', 'unit'],
  labelOf: (field) => t(`planning.products.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (productNeedsDensity(values)) {
      errors.push({
        fieldKey: 'referenceDensity',
        label: t('planning.products.form.referenceDensityRequired')
      })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, fuel: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { name: 'general', family: 'general', unit: 'general', referenceDensity: 'fuel' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.products.form.general')"
      :summary="[draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="name"
          :label="t('planning.products.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="family"
          :label="t('planning.products.form.family')"
          :required="isRequired('family')"
        >
          <FormInput
            v-model="draft.family"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('family')"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.products.form.familyHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="unit"
          :label="t('planning.products.form.unit')"
          :required="isRequired('unit')"
        >
          <FormInput
            v-model="draft.unit"
            :maxlength="30"
            :disabled="disabled"
            :invalid="hasValidationError('unit')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.products.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.fuel"
      :title="t('planning.products.form.fuel')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.products.form.isFuel')">
          <ToggleSwitch v-model="draft.isFuel" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.products.form.isFuelHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="referenceDensity"
          :label="t('planning.products.form.referenceDensity')"
          :required="draft.isFuel"
        >
          <FormInput
            v-model="draft.referenceDensity"
            type="number"
            :min="0.5"
            :max="1.2"
            :disabled="disabled || !draft.isFuel"
            :invalid="hasValidationError('referenceDensity')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.products.form.expansionCoefficient')">
          <FormInput
            v-model="draft.expansionCoefficient"
            type="number"
            :min="0"
            :max="0.005"
            :disabled="disabled || !draft.isFuel"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
