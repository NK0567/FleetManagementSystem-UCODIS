<template>
  <!-- ── Barre d'onglets ── -->
  <div class="flex border border-border bg-card rounded-t-lg px-1 mb-4">
    <div
      v-for="tab in TABS" :key="tab.key"
      :class="[tabClass, nav.activeEntiteTab === tab.key && tabActive]"
      @click="changeTab(tab.key)"
    >
      <component :is="tab.icon" class="w-4 h-4" /> {{ tab.label }}
      <span v-if="tab.key === 'attente' && entites.enAttente.length > 0"
            class="bg-danger text-white text-[9px] font-bold px-[5px] py-px rounded-full">
        {{ entites.enAttente.length }}
      </span>
    </div>
  </div>

  <!-- ════════════ ONGLET : VUE HIÉRARCHIQUE ════════════ -->
  <template v-if="nav.activeEntiteTab === 'hierarchie'">
    <div class="flex items-center gap-2 mb-3">
      <button :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="expandAll">
        <Maximize2 class="w-3.5 h-3.5" /> Tout déplier
      </button>
      <button :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="collapseAll">
        <Minimize2 class="w-3.5 h-3.5" /> Tout replier
      </button>
      <div class="flex gap-1 ml-auto">
        <button :class="[switcherBtn, switcherActive]" title="Vue hiérarchique"><ListTree class="w-4 h-4" /></button>
        <button :class="switcherBtn" title="Organigramme" @click="changeTab('organigramme')"><Network class="w-4 h-4" /></button>
      </div>
    </div>
    <div class="overflow-x-auto px-1 pt-1 pb-4 min-w-0">
      <EntiteArbre v-for="racine in racines" :key="racine.id" :entite="racine" @ouvrir="ouvrir" />
    </div>
  </template>

  <!-- ════════════ ONGLET : ORGANIGRAMME ════════════ -->
  <template v-else-if="nav.activeEntiteTab === 'organigramme'">
    <div class="flex items-center gap-2 mb-3">
      <div class="flex gap-1 ml-auto">
        <button :class="switcherBtn" title="Vue hiérarchique" @click="changeTab('hierarchie')"><ListTree class="w-4 h-4" /></button>
        <button :class="[switcherBtn, switcherActive]" title="Organigramme"><Network class="w-4 h-4" /></button>
      </div>
    </div>
    <EntiteOrgChart @ouvrir="ouvrir" />
  </template>

  <!-- ════════════ ONGLET : LISTE ════════════ -->
  <template v-if="nav.activeEntiteTab === 'liste'">
    <div :class="L.tableCard">
      <div class="flex gap-2 items-center px-3.5 py-2.5 border-b border-border flex-wrap">
        <SearchableDropdown v-model="fType" :items="optType" placeholder="Tous les types" compact />
        <SearchableDropdown v-model="fStatut" :items="optStatut" placeholder="Tous les statuts" compact />
        <div :class="L.searchBox">
          <Search class="w-3.5 h-3.5 text-muted-foreground" />
          <input v-model="fSearch" placeholder="Rechercher…" :class="L.searchInput" />
        </div>
        <button v-if="fType || fStatut || fSearch" :class="[L.btnOutline, '!px-3 !py-1.5 !text-xs']" @click="resetFiltres">
          <RefreshCw class="w-3.5 h-3.5" /> Réinitialiser
        </button>
      </div>

      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="thUpper">Code</th>
              <th :class="thUpper">Nom</th>
              <th :class="thUpper">Type</th>
              <th :class="thUpper">Entité parente</th>
              <th :class="thUpper">Responsable</th>
              <th :class="thUpper">Effectif</th>
              <th :class="thUpper">Statut</th>
              <th :class="thUpper">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in listePage" :key="e.id" :class="L.rowClickable">
              <td :class="L.td"><span class="text-[11px] font-bold px-[7px] py-0.5 rounded bg-primary/10 text-primary tracking-[0.04em]">{{ e.code }}</span></td>
              <td :class="[L.td, 'font-medium']">{{ e.nom }}</td>
              <td :class="L.td">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="typeBadge(e.type)">{{ TYPES[e.type] }}</span>
              </td>
              <td :class="[L.td, 'text-muted-foreground text-xs']">{{ nomParent(e.parentId) }}</td>
              <td :class="[L.td, 'text-muted-foreground text-xs']">{{ e.responsableNom || '-' }}</td>
              <td :class="[L.td, 'text-center']">
                <span class="text-[11px] text-muted-foreground inline-flex items-center gap-[3px]"><Users class="w-3 h-3" /> {{ effectifReel(e.id) }}</span>
              </td>
              <td :class="L.td">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                      :class="e.statut === 'validee' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">
                  {{ e.statut === 'validee' ? 'Validée' : 'À valider' }}
                </span>
              </td>
              <td :class="L.td">
                <div class="flex gap-1 flex-wrap">
                  <button class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer bg-background text-muted-foreground hover:bg-neutral-bg hover:text-foreground"
                          @click="ouvrir(e.id)">Voir →</button>
                  <button v-if="e.statut === 'a_valider'" class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer bg-success-bg text-success"
                          @click="entites.valider(e.id)">Valider</button>
                </div>
              </td>
            </tr>
            <tr v-if="listePage.length === 0">
              <td colspan="8" class="text-center text-muted-foreground p-8 text-[13px]">Aucune entité trouvée</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div :class="L.pagination" v-if="listeTotalPages > 1">
        <span class="flex-1">{{ listeFiltree.length }} entité(s)</span>
        <div class="flex gap-[3px]">
          <button :class="L.pagBtn" :disabled="listePageNum === 1" @click="listePageNum--"><ChevronLeft class="w-3.5 h-3.5" /></button>
          <button v-for="p in listeTotalPages" :key="p" :class="[L.pagBtn, p === listePageNum && L.pagBtnActive]" @click="listePageNum = p">{{ p }}</button>
          <button :class="L.pagBtn" :disabled="listePageNum === listeTotalPages" @click="listePageNum++"><ChevronRight class="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  </template>

  <!-- ════════════ ONGLET : EN ATTENTE ════════════ -->
  <template v-if="nav.activeEntiteTab === 'attente'">
    <div v-if="entites.enAttente.length === 0" class="flex flex-col items-center p-[60px] gap-2.5 text-muted-foreground bg-card border border-border rounded-lg">
      <CircleCheck class="w-10 h-10 text-success" />
      <p class="text-sm">Aucune entité en attente de validation</p>
    </div>
    <div v-else :class="L.tableCard">
      <div class="overflow-x-auto">
        <table :class="L.table">
          <thead>
            <tr>
              <th :class="thUpper">Code</th>
              <th :class="thUpper">Nom</th>
              <th :class="thUpper">Type</th>
              <th :class="thUpper">Rattachée à</th>
              <th :class="thUpper">Soumise le</th>
              <th :class="thUpper">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entites.enAttente" :key="e.id" :class="L.rowClickable">
              <td :class="L.td"><span class="text-[11px] font-bold px-[7px] py-0.5 rounded bg-primary/10 text-primary tracking-[0.04em]">{{ e.code }}</span></td>
              <td :class="[L.td, 'font-medium']">{{ e.nom }}</td>
              <td :class="L.td">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="typeBadge(e.type)">{{ TYPES[e.type] }}</span>
              </td>
              <td :class="[L.td, 'text-muted-foreground text-xs']">{{ nomParent(e.parentId) }}</td>
              <td :class="[L.td, 'text-muted-foreground text-xs']">{{ e.soumiseLe || '-' }}</td>
              <td :class="L.td">
                <div class="flex gap-1 flex-wrap">
                  <button class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer bg-background text-muted-foreground hover:bg-neutral-bg hover:text-foreground"
                          @click="ouvrir(e.id)">Voir →</button>
                  <button class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer bg-success-bg text-success inline-flex items-center gap-1"
                          @click="entites.valider(e.id)"><Check class="w-3.5 h-3.5" /> Valider</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed max-w-3xl">
      Cette entité porte le planning de voyage, la fiche de voyage et le carnet de bord ·
      aujourd'hui rattachés provisoirement aux modules 1 et 2, en l'absence d'un module
      « Opérations et voyages ». Elle reste en attente d'une confirmation d'UCODIS.
    </p>
  </template>
