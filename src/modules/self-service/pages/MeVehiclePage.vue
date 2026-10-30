<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Fuel, Wrench } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { useOptionsStore } from '@/stores/optionsStore'
import type { FileMeta } from '@/types/file.types'
import { formatDateTime, formatNumber } from '@/utils/format'
import {
  myVehicleApi,
  type MyBreakdown,
  type MyRefillInput,
  type MyRefills
} from '../api/myVehicleApi'

/** Same floor as the server for a symptom. */
const MIN_SYMPTOM = 10
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const

const { t } = useI18n()
const optionsStore = useOptionsStore()
/** Only the driver declares; the assistant reads. */
const { canExecute } = usePermissions('MYSPACE')

const vehicle = ref<MyRefills | null>(null)
const breakdowns = ref<MyBreakdown[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const saving = ref(false)

const emptyRefill = (): MyRefillInput => ({
  liters: null,
  unitPrice: null,
  odometerKm: null,
  stationName: '',
  fullTank: true,
  receiptFileNo: null
})
const refill = ref<MyRefillInput>(emptyRefill())
const receipt = ref<FileMeta | null>(null)
const breakdown = ref({ severity: 'major', symptom: '' })
/** One declaration at a time: the refill (the usual one) or the breakdown. */
const tab = ref<'refill' | 'breakdown'>('refill')

const canDeclareRefill = computed(
  () =>
    !saving.value &&
    !!refill.value.liters &&
    !!refill.value.unitPrice &&
    refill.value.odometerKm !== null &&
    !!refill.value.receiptFileNo
)
const canReport = computed(
  () => !saving.value && breakdown.value.symptom.trim().length >= MIN_SYMPTOM
)

async function load() {
  loading.value = true
  error.value = null
  try {
    vehicle.value = (await myVehicleApi.refills()).data.data
    breakdowns.value = (await myVehicleApi.breakdowns()).data.data
  } catch (failure) {
    error.value = apiErrorMessage(failure, t('selfService.vehicle.loadError'))
  } finally {
    loading.value = false
  }
}

async function save(action: () => Promise<unknown>, success: string) {
  saving.value = true
  error.value = null
  notice.value = null
  try {
    await action()
    notice.value = success
    await load()
    return true
  } catch (failure) {
    error.value = apiErrorMessage(failure, t('selfService.vehicle.saveError'))
    return false
  } finally {
    saving.value = false
  }
}

async function declareRefill() {
  if (!canDeclareRefill.value) return
  const done = await save(
    () => myVehicleApi.declareRefill(refill.value),
    t('selfService.vehicle.refillSaved')
  )
  if (done) {
    refill.value = emptyRefill()
    receipt.value = null
  }
}

async function reportBreakdown() {
  if (!canReport.value) return
  const done = await save(
    () =>
      myVehicleApi.reportBreakdown({
        severity: breakdown.value.severity,
        symptom: breakdown.value.symptom.trim()
      }),
    t('selfService.vehicle.breakdownSaved')
  )
  if (done) breakdown.value = { severity: 'major', symptom: '' }
}

function onUploaded(file: FileMeta) {
  receipt.value = file
  refill.value.receiptFileNo = file.no
}

function onRemoved() {
  receipt.value = null
  refill.value.receiptFileNo = null
}

onMounted(load)
</script>

<template>
  <div class="px-2 py-4 space-y-4 w-full max-w-3xl mx-auto">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('selfService.vehicle.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{
          vehicle
            ? t('selfService.vehicle.subtitle', { plate: vehicle.vehiclePlate })
            : t('selfService.vehicle.subtitleNone')
        }}
      </p>
    </header>

    <FormAlerts
      :error="error"
      :success="notice"
      @clear:error="error = null"
      @clear:success="notice = null"
    />
    <LoadingSpinner v-if="loading && !vehicle" :text="t('common.loading')" />

    <section
      v-if="!loading && !vehicle && !error"
      class="bg-card border border-border rounded p-6 flex flex-col items-center gap-2 text-center"
    >
      <Fuel class="w-8 h-8 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">{{ t('selfService.vehicle.subtitleNone') }}</p>
    </section>

    <template v-if="vehicle">
      <div class="grid grid-cols-2 gap-2" role="tablist">
        <button
          v-for="item in [
            { key: 'refill', icon: Fuel, label: t('selfService.vehicle.refillTitle') },
            { key: 'breakdown', icon: Wrench, label: t('selfService.vehicle.breakdownTitle') }
          ] as const"
          :key="item.key"
          type="button"
          role="tab"
          class="h-11 inline-flex items-center justify-center gap-2 rounded border text-sm font-medium transition"
          :class="
            tab === item.key
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
          "
          :aria-selected="tab === item.key"
          @click="tab = item.key"
        >
          <component :is="item.icon" class="w-5 h-5" />
          {{ item.label }}
        </button>
      </div>

      <section v-show="tab === 'refill'" class="bg-card border border-border rounded p-4 space-y-3">
        <div v-if="canExecute" class="grid gap-3 sm:grid-cols-2">
          <BaseFormField :label="t('fleet.fuelRefills.form.liters')" required>
            <FormInput v-model="refill.liters" type="number" :min="0.1" :step="0.1" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.fuelRefills.form.unitPrice')" required>
            <FormInput v-model="refill.unitPrice" type="number" :min="1" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.fuelRefills.form.odometerKm')" required>
            <FormInput v-model="refill.odometerKm" type="number" :min="0" />
          </BaseFormField>
          <BaseFormField :label="t('selfService.vehicle.station')">
            <FormInput v-model="refill.stationName" :maxlength="120" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.fuelRefills.form.fullTank')">
            <ToggleSwitch v-model="refill.fullTank" />
          </BaseFormField>
          <BaseFormField :label="t('selfService.vehicle.receipt')" required>
            <FileAttachmentField
              :file="receipt"
              :accept="RECEIPT_TYPES"
              @uploaded="onUploaded"
              @removed="onRemoved"
            />
            <p class="text-xs text-muted-foreground mt-1">
              {{ t('selfService.vehicle.receiptHint') }}
            </p>
          </BaseFormField>
        </div>
        <p
          v-if="canExecute && refill.liters && refill.unitPrice"
          class="text-sm text-muted-foreground"
        >
          {{
            t('selfService.vehicle.amount', {
              amount: formatNumber(Math.round(refill.liters * refill.unitPrice))
            })
          }}
        </p>
        <button
          v-if="canExecute"
          type="button"
          class="w-full sm:w-auto h-11 sm:h-auto px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-60"
          :disabled="!canDeclareRefill"
          :title="canDeclareRefill ? undefined : t('selfService.vehicle.refillIncomplete')"
          @click="declareRefill"
        >
          {{ t('selfService.vehicle.declareRefill') }}
        </button>
        <p v-if="!vehicle.refills.length" class="text-sm text-muted-foreground">
          {{ t('selfService.vehicle.noRefill') }}
        </p>
        <ul v-else class="text-sm divide-y divide-border">
          <li
            v-for="row in vehicle.refills"
            :key="row.no"
            class="py-1.5 flex justify-between gap-2"
          >
            <span
              >{{ formatDateTime(row.refueledAt) }} ·
              {{ row.stationLabel || t('selfService.vehicle.noStation') }}</span
            >
            <span class="text-muted-foreground">
              {{ formatNumber(row.liters, 1) }} L ·
              {{ optionsStore.getOptionLabel('refillStatus', row.status) }}
            </span>
          </li>
        </ul>
      </section>

      <section
        v-show="tab === 'breakdown'"
        class="bg-card border border-border rounded p-4 space-y-3"
      >
        <template v-if="canExecute">
          <BaseFormField :label="t('maintenance.workOrders.col.severity')" required>
            <OptionsSelect
              :model-value="breakdown.severity"
              options-key="workOrderSeverity"
              @update:model-value="breakdown.severity = String($event)"
            />
          </BaseFormField>
          <BaseFormField :label="t('selfService.vehicle.symptom')" required>
            <FormTextarea v-model="breakdown.symptom" :rows="3" :maxlength="500" />
            <p class="text-xs text-muted-foreground mt-1">
              {{
                t('common.minLength', {
                  count: breakdown.symptom.trim().length,
                  min: MIN_SYMPTOM
                })
              }}
            </p>
          </BaseFormField>
          <p class="text-xs text-muted-foreground">{{ t('selfService.vehicle.breakdownHint') }}</p>
          <button
            type="button"
            class="w-full sm:w-auto h-11 sm:h-auto px-4 py-2 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition font-medium disabled:opacity-60"
            :disabled="!canReport"
            :title="
              canReport
                ? undefined
                : t('common.minLength', {
                    count: breakdown.symptom.trim().length,
                    min: MIN_SYMPTOM
                  })
            "
            @click="reportBreakdown"
          >
            {{ t('selfService.vehicle.reportBreakdown') }}
          </button>
        </template>
        <p v-if="!breakdowns.length" class="text-sm text-muted-foreground">
          {{ t('selfService.vehicle.noBreakdown') }}
        </p>
        <ul v-else class="text-sm divide-y divide-border">
          <li v-for="row in breakdowns" :key="row.no" class="py-1.5 flex justify-between gap-2">
            <span>{{ formatDateTime(row.declaredAt) }} · {{ row.symptom }}</span>
            <span class="text-muted-foreground whitespace-nowrap">
              {{ optionsStore.getOptionLabel('workOrderStatus', row.status) }}
            </span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
