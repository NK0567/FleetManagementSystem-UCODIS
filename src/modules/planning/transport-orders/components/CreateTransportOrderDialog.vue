<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import {
  deliveryRequestService,
  type DeliveryRequestApi
} from '@/modules/planning/delivery-requests'
import { transportOrderService } from '../services/transportOrderService'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [no: string] }>()

const { t } = useI18n()
const requests = ref<DeliveryRequestApi[]>([])
const picked = ref<string[]>([])
const routeTemplateNo = ref('')
const plannedDeparture = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    error.value = null
    const page = await deliveryRequestService.getAll({
      page: 1,
      pageSize: 200,
      sortBy: 'desiredDate'
    })
    requests.value = page.data.items.filter(
      (request) => request.status === 'pending' || request.status === 'expired'
    )
  }
)

function toggle(no: string) {
  picked.value = picked.value.includes(no)
    ? picked.value.filter((item) => item !== no)
    : [...picked.value, no]
}

async function confirm() {
  loading.value = true
  error.value = null
  try {
    const created = await transportOrderService.create({
      routeTemplateNo: routeTemplateNo.value,
      plannedDeparture: plannedDeparture.value,
      deliveryRequestNos: picked.value
    })
    picked.value = []
    emit('created', created.no)
    emit('close')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.transportOrders.createError'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.transportOrders.createDialog.title')"
    :confirm-label="t('planning.transportOrders.action.createFromRequests')"
    :confirm-disabled="!picked.length"
    :loading="loading"
    panel-class="max-w-lg"
    @confirm="confirm"
    @cancel="emit('close')"
  >
    <p class="text-sm text-muted-foreground mb-3">
      {{ t('planning.transportOrders.createDialog.hint') }}
    </p>
    <p v-if="error" class="mb-3 text-sm text-destructive">{{ error }}</p>
    <div class="grid grid-cols-1 gap-2 mb-3">
      <ReferenceLookup
        v-model="routeTemplateNo"
        reference-key="routeTemplates"
        :modal-title="t('planning.transportOrders.form.routeTemplateNo')"
        detail-path="/fleet/route-templates"
      />
      <FormInput v-model="plannedDeparture" type="datetime-local" />
    </div>
    <div class="max-h-64 overflow-y-auto text-sm">
      <p v-if="!requests.length" class="text-muted-foreground">
        {{ t('planning.transportOrders.createDialog.empty') }}
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
          · {{ request.deliveryPointName }} · {{ request.quantity }} {{ request.unit }}
        </span>
      </label>
    </div>
  </ConfirmDialog>
</template>
