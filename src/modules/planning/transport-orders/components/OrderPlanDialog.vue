<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { formatDateTime } from '@/utils/format'
import { tripService, type ResourceAvailabilityApi, type TripApi } from '@/modules/fleet/trips'
import { transportOrderService } from '../services/transportOrderService'
import type { Choice } from './ChoiceSelect.vue'
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

function choicesOf(items: ResourceAvailabilityApi[]): Choice[] {
  return items.map((item) => ({
    value: item.no,
    label: item.available ? item.label : `${item.label} — ${item.reasons.join(', ')}`,
    disabled: !item.available
  }))
}

const tripChoices = computed<Choice[]>(() =>
  trips.value.map((trip) => ({
    value: trip.no,
    label: [trip.no, trip.routeName, trip.vehiclePlate, formatDateTime(trip.plannedDeparture)]
      .filter(Boolean)
      .join(' · ')
  }))
)

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
    try {
      const page = await tripService.getAll({
        page: 1,
        pageSize: 100,
        filters: [{ field: 'status', valueType: 'string', value: 'planned' }],
        sortBy: 'plannedDeparture'
      })
      trips.value = page.data.items
    } catch (error) {
      loadError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
    }
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
    <FormAlerts class="mb-3" :error="error || loadError" @clear:error="loadError = null" />
    <div class="space-y-3">
      <nav
        class="flex flex-wrap gap-1 border-b border-border"
        :aria-label="t('planning.transportOrders.plan.mode')"
      >
        <button
          v-for="choice in MODES"
          :key="choice.id"
          type="button"
          class="cursor-pointer px-3 py-2 text-sm border-b-2 -mb-px transition"
          :class="
            mode === choice.id
              ? 'border-primary text-card-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-card-foreground'
          "
          @click="mode = choice.id"
        >
          {{ t(choice.label) }}
        </button>
      </nav>
      <template v-if="mode === 'new'">
        <p v-if="!scheduleReady" class="text-sm text-muted-foreground">
          {{ t('planning.transportOrders.plan.needsSchedule') }}
        </p>
        <template v-else>
          <BaseFormField :label="t('planning.transportOrders.plan.vehicle')" required>
            <ChoiceSelect
              v-model="vehicleNo"
              :choices="choicesOf(vehicles)"
              :placeholder="t('planning.transportOrders.plan.pick')"
            />
          </BaseFormField>
          <BaseFormField :label="t('planning.transportOrders.plan.trailer')">
            <ChoiceSelect
              v-model="trailerNo"
              :choices="choicesOf(trailers)"
              :placeholder="t('planning.transportOrders.plan.none')"
              clearable
            />
          </BaseFormField>
          <BaseFormField :label="t('planning.transportOrders.plan.driver')" required>
            <ChoiceSelect
              v-model="driverNo"
              :choices="choicesOf(drivers)"
              :placeholder="t('planning.transportOrders.plan.pick')"
            />
          </BaseFormField>
          <p
            v-if="resources.length && !vehicles.some((item) => item.available)"
            class="text-sm text-muted-foreground"
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
        <ChoiceSelect
          v-model="tripNo"
          :choices="tripChoices"
          :placeholder="t('planning.transportOrders.plan.pick')"
        />
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
