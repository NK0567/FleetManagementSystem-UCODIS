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
/* The tiles open the vehicle list, for whoever may read it. */
const { canRead: canSeeVehicles } = usePermissions('VEHICLE')
const parkTiles = computed(() =>
  company.value
    ? [
        { key: 'tractors', count: company.value.tractorCount, highlight: false },
        { key: 'trailers', count: company.value.trailerCount, highlight: false },
        { key: 'vehicles', count: company.value.vehicleCount, highlight: true }
      ]
    : []
)

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
          :title="
            !dirty
              ? t('settings.company.noChange')
              : missing
                ? t('settings.company.missingFields')
                : undefined
          "
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
          <component
            :is="canSeeVehicles ? 'RouterLink' : 'div'"
            v-for="tile in parkTiles"
            :key="tile.key"
            v-bind="canSeeVehicles ? { to: '/fleet/vehicles' } : {}"
            :title="canSeeVehicles ? t('settings.company.seeVehicles') : undefined"
            class="rounded p-3 text-center transition"
            :class="[
              tile.highlight ? 'bg-primary/10' : 'bg-accent/40',
              canSeeVehicles ? 'hover:ring-1 hover:ring-primary cursor-pointer' : ''
            ]"
            :data-testid="`park-${tile.key}`"
          >
            <p
              class="text-2xl font-semibold tabular-nums"
              :class="tile.highlight ? 'text-primary' : 'text-card-foreground'"
            >
              {{ tile.count }}
            </p>
            <p class="text-xs" :class="tile.highlight ? 'text-primary' : 'text-muted-foreground'">
              {{ t(`settings.company.${tile.key}`) }}
            </p>
          </component>
        </div>
      </section>
    </div>
  </div>
</template>
