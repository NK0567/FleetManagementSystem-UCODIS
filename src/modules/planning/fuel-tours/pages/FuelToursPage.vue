<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CircleCheck, Droplets, FilePen, FileText } from '@lucide/vue'
import { formatDate, formatNumber } from '@/utils/format'
import { fuelTourState, type FuelTourState } from '../domain/fuel'
import { useFuelTourStore } from '../stores/fuelTourStore'
import type { FuelBlStatus, FuelTourApi } from '../types/fuelTour.types'

const { t } = useI18n()
const store = useFuelTourStore()

const STATE_TONES: Record<FuelTourState, 'info' | 'success' | 'neutral'> = {
  draft: 'info',
  validated: 'success',
  cancelled: 'neutral'
}
const BL_TONES: Record<FuelBlStatus, 'success' | 'neutral' | 'warning'> = {
  issued: 'success',
  cancelled: 'neutral',
  deviated: 'warning'
}

const plannedLitres = (tour: FuelTourApi) =>
  tour.compartments.reduce((sum, slot) => sum + slot.volumeL, 0)

const kpis = computed(() => {
  const tours = store.tours
  const active = tours.filter((tour) => fuelTourState(tour) !== 'cancelled')
  const issued = tours.flatMap((tour) => tour.bls).filter((bl) => bl.status === 'issued')
  return [
    {
      key: 'draft',
      icon: FilePen,
      value: tours.filter((tour) => fuelTourState(tour) === 'draft').length,
      label: t('planning.fuelTours.kpi.draft'),
      sub: t('planning.fuelTours.kpi.draftSub')
    },
    {
      key: 'validated',
      icon: CircleCheck,
      value: tours.filter((tour) => fuelTourState(tour) === 'validated').length,
      label: t('planning.fuelTours.kpi.validated'),
      sub: t('planning.fuelTours.kpi.validatedSub')
    },
    {
      key: 'bls',
      icon: FileText,
      value: issued.length,
      label: t('planning.fuelTours.kpi.bls'),
      sub: t('planning.fuelTours.kpi.blsSub')
    },
    {
      key: 'litres',
      icon: Droplets,
      value: `${formatNumber(active.reduce((sum, tour) => sum + plannedLitres(tour), 0))} L`,
      label: t('planning.fuelTours.kpi.litres'),
      sub: t('planning.fuelTours.kpi.litresSub')
    }
  ]
})

const orderCard = (no: string) => ({
  path: '/planning/transport-orders',
  query: { no, cardMode: 'view' }
})
const requestCard = (no: string) => ({
  path: '/planning/delivery-requests',
  query: { no, cardMode: 'view' }
})

onMounted(() => void store.fetchTours())
</script>

<template>
  <div class="px-2 py-4 space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('planning.fuelTours.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('planning.fuelTours.subtitle') }}</p>
    </header>

    <FormAlerts :error="store.error" @clear:error="store.error = null" />
    <LoadingSpinner
      v-if="store.loading && !store.tours.length"
      :text="t('planning.fuelTours.loading')"
    />

    <template v-else>
      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div
          v-for="kpi in kpis"
          :key="kpi.key"
          class="bg-card border border-border rounded p-4 flex items-start gap-3"
        >
          <span class="p-2 rounded bg-primary/10 text-primary shrink-0">
            <component :is="kpi.icon" class="w-5 h-5" />
          </span>
          <div class="min-w-0">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p class="text-2xl font-semibold text-card-foreground tabular-nums">{{ kpi.value }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ kpi.sub }}</p>
          </div>
        </div>
      </section>

      <section v-if="!store.tours.length" class="bg-card border border-border rounded">
        <p class="px-4 py-6 text-sm text-muted-foreground">{{ t('planning.fuelTours.empty') }}</p>
      </section>

      <section
        v-for="tour in store.tours"
        :key="tour.no"
        class="bg-card border border-border rounded overflow-x-auto"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border"
        >
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-card-foreground">
              {{ tour.no }} · {{ tour.depotName ?? tour.depotNo }}
            </h2>
            <p class="text-xs text-muted-foreground">
              {{
                t('planning.fuelTours.window', {
                  date: formatDate(tour.date),
                  until: formatDate(tour.validUntil)
                })
              }}
              <template v-if="tour.voucher">
                · {{ t('planning.fuelTours.voucher', { no: tour.voucher.no }) }}
              </template>
            </p>
          </div>
          <StatusPill
            :label="t(`planning.fuelTours.state.${fuelTourState(tour)}`)"
            :tone="STATE_TONES[fuelTourState(tour)]"
          />
        </div>

        <div class="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span class="text-muted-foreground">
            {{ t('planning.fuelTours.requests', tour.requestNos.length) }}
          </span>
          <RouterLink
            v-for="no in tour.requestNos"
            :key="no"
            :to="requestCard(no)"
            class="text-primary hover:underline"
          >
            {{ no }}
          </RouterLink>
          <span class="text-muted-foreground tabular-nums">
            {{ t('planning.fuelTours.planned', { litres: formatNumber(plannedLitres(tour)) }) }}
          </span>
          <template v-if="tour.orderNos.length">
            <span class="text-muted-foreground">{{ t('planning.fuelTours.orders') }}</span>
            <RouterLink
              v-for="no in tour.orderNos"
              :key="no"
              :to="orderCard(no)"
              class="text-primary hover:underline"
            >
              {{ no }}
            </RouterLink>
          </template>
        </div>

        <table v-if="tour.bls.length" class="w-full text-sm">
          <thead>
            <tr class="bg-muted/40 text-xs text-muted-foreground">
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.fuelTours.col.bl') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.fuelTours.col.vehicle') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.fuelTours.col.product') }}
              </th>
              <th class="px-3 py-2 font-semibold text-right whitespace-nowrap">
                {{ t('planning.fuelTours.col.volume') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.fuelTours.col.request') }}
              </th>
              <th class="px-3 py-2 font-semibold text-left whitespace-nowrap">
                {{ t('planning.fuelTours.col.status') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bl in tour.bls" :key="bl.no" class="border-t border-border">
              <td class="px-3 py-1.5 whitespace-nowrap font-medium text-card-foreground">
                {{ bl.no }}
              </td>
              <td class="px-3 py-1.5 whitespace-nowrap">
                {{ bl.vehiclePlate ?? bl.vehicleNo }}
                <span class="text-xs text-muted-foreground">
                  · {{ t('planning.fuelTours.compartment', { n: bl.compartmentNo }) }}
                </span>
              </td>
              <td class="px-3 py-1.5">{{ bl.productName ?? bl.productNo }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">
                {{ formatNumber(bl.volumeL) }} L
              </td>
              <td class="px-3 py-1.5 whitespace-nowrap">
                <RouterLink
                  :to="requestCard(bl.deliveryRequestNo)"
                  class="text-primary hover:underline"
                >
                  {{ bl.deliveryRequestNo }}
                </RouterLink>
              </td>
              <td class="px-3 py-1.5">
                <StatusPill
                  :label="t(`planning.fuelTours.blStatus.${bl.status}`)"
                  :tone="BL_TONES[bl.status]"
                />
                <span v-if="bl.reason" class="block text-xs text-muted-foreground">
                  {{ bl.reason }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="px-4 py-3 border-t border-border text-sm text-muted-foreground">
          {{ t('planning.fuelTours.noBl') }}
        </p>
      </section>
    </template>
  </div>
</template>
