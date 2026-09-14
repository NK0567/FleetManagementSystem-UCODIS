<template>
  <ListPageLayout
    title="Entités organisationnelles"
    subtitle="Structure hiérarchique d'UCODIS Transport"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} entité(s)`"
    row-key="id"
    search-placeholder="Rechercher une entité…"
    scope-label="Entités :"
    :scope-options="scopeOptions"
    :view-modes="viewModes"
    v-model:view-mode="viewMode"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="openCard"
  >
    <template #header-actions>
      <div class="flex gap-2">
        <button :class="L.btnOutline" @click="showImport = true"><Upload class="w-4 h-4" /> Importer</button>
        <button :class="L.btnPrimary" @click="showCreate = true"><Plus class="w-4 h-4" /> Nouvelle entité</button>
      </div>
    </template>

    <!-- KPIs -->
    <template #above-table>
      <div class="grid grid-cols-4 gap-2.5 mb-4 max-md:grid-cols-2">
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-success-bg"><Building class="w-[18px] h-[18px] text-success" /></div>
          <div><div :class="L.kpiItemVal">{{ entites.liste.length }}</div><div :class="L.kpiItemLbl">Total entités</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-success-bg"><Users class="w-[18px] h-[18px] text-success" /></div>
          <div><div :class="L.kpiItemVal">{{ personnel.effectif }}</div><div :class="L.kpiItemLbl">Effectif total</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-primary/10"><Check class="w-[18px] h-[18px] text-primary" /></div>
          <div><div :class="L.kpiItemVal">{{ entites.validees.length }}</div><div :class="L.kpiItemLbl">Validées</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, entites.enAttente.length > 0 ? 'bg-warning-bg' : 'bg-background']">
            <Clock class="w-[18px] h-[18px]" :class="entites.enAttente.length > 0 ? 'text-warning' : 'text-muted-foreground'" />
          </div>
          <div>
            <div :class="L.kpiItemVal" class="flex items-center gap-1.5">
              {{ entites.enAttente.length }}
              <span v-if="entites.enAttente.length > 0" class="bg-danger text-white text-[9px] font-bold px-[5px] py-px rounded-full">!</span>
            </div>
            <div :class="L.kpiItemLbl">En attente</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Filtres -->
    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Type</label>
        <SearchableDropdown v-model="filterType" :items="optfilterType" placeholder="Tous les types" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary"
              @click="resetFilters">Réinitialiser les filtres</button>
    </template>

    <!-- Cellules -->
    <template #cell-code="{ item }">
      <span class="text-[11px] font-bold px-[7px] py-0.5 rounded bg-primary/10 text-primary tracking-[0.04em]">{{ item.code }}</span>
    </template>
    <template #cell-nom="{ item }"><span class="font-medium">{{ item.nom }}</span></template>
    <template #cell-type="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="typeBadge(item.type)">{{ TYPES[item.type] }}</span>
    </template>
    <template #cell-parent="{ item }"><span class="text-muted-foreground text-xs">{{ nomParent(item.parentId) }}</span></template>
    <template #cell-responsableNom="{ item }"><span class="text-muted-foreground text-xs">{{ item.responsableNom || '-' }}</span></template>
    <template #cell-effectif="{ item }">
      <span class="text-[11px] text-muted-foreground inline-flex items-center gap-[3px]"><Users class="w-3 h-3" /> {{ effectifReel(item.id) }}</span>
    </template>
    <template #cell-statut="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            :class="item.statut === 'validee' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">
        {{ item.statut === 'validee' ? 'Validée' : 'À valider' }}
      </span>
    </template>

    <!-- Aperçu rapide -->
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3.5">
        <div>
          <span class="text-[11px] font-bold px-[7px] py-0.5 rounded bg-primary/10 text-primary tracking-[0.04em]">{{ item.code }}</span>
          <div class="text-sm font-semibold text-foreground mt-1.5">{{ item.nom }}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="typeBadge(item.type)">{{ TYPES[item.type] }}</span>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                :class="item.statut === 'validee' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">
            {{ item.statut === 'validee' ? 'Validée' : 'À valider' }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-[12px]">
          <div><div class="text-muted-foreground text-[11px]">Entité parente</div>{{ nomParent(item.parentId) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Effectif</div>{{ effectifReel(item.id) }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Responsable</div>{{ item.responsableNom || '-' }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item)">Ouvrir la fiche</button>
        <button v-if="item.statut === 'a_valider'" class="w-full justify-center px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer bg-success-bg text-success"
                @click="entites.valider(item.id)">Valider cette entité</button>
      </div>
    </template>

    <template #empty>
      <Building class="w-8 h-8" />
      <p class="text-[13px]">Aucune entité trouvée</p>
    </template>

    <!-- Affichage hiérarchique / organigramme -->
    <template #custom-view>
      <div v-if="viewMode === 'tree'" class="p-3.5">
        <div class="flex items-center gap-2 mb-3">
          <button :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="expandAll"><Maximize2 class="w-3.5 h-3.5" /> Tout déplier</button>
          <button :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="collapseAll"><Minimize2 class="w-3.5 h-3.5" /> Tout replier</button>
        </div>
        <div class="overflow-x-auto px-1 pt-1 pb-4 min-w-0">
          <EntiteArbre v-for="racine in racines" :key="racine.id" :entite="racine" @ouvrir="openCardId = $event" />
        </div>
      </div>
      <div v-else-if="viewMode === 'orgchart'" class="p-3.5">
        <EntiteOrgChart @ouvrir="openCardId = $event" />
      </div>
    </template>

    <EntiteCard
      v-if="openCardId !== null"
      :entites="entites.liste"
      :entite-id="openCardId"
      @close="openCardId = null"
    />

    <NouvelleEntiteModal
      :ouvert="showCreate"
      @fermer="showCreate = false"
      @cree="idCree => { showCreate = false; openCardId = idCree }"
    />

    <ImportCsvModal
      v-if="showImport"
      titre="Importer des entités"
      :champs="CHAMPS_IMPORT"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE_CSV"
      description-controles="Contrôles appliqués : code et nom obligatoires, code déjà utilisé par une autre entité, entité parente non reconnue si renseignée."
      :valider="validerLigneImport"
      @close="showImport = false"
      @importer="lignes => importerEntites(lignes as unknown as LigneEntite[])"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, type Component } from 'vue'
import { Building, Check, Clock, List, ListTree, Maximize2, Minimize2, Network, Plus, Upload, Users, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import EntiteArbre from '../../components/entites/EntiteArbre.vue'
import EntiteOrgChart from '../../components/EntiteOrgChart.vue'
import EntiteCard from '../../components/cards/EntiteCard.vue'
import NouvelleEntiteModal from '../../components/NouvelleEntiteModal.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import * as L from '../../lib/listClasses'
import { useEntiteStore } from '../../stores/entites'
import { usePersonnelStore } from '../../stores/personnel'
import { useParametresStore } from '../../stores/parametres'
import type { Entite, TypeEntite } from '../../types'

const entites = useEntiteStore()
const personnel = usePersonnelStore()
const params = useParametresStore()

const TYPES: Record<TypeEntite, string> = { direction: 'Direction', service: 'Service', equipe: 'Équipe' }

/* ── Modes d'affichage : liste, arbre, organigramme ─────────── */
const viewModes: { value: string; label: string; icon: Component }[] = [
  { value: 'list', label: 'Liste', icon: List },
  { value: 'tree', label: 'Vue hiérarchique', icon: ListTree },
  { value: 'orgchart', label: 'Organigramme', icon: Network },
]
const viewMode = ref('tree')

const showImport = ref(false)
const showCreate = ref(false)
const openCardId = ref<string | null>(null)
function openCard(item: Entite) { openCardId.value = item.id }

/* ── Arbre (déplié/replié) ──────────────────────────────────── */
const collapsedIds = ref<string[]>([])
provide('entite-collapsed', collapsedIds)
provide('entite-toggle', (id: string) => {
  collapsedIds.value = collapsedIds.value.includes(id)
    ? collapsedIds.value.filter(x => x !== id)
    : [...collapsedIds.value, id]
})
function expandAll() { collapsedIds.value = [] }
function collapseAll() {
  collapsedIds.value = entites.liste.filter(e => entites.enfants(e.id).length > 0).map(e => e.id)
}
const racines = computed(() => entites.liste.filter(e => e.parentId === null))

function effectifReel(id: string) { return personnel.parEntite(id).length }
function nomParent(parentId: string | null) { return parentId ? entites.parId(parentId)?.nom ?? '-' : 'Racine' }
function typeBadge(t: TypeEntite): string {
  const m: Record<TypeEntite, string> = {
    direction: 'bg-danger-bg text-danger', service: 'bg-success-bg text-success', equipe: 'bg-primary/10 text-primary',
  }
  return m[t]
}

const columns = computed<ListColumn[]>(() => [
  { key: 'code',           label: 'Code',           sortable: true, hideable: false, width: 100 },
  { key: 'nom',            label: 'Nom',            sortable: true, width: 200 },
  { key: 'type',           label: 'Type',           sortable: true, width: 120 },
  { key: 'parent',         label: 'Entité parente', width: 170 },
  { key: 'responsableNom', label: 'Responsable',    width: 160 },
  { key: 'effectif',       label: 'Effectif',       align: 'center', width: 100 },
  { key: 'statut',         label: 'Statut',         sortable: true, width: 120 },
])

const scopeOptions = [
  { value: '', label: 'Toutes' },
  { value: 'validee', label: 'Validées' },
  { value: 'a_valider', label: 'En attente' },
]
const activeScope = ref('')
const filterType = ref('')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

watch([activeScope, filterType, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; filterType.value = ''; searchQuery.value = ''; page.value = 1 }

const sortFieldMap: Record<string, keyof Entite> = { code: 'code', nom: 'nom', type: 'type', statut: 'statut' }
const filtered = computed(() => {
  let rows = entites.liste.filter(e => {
    if (activeScope.value && e.statut !== activeScope.value) return false
    if (filterType.value && e.type !== filterType.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!e.nom.toLowerCase().includes(q) && !e.code.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value && sortFieldMap[sortKey.value]) {
    const f = sortFieldMap[sortKey.value]!
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[f] ?? '').localeCompare(String(b[f] ?? ''))
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

const optfilterType: DropdownItem[] = [
  { id: 'direction', label: 'Direction' },
  { id: 'service', label: 'Service' },
  { id: 'equipe', label: 'Équipe' },
]

/* ── Import CSV ─────────────────────────────────────────────────── */
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'code', libelle: 'Code', requis: true },
  { cle: 'nom', libelle: 'Nom', requis: true },
  { cle: 'type', libelle: 'Type', requis: false },
  { cle: 'parent', libelle: 'Entité parente', requis: false },
  { cle: 'site', libelle: 'Site', requis: false },
  { cle: 'description', libelle: 'Description', requis: false },
]
const COLONNES_APERCU = [
  { cle: 'code', libelle: 'Code' },
  { cle: 'nom', libelle: 'Nom' },
  { cle: 'type', libelle: 'Type' },
  { cle: 'parentNom', libelle: 'Entité parente' },
]
const MODELE_CSV = ['Code', 'Nom', 'Type', 'Entité parente', 'Site', 'Description']

interface LigneEntite {
  code: string; nom: string; type: TypeEntite
  parentId: string | null; parentNom: string
  site: string; description: string
}

const TYPES_VALIDES: TypeEntite[] = ['direction', 'service', 'equipe']

function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')

  const code = val('code')
  const nom = val('nom')
  if (!code || !nom) return { valide: false, motif: 'Code ou nom manquant' }
  if (entites.liste.some(e => e.code.toLowerCase() === code.toLowerCase())) {
    return { valide: false, motif: `Code déjà utilisé (${code})` }
  }

  const typeSaisi = val('type').toLowerCase() as TypeEntite
  const type: TypeEntite = TYPES_VALIDES.includes(typeSaisi) ? typeSaisi : 'service'

  const parentSaisi = val('parent')
  let parentId: string | null = null
  let parentNom = 'Racine'
  if (parentSaisi) {
    const p = entites.liste.find(e => e.code.toLowerCase() === parentSaisi.toLowerCase() || e.nom.toLowerCase() === parentSaisi.toLowerCase())
    if (!p) return { valide: false, motif: `Entité parente non reconnue « ${parentSaisi} »` }
    parentId = p.id
    parentNom = p.nom
  }

  const donnees: LigneEntite = {
    code, nom, type, parentId, parentNom,
    site: val('site') || params.sites[0]?.nom || '',
    description: val('description'),
  }
  return { valide: true, donnees: donnees as unknown as Record<string, unknown> }
}

function importerEntites(lignes: LigneEntite[]) {
  lignes.forEach(l => {
    entites.creer({
      code: l.code.toUpperCase(), nom: l.nom, type: l.type,
      parentId: l.parentId, site: l.site, description: l.description,
      effectif: 0, statut: 'validee',
    })
  })
}
</script>
