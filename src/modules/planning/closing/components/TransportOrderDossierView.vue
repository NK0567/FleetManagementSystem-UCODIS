<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { EMPTY_CELL, formatDateTime, formatNumber } from '@/utils/format'
import type { OrderDossierApi } from '../types/dossier.types'
import DocumentaryDossierList from './DocumentaryDossierList.vue'

/** The complete file of a transport order, as shown and printed (TRS02-US07). */
const props = defineProps<{ dossier: OrderDossierApi }>()
const { t } = useI18n()
const optionsStore = useOptionsStore()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })

const order = computed(() => props.dossier.order)
const label = (key: string, value: string | null | undefined) =>
  value ? optionsStore.getOptionLabel(key, value) || value : EMPTY_CELL
const number = (value: number | null | undefined) =>
  value === null || value === undefined ? EMPTY_CELL : formatNumber(value, 2)
const carrier = computed(() => order.value.means === 'carrier')
const debriefing = computed(() => props.dossier.debriefing)
const compliance = computed(() => props.dossier.compliance)
const gaps = computed(() => props.dossier.goods.filter((line) => line.quantityGap))
const section = 'font-semibold text-card-foreground border-b border-border pb-1 mb-2'
const cell = 'px-2 py-1.5'
</script>

<template>
  <div ref="root" class="text-sm text-card-foreground space-y-5">
    <h2 class="text-base font-semibold">
      {{ t('planning.dossier.title', { no: order.no }) }}
    </h2>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.order') }}</h3>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
        <dt class="text-muted-foreground">{{ t('planning.dossier.status') }}</dt>
        <dd>{{ label('transportOrderStatus', order.status) }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.dossier.route') }}</dt>
        <dd>{{ order.routeName || EMPTY_CELL }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.dossier.plannedDeparture') }}</dt>
        <dd>{{ formatDateTime(order.plannedDeparture) }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.dossier.plannedArrival') }}</dt>
        <dd>{{ formatDateTime(order.plannedArrival) }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.dossier.recipients') }}</dt>
        <dd>{{ order.recipientSummary || EMPTY_CELL }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.dossier.created') }}</dt>
        <dd>{{ formatDateTime(order.createdAt) }} · {{ order.createdBy }}</dd>
        <template v-if="order.comment">
          <dt class="text-muted-foreground">{{ t('planning.dossier.comment') }}</dt>
          <dd>{{ order.comment }}</dd>
        </template>
      </dl>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.assignment') }}</h3>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
        <dt class="text-muted-foreground">{{ t('planning.dossier.means') }}</dt>
        <dd>{{ label('transportMeans', order.means) }}</dd>
        <template v-if="carrier">
          <dt class="text-muted-foreground">{{ t('planning.dossier.carrier') }}</dt>
          <dd>{{ order.carrierName || EMPTY_CELL }}</dd>
          <dt class="text-muted-foreground">{{ t('planning.dossier.vehicle') }}</dt>
          <dd>{{ order.carrierVehiclePlate || EMPTY_CELL }}</dd>
          <dt class="text-muted-foreground">{{ t('planning.dossier.driver') }}</dt>
          <dd>{{ order.carrierDriverName || EMPTY_CELL }}</dd>
        </template>
        <template v-else-if="order.means">
          <dt class="text-muted-foreground">{{ t('planning.dossier.trip') }}</dt>
          <dd>{{ order.tripNo || EMPTY_CELL }}</dd>
          <dt class="text-muted-foreground">{{ t('planning.dossier.vehicle') }}</dt>
          <dd>
            {{ order.vehiclePlate || EMPTY_CELL }}
            <template v-if="order.trailerPlate"> · {{ order.trailerPlate }}</template>
          </dd>
          <dt class="text-muted-foreground">{{ t('planning.dossier.driver') }}</dt>
          <dd>{{ order.driverName || EMPTY_CELL }}</dd>
        </template>
      </dl>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.routePlan') }}</h3>
      <p v-if="!dossier.routePlan.length" class="text-xs text-muted-foreground">
        {{ t('planning.dossier.noRoute') }}
      </p>
      <table v-else class="w-full text-xs border border-border">
        <thead class="bg-muted/50 text-muted-foreground">
          <tr>
            <th :class="[cell, 'text-left font-medium']">{{ t('planning.dossier.col.stop') }}</th>
            <th :class="[cell, 'text-left font-medium']">{{ t('planning.dossier.col.role') }}</th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.planned') }}
            </th>
            <th :class="[cell, 'text-left font-medium']">{{ t('planning.dossier.col.passed') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(stop, index) in dossier.routePlan"
            :key="index"
            class="border-t border-border"
          >
            <td :class="cell">{{ stop.siteName }}</td>
            <td :class="cell">{{ label('stopRole', stop.role) }}</td>
            <td :class="cell">{{ formatDateTime(stop.plannedAt) }}</td>
            <td :class="cell">
              {{ formatDateTime(stop.passedAt) }}
              <span v-if="stop.late" class="text-warning">· {{ t('planning.dossier.late') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.progress') }}</h3>
      <table class="w-full text-xs border border-border">
        <thead class="bg-muted/50 text-muted-foreground">
          <tr>
            <th :class="[cell, 'text-left font-medium']">{{ t('planning.dossier.col.point') }}</th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.planned') }}
            </th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.arrived') }}
            </th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.declared') }}
            </th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.reception') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="point in dossier.progress"
            :key="point.deliveryPointNo"
            class="border-t border-border align-top"
          >
            <td :class="cell">
              {{ point.recipientName || EMPTY_CELL }}
              <p class="text-muted-foreground">{{ point.deliveryPointName }}</p>
            </td>
            <td :class="cell">{{ formatDateTime(point.plannedAt) }}</td>
            <td :class="cell">{{ formatDateTime(point.arrivedAt) }}</td>
            <td :class="cell">{{ formatDateTime(point.declaredAt) }}</td>
            <td :class="cell">
              <template v-if="point.contestedAt">
                {{ t('planning.dossier.contested', { at: formatDateTime(point.contestedAt) }) }}
              </template>
              <template v-else-if="point.confirmedAt">
                {{ t('planning.dossier.confirmed', { at: formatDateTime(point.confirmedAt) }) }}
              </template>
              <template v-else>{{ EMPTY_CELL }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.goods') }}</h3>
      <table class="w-full text-xs border border-border">
        <thead class="bg-muted/50 text-muted-foreground">
          <tr>
            <th :class="[cell, 'text-left font-medium']">{{ t('planning.dossier.col.line') }}</th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.product') }}
            </th>
            <th :class="[cell, 'text-right font-medium']">
              {{ t('planning.dossier.col.ordered') }}
            </th>
            <th :class="[cell, 'text-right font-medium']">
              {{ t('planning.dossier.col.loaded') }}
            </th>
            <th :class="[cell, 'text-right font-medium']">
              {{ t('planning.dossier.col.received') }}
            </th>
            <th :class="[cell, 'text-right font-medium']">{{ t('planning.dossier.col.gap') }}</th>
            <th :class="[cell, 'text-left font-medium']">
              {{ t('planning.dossier.col.outcome') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="line in dossier.goods"
            :key="line.lineNo"
            class="border-t border-border align-top"
          >
            <td :class="cell">
              {{ line.lineNo }}
              <p class="text-muted-foreground">{{ line.deliveryPointName }}</p>
            </td>
            <td :class="cell">{{ line.productName }} ({{ line.unit }})</td>
            <td :class="[cell, 'text-right tabular-nums']">{{ number(line.quantity) }}</td>
            <td :class="[cell, 'text-right tabular-nums']">{{ number(line.loadedQuantity) }}</td>
            <td :class="[cell, 'text-right tabular-nums']">
              {{ number(line.receivedQuantity) }}
            </td>
            <td :class="[cell, 'text-right tabular-nums']">
              {{ number(line.quantityGap) }}
              <p v-if="line.quantityGap" class="text-muted-foreground">
                {{
                  line.gapQualification
                    ? t(`planning.dossier.gap.${line.gapQualification}`)
                    : t('planning.dossier.gap.none')
                }}
              </p>
            </td>
            <td :class="cell">
              {{ t(`planning.dossier.outcome.${line.outcome}`) }}
              <p v-for="note in line.protests" :key="note.no" class="text-muted-foreground">
                {{ note.no }} · {{ t(`planning.quality.status.${note.status}`) }}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.compliance') }}</h3>
      <p v-if="!compliance.tracked" class="text-xs text-muted-foreground">
        {{ t('planning.dossier.notTracked') }}
      </p>
      <template v-else>
        <p class="text-xs">
          {{
            compliance.compliant
              ? t('planning.dossier.compliant')
              : t('planning.dossier.notCompliant')
          }}
          ·
          {{
            t('planning.dossier.stopsPassed', {
              passed: compliance.stopsPassed,
              total: compliance.stopsTotal,
              late: compliance.lateStops
            })
          }}
        </p>
        <p v-if="!compliance.deviations.length" class="text-xs text-muted-foreground mt-1">
          {{ t('planning.dossier.noDeviation') }}
        </p>
        <ul v-else class="mt-1 space-y-0.5 text-xs">
          <li v-for="deviation in compliance.deviations" :key="deviation.no">
            {{ deviation.no }} · {{ deviation.typeName }} ·
            {{ formatDateTime(deviation.detectedAt) }}
            <template v-if="deviation.location"> · {{ deviation.location }}</template>
            · {{ label('deviationNature', deviation.nature) }}
          </li>
        </ul>
      </template>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.debriefing') }}</h3>
      <p v-if="!debriefing" class="text-xs text-muted-foreground">
        {{ t('planning.dossier.noDebriefing') }}
      </p>
      <dl v-else class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.closing.voucher') }}</dt>
        <dd>{{ debriefing.voucherNo }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.closing.loadedAt') }}</dt>
        <dd>{{ formatDateTime(debriefing.loadedAt) }}</dd>
        <dt class="text-muted-foreground">
          {{ t('planning.transportOrders.closing.unloadedAt') }}
        </dt>
        <dd>{{ formatDateTime(debriefing.unloadedAt) }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.closing.places') }}</dt>
        <dd>{{ debriefing.place || EMPTY_CELL }}</dd>
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.closing.vehicle') }}</dt>
        <dd>
          {{ debriefing.vehicle || EMPTY_CELL }}
          <template v-if="debriefing.trailer"> · {{ debriefing.trailer }}</template>
        </dd>
        <dt class="text-muted-foreground">
          {{ t('planning.transportOrders.closing.compartments') }}
        </dt>
        <dd>
          <p v-for="item in debriefing.compartments ?? []" :key="item.no">
            {{
              item.no
                ? t('planning.transportOrders.closing.compartmentNo', { no: item.no })
                : t('planning.transportOrders.closing.oneSpace')
            }}
            · {{ item.productName }} · {{ number(item.quantity) }} {{ item.unit }}
          </p>
        </dd>
        <dt class="text-muted-foreground">{{ t('planning.transportOrders.closing.gainLoss') }}</dt>
        <dd>
          <p v-for="line in gaps" :key="line.lineNo">
            {{ line.productName }} · {{ number(line.quantityGap) }} {{ line.unit }} ·
            {{
              line.gapQualification
                ? t(`planning.dossier.gap.${line.gapQualification}`)
                : t('planning.dossier.gap.none')
            }}
          </p>
          <template v-if="!gaps.length">{{ t('planning.transportOrders.closing.noGap') }}</template>
        </dd>
        <dt class="text-muted-foreground">
          {{ t('planning.transportOrders.closing.observations') }}
        </dt>
        <dd>{{ debriefing.observations || EMPTY_CELL }}</dd>
      </dl>
    </section>

    <section>
      <h3 :class="section">{{ t('planning.dossier.section.documents') }}</h3>
      <DocumentaryDossierList :dossier="dossier.dossier" />
    </section>
  </div>
</template>
