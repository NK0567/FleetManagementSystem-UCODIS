<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { useEntityForm, type FormValidationError } from '@/composables/useEntityForm'
import { useFormValidationUi } from '@/composables/useFormValidationUi'
import { deliveryPointService } from '@/modules/planning/delivery-points'
import { customerService } from '@/modules/planning/customers'
import { formatNumber } from '@/utils/format'
import { useUserStore } from '@/stores/user'
import type {
  DeliveryRequestApi,
  DeliveryRequestLine,
  DeliverySlot,
  FreightPayer,
  NotificationChannel
} from '../types/deliveryRequest.types'

const props = withDefaults(
  defineProps<{
    initialData?: Partial<DeliveryRequestApi>
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
/** An orderer orders for his own record: the field is filled for him and stays locked. */
const ownOrderer = useUserStore().user?.ordererNo ?? ''

const emptyLine = (lineNo: number): DeliveryRequestLine => ({
  lineNo,
  productNo: '',
  quantity: 0,
  weightKg: null,
  volumeM3: null
})

/* Each line is copied so that editing it never touches the record the changes are compared with. */
const { draft, isRequired, expose } = useEntityForm({
  initialData: () => ({
    ...props.initialData,
    ...(props.initialData.lines
      ? {
          lines: props.initialData.lines.map(
            ({ lineNo, productNo, quantity, weightKg, volumeM3 }) => ({
              lineNo,
              productNo,
              quantity,
              weightKg,
              volumeM3
            })
          )
        }
      : {})
  }),
  empty: () => ({
    ordererNo: ownOrderer,
    deliveryPointNo: '',
    desiredDate: '',
    validUntil: null as string | null,
    externalReference: '',
    freightPayer: 'orderer' as FreightPayer,
    comment: '',
    lines: [emptyLine(1)] as DeliveryRequestLine[],
    notificationChannel: 'sms' as NotificationChannel,
    confirmationRequired: true,
    preferredSlot: 'any' as DeliverySlot,
    fullDeliveryRequired: false
  }),
  required: ['ordererNo', 'deliveryPointNo', 'desiredDate', 'freightPayer', 'lines'],
  labelOf: (field) =>
    field === 'lines'
      ? t('planning.deliveryRequests.lines.title')
      : t(`planning.deliveryRequests.form.${field}`),
  validate: (values) => {
    const errors: FormValidationError[] = []
    if (values.lines.some((line) => !line.productNo || !(Number(line.quantity) > 0))) {
      errors.push({ fieldKey: 'lines', label: t('planning.deliveryRequests.lines.incomplete') })
    }
    return errors
  }
})

const expandedSections = ref({ general: true, goods: true, preferences: true, audit: false })
const { hasValidationError } = useFormValidationUi({
  validationErrors: () => props.validationErrors,
  expandedSections,
  fieldSections: {
    ordererNo: 'general',
    deliveryPointNo: 'general',
    desiredDate: 'general',
    freightPayer: 'general',
    lines: 'goods'
  },
  fieldValues: () => ({ ...draft })
})

function addLine() {
  const next = draft.lines.reduce((max, line) => Math.max(max, line.lineNo), 0) + 1
  draft.lines = [...draft.lines, emptyLine(next)]
}
function removeLine(lineNo: number) {
  draft.lines = draft.lines.filter((line) => line.lineNo !== lineNo)
}

const totalWeight = computed(() =>
  draft.lines.reduce((sum, line) => sum + (Number(line.weightKg) || 0), 0)
)

/* On a new order, the recipient's preferences are copied from its record once the delivery point
 * is chosen; they stay editable for this order only. If the record cannot be read, the fields keep
 * their values and the server fills them from the recipient. */
watch(
  () => draft.deliveryPointNo,
  async (no, previous) => {
    if (!props.isNew || !no || no === previous) return
    try {
      const point = await deliveryPointService.getById(no)
      if (!point.customerNo || draft.deliveryPointNo !== no) return
      const recipient = await customerService.getById(point.customerNo)
      if (draft.deliveryPointNo !== no) return
      draft.notificationChannel = recipient.notificationChannel
      draft.confirmationRequired = recipient.confirmationRequired
      draft.preferredSlot = recipient.preferredSlot
    } catch {
      /* kept as typed */
    }
  }
)

defineExpose(expose)
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
    <FormSection
      v-model:open="expandedSections.general"
      :title="t('planning.deliveryRequests.form.general')"
      :summary="[initialData.deliveryPointName]"
    >
      <div class="space-y-3 min-w-0">
        <BaseFormField
          field="ordererNo"
          :label="t('planning.deliveryRequests.form.ordererNo')"
          :required="isRequired('ordererNo')"
        >
          <ReferenceLookup
            v-model="draft.ordererNo"
            reference-key="ordererCustomers"
            :modal-title="t('planning.deliveryRequests.form.ordererNo')"
            detail-path="/planning/customers"
            :disabled="disabled || !!ownOrderer"
            :invalid="hasValidationError('ordererNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="deliveryPointNo"
          :label="t('planning.deliveryRequests.form.deliveryPointNo')"
          :required="isRequired('deliveryPointNo')"
        >
          <ReferenceLookup
            v-model="draft.deliveryPointNo"
            reference-key="deliveryPoints"
            :modal-title="t('planning.deliveryRequests.form.deliveryPointNo')"
            detail-path="/planning/delivery-points"
            :disabled="disabled"
            :invalid="hasValidationError('deliveryPointNo')"
          />
        </BaseFormField>
        <BaseFormField
          field="desiredDate"
          :label="t('planning.deliveryRequests.form.desiredDate')"
          :required="isRequired('desiredDate')"
        >
          <DateFormInput
            v-model="draft.desiredDate"
            :disabled="disabled"
            :invalid="hasValidationError('desiredDate')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryRequests.form.validUntil')">
          <DateFormInput v-model="draft.validUntil" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryRequests.form.validUntilHint') }}
          </p>
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.deliveryRequests.form.externalReference')">
          <FormInput v-model="draft.externalReference" :maxlength="40" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField
          field="freightPayer"
          :label="t('planning.deliveryRequests.form.freightPayer')"
          :required="isRequired('freightPayer')"
        >
          <OptionsSelect
            :model-value="draft.freightPayer"
            options-key="freightPayer"
            :disabled="disabled"
            :invalid="hasValidationError('freightPayer')"
            @update:model-value="draft.freightPayer = String($event) as FreightPayer"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryRequests.form.comment')">
          <FormTextarea v-model="draft.comment" :rows="3" :disabled="disabled" />
        </BaseFormField>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.goods"
      :title="t('planning.deliveryRequests.lines.title')"
      :summary="[
        t('planning.deliveryRequests.lines.count', draft.lines.length),
        totalWeight ? `${formatNumber(totalWeight, 0)} kg` : ''
      ]"
    >
      <div class="xl:col-span-2 min-w-0" data-field="lines">
        <div
          class="border rounded overflow-x-auto"
          :class="hasValidationError('lines') ? 'border-destructive' : 'border-border'"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-muted/40 text-xs text-muted-foreground">
                <th class="px-3 py-2 w-10 text-right font-semibold">#</th>
                <th class="px-3 py-2 text-left font-semibold">
                  {{ t('planning.deliveryRequests.form.productNo') }} *
                </th>
                <th class="px-3 py-2 text-right font-semibold w-36">
                  {{ t('planning.deliveryRequests.form.quantity') }} *
                </th>
                <th class="px-3 py-2 text-right font-semibold w-32">
                  {{ t('planning.deliveryRequests.form.weightKg') }}
                </th>
                <th class="px-3 py-2 text-right font-semibold w-32">
                  {{ t('planning.deliveryRequests.form.volumeM3') }}
                </th>
                <th v-if="!disabled" class="w-10" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(line, index) in draft.lines"
                :key="line.lineNo"
                class="border-t border-border align-top"
              >
                <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {{ index + 1 }}
                </td>
                <td class="px-2 py-1.5 min-w-56">
                  <ReferenceLookup
                    v-model="line.productNo"
                    reference-key="products"
                    :modal-title="t('planning.deliveryRequests.form.productNo')"
                    detail-path="/planning/products"
                    :disabled="disabled"
                    :invalid="hasValidationError('lines') && !line.productNo"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <FormInput
                    v-model="line.quantity"
                    type="number"
                    :min="0.001"
                    :max="1000000000"
                    :disabled="disabled"
                    :invalid="hasValidationError('lines') && !(Number(line.quantity) > 0)"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <FormInput
                    v-model="line.weightKg"
                    type="number"
                    :min="0"
                    :max="1000000"
                    :disabled="disabled"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <FormInput
                    v-model="line.volumeM3"
                    type="number"
                    :min="0"
                    :max="10000"
                    :disabled="disabled"
                  />
                </td>
                <td v-if="!disabled" class="px-1 py-1.5 text-center">
                  <button
                    v-if="draft.lines.length > 1"
                    type="button"
                    class="cursor-pointer p-2 rounded text-destructive hover:bg-destructive/10"
                    :aria-label="t('planning.deliveryRequests.lines.remove')"
                    :title="t('planning.deliveryRequests.lines.remove')"
                    @click="removeLine(line.lineNo)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button
          v-if="!disabled"
          type="button"
          class="mt-2 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition"
          @click="addLine"
        >
          <Plus class="w-4 h-4 text-primary" />
          {{ t('planning.deliveryRequests.lines.add') }}
        </button>
      </div>
    </FormSection>

    <FormSection
      v-model:open="expandedSections.preferences"
      :title="t('planning.deliveryRequests.preferences.title')"
      :summary="[]"
    >
      <p class="xl:col-span-2 text-xs text-muted-foreground">
        {{ t('planning.deliveryRequests.preferences.hint') }}
      </p>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.customers.form.notificationChannel')">
          <OptionsSelect
            :model-value="draft.notificationChannel"
            options-key="notificationChannel"
            :disabled="disabled"
            @update:model-value="draft.notificationChannel = String($event) as NotificationChannel"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.customers.form.preferredSlot')">
          <OptionsSelect
            :model-value="draft.preferredSlot"
            options-key="deliverySlot"
            :disabled="disabled"
            @update:model-value="draft.preferredSlot = String($event) as DeliverySlot"
          />
        </BaseFormField>
      </div>
      <div class="space-y-3 min-w-0">
        <BaseFormField :label="t('planning.customers.form.confirmationRequired')">
          <ToggleSwitch v-model="draft.confirmationRequired" :disabled="disabled" />
        </BaseFormField>
        <BaseFormField :label="t('planning.deliveryRequests.preferences.fullDeliveryRequired')">
          <ToggleSwitch v-model="draft.fullDeliveryRequired" :disabled="disabled" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.deliveryRequests.preferences.fullDeliveryHint') }}
          </p>
        </BaseFormField>
      </div>
    </FormSection>

    <AuditFormSection v-if="!isNew" v-model:open="expandedSections.audit" :record="initialData" />
  </div>
</template>
