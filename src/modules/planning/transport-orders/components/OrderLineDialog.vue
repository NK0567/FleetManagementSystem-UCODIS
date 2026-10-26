<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { remainderQuantity } from '@/modules/planning/reception/domain/reception'
import { formatNumber } from '@/utils/format'
import type { TransportOrderLineApi } from '../types/transportOrder.types'

export type OrderLineAction = 'declare' | 'handBack' | 'remainder'
export type OrderLineChoice =
  | { action: 'declare'; receivedQuantity: number; justification: string }
  | { action: 'handBack' }
  | { action: 'remainder'; date: string }

const props = defineProps<{
  action: OrderLineAction | null
  line: TransportOrderLineApi | null
  loading?: boolean
}>()
const emit = defineEmits<{ confirm: [choice: OrderLineChoice]; cancel: [] }>()

const { t } = useI18n()
const receivedQuantity = ref<number | null>(null)
const justification = ref('')
const date = ref('')

watch(
  () => [props.action, props.line?.lineNo],
  () => {
    receivedQuantity.value = null
    justification.value = ''
    date.value = ''
  }
)

const facts = computed(() => {
  const line = props.line
  if (!line) return { point: '', product: '', quantity: '', unit: '' }
  return {
    point: line.deliveryPointName,
    product: line.productName,
    quantity: formatNumber(line.loadedQuantity ?? line.quantity, 1),
    unit: line.unit
  }
})

const left = computed(() => (props.line ? remainderQuantity(props.line) : null))

const confirmDisabled = computed(() => {
  if (props.action === 'declare') return receivedQuantity.value === null
  if (props.action === 'remainder') return !date.value
  return false
})

function confirm() {
  if (props.action === 'declare' && receivedQuantity.value !== null) {
    emit('confirm', {
      action: 'declare',
      receivedQuantity: receivedQuantity.value,
      justification: justification.value.trim()
    })
  } else if (props.action === 'remainder') {
    emit('confirm', { action: 'remainder', date: date.value })
  } else if (props.action === 'handBack') {
    emit('confirm', { action: 'handBack' })
  }
}
</script>

<template>
  <ConfirmDialog
    :open="action !== null && !!line"
    :title="action ? t(`planning.transportOrders.action.${action}`) : ''"
    :confirm-label="t('common.confirm')"
    :confirm-disabled="confirmDisabled"
    :loading="loading"
    panel-class="max-w-md"
    @confirm="confirm"
    @cancel="emit('cancel')"
  >
    <div class="space-y-3">
      <template v-if="action === 'declare'">
        <p class="text-sm text-muted-foreground">
          {{ t('planning.transportOrders.lines.declareHint', facts) }}
        </p>
        <BaseFormField
          :label="t('planning.transportOrders.lines.receivedQuantity', { unit: facts.unit })"
          required
        >
          <FormInput v-model="receivedQuantity" type="number" :min="0" />
        </BaseFormField>
        <BaseFormField :label="t('planning.transportOrders.lines.justification')">
          <FormTextarea v-model="justification" :rows="2" :maxlength="300" />
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('planning.transportOrders.lines.justificationHint') }}
          </p>
        </BaseFormField>
      </template>
      <p v-else-if="action === 'handBack'" class="text-sm text-muted-foreground">
        {{ t('planning.transportOrders.lines.handBackHint', facts) }}
      </p>
      <template v-else-if="action === 'remainder'">
        <p class="text-sm text-muted-foreground">
          {{
            t('planning.transportOrders.lines.remainderHint', {
              quantity: formatNumber(left, 1),
              unit: facts.unit
            })
          }}
        </p>
        <BaseFormField :label="t('planning.transportOrders.lines.remainderDate')" required>
          <DateFormInput v-model="date" />
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>
</template>
