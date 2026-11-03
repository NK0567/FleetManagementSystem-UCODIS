<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useReferenceStore } from '@/stores/referenceStore'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDate } from '@/utils/format'
import type { DriverAssignmentApi } from '../types/driverAssignment.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DriverAssignmentApi>
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
    vehicleNo: '',
    homeSiteNo: '',
    startDate: ''
  }),
  required: ['employeeNo', 'vehicleNo', 'startDate'],
  labelOf: (field) => t(`fleet.driverAssignments.form.${field}`)
})

const expandedSections = ref({ general: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    employeeNo: 'general',
    vehicleNo: 'general',
    homeSiteNo: 'general',
    startDate: 'general'
  },
  fieldValues: () => ({ ...draft })
})

const referenceStore = useReferenceStore()
/** Drivers the list does not offer, each with the reason, so their absence is explained. */
const excludedDrivers = computed(() =>
  props.isNew ? referenceStore.getItems('excludedDrivers') : []
)

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.driverAssignments.form.general')"
      :summary="[initialData.employeeName, initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="employeeNo"
          :label="t('fleet.driverAssignments.form.employeeNo')"
          :required="isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="drivers"
            :modal-title="t('fleet.driverAssignments.form.employeeNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
            :invalid="hasValidationError('employeeNo')"
          />
          <p v-if="isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.driverAssignments.form.employeeHint') }}
          </p>
          <div
            v-if="excludedDrivers.length"
            class="mt-2 rounded border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          >
            <p class="font-semibold">{{ t('fleet.driverAssignments.form.excluded') }}</p>
            <ul class="mt-1 space-y-0.5">
              <li v-for="driver in excludedDrivers" :key="driver.code">
                {{ driver.description }}
              </li>
            </ul>
          </div>
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.driverAssignments.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.driverAssignments.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField field="homeSiteNo" :label="t('fleet.driverAssignments.form.homeSiteNo')">
          <ReferenceLookup
            v-model="draft.homeSiteNo"
            reference-key="sites"
            :modal-title="t('fleet.driverAssignments.form.homeSiteNo')"
            detail-path="/fleet/sites"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('homeSiteNo')"
          />
          <p v-if="isNew" class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.driverAssignments.form.homeSiteHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="startDate"
          :label="t('fleet.driverAssignments.form.startDate')"
          :required="isRequired('startDate')"
        >
          <DateFormInput
            v-model="draft.startDate"
            :disabled="disabled"
            :invalid="hasValidationError('startDate')"
          />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.driverAssignments.form.endDate')">
          <FormInput :model-value="formatDate(initialData.endDate ?? null)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
