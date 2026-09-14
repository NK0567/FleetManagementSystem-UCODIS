<template>
  <ListPageLayout
    title="État de flotte"
    :subtitle="`Situation au 08 septembre 2026 · ${store.immobilises.length} véhicule(s) immobilisé(s)`"
    :columns="columns"
    row-key="vehiculeId"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} véhicule(s)`"
    search-placeholder="Plaque, chauffeur, voyage…"
    scope-label="Groupe :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
  >
    <template #header-actions>
      <SearchableDropdown v-model="dateAffichee" :items="optionsJours" placeholder="Situation du jour" compact class="mr-2" />
      <button :class="L.btnOutline" @click="archiver"><Archive class="w-4 h-4" /> Archiver</button>
      <button :class="L.btnOutline" @click="exporter"><Download class="w-4 h-4" /> Exporter</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">État</label>
        <SearchableDropdown v-model="filterEtat" :items="optEtats" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">{{ item.vehiculePlaque }}</span>
      <div v-if="item.semiRemorquePlaque" class="text-[11px] text-muted-foreground font-mono">{{ item.semiRemorquePlaque }}</div>
    </template>
    <template #cell-chauffeur="{ item }"><span class="text-xs">{{ item.chauffeurNom ?? 'Non assigné' }}</span></template>
    <template #cell-etat="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeGroupe(item.etat)">{{ item.etat }}</span>
      <div class="text-[11px] text-muted-foreground mt-0.5">{{ item.voyageRef ?? libelleEtat(item.etat) }}</div>
    </template>
    <template #cell-immobilisation="{ item }">
      <span v-if="item.codeIndispo" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ item.codeIndispo }}</span>
      <div v-if="item.motifIndispo" class="text-[11px] text-muted-foreground mt-0.5">{{ item.motifIndispo }}</div>
      <span v-if="!item.codeIndispo" class="text-xs text-success">Disponible</span>
    </template>
    <template #cell-remise="{ item }"><span class="text-xs text-muted-foreground">{{ item.remiseEnServicePrevue ? formatDate(item.remiseEnServicePrevue) : '-' }}</span></template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded" :class="classeGroupe(item.etat)">{{ item.etat }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ libelleEtat(item.etat) }}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div v-if="item.semiRemorquePlaque"><div class="text-muted-foreground text-[11px]">Semi-remorque</div><span class="font-mono">{{ item.semiRemorquePlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Chauffeur</div>{{ item.chauffeurNom ?? 'Non assigné' }}</div>
          <div v-if="item.voyageRef" class="col-span-2"><div class="text-muted-foreground text-[11px]">Voyage</div><span class="font-mono">{{ item.voyageRef }}</span></div>
        </div>

        <div v-if="item.codeIndispo" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">
          <strong class="font-mono">{{ item.codeIndispo }}</strong> - {{ item.motifIndispo }}
          <div v-if="item.remiseEnServicePrevue" class="mt-1">Remise en service prévue le {{ formatDate(item.remiseEnServicePrevue) }}.</div>
        </div>

        <p v-if="item.observation" class="text-[11px] text-muted-foreground leading-snug">{{ item.observation }}</p>
      </div>
    </template>

    <template #empty>
      <Truck class="w-8 h-8" />
      <p class="text-sm">Aucun véhicule trouvé</p>
    </template>
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Archive, CircleCheck, Download, Route, Truck, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import { useFlotteEtatStore, ETATS_FLOTTE, LIB_GROUPE_ETAT, libelleEtat } from '../../stores/flotteEtat'
import type { LigneEtatFlotte, GroupeEtatFlotte } from '../../types'
import { formatDate } from '../../utils/helpers'
import { exporterCsv } from '../../utils/exportCsv'
import * as L from '../../lib/listClasses'

const store = useFlotteEtatStore()

const searchQuery = ref('')
const activeScope = ref('')
const filterEtat = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)
const dateAffichee = ref('aujourd_hui')

const optionsJours: DropdownItem[] = [{ id: 'aujourd_hui', label: "08 septembre 2026 (aujourd'hui)" }]

function archiver() { /* Archive un instantané de l'état du jour. */ }
function exporter() {
  exporterCsv('etat-flotte', [
    { libelle: 'Véhicule', valeur: (l: LigneEtatFlotte) => l.vehiculePlaque },
    { libelle: 'Semi-remorque', valeur: (l: LigneEtatFlotte) => l.semiRemorquePlaque },
    { libelle: 'Chauffeur', valeur: (l: LigneEtatFlotte) => l.chauffeurNom },
    { libelle: 'État', valeur: (l: LigneEtatFlotte) => l.etat },
    { libelle: 'Libellé état', valeur: (l: LigneEtatFlotte) => libelleEtat(l.etat) },
    { libelle: 'Code indisponibilité', valeur: (l: LigneEtatFlotte) => l.codeIndispo },
    { libelle: 'Motif', valeur: (l: LigneEtatFlotte) => l.motifIndispo },
    { libelle: 'Remise en service prévue', valeur: (l: LigneEtatFlotte) => l.remiseEnServicePrevue ? formatDate(l.remiseEnServicePrevue) : '' },
    { libelle: 'Voyage', valeur: (l: LigneEtatFlotte) => l.voyageRef },
  ], filtered.value)
}

const COULEUR_GROUPE: Record<GroupeEtatFlotte, string> = {
  operationnel: 'bg-success-bg text-success', transit: 'bg-info-bg text-info', attente: 'bg-warning-bg text-warning',
}
function classeGroupe(code: string) {
  const def = ETATS_FLOTTE.find(e => e.code === code)
  return def ? COULEUR_GROUPE[def.groupe] : 'bg-neutral-bg text-neutral'
}

const scopeOptions = [
  { value: '', label: 'Tous les groupes' },
  { value: 'operationnel', label: LIB_GROUPE_ETAT.operationnel },
  { value: 'transit', label: LIB_GROUPE_ETAT.transit },
  { value: 'attente', label: LIB_GROUPE_ETAT.attente },
]
const optEtats = computed<DropdownItem[]>(() => ETATS_FLOTTE.map(e => ({ id: e.code, label: `${e.code} · ${e.libelle}` })))

const kpis = computed(() => [
  { label: 'Opérationnels', value: store.operationnels.length, icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'En transit', value: store.enTransit.length, icon: Route, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'En attente', value: store.enAttente.length, icon: Truck, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Immobilisés', value: store.immobilises.length, icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule', label: 'Véhicule', sortable: true, hideable: false, width: 140 },
  { key: 'chauffeur', label: 'Chauffeur', width: 160 },
  { key: 'etat', label: 'État', sortable: true, width: 170 },
  { key: 'immobilisation', label: 'Immobilisation', width: 190 },
  { key: 'remise', label: 'Remise en service', width: 140 },
])

watch([activeScope, filterEtat, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; filterEtat.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = store.lignes.filter(l => {
    if (activeScope.value && groupeDe(l.etat) !== activeScope.value) return false
    if (filterEtat.value && l.etat !== filterEtat.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${l.vehiculePlaque} ${l.chauffeurNom ?? ''} ${l.voyageRef ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const k = sortKey.value as keyof LigneEtatFlotte
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})
function groupeDe(code: string) { return ETATS_FLOTTE.find(e => e.code === code)?.groupe ?? 'attente' }

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
</script>
