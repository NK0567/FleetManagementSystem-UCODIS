<template>
  <ListPageLayout
    title="Véhicules"
    :subtitle="`${vehicules.liste.length} véhicule(s) enregistré(s)`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} véhicule(s)`"
    search-placeholder="Rechercher une immatriculation, un VIN…"
    scope-label="Type :"
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
    <template #above-table>
      <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-md:grid-cols-2">
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-info-bg"><Truck class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.liste.length }}</div><div :class="L.kpiItemLbl">Total</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-success-bg"><CircleCheck class="w-[18px] h-[18px] text-success" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.disponibles.length }}</div><div :class="L.kpiItemLbl">Disponibles</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-primary/10"><Route class="w-[18px] h-[18px] text-primary" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.enCirculation.length }}</div><div :class="L.kpiItemLbl">En circulation</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-danger-bg"><TriangleAlert class="w-[18px] h-[18px] text-danger" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.immobilises.length }}</div><div :class="L.kpiItemLbl">Immobilisés</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Statut</label>
        <SearchableDropdown v-model="fStatut" :items="optStatuts" placeholder="Tous les statuts" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary"
              @click="resetFilters">Réinitialiser les filtres</button>
    </template>

    <template #cell-immatriculation="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">{{ item.immatriculation }}</span>
    </template>
    <template #cell-type="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            :class="item.type === 'tracteur' ? 'bg-primary/10 text-primary' : 'bg-info-bg text-info'">
        {{ item.type === 'tracteur' ? 'Tracteur' : 'Semi-remorque' }}
      </span>
    </template>
    <template #cell-vehicule="{ item }">
      <button class="font-medium text-[13px] hover:text-primary hover:underline text-left bg-transparent border-0 p-0 cursor-pointer"
              @click.stop="openCard(item)">{{ item.marque }} {{ item.modele }}</button>
    </template>
    <template #cell-attelage="{ item }">
      <span class="text-xs text-muted-foreground">{{ attelageLabel(item) }}</span>
    </template>
    <template #cell-conducteur="{ item }">
      <div v-if="conducteurDe(item.id)" class="flex items-center gap-2">
        <UserAvatar :nom="conducteurDe(item.id)!" taille="sm" />
        <span class="text-[13px] truncate">{{ conducteurDe(item.id) }}</span>
      </div>
      <span v-else class="text-xs text-muted-foreground">-</span>
    </template>
    <template #cell-statut="{ item }">
      <StatusPill :statut="item.statut" :libelle="vehicules.LIBELLES_STATUT[item.statut]" />
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3.5">
        <div>
          <span class="font-mono text-xs font-semibold text-primary">{{ item.immatriculation }}</span>
          <div class="text-sm font-semibold text-foreground mt-1.5">{{ item.marque }} {{ item.modele }}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full"
                :class="item.type === 'tracteur' ? 'bg-primary/10 text-primary' : 'bg-info-bg text-info'">
            {{ item.type === 'tracteur' ? 'Tracteur' : 'Semi-remorque' }}
          </span>
          <StatusPill :statut="item.statut" :libelle="vehicules.LIBELLES_STATUT[item.statut]" />
        </div>
        <div class="grid grid-cols-2 gap-2 text-[12px]">
          <div><div class="text-muted-foreground text-[11px]">VIN</div><span class="font-mono">{{ item.vin }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Site</div>{{ item.site }}</div>
          <div><div class="text-muted-foreground text-[11px]">Kilométrage</div>{{ item.kilometrage.toLocaleString('fr-FR') }} km</div>
          <div><div class="text-muted-foreground text-[11px]">Attelage</div>{{ attelageLabel(item) }}</div>
        </div>
        <div v-if="item.motifIndisponibilite" class="text-[12px] bg-danger-bg text-danger rounded px-2.5 py-1.5">
          {{ item.motifIndisponibilite }}
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="openCard(item)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <Truck class="w-8 h-8" />
      <p class="text-[13px]">Aucun véhicule trouvé</p>
    </template>

    <VehiculeCard
      v-if="openCardId !== null"
      :vehicules="filtered"
      :vehicule-id="openCardId"
      @close="openCardId = null"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CircleCheck, Route, Truck, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import VehiculeCard from '../../components/cards/VehiculeCard.vue'
import * as L from '../../lib/listClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import type { Vehicule, StatutVehicule } from '../../types'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

const openCardId = ref<string | null>(null)
function openCard(item: Vehicule) { openCardId.value = item.id }

function attelageLabel(v: Vehicule) {
  const at = vehicules.attelageDe(v.id)
  if (!at) return 'Non attelé'
  const autreId = at.tracteurId === v.id ? at.semiRemorqueId : at.tracteurId
  return vehicules.parId(autreId)?.immatriculation ?? 'Non attelé'
}
function conducteurDe(vehiculeId: string) {
  const af = vehicules.affectationActive(vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
}

const columns = computed<ListColumn[]>(() => [
  { key: 'immatriculation', label: 'Immatriculation', sortable: true, hideable: false, width: 130 },
  { key: 'type',            label: 'Type',            sortable: true, width: 110 },
  { key: 'vehicule',        label: 'Véhicule',        sortable: true, width: 180 },
  { key: 'attelage',        label: 'Attelage',        width: 130 },
  { key: 'conducteur',      label: 'Conducteur',      width: 170 },
  { key: 'statut',          label: 'Statut',          sortable: true, width: 120 },
])

const scopeOptions = [
  { value: '', label: 'Tous' },
  { value: 'tracteur', label: 'Tracteurs' },
  { value: 'semi_remorque', label: 'Semi-remorques' },
]
const scope = ref('')
const fStatut = ref('')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

watch([scope, fStatut, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; fStatut.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = vehicules.liste.filter(v => {
    if (scope.value && v.type !== scope.value) return false
    if (fStatut.value && v.statut !== fStatut.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!v.immatriculation.toLowerCase().includes(q) && !v.vin.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const champs: Record<string, keyof Vehicule> = { immatriculation: 'immatriculation', type: 'type', statut: 'statut' }
    const f = champs[sortKey.value]
    if (f) {
      rows = [...rows].sort((a, b) => {
        const cmp = String(a[f] ?? '').localeCompare(String(b[f] ?? ''))
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

const optStatuts = computed<DropdownItem[]>(() =>
  (Object.keys(vehicules.LIBELLES_STATUT) as StatutVehicule[])
    .filter(s => s !== 'vendu')
    .map(s => ({ id: s, label: vehicules.LIBELLES_STATUT[s] })))
</script>
