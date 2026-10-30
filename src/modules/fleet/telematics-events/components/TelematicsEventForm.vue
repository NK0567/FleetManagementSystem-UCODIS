<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MapMarker } from '@/components/shared/MapView.vue'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import type { TelematicsEventApi, TelematicsSource } from '../types/telematicsEvent.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TelematicsEventApi>
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
const optionsStore = useOptionsStore()

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    eventTypeNo: '',
    vehicleNo: '',
    occurredAt: '',
    source: 'box' as TelematicsSource,
    value: null as number | null,
    latitude: null as number | null,
    longitude: null as number | null,
    detail: ''
  }),
  required: ['eventTypeNo', 'vehicleNo', 'occurredAt', 'source'],
  labelOf: (field) => t(`fleet.telematicsEvents.form.${field}`)
})

const measure = computed(() => {
  const { value, unit } = props.initialData
  if (value == null) return ''
  return unit ? `${value} ${optionsStore.getOptionLabel('telematicsUnit', unit)}` : String(value)
})

const markers = computed<MapMarker[]>(() =>
  props.initialData.latitude != null && props.initialData.longitude != null
    ? [
        {
          id: props.initialData.no ?? 'event',
          latitude: props.initialData.latitude,
          longitude: props.initialData.longitude,
          label: props.initialData.eventTypeName ?? '',
          sublabel: props.initialData.vehiclePlate
        }
      ]
    : []
)

const expandedSections = ref({
  general: true,
  handling: props.initialData.status !== 'new',
  map: true,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    eventTypeNo: 'general',
    vehicleNo: 'general',
    occurredAt: 'general',
    source: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.telematicsEvents.form.general')"
      :summary="[initialData.eventTypeName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="eventTypeNo"
          :label="t('fleet.telematicsEvents.form.eventTypeNo')"
          :required="isRequired('eventTypeNo')"
        >
          <ReferenceLookup
            v-model="draft.eventTypeNo"
            reference-key="telematicsEventTypes"
            :modal-title="t('fleet.telematicsEvents.form.eventTypeNo')"
            detail-path="/fleet/telematics-event-types"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('eventTypeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.telematicsEvents.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.telematicsEvents.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="occurredAt"
          :label="t('fleet.telematicsEvents.form.occurredAt')"
          :required="isRequired('occurredAt')"
        >
          <FormInput
            v-model="draft.occurredAt"
            type="datetime-local"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('occurredAt')"
          />
        </BaseFormField>
        <BaseFormField
          field="source"
          :label="t('fleet.telematicsEvents.form.source')"
          :required="isRequired('source')"
        >
          <OptionsSelect
            :model-value="draft.source"
            options-key="telematicsSource"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('source')"
            @update:model-value="draft.source = String($event) as TelematicsSource"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <template v-if="!isNew">
          <BaseFormField :label="t('fleet.telematicsEvents.form.driverName')">
            <FormInput :model-value="initialData.driverName ?? ''" disabled />
          </BaseFormField>
          <BaseFormField :label="t('fleet.telematicsEvents.form.tripNo')">
            <FormInput :model-value="initialData.tripNo ?? ''" disabled />
          </BaseFormField>
          <BaseFormField :label="t('fleet.telematicsEvents.form.measure')">
            <FormInput :model-value="measure" disabled />
          </BaseFormField>
        </template>
        <template v-else>
          <BaseFormField :label="t('fleet.telematicsEvents.form.value')">
            <FormInput v-model="draft.value" type="number" :min="0" step="0.01" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.telematicsEvents.form.latitude')">
            <FormInput v-model="draft.latitude" type="number" :min="-90" :max="90" step="0.0001" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.telematicsEvents.form.longitude')">
            <FormInput
              v-model="draft.longitude"
              type="number"
              :min="-180"
              :max="180"
              step="0.0001"
            />
          </BaseFormField>
        </template>
        <BaseFormField :label="t('fleet.telematicsEvents.form.detail')">
          <FormTextarea v-model="draft.detail" :rows="3" :disabled="disabled || !isNew" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.handling"
      :title="t('fleet.telematicsEvents.form.handling')"
      :summary="[optionsStore.getOptionLabel('telematicsEventStatus', initialData.status)]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.telematicsEvents.form.status')">
          <p class="text-sm text-card-foreground">
            {{ optionsStore.getOptionLabel('telematicsEventStatus', initialData.status) }}
          </p>
        </BaseFormField>
        <BaseFormField
          v-if="initialData.acknowledgedAt"
          :label="t('fleet.telematicsEvents.form.acknowledged')"
        >
          <p v-if="initialData.acknowledgementComment" class="text-sm text-card-foreground">
            {{ initialData.acknowledgementComment }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ initialData.acknowledgedBy }} · {{ formatDateTime(initialData.acknowledgedAt) }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          v-if="initialData.infractionNo"
          :label="t('fleet.telematicsEvents.form.infractionNo')"
        >
          <RouterLink
            :to="{
              path: '/fleet/infractions',
              query: { no: initialData.infractionNo, cardMode: 'view' }
            }"
            class="text-sm text-primary hover:underline"
          >
            {{ initialData.infractionNo }}
          </RouterLink>
        </BaseFormField>
        <p
          v-else-if="initialData.status === 'new' && !initialData.infractionTypeNo"
          class="text-xs text-muted-foreground"
        >
          {{ t('fleet.telematicsEvents.form.noInfractionType') }}
        </p>
      </div>
    </FormSection>

    <FormSection
      v-if="markers.length"
      v-model:open="expandedSections.map"
      :title="t('fleet.telematicsEvents.form.map')"
      :summary="[initialData.siteName]"
    >
      <div class="xl:col-span-2 min-w-0">
        <MapView :markers="markers" height="260px" />
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
