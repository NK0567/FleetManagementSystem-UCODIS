<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Wrench } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { workOrderService } from '../services/workOrderService'

/**
 * The work order of a fleet record: a link once opened, else a button to open it when the record calls
 * for a repair. The server takes the vehicle, severity and symptom from the record.
 */
const props = defineProps<{
  origin: 'claim' | 'road_checklist' | 'inspection' | 'telematics'
  originNo: string
  workOrderNo: string | null
  /** Whether the record calls for a repair at all. */
  eligible: boolean
}>()

const { t } = useI18n()
const router = useRouter()
const { canInsert } = usePermissions('WORKORDER')
const opening = ref(false)
const error = ref<string | null>(null)

const orderLink = (no: string) => ({
  path: '/maintenance/work-orders',
  query: { no, cardMode: 'view' }
})

async function openOrder() {
  opening.value = true
  error.value = null
  try {
    const order = await workOrderService.openFromSource(props.origin, props.originNo)
    await router.push(orderLink(order.no))
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('maintenance.workOrders.actionError'))
  } finally {
    opening.value = false
  }
}
</script>

<template>
  <RouterLink
    v-if="workOrderNo"
    :to="orderLink(workOrderNo)"
    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-accent border border-border rounded transition"
  >
    <Wrench class="w-5 h-5" /> {{ workOrderNo }}
  </RouterLink>
  <button
    v-else-if="eligible && canInsert"
    type="button"
    class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
    :disabled="opening"
    :title="error ?? undefined"
    @click="openOrder"
  >
    <Wrench class="w-5 h-5 text-primary" /> {{ t('maintenance.workOrders.action.openFromSource') }}
  </button>
  <span v-if="error" class="text-xs text-destructive self-center">{{ error }}</span>
</template>
