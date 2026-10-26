<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { tariffIssues } from '../domain/transportTariff'
import type { TransportTariffApi, TariffTarget, TariffBasis } from '../types/transportTariff.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TransportTariffApi>
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
    target: 'customer' as TariffTarget,
    customerNo: null as string | null,
    carrierNo: null as string | null,
    basis: 'distance' as TariffBasis,
    routeTemplateNo: null as string | null,
    price: 0,
    active: true,
    family: '',
    productNo: null as string | null
  }),
  required: ['target', 'basis', 'price'],
  labelOf: (field) => t(`planning.transportTariffs.form.${field}`),
  validate: (values) =>
    tariffIssues({ ...values, family: values.family ?? '' }).map(
      (issue): FormValidationError => ({
        fieldKey:
          issue === 'routeNeeded'
            ? 'routeTemplateNo'
            : values.target === 'customer'
              ? 'customerNo'
              : 'carrierNo',
        label: t(`planning.transportTariffs.issue.${issue}`)
      })
    )
})

const expandedSections = ref({ general: true, goods: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    target: 'general',
    customerNo: 'general',
    carrierNo: 'general',
    basis: 'general',
    routeTemplateNo: 'general',
    price: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.transportTariffs.form.general')"
      :summary="[initialData.partyName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="target"
          :label="t('planning.transportTariffs.form.target')"
          :required="isRequired('target')"
        >
          <OptionsSelect
            :model-value="draft.target"
            options-key="tariffTarget"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('target')"
            @update:model-value="draft.target = String($event) as TariffTarget"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.transportTariffs.form.targetHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          v-if="draft.target === 'customer'"
          field="customerNo"
          :label="t('planning.transportTariffs.form.customerNo')"
          required
        >
          <ReferenceLookup
            v-model="draft.customerNo"
            reference-key="billableCustomers"
            :modal-title="t('planning.transportTariffs.form.customerNo')"
            detail-path="/planning/customers"
            :disabled="disabled || !isNew"
          />
        </BaseFormField>
        <BaseFormField
          v-else
          field="carrierNo"
          :label="t('planning.transportTariffs.form.carrierNo')"
          required
        >
          <ReferenceLookup
            v-model="draft.carrierNo"
            reference-key="carriers"
            :modal-title="t('planning.transportTariffs.form.carrierNo')"
            detail-path="/fleet/providers"
            :disabled="disabled || !isNew"
          />
        </BaseFormField>
        <BaseFormField
          field="basis"
          :label="t('planning.transportTariffs.form.basis')"
          :required="isRequired('basis')"
        >
          <OptionsSelect
            :model-value="draft.basis"
            options-key="tariffBasis"
            :disabled="disabled"
            :invalid="hasValidationError('basis')"
            @update:model-value="draft.basis = String($event) as TariffBasis"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.transportTariffs.form.basisHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          v-if="draft.basis === 'route_template'"
          field="routeTemplateNo"
          :label="t('planning.transportTariffs.form.routeTemplateNo')"
          required
        >
          <ReferenceLookup
            v-model="draft.routeTemplateNo"
            reference-key="routeTemplates"
            :modal-title="t('planning.transportTariffs.form.routeTemplateNo')"
            detail-path="/fleet/route-templates"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.transportTariffs.form.routeTemplateNoHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          field="price"
          :label="t('planning.transportTariffs.form.price')"
          :required="isRequired('price')"
        >
          <FormInput
            v-model="draft.price"
            type="number"
            :min="1"
            :max="100000000000"
            :disabled="disabled"
            :invalid="hasValidationError('price')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.transportTariffs.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.goods"
      :title="t('planning.transportTariffs.form.goods')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.transportTariffs.form.family')">
          <FormInput v-model="draft.family" :maxlength="60" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.transportTariffs.form.familyHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.transportTariffs.form.productNo')">
          <ReferenceLookup
            v-model="draft.productNo"
            reference-key="products"
            :modal-title="t('planning.transportTariffs.form.productNo')"
            detail-path="/planning/products"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.transportTariffs.form.productNoHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
