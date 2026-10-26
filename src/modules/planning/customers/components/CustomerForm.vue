<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { isValidEmail } from '@/utils/email'
import { customerIssues, type CustomerIssue } from '../domain/customer'
import type { CustomerApi, CustomerNature, NotificationChannel } from '../types/customer.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<CustomerApi>
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

const ISSUE_FIELDS: Record<CustomerIssue, string> = {
  noRole: 'isRecipient',
  channelNeedsPhone: 'phone',
  channelNeedsEmail: 'email'
}

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    name: '',
    isOrderer: false,
    isRecipient: true,
    nature: 'external' as CustomerNature,
    address: '',
    city: '',
    contactName: '',
    phone: '',
    email: '',
    notificationChannel: 'sms' as NotificationChannel,
    active: true
  }),
  required: ['name', 'nature', 'notificationChannel'],
  labelOf: (field) => t(`planning.customers.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.email && !isValidEmail(values.email)) {
      errors.push({ fieldKey: 'email', label: t('common.validation.emailFormat') })
    }
    for (const issue of customerIssues(values)) {
      errors.push({ fieldKey: ISSUE_FIELDS[issue], label: t(`planning.customers.issue.${issue}`) })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, contact: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    name: 'general',
    nature: 'general',
    isRecipient: 'general',
    phone: 'contact',
    email: 'contact',
    notificationChannel: 'contact'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.customers.form.general')"
      :summary="[draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="name"
          :label="t('planning.customers.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.isOrderer')">
          <ToggleSwitch v-model="draft.isOrderer" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.customers.form.isOrdererHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.isRecipient')">
          <ToggleSwitch v-model="draft.isRecipient" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.customers.form.isRecipientHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="nature"
          :label="t('planning.customers.form.nature')"
          :required="isRequired('nature')"
        >
          <OptionsSelect
            :model-value="draft.nature"
            options-key="customerNature"
            :disabled="disabled"
            :invalid="hasValidationError('nature')"
            @update:model-value="draft.nature = String($event) as CustomerNature"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.customers.form.natureHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.address')">
          <FormInput v-model="draft.address" :maxlength="160" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.city')">
          <FormInput v-model="draft.city" :maxlength="80" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.contact"
      :title="t('planning.customers.form.contact')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.customers.form.contactName')">
          <FormInput v-model="draft.contactName" :maxlength="80" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.phone')">
          <FormInput v-model="draft.phone" type="tel" :maxlength="30" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.email')">
          <FormInput v-model="draft.email" type="email" :maxlength="120" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="notificationChannel"
          :label="t('planning.customers.form.notificationChannel')"
          :required="isRequired('notificationChannel')"
        >
          <OptionsSelect
            :model-value="draft.notificationChannel"
            options-key="notificationChannel"
            :disabled="disabled"
            :invalid="hasValidationError('notificationChannel')"
            @update:model-value="draft.notificationChannel = String($event) as NotificationChannel"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.customers.form.notificationChannelHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
