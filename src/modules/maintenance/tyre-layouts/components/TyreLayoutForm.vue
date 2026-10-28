<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import {
  layoutIssues,
  layoutPositions,
  type TyreAxle
} from '@/modules/maintenance/tyres/domain/tyre'
import type { TyreLayoutApi } from '../types/tyreLayout.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TyreLayoutApi>
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
    axles: [{ label: '', twin: false }] as TyreAxle[],
    spares: 0
  }),
  createOnly: ['no'],
  required: ['no', 'spares'],
  labelOf: (field) => t(`maintenance.tyreLayouts.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (layoutIssues({ axles: values.axles, spares: Number(values.spares) }).length) {
      errors.push({ fieldKey: 'axles', label: t('maintenance.tyreLayouts.form.layoutInvalid') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, axles: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { no: 'general', spares: 'general', axles: 'axles' },
  fieldValues: () => ({ ...draft })
})

const positions = computed(() =>
  layoutPositions({ axles: draft.axles, spares: Math.max(0, Number(draft.spares) || 0) })
)

function updateAxle(index: number, patch: Partial<TyreAxle>) {
  draft.axles = draft.axles.map((axle, position) =>
    position === index ? { ...axle, ...patch } : axle
  )
}

function addAxle() {
  draft.axles = [...draft.axles, { label: '', twin: false }]
}

function removeAxle(index: number) {
  draft.axles = draft.axles.filter((_axle, position) => position !== index)
}

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('maintenance.tyreLayouts.form.general')"
      :summary="[initialData.vehicleTypeName ?? draft.no]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="no" :label="t('maintenance.tyreLayouts.form.no')" :required="isNew">
          <ReferenceLookup
            v-model="draft.no"
            reference-key="vehicleTypes"
            :modal-title="t('maintenance.tyreLayouts.form.no')"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('no')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="spares"
          :label="t('maintenance.tyreLayouts.form.spares')"
          :required="isRequired('spares')"
        >
          <FormInput
            v-model="draft.spares"
            type="number"
            :min="0"
            :max="4"
            :disabled="disabled"
            :invalid="hasValidationError('spares')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.axles"
      :title="t('maintenance.tyreLayouts.form.axles')"
      :summary="[t('maintenance.tyreLayouts.form.positionCount', positions.length)]"
    >
      <div class="xl:col-span-2 min-w-0 space-y-2" data-field="axles">
        <div v-for="(axle, index) in draft.axles" :key="index" class="flex items-center gap-3">
          <span class="text-sm text-muted-foreground w-6">{{ index + 1 }}</span>
          <FormInput
            class="flex-1"
            :model-value="axle.label"
            :maxlength="60"
            :disabled="disabled"
            @update:model-value="updateAxle(index, { label: String($event) })"
          />
          <label class="inline-flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              :checked="axle.twin"
              :disabled="disabled"
              @change="updateAxle(index, { twin: ($event.target as HTMLInputElement).checked })"
            />
            {{ t('maintenance.tyreLayouts.form.twin') }}
          </label>
          <button
            v-if="!disabled && draft.axles.length > 1"
            type="button"
            class="p-1.5 text-destructive rounded hover:bg-destructive/10"
            :aria-label="t('maintenance.tyreLayouts.form.removeAxle')"
            @click="removeAxle(index)"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
        <button
          v-if="!disabled"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition"
          @click="addAxle"
        >
          <Plus class="w-4 h-4" /> {{ t('maintenance.tyreLayouts.form.addAxle') }}
        </button>
        <p class="text-xs text-muted-foreground">
          {{ t('maintenance.tyreLayouts.form.positions') }}
          {{ positions.map((position) => position.code).join(' · ') }}
        </p>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
