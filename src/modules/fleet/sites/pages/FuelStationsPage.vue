<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiErrorMessage } from '@/core/api/apiError'
import { usePermissions } from '@/composables/usePermissions'
import { useReferenceStore } from '@/stores/referenceStore'
import { siteService } from '../services/siteService'
import type { SiteApi } from '../types/site.types'

const FUEL_STATION_TYPE = 'FUEL-STATION'

const { t } = useI18n()
const { canUpdate } = usePermissions('SITE')
const referenceStore = useReferenceStore()

const stations = ref<SiteApi[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const selectedNo = ref<string | null>(null)
const draft = ref<string[]>([])
const saving = ref(false)
const saved = ref(false)

const vehicles = computed(() => referenceStore.getItems('motorizedVehicles'))
const plateOf = computed(
  () => new Map(vehicles.value.map((vehicle) => [vehicle.code, vehicle.description]))
)
const selected = computed(() => stations.value.find((station) => station.no === selectedNo.value))
const dirty = computed(
  () =>
    !!selected.value &&
    [...draft.value].sort().join('|') !== [...selected.value.approvedVehicleNos].sort().join('|')
)

async function load() {
  loading.value = true
  error.value = null
  try {
    await referenceStore.fetchAll()
    const page = await siteService.getAll({ page: 1, pageSize: 500, sortBy: 'name' })
    stations.value = page.data.items.filter(
      (site) => site.siteTypeNo === FUEL_STATION_TYPE && site.active
    )
    if (!selectedNo.value && stations.value[0]) pick(stations.value[0].no)
  } catch (e) {
    error.value = apiErrorMessage(e, t('fleet.sites.stations.loadError'))
  } finally {
    loading.value = false
  }
}

function pick(no: string) {
  selectedNo.value = no
  draft.value = [...(stations.value.find((station) => station.no === no)?.approvedVehicleNos ?? [])]
  saved.value = false
}

function toggle(no: string, checked: boolean) {
  const list = new Set(draft.value)
  if (checked) list.add(no)
  else list.delete(no)
  draft.value = [...list]
  saved.value = false
}

async function save() {
  if (!selected.value) return
  saving.value = true
  error.value = null
  try {
    const updated = await siteService.update(selected.value.no, {
      approvedVehicleNos: draft.value
    })
    stations.value = stations.value.map((station) =>
      station.no === updated.no ? updated : station
    )
    saved.value = true
  } catch (e) {
    error.value = apiErrorMessage(e, t('fleet.sites.stations.saveError'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="h-full flex flex-col bg-white">
    <div class="px-4 py-3 border-b border-border">
      <h2 class="text-base font-semibold text-card-foreground">
        {{ t('fleet.sites.stations.title') }}
      </h2>
      <p class="text-xs text-muted-foreground mt-1">{{ t('fleet.sites.stations.hint') }}</p>
    </div>

    <p v-if="error" class="mx-4 mt-3 text-sm text-destructive">{{ error }}</p>
    <p v-else-if="loading" class="mx-4 mt-3 text-sm text-muted-foreground">
      {{ t('common.loading') }}
    </p>
    <p v-else-if="!stations.length" class="mx-4 mt-3 text-sm text-muted-foreground">
      {{ t('fleet.sites.stations.empty') }}
    </p>

    <div v-if="stations.length" class="flex-1 min-h-0 flex flex-col md:flex-row">
      <ul class="md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border overflow-auto">
        <li v-for="station in stations" :key="station.no">
          <button
            type="button"
            class="w-full text-left px-4 py-3 border-b border-border hover:bg-accent"
            :class="station.no === selectedNo ? 'bg-accent' : ''"
            @click="pick(station.no)"
          >
            <div class="text-sm font-medium text-card-foreground">{{ station.name }}</div>
            <div class="text-xs text-muted-foreground">
              {{ [station.city, station.region].filter(Boolean).join(', ') }}
            </div>
            <div
              class="text-xs mt-1"
              :class="station.approvedVehicleNos.length ? '' : 'text-muted-foreground'"
            >
              {{
                station.approvedVehicleNos.length
                  ? t('fleet.sites.stations.count', { count: station.approvedVehicleNos.length })
                  : t('fleet.sites.stations.openToAll')
              }}
            </div>
          </button>
        </li>
      </ul>

      <section v-if="selected" class="flex-1 min-w-0 p-4 overflow-auto">
        <h3 class="text-sm font-semibold text-card-foreground">{{ selected.name }}</h3>
        <p class="text-xs text-muted-foreground mt-1 mb-3">
          {{ t('fleet.sites.stations.listHint') }}
        </p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <label
            v-for="vehicle in vehicles"
            :key="vehicle.code"
            class="flex items-center gap-2 text-sm text-card-foreground"
          >
            <input
              type="checkbox"
              class="h-4 w-4 accent-primary"
              :checked="draft.includes(vehicle.code)"
              :disabled="!canUpdate || saving"
              @change="toggle(vehicle.code, ($event.target as HTMLInputElement).checked)"
            />
            {{ plateOf.get(vehicle.code) ?? vehicle.code }}
          </label>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <button
            v-if="canUpdate"
            type="button"
            class="px-4 py-2 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50"
            :disabled="!dirty || saving"
            @click="save"
          >
            {{ t('common.save') }}
          </button>
          <span v-if="saved" class="text-sm text-emerald-700">{{
            t('fleet.sites.stations.saved')
          }}</span>
        </div>
      </section>
    </div>
  </div>
</template>
