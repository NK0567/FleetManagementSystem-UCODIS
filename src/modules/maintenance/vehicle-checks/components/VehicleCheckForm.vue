<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import {
  vehicleCheckPointService,
  type VehicleCheckPointApi
} from '@/modules/maintenance/vehicle-check-points'
import { nowIsoDateTime } from '@/utils/date'
import type { CheckResult, VehicleCheckMoment } from '../domain/vehicleCheck'
import type { VehicleCheckApi } from '../types/vehicleCheck.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<VehicleCheckApi>
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
    moment: 'before_loading' as VehicleCheckMoment,
    vehicleNo: '',
    checkedAt: nowIsoDateTime().slice(0, 16),
    odometerKm: null as number | null,
    comment: '',
    results: {} as Record<string, CheckResult>
  }),
  required: ['moment', 'vehicleNo', 'checkedAt'],
  labelOf: (field) => t(`maintenance.vehicleChecks.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (props.isNew && momentPoints.value.some((point) => !values.results[point.no])) {
      errors.push({ fieldKey: 'results', label: t('maintenance.vehicleChecks.results.toAnswer') })
    }
    return errors
  }
})

const checkPoints = ref<VehicleCheckPointApi[]>([])
onMounted(async () => {
  if (!props.isNew) return
  checkPoints.value = (await vehicleCheckPointService.getAll({ pageSize: 500 })).data.items
})

/** New checks answer today's active points; a recorded check shows the points as they were. */
const momentPoints = computed(() =>
  props.isNew
    ? checkPoints.value
        .filter((point) => point.active && point.moment === draft.moment)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((point) => ({ no: point.no, label: point.label, blocking: point.blocking }))
    : (props.initialData.results ?? []).map((point) => ({
        no: point.pointNo,
        label: point.label,
        blocking: point.blocking
      }))
)

const recordedAnswers = computed<Record<string, CheckResult>>(() =>
  Object.fromEntries(
    (props.initialData.results ?? []).map((point) => [point.pointNo, point.result])
  )
)

watch(
  () => draft.moment,
  () => {
    if (props.isNew) draft.results = {}
  }
)

const expandedSections = ref({ general: true, results: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    moment: 'general',
    vehicleNo: 'general',
    checkedAt: 'general',
    results: 'results'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.vehicleChecks.form.general')"
      :summary="[initialData.vehiclePlate ?? '']"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="moment"
          :label="t('maintenance.vehicleChecks.form.moment')"
          :required="isRequired('moment')"
        >
          <OptionsSelect
            :model-value="draft.moment"
            options-key="vehicleCheckMoment"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('moment')"
            @update:model-value="draft.moment = String($event) as VehicleCheckMoment"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('maintenance.vehicleChecks.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('maintenance.vehicleChecks.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="checkedAt"
          :label="t('maintenance.vehicleChecks.form.checkedAt')"
          :required="isRequired('checkedAt')"
        >
          <FormInput
            v-model="draft.checkedAt"
            type="datetime-local"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('checkedAt')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.vehicleChecks.form.odometerKm')">
          <FormInput v-model="draft.odometerKm" type="number" :disabled="disabled || !isNew" />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.vehicleChecks.form.comment')">
          <FormTextarea v-model="draft.comment" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.results"
      :title="t('maintenance.vehicleChecks.form.results')"
      :summary="[t('maintenance.vehicleChecks.results.count', momentPoints.length)]"
    >
      <div class="xl:col-span-2 min-w-0" data-field="results">
        <VehicleCheckResults
          v-if="isNew"
          v-model="draft.results"
          :points="momentPoints"
          :disabled="disabled"
        />
        <VehicleCheckResults
          v-else
          :model-value="recordedAnswers"
          :points="momentPoints"
          disabled
        />
        <p v-if="initialData.workOrderNo" class="text-sm mt-2">
          {{ t('maintenance.vehicleChecks.results.orderOpened') }}
          <RouterLink
            :to="{
              path: '/maintenance/work-orders',
              query: { no: initialData.workOrderNo, cardMode: 'view' }
            }"
            class="text-primary hover:underline"
          >
            {{ initialData.workOrderNo }}
          </RouterLink>
        </p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
