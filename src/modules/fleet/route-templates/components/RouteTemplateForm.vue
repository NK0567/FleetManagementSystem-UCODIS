<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { CODE_MAX_LENGTH, isValidCode } from '@/utils/code'
import { formatMinutes, formatNumber } from '@/utils/format'
import { plannedDurationMin, routeIssues, type RouteStop } from '../domain/routeTemplate'
import type { RouteTemplateApi } from '../types/routeTemplate.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<RouteTemplateApi>
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
    no: '',
    name: '',
    recurring: false,
    estimatedDistanceKm: 0,
    active: true,
    stops: [
      { siteNo: '', role: 'departure', plannedIntervalMin: 0, breakMin: 0 },
      { siteNo: '', role: 'delivery', plannedIntervalMin: 0, breakMin: 0 }
    ] as RouteStop[]
  }),
  createOnly: ['no'],
  required: ['no', 'name', 'estimatedDistanceKm'],
  labelOf: (field) => t(`fleet.routeTemplates.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.no && !isValidCode(values.no)) {
      errors.push({ fieldKey: 'no', label: t('common.validation.codeFormat') })
    }
    if (routeIssues(values.stops).length) {
      errors.push({ fieldKey: 'stops', label: t('fleet.routeTemplates.stops.invalid') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, stops: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    no: 'general',
    name: 'general',
    estimatedDistanceKm: 'general',
    stops: 'stops'
  },
  fieldValues: () => ({ ...draft })
})

const duration = computed(() => plannedDurationMin(draft.stops))

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.routeTemplates.form.general')"
      :summary="[draft.no, draft.name]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('fleet.routeTemplates.form.no')" :required="isNew">
          <FormInput
            v-model="draft.no"
            :maxlength="CODE_MAX_LENGTH"
            :disabled="disabled || !isNew"
            :show-lock-icon="!isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
        <BaseFormField
          field="name"
          :label="t('fleet.routeTemplates.form.name')"
          :required="isRequired('name')"
        >
          <FormInput
            v-model="draft.name"
            :maxlength="100"
            :disabled="disabled"
            :invalid="hasValidationError('name')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.routeTemplates.form.recurring')">
          <ToggleSwitch v-model="draft.recurring" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="estimatedDistanceKm"
          :label="t('fleet.routeTemplates.form.estimatedDistanceKm')"
          :required="isRequired('estimatedDistanceKm')"
        >
          <FormInput
            v-model="draft.estimatedDistanceKm"
            type="number"
            :min="1"
            :disabled="disabled"
            :invalid="hasValidationError('estimatedDistanceKm')"
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.routeTemplates.form.estimatedDistanceKmHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.routeTemplates.form.active')">
          <ToggleSwitch v-model="draft.active" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField v-if="!isNew" :label="t('fleet.routeTemplates.form.tripCount')">
          <FormInput :model-value="formatNumber(initialData.tripCount ?? 0, 0)" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.stops"
      :title="t('fleet.routeTemplates.form.stops')"
      :summary="[t('fleet.routeTemplates.stops.duration', { duration: formatMinutes(duration) })]"
    >
      <div class="xl:col-span-2 min-w-0 space-y-4" data-field="stops">
        <RouteStopsEditor v-model="draft.stops" :disabled="disabled" />
        <p class="text-sm text-muted-foreground">
          {{ t('fleet.routeTemplates.stops.duration', { duration: formatMinutes(duration) }) }}
        </p>
        <RouteMapPreview v-if="!isNew && initialData.stopPoints" :points="initialData.stopPoints" />
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