</template>

<script setup lang="ts">
/**
 * Contenu à onglets partagé entre l'écran « Entités » et l'écran
 * « Organigramme » · source unique, reprise du composant EntityTabsContent
 * des autres projets bâtis sur le socle FMS.
 */
import { ref, computed, watch, provide } from 'vue'
import SearchableDropdown from './ui/SearchableDropdown.vue'
import type { DropdownItem } from './ui/SearchableDropdown.vue'
import {
  Check, ChevronLeft, ChevronRight, CircleCheck, Clock, List, ListTree,
  Maximize2, Minimize2, Network, RefreshCw, Search, Users,
} from '@lucide/vue'
import EntiteArbre from './entites/EntiteArbre.vue'
import EntiteOrgChart from './EntiteOrgChart.vue'
import * as L from '../lib/listClasses'
import { useEntiteStore } from '../stores/entites'
import { usePersonnelStore } from '../stores/personnel'
import { useNavigationStore } from '../stores/navigation'
import type { TypeEntite } from '../types'

const emit = defineEmits<{ ouvrir: [id: string] }>()

const entites = useEntiteStore()
const personnel = usePersonnelStore()
const nav = useNavigationStore()

const TYPES: Record<TypeEntite, string> = { direction: 'Direction', service: 'Service', equipe: 'Équipe' }

