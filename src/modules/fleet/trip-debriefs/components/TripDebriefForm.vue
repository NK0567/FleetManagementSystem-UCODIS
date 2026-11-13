<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { formatDate } from '@/utils/format'
import type { PlanStop, PlanStopKind } from '../domain/tripDebrief'
import type { TripDebriefApi } from '../types/tripDebrief.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<TripDebriefApi>
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
    voucherNo: '',
    employeeNo: '',
    vehicleNo: '',
    tankNo: '',
    loadedOn: null as string | null,
    unloadedOn: null as string | null,
    deliveryPlace: '',
    gainLoss: null as number | string | null,
    startKm: null as number | string | null,
    endKm: null as number | string | null,
    nightDriving: 0 as number | string | null,
    dailyWork: 0 as number | string | null,
    dailyDriving: 0 as number | string | null,
    continuousDriving: 0 as number | string | null,
    weeklyRest: 0 as number | string | null,
    dailyRest: 0 as number | string | null,
    overspeed: 0 as number | string | null,
    harshAcceleration: 0 as number | string | null,
    harshBraking: 0 as number | string | null,
    plan: [] as PlanStop[],
    events: '',
    actionText: '',
    actionOwner: '',
    actionDueOn: null as string | null
  }),
  required: ['voucherNo', 'employeeNo', 'vehicleNo'],
  labelOf: (field) => t(`fleet.tripDebriefs.form.${field}`)
})

function addStop() {
  draft.plan = [
    ...draft.plan,
    { place: '', plannedTime: '', actualTime: '', allowed: 'none', observation: '' }
  ]
}

function removeStop(index: number) {
  draft.plan = draft.plan.filter((_, position) => position !== index)
}

function patchStop(index: number, patch: Partial<PlanStop>) {
  draft.plan = draft.plan.map((stop, position) =>
    position === index ? { ...stop, ...patch } : stop
  )
}

