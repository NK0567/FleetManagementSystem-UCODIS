<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEntityForm } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { useOptionsStore } from '@/stores/optionsStore'
import type { FileMeta } from '@/types/file.types'
import { formatDateTime, formatNumber } from '@/utils/format'
import type {
  ClaimApi,
  ClaimEvent,
  ClaimLiability,
  ClaimNature,
  ClaimSeverity
} from '../types/claim.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<ClaimApi>
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
    nature: 'accident' as ClaimNature,
    occurredAt: '',
    vehicleNo: '',
    driverNo: null as string | null,
    location: '',
    severity: 'minor_damage' as ClaimSeverity,
    odometerKm: null as number | null,
    circumstances: '',
    thirdParties: '',
    damageAmount: null as number | null,
    liability: 'to_determine' as ClaimLiability,
    analysis: '',
    sanction: '',
    photoFileNos: [] as string[]
  }),
  createOnly: ['nature'],
  required: [
    'nature',
    'occurredAt',
    'vehicleNo',
    'location',
    'severity',
    'circumstances',
    'liability'
  ],
  labelOf: (field) => t(`fleet.claims.form.${field}`)
})

const optionsStore = useOptionsStore()

const photos = ref<FileMeta[]>(props.initialData.photos ?? [])
watch(
  () => props.initialData.photos,
  (value) => {
    photos.value = value ?? []
  }
)

function addPhoto(photo: FileMeta) {
  photos.value = [...photos.value, photo]
  draft.photoFileNos = [...draft.photoFileNos, photo.no]
}

function removePhoto(no: string) {
  photos.value = photos.value.filter((photo) => photo.no !== no)
  draft.photoFileNos = draft.photoFileNos.filter((fileNo) => fileNo !== no)
}

function eventLabel(event: ClaimEvent): string {
  return event.kind === 'insurance' && event.insuranceStatus
    ? optionsStore.getOptionLabel('claimInsuranceStatus', event.insuranceStatus)
    : t(`fleet.claims.event.${event.kind}`)
}

