<template>
  <ListPageLayout
    title="Demandes d'absence"
    :subtitle="`${absences.liste.length} demande(s) · ${absences.enAttente.length} en attente`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} demande(s)`"
    search-placeholder="Rechercher un employé…"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="scope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="openCard"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="creation = true"><Plus class="w-4 h-4" /> Nouvelle demande</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-md:grid-cols-2">
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-warning-bg"><Clock class="w-[18px] h-[18px] text-warning" /></div>
          <div><div :class="L.kpiItemVal">{{ absences.enAttente.length }}</div><div :class="L.kpiItemLbl">En attente</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-success-bg"><Check class="w-[18px] h-[18px] text-success" /></div>
          <div><div :class="L.kpiItemVal">{{ absences.approuvees.length }}</div><div :class="L.kpiItemLbl">Approuvées</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-info-bg"><Undo2 class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ retournees }}</div><div :class="L.kpiItemLbl">Retournées</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-danger-bg"><X class="w-[18px] h-[18px] text-danger" /></div>
          <div><div :class="L.kpiItemVal">{{ refusees }}</div><div :class="L.kpiItemLbl">Refusées</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Type de congé</label>
        <SearchableDropdown v-model="fType" :items="optTypes" placeholder="Tous les types" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Entité</label>
        <SearchableDropdown v-model="fEntite" :items="optEntites" placeholder="Toutes les entités" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary"
              @click="resetFilters">Réinitialiser les filtres</button>
    </template>

    <!-- Actions contextuelles : apparaissent quand une ligne est sélectionnée -->
    <template #row-actions="{ item }">
      <template v-if="item.statut === 'attente' && peutValider">
        <button class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer bg-success-bg text-success"
                @click="absences.approuver(item.id)">✓ Approuver</button>
        <button class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer bg-info-bg text-info"
                title="Retourner" @click="openCard(item)"><Undo2 class="w-3.5 h-3.5" /></button>
        <button class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer bg-danger-bg text-danger"
                @click="openCard(item)">✗ Refuser</button>
      </template>
      <span v-else class="text-xs text-muted-foreground italic">Aucune action disponible</span>
    </template>

    <template #cell-reference="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">DEM-{{ String(item.id).padStart(3, '0') }}</span>
    </template>

    <template #cell-employe="{ item }">
      <div class="flex items-center gap-2.5">
        <UserAvatar :nom="item.nom" taille="sm" />
        <div class="min-w-0">
          <button class="font-medium text-[13px] truncate hover:text-primary hover:underline text-left bg-transparent border-0 p-0 cursor-pointer"
                  @click.stop="openCard(item)">{{ item.nom }}</button>
          <div class="text-[11px] text-muted-foreground truncate">{{ fonctionDe(item.personnelId) }}</div>
        </div>
      </div>
    </template>

    <template #cell-type="{ item }">
      <span class="inline-flex items-center gap-1.5 text-[13px]">
        <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: couleur(item.type) }"></span>
        {{ item.type }}
      </span>
    </template>

    <template #cell-periode="{ item }">
      <span class="tabular-nums text-[13px]">{{ item.debut }} → {{ item.fin }}</span>
    </template>

    <template #cell-soumisLe="{ item }">
      <span class="text-muted-foreground text-xs tabular-nums">{{ item.soumisLe }}</span>
    </template>

    <template #cell-statut="{ item }">
      <StatutDemandePill :statut="item.statut" />
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

        <StatutDemandePill :statut="item.statut" />

        <div class="grid grid-cols-2 gap-2 text-[12px]">
          <div><div class="text-muted-foreground text-[11px]">Référence</div>DEM-{{ String(item.id).padStart(3, '0') }}</div>
          <div><div class="text-muted-foreground text-[11px]">Type</div>{{ item.type }}</div>
          <div><div class="text-muted-foreground text-[11px]">Début</div>{{ item.debut }}</div>
          <div><div class="text-muted-foreground text-[11px]">Fin</div>{{ item.fin }}</div>
          <div><div class="text-muted-foreground text-[11px]">Jours ouvrés</div>{{ item.jours }}</div>
          <div><div class="text-muted-foreground text-[11px]">Soumise le</div>{{ item.soumisLe }}</div>
        </div>

        <div v-if="item.motifRefus" class="text-[12px] bg-danger-bg text-danger rounded px-2.5 py-1.5 leading-relaxed">
          {{ item.motifRefus }}
        </div>
        <div v-if="item.commentaireRetour" class="text-[12px] bg-info-bg text-info rounded px-2.5 py-1.5 leading-relaxed">
          {{ item.commentaireRetour }}
        </div>

        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item)">
          Ouvrir la fiche
        </button>
      </div>
    </template>

    <template #empty>
      <CalendarOff class="w-8 h-8" />
      <p class="text-[13px]">Aucune demande ne correspond.</p>
    </template>

    <DemandeCard
      v-if="openCardId !== null"
      :demandes="filtered"
      :demande-id="openCardId"
      @close="openCardId = null"
    />

    <NouvelleDemandeModal :ouvert="creation" @fermer="creation = false" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarOff, Check, Clock, Plus, Undo2, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatutDemandePill from '../../components/ui/StatutDemandePill.vue'
