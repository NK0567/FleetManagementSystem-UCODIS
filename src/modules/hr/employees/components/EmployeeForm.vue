<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { jobPositionService } from '@/modules/hr/job-positions'
import { isValidEmail } from '@/utils/email'
import { formatDate, formatDateTime } from '@/utils/format'
import type { EmployeeApi } from '../types/employee.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<EmployeeApi>
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
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    birthPlace: '',
    maritalStatus: '',
    idDocumentType: 'national_id',
    nationalId: '',
    jobPositionNo: '',
    orgUnitNo: '',
    categoryNo: '',
    siteCode: '',
    contractType: 'permanent',
    hireDate: '',
    phone: '',
    email: ''
  }),
  required: [
    'firstName',
    'lastName',
    'nationalId',
    'jobPositionNo',
    'orgUnitNo',
    'categoryNo',
    'siteCode',
    'contractType',
    'hireDate',
    'phone'
  ],
  labelOf: (field) => t(`hr.employees.form.${field}`),
  validate: (values) =>
    values.email && !isValidEmail(values.email)
      ? [{ fieldKey: 'email', label: t('hr.employees.form.invalidEmail') }]
      : []
})

/** On hiring, the position suggests its unit and category, as the old matching table did. */
watch(
  () => draft.jobPositionNo,
  async (no, previous) => {
    if (!props.isNew || !no || no === previous) return
    const position = await jobPositionService.getById(no)
    draft.categoryNo = position.defaultCategoryNo
    if (!draft.orgUnitNo) draft.orgUnitNo = position.orgUnitNo
  }
)

const setOption =
  (field: 'gender' | 'maritalStatus' | 'idDocumentType' | 'contractType') =>
  (value: string | number) => {
    draft[field] = String(value)
  }

