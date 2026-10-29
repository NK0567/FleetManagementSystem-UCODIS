<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import {
  defaultMeasures,
  FUEL_MEASURES,
  measureIssues,
  PRODUCT_MEASURES,
  productNeedsDensity,
  type ProductMeasure
} from '../domain/product'
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
    expansionCoefficient: null as number | null,
    unitWeightKg: null as number | null,
    unitVolumeM3: null as number | null,
    loadingMeasures: ['quantity'] as ProductMeasure[],
    deliveryMeasures: ['quantity'] as ProductMeasure[]
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
    for (const field of ['loadingMeasures', 'deliveryMeasures'] as const) {
      const [issue] = measureIssues(values.isFuel, values[field])
      if (issue) errors.push({ fieldKey: field, label: t(`planning.products.measures.${issue}`) })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, fuel: true, measures: true, audit: false })

/* A product turning into a fuel takes the measures of a fuel by default; one that stops being a
 * fuel drops them (TRS06-US04). */
watch(
  () => draft.isFuel,
  (isFuel, was) => {
    if (props.disabled || isFuel === was) return
    for (const field of ['loadingMeasures', 'deliveryMeasures'] as const) {
      draft[field] = isFuel
        ? [...new Set([...draft[field], ...defaultMeasures(true)])]
        : draft[field].filter((measure) => !FUEL_MEASURES.includes(measure))
    }
  }
)

function toggleMeasure(field: 'loadingMeasures' | 'deliveryMeasures', measure: ProductMeasure) {
  draft[field] = draft[field].includes(measure)
    ? draft[field].filter((item) => item !== measure)
    : [...draft[field], measure]
}
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    name: 'general',
    family: 'general',
    unit: 'general',
    referenceDensity: 'fuel',
    loadingMeasures: 'measures',
    deliveryMeasures: 'measures'
  },
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
        <BaseFormField :label="t('planning.products.form.unitWeightKg')">
          <FormInput v-model="draft.unitWeightKg" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('planning.products.form.unitVolumeM3')">
          <FormInput v-model="draft.unitVolumeM3" type="number" :min="0" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.products.form.unitMeasuresHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.products.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.measures"
      :title="t('planning.products.measures.title')"
      :summary="[]"
    >
      <p class="xl:col-span-2 text-xs text-muted-foreground">
        {{ t('planning.products.measures.hint') }}
      </p>
      <BaseFormField
        v-for="field in ['loadingMeasures', 'deliveryMeasures'] as const"
        :key="field"
        :field="field"
        :label="t(`planning.products.measures.${field}`)"
      >
        <div class="flex flex-wrap gap-x-4 gap-y-1" :data-field="field">
          <label
            v-for="measure in PRODUCT_MEASURES"
            :key="measure"
            class="inline-flex items-center gap-2 text-sm"
            :class="!draft.isFuel && FUEL_MEASURES.includes(measure) ? 'opacity-50' : ''"
          >
            <input
              type="checkbox"
              class="h-4 w-4 accent-primary"
              :checked="draft[field].includes(measure)"
              :disabled="
                disabled ||
                measure === 'quantity' ||
                (!draft.isFuel && FUEL_MEASURES.includes(measure))
              "
              @change="toggleMeasure(field, measure)"
            />
            {{ t(`planning.products.measures.${measure}`) }}
          </label>
        </div>
      </BaseFormField>
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
