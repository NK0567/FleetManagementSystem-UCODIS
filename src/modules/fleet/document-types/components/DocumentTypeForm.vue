<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useReferenceStore } from '@/stores/referenceStore'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatNumber } from '@/utils/format'
import type {
  DocumentTarget,
  DocumentTypeApi,
  DocumentValidity,
  PersonScope
} from '../types/documentType.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DocumentTypeApi>
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
const referenceStore = useReferenceStore()

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    no: '',
    name: '',
    target: 'vehicle' as DocumentTarget,
    personScope: 'all' as PersonScope,
    vehicleTypeNos: [] as string[],
    mandatory: true,
    active: true,
    validity: 'limited' as DocumentValidity,
    durationMonths: null as number | null,
    noticeDays: null as number | null
  }),
  createOnly: ['no', 'target'],
  required: ['no', 'name', 'target', 'validity'],
  labelOf: (field) => t(`fleet.documentTypes.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    return errors
  }
})

const limited = computed(() => draft.validity === 'limited')
const vehicleTypes = computed(() => referenceStore.getItems('vehicleTypes'))

function toggleVehicleType(code: string, checked: boolean) {
  draft.vehicleTypeNos = checked
    ? [...draft.vehicleTypeNos, code]
    : draft.vehicleTypeNos.filter((no) => no !== code)
}

const scopeSummary = computed(() => {
  if (draft.target !== 'vehicle') return ''
  return draft.vehicleTypeNos.length
    ? t('fleet.documentTypes.form.vehicleTypeCount', draft.vehicleTypeNos.length)
    : t('fleet.documentTypes.form.allVehicleTypes')
})

const expandedSections = ref({ general: true, scope: true, lifetime: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', name: 'general', target: 'general', validity: 'lifetime' },
  fieldValues: () => ({ ...draft })
})

onMounted(() => void referenceStore.fetchAll())

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.documentTypes.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.documentTypes.form.no')" :required="isNew">
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
          :label="t('fleet.documentTypes.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="80"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField
          field="target"
          :label="t('fleet.documentTypes.form.target')"
          :required="isNew"
        >
          <OptionsSelect
            :model-value="draft.target"
            options-key="documentTarget"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('target')"
            @update:model-value="draft.target = String($event) as DocumentTarget"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.documentTypes.form.mandatory')">
          <ToggleSwitch v-model="draft.mandatory" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.documentTypes.form.mandatoryHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.documentTypes.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.documentTypes.form.documentCount')">
          <FormInput :model-value="formatNumber(initialData.documentCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="draft.target !== 'company'"
      v-model:open="expandedSections.scope"
      :title="t('fleet.documentTypes.form.scope')"
      :summary="[scopeSummary]"
    >
      <div v-if="draft.target === 'person'" class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.documentTypes.form.personScope')">
          <OptionsSelect
            :model-value="draft.personScope"
            options-key="personScope"
            :disabled="disabled"
            @update:model-value="draft.personScope = String($event) as PersonScope"
          />
        </BaseFormField>
      </div>
      <div v-else class="xl:col-span-2 min-w-0">
        <p class="text-xs text-muted-foreground mb-2">
          {{ t('fleet.documentTypes.form.vehicleTypesHint') }}
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
          <label
            v-for="vehicleType in vehicleTypes"
            :key="vehicleType.code"
            class="flex items-center gap-2 text-sm text-card-foreground"
          >
            <input
              type="checkbox"
              class="h-4 w-4 accent-primary"
              :checked="draft.vehicleTypeNos.includes(vehicleType.code)"
              :disabled="disabled"
              @change="
                toggleVehicleType(vehicleType.code, ($event.target as HTMLInputElement).checked)
              "
            />
            {{ vehicleType.description }}
          </label>
        </div>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.lifetime"
      :title="t('fleet.documentTypes.form.lifetime')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="validity"
          :label="t('fleet.documentTypes.form.validity')"
          :required="isRequired('validity')"
        >
          <OptionsSelect
            :model-value="draft.validity"
            options-key="documentValidity"
            :disabled="disabled"
            :invalid="hasValidationError('validity')"
            @update:model-value="draft.validity = String($event) as DocumentValidity"
          />
        </BaseFormField>
        <BaseFormField v-if="limited" :label="t('fleet.documentTypes.form.durationMonths')">
          <FormInput
            v-model="draft.durationMonths"
            type="number"
            :min="1"
            :max="240"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.documentTypes.form.durationMonthsHint') }}
          </p>
        </BaseFormField>
      </div>
      <div v-if="limited" class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.documentTypes.form.noticeDays')">
          <FormInput
            v-model="draft.noticeDays"
            type="number"
            :min="0"
            :max="365"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.documentTypes.form.noticeDaysHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
