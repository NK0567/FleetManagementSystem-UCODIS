<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import type { CardHolderType } from '../domain/fuelCard'
import type { FuelCardApi } from '../types/fuelCard.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<FuelCardApi>
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
    number: '',
    supplierNo: '',
    holderType: 'vehicle' as CardHolderType,
    vehicleNo: null as string | null,
    driverNo: null as string | null,
    expiresOn: '',
    monthlyAmount: null as number | null,
    monthlyVolumeL: null as number | null,
    transactionsPerDay: null as number | null,
    zones: [] as string[],
    startHour: null as number | null,
    endHour: null as number | null
  }),
  required: ['number', 'supplierNo', 'holderType', 'expiresOn'],
  labelOf: (field) => t(`fleet.fuelCards.form.${field}`)
})

const optionsStore = useOptionsStore()

const expandedSections = ref({
  general: true,
  limits: true,
  usage: true,
  history: false,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    number: 'general',
    supplierNo: 'general',
    holderType: 'general',
    expiresOn: 'general'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.fuelCards.form.general')"
      :summary="[draft.number]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="number"
          :label="t('fleet.fuelCards.form.number')"
          :required="isRequired('number')"
        >
          <FormInput
            v-model="draft.number"
            :maxlength="30"
            :disabled="disabled"
            :invalid="hasValidationError('number')"
          />
        </BaseFormField>
        <BaseFormField
          field="supplierNo"
          :label="t('fleet.fuelCards.form.supplierNo')"
          :required="isRequired('supplierNo')"
        >
          <ReferenceLookup
            v-model="draft.supplierNo"
            reference-key="fuelSuppliers"
            :modal-title="t('fleet.fuelCards.form.supplierNo')"
            detail-path="/fleet/providers"
            :disabled="disabled"
            :invalid="hasValidationError('supplierNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="holderType"
          :label="t('fleet.fuelCards.form.holderType')"
          :required="isRequired('holderType')"
        >
          <OptionsSelect
            :model-value="draft.holderType"
            options-key="cardHolderType"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('holderType')"
            @update:model-value="draft.holderType = String($event) as CardHolderType"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          v-if="draft.holderType === 'vehicle'"
          :label="t('fleet.fuelCards.form.vehicleNo')"
          required
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="motorizedVehicles"
            :modal-title="t('fleet.fuelCards.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField v-else :label="t('fleet.fuelCards.form.driverNo')" required>
          <ReferenceLookup
            v-model="draft.driverNo"
            reference-key="drivers"
            :modal-title="t('fleet.fuelCards.form.driverNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField
          field="expiresOn"
          :label="t('fleet.fuelCards.form.expiresOn')"
          :required="isRequired('expiresOn')"
        >
          <DateFormInput
            v-model="draft.expiresOn"
            :disabled="disabled"
            :invalid="hasValidationError('expiresOn')"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.limits"
      :title="t('fleet.fuelCards.form.limits')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.fuelCards.form.monthlyAmount')">
          <FormInput v-model="draft.monthlyAmount" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelCards.form.monthlyVolumeL')">
          <FormInput v-model="draft.monthlyVolumeL" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelCards.form.transactionsPerDay')">
          <FormInput
            v-model="draft.transactionsPerDay"
            type="number"
            :min="1"
            :max="20"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.fuelCards.form.zones')">
          <FormInput
            :model-value="draft.zones.join(', ')"
            :maxlength="200"
            :disabled="disabled"
            @update:model-value="
              draft.zones = String($event ?? '')
                .split(',')
                .map((word) => word.trim())
                .filter(Boolean)
            "
          />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('fleet.fuelCards.form.zonesHint') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelCards.form.startHour')">
          <FormInput
            v-model="draft.startHour"
            type="number"
            :min="0"
            :max="23"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelCards.form.endHour')">
          <FormInput
            v-model="draft.endHour"
            type="number"
            :min="0"
            :max="24"
            :disabled="disabled"
          />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.usage"
      :title="t('fleet.fuelCards.form.usage')"
      :summary="[
        initialData.usagePct === null || initialData.usagePct === undefined
          ? ''
          : `${initialData.usagePct} %`
      ]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.fuelCards.form.monthAmount')">
          <FormInput :model-value="formatNumber(initialData.monthAmount ?? 0)" disabled />
        </BaseFormField>
        <BaseFormField :label="t('fleet.fuelCards.form.monthLiters')">
          <FormInput :model-value="formatNumber(initialData.monthLiters ?? 0, 1)" disabled />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          v-if="initialData.blockReason"
          :label="t('fleet.fuelCards.form.blockReason')"
        >
          <p class="text-sm text-card-foreground">{{ initialData.blockReason }}</p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ formatDateTime(initialData.blockedAt ?? null) }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew && initialData.history?.length"
      v-model:open="expandedSections.history"
      :title="t('fleet.fuelCards.form.history')"
      :summary="[]"
    >
      <ol class="xl:col-span-2 min-w-0 space-y-2 text-sm">
        <li
          v-for="event in [...(initialData.history ?? [])].reverse()"
          :key="event.at + event.kind"
          class="flex flex-wrap gap-x-3 border-l-2 border-border pl-3"
        >
          <span class="text-muted-foreground">{{ formatDateTime(event.at) }}</span>
          <span class="font-medium text-card-foreground">
            {{ optionsStore.getOptionLabel('cardEvent', event.kind) }}
          </span>
          <span class="text-muted-foreground">{{ event.by }}</span>
          <span v-if="event.comment" class="basis-full text-card-foreground">{{
            event.comment
          }}</span>
        </li>
      </ol>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
