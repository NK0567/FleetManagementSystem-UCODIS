<template>
  <ListPageLayout
    title="Soldes de congés"
    subtitle="Vue d'ensemble des soldes par employé et par type"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} employé(s)`"
    row-key="personnelId"
    search-placeholder="Rechercher un employé…"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="openCard"
  >
    <template #header-actions>
      <button :class="L.btnOutline" @click="exporterCSV"><FileDown class="w-4 h-4" /> Exporter</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-4 gap-2.5 mb-3 max-md:grid-cols-2">
        <div v-for="c in TYPES" :key="c.cle" :class="L.kpiItem">
          <div :class="L.kpiItemIcon" :style="{ background: c.couleur + '1A' }">
            <component :is="c.icone" class="w-[18px] h-[18px]" :style="{ color: c.couleur }" />
          </div>
          <div>
            <div :class="L.kpiItemVal">{{ totalType(c.cle) }} j</div>
            <div :class="L.kpiItemLbl">{{ c.libelle }} restants</div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-4">
        <Clock class="w-3 h-3" />
        Un solde se décrémente à l'approbation d'une demande, jamais à sa saisie.
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Entité</label>
        <SearchableDropdown v-model="fEntite" :items="optEntites" placeholder="Toutes les entités" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Fonction</label>
        <SearchableDropdown v-model="fFonction" :items="optFonctions" placeholder="Toutes les fonctions" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary"
              @click="resetFilters">Réinitialiser les filtres</button>
    </template>

    <template #cell-employe="{ item }">
      <div class="flex items-center gap-2">
        <UserAvatar :nom="item.nom" taille="sm" />
        <div class="min-w-0">
          <div class="text-[13px] font-medium text-foreground truncate">{{ item.nom }}</div>
          <div class="text-[11px] text-muted-foreground truncate">{{ entiteDe(item.personnelId) }}</div>
        </div>
      </div>
    </template>

    <!-- Une colonne par type de congé, avec la jauge consommé / droit -->
    <template v-for="c in TYPES" :key="c.cle" #[cellSlot(c.cle)]="{ item }">
      <template v-if="droit(c.cle) > 0">
        <div class="text-sm font-semibold text-foreground mb-1">{{ item[c.cle] }}j</div>
        <div class="h-1 bg-border rounded-sm overflow-hidden mb-[3px]">
          <div class="h-full rounded-sm" :style="jauge(item[c.cle], droit(c.cle), c.couleur)"></div>
        </div>
        <div class="text-[10px] text-muted-foreground">
          {{ Math.max(0, droit(c.cle) - item[c.cle]) }}j / {{ droit(c.cle) }}j
        </div>
      </template>
      <span v-else class="text-[13px] text-muted-foreground">{{ item[c.cle] }}j</span>
    </template>

    <template #cell-total="{ item }">
      <span class="font-bold">{{ item.congeAnnuel + item.recuperation + item.maladie + item.permission }} j</span>
    </template>

    <!-- Aperçu rapide -->
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3.5">
        <div class="flex items-center gap-2.5">
          <UserAvatar :nom="item.nom" taille="lg" />
          <div class="min-w-0">
            <div class="text-sm font-semibold text-foreground truncate">{{ item.nom }}</div>
            <div class="text-[11px] text-muted-foreground">{{ fonctionDe(item.personnelId) }}</div>
          </div>
        </div>

        <div v-for="c in TYPES" :key="c.cle" class="text-[12px]">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">{{ c.libelle }}</span>
            <span class="font-semibold text-foreground">{{ item[c.cle] }}j / {{ droit(c.cle) || '-' }}j</span>
          </div>
          <div v-if="droit(c.cle) > 0" class="h-1 bg-border rounded-sm overflow-hidden mt-1">
            <div class="h-full rounded-sm" :style="jauge(item[c.cle], droit(c.cle), c.couleur)"></div>
          </div>
        </div>

        <div class="text-[12px] pt-2 border-t border-border">
          <div class="text-muted-foreground text-[11px]">Demandes</div>
          {{ nbDemandes(item.personnelId) }} enregistrée(s)
        </div>

        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item)">
          Ouvrir la fiche
        </button>
      </div>
    </template>

    <template #empty>
      <Users class="w-8 h-8" />
      <p class="text-[13px]">Aucun résultat.</p>
    </template>

    <EmployeCard
      v-if="openCardId !== null"
      :employes="personnel.actifs"
      :employe-id="openCardId"
      @close="openCardId = null"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Component } from 'vue'
import { Clock, FileDown, Heart, RefreshCw, Sun, Users } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import EmployeCard from '../../components/cards/EmployeCard.vue'
import * as L from '../../lib/listClasses'
import { useAbsenceStore, type Solde } from '../../stores/absences'
import { usePersonnelStore } from '../../stores/personnel'
import { useEntiteStore } from '../../stores/entites'
import { useFonctionStore } from '../../stores/fonctions'
import { useClassificationStore } from '../../stores/classification'

const absences = useAbsenceStore()
const personnel = usePersonnelStore()
const entites = useEntiteStore()
const fonctions = useFonctionStore()
const classification = useClassificationStore()

interface TypeSolde { cle: 'congeAnnuel' | 'recuperation' | 'maladie' | 'permission'; libelle: string; source: string; icone: Component; couleur: string }

const TYPES = computed<TypeSolde[]>(() => [
  { cle: 'congeAnnuel',  libelle: 'Congé annuel',  source: 'Congé annuel',              icone: Sun,       couleur: coul('Congé annuel') },
  { cle: 'recuperation', libelle: 'Récupération',  source: 'Récupération',              icone: RefreshCw, couleur: coul('Récupération') },
  { cle: 'maladie',      libelle: 'Congé maladie', source: 'Congé maladie',             icone: Heart,     couleur: coul('Congé maladie') },
  { cle: 'permission',   libelle: 'Permission',    source: 'Permission exceptionnelle', icone: Clock,     couleur: coul('Permission exceptionnelle') },
])

function coul(l: string) {
  return classification.typesConge.find(t => t.libelle === l)?.couleur ?? '#6B7280'
}

/** Droit annuel défini dans la classification ; 0 quand il n'y en a pas. */
function droit(cle: string) {
  const t = TYPES.value.find(x => x.cle === cle)
  return classification.typesConge.find(c => c.libelle === t?.source)?.droitAnnuel ?? 0
}

function jauge(restant: number, total: number, couleur: string) {
  const consomme = Math.max(0, total - restant)
  return { width: `${Math.min(100, Math.round((consomme / total) * 100))}%`, background: couleur }
}

/** Nom du slot de cellule, comme sur l'écran de référence. */
function cellSlot(cle: string) { return `cell-${cle}` }

const openCardId = ref<string | null>(null)
function openCard(item: Solde) { openCardId.value = item.personnelId }

function entiteDe(id: string) { return personnel.parId(id)?.entiteNom ?? '-' }
function fonctionDe(id: string) { return personnel.parId(id)?.fonctionLibelle ?? '-' }
function nbDemandes(id: string) { return absences.mesDemandes(id).length }

function totalType(cle: string) {
  return absences.soldes.reduce((n, s) => n + ((s as unknown as Record<string, number>)[cle] ?? 0), 0)
}

const columns = computed<ListColumn[]>(() => [
  { key: 'employe',      label: 'Employé',      sortable: true, hideable: false, width: 220 },
  { key: 'congeAnnuel',  label: 'Congé annuel', sortable: true, align: 'center', width: 130 },
  { key: 'recuperation', label: 'Récupération', sortable: true, align: 'center', width: 130 },
  { key: 'maladie',      label: 'Congé maladie', sortable: true, align: 'center', width: 130 },
  { key: 'permission',   label: 'Permission',   sortable: true, align: 'center', width: 130 },
  { key: 'total',        label: 'Total',        align: 'center', width: 100 },
])

const fEntite = ref('')
const fFonction = ref('')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(10)

watch([fEntite, fFonction, searchQuery, pageSize], () => { page.value = 1 })

function resetFilters() {
  fEntite.value = ''; fFonction.value = ''; searchQuery.value = ''; page.value = 1
}

const filtered = computed(() => {
  let rows = absences.soldes.filter(s => {
    const p = personnel.parId(s.personnelId)
    if (fEntite.value && p?.entiteId !== fEntite.value) return false
    if (fFonction.value && p?.fonctionId !== fFonction.value) return false
    if (searchQuery.value && !s.nom.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    return true
  })

  if (sortKey.value) {
    const cle = sortKey.value === 'employe' ? 'nom' : sortKey.value
    rows = [...rows].sort((a, b) => {
      const va = (a as unknown as Record<string, string | number>)[cle]!
      const vb = (b as unknown as Record<string, string | number>)[cle]!
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb : String(va).localeCompare(String(vb))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => {
  const d = (page.value - 1) * pageSize.value
  return filtered.value.slice(d, d + pageSize.value)
})

const optEntites = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))
const optFonctions = computed<DropdownItem[]>(() =>
  fonctions.liste.map(f => ({ id: f.id, label: f.libelle, sublabel: f.code })))

/** Export CSV des soldes filtrés · respecte les filtres et le tri en cours. */
function exporterCSV() {
  const entetes = ['Employé', 'Fonction', 'Congé annuel', 'Récupération', 'Congé maladie', 'Permission']
  const lignes = [entetes]
  filtered.value.forEach(s => {
    lignes.push([s.nom, fonctionDe(s.personnelId), String(s.congeAnnuel), String(s.recuperation), String(s.maladie), String(s.permission)])
  })
  const csv = lignes.map(l => l.map(v => `"${v.replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'soldes_conges_ucodis.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>
