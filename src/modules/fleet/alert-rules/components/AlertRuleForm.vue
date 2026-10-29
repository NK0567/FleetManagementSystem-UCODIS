<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import { USER_PROFILES, type UserProfileCode } from '@/types/auth.types'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { isValidEmail } from '@/utils/email'
import type { AlertRuleApi, AlertRuleSeverity } from '../types/alertRule.types'

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
    active: true,
    severity: 'by_case' as AlertRuleSeverity,
    email: false,
    sms: false,
    emailTo: [] as string[],
    smsTo: [] as string[]
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'escalationHours'],
  labelOf: (field) => t(`fleet.alertRules.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    if (values.email && !values.emailTo.length) {
      errors.push({ fieldKey: 'emailTo', label: t('fleet.alertRules.form.emailToRequired') })
    }
    if (values.email && values.emailTo.some((address) => !isValidEmail(address))) {
      errors.push({ fieldKey: 'emailTo', label: t('fleet.alertRules.form.emailToInvalid') })
    }
    if (values.sms && !values.smsTo.length) {
      errors.push({ fieldKey: 'smsTo', label: t('fleet.alertRules.form.smsToRequired') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, channels: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    no: 'general',
    name: 'general',
    escalationHours: 'general',
    emailTo: 'channels',
    smsTo: 'channels'
  },
  fieldValues: () => ({ ...draft })
})

const optionsStore = useOptionsStore()
/** Drivers follow their own alerts in their space, not here. */
const BACK_OFFICE = USER_PROFILES.filter(
  (profile) => profile !== 'DRIVER' && profile !== 'DRIVER_ASSISTANT'
)

/** Addresses are typed one after the other, separated by commas or semicolons. */
const listText = (list: readonly string[] | undefined) => (list ?? []).join(', ')
const splitList = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
const emailText = ref(listText(props.initialData.emailTo))
const smsText = ref(listText(props.initialData.smsTo))
watch(
  () => props.initialData,
  (data) => {
    emailText.value = listText(data.emailTo)
    smsText.value = listText(data.smsTo)
  }
)
function setEmailText(text: string) {
  emailText.value = text
  draft.emailTo = splitList(text)
}
function setSmsText(text: string) {
  smsText.value = text
  draft.smsTo = splitList(text)
}

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
      <div class="xl:col-span-2 min-w-0 space-y-3">
        <BaseFormField v-if="!isNew" :label="t('fleet.alertRules.form.event')">
          <p class="text-sm text-card-foreground">
            {{ optionsStore.getOptionLabel('alertCategory', initialData.no ?? '') }}
          </p>
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.alertRules.form.threshold')">
          <p class="text-sm text-card-foreground" data-testid="alert-rule-threshold">
            {{ initialData.threshold }}
            <RouterLink
              v-if="initialData.thresholdPath"
              :to="initialData.thresholdPath"
              class="ml-1 text-xs text-primary hover:underline"
            >
              {{ t('fleet.alertRules.form.setThreshold') }}
            </RouterLink>
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.alertRules.form.thresholdHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.alertRules.form.severity')">
          <OptionsSelect
            :model-value="draft.severity"
            options-key="alertRuleSeverity"
            :disabled="disabled"
            @update:model-value="draft.severity = String($event || 'by_case') as AlertRuleSeverity"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.channels"
      :title="t('fleet.alertRules.form.channels')"
      :summary="[
        [
          t('fleet.alertRules.channel.app'),
          draft.email ? t('fleet.alertRules.channel.email') : '',
          draft.sms ? t('fleet.alertRules.channel.sms') : ''
        ]
          .filter(Boolean)
          .join(', ')
      ]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.alertRules.channel.app')">
          <ToggleSwitch :model-value="true" disabled />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.alertRules.form.appHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.alertRules.channel.email')">
          <ToggleSwitch v-model="draft.email" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          v-if="draft.email"
          field="emailTo"
          :label="t('fleet.alertRules.form.emailTo')"
          required
        >
          <FormInput
            :model-value="emailText"
            :maxlength="400"
            :disabled="disabled"
            :invalid="hasValidationError('emailTo')"
            @update:model-value="setEmailText(String($event ?? ''))"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.alertRules.channel.sms')">
          <ToggleSwitch v-model="draft.sms" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          v-if="draft.sms"
          field="smsTo"
          :label="t('fleet.alertRules.form.smsTo')"
          required
        >
          <FormInput
            :model-value="smsText"
            :maxlength="400"
            :disabled="disabled"
            :invalid="hasValidationError('smsTo')"
            @update:model-value="setSmsText(String($event ?? ''))"
          />
        </BaseFormField>
        <p class="text-xs text-muted-foreground">{{ t('fleet.alertRules.form.channelsHint') }}</p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
