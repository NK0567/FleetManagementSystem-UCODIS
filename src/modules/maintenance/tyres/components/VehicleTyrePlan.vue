<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { tyreService } from '../services/tyreService'
import type { TyreApi, TyrePositionSlot } from '../types/tyre.types'

/** The tyres of one vehicle on its plan: each position coloured by its alert, a click to act. */
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const router = useRouter()
const { canUpdate } = usePermissions('TYRE')

const vehicleNo = ref<string | null>(null)
const slots = ref<TyrePositionSlot[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const mounting = ref<TyrePositionSlot | null>(null)
const stock = ref<TyreApi[]>([])
const tyreNo = ref('')
const saving = ref(false)

async function load() {
  error.value = null
  if (!vehicleNo.value) {
    slots.value = []
    return
  }
  loading.value = true
  try {
    slots.value = await tyreService.positions(vehicleNo.value)
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('maintenance.tyres.plan.loadError'))
  } finally {
    loading.value = false
  }
}

watch(vehicleNo, load)

/** Axles front to back, each with its left and right positions; the spares come apart. */
const axles = computed(() => {
  const ranks = [...new Set(slots.value.filter((slot) => !slot.spare).map((slot) => slot.axleRank))]
  return ranks.map((rank) => {
    const own = slots.value.filter((slot) => !slot.spare && slot.axleRank === rank)
    return {
      rank,
      label: own[0]?.axleLabel ?? '',
      left: own.filter((slot) => slot.side?.startsWith('left')),
      right: own.filter((slot) => slot.side?.startsWith('right'))
    }
  })
})
const spares = computed(() => slots.value.filter((slot) => slot.spare))

function tone(slot: TyrePositionSlot): string {
  if (!slot.tyreNo) return 'border-dashed border-border text-muted-foreground bg-background'
  if (slot.alert === 'safety') return 'border-destructive bg-destructive/10 text-destructive'
  if (slot.alert === 'rotation') return 'border-warning bg-warning-bg text-warning'
  return 'border-success bg-success-bg text-success'
}

function title(slot: TyrePositionSlot): string {
  const place = `${slot.code} · ${slot.axleLabel}`
  if (!slot.tyreNo) return `${place} · ${t('maintenance.tyres.plan.free')}`
  const alert =
    slot.alert && slot.alert !== 'none'
      ? ` · ${t(`maintenance.tyres.plan.alert.${slot.alert}`)}`
      : ''
  return `${place} · ${slot.serialNumber ?? slot.tyreNo}${alert}`
}

async function pick(slot: TyrePositionSlot) {
  if (slot.tyreNo) {
    await router.push({
      path: '/maintenance/tyres',
      query: { no: slot.tyreNo, cardMode: 'view' }
    })
    return
  }
  if (!canUpdate.value) return
  error.value = null
  tyreNo.value = ''
  mounting.value = slot
  const page = await tyreService
    .getAll({
      pageSize: 200,
      sortBy: 'no',
      filters: [{ field: 'status', valueType: 'string', value: ['stock'] }]
    })
    .catch(() => null)
  stock.value = page?.data.items ?? []
}