const expandedSections = ref({
  identity: true,
  position: true,
  contact: true,
  situation: true,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    firstName: 'identity',
    lastName: 'identity',
    nationalId: 'identity',
    jobPositionNo: 'position',
    orgUnitNo: 'position',
    categoryNo: 'position',
    siteCode: 'position',
    contractType: 'position',
    hireDate: 'position',
    phone: 'contact',
    email: 'contact'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.identity"
      :title="t('hr.employees.form.identity')"
      :summary="[initialData.no, `${draft.firstName} ${draft.lastName}`.trim()]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField v-if="!isNew" :label="t('hr.employees.form.no')">
          <FormInput :model-value="initialData.no" disabled show-lock-icon />
        </BaseFormField>
        <BaseFormField
          field="firstName"
          :label="t('hr.employees.form.firstName')"
          :required="isRequired('firstName')"
        >
          <FormInput
            v-model="draft.firstName"
            :maxlength="50"
            :disabled="disabled"
            :invalid="hasValidationError('firstName')"
          />
        </BaseFormField>
        <BaseFormField
          field="lastName"
          :label="t('hr.employees.form.lastName')"
          :required="isRequired('lastName')"
        >
          <FormInput
            v-model="draft.lastName"
            :maxlength="50"
            :disabled="disabled"
            :invalid="hasValidationError('lastName')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.employees.form.gender')">
          <OptionsSelect
            :model-value="draft.gender"
            options-key="gender"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            @update:model-value="setOption('gender')($event)"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.employees.form.maritalStatus')">
          <OptionsSelect
            :model-value="draft.maritalStatus"
            options-key="maritalStatus"
            :placeholder="t('common.notSpecified')"
            :disabled="disabled"
            @update:model-value="setOption('maritalStatus')($event)"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.employees.form.birthDate')">
          <DateFormInput v-model="draft.birthDate" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('hr.employees.form.birthPlace')">
          <FormInput v-model="draft.birthPlace" :maxlength="80" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('hr.employees.form.idDocumentType')">
          <OptionsSelect
            :model-value="draft.idDocumentType"
            options-key="idDocumentType"
            :disabled="disabled"
            @update:model-value="setOption('idDocumentType')($event)"
          />
        </BaseFormField>
        <BaseFormField
          field="nationalId"
          :label="t('hr.employees.form.nationalId')"
          :required="isRequired('nationalId')"
        >
          <FormInput
            v-model="draft.nationalId"
            :maxlength="30"
            :disabled="disabled"
            :invalid="hasValidationError('nationalId')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.position"
      :title="t('hr.employees.form.position')"
      :summary="[initialData.jobPositionName, initialData.orgUnitName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="jobPositionNo"
          :label="t('hr.employees.form.jobPositionNo')"
          :required="isRequired('jobPositionNo')"
        >
          <ReferenceLookup
            v-model="draft.jobPositionNo"
            reference-key="jobPositions"
            :modal-title="t('hr.employees.form.jobPositionNo')"
            detail-path="/hr/job-positions"
            :disabled="disabled"
            :invalid="hasValidationError('jobPositionNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="orgUnitNo"
          :label="t('hr.employees.form.orgUnitNo')"
          :required="isRequired('orgUnitNo')"
        >
          <ReferenceLookup
            v-model="draft.orgUnitNo"
            reference-key="orgUnits"
            :modal-title="t('hr.employees.form.orgUnitNo')"
            detail-path="/hr/org-units"
            :disabled="disabled"
            :invalid="hasValidationError('orgUnitNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="categoryNo"
          :label="t('hr.employees.form.categoryNo')"
          :required="isRequired('categoryNo')"
        >
          <ReferenceLookup
            v-model="draft.categoryNo"
            reference-key="employeeCategories"
            :modal-title="t('hr.employees.form.categoryNo')"
            detail-path="/hr/employee-categories"
            :disabled="disabled"
            :invalid="hasValidationError('categoryNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="siteCode"
          :label="t('hr.employees.form.siteCode')"
          :required="isRequired('siteCode')"
        >
          <ReferenceLookup
            v-model="draft.siteCode"
            reference-key="sites"
            :modal-title="t('hr.employees.form.siteCode')"
            :disabled="disabled"
            :invalid="hasValidationError('siteCode')"
          />
        </BaseFormField>
        <BaseFormField
          field="contractType"
          :label="t('hr.employees.form.contractType')"
          :required="isRequired('contractType')"
        >
          <OptionsSelect
            :model-value="draft.contractType"
            options-key="contractType"
            :disabled="disabled"
            :invalid="hasValidationError('contractType')"
            @update:model-value="setOption('contractType')($event)"
          />
        </BaseFormField>
        <BaseFormField
          field="hireDate"
          :label="t('hr.employees.form.hireDate')"
          :required="isRequired('hireDate')"
        >
          <DateFormInput
            v-model="draft.hireDate"
            :disabled="disabled"
            :invalid="hasValidationError('hireDate')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.contact"
      :title="t('hr.employees.form.contact')"
      :summary="[draft.phone, draft.email]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="phone"
          :label="t('hr.employees.form.phone')"
          :required="isRequired('phone')"
        >
          <FormInput
            v-model="draft.phone"
            type="tel"
            :maxlength="30"
            :disabled="disabled"
            :invalid="hasValidationError('phone')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="email" :label="t('hr.employees.form.email')">
          <FormInput
            v-model="draft.email"
            type="email"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('email')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.situation"
      :title="t('hr.employees.form.situation')"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.employees.form.status')">
          <EmployeeStatusPill v-if="initialData.status" :status="initialData.status" />
        </BaseFormField>
        <BaseFormField v-if="initialData.statusReason" :label="t('hr.employees.form.statusReason')">
          <FormInput :model-value="initialData.statusReason" disabled />
        </BaseFormField>
        <BaseFormField v-if="initialData.exitDate" :label="t('hr.employees.form.exitDate')">
          <FormInput :model-value="formatDate(initialData.exitDate)" disabled />
        </BaseFormField>
        <BaseFormField :label="t('hr.employees.form.hasSystemAccount')">
          <FormInput
            :model-value="initialData.hasSystemAccount ? t('common.yes') : t('common.no')"
            disabled
          />
        </BaseFormField>
      </div>
      <div v-if="initialData.drives" class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.employees.form.drivingAuthorized')">
          <FormInput
            :model-value="initialData.drivingAuthorized ? t('common.yes') : t('common.no')"
            disabled
          />
        </BaseFormField>
        <BaseFormField
          v-if="initialData.drivingAuthorizedAt"
          :label="t('hr.employees.form.drivingAuthorizedAt')"
        >
          <FormInput
            :model-value="`${formatDateTime(initialData.drivingAuthorizedAt)} · ${initialData.drivingAuthorizedBy ?? ''}`"
            disabled
          />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
