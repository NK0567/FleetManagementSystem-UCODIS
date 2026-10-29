<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDateTime } from '@/utils/format'
import type { TransportMode, TransportOrderApi } from '../types/transportOrder.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TransportOrderApi>
    disabled?: boolean
    isNew?: boolean
    scheduleLocked?: boolean
    validationErrors?: string[]
  }>(),
  {
    initialData: () => ({}),
    disabled: false,
    isNew: false,
    scheduleLocked: false,
    validationErrors: () => []
  }
)

const { t } = useI18n()

const { draft, expose } = useEntityForm({
  initialData: () => props.initialData,
  empty: () => ({
    routeTemplateNo: '',
    plannedDeparture: '',
    comment: '',
    transportMode: 'road' as TransportMode
  }),
  required: [],
  labelOf: (field) => t(`planning.transportOrders.form.${field}`)
})

/** The browser input works in minutes: the seconds of the stored value are dropped. */
const departureInput = computed({
  get: () => draft.plannedDeparture.slice(0, 16),
  set: (value: string) => {
    draft.plannedDeparture = value
  }
})

const expandedSections = ref({ schedule: true })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    routeTemplateNo: 'schedule',
    plannedDeparture: 'schedule',
    comment: 'schedule'
  },
  fieldValues: () => ({ ...draft })
})

const arrivalLabel = computed(() => formatDateTime(props.initialData.plannedArrival))

const scheduleDisabled = computed(() => props.disabled || props.scheduleLocked)

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.schedule"
      :title="t('planning.transportOrders.form.schedule')"
      :summary="[initialData.routeName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="routeTemplateNo"
          :label="t('planning.transportOrders.form.routeTemplateNo')"
        >
          <ReferenceLookup
            v-model="draft.routeTemplateNo"
            reference-key="routeTemplates"
            :modal-title="t('planning.transportOrders.form.routeTemplateNo')"
            detail-path="/fleet/route-templates"
            :disabled="scheduleDisabled"
            :invalid="hasValidationError('routeTemplateNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="plannedDeparture"
          :label="t('planning.transportOrders.form.plannedDeparture')"
        >
          <FormInput
            v-model="departureInput"
            type="datetime-local"
            :disabled="scheduleDisabled"
            :invalid="hasValidationError('plannedDeparture')"
          />
        </BaseFormField>
        <BaseFormField
          v-if="!isNew && initialData.plannedArrival"
          :label="t('planning.transportOrders.form.plannedArrival')"
        >
          <FormInput :model-value="arrivalLabel" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.transportOrders.form.transportMode')">
          <OptionsSelect
            :model-value="draft.transportMode"
            options-key="transportMode"
            :disabled="scheduleDisabled"
            :disabled-values="['rail', 'sea', 'air']"
            @update:model-value="draft.transportMode = String($event) as TransportMode"
          />
        </BaseFormField>
        <BaseFormField field="comment" :label="t('planning.transportOrders.form.comment')">
          <FormTextarea v-model="draft.comment" :disabled="disabled" :maxlength="500" />
        </BaseFormField>
      </div>
    </FormSection>
  </div>
</template>
