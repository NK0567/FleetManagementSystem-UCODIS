<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { TyreApi } from '../types/tyre.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TyreApi>
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
    serialNumber: '',
    make: '',
    size: '',
    dotCode: '',
    retreaded: false,
    supplierNo: null as string | null,
    price: 0,
    purchaseDate: ''
  }),
  required: ['serialNumber', 'make', 'size', 'price', 'purchaseDate'],
  labelOf: (field) => t(`maintenance.tyres.form.${field}`)
})

const expandedSections = ref({ general: true, purchase: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    serialNumber: 'general',
    make: 'general',
    size: 'general',
    price: 'purchase',
    purchaseDate: 'purchase'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.tyres.form.general')"
      :summary="[draft.serialNumber]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="serialNumber"
          :label="t('maintenance.tyres.form.serialNumber')"
          :required="isRequired('serialNumber')"
        >
          <FormInput
            v-model="draft.serialNumber"
            :maxlength="40"
            :disabled="disabled"
            :invalid="hasValidationError('serialNumber')"
          />
        </BaseFormField>
        <BaseFormField
          field="make"
          :label="t('maintenance.tyres.form.make')"
          :required="isRequired('make')"
        >
          <FormInput
            v-model="draft.make"
            :maxlength="60"
            :disabled="disabled"
            :invalid="hasValidationError('make')"
          />
        </BaseFormField>
        <BaseFormField
          field="size"
          :label="t('maintenance.tyres.form.size')"
          :required="isRequired('size')"
        >
          <FormInput
            v-model="draft.size"
            :maxlength="30"
            :disabled="disabled"
            :invalid="hasValidationError('size')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.tyres.form.dotCode')">
          <FormInput v-model="draft.dotCode" :maxlength="4" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('maintenance.tyres.form.dotCodeHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('maintenance.tyres.form.retreaded')">
          <ToggleSwitch v-model="draft.retreaded" :disabled="disabled || !isNew" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.purchase"
      :title="t('maintenance.tyres.form.purchase')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.tyres.form.supplierNo')">
          <ReferenceLookup
            v-model="draft.supplierNo"
            reference-key="tyreSuppliers"
            :modal-title="t('maintenance.tyres.form.supplierNo')"
            detail-path="/fleet/providers"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField
          field="price"
          :label="t('maintenance.tyres.form.price')"
          :required="isRequired('price')"
        >
          <FormInput
            v-model="draft.price"
            type="number"
            :disabled="disabled"
            :invalid="hasValidationError('price')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="purchaseDate"
          :label="t('maintenance.tyres.form.purchaseDate')"
          :required="isRequired('purchaseDate')"
        >
          <DateFormInput
            v-model="draft.purchaseDate"
            :disabled="disabled"
            :invalid="hasValidationError('purchaseDate')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
