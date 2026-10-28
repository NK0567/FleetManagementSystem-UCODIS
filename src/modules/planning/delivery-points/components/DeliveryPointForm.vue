<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
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
    active: true
  }),
  required: ['name', 'customerNo', 'latitude', 'longitude'],
  labelOf: (field) => t(`planning.deliveryPoints.form.${field}`)
})

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
        <BaseFormField
          field="customerNo"
          :label="t('planning.deliveryPoints.form.customerNo')"
          :required="isRequired('customerNo')"
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
          <FormInput v-model="draft.address" :maxlength="160" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryPoints.form.city')">
          <FormInput v-model="draft.city" :maxlength="80" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="latitude"
          :label="t('planning.deliveryPoints.form.latitude')"
          :required="isRequired('latitude')"
        >
          <FormInput
            v-model="draft.latitude"
            type="number"
            :min="-90"
            :max="90"
            :disabled="disabled"
            :invalid="hasValidationError('latitude')"
          />
        </BaseFormField>
        <BaseFormField
          field="longitude"
          :label="t('planning.deliveryPoints.form.longitude')"
          :required="isRequired('longitude')"
        >
          <FormInput
            v-model="draft.longitude"
            type="number"
            :min="-180"
            :max="180"
            :disabled="disabled"
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
      :disabled="disabled"
    />

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
