<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MapMarker } from '@/components/shared/MapView.vue'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import type { RouteDeviationApi } from '../types/routeDeviation.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<RouteDeviationApi>
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
    tripNo: '',
    deviationTypeNo: '',
    detectedAt: '',
    location: '',
    measure: null as number | null
  }),
  required: ['tripNo', 'deviationTypeNo', 'detectedAt'],
  labelOf: (field) => t(`fleet.routeDeviations.form.${field}`)
})

const optionsStore = useOptionsStore()

const markers = computed<MapMarker[]>(() =>
  props.initialData.latitude != null && props.initialData.longitude != null
    ? [
        {
          id: props.initialData.no ?? 'deviation',
          latitude: props.initialData.latitude,
          longitude: props.initialData.longitude,
          label: props.initialData.deviationTypeName ?? '',
          sublabel: props.initialData.location
        }
      ]
    : []
)

const expandedSections = ref({ general: true, handling: true, map: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { tripNo: 'general', deviationTypeNo: 'general', detectedAt: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.routeDeviations.form.general')"
      :summary="[initialData.deviationTypeName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="tripNo"
          :label="t('fleet.routeDeviations.form.tripNo')"
          :required="isRequired('tripNo')"
        >
          <ReferenceLookup
            v-model="draft.tripNo"
            reference-key="openTrips"
            :modal-title="t('fleet.routeDeviations.form.tripNo')"
            detail-path="/fleet/trips"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('tripNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="deviationTypeNo"
          :label="t('fleet.routeDeviations.form.deviationTypeNo')"
          :required="isRequired('deviationTypeNo')"
        >
          <ReferenceLookup
            v-model="draft.deviationTypeNo"
            reference-key="deviationTypes"
            :modal-title="t('fleet.routeDeviations.form.deviationTypeNo')"
            detail-path="/fleet/deviation-types"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('deviationTypeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="detectedAt"
          :label="t('fleet.routeDeviations.form.detectedAt')"
          :required="isRequired('detectedAt')"
        >
          <FormInput
            v-model="draft.detectedAt"
            type="datetime-local"
            :disabled="disabled"
            :invalid="hasValidationError('detectedAt')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.routeDeviations.form.location')">
          <FormInput v-model="draft.location" :maxlength="120" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.routeDeviations.form.measure')">
          <FormInput v-model="draft.measure" type="number" :min="0" :disabled="disabled" />
          <p v-if="initialData.unit" class="text-xs text-muted-foreground mt-1">
            {{ optionsStore.getOptionLabel('deviationUnit', initialData.unit) }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.handling"
      :title="t('fleet.routeDeviations.form.handling')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.routeDeviations.form.justification')">
          <template v-if="initialData.justification">
            <p class="text-sm text-card-foreground">{{ initialData.justification }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ initialData.justifiedBy }} · {{ formatDateTime(initialData.justifiedAt ?? null) }}
            </p>
          </template>
          <p v-else class="text-sm text-muted-foreground">
            {{
              t('fleet.routeDeviations.form.justifyBefore', {
                date: formatDateTime(initialData.justificationDeadline ?? null)
              })
            }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.routeDeviations.form.qualification')">
          <template v-if="initialData.qualification">
            <p class="text-sm text-card-foreground">
              {{ optionsStore.getOptionLabel('deviationNature', initialData.qualification.nature) }}
              ·
              {{
                optionsStore.getOptionLabel('deviationDecision', initialData.qualification.decision)
              }}
            </p>
            <p class="text-sm text-card-foreground mt-1">{{ initialData.qualification.reason }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ initialData.qualification.by }} ·
              {{ formatDateTime(initialData.qualification.at) }}
            </p>
          </template>
          <p v-else class="text-sm text-muted-foreground">
            {{ t('fleet.routeDeviations.form.notQualified') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="markers.length"
      v-model:open="expandedSections.map"
      :title="t('fleet.routeDeviations.form.map')"
      :summary="[]"
    >
      <div class="xl:col-span-2 min-w-0">
        <MapView :markers="markers" height="260px" />
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
