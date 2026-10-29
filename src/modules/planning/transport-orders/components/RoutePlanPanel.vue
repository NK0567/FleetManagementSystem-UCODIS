<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Route, ShieldAlert, ShieldCheck } from '@lucide/vue'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDateTime, formatMinutes, formatNumber } from '@/utils/format'
import type { TransportOrderApi } from '../types/transportOrder.types'

/**
 * The forecast trip plan of the order (TRS01-US11), drawn from its route template: the stops
 * with their role, the times, the maximum driving time and stop, the zones at risk, the driving
 * and rest times and the corridor the FMS watches. On the road, the route may change with a
 * reason; the driver is told and the former route stays in the history.
 */
const props = defineProps<{
  order: TransportOrderApi
  canEdit: boolean
  busy: boolean
}>()
const emit = defineEmits<{
  validate: [corridorKm: number]
  change: [routeTemplateNo: string, reason: string]
}>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const corridorKm = ref(props.order.routePlan?.corridorKm ?? 5)
watch(
  () => props.order.routePlan?.corridorKm,
  (value) => (corridorKm.value = value ?? 5)
)
const changing = ref(false)
const newRoute = ref('')
const reason = ref('')

function submitChange() {
  if (!newRoute.value || !reason.value.trim()) return
  emit('change', newRoute.value, reason.value.trim())
  changing.value = false
}

const locked = () => ['in_progress', 'completed', 'cancelled'].includes(props.order.status)
</script>

