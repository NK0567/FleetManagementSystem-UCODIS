<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import { USER_PROFILES, type UserProfileCode } from '@/types/auth.types'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import type { AlertRuleApi } from '../types/alertRule.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<AlertRuleApi>
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
    no: '',
    name: '',
    recipients: [] as string[],
    escalationHours: 72,
    escalateTo: '',
    active: true
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'escalationHours'],
  labelOf: (field) => t(`fleet.alertRules.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general', escalationHours: 'general' },
  fieldValues: () => ({ ...draft })
})

const optionsStore = useOptionsStore()
/** Drivers follow their own alerts in their space, not here. */
const BACK_OFFICE = USER_PROFILES.filter(
  (profile) => profile !== 'DRIVER' && profile !== 'DRIVER_ASSISTANT'
)

function toggleRecipient(profile: UserProfileCode, checked: boolean) {
  draft.recipients = checked
    ? [...draft.recipients, profile]
    : draft.recipients.filter((code) => code !== profile)
}

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.alertRules.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.alertRules.form.no')" :required="isNew">
          <FormInput
            v-model="draft.no"
            :maxlength="CODE_MAX_LENGTH"
            :disabled="disabled || !isNew"
            :show-lock-icon="!isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
        <BaseFormField
          field="name"
          :label="t('fleet.alertRules.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.alertRules.form.recipients')">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            <label
              v-for="profile in BACK_OFFICE"
              :key="profile"
              class="flex items-center gap-2 text-sm text-card-foreground"
            >
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary"
                :checked="draft.recipients.includes(profile)"
                :disabled="disabled"
                @change="toggleRecipient(profile, ($event.target as HTMLInputElement).checked)"
              />
              {{ optionsStore.getOptionLabel('userProfile', profile) }}
            </label>
          </div>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="escalationHours"
          :label="t('fleet.alertRules.form.escalationHours')"
          :required="isRequired('escalationHours')"
        >
          <FormInput
            v-model="draft.escalationHours"
            type="number"
            :min="1"
            :max="720"
            :disabled="disabled"
            :invalid="hasValidationError('escalationHours')"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.alertRules.form.escalationHoursHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.alertRules.form.escalateTo')">
          <OptionsSelect
            :model-value="draft.escalateTo"
            options-key="userProfile"
            :hidden-values="['DRIVER', 'DRIVER_ASSISTANT']"
            :disabled="disabled"
            @update:model-value="draft.escalateTo = String($event ?? '')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.alertRules.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