const expandedSections = ref({
  general: true,
  kpi: true,
  infractions: true,
  follow: true,
  plan: true,
  signatures: true,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: { voucherNo: 'general', employeeNo: 'general', vehicleNo: 'general' },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.tripDebriefs.form.section.general')"
      :summary="[draft.voucherNo]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="voucherNo"
          :label="t('fleet.tripDebriefs.form.voucherNo')"
          :required="isRequired('voucherNo')"
        >
          <FormInput
            v-model="draft.voucherNo"
            :maxlength="40"
            :disabled="disabled"
            :invalid="hasValidationError('voucherNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="employeeNo"
          :label="t('fleet.tripDebriefs.form.employeeNo')"
          :required="isRequired('employeeNo')"
        >
          <ReferenceLookup
            v-model="draft.employeeNo"
            reference-key="drivers"
            :modal-title="t('fleet.tripDebriefs.form.employeeNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('employeeNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="vehicleNo"
          :label="t('fleet.tripDebriefs.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('fleet.tripDebriefs.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField field="tankNo" :label="t('fleet.tripDebriefs.form.tankNo')">
          <FormInput
            v-model="draft.tankNo"
            :maxlength="40"
            :disabled="disabled"
            :invalid="hasValidationError('tankNo')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="loadedOn" :label="t('fleet.tripDebriefs.form.loadedOn')">
          <DateFormInput v-model="draft.loadedOn" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField field="unloadedOn" :label="t('fleet.tripDebriefs.form.unloadedOn')">
          <DateFormInput v-model="draft.unloadedOn" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField field="deliveryPlace" :label="t('fleet.tripDebriefs.form.deliveryPlace')">
          <FormInput
            v-model="draft.deliveryPlace"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('deliveryPlace')"
          />
        </BaseFormField>
        <BaseFormField field="gainLoss" :label="t('fleet.tripDebriefs.form.gainLoss')">
          <FormInput
            v-model="draft.gainLoss"
            type="number"
            step="0.1"
            :disabled="disabled"
            :invalid="hasValidationError('gainLoss')"
          />
        </BaseFormField>
      </div>
    </FormSection>
    <FormSection
      v-model:open="expandedSections.kpi"
      :title="t('fleet.tripDebriefs.form.section.kpi')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="startKm" :label="t('fleet.tripDebriefs.form.startKm')">
          <FormInput
            v-model="draft.startKm"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('startKm')"
          />
        </BaseFormField>
        <BaseFormField field="endKm" :label="t('fleet.tripDebriefs.form.endKm')">
          <FormInput
            v-model="draft.endKm"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('endKm')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0"></div>
    </FormSection>
    <FormSection
      v-model:open="expandedSections.infractions"
      :title="t('fleet.tripDebriefs.form.section.infractions')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="nightDriving" :label="t('fleet.tripDebriefs.form.nightDriving')">
          <FormInput
            v-model="draft.nightDriving"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('nightDriving')"
          />
        </BaseFormField>
        <BaseFormField field="dailyWork" :label="t('fleet.tripDebriefs.form.dailyWork')">
          <FormInput
            v-model="draft.dailyWork"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('dailyWork')"
          />
        </BaseFormField>
        <BaseFormField field="dailyDriving" :label="t('fleet.tripDebriefs.form.dailyDriving')">
          <FormInput
            v-model="draft.dailyDriving"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('dailyDriving')"
          />
        </BaseFormField>
        <BaseFormField
          field="continuousDriving"
          :label="t('fleet.tripDebriefs.form.continuousDriving')"
        >
          <FormInput
            v-model="draft.continuousDriving"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('continuousDriving')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="weeklyRest" :label="t('fleet.tripDebriefs.form.weeklyRest')">
          <FormInput
            v-model="draft.weeklyRest"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('weeklyRest')"
          />
        </BaseFormField>
        <BaseFormField field="dailyRest" :label="t('fleet.tripDebriefs.form.dailyRest')">
          <FormInput
            v-model="draft.dailyRest"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('dailyRest')"
          />
        </BaseFormField>
        <BaseFormField field="overspeed" :label="t('fleet.tripDebriefs.form.overspeed')">
          <FormInput
            v-model="draft.overspeed"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('overspeed')"
          />
        </BaseFormField>
        <BaseFormField
          field="harshAcceleration"
          :label="t('fleet.tripDebriefs.form.harshAcceleration')"
        >
          <FormInput
            v-model="draft.harshAcceleration"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('harshAcceleration')"
          />
        </BaseFormField>
        <BaseFormField field="harshBraking" :label="t('fleet.tripDebriefs.form.harshBraking')">
          <FormInput
            v-model="draft.harshBraking"
            type="number"
            :min="0"
            :disabled="disabled"
            :invalid="hasValidationError('harshBraking')"
          />
        </BaseFormField>
      </div>
    </FormSection>
    <FormSection
      v-model:open="expandedSections.follow"
      :title="t('fleet.tripDebriefs.form.section.follow')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField field="events" :label="t('fleet.tripDebriefs.form.events')">
          <FormTextarea
            v-model="draft.events"
            :rows="4"
            :maxlength="500"
            :disabled="disabled"
            :invalid="hasValidationError('events')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField field="actionText" :label="t('fleet.tripDebriefs.form.actionText')">
          <FormTextarea
            v-model="draft.actionText"
            :rows="3"
            :maxlength="500"
            :disabled="disabled"
            :invalid="hasValidationError('actionText')"
          />
        </BaseFormField>
        <BaseFormField field="actionOwner" :label="t('fleet.tripDebriefs.form.actionOwner')">
          <FormInput
            v-model="draft.actionOwner"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('actionOwner')"
          />
        </BaseFormField>
        <BaseFormField field="actionDueOn" :label="t('fleet.tripDebriefs.form.actionDueOn')">
          <DateFormInput v-model="draft.actionDueOn" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.plan"
      :title="t('fleet.tripDebriefs.form.section.plan')"
      :summary="[]"
    >
      <div class="col-span-full min-w-0 space-y-2">
        <p v-if="!draft.plan.length" class="text-sm text-muted-foreground">
          {{ t('fleet.tripDebriefs.plan.empty') }}
        </p>
        <div
          v-for="(stop, index) in draft.plan"
          :key="index"
          class="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border border-border rounded p-2"
        >
          <div class="col-span-2 sm:col-span-2 min-w-0">
            <p class="text-xs text-muted-foreground mb-1">
              {{ t('fleet.tripDebriefs.plan.place') }}
            </p>
            <FormInput
              :model-value="stop.place"
              :maxlength="80"
              :disabled="disabled"
              @update:model-value="patchStop(index, { place: String($event ?? '') })"
            />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground mb-1">
              {{ t('fleet.tripDebriefs.plan.plannedTime') }}
            </p>
            <FormInput
              type="time"
              :model-value="stop.plannedTime"
              :disabled="disabled"
              @update:model-value="patchStop(index, { plannedTime: String($event ?? '') })"
            />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground mb-1">
              {{ t('fleet.tripDebriefs.plan.actualTime') }}
            </p>
            <FormInput
              type="time"
              :model-value="stop.actualTime"
              :disabled="disabled"
              @update:model-value="patchStop(index, { actualTime: String($event ?? '') })"
            />
          </div>
          <div class="col-span-2 sm:col-span-2 min-w-0">
            <p class="text-xs text-muted-foreground mb-1">
              {{ t('fleet.tripDebriefs.plan.allowed') }}
            </p>
            <OptionsSelect
              :model-value="stop.allowed"
              options-key="tripDebriefStop"
              :disabled="disabled"
              @update:model-value="patchStop(index, { allowed: String($event) as PlanStopKind })"
            />
          </div>
          <div class="col-span-2 sm:col-span-5 min-w-0">
            <p class="text-xs text-muted-foreground mb-1">
              {{ t('fleet.tripDebriefs.plan.observation') }}
            </p>
            <FormInput
              :model-value="stop.observation"
              :maxlength="160"
              :disabled="disabled"
              @update:model-value="patchStop(index, { observation: String($event ?? '') })"
            />
          </div>
          <div class="col-span-2 sm:col-span-1 flex sm:justify-end">
            <button
              type="button"
              class="text-sm text-primary hover:underline disabled:opacity-50"
              :disabled="disabled"
              @click="removeStop(index)"
            >
              {{ t('fleet.tripDebriefs.plan.remove') }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 text-sm border border-border rounded hover:bg-accent disabled:opacity-50"
          :disabled="disabled"
          @click="addStop"
        >
          {{ t('fleet.tripDebriefs.plan.add') }}
        </button>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.signatures"
      :title="t('fleet.tripDebriefs.form.section.signatures')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.tripDebriefs.form.driverSignedOn')">
          <FormInput
            :model-value="initialData.driverSignedOn ? formatDate(initialData.driverSignedOn) : '-'"
            disabled
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.tripDebriefs.form.managerSignedOn')">
          <FormInput
            :model-value="
              initialData.managerSignedOn ? formatDate(initialData.managerSignedOn) : '-'
            "
            disabled
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.tripDebriefs.form.closedOn')">
          <FormInput
            :model-value="initialData.closedOn ? formatDate(initialData.closedOn) : '-'"
            disabled
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.tripDebriefs.col.distanceKm')">
          <FormInput :model-value="initialData.distanceKm ?? '-'" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.tripDebriefs.col.infractionTotal')">
          <FormInput :model-value="initialData.infractionTotal ?? '-'" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.tripDebriefs.col.infractionRate')">
          <FormInput :model-value="initialData.infractionRate ?? '-'" disabled />
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
