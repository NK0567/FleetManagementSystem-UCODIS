<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDays } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { appConfig } from '@/core/app/appConfig'
import { formatDateTime } from '@/utils/format'
import { tripService, type ResourceAvailabilityApi, type TripApi } from '@/modules/fleet/trips'
import { providerService, type ProviderApi } from '@/modules/fleet/providers'
import { transportOrderService } from '../services/transportOrderService'
import { loadFill } from '../domain/transportOrder'
import { orderPlanningService, type MeansNotesApi } from '../api/orderPlanningApi'
import LoadGauge from './LoadGauge.vue'
import type { Choice } from './ChoiceSelect.vue'
import type { TransportOrderApi } from '../types/transportOrder.types'

const props = defineProps<{
  open: boolean
  order: TransportOrderApi | null
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{ confirm: [body: Record<string, unknown>]; cancel: [] }>()

/** The internal carrier: the company itself, with the vehicles of its own fleet. */
const INTERNAL = 'internal'

const { t } = useI18n()
const carrierNo = ref(INTERNAL)
const useExistingTrip = ref(false)
const resources = ref<ResourceAvailabilityApi[]>([])
const trips = ref<TripApi[]>([])
const carriers = ref<ProviderApi[]>([])
const loadError = ref<string | null>(null)
const vehicleNo = ref('')
const trailerNo = ref('')
const driverNo = ref('')
const tripNo = ref('')
const carrierVehiclePlate = ref('')
const carrierDriverName = ref('')
/* Absences with their reason, expired documents and couplings over the window (TRS01-US07). */
const notes = ref<MeansNotesApi>({ absences: [], expiredVehicles: [], couplings: [] })

const internal = computed(() => carrierNo.value === INTERNAL)
const scheduleReady = computed(
  () => !!props.order?.plannedDeparture && !!props.order?.plannedArrival
)
/* A vehicle whose document is expired is not offered at all (TRS01-US07). */
const expired = computed(() => new Set(notes.value.expiredVehicles.map((item) => item.vehicleNo)))
const vehicles = computed(() =>
  resources.value.filter((item) => item.role === 'motorized' && !expired.value.has(item.no))
)
const trailers = computed(() =>
  resources.value.filter((item) => item.role === 'towed' && !expired.value.has(item.no))
)
const withheld = computed(() =>
  notes.value.expiredVehicles
    .map((item) => {
      const resource = resources.value.find((entry) => entry.no === item.vehicleNo)
      return resource ? `${resource.label} (${item.documents})` : ''
    })
    .filter(Boolean)
)
const drivers = computed(() => resources.value.filter((item) => item.role === 'driver'))
const carrier = computed(() => carriers.value.find((item) => item.no === carrierNo.value) ?? null)

const carrierChoices = computed<Choice[]>(() => [
  {
    value: INTERNAL,
    label: t('planning.transportOrders.plan.internal', { name: appConfig.companyName })
  },
  ...carriers.value.map((item) => ({
    value: item.no,
    label: item.authorized
      ? item.name
      : `${item.name} (${t('planning.transportOrders.plan.notAuthorized')})`,
    disabled: !item.authorized
  }))
])

const carrierVehicleChoices = computed<Choice[]>(() =>
  (carrier.value?.carrierVehicles ?? []).map((vehicle) => ({
    value: vehicle.plate,
    label: vehicle.description ? `${vehicle.plate} · ${vehicle.description}` : vehicle.plate
  }))
)

const confirmDisabled = computed(() => {
  if (!internal.value) return !carrierNo.value || !carrierVehiclePlate.value
  if (useExistingTrip.value) return !tripNo.value
  return !scheduleReady.value || !vehicleNo.value || !driverNo.value
})

/* A vehicle or a driver only held by another trip at that time stays selectable: the overlap is
 * shown in red and the planner decides. Anything else (not fit for the road, on leave) is not
 * offered. */
function choicesOf(items: ResourceAvailabilityApi[]): Choice[] {
  return items.map((item) => {
    // A driver away on approved leave shows its reason: leave, sickness, permission.
    const absence = notes.value.absences.find((entry) => entry.driverNo === item.no)
    const reasons = absence
      ? [
          absence.reason
            ? t('planning.transportOrders.plan.absentFor', { reason: absence.reason })
            : t('planning.transportOrders.plan.absent'),
          ...item.reasons
        ]
      : item.reasons
    return {
      value: item.no,
      label: item.available ? item.label : `${item.label} · ${reasons.join(', ')}`,
      disabled: !item.available && !item.busyOnly
    }
  })
}

/* The load of the order against the chosen combination: the trailer carries, else the vehicle. */
const chosenCapacity = computed(() => {
  const trailer = trailers.value.find((item) => item.no === trailerNo.value)
  const vehicle = vehicles.value.find((item) => item.no === vehicleNo.value)
  return trailer?.capacity ?? vehicle?.capacity ?? null
})
const chosenFill = computed(() =>
  loadFill(
    [
      {
        weightKg: props.order?.totalWeightKg ?? 0,
        volumeM3: props.order?.totalVolumeM3 ?? 0,
        quantity: props.order?.totalFuelL ?? 0,
        fuel: true
      }
    ],
    chosenCapacity.value
  )
)

const overlaps = computed(() =>
  [vehicleNo.value, trailerNo.value, driverNo.value]
    .map((no) => resources.value.find((item) => item.no === no))
    .filter((item): item is ResourceAvailabilityApi => !!item && item.busyOnly)
)

const tripChoices = computed<Choice[]>(() =>
  trips.value.map((trip) => ({
    value: trip.no,
    label: [trip.no, trip.routeName, trip.vehiclePlate, formatDateTime(trip.plannedDeparture)]
      .filter(Boolean)
      .join(' · ')
  }))
)

/* The driver assigned to the vehicle is proposed by default; the planner can change it at any
 * time, for instance when that driver falls sick the day before. */
watch(vehicleNo, (no) => {
  const assigned = vehicles.value.find((item) => item.no === no)?.assignedDriverNo
  if (assigned && drivers.value.some((item) => item.no === assigned)) driverNo.value = assigned
  // The trailer coupled to the tractor is proposed; it stays changeable by hand (TRS01-US07).
  const coupled = notes.value.couplings.find((item) => item.tractorNo === no)?.trailerNo
  if (coupled && trailers.value.some((item) => item.no === coupled)) trailerNo.value = coupled
})

watch(carrierNo, () => {
  carrierVehiclePlate.value = carrierVehicleChoices.value[0]?.value ?? ''
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    carrierNo.value = INTERNAL
    useExistingTrip.value = false
    vehicleNo.value = ''
    trailerNo.value = ''
    driverNo.value = ''
    tripNo.value = ''
    carrierVehiclePlate.value = ''
    carrierDriverName.value = ''
    loadError.value = null
    resources.value = []
    const order = props.order
    try {
      const page = await providerService.getAll({
        page: 1,
        pageSize: 100,
        filters: [{ field: 'providerType', valueType: 'string', value: 'carrier' }],
        sortBy: 'name'
      })
      carriers.value = page.data.items
    } catch (error) {
      loadError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
    }
    if (order?.plannedDeparture && order.plannedArrival) {
      try {
        const [window, found] = await Promise.all([
          transportOrderService.availability(order.plannedDeparture, order.plannedArrival),
          orderPlanningService.meansNotes(order.plannedDeparture, order.plannedArrival)
        ])
        notes.value = found
        resources.value = [...window.vehicles, ...window.drivers].sort(
          (a, b) => Number(b.available) - Number(a.available)
        )
        // The vehicle the loading proposal chose comes first (TRS01-US10).
        if (
          order.proposedVehicleNo &&
          vehicles.value.some((item) => item.no === order.proposedVehicleNo)
        ) {
          vehicleNo.value = order.proposedVehicleNo
          if (order.proposedTrailerNo) trailerNo.value = order.proposedTrailerNo
        }
      } catch (error) {
        loadError.value = apiErrorMessage(error, t('planning.transportOrders.saveError'))
      }
    }
    if (order?.proposedCarrierNo) carrierNo.value = order.proposedCarrierNo
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
  if (!internal.value) {
    emit('confirm', {
      means: 'carrier',
      carrierNo: carrierNo.value,
      carrierVehiclePlate: carrierVehiclePlate.value,
      carrierDriverName: carrierDriverName.value
    })
    return
  }
  if (useExistingTrip.value) {
    emit('confirm', { means: 'fleet', tripNo: tripNo.value })
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
      <BaseFormField :label="t('planning.transportOrders.plan.carrier')" required>
        <ChoiceSelect v-model="carrierNo" :choices="carrierChoices" />
      </BaseFormField>

      <template v-if="internal">
        <label class="inline-flex items-center gap-2 text-sm text-card-foreground">
          <input v-model="useExistingTrip" type="checkbox" class="h-4 w-4 accent-primary" />
          {{ t('planning.transportOrders.plan.fleetTrip') }}
        </label>
        <BaseFormField
          v-if="useExistingTrip"
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
              <p class="text-xs text-muted-foreground mt-1">
                {{ t('planning.transportOrders.plan.driverHint') }}
              </p>
            </BaseFormField>
            <div v-if="vehicleNo" class="rounded border border-border p-3">
              <LoadGauge
                :fill="chosenFill"
                :capacity="chosenCapacity"
                :weight-kg="order?.totalWeightKg ?? 0"
                :volume-m3="order?.totalVolumeM3 ?? 0"
                :liters="order?.totalFuelL ?? 0"
              />
            </div>
            <p v-if="withheld.length" class="text-xs text-muted-foreground">
              {{ t('planning.transportOrders.plan.withheld', { vehicles: withheld.join(', ') }) }}
            </p>
            <div
              v-if="overlaps.length"
              class="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
            >
              <p class="font-medium text-destructive">
                {{ t('planning.transportOrders.plan.overlapTitle') }}
              </p>
              <p v-for="item in overlaps" :key="item.no" class="text-card-foreground">
                {{ item.reasons.join(', ') }}
              </p>
              <RouterLink
                to="/planning/calendar"
                class="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                target="_blank"
              >
                <CalendarDays class="w-4 h-4" />
                {{ t('planning.transportOrders.plan.openCalendar') }}
              </RouterLink>
            </div>
            <p
              v-if="resources.length && !vehicles.some((item) => item.available || item.busyOnly)"
              class="text-sm text-muted-foreground"
            >
              {{ t('planning.transportOrders.plan.noMeans') }}
            </p>
          </template>
        </template>
      </template>

      <template v-else>
        <BaseFormField :label="t('planning.transportOrders.plan.carrierVehicle')" required>
          <ChoiceSelect
            v-if="carrierVehicleChoices.length"
            v-model="carrierVehiclePlate"
            :choices="carrierVehicleChoices"
            :placeholder="t('planning.transportOrders.plan.pick')"
          />
          <p v-else class="text-sm text-destructive">
            {{ t('planning.transportOrders.plan.noCarrierVehicle') }}
          </p>
        </BaseFormField>
        <BaseFormField :label="t('planning.transportOrders.plan.carrierDriver')">
          <FormInput v-model="carrierDriverName" :maxlength="80" />
        </BaseFormField>
      </template>
    </div>
  </ConfirmDialog>
</template>
