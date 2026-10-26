<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { FuelCardTransactionApi } from '../types/fuelCardTransaction.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<FuelCardTransactionApi>
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
    cardNo: '',
    transactedAt: '',
    station: '',
    city: '',
    liters: 0,
    amount: 0
  }),
  required: ['cardNo', 'transactedAt', 'station', 'city', 'liters', 'amount'],
  labelOf: (field) => t(`fleet.fuelCardTransactions.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    cardNo: 'general',
    transactedAt: 'general',
    station: 'general',
    city: 'general',
    liters: 'general',
    amount: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.fuelCardTransactions.form.general')"
      :summary="[initialData.cardNumber]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="cardNo"
          :label="t('fleet.fuelCardTransactions.form.cardNo')"
          :required="isRequired('cardNo')"
        >
          <ReferenceLookup
            v-model="draft.cardNo"
            reference-key="fuelCards"
            :modal-title="t('fleet.fuelCardTransactions.form.cardNo')"
            detail-path="/fleet/fuel-cards"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('cardNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="transactedAt"
          :label="t('fleet.fuelCardTransactions.form.transactedAt')"
          :required="isRequired('transactedAt')"
        >
          <FormInput
            v-model="draft.transactedAt"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('transactedAt')"
          />
        </BaseFormField>
        <BaseFormField
          field="station"
          :label="t('fleet.fuelCardTransactions.form.station')"
          :required="isRequired('station')"
        >
          <FormInput
            v-model="draft.station"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('station')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="city"
          :label="t('fleet.fuelCardTransactions.form.city')"
          :required="isRequired('city')"
        >
          <FormInput
            v-model="draft.city"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('city')"
          />
        </BaseFormField>
        <BaseFormField
          field="liters"
          :label="t('fleet.fuelCardTransactions.form.liters')"
          :required="isRequired('liters')"
        >
          <FormInput
            v-model="draft.liters"
            type="number"
            :min="0.1"
            :disabled="disabled"
            :invalid="hasValidationError('liters')"
          />
        </BaseFormField>
        <BaseFormField
          field="amount"
          :label="t('fleet.fuelCardTransactions.form.amount')"
          :required="isRequired('amount')"
        >
          <FormInput
            v-model="draft.amount"
            type="number"
            :min="1"
            :disabled="disabled"
            :invalid="hasValidationError('amount')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