async function mount() {
  const slot = mounting.value
  if (!slot || !tyreNo.value || !vehicleNo.value) return
  saving.value = true
  error.value = null
  try {
    await tyreService.act(tyreNo.value, 'mount', {
      vehicleNo: vehicleNo.value,
      positionCode: slot.code
    })
    mounting.value = null
    await load()
    emit('changed')
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('maintenance.tyres.plan.mountError'))
    mounting.value = null
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="mx-4 mt-2 bg-card border border-border rounded p-4 space-y-3">
    <div class="flex flex-wrap items-end gap-3">
      <BaseFormField :label="t('maintenance.tyres.plan.vehicle')" class="w-64">
        <ReferenceLookup
          v-model="vehicleNo"
          reference-key="vehicles"
          :modal-title="t('maintenance.tyres.plan.vehicle')"
        />
      </BaseFormField>
      <div v-if="slots.length" class="flex flex-wrap gap-3 text-xs text-muted-foreground pb-2">
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm border border-success bg-success-bg" />
          {{ t('maintenance.tyres.plan.alert.none') }}
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm border border-warning bg-warning-bg" />
          {{ t('maintenance.tyres.plan.alert.rotation') }}
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm border border-destructive bg-destructive/10" />
          {{ t('maintenance.tyres.plan.alert.safety') }}
        </span>
        <span class="inline-flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm border border-dashed border-border" />
          {{ t('maintenance.tyres.plan.free') }}
        </span>
      </div>
    </div>

    <FormAlerts :error="error" @clear:error="error = null" />
    <LoadingSpinner v-if="loading" :text="t('common.loading')" />
    <p v-else-if="vehicleNo && !slots.length" class="text-sm text-muted-foreground">
      {{ t('maintenance.tyres.plan.noLayout') }}
    </p>

    <div
      v-if="slots.length"
      class="inline-flex flex-col items-center gap-3 px-6 py-4 rounded border border-border bg-background"
    >
      <p class="text-xs text-muted-foreground self-start">
        {{ t('maintenance.tyres.plan.front') }}
      </p>
      <div v-for="axle in axles" :key="String(axle.rank)" class="flex items-center gap-3">
        <div class="flex gap-1 justify-end w-24">
          <button
            v-for="slot in axle.left"
            :key="slot.code"
            type="button"
            class="w-9 h-12 rounded border-2 text-xs font-bold flex items-center justify-center transition hover:opacity-80"
            :class="tone(slot)"
            :title="title(slot)"
            @click="pick(slot)"
          >
            {{ slot.code }}
          </button>
        </div>
        <div class="w-16 h-3 rounded-full bg-border" :title="axle.label" />
        <div class="flex gap-1 w-24">
          <button
            v-for="slot in axle.right"
            :key="slot.code"
            type="button"
            class="w-9 h-12 rounded border-2 text-xs font-bold flex items-center justify-center transition hover:opacity-80"
            :class="tone(slot)"
            :title="title(slot)"
            @click="pick(slot)"
          >
            {{ slot.code }}
          </button>
        </div>
      </div>
      <div v-if="spares.length" class="flex items-center gap-2 pt-2 border-t border-border">
        <span class="text-xs text-muted-foreground">{{ t('maintenance.tyres.plan.spares') }}</span>
        <button
          v-for="slot in spares"
          :key="slot.code"
          type="button"
          class="w-9 h-12 rounded border-2 text-xs font-bold flex items-center justify-center transition hover:opacity-80"
          :class="tone(slot)"
          :title="title(slot)"
          @click="pick(slot)"
        >
          {{ slot.code }}
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="!!mounting"
      :title="t('maintenance.tyres.plan.mountTitle', { position: mounting?.code ?? '' })"
      :confirm-label="t('maintenance.tyres.plan.mount')"
      :confirm-disabled="!tyreNo"
      :loading="saving"
      panel-class="max-w-md"
      @confirm="mount"
      @cancel="mounting = null"
    >
      <div class="space-y-3">
        <p class="text-sm text-muted-foreground">{{ mounting?.axleLabel }}</p>
        <p v-if="!stock.length" class="text-sm text-muted-foreground">
          {{ t('maintenance.tyres.plan.noStock') }}
        </p>
        <BaseFormField v-else :label="t('maintenance.tyres.plan.tyre')" required>
          <select
            v-model="tyreNo"
            class="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
          >
            <option value="" disabled>{{ t('maintenance.tyres.plan.pickTyre') }}</option>
            <option v-for="tyre in stock" :key="tyre.no" :value="tyre.no">
              {{ tyre.no }} · {{ tyre.serialNumber }} · {{ tyre.make }}
            </option>
          </select>
        </BaseFormField>
      </div>
    </ConfirmDialog>
  </section>
</template>
