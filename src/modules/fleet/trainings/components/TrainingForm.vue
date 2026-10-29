<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDate, formatDateTime } from '@/utils/format'
import type { TrainingApi, TrainingReason } from '../types/training.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TrainingApi>
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
    topic: '',
    reason: 'other' as TrainingReason,
    originNo: '',
    plannedOn: null as string | null,
    trainer: ''
  }),
  required: ['employeeNo', 'topic', 'reason'],
  labelOf: (field) => t(`fleet.trainings.form.${field}`)
})

/** Where the origin number leads: an infraction or a claim card. */
function originPath(originNo: string): string | null {
  if (originNo.startsWith('INF-')) return '/fleet/infractions'
  if (originNo.startsWith('SIN-')) return '/fleet/claims'
  return null
}

const expandedSections = ref({ general: true, session: true, outcome: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { employeeNo: 'general', topic: 'general', reason: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.trainings.form.general')"
      :summary="[draft.topic]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="employeeNo"
          :label="t('fleet.trainings.form.employeeNo')"
          :required="isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="drivers"
            :modal-title="t('fleet.trainings.form.employeeNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('employeeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="topic"
          :label="t('fleet.trainings.form.topic')"
          :required="isRequired('topic')"
        >
          <FormInput
            v-model="draft.topic"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('topic')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="reason"
          :label="t('fleet.trainings.form.reason')"
          :required="isRequired('reason')"
        >
          <OptionsSelect
            :model-value="draft.reason"
            options-key="trainingReason"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('reason')"
            @update:model-value="draft.reason = String($event) as TrainingReason"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.trainings.form.originNo')">
          <router-link
            v-if="!isNew && initialData.originNo && originPath(initialData.originNo)"
            :to="{
              path: originPath(initialData.originNo) ?? '',
              query: { no: initialData.originNo, cardMode: 'view' }
            }"
            class="text-sm text-primary hover:underline"
          >
            {{ initialData.originNo }}
          </router-link>
          <FormInput
            v-else
            v-model="draft.originNo"
            :maxlength="40"
            :disabled="disabled || !isNew"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.session"
      :title="t('fleet.trainings.form.session')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.trainings.form.plannedOn')">
          <DateFormInput v-model="draft.plannedOn" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.trainings.form.trainer')">
          <FormInput v-model="draft.trainer" :maxlength="120" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0"></div>
    </FormSection>

    <FormSection
      v-if="initialData.attendedOn || initialData.cancelledAt"
      v-model:open="expandedSections.outcome"
      :title="t('fleet.trainings.form.outcome')"
      :summary="[]"
    >
      <div v-if="initialData.attendedOn" class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.trainings.form.attendedOn')">
          <FormInput :model-value="formatDate(initialData.attendedOn)" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.trainings.form.result')">
          <p class="text-sm text-card-foreground">{{ initialData.result || '-' }}</p>
        </BaseFormField>
      </div>
      <div v-else class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.trainings.form.cancelledAt')">
          <FormInput :model-value="formatDateTime(initialData.cancelledAt ?? null)" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.trainings.form.cancelReason')">
          <p class="text-sm text-card-foreground">{{ initialData.cancelReason }}</p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
