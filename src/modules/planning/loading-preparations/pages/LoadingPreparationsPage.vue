<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckCheck, Plus, Save, Sparkles, Trash2 } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { formatDate, formatNumber } from '@/utils/format'
import { loadingPreparationApi, type PreparationHeaderInput } from '../api/loadingPreparationApi'
import type {
  LoadingPreparationApi,
  PlanEntry,
  PreparationIssue,
  PreparationOptionsApi
} from '../types/loadingPreparation.types'

/**
 * Preparing the loading of several vehicles from one depot (TRS01-US20): the date, the
 * validity, the region and the orders; the totals against the capacity, the verification and
 * the plan, corrected compartment by compartment and saved even unfinished (TRS01-US22).
 */
const { t } = useI18n()
const { canInsert, canUpdate } = usePermissions('LOADINGPLAN')

const list = ref<LoadingPreparationApi[]>([])
const current = ref<LoadingPreparationApi | null>(null)
const options = ref<PreparationOptionsApi | null>(null)
const header = ref<PreparationHeaderInput | null>(null)
const plan = ref<PlanEntry[]>([])
const error = ref<string | null>(null)
const busy = ref(false)

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60'
const inputClass = 'h-8 px-2 text-sm border border-border rounded bg-background'

const editable = computed(
  () => canUpdate.value && (!current.value || current.value.status === 'pending')
)
const creating = computed(() => !!header.value && !current.value)

async function run<T>(step: () => Promise<T>): Promise<T | null> {
  busy.value = true
  error.value = null
  try {
    return await step()
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.preparation.saveError'))
    return null
  } finally {
    busy.value = false
  }
}

async function loadList() {
  list.value = (await run(() => loadingPreparationApi.list())) ?? []
}

async function open(prep: LoadingPreparationApi) {
  current.value = prep
  plan.value = prep.plan.map((entry) => ({ ...entry }))
  options.value = await run(() => loadingPreparationApi.options(prep.no))
  header.value = {
    depotSiteNo: prep.depotSiteNo,
    loadingDate: prep.loadingDate,
    validUntil: prep.validUntil,
    region: prep.region,
    requestNos: [...prep.requestNos],
    vehicles: prep.vehicles.map((vehicle) => ({
      vehicleNo: vehicle.vehicleNo,
      trailerNo: vehicle.trailerNo,
      driverNo: vehicle.driverNo,
      routeTemplateNo: vehicle.routeTemplateNo ?? null,
      departureTime: vehicle.departureTime ?? '06:00'
    }))
  }
}

async function startNew() {
  current.value = null
  plan.value = []
  options.value = await run(() => loadingPreparationApi.options())
  header.value = {
    depotSiteNo: options.value?.depots[0]?.no ?? '',
    loadingDate: new Date().toISOString().slice(0, 10),
    validUntil: null,
    region: '',
    requestNos: [],
    vehicles: []
  }
}

function applied(prep: LoadingPreparationApi | null) {
  if (!prep) return
  current.value = prep
  plan.value = prep.plan.map((entry) => ({ ...entry }))
  void loadList()
}

async function saveHeader() {
  const body = header.value
  if (!body) return
  const prep = await run(() =>
    current.value
      ? loadingPreparationApi.update(current.value.no, body)
      : loadingPreparationApi.create(body)
  )
  if (prep) {
    applied(prep)
    await open(prep)
  }
}

const propose = async () =>
  current.value && applied(await run(() => loadingPreparationApi.propose(current.value!.no)))
const savePlan = async () =>
  current.value &&
  applied(await run(() => loadingPreparationApi.savePlan(current.value!.no, plan.value)))

