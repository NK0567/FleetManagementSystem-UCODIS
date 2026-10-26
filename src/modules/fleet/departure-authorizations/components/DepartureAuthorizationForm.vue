<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { checkIssues, checkPointService, type CheckResult } from '@/modules/fleet/check-points'
import { formatDateTime } from '@/utils/format'
import type { DepartureAuthorizationApi } from '../types/departureAuthorization.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DepartureAuthorizationApi>
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
    driverChecks: [] as CheckResult[]
  }),
  createOnly: ['tripNo'],
  required: ['tripNo'],
  labelOf: (field) => t(`fleet.departureAuthorizations.form.${field}`),
  validate: (values) =>
    checkIssues(values.driverChecks).map(
      (issue): FormValidationError => ({
        fieldKey: 'driverChecks',
        label: t(`fleet.checkPoints.issue.${issue}`)
      })
    )
})

async function loadDriverPoints() {
  const page = await checkPointService.getAll({
    pageSize: 100,
    sortBy: 'sortOrder',
    filters: [
      { field: 'scope', valueType: 'string', value: 'driver' },
      { field: 'active', valueType: 'boolean', value: true }
    ]
  })
  draft.driverChecks = page.data.items.map((point) => ({
    pointNo: point.no,
    label: point.label,
    blocking: point.blocking,
    result: null,
    comment: ''
  }))
}

onMounted(() => {
  if (props.isNew) void loadDriverPoints()
})

const expandedSections = ref({ general: true, driverChecks: true, checks: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { tripNo: 'general', driverChecks: 'driverChecks' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.departureAuthorizations.form.general')"
      :summary="[initialData.vehiclePlate, initialData.driverName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="tripNo"
          :label="t('fleet.departureAuthorizations.form.tripNo')"
          :required="isRequired('tripNo')"
        >
          <ReferenceLookup
            v-model="draft.tripNo"
            reference-key="plannedTrips"
            :modal-title="t('fleet.departureAuthorizations.form.tripNo')"
            detail-path="/fleet/trips"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('tripNo')"
          />
        </BaseFormField>
        <BaseFormField
          v-if="!isNew"
          :label="t('fleet.departureAuthorizations.form.plannedDeparture')"
        >
          <FormInput :model-value="formatDateTime(initialData.plannedDeparture ?? null)" disabled />
        </BaseFormField>
      </div>
      <div v-if="!isNew" class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.departureAuthorizations.form.vehicle')">
          <FormInput
            :model-value="
              initialData.trailerPlate
                ? `${initialData.vehiclePlate} + ${initialData.trailerPlate}`
                : initialData.vehiclePlate
            "
            disabled
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.departureAuthorizations.form.driver')">
          <FormInput :model-value="initialData.driverName" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.driverChecks"
      :title="t('fleet.departureAuthorizations.form.driverChecks')"
      :summary="[]"
    >
      <div class="xl:col-span-2 min-w-0">
        <CheckResultsEditor
          :results="draft.driverChecks"
          :disabled="disabled"
          :allow-not-applicable="false"
          @update:results="draft.driverChecks = $event"
        />
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.checks"
      :title="
        initialData.decision === 'pending'
          ? t('fleet.departureAuthorizations.form.liveChecks')
          : t('fleet.departureAuthorizations.form.frozenChecks')
      "
      :summary="[]"
    >
      <div class="xl:col-span-2 min-w-0 space-y-3">
        <ChecksPanel :checks="initialData.checks ?? []" options-key="departureCheck" />
        <p v-if="initialData.decidedBy" class="text-sm text-muted-foreground">
          {{
            t('fleet.departureAuthorizations.decidedBy', {
              user: initialData.decidedBy,
              date: formatDateTime(initialData.decidedAt ?? null)
            })
          }}
        </p>
        <p v-if="initialData.refusalReason" class="text-sm text-card-foreground">
          {{ t('fleet.departureAuthorizations.form.refusalReason') }} :
          {{ initialData.refusalReason }}
        </p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
