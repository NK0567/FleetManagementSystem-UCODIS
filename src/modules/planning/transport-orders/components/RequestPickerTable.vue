<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Search, Users, X } from '@lucide/vue'
import type { LoadCapacity } from '@/modules/fleet/vehicles/domain/capacity'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests'
import { formatDate, formatNumber } from '@/utils/format'
import { loadFill } from '../domain/transportOrder'
import { partlyTaken, type PickedLines, type PickedQuantities } from '../domain/requestPick'
import LoadGauge from './LoadGauge.vue'

const props = defineProps<{
  requests: DeliveryRequestApi[]
  loading?: boolean
  emptyMessage: string
  /** Day of the order (YYYY-MM-DD): only the orders to deliver that day are offered by default. */
  date?: string | null
  /** Product categories the vehicle is kept for: the other orders are hidden by default. */
  families?: string[]
  /** What the chosen vehicle carries: the picked orders are compared with it as they are ticked. */
  capacity?: LoadCapacity | null
  /** Weight and volume already in the order besides the orders offered here (lines keyed by hand). */
  extraWeightKg?: number
  extraVolumeM3?: number
}>()

const picked = defineModel<string[]>({ default: () => [] })
/** The product lines taken from each picked order; an order missing here is taken whole. */
const pickedLines = defineModel<PickedLines>('lines', { default: () => ({}) })
/** A reduced quantity for some lines of a picked order (TRS01-US17). */
const pickedQuantities = defineModel<PickedQuantities>('quantities', { default: () => ({}) })

const { t } = useI18n()

const onlyThatDay = ref(true)
watch(
  () => props.date,
  () => (onlyThatDay.value = true)
)
const query = ref('')
const onlyFamilies = ref(true)
const familyFilter = computed(() => (onlyFamilies.value ? (props.families ?? []) : []))
const carried = (request: DeliveryRequestApi) =>
  !familyFilter.value.length ||
  (request.lines ?? []).every((line) => familyFilter.value.includes(line.productFamily))
/** Set from a warning: the other orders of that recipient, whatever their date. */
const recipient = ref('')

/* An order planned for another day is not offered for this one; an order already picked always
 * stays visible so that it can be removed. */
