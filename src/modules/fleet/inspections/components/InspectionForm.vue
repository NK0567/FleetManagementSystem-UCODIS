<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatDateTime } from '@/utils/format'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import { gridResult, inspectionGridIssues, type InspectionItemResult } from '../domain/inspection'
import { inspectionService } from '../services/inspectionService'
import type { InspectionApi } from '../types/inspection.types'
import InspectionGridEditor from './InspectionGridEditor.vue'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<InspectionApi>
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
    vehicleNo: '',
    inspectedOn: '',
    center: '',
    findings: '',
    items: [] as InspectionItemResult[],
    inspector: '',
    signed: false
  }),
  createOnly: ['vehicleNo', 'inspectedOn', 'items', 'inspector', 'signed'],
  required: computed(() =>
    props.isNew
      ? (['vehicleNo', 'inspectedOn', 'center', 'items', 'inspector'] as const)
      : (['center'] as const)
  ),
  labelOf: (field) => t(`fleet.inspections.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (!props.isNew) return errors
    for (const issue of inspectionGridIssues(values.items)) {
      errors.push({ fieldKey: 'items', label: t(`fleet.inspections.grid.issue.${issue}`) })
    }
    if (!values.signed) {
      errors.push({ fieldKey: 'signed', label: t('fleet.inspections.form.signatureRequired') })
    }
    return errors
  }
})

/** A new inspection follows the grid of the vehicle: the tank items only on a vehicle with one. */
const loadingGrid = ref(false)
watch(
  () => draft.vehicleNo,
  async (vehicleNo) => {
    if (!props.isNew) return
    draft.items = []
    if (!vehicleNo) return
    loadingGrid.value = true
    try {
      const grid = await inspectionService.grid(vehicleNo)
      draft.items = grid.map((item) => ({ ...item, verdict: null, comment: '' }))
    } finally {
      loadingGrid.value = false
    }
  }
)

const result = computed(() =>
  props.isNew ? gridResult(draft.items) : (props.initialData.result ?? 'conforming')
)
const shownItems = computed(() => (props.isNew ? draft.items : (props.initialData.items ?? [])))

const expandedSections = ref({
  general: true,
  grid: true,
  signature: true,
  recheck: true,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    vehicleNo: 'general',
    inspectedOn: 'general',
    center: 'general',
    items: 'grid',
    inspector: 'signature',
    signed: 'signature'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.inspections.form.general')"
      :summary="[initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.inspections.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('fleet.inspections.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="inspectedOn"
          :label="t('fleet.inspections.form.inspectedOn')"
          :required="isRequired('inspectedOn')"
        >
          <DateFormInput
            v-model="draft.inspectedOn"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('inspectedOn')"
          />
        </BaseFormField>
        <BaseFormField
          field="center"
          :label="t('fleet.inspections.form.center')"
          :required="isRequired('center')"
        >
          <FormInput
            v-model="draft.center"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('center')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.inspections.form.result')">
          <FormInput
            :model-value="optionsStore.getOptionLabel('inspectionResult', result)"
            disabled
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.inspections.form.resultHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.inspections.form.findings')">
          <FormTextarea v-model="draft.findings" :rows="3" :disabled="disabled" />
          <p v-if="isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.inspections.form.findingsHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.grid"
      :title="t('fleet.inspections.form.items')"
      :summary="[t('fleet.inspections.grid.count', shownItems.length)]"
    >
      <div class="xl:col-span-2 min-w-0" data-field="items">
        <p v-if="isNew && !draft.vehicleNo" class="text-sm text-muted-foreground">
          {{ t('fleet.inspections.grid.pickVehicle') }}
        </p>
        <p v-else-if="loadingGrid" class="text-sm text-muted-foreground">
          {{ t('fleet.inspections.grid.loading') }}
        </p>
        <InspectionGridEditor v-else-if="isNew" v-model="draft.items" :disabled="disabled" />
        <p v-else-if="!shownItems.length" class="text-sm text-muted-foreground">
          {{ t('fleet.inspections.grid.legacy') }}
        </p>
        <InspectionGridEditor v-else :model-value="shownItems" disabled />
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.signature"
      :title="t('fleet.inspections.form.signature')"
      :summary="[isNew ? draft.inspector : (initialData.inspector ?? '')]"
    >
      <template v-if="isNew">
        <div class="space-y-3 min-w-0">
          <BaseFormField
            field="inspector"
            :label="t('fleet.inspections.form.inspector')"
            :required="isRequired('inspector')"
          >
            <FormInput
              v-model="draft.inspector"
              :maxlength="80"
              :disabled="disabled"
              :invalid="hasValidationError('inspector')"
            />
          </BaseFormField>
        </div>
        <div class="space-y-3 min-w-0" data-field="signed">
          <label class="flex items-start gap-2 text-sm">
            <input v-model="draft.signed" type="checkbox" class="mt-1" :disabled="disabled" />
            <span>{{ t('fleet.inspections.form.signedLabel') }}</span>
          </label>
          <p class="text-xs text-muted-foreground">
            {{ t('fleet.inspections.form.signedHint') }}
          </p>
        </div>
      </template>
      <p v-else-if="initialData.signedAt" class="text-sm xl:col-span-2">
        {{
          t('fleet.inspections.form.signedBy', {
            inspector: initialData.inspector,
            user: initialData.signedBy,
            date: formatDateTime(initialData.signedAt)
          })
        }}
      </p>
      <p v-else class="text-sm text-muted-foreground xl:col-span-2">
        {{ t('fleet.inspections.form.notSigned') }}
      </p>
    </FormSection>

    <FormSection
      v-if="!isNew && initialData.result === 'non_conforming'"
      v-model:open="expandedSections.recheck"
      :title="t('fleet.inspections.form.recheck')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.inspections.form.recheckDueOn')">
          <FormInput :model-value="formatDate(initialData.recheckDueOn ?? null)" disabled />
          <p v-if="initialData.recheckItemNos?.length" class="text-xs text-muted-foreground mt-1">
            {{
              t('fleet.inspections.form.recheckItems', {
                items: initialData.recheckItemNos.join(', ')
              })
            }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.inspections.form.recheckDoneOn')">
          <FormInput
            :model-value="
              initialData.recheckDoneOn
                ? formatDate(initialData.recheckDoneOn)
                : t('fleet.inspections.form.recheckAwaited')
            "
            disabled
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
