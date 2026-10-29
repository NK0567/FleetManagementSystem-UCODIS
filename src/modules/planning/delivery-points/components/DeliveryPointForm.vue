<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useReferenceStore } from '@/stores/referenceStore'
import type { DeliveryPointApi } from '../types/deliveryPoint.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DeliveryPointApi>
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
    name: '',
    customerNo: '',
    address: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    pumpRequired: false,
    acceptedVehicleTypeNos: [] as string[],
    active: true,
    kind: 'delivery' as 'delivery' | 'depot',
    siteNo: null as string | null,
    ownerName: ''
  }),
  required: ['name'],
  labelOf: (field) => t(`planning.deliveryPoints.form.${field}`),
  /* A delivery site belongs to a recipient; a depot to the company or a third party. A point tied
   * to a site of the FMS register takes its place from there (TRS07-US02). */
  validate: (values) => {
    const errors: FormValidationError[] = []
    const label = (field: string) => t(`planning.deliveryPoints.form.${field}`)
    if (values.kind === 'delivery' && !values.customerNo) {
      errors.push({ fieldKey: 'customerNo', label: label('customerNo') })
    }
    if (!values.siteNo && values.latitude == null) {
      errors.push({ fieldKey: 'latitude', label: label('latitude') })
    }
    if (!values.siteNo && values.longitude == null) {
      errors.push({ fieldKey: 'longitude', label: label('longitude') })
    }
    return errors
  }
})
const fromSite = computed(() => !!draft.siteNo)

const expandedSections = ref({ general: true, location: true, constraints: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    name: 'general',
    customerNo: 'general',
    latitude: 'location',
    longitude: 'location'
  },
  fieldValues: () => ({ ...draft })
})

const vehicleTypes = computed(() =>
  referenceStore
    .getItems('vehicleTypes')
    .filter((item) => item.active !== false || draft.acceptedVehicleTypeNos.includes(item.code))
)

function toggleVehicleType(code: string, accepted: boolean) {
  draft.acceptedVehicleTypeNos = accepted
    ? [...draft.acceptedVehicleTypeNos, code]
    : draft.acceptedVehicleTypeNos.filter((item) => item !== code)
}

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.deliveryPoints.form.general')"
      :summary="[draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="name"
          :label="t('planning.deliveryPoints.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryPoints.form.kind')" required>
          <OptionsSelect
            :model-value="draft.kind"
            options-key="deliveryPointKind"
            :disabled="disabled || !isNew"
            @update:model-value="draft.kind = String($event) as 'delivery' | 'depot'"
          />
        </BaseFormField>
        <BaseFormField
          v-if="draft.kind === 'delivery'"
          field="customerNo"
          :label="t('planning.deliveryPoints.form.customerNo')"
          required
        >
          <ReferenceLookup
            v-model="draft.customerNo"
            reference-key="recipientCustomers"
            :modal-title="t('planning.deliveryPoints.form.customerNo')"
            detail-path="/planning/customers"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('customerNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryPoints.form.siteNo')">
          <ReferenceLookup
            v-model="draft.siteNo"
            reference-key="sites"
            :modal-title="t('planning.deliveryPoints.form.siteNo')"
            detail-path="/fleet/sites"
            :disabled="disabled"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryPoints.form.siteNoHint') }}
          </p>
        </BaseFormField>
        <BaseFormField
          v-if="draft.kind === 'depot'"
          :label="t('planning.deliveryPoints.form.ownerName')"
        >
          <FormInput v-model="draft.ownerName" :maxlength="120" :disabled="disabled || fromSite" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryPoints.form.ownerNameHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryPoints.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.location"
      :title="t('planning.deliveryPoints.form.location')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryPoints.form.address')">
          <FormInput v-model="draft.address" :maxlength="160" :disabled="disabled || fromSite" />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryPoints.form.city')">
          <FormInput v-model="draft.city" :maxlength="80" :disabled="disabled || fromSite" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="latitude"
          :label="t('planning.deliveryPoints.form.latitude')"
          :required="!fromSite"
        >
          <FormInput
            v-model="draft.latitude"
            type="number"
            :min="-90"
            :max="90"
            :disabled="disabled || fromSite"
            :invalid="hasValidationError('latitude')"
          />
        </BaseFormField>
        <BaseFormField
          field="longitude"
          :label="t('planning.deliveryPoints.form.longitude')"
          :required="!fromSite"
        >
          <FormInput
            v-model="draft.longitude"
            type="number"
            :min="-180"
            :max="180"
            :disabled="disabled || fromSite"
            :invalid="hasValidationError('longitude')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.constraints"
      :title="t('planning.deliveryPoints.form.constraints')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryPoints.form.pumpRequired')">
          <ToggleSwitch v-model="draft.pumpRequired" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryPoints.form.pumpRequiredHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryPoints.form.acceptedVehicleTypeNos')">
          <div class="space-y-1.5">
            <label
              v-for="type in vehicleTypes"
              :key="type.code"
              class="flex items-center gap-2 text-sm text-card-foreground"
            >
              <input
                type="checkbox"
                class="accent-primary"
                :checked="draft.acceptedVehicleTypeNos.includes(type.code)"
                :disabled="disabled"
                @change="toggleVehicleType(type.code, ($event.target as HTMLInputElement).checked)"
              />
              {{ type.description }}
            </label>
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryPoints.form.acceptedVehicleTypeNosHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <MapPointPicker
      v-if="expandedSections.location"
      v-model:latitude="draft.latitude"
      v-model:longitude="draft.longitude"
      class="mb-6"
      :label="draft.name || t('planning.deliveryPoints.map.point')"
      :hint="
        disabled
          ? t('planning.deliveryPoints.map.readOnlyHint')
          : t('planning.deliveryPoints.map.editHint')
      "
      :disabled="disabled || fromSite"
    />

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