const shown = computed(() => {
  const day = props.date?.slice(0, 10) || ''
  const q = query.value.trim().toLowerCase()
  return props.requests.filter((request) => {
    if (picked.value.includes(request.no)) return true
    if (!carried(request)) return false
    if (recipient.value) return request.recipientName === recipient.value
    if (day && onlyThatDay.value && request.desiredDate.slice(0, 10) !== day) return false
    if (!q) return true
    return [
      request.no,
      request.deliveryPointName,
      request.recipientName,
      request.productName,
      request.externalReference,
      request.ordererName,
      request.content
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})
const hiddenByDate = computed(() =>
  props.date && onlyThatDay.value && !recipient.value
    ? props.requests.filter(
        (request) => request.desiredDate.slice(0, 10) !== props.date!.slice(0, 10)
      ).length
    : 0
)

const hiddenByFamily = computed(
  () =>
    props.requests.filter((request) => !picked.value.includes(request.no) && !carried(request))
      .length
)

function toggle(no: string, checked: boolean) {
  picked.value = checked ? [...picked.value, no] : picked.value.filter((item) => item !== no)
  const rest = { ...pickedLines.value }
  delete rest[no]
  pickedLines.value = rest
  const quantities = { ...pickedQuantities.value }
  delete quantities[no]
  pickedQuantities.value = quantities
}

const multiLine = (request: DeliveryRequestApi) => (request.lines?.length ?? 0) > 1
const lineTaken = (request: DeliveryRequestApi, lineNo: number) =>
  pickedLines.value[request.no]?.includes(lineNo) ?? true

/* Leaving every line out removes the order itself, so that nothing empty is sent. */
function toggleLine(request: DeliveryRequestApi, lineNo: number, checked: boolean) {
  const current = pickedLines.value[request.no] ?? request.lines.map((line) => line.lineNo)
  const next = checked
    ? [...new Set([...current, lineNo])]
    : current.filter((item) => item !== lineNo)
  if (!next.length) {
    toggle(request.no, false)
    return
  }
  pickedLines.value = { ...pickedLines.value, [request.no]: next }
}

const quantityOf = (request: DeliveryRequestApi, lineNo: number, ordered: number) =>
  pickedQuantities.value[request.no]?.[lineNo] ?? ordered

function setQuantity(request: DeliveryRequestApi, lineNo: number, value: string) {
  const quantity = Number(value)
  const line = request.lines.find((item) => item.lineNo === lineNo)
  const own = { ...(pickedQuantities.value[request.no] ?? {}) }
  if (!line || !Number.isFinite(quantity) || quantity <= 0 || quantity >= line.quantity) {
    delete own[lineNo]
  } else own[lineNo] = quantity
  pickedQuantities.value = { ...pickedQuantities.value, [request.no]: own }
}

const warned = computed(() =>
  props.requests.filter(
    (request) =>
      picked.value.includes(request.no) &&
      partlyTaken(request, pickedLines.value, pickedQuantities.value)
  )
)

/* The weight and volume of the ticked orders add up as they are ticked (TRS01-US06, US08). */
const totals = computed(() => {
  let weightKg = props.extraWeightKg ?? 0
  let volumeM3 = props.extraVolumeM3 ?? 0
  let liters = 0
  for (const request of props.requests.filter((item) => picked.value.includes(item.no))) {
    for (const line of request.lines ?? []) {
      if (!lineTaken(request, line.lineNo)) continue
      const taken = quantityOf(request, line.lineNo, line.quantity)
      const share = line.quantity > 0 ? taken / line.quantity : 1
      weightKg += (line.weightKg ?? 0) * share
      volumeM3 += (line.volumeM3 ?? 0) * share
      if (['litre', 'l'].includes((line.unit ?? '').toLowerCase())) liters += taken
    }
  }
  return { weightKg, volumeM3, liters }
})
const fill = computed(() =>
  loadFill(
    [
      {
        weightKg: totals.value.weightKg,
        volumeM3: totals.value.volumeM3,
        quantity: totals.value.liters,
        fuel: true
      }
    ],
    props.capacity ?? null
  )
)

function showRecipient(name: string) {
  recipient.value = name
  query.value = ''
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 mb-2">
    <label class="relative flex-1 min-w-48">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
      />
      <input
        v-model="query"
        type="search"
        class="w-full h-8 pl-8 pr-2 text-sm border border-border rounded bg-background outline-none focus:border-primary"
        :placeholder="t('planning.transportOrders.picker.search')"
      />
    </label>
    <label
      v-if="families?.length"
      class="inline-flex items-center gap-2 text-sm text-card-foreground"
    >
      <input v-model="onlyFamilies" type="checkbox" class="h-4 w-4 accent-primary" />
      {{ t('planning.transportOrders.picker.vehicleFamilies', { families: families.join(', ') }) }}
    </label>
    <label v-if="date" class="inline-flex items-center gap-2 text-sm text-card-foreground">
      <input v-model="onlyThatDay" type="checkbox" class="h-4 w-4 accent-primary" />
      {{ t('planning.transportOrders.picker.onlyDay', { date: formatDate(date) }) }}
    </label>
  </div>
  <div
    v-if="recipient"
    class="mb-2 inline-flex items-center gap-2 rounded bg-primary/10 px-2 py-1 text-xs text-card-foreground"
  >
    {{ t('planning.transportOrders.picker.recipient', { name: recipient }) }}
    <button
      type="button"
      class="cursor-pointer p-0.5 rounded hover:bg-primary/20"
      :aria-label="t('planning.transportOrders.picker.allRecipients')"
      @click="recipient = ''"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
  <div
    v-for="request in warned"
    :key="`warn-${request.no}`"
    class="mb-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
  >
    <p class="flex items-start gap-2 text-card-foreground">
      <AlertTriangle class="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
      {{ t('planning.transportOrders.picker.fullDelivery', { no: request.no }) }}
    </p>
    <button
      v-if="request.recipientName"
      type="button"
      class="mt-1 ml-6 cursor-pointer inline-flex items-center gap-1 text-primary hover:underline"
      @click="showRecipient(request.recipientName)"
    >
      <Users class="w-4 h-4" />
      {{ t('planning.transportOrders.picker.sameRecipient') }}
    </button>
  </div>
  <p v-if="hiddenByFamily" class="text-xs text-muted-foreground mb-2">
    {{ t('planning.transportOrders.picker.hiddenFamilies', hiddenByFamily) }}
  </p>
  <p v-if="hiddenByDate" class="text-xs text-muted-foreground mb-2">
    {{ t('planning.transportOrders.picker.hidden', hiddenByDate) }}
  </p>
  <div class="border border-border rounded max-h-80 overflow-auto">
    <table class="w-full text-sm">
      <thead class="sticky top-0">
        <tr class="bg-muted text-xs text-muted-foreground">
          <th class="px-3 py-2 w-8" />
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.request') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.point') }}
          </th>
          <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.product') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.quantity') }}
          </th>
          <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
            {{ t('planning.transportOrders.lines.col.weight') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="6" class="px-3 py-4">
            <LoadingSpinner :size="16" />
          </td>
        </tr>
        <tr v-else-if="!shown.length">
          <td colspan="6" class="px-3 py-4 text-muted-foreground">{{ emptyMessage }}</td>
        </tr>
        <template v-for="request in loading ? [] : shown" :key="request.no">
          <tr
            class="border-t border-border cursor-pointer hover:bg-accent align-top"
            :class="picked.includes(request.no) ? 'bg-primary/5' : ''"
            @click="toggle(request.no, !picked.includes(request.no))"
          >
            <td class="px-3 py-2">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary"
                :checked="picked.includes(request.no)"
                :aria-label="request.no"
                @click.stop
                @change="toggle(request.no, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td class="px-3 py-2 whitespace-nowrap">
              <p class="font-medium text-card-foreground">{{ request.no }}</p>
              <p class="text-xs text-muted-foreground">{{ formatDate(request.desiredDate) }}</p>
              <p v-if="request.externalReference" class="text-xs text-muted-foreground">
                {{ request.externalReference }}
              </p>
            </td>
            <td class="px-3 py-2">
              <p>{{ request.recipientName || request.deliveryPointName }}</p>
              <p class="text-xs text-muted-foreground">{{ request.deliveryPointName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ t('planning.transportOrders.picker.orderer', { name: request.ordererName }) }}
              </p>
            </td>
            <td class="px-3 py-2">
              {{ request.productName }}
              <span v-if="multiLine(request)" class="text-xs text-muted-foreground">
                · {{ t('planning.deliveryRequests.lines.count', request.lines.length) }}
              </span>
              <span
                v-if="request.fullDeliveryRequired"
                class="ml-1 text-xs text-amber-700 dark:text-amber-400"
              >
                · {{ t('planning.deliveryRequests.preferences.fullDeliveryRequired') }}
              </span>
              <p v-if="request.content" class="text-xs text-muted-foreground">
                {{ request.content }}
              </p>
              <p v-if="request.comment" class="text-xs italic text-muted-foreground">
                {{ request.comment }}
              </p>
            </td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              <!-- Quantities in different units do not add up: the line count is shown instead. -->
              <span v-if="multiLine(request) && !request.unit" class="text-muted-foreground">
                {{ t('planning.deliveryRequests.lines.count', request.lines.length) }}
              </span>
              <template v-else>
                {{ formatNumber(request.quantity, 1) }}
                <span class="text-muted-foreground">{{ request.unit }}</span>
              </template>
            </td>
            <td class="px-3 py-2 text-right tabular-nums whitespace-nowrap">
              {{ request.weightKg === null ? '' : `${formatNumber(request.weightKg, 0)} kg` }}
              <span v-if="request.volumeM3" class="block text-xs text-muted-foreground">
                {{ formatNumber(request.volumeM3, 1) }} m³
              </span>
            </td>
          </tr>
          <template v-if="picked.includes(request.no)">
            <tr
              v-for="line in request.lines"
              :key="`${request.no}-${line.lineNo}`"
              class="bg-primary/5 text-xs"
            >
              <td />
              <td colspan="2" class="pl-6 pr-3 py-1.5">
                <label
                  v-if="multiLine(request)"
                  class="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    class="h-4 w-4 accent-primary"
                    :checked="lineTaken(request, line.lineNo)"
                    @change="
                      toggleLine(request, line.lineNo, ($event.target as HTMLInputElement).checked)
                    "
                  />
                  {{ t('planning.transportOrders.picker.line', { no: line.lineNo }) }}
                </label>
                <span v-else>
                  {{ t('planning.transportOrders.picker.line', { no: line.lineNo }) }}
                </span>
              </td>
              <td class="px-3 py-1.5">{{ line.productName }}</td>
              <td class="px-3 py-1.5 text-right whitespace-nowrap">
                <!-- Less than ordered may be taken: the rest stays to plan (TRS01-US17). -->
                <input
                  type="number"
                  class="w-24 h-7 px-2 text-right border border-border rounded bg-background tabular-nums disabled:opacity-50"
                  :value="quantityOf(request, line.lineNo, line.quantity)"
                  :min="0.001"
                  :max="line.quantity"
                  :disabled="!lineTaken(request, line.lineNo)"
                  :aria-label="t('planning.transportOrders.picker.quantityTaken')"
                  @change="
                    setQuantity(request, line.lineNo, ($event.target as HTMLInputElement).value)
                  "
                />
                <span class="ml-1 text-muted-foreground">{{ line.unit }}</span>
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                {{ line.weightKg === null ? '' : `${formatNumber(line.weightKg, 0)} kg` }}
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
  <div class="mt-3">
    <p class="text-xs text-muted-foreground mb-1">
      {{
        t('planning.transportOrders.picker.totals', {
          weight: formatNumber(totals.weightKg, 0),
          volume: formatNumber(totals.volumeM3, 1)
        })
      }}
    </p>
    <LoadGauge
      v-if="capacity"
      :fill="fill"
      :capacity="capacity"
      :weight-kg="totals.weightKg"
      :volume-m3="totals.volumeM3"
      :liters="totals.liters"
    />
  </div>
</template>
