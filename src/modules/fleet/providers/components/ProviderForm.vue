<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { isValidEmail } from '@/utils/email'
import { contractIssues } from '../domain/provider'
import type { ProviderApi, ProviderContract, ProviderType } from '../types/provider.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<ProviderApi>
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
    providerType: 'garage' as ProviderType,
    contactName: '',
    phone: '',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [] as ProviderContract[]
  }),
  required: ['name', 'providerType'],
  labelOf: (field) => t(`fleet.providers.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.email && !isValidEmail(values.email)) {
      errors.push({ fieldKey: 'email', label: t('common.validation.emailFormat') })
    }
    if (!values.authorized && !values.notAuthorizedReason.trim()) {
      errors.push({
        fieldKey: 'notAuthorizedReason',
        label: t('fleet.providers.form.notAuthorizedReasonRequired')
      })
    }
    if (values.contracts.some((contract) => contractIssues(contract).length > 0)) {
      errors.push({ fieldKey: 'contracts', label: t('fleet.providers.contracts.invalid') })
    }
    return errors
  }
})

const expandedSections = ref({
  general: true,
  authorization: true,
  contracts: true,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    name: 'general',
    providerType: 'general',
    notAuthorizedReason: 'authorization',
    contracts: 'contracts'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.providers.form.general')"
      :summary="[draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="name"
          :label="t('fleet.providers.form.name')"
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
          field="providerType"
          :label="t('fleet.providers.form.providerType')"
          :required="isRequired('providerType')"
        >
          <OptionsSelect
            :model-value="draft.providerType"
            options-key="providerType"
            :disabled="disabled"
            :invalid="hasValidationError('providerType')"
            @update:model-value="draft.providerType = String($event) as ProviderType"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.providers.form.contactName')">
          <FormInput v-model="draft.contactName" :maxlength="80" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.providers.form.phone')">
          <FormInput v-model="draft.phone" type="tel" :maxlength="30" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.providers.form.email')">
          <FormInput v-model="draft.email" type="email" :maxlength="120" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.providers.form.address')">
          <FormInput v-model="draft.address" :maxlength="160" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.authorization"
      :title="t('fleet.providers.form.authorization')"
      :summary="[draft.authorized ? t('common.yes') : t('common.no')]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.providers.form.authorized')">
          <ToggleSwitch v-model="draft.authorized" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          v-if="!draft.authorized"
          field="notAuthorizedReason"
          :label="t('fleet.providers.form.notAuthorizedReason')"
          required
        >
          <FormTextarea v-model="draft.notAuthorizedReason" :rows="3" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.providers.form.notAuthorizedReasonHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.contracts"
      :title="t('fleet.providers.form.contracts')"
      :summary="[t('fleet.providers.contracts.count', draft.contracts.length)]"
    >
      <div class="xl:col-span-2 min-w-0" data-field="contracts">
        <ProviderContractsEditor v-model="draft.contracts" :disabled="disabled" />
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
