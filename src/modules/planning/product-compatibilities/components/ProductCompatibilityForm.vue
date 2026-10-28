<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type {
  ProductCompatibilityApi,
  ProductCompatibilityKind
} from '../types/productCompatibility.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<ProductCompatibilityApi>
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
    kind: 'together' as ProductCompatibilityKind,
    productANo: '',
    productBNo: '',
    active: true
  }),
  required: ['kind', 'productANo', 'productBNo'],
  labelOf: (field) => t(`planning.productCompatibilities.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.productANo && values.productANo === values.productBNo) {
      errors.push({
        fieldKey: 'productBNo',
        label: t('planning.productCompatibilities.form.sameProduct')
      })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { kind: 'general', productANo: 'general', productBNo: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.productCompatibilities.form.general')"
      :summary="[initialData.productAName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="kind"
          :label="t('planning.productCompatibilities.form.kind')"
          :required="isRequired('kind')"
        >
          <OptionsSelect
            :model-value="draft.kind"
            options-key="productCompatibilityKind"
            :disabled="disabled"
            :invalid="hasValidationError('kind')"
            @update:model-value="draft.kind = String($event) as ProductCompatibilityKind"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.productCompatibilities.form.kindHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          field="productANo"
          :label="t('planning.productCompatibilities.form.productANo')"
          :required="isRequired('productANo')"
        >
          <ReferenceLookup
            v-model="draft.productANo"
            reference-key="products"
            :modal-title="t('planning.productCompatibilities.form.productANo')"
            detail-path="/planning/products"
            :disabled="disabled"
            :invalid="hasValidationError('productANo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="productBNo"
          :label="t('planning.productCompatibilities.form.productBNo')"
          :required="isRequired('productBNo')"
        >
          <ReferenceLookup
            v-model="draft.productBNo"
            reference-key="products"
            :modal-title="t('planning.productCompatibilities.form.productBNo')"
            detail-path="/planning/products"
            :disabled="disabled"
            :invalid="hasValidationError('productBNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.productCompatibilities.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
