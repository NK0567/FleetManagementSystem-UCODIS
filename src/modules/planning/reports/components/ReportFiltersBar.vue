<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ChoiceSelect from '@/modules/planning/transport-orders/components/ChoiceSelect.vue'
import type { ReportChoices, ReportFilters } from '../types/planningReport.types'

/** Period, depot, region and orderer, shared by the dashboard and the reports (TRS08-US01). */
const props = defineProps<{ choices: ReportChoices | null }>()
const filters = defineModel<ReportFilters>({ required: true })
const { t } = useI18n()

const depots = computed(() =>
  (props.choices?.depots ?? []).map((depot) => ({ value: depot.no, label: depot.name }))
)
const regions = computed(() =>
  (props.choices?.regions ?? []).map((region) => ({ value: region, label: region }))
)
const orderers = computed(() =>
  (props.choices?.orderers ?? []).map((orderer) => ({ value: orderer.no, label: orderer.name }))
)
const active = computed(() => Object.values(filters.value).some((value) => value !== ''))

function reset() {
  filters.value = { from: '', to: '', depotNo: '', region: '', ordererNo: '' }
}
</script>

<template>
  <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
    <BaseFormField :label="t('planning.reports.filter.from')">
      <DateFormInput v-model="filters.from" />
    </BaseFormField>
    <BaseFormField :label="t('planning.reports.filter.to')">
      <DateFormInput v-model="filters.to" />
    </BaseFormField>
    <BaseFormField :label="t('planning.reports.filter.depot')">
      <ChoiceSelect
        v-model="filters.depotNo"
        :choices="depots"
        :placeholder="t('planning.reports.filter.all')"
        clearable
      />
    </BaseFormField>
    <BaseFormField :label="t('planning.reports.filter.region')">
      <ChoiceSelect
        v-model="filters.region"
        :choices="regions"
        :placeholder="t('planning.reports.filter.all')"
        clearable
      />
    </BaseFormField>
    <BaseFormField :label="t('planning.reports.filter.orderer')">
      <ChoiceSelect
        v-model="filters.ordererNo"
        :choices="orderers"
        :placeholder="t('planning.reports.filter.all')"
        clearable
      />
    </BaseFormField>
    <div class="pb-0.5">
      <button
        type="button"
        class="cursor-pointer px-3 py-1.5 text-sm text-card-foreground hover:bg-accent border border-border rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="!active"
        @click="reset"
      >
        {{ t('planning.reports.filter.reset') }}
      </button>
    </div>
  </section>
</template>
