<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { checkIssues, checkPointService, type CheckResult } from '@/modules/fleet/check-points'
import { nowIsoDateTime } from '@/utils/date'
import { formatDateTime } from '@/utils/format'
import type { ChecklistStage, RoadChecklistApi } from '../types/roadChecklist.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<RoadChecklistApi>
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

const signatureText = computed(() =>
  props.initialData.signedAt
    ? t('fleet.roadChecklists.signedBy', {
        name: props.initialData.signedBy || props.initialData.driverName || '',
        date: formatDateTime(props.initialData.signedAt)
      })
    : t('fleet.roadChecklists.unsigned')
)

const syncText = computed(() => {
  if (!props.initialData.syncedAt) return ''
  const date = formatDateTime(props.initialData.syncedAt)
  return props.initialData.capturedOffline
    ? t('fleet.roadChecklists.syncedOffline', { date })
    : t('fleet.roadChecklists.syncedOnline', { date })
})

const { draft, isRequired, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    tripNo: '',
    stage: 'departure' as ChecklistStage,
    takenAt: nowIsoDateTime().slice(0, 16),
    results: [] as CheckResult[]
  }),
  required: ['tripNo', 'stage', 'takenAt'],
  labelOf: (field) => t(`fleet.roadChecklists.form.${field}`),
  validate: (values) =>
    checkIssues(values.results).map(
      (issue): FormValidationError => ({
        fieldKey: 'results',
        label: t(`fleet.checkPoints.issue.${issue}`)
      })
    )
})

/** A new reading starts from the points active today; a saved one shows the points as checked. */
async function loadPoints() {
  const page = await checkPointService.getAll({
    pageSize: 200,
    sortBy: 'sortOrder',
    filters: [
      { field: 'scope', valueType: 'string', value: 'vehicle' },
      { field: 'active', valueType: 'boolean', value: true }
    ]
  })
  draft.results = page.data.items.map((point) => ({
    pointNo: point.no,
    label: point.label,
    blocking: point.blocking,
    result: null,
    comment: ''
  }))
}

onMounted(() => {
  if (props.isNew) void loadPoints()
})

const expandedSections = ref({ general: true, results: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { tripNo: 'general', stage: 'general', takenAt: 'general', results: 'results' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.roadChecklists.form.general')"
      :summary="[initialData.vehiclePlate, initialData.driverName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="tripNo"
          :label="t('fleet.roadChecklists.form.tripNo')"
          :required="isRequired('tripNo')"
        >
          <ReferenceLookup
            v-model="draft.tripNo"
            reference-key="openTrips"
            :modal-title="t('fleet.roadChecklists.form.tripNo')"
            detail-path="/fleet/trips"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('tripNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="stage"
          :label="t('fleet.roadChecklists.form.stage')"
          :required="isRequired('stage')"
        >
          <OptionsSelect
            :model-value="draft.stage"
            options-key="checklistStage"
            :disabled="disabled || !isNew"
            @update:model-value="draft.stage = String($event) as ChecklistStage"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="takenAt"
          :label="t('fleet.roadChecklists.form.takenAt')"
          :required="isRequired('takenAt')"
        >
          <FormInput
            v-model="draft.takenAt"
            type="datetime-local"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('takenAt')"
          />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.roadChecklists.form.takenBy')">
          <FormInput :model-value="initialData.createdBy" disabled />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.roadChecklists.form.signature')">
          <FormInput :model-value="signatureText" disabled />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.roadChecklists.form.sync')">
          <FormInput :model-value="syncText" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.results"
      :title="t('fleet.roadChecklists.form.results')"
      :summary="[
        initialData.anomalyCount
          ? t('fleet.roadChecklists.anomalies', initialData.anomalyCount)
          : ''
      ]"
    >
      <div class="xl:col-span-2 min-w-0">
        <p v-if="isNew" class="text-xs text-muted-foreground mb-2">
          {{ t('fleet.roadChecklists.form.resultsHint') }}
        </p>
        <CheckResultsEditor
          :results="draft.results"
          :disabled="disabled || !isNew"
          @update:results="draft.results = $event"
        />
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
