<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Building2, Truck } from '@lucide/vue'
import type { TransportOrderApi } from '../types/transportOrder.types'

const props = defineProps<{ order: TransportOrderApi }>()

const { t } = useI18n()

const rows = computed(() =>
  props.order.means === 'carrier'
    ? [
        { label: t('planning.transportOrders.form.carrier'), value: props.order.carrierName },
        {
          label: t('planning.transportOrders.form.carrierVehicle'),
          value: props.order.carrierVehiclePlate
        },
        {
          label: t('planning.transportOrders.form.carrierDriver'),
          value: props.order.carrierDriverName
        }
      ]
    : [
        { label: t('planning.transportOrders.form.vehicle'), value: props.order.vehiclePlate },
        { label: t('planning.transportOrders.form.trailer'), value: props.order.trailerPlate },
        { label: t('planning.transportOrders.form.driver'), value: props.order.driverName }
      ]
)
</script>

<template>
  <div
    v-if="!order.means"
    class="rounded border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
  >
    <p class="font-medium text-card-foreground">{{ t('planning.transportOrders.means.none') }}</p>
    <p class="mt-1">{{ t('planning.transportOrders.means.noneHint') }}</p>
  </div>
  <div v-else class="rounded border border-border bg-card p-4 text-sm">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <Building2 v-if="order.means === 'carrier'" class="w-5 h-5 text-primary" />
        <Truck v-else class="w-5 h-5 text-primary" />
      </div>
      <div class="min-w-0">
        <p class="font-semibold text-card-foreground">
          {{
            order.means === 'carrier'
              ? t('planning.transportOrders.means.carrier')
              : t('planning.transportOrders.means.trip')
          }}
        </p>
        <RouterLink
          v-if="order.means === 'fleet' && order.tripNo"
          :to="{ path: '/fleet/trips', query: { no: order.tripNo, cardMode: 'view' } }"
          class="text-xs text-primary hover:underline"
        >
          {{ order.tripNo }}
        </RouterLink>
      </div>
    </div>
    <dl class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
      <div v-for="row in rows" :key="row.label" class="min-w-0">
        <dt class="text-xs text-muted-foreground">{{ row.label }}</dt>
        <dd class="font-medium text-card-foreground truncate">{{ row.value || '—' }}</dd>
      </div>
    </dl>
  </div>
</template>
