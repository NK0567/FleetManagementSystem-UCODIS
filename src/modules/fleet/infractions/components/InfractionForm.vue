<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { InfractionSeverity } from '@/modules/fleet/infraction-types'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime } from '@/utils/format'
import type { InfractionApi, InfractionEvent } from '../types/infraction.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<InfractionApi>
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
    infractionTypeNo: '',
    occurredAt: '',
    location: '',
    vehicleNo: '',
    driverNo: null as string | null,
    severity: 'major' as InfractionSeverity,
    fineAmount: null as number | null,
    detail: ''
  }),
  createOnly: ['infractionTypeNo'],
  required: ['infractionTypeNo', 'occurredAt', 'location', 'vehicleNo'],
  labelOf: (field) => t(`fleet.infractions.form.${field}`)
})

const optionsStore = useOptionsStore()

function eventLabel(event: InfractionEvent): string {
  return event.comment || t(`fleet.infractions.event.${event.kind}`)
}

const expandedSections = ref({ general: true, handling: true, history: false, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    infractionTypeNo: 'general',
    occurredAt: 'general',
    location: 'general',
    vehicleNo: 'general',
    severity: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.infractions.form.general')"
      :summary="[initialData.infractionTypeName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="infractionTypeNo"
          :label="t('fleet.infractions.form.infractionTypeNo')"
          :required="isRequired('infractionTypeNo')"
        >
          <ReferenceLookup
            v-model="draft.infractionTypeNo"
            reference-key="infractionTypes"
            :modal-title="t('fleet.infractions.form.infractionTypeNo')"
            detail-path="/fleet/infraction-types"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('infractionTypeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="occurredAt"
          :label="t('fleet.infractions.form.occurredAt')"
          :required="isRequired('occurredAt')"
        >
          <FormInput
            v-model="draft.occurredAt"
            type="datetime-local"
            :disabled="disabled"
            :invalid="hasValidationError('occurredAt')"
          />
        </BaseFormField>
        <BaseFormField
          field="location"
          :label="t('fleet.infractions.form.location')"
          :required="isRequired('location')"
        >
          <FormInput
            v-model="draft.location"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('location')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.infractions.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('fleet.infractions.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.infractions.form.driverNo')">
          <ReferenceLookup
            v-model="draft.driverNo"
            reference-key="drivers"
            :modal-title="t('fleet.infractions.form.driverNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField
          field="severity"
          :label="t('fleet.infractions.form.severity')"
          :required="isRequired('severity')"
        >
          <OptionsSelect
            :model-value="draft.severity"
            options-key="infractionSeverity"
            :disabled="disabled"
            :invalid="hasValidationError('severity')"
            @update:model-value="draft.severity = String($event) as InfractionSeverity"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.infractions.form.fineAmount')">
          <FormInput v-model="draft.fineAmount" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.infractions.form.detail')">
          <FormTextarea v-model="draft.detail" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.handling"
      :title="t('fleet.infractions.form.handling')"
      :summary="[
        initialData.outcome
          ? optionsStore.getOptionLabel('infractionOutcome', initialData.outcome)
          : ''
      ]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.infractions.form.source')">
          <FormInput
            :model-value="
              optionsStore.getOptionLabel('infractionSource', initialData.source ?? 'manual')
            "
            disabled
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.infractions.form.handlerCode')">
          <FormInput :model-value="initialData.handlerCode ?? '-'" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <template v-if="initialData.outcome">
          <BaseFormField :label="t('fleet.infractions.form.outcome')">
            <FormInput
              :model-value="optionsStore.getOptionLabel('infractionOutcome', initialData.outcome)"
              disabled
            />
          </BaseFormField>
          <BaseFormField :label="t('fleet.infractions.form.outcomeComment')">
            <p class="text-sm text-card-foreground">{{ initialData.outcomeComment }}</p>
          </BaseFormField>
          <BaseFormField
            v-if="initialData.trainingNo"
            :label="t('fleet.infractions.form.training')"
          >
            <router-link
              :to="{
                path: '/fleet/trainings',
                query: { no: initialData.trainingNo, cardMode: 'view' }
              }"
              class="text-sm text-primary hover:underline"
            >
              {{ initialData.trainingNo }}
            </router-link>
          </BaseFormField>
        </template>
        <p v-else class="text-sm text-muted-foreground">
          {{ t('fleet.infractions.form.noOutcome') }}
        </p>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.history"
      :title="t('fleet.infractions.form.history')"
      :summary="[]"
    >
      <ol class="xl:col-span-2 min-w-0 space-y-2 text-sm">
        <li
          v-for="event in [...(initialData.history ?? [])].reverse()"
          :key="event.at + event.kind"
          class="flex flex-wrap gap-x-3 border-l-2 border-border pl-3"
        >
          <span class="text-muted-foreground">{{ formatDateTime(event.at) }}</span>
          <span class="font-medium text-card-foreground">{{ eventLabel(event) }}</span>
          <span class="text-muted-foreground">{{ event.by }}</span>
        </li>
      </ol>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
