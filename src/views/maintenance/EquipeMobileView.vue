<template>
  <ListPageLayout
    title="Équipe mobile"
    :subtitle="`Patrouille conjointe - dépannage, sécurisation, contrôles inopinés · ${store.mobilesEnCours.length} en cours`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} intervention(s)`"
    search-placeholder="Référence, plaque, lieu…"
    scope-label="Type :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
          <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
          <p v-if="k.cible" class="text-[11px] text-muted-foreground mt-0.5">{{ k.cible }}</p>
        </div>
      </div>
    </template>

    <template #cell-reference="{ item }">
      <span class="font-mono font-semibold text-foreground">{{ item.reference }}</span>
      <div class="text-[11px] text-muted-foreground">{{ LIB_MISSION_MOBILE[item.type] }}</div>
    </template>

    <template #cell-cible="{ item }">
      <span v-if="item.vehiculePlaque" class="font-mono text-xs">{{ item.vehiculePlaque }}</span>
      <span v-else class="text-xs text-muted-foreground">Contrôle général</span>
      <div class="text-[11px] text-muted-foreground">{{ item.lieu }}</div>
    </template>

    <template #cell-equipe="{ item }">
      <div class="text-[11px] text-muted-foreground leading-snug">
        <div v-for="m in item.equipe" :key="m">{{ m }}</div>
      </div>
    </template>

    <template #cell-delai="{ item }">
      <span v-if="delaiIntervention(item) != null" class="text-xs font-medium"
        :class="(delaiIntervention(item) ?? 0) > 120 ? 'text-danger' : 'text-success'">
        {{ fmtDuree(delaiIntervention(item) ?? 0) }}
      </span>
      <span v-else class="text-muted-foreground">-</span>
      <div class="text-[11px] text-muted-foreground">cible &lt; 2 h</div>
    </template>

    <template #cell-tests="{ item }">
      <template v-if="item.testsRealises != null">
        <span class="text-xs font-semibold">{{ item.testsRealises }} test(s)</span>
        <div class="text-[11px]" :class="item.testsPositifs ? 'text-danger font-medium' : 'text-success'">
          {{ item.testsPositifs }} positif(s)
        </div>
      </template>
      <span v-else class="text-muted-foreground">-</span>
    </template>

    <template #cell-resultat="{ item }">
      <span v-if="!item.clotureLe" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">En cours</span>
      <span v-else-if="item.resolu" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Résolue</span>
      <span v-else class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Non résolue</span>
    </template>

    <template #cell-date="{ item }">
      <span class="text-xs">{{ fmtDateHeure(item.declencheLe) }}</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <div class="font-mono font-semibold text-foreground">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">{{ LIB_MISSION_MOBILE[item.type] }}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Lieu</div>{{ item.lieu }}</div>
          <div v-if="item.vehiculePlaque"><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
          <div v-if="delaiIntervention(item) != null"><div class="text-muted-foreground text-[11px]">Délai d'arrivée</div>{{ fmtDuree(delaiIntervention(item) ?? 0) }}</div>
        </div>

        <div>
          <div class="text-muted-foreground text-[11px] mb-1">Composition de l'équipe</div>
          <div v-for="m in item.equipe" :key="m" class="text-[11px] text-foreground">· {{ m }}</div>
        </div>

        <p v-if="item.observation" class="text-[11px] text-muted-foreground leading-snug">{{ item.observation }}</p>

        <div v-if="item.ordreTravailId" class="bg-info-bg text-info rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Un ordre de travail a été ouvert : <strong class="font-mono">{{ item.ordreTravailId }}</strong>
        </div>
      </div>
    </template>

    <template #empty><Users class="w-8 h-8" /><p class="text-sm">Aucune intervention</p></template>
  </ListPageLayout>
</template>

<script setup lang="ts">
/**
 * Interventions de l'équipe mobile conjointe. Objectifs suivis : au
 * moins 20 tests par mois, positivité nulle, 90 % d'interventions
 * résolues, délai moyen inférieur à 2 h. La mention d'une fuite de
 * citerne n'a pas d'équivalent en fret sec et n'est pas reprise (voir
 * types/maintenance.ts).
 */
import { ref, computed, watch } from 'vue'
import { Users } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_MISSION_MOBILE } from '../../types/maintenance'
import type { InterventionMobile } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()

const searchQuery = ref('')
const activeScope = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

const scopeOptions = [
  { value: '', label: 'Toutes les missions' },
  { value: 'depanne', label: 'Dépannages' },
  { value: 'controle', label: 'Contrôles' },
]

/** Formate une durée en minutes en heures et minutes lisibles. */
function fmtDuree(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h ${m > 0 ? m + ' min' : ''}`.trim() : `${m} min`
}

/** Délai entre le déclenchement et l'arrivée sur place, en minutes. */
function delaiIntervention(i: InterventionMobile): number | null {
  if (!i.arriveeLe) return null
  return Math.round((+new Date(i.arriveeLe) - +new Date(i.declencheLe)) / 60_000)
}

const tauxResolution = computed(() => {
  const closes = store.interventionsMobiles.filter(i => i.clotureLe)
  if (!closes.length) return null
  return Math.round(closes.filter(i => i.resolu).length / closes.length * 100)
})

const totalTests = computed(() => store.interventionsMobiles.reduce((s, i) => s + (i.testsRealises ?? 0), 0))
const totalPositifs = computed(() => store.interventionsMobiles.reduce((s, i) => s + (i.testsPositifs ?? 0), 0))

const delaiMoyen = computed(() => {
  const d = store.interventionsMobiles.map(delaiIntervention).filter((x): x is number => x != null)
  if (!d.length) return null
  return Math.round(d.reduce((a, b) => a + b, 0) / d.length)
})

const kpis = computed(() => [
  { label: 'Tests réalisés', value: String(totalTests.value), cls: totalTests.value >= 20 ? 'text-success' : 'text-warning', cible: 'cible ≥ 20 / mois' },
  { label: 'Tests positifs', value: String(totalPositifs.value), cls: totalPositifs.value === 0 ? 'text-success' : 'text-danger', cible: 'cible 0' },
  { label: 'Taux de résolution', value: tauxResolution.value != null ? tauxResolution.value + ' %' : '-', cls: (tauxResolution.value ?? 0) >= 90 ? 'text-success' : 'text-danger', cible: 'cible ≥ 90 %' },
  { label: 'Délai moyen', value: delaiMoyen.value != null ? fmtDuree(delaiMoyen.value) : '-', cls: (delaiMoyen.value ?? 0) <= 120 ? 'text-success' : 'text-danger', cible: 'cible < 2 h' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Intervention', sortable: true, width: 200 },
  { key: 'cible', label: 'Cible', width: 200 },
  { key: 'equipe', label: 'Équipe', width: 210 },
  { key: 'delai', label: 'Délai', width: 120 },
  { key: 'tests', label: 'Contrôles', width: 120 },
  { key: 'resultat', label: 'Résultat', width: 120 },
  { key: 'date', label: 'Déclenchée', sortable: true, width: 155 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() =>
  store.interventionsMobiles
    .filter(i => {
      if (activeScope.value === 'depanne' && !i.type.startsWith('depannage')) return false
      if (activeScope.value === 'controle' && !i.type.startsWith('controle')) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        if (!`${i.reference} ${i.vehiculePlaque ?? ''} ${i.lieu}`.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => +new Date(b.declencheLe) - +new Date(a.declencheLe)))

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
</script>