const shownRequests = computed(() =>
  (options.value?.requests ?? []).filter(
    (request) =>
      !header.value?.region ||
      request.region === header.value.region ||
      header.value.requestNos.includes(request.no)
  )
)
function toggleRequest(no: string) {
  if (!header.value) return
  const nos = header.value.requestNos
  header.value.requestNos = nos.includes(no) ? nos.filter((item) => item !== no) : [...nos, no]
}
const goodsVehicles = computed(() => (options.value?.vehicles ?? []).filter((v) => v.carriesGoods))
const addVehicle = () =>
  header.value?.vehicles.push({
    vehicleNo: '',
    trailerNo: null,
    driverNo: null,
    routeTemplateNo: null,
    departureTime: '06:00'
  })
/* Validating makes one planned transport order per vehicle (TRS01-US23). */
const validate = async () =>
  current.value && applied(await run(() => loadingPreparationApi.validate(current.value!.no)))
const orderLink = (no: string) => ({
  path: '/planning/transport-orders',
  query: { no, cardMode: 'view' }
})

const lineLabel = (requestNo: string, requestLineNo: number) => {
  const line = current.value?.requestLines.find(
    (item) => item.requestNo === requestNo && item.requestLineNo === requestLineNo
  )
  return line
    ? `${line.requestNo} · ${line.recipientName} · ${line.productName} (${line.unit})`
    : requestNo
}
const lineKey = (entry: { requestNo: string; requestLineNo: number }) =>
  `${entry.requestNo}#${entry.requestLineNo}`
const entriesOf = (vehicleNo: string, compartmentNo: number) =>
  plan.value.filter(
    (entry) => entry.vehicleNo === vehicleNo && entry.compartmentNo === compartmentNo
  )
function addEntry(vehicleNo: string, compartmentNo: number) {
  const first = current.value?.requestLines[0]
  if (!first) return
  plan.value.push({
    vehicleNo,
    compartmentNo,
    requestNo: first.requestNo,
    requestLineNo: first.requestLineNo,
    quantity: 0
  })
}
function setLine(entry: PlanEntry, key: string) {
  const [requestNo, lineNo] = key.split('#')
  entry.requestNo = requestNo ?? ''
  entry.requestLineNo = Number(lineNo)
}
const removeEntry = (entry: PlanEntry) => (plan.value = plan.value.filter((item) => item !== entry))

function issueText(issue: PreparationIssue): string {
  switch (issue.code) {
    case 'overCapacity':
      return t('planning.preparation.issue.overCapacity', {
        quantity: formatNumber(issue.quantityL),
        capacity: formatNumber(issue.capacityL)
      })
    case 'incompatible':
      return t('planning.preparation.issue.incompatible', issue)
    case 'compartmentRule':
      return t('planning.preparation.issue.fullFill', issue)
    case 'equipmentMissing':
      return t(`planning.preparation.issue.equipment.${issue.equipment}`, issue)
    case 'unplaced':
      return t('planning.preparation.issue.unplaced', {
        ...issue,
        quantity: formatNumber(issue.quantity)
      })
  }
}
const blocking = computed(() =>
  (current.value?.issues ?? []).filter((issue) => issue.code !== 'unplaced')
)
const unplaced = computed(() =>
  (current.value?.issues ?? []).filter((issue) => issue.code === 'unplaced')
)

