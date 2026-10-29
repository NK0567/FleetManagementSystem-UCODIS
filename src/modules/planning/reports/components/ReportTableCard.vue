<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { ReportTable } from '@/modules/fleet/reports/composables/useReportFormat'

/** One table of a report, as shown and as exported (TRS08-US05). */
defineProps<{ table: ReportTable; hint?: string }>()
const { t } = useI18n()
</script>

<template>
  <div class="bg-card border border-border rounded overflow-x-auto min-w-0">
    <div class="px-4 py-3 border-b border-border">
      <h3 class="text-sm font-semibold text-card-foreground">{{ table.title }}</h3>
      <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-muted/40 text-xs text-muted-foreground">
          <th
            v-for="(header, index) in table.headers"
            :key="header"
            class="px-3 py-2 font-semibold whitespace-nowrap"
            :class="table.numeric[index] ? 'text-right' : 'text-left'"
          >
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!table.rows.length">
          <td :colspan="table.headers.length" class="px-3 py-4 text-muted-foreground">
            {{ t('planning.reports.noData') }}
          </td>
        </tr>
        <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex" class="border-t border-border">
          <td
            v-for="(item, index) in row"
            :key="index"
            class="px-3 py-1.5 whitespace-nowrap"
            :class="table.numeric[index] ? 'text-right tabular-nums' : 'text-card-foreground'"
          >
            {{ item.text }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
