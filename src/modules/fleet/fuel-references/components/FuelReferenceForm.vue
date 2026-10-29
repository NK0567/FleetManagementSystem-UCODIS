<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { FuelReferenceApi } from '../types/fuelReference.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<FuelReferenceApi>
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
    vehicleNo: '',
    routeTemplateNo: null as string | null,
    referenceL100: null as number | null,
    comment: ''
  }),
  createOnly: ['vehicleNo', 'routeTemplateNo'],
  required: ['vehicleNo', 'referenceL100'],
  labelOf: (field) => t(`fleet.fuelReferences.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { vehicleNo: 'general', referenceL100: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.fuelReferences.form.general')"
      :summary="[initialData.vehiclePlate, initialData.routeName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.fuelReferences.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.fuelReferences.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelReferences.form.routeTemplateNo')">
          <ReferenceLookup
            v-model="draft.routeTemplateNo"
            reference-key="routeTemplates"
            :modal-title="t('fleet.fuelReferences.form.routeTemplateNo')"
            detail-path="/fleet/route-templates"
            :disabled="disabled || !isNew"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.fuelReferences.form.routeTemplateHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="referenceL100"
          :label="t('fleet.fuelReferences.form.referenceL100')"
          :required="isRequired('referenceL100')"
        >
          <FormInput
            v-model="draft.referenceL100"
            type="number"
            :min="5"
            :max="100"
            :step="0.1"
            :disabled="disabled"
            :invalid="hasValidationError('referenceL100')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelReferences.form.comment')">
          <FormTextarea v-model="draft.comment" :rows="3" :maxlength="300" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
