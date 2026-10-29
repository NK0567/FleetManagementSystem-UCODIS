<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOptionsStore } from '@/stores/optionsStore'
import { formatDate, formatDateTime } from '@/utils/format'
import type { InspectionApi } from '../types/inspection.types'

/** The dated and signed report of an inspection, laid out to be printed and kept for an audit. */
defineProps<{ inspection: InspectionApi }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const root = ref<HTMLElement | null>(null)
defineExpose({ root })
</script>

<template>
  <div ref="root">
    <h1>{{ t('fleet.inspections.report.title', { no: inspection.no }) }}</h1>
    <dl>
      <dt>{{ t('fleet.inspections.form.vehicleNo') }}</dt>
      <dd>{{ inspection.vehiclePlate }}</dd>
      <dt>{{ t('fleet.inspections.form.inspectedOn') }}</dt>
      <dd>{{ formatDate(inspection.inspectedOn) }}</dd>
      <dt>{{ t('fleet.inspections.form.center') }}</dt>
      <dd>{{ inspection.center }}</dd>
      <dt>{{ t('fleet.inspections.form.result') }}</dt>
      <dd>{{ optionsStore.getOptionLabel('inspectionResult', inspection.result) }}</dd>
    </dl>
    <table v-if="inspection.items.length">
      <thead>
        <tr>
          <th>{{ t('fleet.inspections.grid.code') }}</th>
          <th>{{ t('fleet.inspections.grid.item') }}</th>
          <th>{{ t('fleet.inspections.grid.verdict') }}</th>
          <th>{{ t('fleet.inspections.grid.comment') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in inspection.items" :key="item.itemNo">
          <td>{{ item.itemNo }}</td>
          <td>{{ item.label }}</td>
          <td>{{ optionsStore.getOptionLabel('inspectionVerdict', item.verdict) }}</td>
          <td>{{ item.comment }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>{{ t('fleet.inspections.grid.legacy') }}</p>
    <p v-if="inspection.findings">
      {{ t('fleet.inspections.form.findings') }} : {{ inspection.findings }}
    </p>
    <p v-if="inspection.recheckDueOn">
      {{
        t('fleet.inspections.report.recheck', {
          date: formatDate(inspection.recheckDueOn),
          items: inspection.recheckItemNos.join(', ') || '-'
        })
      }}
    </p>
    <p>
      {{
        inspection.signedAt
          ? t('fleet.inspections.form.signedBy', {
              inspector: inspection.inspector,
              user: inspection.signedBy,
              date: formatDateTime(inspection.signedAt)
            })
          : t('fleet.inspections.form.notSigned')
      }}
    </p>
  </div>
</template>
