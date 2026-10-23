<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { isValidEmail } from '@/utils/email'
import { formatNumber } from '@/utils/format'
import type { SiteApi } from '../types/site.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<SiteApi>
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
    siteTypeNo: '',
    city: '',
    region: '',
    address: '',
    email: '',
    thirdPartyOwner: '',
    active: true,
    latitude: null as number | null,
    longitude: null as number | null,
    radiusM: null as number | null
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'siteTypeNo', 'latitude', 'longitude'],
  labelOf: (field) => t(`fleet.sites.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    if (values.email && !isValidEmail(values.email)) {
      errors.push({ fieldKey: 'email', label: t('common.validation.emailFormat') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, geofence: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    no: 'general',
    name: 'general',
    siteTypeNo: 'general',
    latitude: 'geofence',
    longitude: 'geofence'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.sites.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.sites.form.no')" :required="isNew">
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
          :label="t('fleet.sites.form.name')"
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
          field="siteTypeNo"
          :label="t('fleet.sites.form.siteTypeNo')"
          :required="isRequired('siteTypeNo')"
        >
          <ReferenceLookup
            v-model="draft.siteTypeNo"
            reference-key="siteTypes"
            :modal-title="t('fleet.sites.form.siteTypeNo')"
            detail-path="/fleet/site-types"
            :disabled="disabled"
            :invalid="hasValidationError('siteTypeNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.sites.form.city')">
          <FormInput v-model="draft.city" :maxlength="60" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.sites.form.region')">
          <FormInput v-model="draft.region" :maxlength="60" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.sites.form.address')">
          <FormInput v-model="draft.address" :maxlength="160" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.sites.form.email')">
          <FormInput v-model="draft.email" type="email" :maxlength="120" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.sites.form.thirdPartyOwner')">
          <FormInput v-model="draft.thirdPartyOwner" :maxlength="120" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.sites.form.thirdPartyOwnerHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.sites.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.geofence"
      :title="t('fleet.sites.form.geofence')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="latitude"
          :label="t('fleet.sites.form.latitude')"
          :required="isRequired('latitude')"
        >
          <FormInput
            v-model="draft.latitude"
            type="number"
            :min="-90"
            :max="90"
            step="0.0001"
            :disabled="disabled"
            :invalid="hasValidationError('latitude')"
          />
        </BaseFormField>
        <BaseFormField
          field="longitude"
          :label="t('fleet.sites.form.longitude')"
          :required="isRequired('longitude')"
        >
          <FormInput
            v-model="draft.longitude"
            type="number"
            :min="-180"
            :max="180"
            step="0.0001"
            :disabled="disabled"
            :invalid="hasValidationError('longitude')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.sites.form.radiusM')">
          <FormInput
            v-model="draft.radiusM"
            type="number"
            :min="50"
            :max="20000"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">{{ t('fleet.sites.form.radiusMHint') }}</p>
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.sites.form.effectiveRadiusM')">
          <FormInput :model-value="formatNumber(initialData.effectiveRadiusM ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <SiteGeofenceMap
      v-if="expandedSections.geofence"
      v-model:latitude="draft.latitude"
      v-model:longitude="draft.longitude"
      class="mb-6"
      :radius-m="draft.radiusM ?? initialData.effectiveRadiusM ?? null"
      :label="draft.name"
      :disabled="disabled"
    />

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
