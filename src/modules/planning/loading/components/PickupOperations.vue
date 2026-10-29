<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRightLeft, Ban, Truck, Warehouse } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { loadingPreparationApi } from '@/modules/planning/loading-preparations/api/loadingPreparationApi'
import type { PreparationOptionsApi } from '@/modules/planning/loading-preparations/types/loadingPreparation.types'
import { formatDate, formatNumber } from '@/utils/format'
import {
  pickupApi,
  type DeviationCandidateApi,
  type IncidentListsApi,
  type VehicleCandidateApi
} from '../api/pickupApi'
import type { PickupNoteApi } from '../types/pickup.types'

/**
 * The operations that are the only way to change a validated plan, each traced (TRS01-US23):
 * another vehicle or pickup site (TRS01-US24), a note cancelled by an incident (TRS01-US25), a
 * delivery deviated to another recipient or sent back to the depot (TRS01-US26).
 */
const props = defineProps<{ note: PickupNoteApi; fleet: boolean }>()
const emit = defineEmits<{ changed: [note: PickupNoteApi] }>()
const { t } = useI18n()

const busy = ref(false)
const error = ref<string | null>(null)
const options = ref<PreparationOptionsApi | null>(null)
const lists = ref<IncidentListsApi | null>(null)
const dialog = ref<'vehicle' | 'site' | 'cancel' | 'deviate' | null>(null)
const pointNo = ref('')

const vehicleNo = ref('')
const trailerNo = ref<string | null>(null)
const driverNo = ref('')
const candidate = ref<VehicleCandidateApi | null>(null)
const siteNo = ref('')
const incident = ref({ incidentTypeNo: '', reasonTypeNo: '', reasonCodeNo: '', comment: '' })
const deviations = ref<DeviationCandidateApi[]>([])
const target = ref('')

const buttonClass =
  'cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60'
const inputClass = 'w-full h-9 px-2 text-sm border border-border rounded bg-background'

const open = computed(
  () => props.note.status !== 'confirmed' || props.note.orderStatus === 'in_progress'
)
const codes = computed(() =>
  (lists.value?.reasonCodes ?? []).filter(
    (code) => code.reasonTypeNo === incident.value.reasonTypeNo
  )
)

async function prepare(kind: 'vehicle' | 'site' | 'cancel' | 'deviate', point = '') {
  error.value = null
  pointNo.value = point
  try {
    if ((kind === 'vehicle' || kind === 'site') && !options.value) {
      options.value = await loadingPreparationApi.options()
    }
    if ((kind === 'cancel' || kind === 'deviate') && !lists.value) {
      lists.value = await pickupApi.incidentLists(props.note.orderNo)
    }
    if (kind === 'deviate') {
      deviations.value = await pickupApi.deviationCandidates(props.note.orderNo, point)
      target.value = deviations.value[0]?.requestNo ?? 'depot'
    }
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.pickup.saveError'))
    return
  }
  vehicleNo.value = ''
  trailerNo.value = null
  driverNo.value = ''
  candidate.value = null
  siteNo.value = props.note.pickupSiteNo
  incident.value = { incidentTypeNo: '', reasonTypeNo: '', reasonCodeNo: '', comment: '' }
  dialog.value = kind
}

async function pickVehicle() {
  candidate.value = null
  if (!vehicleNo.value) return
  try {
    candidate.value = await pickupApi.vehicleCandidate(props.note.orderNo, vehicleNo.value)
    trailerNo.value = candidate.value.trailerNo
    driverNo.value = candidate.value.driverNo ?? ''
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.pickup.saveError'))
  }
}

const valid = computed(() => {
  if (dialog.value === 'vehicle') return !!vehicleNo.value && !!driverNo.value
  if (dialog.value === 'site') return !!siteNo.value && siteNo.value !== props.note.pickupSiteNo
  const filled =
    !!incident.value.incidentTypeNo &&
    !!incident.value.reasonTypeNo &&
    !!incident.value.reasonCodeNo
  return dialog.value === 'deviate' ? filled && !!target.value : filled
})

