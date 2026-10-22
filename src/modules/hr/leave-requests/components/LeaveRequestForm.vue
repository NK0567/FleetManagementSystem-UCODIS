<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { leaveBalanceService, type LeaveBalanceApi } from '@/modules/hr/leave-balances'
import { publicHolidayService, type PublicHolidayApi } from '@/modules/hr/public-holidays'
import {
  countWorkingDays,
  workingCalendarService,
  type WorkingDay
} from '@/modules/hr/working-calendar'
import { useUserStore } from '@/stores/user'
import { formatDate, formatDateTime, formatNumber } from '@/utils/format'
import type { LeaveRequestApi } from '../types/leaveRequest.types'

const HOLIDAYS_PAGE_SIZE = 500

const props = withDefaults(
  defineProps<{
    initialData?: Partial<LeaveRequestApi>
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
const { myOnly } = usePermissions('LEAVEREQUEST')
const userStore = useUserStore()

const { draft, isRequired, expose } = useEntityForm({
  initialData: () =>
    props.isNew && myOnly.value
      ? { employeeNo: userStore.user?.employeeNo ?? '', ...props.initialData }
      : props.initialData,
  empty: () => ({ employeeNo: '', leaveTypeNo: '', startDate: '', endDate: '', reason: '' }),
  required: ['employeeNo', 'leaveTypeNo', 'startDate', 'endDate'],
  labelOf: (field) => t(`hr.leaveRequests.form.${field}`),
  validate: (values) =>
    values.startDate && values.endDate && values.endDate < values.startDate
      ? [{ fieldKey: 'endDate', label: t('hr.leaveRequests.form.endBeforeStart') }]
      : []
})

/** The preview uses the same rule as the server, which recounts the days on submission. */
const calendarDays = ref<WorkingDay[]>([])
const holidays = ref<PublicHolidayApi[]>([])
const previewDays = computed(() =>
  draft.startDate && draft.endDate && draft.endDate >= draft.startDate
    ? countWorkingDays(draft.startDate, draft.endDate, calendarDays.value, holidays.value)
    : null
)

const balance = ref<LeaveBalanceApi | null>(null)
const exceedsBalance = computed(
  () =>
    !!balance.value && previewDays.value !== null && previewDays.value > balance.value.availableDays
)

watch(
  () => [draft.employeeNo, draft.leaveTypeNo, draft.startDate] as const,
  async ([employeeNo, leaveTypeNo, startDate]) => {
    balance.value = null
    if (!props.isNew || !employeeNo || !leaveTypeNo || !startDate) return
    balance.value = await leaveBalanceService.find(
      employeeNo,
      leaveTypeNo,
      Number(startDate.slice(0, 4))
    )
  }
)

onMounted(async () => {
  if (!props.isNew) return
  const [calendar, holidayPage] = await Promise.all([
    workingCalendarService.get(),
    publicHolidayService.getAll({ pageSize: HOLIDAYS_PAGE_SIZE })
  ])
  calendarDays.value = calendar.days
  holidays.value = holidayPage.data.items
})

const expandedSections = ref({ request: true, decision: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    employeeNo: 'request',
    leaveTypeNo: 'request',
    startDate: 'request',
    endDate: 'request'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.request"
      :title="t('hr.leaveRequests.form.request')"
      :summary="[initialData.employeeName, initialData.leaveTypeName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="employeeNo"
          :label="t('hr.leaveRequests.form.employeeNo')"
          :required="isNew && isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="employees"
            :disabled="disabled || !isNew || myOnly"
            :show-lock-icon="!isNew || myOnly"
            :invalid="hasValidationError('employeeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="leaveTypeNo"
          :label="t('hr.leaveRequests.form.leaveTypeNo')"
          :required="isNew && isRequired('leaveTypeNo')"
        >
          <ReferenceLookup
            v-model="draft.leaveTypeNo"
            reference-key="leaveTypes"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('leaveTypeNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveRequests.form.reason')">
          <FormTextarea
            v-model="draft.reason"
            :rows="3"
            :maxlength="300"
            :disabled="disabled || !isNew"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="startDate"
          :label="t('hr.leaveRequests.form.startDate')"
          :required="isNew && isRequired('startDate')"
        >
          <DateFormInput
            v-model="draft.startDate"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('startDate')"
          />
        </BaseFormField>
        <BaseFormField
          field="endDate"
          :label="t('hr.leaveRequests.form.endDate')"
          :required="isNew && isRequired('endDate')"
        >
          <DateFormInput
            v-model="draft.endDate"
            :min="draft.startDate || undefined"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('endDate')"
          />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveRequests.form.days')">
          <FormInput
            :model-value="
              isNew
                ? previewDays === null
                  ? ''
                  : t('hr.leaveRequests.form.dayCount', previewDays)
                : t('hr.leaveRequests.form.dayCount', initialData.days ?? 0)
            "
            disabled
          />
        </BaseFormField>
        <BaseFormField v-if="isNew && balance" :label="t('hr.leaveRequests.form.available')">
          <FormInput
            :model-value="formatNumber(balance.availableDays, 1)"
            :invalid="exceedsBalance"
            disabled
          />
          <p v-if="exceedsBalance" class="text-xs text-destructive mt-1">
            {{ t('hr.leaveRequests.form.exceedsBalance') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.decision"
      :title="t('hr.leaveRequests.form.decision')"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('hr.leaveRequests.form.status')">
          <LeaveRequestStatusPill v-if="initialData.status" :status="initialData.status" />
        </BaseFormField>
        <BaseFormField :label="t('hr.leaveRequests.form.submittedAt')">
          <FormInput :model-value="formatDateTime(initialData.submittedAt)" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField v-if="initialData.decidedAt" :label="t('hr.leaveRequests.form.decidedAt')">
          <FormInput
            :model-value="`${formatDate(initialData.decidedAt)} · ${initialData.decidedBy ?? ''}`"
            disabled
          />
        </BaseFormField>
        <BaseFormField
          v-if="initialData.decisionComment"
          :label="t('hr.leaveRequests.form.decisionComment')"
        >
          <FormTextarea :model-value="initialData.decisionComment" :rows="3" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
