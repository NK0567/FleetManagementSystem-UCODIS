<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { vehicleService } from '@/modules/fleet/vehicles'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { TripApi } from '../types/trip.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TripApi>
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
    routeTemplateNo: '',
    plannedDeparture: '',
    vehicleNo: '',
    trailerNo: null as string | null,
    driverNo: ''
  }),
  createOnly: ['routeTemplateNo'],
  required: ['routeTemplateNo', 'plannedDeparture', 'vehicleNo', 'driverNo'],
  labelOf: (field) => t(`fleet.trips.form.${field}`)
})

/** On a new trip, the vehicle proposes its coupled trailer and its assigned driver. */
watch(
  () => (props.isNew ? draft.vehicleNo : ''),
  async (vehicleNo) => {
    if (!vehicleNo) return
    const vehicle = await vehicleService.getById(vehicleNo).catch(() => null)
    if (!vehicle) return
    if (!draft.trailerNo && vehicle.coupledVehicleNo) draft.trailerNo = vehicle.coupledVehicleNo
    if (!draft.driverNo && vehicle.driverNo) draft.driverNo = vehicle.driverNo
  }
)

/** The browser input works in minutes: the seconds of the stored value are dropped. */
const departureInput = computed({
  get: () => draft.plannedDeparture.slice(0, 16),
  set: (value: string) => {
    draft.plannedDeparture = value
  }
})

const expandedSections = ref({ plan: true, execution: true, stops: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    routeTemplateNo: 'plan',
    plannedDeparture: 'plan',
    vehicleNo: 'plan',
    driverNo: 'plan'
  },
  fieldValues: () => ({ ...draft })
})

const kmOf = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : `${formatNumber(value, 0)} km`

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.plan"
      :title="t('fleet.trips.form.plan')"
      :summary="[initialData.routeName, initialData.vehiclePlate, initialData.driverName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="routeTemplateNo"
          :label="t('fleet.trips.form.routeTemplateNo')"
          :required="isNew"
        >
          <ReferenceLookup
            v-model="draft.routeTemplateNo"
            reference-key="routeTemplates"
            :modal-title="t('fleet.trips.form.routeTemplateNo')"
            detail-path="/fleet/route-templates"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('routeTemplateNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="plannedDeparture"
          :label="t('fleet.trips.form.plannedDeparture')"
          :required="isRequired('plannedDeparture')"
        >
          <FormInput
            v-model="departureInput"
            type="datetime-local"
            :disabled="disabled"
            :invalid="hasValidationError('plannedDeparture')"
          />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.trips.form.plannedArrival')">
          <FormInput :model-value="formatDateTime(initialData.plannedArrival)" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.trips.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.trips.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.trips.form.trailerNo')">
          <ReferenceLookup
            v-model="draft.trailerNo"
            reference-key="trailers"
            :modal-title="t('fleet.trips.form.trailerNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField
          field="driverNo"
          :label="t('fleet.trips.form.driverNo')"
          :required="isRequired('driverNo')"
        >
          <ReferenceLookup
            v-model="draft.driverNo"
            reference-key="drivers"
            :modal-title="t('fleet.trips.form.driverNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
            :invalid="hasValidationError('driverNo')"
          />
          <p v-if="isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.trips.form.proposalHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <template v-if="!isNew">
      <FormSection
        v-model:open="expandedSections.execution"
        :title="t('fleet.trips.form.execution')"
        :summary="[]"
      >
        <div class="space-y-3 min-w-0">
          <BaseFormField
            v-if="initialData.authorizationRequired"
            :label="t('fleet.trips.form.authorization')"
          >
            <router-link
              v-if="initialData.authorizationNo"
              :to="{
                path: '/fleet/departure-authorizations',
                query: { no: initialData.authorizationNo, cardMode: 'view' }
              }"
              class="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              {{ initialData.authorizationNo }}
              <DepartureDecisionPill
                v-if="initialData.authorizationDecision"
                :decision="initialData.authorizationDecision"
              />
            </router-link>
            <p v-else class="text-sm text-muted-foreground">
              {{ t('fleet.trips.form.noAuthorization') }}
            </p>
          </BaseFormField>
          <BaseFormField :label="t('fleet.trips.form.actualDeparture')">
            <FormInput :model-value="formatDateTime(initialData.actualDeparture)" disabled />
          </BaseFormField>
          <BaseFormField :label="t('fleet.trips.form.actualArrival')">
            <FormInput :model-value="formatDateTime(initialData.actualArrival)" disabled />
          </BaseFormField>
          <BaseFormField
            v-if="initialData.arrivalDelayMin !== null && initialData.arrivalDelayMin !== undefined"
            :label="t('fleet.trips.form.arrivalDelay')"
          >
            <FormInput
              :model-value="t('fleet.trips.form.minutes', { minutes: initialData.arrivalDelayMin })"
              disabled
            />
          </BaseFormField>
          <BaseFormField
            v-if="initialData.cancelReason"
            :label="t('fleet.trips.form.cancelReason')"
          >
            <p class="text-sm text-card-foreground">{{ initialData.cancelReason }}</p>
          </BaseFormField>
        </div>
        <div class="space-y-3 min-w-0">
          <BaseFormField :label="t('fleet.trips.form.odometers')">
            <FormInput
              :model-value="`${kmOf(initialData.startOdometerKm)} → ${kmOf(initialData.endOdometerKm)}`"
              disabled
            />
          </BaseFormField>
          <BaseFormField :label="t('fleet.trips.form.distance')">
            <FormInput
              :model-value="`${kmOf(initialData.distanceKm)} / ${kmOf(initialData.referenceKm)}`"
              disabled
            />
          </BaseFormField>
          <BaseFormField
            v-if="initialData.kmGapPercent !== null && initialData.kmGapPercent !== undefined"
            :label="t('fleet.trips.form.kmGap')"
          >
            <FormInput :model-value="`${formatNumber(initialData.kmGapPercent, 1)} %`" disabled />
          </BaseFormField>
        </div>
      </FormSection>

      <FormSection
        v-model:open="expandedSections.stops"
        :title="t('fleet.trips.form.stops')"
        :summary="[
          t('fleet.trips.form.stopProgress', {
            passed: initialData.passedStopCount ?? 0,
            total: initialData.stopCount ?? 0
          })
        ]"
      >
        <div class="xl:col-span-2 min-w-0">
          <TripStopsPanel v-if="initialData.stops" :stops="initialData.stops" />
        </div>
      </FormSection>

      <AuditFormSection v-model:open="expandedSections.audit" :record="initialData" />
    </template>
  </div>
</template>
