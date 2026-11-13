<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageSquareWarning } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import DriverReportStatusPill from '@/modules/fleet/driver-reports/components/DriverReportStatusPill.vue'
import type { DriverReportApi } from '@/modules/fleet/driver-reports/types/driverReport.types'
import { useOptionsStore } from '@/stores/optionsStore'
import { todayIso } from '@/utils/date'
import { formatDate } from '@/utils/format'
import { myReportsApi, type MyReportInput } from '../api/myReportsApi'

/** Same floor as a breakdown symptom: a report needs a few words to be usable. */
const MIN_SUBJECT = 5

const { t } = useI18n()
const optionsStore = useOptionsStore()
/** Only the driver reports; the assistant reads. */
const { canExecute } = usePermissions('MYSPACE')

const reports = ref<DriverReportApi[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const emptyForm = (): MyReportInput => ({
  kind: 'technical',
  severity: 'minor',
  urgency: 'observation',
  subject: '',
  description: '',
  occurredOn: todayIso()
})
const form = ref<MyReportInput>(emptyForm())

const canSend = computed(
  () =>
    !saving.value &&
    form.value.subject.trim().length >= MIN_SUBJECT &&
    !!form.value.occurredOn &&
    form.value.occurredOn <= todayIso()
)

async function load() {
  loading.value = true
  try {
    reports.value = (await myReportsApi.list()).data.data
  } catch (failure) {
    error.value = apiErrorMessage(failure, t('selfService.reports.loadError'))
  } finally {
    loading.value = false
  }
}

async function send() {
  if (!canSend.value) return
  saving.value = true
  error.value = null
  notice.value = null
  try {
    await myReportsApi.send({
      ...form.value,
      subject: form.value.subject.trim(),
      description: form.value.description.trim()
    })
    notice.value = t('selfService.reports.sent')
    form.value = emptyForm()
    await load()
  } catch (failure) {
    error.value = apiErrorMessage(failure, t('selfService.reports.sendError'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="driver-touch px-3 py-4 space-y-4 w-full max-w-5xl mx-auto">
    <header>
      <h1 class="text-xl font-semibold text-card-foreground">
        {{ t('selfService.reports.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">{{ t('selfService.reports.subtitle') }}</p>
    </header>

    <FormAlerts
      :error="error"
      :success="notice"
      @clear:error="error = null"
      @clear:success="notice = null"
    />

    <div class="grid gap-4 md:items-start" :class="canExecute ? 'md:grid-cols-2' : ''">
      <section v-if="canExecute" class="bg-card border border-border rounded p-4 space-y-3">
        <h2 class="text-sm font-semibold text-card-foreground">
          {{ t('selfService.reports.new') }}
        </h2>
        <BaseFormField :label="t('fleet.driverReports.form.kind')" required>
          <OptionsSelect
            :model-value="form.kind"
            options-key="driverReportKind"
            @update:model-value="form.kind = String($event)"
          />
        </BaseFormField>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BaseFormField :label="t('fleet.driverReports.form.severity')">
            <OptionsSelect
              :model-value="form.severity"
              options-key="driverReportSeverity"
              @update:model-value="form.severity = String($event)"
            />
          </BaseFormField>
          <BaseFormField :label="t('fleet.driverReports.form.urgency')">
            <OptionsSelect
              :model-value="form.urgency"
              options-key="driverReportUrgency"
              @update:model-value="form.urgency = String($event)"
            />
          </BaseFormField>
        </div>
        <BaseFormField :label="t('fleet.driverReports.form.subject')" required>
          <FormInput v-model="form.subject" :maxlength="120" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.driverReports.form.occurredOn')" required>
          <DateFormInput v-model="form.occurredOn" />
        </BaseFormField>
        <BaseFormField :label="t('fleet.driverReports.form.description')">
          <FormTextarea v-model="form.description" :rows="3" :maxlength="500" />
        </BaseFormField>
        <button
          type="button"
          class="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSend"
          @click="send"
        >
          <MessageSquareWarning class="w-5 h-5" />
          {{ t('selfService.reports.send') }}
        </button>
      </section>

      <section class="bg-card border border-border rounded">
        <h2 class="px-4 py-3 border-b border-border text-sm font-semibold text-card-foreground">
          {{ t('selfService.reports.mine') }}
        </h2>
        <LoadingSpinner v-if="loading && !reports.length" :text="t('common.loading')" />
        <p v-else-if="!reports.length" class="p-6 text-center text-sm text-muted-foreground">
          {{ t('selfService.reports.empty') }}
        </p>
        <ul v-else class="divide-y divide-border">
          <li v-for="report in reports" :key="report.no" class="px-4 py-3 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-medium text-card-foreground min-w-0 break-words">
                {{ report.subject }}
              </p>
              <DriverReportStatusPill :status="report.status" />
            </div>
            <p class="text-xs text-muted-foreground">
              {{ report.no }} · {{ optionsStore.getOptionLabel('driverReportKind', report.kind) }} ·
              {{ formatDate(report.reportedOn) }}
            </p>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