onMounted(loadList)
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 class="text-xl font-semibold text-card-foreground">
          {{ t('planning.preparation.title') }}
        </h1>
        <p class="text-sm text-muted-foreground">{{ t('planning.preparation.subtitle') }}</p>
      </div>
      <button
        v-if="canInsert"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-primary text-primary-foreground hover:opacity-90 transition"
        @click="startNew"
      >
        <Plus class="w-4 h-4" /> {{ t('planning.preparation.new') }}
      </button>
    </header>
    <FormAlerts :error="error" @clear:error="error = null" />

    <div class="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside class="bg-card border border-border rounded divide-y divide-border self-start">
        <p v-if="!list.length" class="p-3 text-sm text-muted-foreground">
          {{ canInsert ? t('planning.preparation.emptyCreate') : t('planning.preparation.empty') }}
        </p>
        <button
          v-for="prep in list"
          :key="prep.no"
          type="button"
          class="cursor-pointer w-full text-left p-3 hover:bg-accent"
          :class="current?.no === prep.no ? 'bg-primary/5' : ''"
          @click="open(prep)"
        >
          <span class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-primary">{{ prep.no }}</span>
            <StatusPill
              :label="t(`planning.preparation.status.${prep.status}`)"
              :tone="prep.status === 'pending' ? 'warning' : 'success'"
            />
          </span>
          <span class="block text-xs text-muted-foreground">
            {{ prep.depotName }} · {{ formatDate(prep.loadingDate) }} ·
            {{ t('planning.preparation.vehicleCount', prep.vehicles.length) }}
          </span>
        </button>
      </aside>

      <section v-if="header" class="space-y-4 min-w-0">
        <div class="bg-card border border-border rounded p-4 space-y-3">
          <h2 class="text-sm font-semibold text-card-foreground">
            {{ current ? current.no : t('planning.preparation.new') }}
          </h2>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BaseFormField :label="t('planning.preparation.depot')" required>
              <select
                v-model="header.depotSiteNo"
                :class="[inputClass, 'w-full']"
                :disabled="!editable"
              >
                <option v-for="depot in options?.depots ?? []" :key="depot.no" :value="depot.no">
                  {{ depot.name }}
                </option>
              </select>
            </BaseFormField>
            <BaseFormField :label="t('planning.preparation.loadingDate')" required>
              <DateFormInput v-model="header.loadingDate" :disabled="!editable" />
            </BaseFormField>
            <BaseFormField :label="t('planning.preparation.validUntil')">
              <DateFormInput v-model="header.validUntil" :disabled="!editable" />
            </BaseFormField>
            <BaseFormField :label="t('planning.preparation.region')">
              <select v-model="header.region" :class="[inputClass, 'w-full']" :disabled="!editable">
                <option value="">{{ t('planning.preparation.allRegions') }}</option>
                <option v-for="region in options?.regions ?? []" :key="region" :value="region">
                  {{ region }}
                </option>
              </select>
            </BaseFormField>
          </div>

          <div>
            <p class="text-sm font-medium text-card-foreground mb-1">
              {{ t('planning.preparation.requests') }}
            </p>
            <p v-if="!shownRequests.length" class="text-sm text-muted-foreground">
              {{ t('planning.preparation.noRequests') }}
            </p>
            <label
              v-for="request in shownRequests"
              :key="request.no"
              class="flex items-start gap-2 text-sm py-0.5"
            >
              <input
                type="checkbox"
                class="mt-1"
                :checked="header.requestNos.includes(request.no)"
                :disabled="!editable"
                @change="toggleRequest(request.no)"
              />
              <span>
                <span class="font-medium">{{ request.no }}</span> · {{ request.recipientName }} ·
                {{ request.deliveryPointName }}
                <span class="text-muted-foreground"
                  >· {{ request.summary }} · {{ formatDate(request.desiredDate) }}</span
                >
              </span>
            </label>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-card-foreground">
              {{ t('planning.preparation.vehicles') }}
            </p>
            <div
              v-for="(vehicle, index) in header.vehicles"
              :key="index"
              class="flex flex-wrap gap-2 items-center"
            >
              <select
                v-model="vehicle.vehicleNo"
                :class="inputClass"
                :disabled="!editable"
                :aria-label="t('planning.preparation.vehicle')"
              >
                <option value="" disabled>{{ t('planning.preparation.vehicle') }}</option>
                <option v-for="item in options?.vehicles ?? []" :key="item.no" :value="item.no">
                  {{ item.plate }} · {{ item.typeName }}
                </option>
              </select>
              <select
                v-model="vehicle.trailerNo"
                :class="inputClass"
                :disabled="!editable"
                :aria-label="t('planning.preparation.trailer')"
              >
                <option :value="null">{{ t('planning.preparation.noTrailer') }}</option>
                <option v-for="item in goodsVehicles" :key="item.no" :value="item.no">
                  {{ item.plate }} · {{ item.typeName }}
                </option>
              </select>
              <select
                v-model="vehicle.driverNo"
                :class="inputClass"
                :disabled="!editable"
                :aria-label="t('planning.preparation.driver')"
              >
                <option :value="null">{{ t('planning.preparation.noDriver') }}</option>
                <option v-for="item in options?.drivers ?? []" :key="item.no" :value="item.no">
                  {{ item.name }}
                </option>
              </select>
              <select
                v-model="vehicle.routeTemplateNo"
                :class="inputClass"
                :disabled="!editable"
                :aria-label="t('planning.preparation.route')"
              >
                <option :value="null">{{ t('planning.preparation.noRoute') }}</option>
                <option v-for="item in options?.routes ?? []" :key="item.no" :value="item.no">
                  {{ item.name }}
                </option>
              </select>
              <input
                v-model="vehicle.departureTime"
                type="time"
                :class="[inputClass, 'w-28']"
                :disabled="!editable"
                :aria-label="t('planning.preparation.departureTime')"
              />
              <button
                v-if="editable"
                type="button"
                class="cursor-pointer p-1.5 text-muted-foreground hover:text-destructive"
                :aria-label="t('common.delete')"
                @click="header.vehicles.splice(index, 1)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <button v-if="editable" type="button" :class="buttonClass" @click="addVehicle">
              <Plus class="w-4 h-4 text-primary" /> {{ t('planning.preparation.addVehicle') }}
            </button>
          </div>
          <div v-if="editable" class="flex gap-2">
            <button
              type="button"
              :class="buttonClass"
              :disabled="busy || !header.depotSiteNo"
              @click="saveHeader"
            >
              <Save class="w-4 h-4 text-primary" />
              {{
                creating ? t('planning.preparation.create') : t('planning.preparation.saveHeader')
              }}
            </button>
          </div>
        </div>

        <template v-if="current">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="bg-card border border-border rounded p-3">
              <p class="text-xs text-muted-foreground">{{ t('planning.preparation.toDeliver') }}</p>
              <p
                v-for="total in current.totals.byUnit"
                :key="total.unit"
                class="text-lg font-semibold tabular-nums"
              >
                {{ formatNumber(total.quantity) }} {{ total.unit }}
              </p>
            </div>
            <div class="bg-card border border-border rounded p-3">
              <p class="text-xs text-muted-foreground">
                {{ t('planning.preparation.toDeliverL') }}
              </p>
              <p class="text-lg font-semibold tabular-nums">
                {{ formatNumber(current.totals.quantityL) }} L
              </p>
            </div>
            <div class="bg-card border border-border rounded p-3">
              <p class="text-xs text-muted-foreground">{{ t('planning.preparation.capacity') }}</p>
              <p class="text-lg font-semibold tabular-nums">
                {{ formatNumber(current.totals.capacityL) }} L
              </p>
            </div>
          </div>

          <div class="bg-card border border-border rounded p-4 space-y-1">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ t('planning.preparation.check') }}
            </h2>
            <p v-if="current.status === 'validated'" class="text-sm text-success">
              {{ t('planning.preparation.validatedOn', { at: formatDate(current.validatedAt) }) }}
            </p>
            <p v-else-if="!blocking.length && !unplaced.length" class="text-sm text-success">
              {{ t('planning.preparation.possible') }}
            </p>
            <p
              v-for="(issue, index) in blocking"
              :key="`b${index}`"
              class="text-sm text-destructive"
            >
              {{ issueText(issue) }}
            </p>
            <p v-for="(issue, index) in unplaced" :key="`u${index}`" class="text-sm text-warning">
              {{ issueText(issue) }}
            </p>
          </div>

          <div class="bg-card border border-border rounded p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-semibold text-card-foreground">
                {{ t('planning.preparation.plan') }}
              </h2>
              <div v-if="editable" class="flex gap-2">
                <button
                  type="button"
                  :class="buttonClass"
                  :disabled="busy || !current.vehicles.length"
                  @click="propose"
                >
                  <Sparkles class="w-4 h-4 text-primary" /> {{ t('planning.preparation.propose') }}
                </button>
                <button type="button" :class="buttonClass" :disabled="busy" @click="savePlan">
                  <Save class="w-4 h-4 text-primary" /> {{ t('planning.preparation.savePlan') }}
                </button>
                <button
                  type="button"
                  class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded bg-primary text-primary-foreground disabled:opacity-60"
                  :disabled="busy || !current.plan.length"
                  @click="validate"
                >
                  <CheckCheck class="w-4 h-4" /> {{ t('planning.preparation.validate') }}
                </button>
              </div>
            </div>
            <p v-if="!current.vehicles.length" class="text-sm text-muted-foreground">
              {{ t('planning.preparation.noVehicle') }}
            </p>
            <div
              v-for="vehicle in current.vehicles"
              :key="vehicle.vehicleNo"
              class="rounded border border-border"
            >
              <p class="px-3 py-2 border-b border-border text-sm font-medium">
                <RouterLink
                  v-if="vehicle.orderNo"
                  :to="orderLink(vehicle.orderNo)"
                  class="float-right text-xs font-normal text-primary hover:underline"
                >
                  {{ t('planning.preparation.orderMade', { no: vehicle.orderNo }) }}
                </RouterLink>
                {{ vehicle.plate
                }}<template v-if="vehicle.trailerPlate"> · {{ vehicle.trailerPlate }}</template>
                <span class="text-xs font-normal text-muted-foreground">
                  · {{ vehicle.driverName || t('planning.preparation.noDriver') }}
                  <template v-if="vehicle.capacityL">
                    · {{ formatNumber(vehicle.capacityL) }} L</template
                  >
                </span>
              </p>
              <div
                v-for="compartment in vehicle.compartments"
                :key="compartment.no"
                class="px-3 py-2 border-b border-border last:border-b-0 space-y-1"
              >
                <p class="text-xs text-muted-foreground">
                  {{ t('planning.pickup.compartmentNo', { no: compartment.no }) }}
                  <template v-if="compartment.volumeL !== null">
                    · {{ formatNumber(compartment.usedL) }} /
                    {{ formatNumber(compartment.volumeL) }} L
                  </template>
                  <template v-if="compartment.families.length">
                    · {{ compartment.families.join(', ') }}</template
                  >
                  · {{ t(`planning.preparation.content.${compartment.content}`) }}
                  <template v-if="compartment.fullFill">
                    · {{ t('planning.preparation.fullFill') }}</template
                  >
                </p>
                <div
                  v-for="(entry, index) in entriesOf(vehicle.vehicleNo, compartment.no)"
                  :key="index"
                  class="flex flex-wrap items-center gap-2"
                >
                  <select
                    :value="lineKey(entry)"
                    :class="[inputClass, 'min-w-64 flex-1']"
                    :disabled="!editable"
                    :aria-label="t('planning.preparation.line')"
                    @change="setLine(entry, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="line in current.requestLines"
                      :key="lineKey(line)"
                      :value="lineKey(line)"
                    >
                      {{ lineLabel(line.requestNo, line.requestLineNo) }}
                    </option>
                  </select>
                  <input
                    v-model.number="entry.quantity"
                    type="number"
                    min="0"
                    :class="[inputClass, 'w-32 text-right']"
                    :disabled="!editable"
                    :aria-label="t('planning.preparation.quantity')"
                  />
                  <button
                    v-if="editable"
                    type="button"
                    class="cursor-pointer p-1.5 text-muted-foreground hover:text-destructive"
                    :aria-label="t('common.delete')"
                    @click="removeEntry(entry)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
                <button
                  v-if="editable && current.requestLines.length"
                  type="button"
                  class="cursor-pointer text-xs text-primary hover:underline"
                  @click="addEntry(vehicle.vehicleNo, compartment.no)"
                >
                  + {{ t('planning.preparation.addEntry') }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
