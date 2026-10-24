<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { DowntimeApi } from '../types/downtime.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DowntimeApi>
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
    downtimeCodeNo: '',
    startedAt: '',
    comment: ''
  }),
  required: ['vehicleNo', 'downtimeCodeNo', 'startedAt'],
  labelOf: (field) => t(`maintenance.downtimes.form.${field}`)
})

const expandedSections = ref({ general: true, period: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { vehicleNo: 'general', downtimeCodeNo: 'general', startedAt: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.downtimes.form.general')"
      :summary="[initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="vehicleNo"
          :label="t('maintenance.downtimes.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('maintenance.downtimes.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="downtimeCodeNo"
          :label="t('maintenance.downtimes.form.downtimeCodeNo')"
          :required="isRequired('downtimeCodeNo')"
        >
          <ReferenceLookup
            v-model="draft.downtimeCodeNo"
            reference-key="downtimeCodes"
            :modal-title="t('maintenance.downtimes.form.downtimeCodeNo')"
            detail-path="/maintenance/downtime-codes"
            :disabled="disabled"
            :invalid="hasValidationError('downtimeCodeNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="startedAt"
          :label="t('maintenance.downtimes.form.startedAt')"
          :required="isRequired('startedAt')"
        >
          <FormInput
            v-model="draft.startedAt"
            type="datetime-local"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('startedAt')"
          />
        </BaseFormField>
        <BaseFormField :label="t('maintenance.downtimes.form.comment')">
          <FormTextarea v-model="draft.comment" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.period"
      :title="t('maintenance.downtimes.form.period')"
      :summary="[optionsStore.getOptionLabel('downtimeStatus', initialData.status)]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.downtimes.form.endedAt')">
          <p class="text-sm text-card-foreground">
            {{
              initialData.endedAt
                ? formatDateTime(initialData.endedAt)
                : t('maintenance.downtimes.form.stillOpen')
            }}
          </p>
          <p v-if="initialData.endedBy" class="text-xs text-muted-foreground">
            {{ initialData.endedBy }}
            <template v-if="initialData.endComment"> · {{ initialData.endComment }}</template>
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('maintenance.downtimes.form.duration')">
          <p class="text-sm text-card-foreground">
            {{
              t('maintenance.downtimes.form.days', {
                days: formatNumber(initialData.durationDays, 2)
              })
            }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('maintenance.downtimes.form.cost')">
          <p class="text-sm text-card-foreground">{{ formatNumber(initialData.cost) }} Ar</p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