async function confirm() {
  busy.value = true
  error.value = null
  try {
    const no = props.note.orderNo
    const note =
      dialog.value === 'vehicle'
        ? await pickupApi.changeVehicle(no, {
            vehicleNo: vehicleNo.value,
            trailerNo: trailerNo.value,
            driverNo: driverNo.value
          })
        : dialog.value === 'site'
          ? await pickupApi.changeSite(no, siteNo.value)
          : dialog.value === 'cancel'
            ? await pickupApi.cancelDelivery(no, pointNo.value, incident.value)
            : await pickupApi.deviate(no, pointNo.value, {
                ...incident.value,
                ...(target.value === 'depot' ? { toDepot: true } : { requestNo: target.value })
              })
    dialog.value = null
    emit('changed', note)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('planning.pickup.saveError'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <FormAlerts v-if="!dialog" :error="error" @clear:error="error = null" />
    <div v-if="open" class="flex flex-wrap gap-2">
      <button
        v-if="fleet"
        type="button"
        :class="buttonClass"
        :disabled="busy"
        @click="prepare('vehicle')"
      >
        <Truck class="w-4 h-4 text-primary" /> {{ t('planning.pickup.ops.changeVehicle') }}
      </button>
      <button
        v-if="note.status !== 'confirmed'"
        type="button"
        :class="buttonClass"
        :disabled="busy"
        @click="prepare('site')"
      >
        <Warehouse class="w-4 h-4 text-primary" /> {{ t('planning.pickup.ops.changeSite') }}
      </button>
    </div>
    <div class="rounded border border-border divide-y divide-border text-sm">
      <p class="px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {{ t('planning.pickup.ops.deliveries') }}
      </p>
      <div
        v-for="delivery in note.deliveries"
        :key="delivery.pointNo"
        class="px-3 py-2 flex flex-wrap items-center justify-between gap-2"
      >
        <span>
          {{ delivery.recipientName || delivery.deliveryPointName }}
          <span class="text-muted-foreground">· {{ delivery.products }}</span>
          <StatusPill
            class="ml-1"
            :label="
              t(`planning.pickup.ops.state.${delivery.state}`, {
                no: delivery.deviatedToRequestNo ?? ''
              })
            "
            :tone="
              delivery.state === 'open' ? 'info' : delivery.state === 'done' ? 'success' : 'warning'
            "
          />
        </span>
        <span v-if="delivery.state === 'open'" class="flex gap-1">
          <button
            type="button"
            :class="buttonClass"
            :disabled="busy"
            @click="prepare('cancel', delivery.pointNo)"
          >
            <Ban class="w-4 h-4 text-destructive" /> {{ t('planning.pickup.ops.cancel') }}
          </button>
          <button
            type="button"
            :class="buttonClass"
            :disabled="busy"
            @click="prepare('deviate', delivery.pointNo)"
          >
            <ArrowRightLeft class="w-4 h-4 text-primary" /> {{ t('planning.pickup.ops.deviate') }}
          </button>
        </span>
      </div>
    </div>

    <ConfirmDialog
      :open="!!dialog"
      :title="
        dialog
          ? t(
              `planning.pickup.ops.${dialog === 'vehicle' ? 'changeVehicle' : dialog === 'site' ? 'changeSite' : dialog}`
            )
          : ''
      "
      :confirm-label="t('common.confirm')"
      :confirm-disabled="!valid"
      :loading="busy"
      panel-class="max-w-lg"
      @confirm="confirm"
      @cancel="dialog = null"
    >
      <div class="space-y-3">
        <FormAlerts :error="error" @clear:error="error = null" />
        <template v-if="dialog === 'vehicle'">
          <BaseFormField :label="t('planning.preparation.vehicle')" required>
            <select v-model="vehicleNo" :class="inputClass" @change="pickVehicle">
              <option value="" disabled>{{ t('planning.preparation.vehicle') }}</option>
              <option v-for="item in options?.vehicles ?? []" :key="item.no" :value="item.no">
                {{ item.plate }} · {{ item.typeName }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('planning.preparation.trailer')">
            <select v-model="trailerNo" :class="inputClass">
              <option :value="null">{{ t('planning.preparation.noTrailer') }}</option>
              <option
                v-for="item in (options?.vehicles ?? []).filter((v) => v.carriesGoods)"
                :key="item.no"
                :value="item.no"
              >
                {{ item.plate }} · {{ item.typeName }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('planning.preparation.driver')" required>
            <select v-model="driverNo" :class="inputClass">
              <option value="" disabled>{{ t('planning.preparation.noDriver') }}</option>
              <option v-for="item in options?.drivers ?? []" :key="item.no" :value="item.no">
                {{ item.name }}
              </option>
            </select>
          </BaseFormField>
          <p v-if="candidate" class="text-xs text-muted-foreground">
            {{
              t('planning.pickup.ops.candidate', {
                driver: candidate.driverName || '-',
                licence: candidate.licenceNo || '-',
                expiry: formatDate(candidate.licenceExpiry),
                carrier: candidate.carrierName || t('planning.pickup.ops.ownFleet')
              })
            }}
          </p>
        </template>
        <BaseFormField v-else-if="dialog === 'site'" :label="t('planning.pickup.site')" required>
          <select v-model="siteNo" :class="inputClass">
            <option v-for="depot in options?.depots ?? []" :key="depot.no" :value="depot.no">
              {{ depot.name }}
            </option>
          </select>
        </BaseFormField>
        <template v-else-if="dialog">
          <p v-if="!lists?.incidentTypes.length" class="text-sm text-warning">
            {{ t('planning.pickup.ops.noLists') }}
          </p>
          <BaseFormField :label="t('planning.pickup.ops.incidentType')" required>
            <select v-model="incident.incidentTypeNo" :class="inputClass">
              <option value="" disabled>{{ t('planning.pickup.ops.pick') }}</option>
              <option v-for="item in lists?.incidentTypes ?? []" :key="item.no" :value="item.no">
                {{ item.name }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('planning.pickup.ops.reasonType')" required>
            <select
              v-model="incident.reasonTypeNo"
              :class="inputClass"
              @change="incident.reasonCodeNo = ''"
            >
              <option value="" disabled>{{ t('planning.pickup.ops.pick') }}</option>
              <option v-for="item in lists?.reasonTypes ?? []" :key="item.no" :value="item.no">
                {{ item.name }}
              </option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('planning.pickup.ops.reasonCode')" required>
            <select v-model="incident.reasonCodeNo" :class="inputClass">
              <option value="" disabled>{{ t('planning.pickup.ops.pick') }}</option>
              <option v-for="item in codes" :key="item.no" :value="item.no">{{ item.name }}</option>
            </select>
          </BaseFormField>
          <BaseFormField :label="t('selfService.orders.comment')">
            <FormInput v-model="incident.comment" :maxlength="200" />
          </BaseFormField>
          <BaseFormField
            v-if="dialog === 'deviate'"
            :label="t('planning.pickup.ops.target')"
            required
          >
            <select v-model="target" :class="inputClass">
              <option v-for="item in deviations" :key="item.requestNo" :value="item.requestNo">
                {{ item.requestNo }} · {{ item.recipientName }} · {{ item.productName }}
                {{ formatNumber(item.quantity) }}
              </option>
              <option value="depot">{{ t('planning.pickup.ops.toDepot') }}</option>
            </select>
            <p v-if="!deviations.length" class="text-xs text-muted-foreground mt-1">
              {{ t('planning.pickup.ops.noCandidate') }}
            </p>
          </BaseFormField>
        </template>
      </div>
    </ConfirmDialog>
  </div>
</template>
