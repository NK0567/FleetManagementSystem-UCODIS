<template>
  <ListPageLayout
    title="Voyages"
    :subtitle="`${voyages.voyages.length} voyage(s) · objet pivot du suivi d'exploitation`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} voyage(s)`"
    search-placeholder="Référence, OT, plaque, chauffeur…"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(v) => ouvrirFiche((v as Voyage).id)"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Nouveau voyage</button>
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
        <label :class="L.fpFieldLabel">Trajet</label>
        <SearchableDropdown v-model="filterTrajet" :items="optionsTrajets" placeholder="Tous" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Client</label>
        <SearchableDropdown v-model="filterClient" :items="optionsClients" placeholder="Tous" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Sites</label>
        <SearchableDropdown v-model="filterDossier" :items="optFilterDossier" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary"
              @click="resetFilters">Réinitialiser</button>
    </template>

    <template #cell-reference="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
              @click.stop="ouvrirFiche(item.id)">{{ item.reference }}</button>
      <div v-if="item.numeroOT" class="text-[11px] text-muted-foreground">OT {{ item.numeroOT }}</div>
    </template>
    <template #cell-statut="{ item }">
      <span :class="STATUT[item.statut].cls" class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">{{ STATUT[item.statut].label }}</span>
    </template>
    <template #cell-trajet="{ item }">
      <span class="text-xs text-foreground">{{ item.origine }} → {{ item.destination }}</span>
      <div class="text-[11px] text-muted-foreground truncate">{{ item.trajetLibelle ?? 'Trajet ponctuel' }}</div>
    </template>
    <template #cell-sites="{ item }">
      <div class="flex items-center gap-1.5">
        <div class="w-16 h-1.5 rounded-full bg-background overflow-hidden">
          <div class="h-full rounded-full" :class="avancement(item).pct === 100 ? 'bg-success' : 'bg-primary'" :style="{ width: avancement(item).pct + '%' }"></div>
        </div>
        <span class="text-[11px] font-medium">{{ avancement(item).faits }}/{{ avancement(item).total }}</span>
      </div>
      <div class="text-[11px] text-muted-foreground">
        {{ nbLivraisons(item) }} livraison(s)
        <span v-if="nbNonDesservis(item)" class="text-danger font-medium"> · {{ nbNonDesservis(item) }} manqué(s)</span>
      </div>
    </template>
    <template #cell-marchandise="{ item }">
      <span class="text-xs">{{ fmtKg(item.marchandise.poidsChargeKg) }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.marchandise.nombreCartons }} cartons</div>
    </template>
    <template #cell-vehicule="{ item }">
      <span v-if="item.vehiculePlaque" class="font-mono text-xs">{{ item.vehiculePlaque }}</span>
      <span v-else class="text-muted-foreground">-</span>
      <div v-if="item.chauffeurNom" class="text-[11px] text-muted-foreground">{{ item.chauffeurNom }}</div>
    </template>
    <template #cell-ecart="{ item }">
      <template v-if="voyages.ecartPoids(item.id)?.ecartPourcent != null">
        <span class="text-xs font-medium" :class="{
          'text-success': voyages.ecartPoids(item.id)!.verdict === 'dans_tolerance',
          'text-warning': voyages.ecartPoids(item.id)!.verdict === 'hors_mineur',
          'text-danger': voyages.ecartPoids(item.id)!.verdict === 'hors_majeur',
        }">{{ voyages.ecartPoids(item.id)!.ecartPourcent }} %</span>
        <div class="text-[11px] text-muted-foreground">seuil {{ item.toleranceEcartPoidsPourcent }} %</div>
      </template>
      <span v-else class="text-muted-foreground">-</span>
    </template>
    <template #cell-conformite="{ item }">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span v-if="item.nbEcarts > 0" class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-danger-bg text-danger">{{ item.nbEcarts }} écart{{ item.nbEcarts > 1 ? 's' : '' }}</span>
        <span v-if="item.nbArretsNonJustifies > 0" class="text-[11px] font-medium px-1.5 py-0.5 rounded bg-warning-bg text-warning">{{ item.nbArretsNonJustifies }} arrêt{{ item.nbArretsNonJustifies > 1 ? 's' : '' }}</span>
        <span v-if="item.nbEcarts === 0 && item.nbArretsNonJustifies === 0" class="text-[11px] text-success">Conforme</span>
      </div>
    </template>
    <template #cell-dossier="{ item }">
      <div class="flex items-center gap-1.5">
        <div class="w-14 h-1.5 rounded-full bg-background overflow-hidden">
          <div class="h-full rounded-full" :class="voyages.completudeDossier(item.id).complet ? 'bg-success' : 'bg-warning'" :style="{ width: voyages.completudeDossier(item.id).pct + '%' }"></div>
        </div>
        <span class="text-[11px] text-muted-foreground">{{ voyages.completudeDossier(item.id).presents }}/{{ voyages.completudeDossier(item.id).total }}</span>
      </div>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span :class="STATUT[item.statut].cls" class="text-xs font-medium px-2 py-0.5 rounded-full">{{ STATUT[item.statut].label }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">{{ item.origine }} → {{ item.destination }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Client</div>{{ item.clientNom }}</div>
          <div><div class="text-muted-foreground text-[11px]">Marchandise</div>{{ item.marchandise.typeProduit }}</div>
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque ?? '-' }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Chauffeur</div>{{ item.chauffeurNom ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Km référence</div>{{ item.kmReference }} km</div>
          <div><div class="text-muted-foreground text-[11px]">Départ</div>{{ fmtDateHeure(item.datePlanifiee) }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir le dossier de voyage</button>
      </div>
    </template>

    <template #empty>
      <Package class="w-8 h-8" />
      <p class="text-sm">Aucun voyage trouvé</p>
    </template>

    <VoyageFormModal v-if="creationOuverte" @close="creationOuverte = false" @created="id => { creationOuverte = false; ouvrirFiche(id) }" />
    <VoyageCard v-if="ficheId" :voyages="voyages.voyages" :voyage-id="ficheId" @close="ficheId = null" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AlertTriangle, MapPinned, Package, Plus, Weight } from '@lucide/vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import VoyageFormModal from '../../components/flotte/VoyageFormModal.vue'
import VoyageCard from '../../components/flotte/VoyageCard.vue'
import { useVoyagesStore } from '../../stores/voyages'
import { useTrajetsStore } from '../../stores/trajets'
import type { Voyage, StatutVoyage } from '../../types'
import { avancementEtapes, fmtKg, fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const voyages = useVoyagesStore()
const trajets = useTrajetsStore()

const searchQuery = ref('')
const activeScope = ref('')
const filterTrajet = ref('')
const filterClient = ref('')
const filterDossier = ref('')
const creationOuverte = ref(false)
const ficheId = ref<string | null>(null)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

const STATUT: Record<StatutVoyage, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-warning-bg text-warning' },
  planifie: { label: 'Planifié', cls: 'bg-neutral-bg text-neutral' },
  affecte: { label: 'Affecté', cls: 'bg-primary/10 text-primary' },
  en_cours: { label: 'En cours', cls: 'bg-info-bg text-info' },
  livre: { label: 'Livré', cls: 'bg-success-bg text-success' },
  cloture: { label: 'Clôturé', cls: 'bg-neutral-bg text-neutral' },
  litige: { label: 'En litige', cls: 'bg-danger-bg text-danger' },
  annule: { label: 'Annulé', cls: 'bg-neutral-bg text-neutral' },
}

const scopeOptions = [
  { value: '', label: 'Tous les voyages' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'livre', label: 'À clôturer' },
  { value: 'litige', label: 'En litige' },
  { value: 'cloture', label: 'Clôturés' },
]

const clients = computed(() => [...new Set(voyages.voyages.map(v => v.clientNom))].sort())
const optionsTrajets = computed<DropdownItem[]>(() => trajets.actifs.map(t => ({ id: t.id, label: t.code, sublabel: t.libelle })))
const optionsClients = computed<DropdownItem[]>(() => clients.value.map(c => ({ id: c, label: c })))
const optFilterDossier: DropdownItem[] = [
  { id: 'complet', label: 'Tous desservis' },
  { id: 'incomplet', label: 'Site(s) manqué(s)' },
]

const sitesRestants = computed(() => voyages.enCours.reduce((n, v) => n + v.etapes.filter(e => !e.franchi).length, 0))
const sitesManques = computed(() =>
  voyages.voyages.filter(v => v.statut === 'livre' || v.statut === 'cloture' || v.statut === 'litige')
    .reduce((n, v) => n + v.etapes.filter(e => !e.franchi).length, 0))
const horsTolerance = computed(() => voyages.voyages.filter(v => voyages.ecartPoids(v.id)?.verdict.startsWith('hors')).length)

const kpis = computed(() => [
  { label: 'En cours', value: voyages.enCours.length, icon: Package, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'Sites à desservir', value: sitesRestants.value, icon: MapPinned, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Sites manqués', value: sitesManques.value, icon: AlertTriangle, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Hors tolérance', value: horsTolerance.value, icon: Weight, bg: 'bg-warning-bg', iconColor: 'text-warning' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Référence', sortable: true, hideable: false, width: 140 },
  { key: 'statut', label: 'Statut', sortable: true, width: 100 },
  { key: 'trajet', label: 'Trajet', width: 190 },
  { key: 'sites', label: 'Sites', width: 130 },
  { key: 'vehicule', label: 'Véhicule', width: 130 },
  { key: 'marchandise', label: 'Marchandise', width: 130 },
  { key: 'ecart', label: 'Écart', width: 95 },
  { key: 'conformite', label: 'Conformité', width: 130 },
  { key: 'dossier', label: 'Dossier', width: 90 },
])

const avancement = (v: Voyage) => avancementEtapes(v.etapes)
const nbLivraisons = (v: Voyage) => v.etapes.filter(e => e.role === 'livraison').length
const nbNonDesservis = (v: Voyage) => v.etapes.filter(e => !e.franchi).length

watch([activeScope, filterTrajet, filterClient, filterDossier, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; filterTrajet.value = ''; filterClient.value = ''; filterDossier.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = voyages.voyages.filter(v => {
    if (activeScope.value && v.statut !== activeScope.value) return false
    if (filterTrajet.value && v.trajetId !== filterTrajet.value) return false
    if (filterClient.value && v.clientNom !== filterClient.value) return false
    if (filterDossier.value) {
      const tousDesservis = v.etapes.every(e => e.franchi)
      if (filterDossier.value === 'complet' && !tousDesservis) return false
      if (filterDossier.value === 'incomplet' && tousDesservis) return false
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const hay = `${v.reference} ${v.numeroOT ?? ''} ${v.vehiculePlaque ?? ''} ${v.chauffeurNom ?? ''} ${v.clientNom}`
      if (!hay.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const k = sortKey.value as keyof Voyage
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function ouvrirFiche(id: string) { ficheId.value = id }
</script>
