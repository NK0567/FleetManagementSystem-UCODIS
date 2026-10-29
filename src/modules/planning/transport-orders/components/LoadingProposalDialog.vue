<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eraser, Plus, RefreshCw, Sparkles } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { providerService, type ProviderApi } from '@/modules/fleet/providers'
import { addDays, todayIso } from '@/utils/date'
import { formatNumber } from '@/utils/format'
import { orderPlanningService } from '../api/orderPlanningApi'
import type {
  LoadingProposalApi,
  ProposalAssignment,
  ProposalCarrierGroup,
  ProposalRequestApi
} from '../types/loadingProposal.types'
import LoadGauge from './LoadGauge.vue'

/**
 * A loading proposal for a day (TRS01-US10): the orders put on the free vehicles of the fleet by
 * destination, weight and volume, under the rules of the products, the vehicles and their
 * compartments. The planner moves an order by hand, gives some to an external carrier (TRS01-US09),
 * runs the proposal again or clears it to assign everything himself, then validates: each vehicle
 * becomes a pending transport order, its vehicle kept for planning.
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [orderNos: string[]] }>()

const { t } = useI18n()
const date = ref(addDays(todayIso(), 1))
const proposal = ref<LoadingProposalApi | null>(null)
const carriers = ref<ProviderApi[]>([])
/** Orders given to an external carrier, one group per carrier. */
const carrierGroups = ref<ProposalCarrierGroup[]>([])
const busy = ref(false)
const error = ref<string | null>(null)

const UNASSIGNED = ''
const CARRIER = 'carrier:'

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    error.value = null
    proposal.value = null
    carrierGroups.value = []
    try {
      const page = await providerService.getAll({
        page: 1,
        pageSize: 100,
        filters: [{ field: 'providerType', valueType: 'string', value: 'carrier' }],
        sortBy: 'name'
      })
      carriers.value = page.data.items.filter((item) => item.authorized)
    } catch {
      carriers.value = []
    }
  }
)

async function run(step: () => Promise<LoadingProposalApi>) {
  busy.value = true
  error.value = null
  try {
    proposal.value = await step()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.transportOrders.proposal.error'))
  } finally {
    busy.value = false
  }
}

const assignments = (): ProposalAssignment[] =>
  (proposal.value?.vehicles ?? []).map((vehicle) => ({
    vehicleNo: vehicle.vehicleNo,
    trailerNo: vehicle.trailerNo,
    requestNos: vehicle.requests.map((item) => item.no)
  }))

const propose = () => {
  carrierGroups.value = []
  return run(() => orderPlanningService.propose(date.value))
}
const evaluate = (next: ProposalAssignment[]) =>
  run(() => orderPlanningService.evaluate(date.value, next, carrierGroups.value))

/** Everything back to assign by hand, the vehicles kept to receive the orders. */
function clear() {
  carrierGroups.value = []
  void evaluate(assignments().map((item) => ({ ...item, requestNos: [] })))
}

const targets = computed(() => [
  { value: UNASSIGNED, label: t('planning.transportOrders.proposal.unassigned') },
  ...(proposal.value?.vehicles ?? []).map((vehicle) => ({
    value: vehicle.vehicleNo,
    label: [vehicle.plate, vehicle.trailerPlate].filter(Boolean).join(' + ')
  })),
  ...carriers.value.map((carrier) => ({
    value: `${CARRIER}${carrier.no}`,
    label: t('planning.transportOrders.proposal.toCarrier', { name: carrier.name })
  }))
])

const placeOf = (no: string) => {
  const vehicle = proposal.value?.vehicles.find((item) =>
    item.requests.some((request) => request.no === no)
  )
  if (vehicle) return vehicle.vehicleNo
  const group = carrierGroups.value.find((item) => item.requestNos.includes(no))
  return group ? `${CARRIER}${group.carrierNo}` : UNASSIGNED
}

/** Moves an order to a vehicle, to a carrier or back to the pool; the same rules judge it. */
function move(no: string, target: string) {
  const next = assignments().map((item) => ({
    ...item,
    requestNos: item.requestNos.filter((other) => other !== no)
  }))
  carrierGroups.value = carrierGroups.value
    .map((group) => ({ ...group, requestNos: group.requestNos.filter((other) => other !== no) }))
    .filter((group) => group.requestNos.length)
  if (target.startsWith(CARRIER)) {
    const carrierNo = target.slice(CARRIER.length)
    const group = carrierGroups.value.find((item) => item.carrierNo === carrierNo)
    if (group) group.requestNos.push(no)
    else carrierGroups.value.push({ carrierNo, requestNos: [no] })
  } else if (target) {
    next.find((item) => item.vehicleNo === target)?.requestNos.push(no)
  }
  void evaluate(next)
}

