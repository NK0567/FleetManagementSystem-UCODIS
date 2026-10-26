<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { tripService, type ResourceAvailabilityApi, type TripApi } from '@/modules/fleet/trips'
import { transportOrderService } from '../services/transportOrderService'
import type { TransportOrderApi } from '../types/transportOrder.types'

const props = defineProps<{
  open: boolean
  order: TransportOrderApi | null
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{ confirm: [body: Record<string, unknown>]; cancel: [] }>()

const MODES = [
  { id: 'new', label: 'planning.transportOrders.plan.fleetNew' },
  { id: 'trip', label: 'planning.transportOrders.plan.fleetTrip' },
  { id: 'carrier', label: 'planning.transportOrders.plan.carrier' }
] as const
type Mode = (typeof MODES)[number]['id']

const { t } = useI18n()
const mode = ref<Mode>('new')
const resources = ref<ResourceAvailabilityApi[]>([])
const trips = ref<TripApi[]>([])
const loadError = ref<string | null>(null)
const vehicleNo = ref('')
const trailerNo = ref('')
const driverNo = ref('')
const tripNo = ref('')
const carrierNo = ref('')
const carrierVehiclePlate = ref('')
const carrierDriverName = ref('')

const scheduleReady = computed(
  () => !!props.order?.plannedDeparture && !!props.order?.plannedArrival
)
const vehicles = computed(() => resources.value.filter((item) => item.role === 'motorized'))
const trailers = computed(() => resources.value.filter((item) => item.role === 'towed'))
const drivers = computed(() => resources.value.filter((item) => item.role === 'driver'))

const confirmDisabled = computed(() => {
  if (mode.value === 'new') return !scheduleReady.value || !vehicleNo.value || !driverNo.value
  if (mode.value === 'trip') return !tripNo.value
  return !carrierNo.value
})

function labelOf(item: ResourceAvailabilityApi): string {
  return item.available ? item.label : `${item.label} — ${item.reasons.join(', ')}`
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    mode.value = 'new'
    vehicleNo.value = ''
    trailerNo.value = ''
    driverNo.value = ''
    tripNo.value = ''
    carrierNo.value = ''
    carrierVehiclePlate.value = ''
    carrierDriverName.value = ''
    loadError.value = null
    resources.value = []
    const order = props.order
    if (order?.plannedDeparture && order.plannedArrival) {
      try {
        const window = await transportOrderService.availability(
          order.plannedDeparture,
          order.plannedArrival
        )
        resources.value = [...window.vehicles, ...window.drivers].sort(
          (a, b) => Number(b.available) - Number(a.available)
        )
      } catch (error) {
        loadError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
      }
    }
    const page = await tripService.getAll({
      page: 1,
      pageSize: 100,
      filters: [{ field: 'status', valueType: 'string', value: 'planned' }],
      sortBy: 'plannedDeparture'
    })
    trips.value = page.data.items
  }
)

function confirm() {
  if (mode.value === 'trip') {
    emit('confirm', { means: 'fleet', tripNo: tripNo.value })
    return
  }
  if (mode.value === 'carrier') {
    emit('confirm', {
      means: 'carrier',
      carrierNo: carrierNo.value,
      carrierVehiclePlate: carrierVehiclePlate.value,
      carrierDriverName: carrierDriverName.value
    })
    return
  }
  emit('confirm', {
    means: 'fleet',
    vehicleNo: vehicleNo.value,
    trailerNo: trailerNo.value || null,
    driverNo: driverNo.value
  })
}
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.transportOrders.plan.title')"
    :confirm-label="t('planning.transportOrders.action.plan')"
    :confirm-disabled="confirmDisabled"
    :loading="loading"
    panel-class="max-w-lg"
    @confirm="confirm"
    @cancel="emit('cancel')"
  >
    <p v-if="error || loadError" class="mb-3 text-sm text-destructive">{{ error || loadError }}</p>
    <div class="space-y-3 text-sm">
      <div class="flex flex-col gap-1">
        <label v-for="choice in MODES" :key="choice.id" class="flex items-center gap-2">
          <input v-model="mode" type="radio" :value="choice.id" />
          {{ t(choice.label) }}
        </label>
      </div>
      <template v-if="mode === 'new'">
        <p v-if="!scheduleReady" class="text-muted-foreground">
          {{ t('planning.transportOrders.plan.needsSchedule') }}
        </p>
        <template v-else>
          <BaseFormField :label="t('planning.transportOrders.plan.vehicle')" required>
            <select
              v-model="vehicleNo"
              class="w-full border border-border rounded px-2 py-1.5 bg-card"
            >
              <option value="" disabled>{{ t('planning.transportOrders.plan.pick') }}</option>
              <option
                v-for="item in vehicles"
                :key="item.no"
                :value="item.no"
                :disabled="!item.available"
              >
                {{ labelOf(item) }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('planning.transportOrders.plan.trailer')">
            <select
              v-model="trailerNo"
              class="w-full border border-border rounded px-2 py-1.5 bg-card"
            >
              <option value="">{{ t('planning.transportOrders.plan.none') }}</option>
              <option
                v-for="item in trailers"
                :key="item.no"
                :value="item.no"
                :disabled="!item.available"
              >
                {{ labelOf(item) }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('planning.transportOrders.plan.driver')" required>
            <select
              v-model="driverNo"
              class="w-full border border-border rounded px-2 py-1.5 bg-card"
            >
              <option value="" disabled>{{ t('planning.transportOrders.plan.pick') }}</option>
              <option
                v-for="item in drivers"
                :key="item.no"
                :value="item.no"
                :disabled="!item.available"
              >
                {{ labelOf(item) }}
              </option>
            </select>
          </BaseFormField>
          <p
            v-if="resources.length && !vehicles.some((item) => item.available)"
            class="text-muted-foreground"
          >
            {{ t('planning.transportOrders.plan.noMeans') }}
          </p>
        </template>
      </template>
      <BaseFormField
        v-else-if="mode === 'trip'"
        :label="t('planning.transportOrders.plan.trip')"
        required
      >
        <select v-model="tripNo" class="w-full border border-border rounded px-2 py-1.5 bg-card">
          <option value="" disabled>{{ t('planning.transportOrders.plan.pick') }}</option>
          <option v-for="trip in trips" :key="trip.no" :value="trip.no">
            {{ trip.no }} · {{ trip.routeName }} · {{ trip.vehiclePlate }}
          </option>
        </select>
      </BaseFormField>
      <template v-else>
        <BaseFormField :label="t('planning.transportOrders.form.carrier')" required>
          <ReferenceLookup
            v-model="carrierNo"
            reference-key="carriers"
            :modal-title="t('planning.transportOrders.form.carrier')"
            detail-path="/fleet/providers"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.transportOrders.plan.carrierVehicle')">
          <FormInput v-model="carrierVehiclePlate" :maxlength="20" />
        </BaseFormField>
        <BaseFormField :label="t('planning.transportOrders.plan.carrierDriver')">
          <FormInput v-model="carrierDriverName" :maxlength="80" />
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>
</template>
