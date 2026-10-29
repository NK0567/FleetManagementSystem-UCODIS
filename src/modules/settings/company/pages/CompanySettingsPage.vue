<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Landmark, Truck } from '@lucide/vue'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { companySettingsApi } from '../api/companySettingsApi'
import type { CompanySettingsApi, CompanySettingsInput } from '../types/companySettings.types'

const FIELDS: (keyof CompanySettingsInput)[] = [
  'legalName',
  'entityName',
  'activity',
  'address',
  'country',
  'taxId'
]
const REQUIRED = new Set<keyof CompanySettingsInput>(['legalName', 'entityName', 'country'])

const { t } = useI18n()
const { canUpdate } = usePermissions('COMPANYSETTINGS')

const company = ref<CompanySettingsApi | null>(null)
const draft = reactive<CompanySettingsInput>({
  legalName: '',
  entityName: '',
  activity: '',
  address: '',
  country: '',
  taxId: ''
})
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

function fill(value: CompanySettingsApi) {
  company.value = value
  for (const field of FIELDS) draft[field] = value[field]
}

const dirty = computed(
  () => !!company.value && FIELDS.some((field) => draft[field] !== company.value?.[field])
)
const missing = computed(() => FIELDS.some((field) => REQUIRED.has(field) && !draft[field].trim()))

async function load() {
  loading.value = true
  error.value = null
  try {
    fill(await companySettingsApi.get())
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('settings.company.loadError'))
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = null
  saved.value = false
  try {
    fill(await companySettingsApi.update({ ...draft }))
    saved.value = true
  } catch (cause) {
    error.value = apiErrorMessage(cause, t('settings.company.saveError'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="px-2 py-4 space-y-4 max-w-5xl">
    <header class="flex items-start justify-between gap-4">
      <h1 class="text-xl font-semibold text-card-foreground">{{ t('settings.company.title') }}</h1>
      <div v-if="canUpdate && company" class="flex gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-sm border border-border rounded hover:bg-accent transition disabled:opacity-60"
          :disabled="!dirty || saving"
          @click="fill(company)"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition disabled:opacity-60"
          :disabled="!dirty || missing || saving"
          @click="save"
        >
          {{ t('common.save') }}
        </button>
      </div>
    </header>

    <FormAlerts
      :error="error"
      :success="saved ? t('settings.company.saved') : null"
      @clear:error="error = null"
      @clear:success="saved = false"
    />
    <LoadingSpinner v-if="loading && !company" :text="t('common.loading')" />

    <div v-if="company" class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <section class="bg-card border border-border rounded p-4 space-y-3">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Landmark class="w-4 h-4 text-primary" /> {{ t('settings.company.identity') }}
        </h2>
        <BaseFormField
          v-for="field in FIELDS"
          :key="field"
          :field="field"
          :label="t(`settings.company.field.${field}`)"
          :required="canUpdate && REQUIRED.has(field)"
        >
          <FormInput
            v-model="draft[field]"
            :maxlength="field === 'activity' ? 200 : 120"
            :disabled="!canUpdate || saving"
            :invalid="REQUIRED.has(field) && !draft[field].trim()"
          />
        </BaseFormField>
      </section>

      <section class="bg-card border border-border rounded p-4 space-y-3">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Truck class="w-4 h-4 text-primary" /> {{ t('settings.company.park') }}
        </h2>
        <div class="grid grid-cols-3 gap-3">
          <div class="rounded bg-accent/40 p-3 text-center">
            <p class="text-2xl font-semibold tabular-nums text-card-foreground">
              {{ company.tractorCount }}
            </p>
            <p class="text-xs text-muted-foreground">{{ t('settings.company.tractors') }}</p>
          </div>
          <div class="rounded bg-accent/40 p-3 text-center">
            <p class="text-2xl font-semibold tabular-nums text-card-foreground">
              {{ company.trailerCount }}
            </p>
            <p class="text-xs text-muted-foreground">{{ t('settings.company.trailers') }}</p>
          </div>
          <div class="rounded bg-primary/10 p-3 text-center">
            <p class="text-2xl font-semibold tabular-nums text-primary">
              {{ company.vehicleCount }}
            </p>
            <p class="text-xs text-primary">{{ t('settings.company.vehicles') }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
