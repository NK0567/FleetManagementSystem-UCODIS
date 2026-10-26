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
const loadingRequests = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    error.value = null
    picked.value = []
    loadingRequests.value = true
    try {
      const page = await deliveryRequestService.getAll({
        page: 1,
        pageSize: 200,
        sortBy: 'desiredDate'
      })
      requests.value = page.data.items.filter(
        (request) => request.status === 'pending' || request.status === 'expired'
      )
    } catch (cause) {
      error.value = apiErrorMessage(cause, t('planning.transportOrders.createError'))
    } finally {
      loadingRequests.value = false
    }
  }
)

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
    panel-class="max-w-2xl"
    @confirm="confirm"
    @cancel="emit('close')"
  >
    <div class="space-y-3">
      <p class="text-sm text-muted-foreground">
        {{ t('planning.transportOrders.createDialog.hint') }}
      </p>
      <FormAlerts :error="error" @clear:error="error = null" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BaseFormField :label="t('planning.transportOrders.form.routeTemplateNo')">
          <ReferenceLookup
            v-model="routeTemplateNo"
            reference-key="routeTemplates"
            :modal-title="t('planning.transportOrders.form.routeTemplateNo')"
            detail-path="/fleet/route-templates"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.transportOrders.createDialog.departure')">
          <FormInput v-model="plannedDeparture" type="datetime-local" />
        </BaseFormField>
      </div>
      <RequestPickerTable
        v-model="picked"
        :requests="requests"
        :loading="loadingRequests"
        :empty-message="t('planning.transportOrders.createDialog.empty')"
      />
      <p class="text-xs text-muted-foreground text-right">
        {{ t('planning.transportOrders.createDialog.picked', picked.length) }}
      </p>
    </div>
  </ConfirmDialog>
</template>
