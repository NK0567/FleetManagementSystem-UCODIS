<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { useOptionsStore } from '@/stores/optionsStore'
import { addDays, todayIso } from '@/utils/date'
import { formatDateTime, formatNumber } from '@/utils/format'
import { liveMapService } from '../services/liveMapService'
import type { VehicleJournalApi, VehicleJournalEntry } from '../types/liveMap.types'

/** Longest period the journal is read over, as the server allows it. */
const MAX_DAYS = 31

const props = defineProps<{ vehicleNo: string }>()

const { t } = useI18n()
const optionsStore = useOptionsStore()
const open = ref(false)
const to = ref(todayIso())
const from = ref(addDays(to.value, -(MAX_DAYS - 1)))
const family = ref<string>('')
const journal = ref<VehicleJournalApi | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const periodInvalid = computed(() => !from.value || !to.value || from.value > to.value)

async function load() {
  if (!open.value || periodInvalid.value) return
  loading.value = true
  error.value = null
  try {
    journal.value = await liveMapService.journal(
      props.vehicleNo,
      `${from.value}T00:00`,
      `${to.value}T23:59`
    )
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('fleet.liveMap.journal.loadError'))
  } finally {
    loading.value = false
  }
}

watch([open, () => props.vehicleNo], load)

/** Stops, deviations, behaviour, faults: the families a reader filters on. */
const families = computed(() => [
  ...new Set((journal.value?.entries ?? []).map((entry) => entry.family))
])

const familyLabel = (value: string) =>
  value === 'deviation'
    ? t('fleet.liveMap.journal.deviation')
    : optionsStore.getOptionLabel('telematicsFamily', value)

const entries = computed(() =>
  (journal.value?.entries ?? []).filter((entry) => !family.value || entry.family === family.value)
)

function measure(entry: VehicleJournalEntry) {
  if (entry.value === null) return ''
  const unitSet = entry.kind === 'deviation' ? 'deviationUnit' : 'telematicsUnit'
  const unit = entry.unit ? optionsStore.getOptionLabel(unitSet, entry.unit) : ''
  return `${formatNumber(entry.value, entry.value % 1 ? 2 : 0)} ${unit}`.trim()
}

const statusLabel = (entry: VehicleJournalEntry) =>
  optionsStore.getOptionLabel(
    entry.kind === 'deviation' ? 'deviationNature' : 'telematicsEventStatus',
    entry.status
  )

const severityLabel = (entry: VehicleJournalEntry) =>
  optionsStore.getOptionLabel(
    entry.kind === 'deviation' ? 'deviationSeverity' : 'telematicsSeverity',
    entry.severity
  )

const recordLink = (entry: VehicleJournalEntry) => ({
  path: entry.kind === 'deviation' ? '/fleet/route-deviations' : '/fleet/telematics-events',
  query: { no: entry.no, cardMode: 'view' }
})
</script>

<template>
  <div class="px-4 sm:px-6 lg:px-8 pb-6">
    <FormSection
      v-model:open="open"
      :title="t('fleet.liveMap.journal.title')"
      :summary="
        journal
          ? [
              t(
                'fleet.liveMap.journal.summary',
                { count: journal.entries.length },
                journal.entries.length
              )
            ]
          : []
      "
    >
      <div class="xl:col-span-2 min-w-0 space-y-3 text-sm">
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="load">
          <BaseFormField :label="t('fleet.liveMap.journal.from')">
            <DateFormInput v-model="from" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.liveMap.journal.to')">
            <DateFormInput v-model="to" />
          </BaseFormField>
          <BaseFormField :label="t('fleet.liveMap.journal.family')">
            <select
              v-model="family"
              class="h-9 px-2 border border-border rounded text-sm bg-card"
              :aria-label="t('fleet.liveMap.journal.family')"
            >
              <option value="">{{ t('fleet.liveMap.journal.allFamilies') }}</option>
              <option v-for="value in families" :key="value" :value="value">
                {{ familyLabel(value) }}
              </option>
            </select>
          </BaseFormField>
          <button
            type="submit"
            class="px-3 py-2 border border-border text-sm rounded hover:bg-accent disabled:opacity-60"
            :disabled="periodInvalid || loading"
          >
            {{ t('fleet.liveMap.journal.apply') }}
          </button>
        </form>
        <p v-if="periodInvalid" class="text-destructive">
          {{ t('fleet.liveMap.history.periodInvalid') }}
        </p>
        <FormAlerts :error="error" @clear:error="error = null" />
        <LoadingBar v-if="loading" :height="2" bar-color="var(--color-primary)" />
        <p v-if="journal && !entries.length" class="text-muted-foreground">
          {{ t('fleet.liveMap.journal.empty') }}
        </p>
        <div v-else-if="journal" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-muted-foreground text-left">
                <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.journal.col.at') }}</th>
                <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.journal.col.family') }}</th>
                <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.journal.col.type') }}</th>
                <th class="py-1 pr-3 font-normal">
                  {{ t('fleet.liveMap.journal.col.severity') }}
                </th>
                <th class="py-1 pr-3 font-normal text-right">
                  {{ t('fleet.liveMap.journal.col.value') }}
                </th>
                <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.journal.col.place') }}</th>
                <th class="py-1 pr-3 font-normal">{{ t('fleet.liveMap.journal.col.trip') }}</th>
                <th class="py-1 font-normal">{{ t('fleet.liveMap.journal.col.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in entries" :key="entry.no" class="border-t border-border">
                <td class="py-1 pr-3 whitespace-nowrap">{{ formatDateTime(entry.at) }}</td>
                <td class="py-1 pr-3 whitespace-nowrap">{{ familyLabel(entry.family) }}</td>
                <td class="py-1 pr-3">
                  <RouterLink :to="recordLink(entry)" class="text-primary hover:underline">
                    {{ entry.typeName }}
                  </RouterLink>
                  <span v-if="entry.detail" class="block text-xs text-muted-foreground">
                    {{ entry.detail }}
                  </span>
                </td>
                <td class="py-1 pr-3 whitespace-nowrap">{{ severityLabel(entry) }}</td>
                <td class="py-1 pr-3 text-right tabular-nums whitespace-nowrap">
                  {{ measure(entry) }}
                </td>
                <td class="py-1 pr-3">{{ entry.place }}</td>
                <td class="py-1 pr-3 whitespace-nowrap">{{ entry.tripNo ?? '' }}</td>
                <td class="py-1 whitespace-nowrap">{{ statusLabel(entry) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </FormSection>
  </div>
</template>
