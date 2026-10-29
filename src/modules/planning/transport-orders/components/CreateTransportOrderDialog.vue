<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorBody, apiErrorMessage } from '@/core/api/apiError'
import {
  deliveryRequestService,
  type DeliveryRequestApi
} from '@/modules/planning/delivery-requests'
import { transportOrderService } from '../services/transportOrderService'
import { toLineInputs, type PickedLines, type PickedQuantities } from '../domain/requestPick'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [no: string] }>()

const { t } = useI18n()
const requests = ref<DeliveryRequestApi[]>([])
const picked = ref<string[]>([])
const pickedLines = ref<PickedLines>({})
const pickedQuantities = ref<PickedQuantities>({})
/** A warning the planner may override (excess of capacity, partial delivery); the next confirm
 * sends the order anyway. */
const warning = ref<string | null>(null)
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
    warning.value = null
    picked.value = []
    pickedLines.value = {}
    pickedQuantities.value = {}
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
  const force = !!warning.value
  try {
    const created = await transportOrderService.create({
      routeTemplateNo: routeTemplateNo.value,
      plannedDeparture: plannedDeparture.value,
      lines: toLineInputs(requests.value, picked.value, pickedLines.value, pickedQuantities.value),
      ...(force ? { force: true } : {})
    })
    warning.value = null
    picked.value = []
    pickedLines.value = {}
    emit('created', created.no)
    emit('close')
  } catch (cause) {
    if (!force && apiErrorBody(cause)?.errorCode === 'PLANNING_WARNINGS') {
      warning.value = apiErrorMessage(cause, t('planning.transportOrders.createError'))
    } else {
      error.value = apiErrorMessage(cause, t('planning.transportOrders.createError'))
    }
  } finally {
    loading.value = false
  }
}

/* Any change to the selection drops the warning: it was given for another set of lines. */
watch([picked, pickedLines], () => (warning.value = null), { deep: true })
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.transportOrders.createDialog.title')"
    :confirm-label="
      warning
        ? t('planning.transportOrders.warning.override')
        : t('planning.transportOrders.action.createFromRequests')
    "
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
      <div
        v-if="warning"
        class="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-card-foreground"
      >
        <p class="font-medium">{{ t('planning.transportOrders.warning.title') }}</p>
        <p class="whitespace-pre-line">{{ warning }}</p>
      </div>
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
        v-model:lines="pickedLines"
        v-model:quantities="pickedQuantities"
        :requests="requests"
        :loading="loadingRequests"
        :date="plannedDeparture || null"
        :empty-message="t('planning.transportOrders.createDialog.empty')"
      />
      <p class="text-xs text-muted-foreground text-right">
        {{ t('planning.transportOrders.createDialog.picked', picked.length) }}
      </p>
    </div>
  </ConfirmDialog>
</template>