const tabClass = 'px-[18px] py-2.5 text-[13px] text-muted-foreground cursor-pointer border-b-2 border-transparent flex items-center gap-1.5 transition-colors hover:text-foreground'
const tabActive = '!text-primary !border-primary font-medium'

const switcherBtn = 'px-2 py-1.5 rounded-md border-0 cursor-pointer flex items-center justify-center bg-transparent text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary'
const switcherActive = '!bg-primary/10 !text-primary'
const thUpper = 'px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground bg-background uppercase tracking-[0.04em] border-b border-border whitespace-nowrap'

const TABS = [
  { key: 'hierarchie' as const, label: 'Vue hiérarchique', icon: ListTree },
  { key: 'organigramme' as const, label: 'Organigramme', icon: Network },
  { key: 'liste' as const, label: 'Liste', icon: List },
  { key: 'attente' as const, label: 'En attente', icon: Clock },
]

function changeTab(key: typeof TABS[number]['key']) { nav.setEntiteTab(key) }

function ouvrir(id: string) { emit('ouvrir', id) }

/* ── Provide pour EntiteArbre (déplié/replié partagé) ─────────── */
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

/* ── Filtres liste ──────────────────────────────────────────── */
const fType = ref('')
const fStatut = ref('')
const fSearch = ref('')
const listePageNum = ref(1)
const TAILLE_LISTE = 15

function resetFiltres() { fType.value = ''; fStatut.value = ''; fSearch.value = ''; listePageNum.value = 1 }

const listeFiltree = computed(() =>
  entites.liste.filter(e => {
    if (fType.value && e.type !== fType.value) return false
    if (fStatut.value && e.statut !== fStatut.value) return false
    if (fSearch.value) {
      const q = fSearch.value.toLowerCase()
      if (!e.nom.toLowerCase().includes(q) && !e.code.toLowerCase().includes(q)) return false
    }
    return true
  }),
)
const listeTotalPages = computed(() => Math.max(1, Math.ceil(listeFiltree.value.length / TAILLE_LISTE)))
const listePage = computed(() => {
  const d = (listePageNum.value - 1) * TAILLE_LISTE
  return listeFiltree.value.slice(d, d + TAILLE_LISTE)
})
watch(listeFiltree, () => { listePageNum.value = 1 })

function effectifReel(id: string) { return personnel.parEntite(id).length }
function nomParent(parentId: string | null) { return parentId ? entites.parId(parentId)?.nom ?? '-' : 'Racine' }
function typeBadge(t: TypeEntite): string {
  const m: Record<TypeEntite, string> = {
    direction: 'bg-danger-bg text-danger', service: 'bg-success-bg text-success', equipe: 'bg-primary/10 text-primary',
  }
  return m[t]
}

const optType: DropdownItem[] = [
  { id: 'direction', label: 'Direction' },
  { id: 'service', label: 'Service' },
  { id: 'equipe', label: 'Équipe' },
]
const optStatut: DropdownItem[] = [
  { id: 'validee', label: 'Validée' },
  { id: 'a_valider', label: 'À valider' },
]
</script>
