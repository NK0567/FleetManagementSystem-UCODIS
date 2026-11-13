<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type {
  DriverReportKind,
  DriverReportSeverity,
  DriverReportUrgency,
  DriverReportChannel,
  DriverReportActionKind,
  DriverReportStatus
} from '../domain/driverReport'
import type { DriverReportApi } from '../types/driverReport.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DriverReportApi>
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
    employeeNo: '',
    subject: '',
    kind: 'technical' as DriverReportKind,
    severity: 'minor' as DriverReportSeverity,
    urgency: 'observation' as DriverReportUrgency,
    channel: 'app' as DriverReportChannel,
    occurredOn: null as string | null,
    reportedOn: null as string | null,
    description: '',
    ownerName: '',
    actionKind: '' as DriverReportActionKind | '',
    actionText: '',
    dueOn: null as string | null,
    status: 'open' as DriverReportStatus
  }),
  required: [
    'employeeNo',
    'subject',
    'kind',
    'severity',
    'urgency',
    'channel',
    'occurredOn',
    'reportedOn'
  ],
  labelOf: (field) => t(`fleet.driverReports.form.${field}`)
})

const expandedSections = ref({ general: true, dates: true, action: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    employeeNo: 'general',
    subject: 'general',
    kind: 'general',
    severity: 'general',
    urgency: 'general',
    channel: 'general',
    occurredOn: 'dates',
    reportedOn: 'dates'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.driverReports.form.section.general')"
      :summary="[draft.subject]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="employeeNo"
          :label="t('fleet.driverReports.form.employeeNo')"
          :required="isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="drivers"
            :modal-title="t('fleet.driverReports.form.employeeNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('employeeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="subject"
          :label="t('fleet.driverReports.form.subject')"
          :required="isRequired('subject')"
        >
          <FormInput
            v-model="draft.subject"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('subject')"
          />
        </BaseFormField>
        <BaseFormField
          field="kind"
          :label="t('fleet.driverReports.form.kind')"
          :required="isRequired('kind')"
        >
          <OptionsSelect
            :model-value="draft.kind"
            options-key="driverReportKind"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('kind')"
            @update:model-value="draft.kind = String($event) as DriverReportKind"
          />
        </BaseFormField>
        <BaseFormField field="description" :label="t('fleet.driverReports.form.description')">
          <FormTextarea
            v-model="draft.description"
            :rows="4"
            :maxlength="500"
            :disabled="disabled"
            :invalid="hasValidationError('description')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="severity"
          :label="t('fleet.driverReports.form.severity')"
          :required="isRequired('severity')"
        >
          <OptionsSelect
            :model-value="draft.severity"
            options-key="driverReportSeverity"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('severity')"
            @update:model-value="draft.severity = String($event) as DriverReportSeverity"
          />
        </BaseFormField>
        <BaseFormField
          field="urgency"
          :label="t('fleet.driverReports.form.urgency')"
          :required="isRequired('urgency')"
        >
          <OptionsSelect
            :model-value="draft.urgency"
            options-key="driverReportUrgency"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('urgency')"
            @update:model-value="draft.urgency = String($event) as DriverReportUrgency"
          />
        </BaseFormField>
        <BaseFormField
          field="channel"
          :label="t('fleet.driverReports.form.channel')"
          :required="isRequired('channel')"
        >
          <OptionsSelect
            :model-value="draft.channel"
            options-key="driverReportChannel"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('channel')"
            @update:model-value="draft.channel = String($event) as DriverReportChannel"
          />
        </BaseFormField>
      </div>
    </FormSection>
    <FormSection
      v-model:open="expandedSections.dates"
      :title="t('fleet.driverReports.form.section.dates')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="occurredOn"
          :label="t('fleet.driverReports.form.occurredOn')"
          :required="isRequired('occurredOn')"
        >
          <DateFormInput v-model="draft.occurredOn" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="reportedOn"
          :label="t('fleet.driverReports.form.reportedOn')"
          :required="isRequired('reportedOn')"
        >
          <DateFormInput v-model="draft.reportedOn" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="status" :label="t('fleet.driverReports.form.status')">
          <OptionsSelect
            :model-value="draft.status"
            options-key="driverReportStatus"
            :placeholder="t('common.notSpecified')"
            :hidden-values="isNew ? ['in_progress', 'closed'] : []"
            :disabled="disabled"
            :invalid="hasValidationError('status')"
            @update:model-value="draft.status = String($event) as DriverReportStatus"
          />
        </BaseFormField>
      </div>
    </FormSection>
    <FormSection
      v-model:open="expandedSections.action"
      :title="t('fleet.driverReports.form.section.action')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="ownerName" :label="t('fleet.driverReports.form.ownerName')">
          <FormInput
            v-model="draft.ownerName"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('ownerName')"
          />
        </BaseFormField>
        <BaseFormField field="actionKind" :label="t('fleet.driverReports.form.actionKind')">
          <OptionsSelect
            :model-value="draft.actionKind"
            options-key="driverReportActionKind"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            :invalid="hasValidationError('actionKind')"
            @update:model-value="draft.actionKind = String($event) as DriverReportActionKind"
          />
        </BaseFormField>
        <BaseFormField field="actionText" :label="t('fleet.driverReports.form.actionText')">
          <FormTextarea
            v-model="draft.actionText"
            :rows="3"
            :maxlength="500"
            :disabled="disabled"
            :invalid="hasValidationError('actionText')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="dueOn" :label="t('fleet.driverReports.form.dueOn')">
          <DateFormInput v-model="draft.dueOn" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