import ModalShell from '../../components/ui/ModalShell.vue'
import NouvelleDemandeModal from '../../components/NouvelleDemandeModal.vue'
import DemandeCard from '../../components/cards/DemandeCard.vue'
import * as L from '../../lib/listClasses'
import { useAuthStore } from '../../stores/auth'
import { useAbsenceStore, type Demande } from '../../stores/absences'
import { usePersonnelStore } from '../../stores/personnel'
import { useEntiteStore } from '../../stores/entites'
import { useClassificationStore } from '../../stores/classification'

const auth = useAuthStore()
const absences = useAbsenceStore()
const personnel = usePersonnelStore()
const entites = useEntiteStore()
const classification = useClassificationStore()

const creation = ref(false)
const openCardId = ref<number | null>(null)
function openCard(item: Demande) { openCardId.value = item.id }

const peutValider = computed(() => !auth.lectureSeule)
const retournees = computed(() => absences.liste.filter(d => d.statut === 'retourne').length)
const refusees = computed(() => absences.liste.filter(d => d.statut === 'refuse').length)

function fonctionDe(id: string) { return personnel.parId(id)?.fonctionLibelle ?? '-' }
function couleur(type: string) {
  return classification.typesConge.find(t => t.libelle === type)?.couleur ?? '#6B7280'
}

const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Référence', hideable: false, width: 110 },
  { key: 'employe',   label: 'Employé',   sortable: true, width: 220 },
  { key: 'type',      label: 'Type',      sortable: true, width: 190 },
  { key: 'periode',   label: 'Période',   sortable: true, width: 200 },
  { key: 'jours',     label: 'Jours',     sortable: true, align: 'center', width: 80 },
  { key: 'soumisLe',  label: 'Soumise le', sortable: true, width: 120 },
  { key: 'statut',    label: 'Statut',    width: 110 },
])

const scopeOptions = [
  { value: '',         label: 'Toutes' },
  { value: 'attente',  label: 'En attente' },
  { value: 'approuve', label: 'Approuvées' },
  { value: 'retourne', label: 'Retournées' },
  { value: 'refuse',   label: 'Refusées' },
]

const scope = ref('')
const fType = ref('')
const fEntite = ref('')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(10)

watch([scope, fType, fEntite, searchQuery, pageSize], () => { page.value = 1 })

function resetFilters() {
  scope.value = ''; fType.value = ''; fEntite.value = ''; searchQuery.value = ''; page.value = 1
}

const filtered = computed(() => {
  let rows = absences.liste.filter(d => {
    if (scope.value && d.statut !== scope.value) return false
    if (fType.value && d.type !== fType.value) return false
    if (fEntite.value && personnel.parId(d.personnelId)?.entiteId !== fEntite.value) return false
    if (searchQuery.value && !d.nom.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    return true
  })

  if (sortKey.value) {
    const champs: Record<string, keyof Demande> = {
      employe: 'nom', type: 'type', periode: 'debut', jours: 'jours', soumisLe: 'soumisLe',
    }
    const f = champs[sortKey.value]
    if (f) {
      rows = [...rows].sort((a, b) => {
        const va = a[f] as string | number
        const vb = b[f] as string | number
        const cmp = typeof va === 'number' && typeof vb === 'number'
          ? va - vb : String(va).localeCompare(String(vb))
        return sortDir.value === 'asc' ? cmp : -cmp
      })
    }
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => {
  const d = (page.value - 1) * pageSize.value
  return filtered.value.slice(d, d + pageSize.value)
})

const optTypes = computed<DropdownItem[]>(() =>
  classification.typesConge.map(t => ({ id: t.libelle, label: t.libelle, sublabel: t.code })))
const optEntites = computed<DropdownItem[]>(() =>
  entites.liste.map(e => ({ id: e.id, label: e.nom, sublabel: e.code })))
</script>