<template>
  <div class="xl:col-span-2 min-w-0 space-y-4 text-sm">
    <p v-if="!order.routePlan" class="text-muted-foreground">
      {{ t('planning.transportOrders.routePlan.none') }}
    </p>
    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="rounded border border-border p-3">
          <p class="text-xs text-muted-foreground">
            {{ t('planning.transportOrders.routePlan.distance') }}
          </p>
          <p class="font-semibold tabular-nums">
            {{ formatNumber(order.routePlan.distanceKm, 0) }} km
          </p>
        </div>
        <div class="rounded border border-border p-3">
          <p class="text-xs text-muted-foreground">
            {{ t('planning.transportOrders.routePlan.driving') }}
          </p>
          <p class="font-semibold tabular-nums">{{ formatMinutes(order.routePlan.drivingMin) }}</p>
        </div>
        <div class="rounded border border-border p-3">
          <p class="text-xs text-muted-foreground">
            {{ t('planning.transportOrders.routePlan.rest') }}
          </p>
          <p class="font-semibold tabular-nums">{{ formatMinutes(order.routePlan.restMin) }}</p>
        </div>
        <div class="rounded border border-border p-3">
          <p class="text-xs text-muted-foreground">
            {{ t('planning.transportOrders.routePlan.corridor') }}
          </p>
          <p class="font-semibold tabular-nums">
            {{ formatNumber(order.routePlan.corridorKm, 1) }} km
          </p>
        </div>
      </div>

      <table class="w-full border border-border rounded">
        <thead>
          <tr class="bg-muted/40 text-xs text-muted-foreground">
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.routePlan.stop') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.routePlan.role') }}
            </th>
            <th class="px-3 py-2 text-left font-semibold">
              {{ t('planning.transportOrders.routePlan.plannedAt') }}
            </th>
            <th class="px-3 py-2 text-right font-semibold">
              {{ t('planning.transportOrders.routePlan.maxInterval') }}
            </th>
            <th class="px-3 py-2 text-right font-semibold">
              {{ t('planning.transportOrders.routePlan.maxStop') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(stop, index) in order.routePlan.stops"
            :key="`${stop.siteNo}-${index}`"
            class="border-t border-border"
          >
            <td class="px-3 py-2">{{ stop.siteName }}</td>
            <td class="px-3 py-2">{{ optionsStore.getOptionLabel('stopRole', stop.role) }}</td>
            <td class="px-3 py-2 whitespace-nowrap tabular-nums">
              {{ stop.plannedAt ? formatDateTime(stop.plannedAt) : '' }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ index === 0 ? '' : formatMinutes(stop.maxIntervalMin) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {{ stop.maxStopMin ? formatMinutes(stop.maxStopMin) : '' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div>
        <p class="font-medium text-card-foreground mb-1 flex items-center gap-1.5">
          <ShieldAlert class="w-4 h-4 text-warning" />
          {{ t('planning.transportOrders.routePlan.riskZones') }}
        </p>
        <p v-if="!order.routePlan.riskZones.length" class="text-muted-foreground">
          {{ t('planning.transportOrders.routePlan.noRisk') }}
        </p>
        <p v-for="zone in order.routePlan.riskZones" :key="zone.siteNo">
          {{ zone.name }}
          <span class="text-muted-foreground">
            ·
            {{
              t('planning.transportOrders.routePlan.fromRoute', {
                km: formatNumber(zone.distanceKm, 1)
              })
            }}
          </span>
        </p>
      </div>

      <div class="flex flex-wrap items-end gap-3 rounded border border-border p-3">
        <div class="flex items-center gap-2">
          <ShieldCheck
            class="w-4 h-4"
            :class="order.routePlan.validatedAt ? 'text-success' : 'text-muted-foreground'"
          />
          <span>
            {{
              order.routePlan.validatedAt
                ? t('planning.transportOrders.routePlan.validated', {
                    date: formatDateTime(order.routePlan.validatedAt)
                  })
                : t('planning.transportOrders.routePlan.notValidated')
            }}
          </span>
        </div>
        <template v-if="canEdit && !locked()">
          <BaseFormField :label="t('planning.transportOrders.routePlan.corridorWidth')">
            <div class="w-28">
              <FormInput v-model="corridorKm" type="number" :min="0.5" :max="50" />
            </div>
          </BaseFormField>
          <button
            type="button"
            class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-accent border border-border rounded disabled:opacity-60"
            :disabled="busy || !(Number(corridorKm) > 0)"
            @click="emit('validate', Number(corridorKm))"
          >
            <ShieldCheck class="w-4 h-4 text-primary" />
            {{ t('planning.transportOrders.routePlan.validate') }}
          </button>
        </template>
        <p class="basis-full text-xs text-muted-foreground">
          {{ t('planning.transportOrders.routePlan.corridorHint') }}
        </p>
      </div>
    </template>

    <div v-if="canEdit && order.status === 'in_progress'">
      <button
        v-if="!changing"
        type="button"
        class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-accent border border-border rounded"
        @click="((changing = true), (newRoute = ''), (reason = ''))"
      >
        <Route class="w-4 h-4 text-primary" />
        {{ t('planning.transportOrders.routePlan.change') }}
      </button>
      <div v-else class="rounded border border-border p-3 space-y-3">
        <BaseFormField :label="t('planning.transportOrders.routePlan.newRoute')" required>
          <ReferenceLookup
            v-model="newRoute"
            reference-key="routeTemplates"
            :modal-title="t('planning.transportOrders.routePlan.newRoute')"
          />
        </BaseFormField>
        <BaseFormField :label="t('planning.transportOrders.routePlan.reason')" required>
          <FormTextarea v-model="reason" :rows="2" :maxlength="300" />
        </BaseFormField>
        <p class="text-xs text-muted-foreground">
          {{ t('planning.transportOrders.routePlan.changeHint') }}
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="cursor-pointer px-3 py-1.5 text-sm border border-border rounded hover:bg-accent"
            @click="changing = false"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="cursor-pointer px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded disabled:opacity-60"
            :disabled="busy || !newRoute || !reason.trim()"
            @click="submitChange"
          >
            {{ t('planning.transportOrders.routePlan.changeConfirm') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="order.routeHistory.length">
      <p class="font-medium text-card-foreground mb-1">
        {{ t('planning.transportOrders.routePlan.history') }}
      </p>
      <p v-for="item in order.routeHistory" :key="item.at" class="text-muted-foreground">
        {{ formatDateTime(item.at) }} · {{ item.routeName }} · {{ item.reason }} · {{ item.by }}
      </p>
    </div>
    <p class="text-xs text-muted-foreground">
      {{
        t('planning.transportOrders.routePlan.mode', {
          mode: optionsStore.getOptionLabel('transportMode', order.transportMode)
        })
      }}
    </p>
  </div>
</template>
