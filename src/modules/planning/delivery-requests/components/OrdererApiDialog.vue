<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { addDays, todayIso } from '@/utils/date'
import { deliveryRequestService } from '../services/deliveryRequestService'

/**
 * The API external orderers connect to, a delivery platform for instance, to send their own
 * orders (TRS01-US01). The mock has no gateway: the page shows how it is called and sends an
 * example order as the orderer would, with his demo key.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; sent: [] }>()

const { t } = useI18n()
const ordererNo = ref('CLI-002')
const sending = ref(false)
const error = ref<string | null>(null)
const sentNo = ref<string | null>(null)

const example = computed(() => ({
  apiKey: `demo-${ordererNo.value}`,
  deliveryPointNo: 'DP-002',
  externalReference: `API-${Date.now().toString().slice(-6)}`,
  desiredDate: addDays(todayIso(), 2),
  content: 'Épicerie, 6 palettes',
  unitCount: 6,
  lines: [{ productNo: 'PRD-001', quantity: 90, weightKg: 1350 }]
}))
const shown = ref('')
watch([() => ordererNo.value], () => (shown.value = JSON.stringify(example.value, null, 2)), {
  immediate: true
})

async function send() {
  sending.value = true
  error.value = null
  sentNo.value = null
  try {
    sentNo.value = await deliveryRequestService.sendThroughApi(JSON.parse(shown.value))
    emit('sent')
  } catch (cause) {
    error.value =
      cause instanceof SyntaxError
        ? t('planning.deliveryRequests.intake.apiInvalid')
        : apiErrorMessage(cause, t('planning.deliveryRequests.saveError'))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.deliveryRequests.intake.apiTitle')"
    :confirm-label="t('planning.deliveryRequests.intake.apiSend')"
    :loading="sending"
    panel-class="max-w-xl"
    @confirm="send"
    @cancel="emit('close')"
  >
    <div class="space-y-3 text-sm">
      <p class="text-muted-foreground">{{ t('planning.deliveryRequests.intake.apiHint') }}</p>
      <p class="font-mono text-xs bg-muted/40 rounded px-2 py-1">POST /public/orderer-api/orders</p>
      <BaseFormField :label="t('planning.deliveryRequests.intake.apiOrderer')">
        <ReferenceLookup
          v-model="ordererNo"
          reference-key="ordererCustomers"
          :modal-title="t('planning.deliveryRequests.intake.apiOrderer')"
        />
      </BaseFormField>
      <BaseFormField :label="t('planning.deliveryRequests.intake.apiBody')">
        <FormTextarea v-model="shown" :rows="12" class="font-mono text-xs" />
      </BaseFormField>
      <FormAlerts
        :error="error"
        :success="sentNo ? t('planning.deliveryRequests.intake.apiSent', { no: sentNo }) : null"
        @clear:error="error = null"
        @clear:success="sentNo = null"
      />
    </div>
  </ConfirmDialog>
</template>
