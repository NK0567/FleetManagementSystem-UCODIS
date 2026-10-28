<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { DeliveryRequestApi, FreightPayer } from '../types/deliveryRequest.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DeliveryRequestApi>
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
    ordererNo: '',
    deliveryPointNo: '',
    desiredDate: '',
    validUntil: null as string | null,
    externalReference: '',
    freightPayer: 'orderer' as FreightPayer,
    comment: '',
    productNo: '',
    quantity: 0,
    weightKg: null as number | null,
    volumeM3: null as number | null
  }),
  required: [
    'ordererNo',
    'deliveryPointNo',
    'desiredDate',
    'freightPayer',
    'productNo',
    'quantity'
  ],
  labelOf: (field) => t(`planning.deliveryRequests.form.${field}`)
})

const expandedSections = ref({ general: true, goods: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    ordererNo: 'general',
    deliveryPointNo: 'general',
    desiredDate: 'general',
    freightPayer: 'general',
    productNo: 'goods',
    quantity: 'goods'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.deliveryRequests.form.general')"
      :summary="[initialData.deliveryPointName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="ordererNo"
          :label="t('planning.deliveryRequests.form.ordererNo')"
          :required="isRequired('ordererNo')"
        >
          <ReferenceLookup
            v-model="draft.ordererNo"
            reference-key="ordererCustomers"
            :modal-title="t('planning.deliveryRequests.form.ordererNo')"
            detail-path="/planning/customers"
            :disabled="disabled"
            :invalid="hasValidationError('ordererNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="deliveryPointNo"
          :label="t('planning.deliveryRequests.form.deliveryPointNo')"
          :required="isRequired('deliveryPointNo')"
        >
          <ReferenceLookup
            v-model="draft.deliveryPointNo"
            reference-key="deliveryPoints"
            :modal-title="t('planning.deliveryRequests.form.deliveryPointNo')"
            detail-path="/planning/delivery-points"
            :disabled="disabled"
            :invalid="hasValidationError('deliveryPointNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="desiredDate"
          :label="t('planning.deliveryRequests.form.desiredDate')"
          :required="isRequired('desiredDate')"
        >
          <DateFormInput
            v-model="draft.desiredDate"
            :disabled="disabled"
            :invalid="hasValidationError('desiredDate')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryRequests.form.validUntil')">
          <DateFormInput v-model="draft.validUntil" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryRequests.form.validUntilHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryRequests.form.externalReference')">
          <FormInput v-model="draft.externalReference" :maxlength="40" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="freightPayer"
          :label="t('planning.deliveryRequests.form.freightPayer')"
          :required="isRequired('freightPayer')"
        >
          <OptionsSelect
            :model-value="draft.freightPayer"
            options-key="freightPayer"
            :disabled="disabled"
            :invalid="hasValidationError('freightPayer')"
            @update:model-value="draft.freightPayer = String($event) as FreightPayer"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryRequests.form.comment')">
          <FormTextarea v-model="draft.comment" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.goods"
      :title="t('planning.deliveryRequests.form.goods')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="productNo"
          :label="t('planning.deliveryRequests.form.productNo')"
          :required="isRequired('productNo')"
        >
          <ReferenceLookup
            v-model="draft.productNo"
            reference-key="products"
            :modal-title="t('planning.deliveryRequests.form.productNo')"
            detail-path="/planning/products"
            :disabled="disabled"
            :invalid="hasValidationError('productNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="quantity"
          :label="t('planning.deliveryRequests.form.quantity')"
          :required="isRequired('quantity')"
        >
          <FormInput
            v-model="draft.quantity"
            type="number"
            :min="0.001"
            :max="1000000000"
            :disabled="disabled"
            :invalid="hasValidationError('quantity')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryRequests.form.weightKg')">
          <FormInput
            v-model="draft.weightKg"
            type="number"
            :min="0"
            :max="1000000"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryRequests.form.volumeM3')">
          <FormInput
            v-model="draft.volumeM3"
            type="number"
            :min="0"
            :max="10000"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
