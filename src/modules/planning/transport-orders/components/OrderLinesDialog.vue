<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2 } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import {
  deliveryRequestService,
  type DeliveryRequestApi
} from '@/modules/planning/delivery-requests'
import type { TransportOrderApi, TransportOrderLineInput } from '../types/transportOrder.types'

const props = defineProps<{
  open: boolean
  order: TransportOrderApi | null
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{ confirm: [lines: TransportOrderLineInput[]]; cancel: [] }>()

interface ManualLine {
  key: number
  deliveryPointNo: string
  productNo: string
  quantity: number | null
  weightKg: number | null
}

const { t } = useI18n()
const requests = ref<DeliveryRequestApi[]>([])
const picked = ref<string[]>([])
const manual = ref<ManualLine[]>([])
const loadingRequests = ref(false)
const loadError = ref<string | null>(null)
let nextKey = 1

const incomplete = computed(() =>
  manual.value.some((line) => !line.deliveryPointNo || !line.productNo || !line.quantity)
)

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.order) return
    loadError.value = null
    picked.value = props.order.lines
      .map((line) => line.deliveryRequestNo)
      .filter((no): no is string => !!no)
    manual.value = props.order.lines
      .filter((line) => !line.deliveryRequestNo)
      .map((line) => ({
        key: nextKey++,
        deliveryPointNo: line.deliveryPointNo,
        productNo: line.productNo,
        quantity: line.quantity,
        weightKg: line.weightKg
      }))
    loadingRequests.value = true
    try {
      const page = await deliveryRequestService.getAll({ page: 1, pageSize: 200, sortBy: 'no' })
      const kept = new Set(picked.value)
      requests.value = page.data.items.filter(
        (request) =>
          kept.has(request.no) || request.status === 'pending' || request.status === 'expired'
      )
    } catch (cause) {
      loadError.value = apiErrorMessage(cause, t('planning.transportOrders.saveError'))
    } finally {
      loadingRequests.value = false
    }
  }
)

function addManual() {
  manual.value = [
    ...manual.value,
    { key: nextKey++, deliveryPointNo: '', productNo: '', quantity: null, weightKg: null }
  ]
}

function removeManual(key: number) {
  manual.value = manual.value.filter((line) => line.key !== key)
}

function confirm() {
  emit('confirm', [
    ...picked.value.map((deliveryRequestNo) => ({ deliveryRequestNo })),
    ...manual.value.map((line) => ({
      deliveryPointNo: line.deliveryPointNo,
      productNo: line.productNo,
      quantity: line.quantity,
      weightKg: line.weightKg
    }))
  ])
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.transportOrders.linesDialog.title')"
    :confirm-label="t('common.save')"
    :confirm-disabled="incomplete"
    :loading="loading"
    panel-class="max-w-2xl"
    @confirm="confirm"
    @cancel="emit('cancel')"
  >
    <div class="max-h-128 overflow-y-auto space-y-4">
      <FormAlerts :error="error || loadError" @clear:error="loadError = null" />
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-card-foreground">
            {{ t('planning.transportOrders.linesDialog.requests') }}
          </p>
          <span class="text-xs text-muted-foreground">
            {{ t('planning.transportOrders.createDialog.picked', picked.length) }}
          </span>
        </div>
        <RequestPickerTable
          v-model="picked"
          :requests="requests"
          :loading="loadingRequests"
          :empty-message="t('planning.transportOrders.linesDialog.none')"
        />
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-card-foreground">
            {{ t('planning.transportOrders.linesDialog.manual') }}
          </p>
          <button type="button" :class="buttonClass" @click="addManual">
            <Plus class="w-5 h-5 text-primary" />
            {{ t('planning.transportOrders.linesDialog.add') }}
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="(line, index) in manual"
            :key="line.key"
            class="border border-border rounded p-3 space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-muted-foreground">#{{ index + 1 }}</span>
              <button
                type="button"
                class="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs text-destructive rounded hover:bg-destructive/10 transition"
                @click="removeManual(line.key)"
              >
                <Trash2 class="w-4 h-4" />
                {{ t('planning.transportOrders.linesDialog.remove') }}
              </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BaseFormField :label="t('planning.transportOrders.linesDialog.point')" required>
                <ReferenceLookup
                  v-model="line.deliveryPointNo"
                  reference-key="deliveryPoints"
                  :modal-title="t('planning.transportOrders.linesDialog.point')"
                  detail-path="/planning/delivery-points"
                />
              </BaseFormField>
              <BaseFormField :label="t('planning.transportOrders.linesDialog.product')" required>
                <ReferenceLookup
                  v-model="line.productNo"
                  reference-key="products"
                  :modal-title="t('planning.transportOrders.linesDialog.product')"
                  detail-path="/planning/products"
                />
              </BaseFormField>
              <BaseFormField :label="t('planning.transportOrders.linesDialog.quantity')" required>
                <FormInput v-model="line.quantity" type="number" :min="0" />
              </BaseFormField>
              <BaseFormField :label="t('planning.transportOrders.linesDialog.weight')">
                <FormInput v-model="line.weightKg" type="number" :min="0" />
              </BaseFormField>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ConfirmDialog>
</template>
