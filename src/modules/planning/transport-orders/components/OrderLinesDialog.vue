<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()
const requests = ref<DeliveryRequestApi[]>([])
const picked = ref<string[]>([])
const manual = ref<ManualLine[]>([])
let nextKey = 1

interface ManualLine {
  key: number
  deliveryPointNo: string
  productNo: string
  quantity: number | null
  weightKg: number | null
}

const incomplete = computed(() =>
  manual.value.some((line) => !line.deliveryPointNo || !line.productNo || !line.quantity)
)

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.order) return
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
    const page = await deliveryRequestService.getAll({ page: 1, pageSize: 200, sortBy: 'no' })
    const kept = new Set(picked.value)
    requests.value = page.data.items.filter(
      (request) =>
        kept.has(request.no) || request.status === 'pending' || request.status === 'expired'
    )
  }
)

function toggle(no: string) {
  picked.value = picked.value.includes(no)
    ? picked.value.filter((item) => item !== no)
    : [...picked.value, no]
}

function addManual() {
  manual.value = [
    ...manual.value,
    { key: nextKey++, deliveryPointNo: '', productNo: '', quantity: null, weightKg: null }
  ]
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
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.transportOrders.linesDialog.title')"
    :confirm-label="t('common.save')"
    :confirm-disabled="incomplete"
    :loading="loading"
    panel-class="max-w-lg"
    @confirm="confirm"
    @cancel="emit('cancel')"
  >
    <p v-if="error" class="mb-3 text-sm text-destructive">{{ error }}</p>
    <div class="max-h-80 overflow-y-auto space-y-4 text-sm">
      <div>
        <p class="font-medium text-card-foreground mb-2">
          {{ t('planning.transportOrders.linesDialog.requests') }}
        </p>
        <p v-if="!requests.length" class="text-muted-foreground">
          {{ t('planning.transportOrders.linesDialog.none') }}
        </p>
        <label
          v-for="request in requests"
          :key="request.no"
          class="flex items-start gap-2 py-1 cursor-pointer"
        >
          <input
            type="checkbox"
            class="mt-1"
            :checked="picked.includes(request.no)"
            @change="toggle(request.no)"
          />
          <span>
            <span class="font-medium">{{ request.no }}</span>
            · {{ request.deliveryPointName }} · {{ request.productName }} · {{ request.quantity }}
            {{ request.unit }}
          </span>
        </label>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="font-medium text-card-foreground">
            {{ t('planning.transportOrders.linesDialog.manual') }}
          </p>
          <button type="button" class="text-primary text-sm" @click="addManual">
            {{ t('planning.transportOrders.linesDialog.add') }}
          </button>
        </div>
        <div
          v-for="line in manual"
          :key="line.key"
          class="border border-border rounded p-3 mb-2 space-y-2"
        >
          <ReferenceLookup
            v-model="line.deliveryPointNo"
            reference-key="deliveryPoints"
            :modal-title="t('planning.transportOrders.linesDialog.point')"
            detail-path="/planning/delivery-points"
          />
          <ReferenceLookup
            v-model="line.productNo"
            reference-key="products"
            :modal-title="t('planning.transportOrders.linesDialog.product')"
            detail-path="/planning/products"
          />
          <div class="grid grid-cols-2 gap-2">
            <FormInput v-model="line.quantity" type="number" :min="0" />
            <FormInput v-model="line.weightKg" type="number" :min="0" />
          </div>
          <button
            type="button"
            class="text-sm text-destructive"
            @click="manual = manual.filter((item) => item.key !== line.key)"
          >
            {{ t('planning.transportOrders.linesDialog.remove') }}
          </button>
        </div>
      </div>
    </div>
  </ConfirmDialog>
</template>