const adding = ref('')
function addVehicle() {
  const combination = proposal.value?.available.find((item) => item.vehicleNo === adding.value)
  if (!combination) return
  adding.value = ''
  void evaluate([...assignments(), { ...combination, requestNos: [] }])
}
const addable = computed(() =>
  (proposal.value?.available ?? []).filter(
    (item) => !proposal.value?.vehicles.some((vehicle) => vehicle.vehicleNo === item.vehicleNo)
  )
)

const carrierRequests = computed(() =>
  carrierGroups.value.map((group) => ({
    group,
    name: carriers.value.find((item) => item.no === group.carrierNo)?.name ?? group.carrierNo,
    requests: group.requestNos
      .map((no) => known.value.get(no))
      .filter((item): item is ProposalRequestApi => !!item)
  }))
)
/** Every order of the day, wherever it stands now, to show those given to a carrier. */
const known = ref(new Map<string, ProposalRequestApi>())
watch(proposal, (value) => {
  for (const vehicle of value?.vehicles ?? []) {
    for (const request of vehicle.requests) known.value.set(request.no, request)
  }
  for (const request of value?.unassigned ?? []) known.value.set(request.no, request)
})

const blocking = computed(() => (proposal.value?.vehicles ?? []).some((v) => v.issues.length))

async function validate() {
  busy.value = true
  error.value = null
  try {
    const result = await orderPlanningService.validate(
      date.value,
      assignments().filter((item) => item.requestNos.length),
      carrierGroups.value
    )
    emit('created', result.orderNos)
    emit('close')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.transportOrders.proposal.error'))
  } finally {
    busy.value = false
  }
}

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed'
const selectClass =
  'h-7 px-2 text-xs border border-border rounded bg-background max-w-52 focus:border-primary outline-none'
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="t('planning.transportOrders.proposal.title')"
    :confirm-label="t('planning.transportOrders.proposal.validate')"
    :confirm-disabled="!proposal || blocking || busy"
    :loading="busy"
    panel-class="max-w-5xl"
    @confirm="validate"
    @cancel="emit('close')"
  >
    <div class="max-h-[70vh] overflow-y-auto space-y-4 text-sm">
      <p class="text-muted-foreground">{{ t('planning.transportOrders.proposal.hint') }}</p>
      <div class="flex flex-wrap items-end gap-3">
        <BaseFormField :label="t('planning.transportOrders.proposal.date')" required>
          <DateFormInput v-model="date" />
        </BaseFormField>
        <button type="button" :class="buttonClass" :disabled="busy || !date" @click="propose">
          <component :is="proposal ? RefreshCw : Sparkles" class="w-4 h-4 text-primary" />
          {{
            proposal
              ? t('planning.transportOrders.proposal.rerun')
              : t('planning.transportOrders.proposal.run')
          }}
        </button>
        <button v-if="proposal" type="button" :class="buttonClass" :disabled="busy" @click="clear">
          <Eraser class="w-4 h-4 text-primary" />
          {{ t('planning.transportOrders.proposal.clear') }}
        </button>
      </div>
      <FormAlerts :error="error" @clear:error="error = null" />

      <template v-if="proposal">
        <div
          v-if="proposal.remaining.length"
          class="rounded border border-warning/50 bg-warning/10 px-3 py-2"
        >
          <p class="font-medium text-card-foreground">
            {{ t('planning.transportOrders.proposal.remaining') }}
          </p>
          <p v-for="item in proposal.remaining" :key="item.productNo">
            {{ item.productName }} · {{ formatNumber(item.quantity, 1) }} {{ item.unit }}
          </p>
        </div>

        <p v-if="!proposal.vehicles.length" class="text-muted-foreground">
          {{ t('planning.transportOrders.proposal.noVehicle') }}
        </p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div
            v-for="vehicle in proposal.vehicles"
            :key="vehicle.vehicleNo"
            class="rounded border border-border p-3 space-y-2"
          >
            <p class="font-semibold text-card-foreground">
              {{ [vehicle.plate, vehicle.trailerPlate].filter(Boolean).join(' + ') }}
              <span
                v-if="vehicle.families.length"
                class="text-xs font-normal text-muted-foreground"
              >
                · {{ vehicle.families.join(', ') }}
              </span>
            </p>
            <LoadGauge
              :fill="vehicle.fill"
              :capacity="vehicle.capacity"
              :weight-kg="vehicle.requests.reduce((total, item) => total + item.weightKg, 0)"
              :volume-m3="vehicle.requests.reduce((total, item) => total + item.volumeM3, 0)"
              :liters="vehicle.requests.reduce((total, item) => total + item.liters, 0)"
            />
            <p v-for="issue in vehicle.issues" :key="issue" class="text-xs text-destructive">
              {{ issue }}
            </p>
            <p v-for="warning in vehicle.warnings" :key="warning" class="text-xs text-warning">
              {{ warning }}
            </p>
            <p v-if="!vehicle.requests.length" class="text-xs text-muted-foreground">
              {{ t('planning.transportOrders.proposal.empty') }}
            </p>
            <div
              v-for="request in vehicle.requests"
              :key="request.no"
              class="flex items-start justify-between gap-2 border-t border-border pt-2"
            >
              <div class="min-w-0">
                <p>{{ request.no }} · {{ request.recipientName || request.deliveryPointName }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ request.region }} · {{ request.summary }} ·
                  {{ formatNumber(request.weightKg, 0) }} kg
                </p>
              </div>
              <select
                :class="selectClass"
                :value="placeOf(request.no)"
                :disabled="busy"
                :aria-label="t('planning.transportOrders.proposal.move')"
                @change="move(request.no, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="target in targets" :key="target.value" :value="target.value">
                  {{ target.label }}
                </option>
              </select>
            </div>
            <div v-if="vehicle.compartments.length" class="border-t border-border pt-2">
              <p class="text-xs font-medium text-muted-foreground mb-1">
                {{ t('planning.transportOrders.proposal.compartments') }}
              </p>
              <p v-for="use in vehicle.compartments" :key="use.no" class="text-xs">
                {{ t('planning.transportOrders.proposal.compartment', { no: use.no }) }} ·
                {{ formatNumber(use.usedL, 0) }} / {{ formatNumber(use.volumeL, 0) }} L ·
                {{ use.lines.map((item) => item.productName).join(', ') || '·' }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="addable.length" class="flex items-center gap-2">
          <select v-model="adding" :class="selectClass">
            <option value="">{{ t('planning.transportOrders.proposal.addVehicle') }}</option>
            <option v-for="item in addable" :key="item.vehicleNo" :value="item.vehicleNo">
              {{ item.label }}
            </option>
          </select>
          <button
            type="button"
            :class="buttonClass"
            :disabled="!adding || busy"
            @click="addVehicle"
          >
            <Plus class="w-4 h-4 text-primary" /> {{ t('planning.transportOrders.proposal.add') }}
          </button>
        </div>

        <div
          v-for="item in carrierRequests"
          :key="item.group.carrierNo"
          class="rounded border border-border p-3"
        >
          <p class="font-semibold text-card-foreground">
            {{ t('planning.transportOrders.proposal.toCarrier', { name: item.name }) }}
          </p>
          <div
            v-for="request in item.requests"
            :key="request.no"
            class="flex items-start justify-between gap-2 border-t border-border pt-2 mt-2"
          >
            <p>{{ request.no }} · {{ request.recipientName || request.deliveryPointName }}</p>
            <select
              :class="selectClass"
              :value="placeOf(request.no)"
              :disabled="busy"
              :aria-label="t('planning.transportOrders.proposal.move')"
              @change="move(request.no, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="target in targets" :key="target.value" :value="target.value">
                {{ target.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="proposal.unassigned.length">
          <p class="font-semibold text-card-foreground mb-1">
            {{ t('planning.transportOrders.proposal.unassignedTitle') }}
          </p>
          <div
            v-for="request in proposal.unassigned.filter((item) => placeOf(item.no) === UNASSIGNED)"
            :key="request.no"
            class="flex items-start justify-between gap-2 border-t border-border py-2"
          >
            <div class="min-w-0">
              <p>{{ request.no }} · {{ request.recipientName || request.deliveryPointName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ request.summary }} · {{ formatNumber(request.weightKg, 0) }} kg ·
                {{ request.reason }}
              </p>
            </div>
            <select
              :class="selectClass"
              :value="UNASSIGNED"
              :disabled="busy"
              :aria-label="t('planning.transportOrders.proposal.move')"
              @change="move(request.no, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="target in targets" :key="target.value" :value="target.value">
                {{ target.label }}
              </option>
            </select>
          </div>
        </div>
      </template>
    </div>
  </ConfirmDialog>
</template>