const expandedSections = ref({
  general: true,
  cost: true,
  followUp: true,
  photos: false,
  history: false,
  audit: false
})
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    nature: 'general',
    occurredAt: 'general',
    vehicleNo: 'general',
    location: 'general',
    severity: 'general',
    circumstances: 'general',
    liability: 'cost'
  },
  fieldValues: () => ({ ...draft })
})

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('fleet.claims.form.general')"
      :summary="[initialData.vehiclePlate]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="nature"
          :label="t('fleet.claims.form.nature')"
          :required="isRequired('nature')"
        >
          <OptionsSelect
            :model-value="draft.nature"
            options-key="claimNature"
            :disabled="disabled || !isNew"
            :invalid="hasValidationError('nature')"
            @update:model-value="draft.nature = String($event) as ClaimNature"
          />
        </BaseFormField>
        <BaseFormField
          field="occurredAt"
          :label="t('fleet.claims.form.occurredAt')"
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
          field="vehicleNo"
          :label="t('fleet.claims.form.vehicleNo')"
          :required="isRequired('vehicleNo')"
        >
          <ReferenceLookup
            v-model="draft.vehicleNo"
            reference-key="vehicles"
            :modal-title="t('fleet.claims.form.vehicleNo')"
            detail-path="/fleet/vehicles"
            :disabled="disabled"
            :invalid="hasValidationError('vehicleNo')"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.claims.form.driverNo')">
          <ReferenceLookup
            v-model="draft.driverNo"
            reference-key="drivers"
            :modal-title="t('fleet.claims.form.driverNo')"
            detail-path="/fleet/drivers"
            :disabled="disabled"
          />
        </BaseFormField>
        <BaseFormField
          field="location"
          :label="t('fleet.claims.form.location')"
          :required="isRequired('location')"
        >
          <FormInput
            v-model="draft.location"
            :maxlength="120"
            :disabled="disabled"
            :invalid="hasValidationError('location')"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="severity"
          :label="t('fleet.claims.form.severity')"
          :required="isRequired('severity')"
        >
          <OptionsSelect
            :model-value="draft.severity"
            options-key="claimSeverity"
            :disabled="disabled"
            :invalid="hasValidationError('severity')"
            @update:model-value="draft.severity = String($event) as ClaimSeverity"
          />
        </BaseFormField>
        <BaseFormField :label="t('fleet.claims.form.odometerKm')">
          <FormInput v-model="draft.odometerKm" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="circumstances"
          :label="t('fleet.claims.form.circumstances')"
          :required="isRequired('circumstances')"
        >
          <FormTextarea v-model="draft.circumstances" :rows="3" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.claims.form.thirdParties')">
          <FormTextarea v-model="draft.thirdParties" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.cost"
      :title="t('fleet.claims.form.cost')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.claims.form.damageAmount')">
          <FormInput v-model="draft.damageAmount" type="number" :min="0" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="liability"
          :label="t('fleet.claims.form.liability')"
          :required="isRequired('liability')"
        >
          <OptionsSelect
            :model-value="draft.liability"
            options-key="claimLiability"
            :disabled="disabled"
            :invalid="hasValidationError('liability')"
            @update:model-value="draft.liability = String($event) as ClaimLiability"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.claims.form.policyNo')">
          <FormInput
            :model-value="
              initialData.policyNo
                ? `${initialData.policyNumber} · ${initialData.insurerName}`
                : t('fleet.claims.form.noPolicy')
            "
            disabled
          />
          <p class="text-xs text-muted-foreground mt-1">{{ t('fleet.claims.form.policyHint') }}</p>
        </BaseFormField>
        <template v-if="!isNew">
          <BaseFormField :label="t('fleet.claims.form.indemnityAmount')">
            <FormInput :model-value="formatNumber(initialData.indemnityAmount)" disabled />
          </BaseFormField>
          <BaseFormField :label="t('fleet.claims.form.residualCost')">
            <FormInput :model-value="formatNumber(initialData.residualCost)" disabled />
          </BaseFormField>
        </template>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.followUp"
      :title="t('fleet.claims.form.followUp')"
      :summary="[]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.claims.form.analysis')">
          <FormTextarea v-model="draft.analysis" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('fleet.claims.form.sanction')">
          <FormInput v-model="draft.sanction" :maxlength="200" :disabled="disabled" />
        </BaseFormField>
      </div>
      <div v-if="!isNew" class="xl:col-span-2 min-w-0" data-testid="claim-repair">
        <BaseFormField :label="t('fleet.claims.form.repair')">
          <p v-if="!initialData.workOrderNo" class="text-sm text-muted-foreground">
            {{ t('fleet.claims.form.noRepair') }}
          </p>
          <div v-else class="text-sm text-card-foreground space-y-1">
            <RouterLink
              :to="{
                path: '/maintenance/work-orders',
                query: { no: initialData.workOrderNo, cardMode: 'view' }
              }"
              class="text-primary hover:underline"
            >
              {{ t('fleet.claims.form.workOrder', { no: initialData.workOrderNo }) }}
            </RouterLink>
            <p v-if="initialData.downtimeCode">
              {{
                t('fleet.claims.form.downtimeCode', {
                  code: initialData.downtimeCode,
                  name: initialData.downtimeCodeName ?? ''
                })
              }}
              <span class="text-muted-foreground">
                ·
                {{
                  initialData.downtimeOpen
                    ? t('fleet.claims.form.downtimeOpen')
                    : t('fleet.claims.form.downtimeEnded')
                }}
              </span>
            </p>
          </div>
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.photos"
      :title="t('fleet.claims.form.photos')"
      :summary="[photos.length ? String(photos.length) : '']"
    >
      <div class="xl:col-span-2 min-w-0">
        <PhotoGallery
          :photos="photos"
          :editable="!disabled"
          @add="addPhoto"
          @remove="removePhoto"
        />
      </div>
    </FormSection>

    <FormSection
      v-if="!isNew"
      v-model:open="expandedSections.history"
      :title="t('fleet.claims.form.history')"
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
          <span v-if="event.comment" class="basis-full text-card-foreground">{{
            event.comment
          }}</span>
        </li>
      </ol>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
