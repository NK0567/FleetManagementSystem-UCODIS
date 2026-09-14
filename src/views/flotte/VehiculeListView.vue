<template>
  <ListPageLayout
    title="Véhicules"
    :subtitle="`${vehicules.auParc.length} véhicule(s) au parc · tracteurs & semi-remorques · ${vehicules.archives.length} sorti(s) du parc`"
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
    <template #header-actions>
      <div class="flex gap-2">
        <button :class="[L.btnOutline, montrerArchives && '!bg-primary/10 !border-primary/30 !text-primary']"
                @click="montrerArchives = !montrerArchives">
          <Archive class="w-4 h-4" /> Archives ({{ vehicules.archives.length }})
        </button>
        <button :class="L.btnOutline" @click="showImport = true"><Upload class="w-4 h-4" /> Importer le parc</button>
        <button :class="L.btnPrimary" @click="showCreate = true"><Plus class="w-4 h-4" /> Ajouter un véhicule</button>
      </div>
    </template>

    <template #above-table>
      <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-md:grid-cols-2">
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-info-bg"><Truck class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.auParc.length }}</div><div :class="L.kpiItemLbl">Parc courant</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-primary/10"><Truck class="w-[18px] h-[18px] text-primary" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.tracteurs.filter(v => v.statut !== 'vendu').length }}</div><div :class="L.kpiItemLbl">Tracteurs</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-info-bg"><Container class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.semiRemorques.filter(v => v.statut !== 'vendu').length }}</div><div :class="L.kpiItemLbl">Semi-remorques</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-danger-bg"><TriangleAlert class="w-[18px] h-[18px] text-danger" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.immobilises.length }}</div><div :class="L.kpiItemLbl">Immobilisés</div></div>
        </div>
      </div>

      <div v-if="montrerArchives" class="flex items-start gap-2.5 bg-neutral-bg border border-border rounded-lg px-3.5 py-3 mb-3.5">
        <Archive class="w-4 h-4 text-neutral shrink-0 mt-0.5" />
        <p class="text-[12px] text-neutral flex-1 leading-relaxed">
          Vous consultez les véhicules sortis du parc (vendus ou définitivement retirés).
          On ne les supprime jamais : leur historique reste consultable.
        </p>
        <button class="text-neutral cursor-pointer" @click="montrerArchives = false"><X class="w-4 h-4" /></button>
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

    <!-- Le véhicule porte son attelage en sous-texte, comme sur la référence -->
    <template #cell-vehicule="{ item }">
      <button class="text-left bg-transparent border-0 p-0 cursor-pointer" @click.stop="openCard(item)">
        <div class="font-mono text-xs font-semibold text-primary hover:underline">{{ item.immatriculation }}</div>
        <div v-if="attelageLabel(item)" class="text-[11px] text-info flex items-center gap-1 mt-0.5">
          <Link2 class="w-3 h-3" /> {{ attelageLabel(item) }}
        </div>
        <div v-else class="text-[11px] text-muted-foreground mt-0.5">non attelé</div>
      </button>
    </template>
    <template #cell-type="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            :class="item.type === 'tracteur' ? 'bg-primary/10 text-primary' : 'bg-info-bg text-info'">
        {{ item.type === 'tracteur' ? 'Tracteur' : 'Semi-remorque' }}
      </span>
    </template>
    <template #cell-marqueModele="{ item }">
      <span class="text-[13px]"><strong>{{ item.marque }}</strong> / {{ item.modele }}</span>
    </template>
    <template #cell-statut="{ item }">
      <StatusPill :statut="item.statut" :libelle="vehicules.LIBELLES_STATUT[item.statut]" />
    </template>
    <template #cell-conducteur="{ item }">
      <div v-if="conducteurDe(item.id)" class="flex items-center gap-2">
        <UserAvatar :nom="conducteurDe(item.id)!" taille="sm" />
        <span class="text-[13px] truncate">{{ conducteurDe(item.id) }}</span>
      </div>
      <span v-else class="text-xs text-muted-foreground">non affecté</span>
    </template>
    <template #cell-site="{ item }">
      <span class="text-xs text-muted-foreground">{{ item.site }}</span>
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
          <div><div class="text-muted-foreground text-[11px]">Attelage</div>{{ attelageLabel(item) || 'Non attelé' }}</div>
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

    <NouveauVehiculeModal
      :ouvert="showCreate"
      @fermer="showCreate = false"
      @cree="idCree => { showCreate = false; openCardId = idCree }"
    />

    <ImportCsvModal
      v-if="showImport"
      titre="Importer le parc"
      :champs="CHAMPS_IMPORT"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE_CSV"
      description-controles="Contrôles appliqués : immatriculation et VIN obligatoires et uniques, type reconnu (tracteur ou semi-remorque)."
      :valider="validerLigneImport"
      @close="showImport = false"
      @importer="lignes => importerVehicules(lignes as unknown as LigneVehiculeImport[])"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Archive, Container, Link2, Plus, TriangleAlert, Truck, Upload, X } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import VehiculeCard from '../../components/cards/VehiculeCard.vue'
import NouveauVehiculeModal from '../../components/NouveauVehiculeModal.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import * as L from '../../lib/listClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import type { Vehicule, StatutVehicule, TypeVehicule } from '../../types'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()

const openCardId = ref<string | null>(null)
const showCreate = ref(false)
const showImport = ref(false)
const montrerArchives = ref(false)

function openCard(item: Vehicule) { openCardId.value = item.id }

function attelageLabel(v: Vehicule) {
  const at = vehicules.attelageDe(v.id)
  if (!at) return null
  const autreId = at.tracteurId === v.id ? at.semiRemorqueId : at.tracteurId
  return vehicules.parId(autreId)?.immatriculation ?? null
}
function conducteurDe(vehiculeId: string) {
  const af = vehicules.affectationActive(vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
}

const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule',     label: 'Véhicule',      sortable: true, hideable: false, width: 150 },
  { key: 'type',         label: 'Type',          sortable: true, width: 110 },
  { key: 'marqueModele', label: 'Marque / Modèle', width: 190 },
  { key: 'statut',       label: 'Statut',        sortable: true, width: 120 },
  { key: 'conducteur',   label: 'Conducteur',    width: 170 },
  { key: 'site',         label: 'Site',          width: 170 },
])

const scopeOptions = [
  { value: '', label: 'Tous les véhicules' },
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

watch([scope, fStatut, searchQuery, pageSize, montrerArchives], () => { page.value = 1 })
function resetFilters() { scope.value = ''; fStatut.value = ''; searchQuery.value = ''; page.value = 1 }

/* ── Import CSV du parc ─────────────────────────────────────── */
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'immatriculation', libelle: 'Immatriculation', requis: true },
  { cle: 'vin', libelle: 'VIN', requis: true },
  { cle: 'type', libelle: 'Type (tracteur / semi-remorque)', requis: true },
  { cle: 'marque', libelle: 'Marque', requis: true },
  { cle: 'modele', libelle: 'Modèle', requis: true },
  { cle: 'categorie', libelle: 'Catégorie', requis: false },
  { cle: 'carburant', libelle: 'Carburant', requis: false },
  { cle: 'chargeMaxKg', libelle: 'Charge max (kg)', requis: false },
  { cle: 'site', libelle: 'Site', requis: false },
]
const COLONNES_APERCU = [
  { cle: 'immatriculation', libelle: 'Immatriculation' },
  { cle: 'typeLibelle', libelle: 'Type' },
  { cle: 'marque', libelle: 'Marque' },
  { cle: 'modele', libelle: 'Modèle' },
]
const MODELE_CSV = ['Immatriculation', 'VIN', 'Type', 'Marque', 'Modèle', 'Catégorie', 'Carburant', 'Charge max (kg)', 'Site']

interface LigneVehiculeImport {
  immatriculation: string; vin: string; type: TypeVehicule; typeLibelle: string
  marque: string; modele: string; categorie: string; carburant: string
  chargeMaxKg?: number; site: string
}

function trouverType(valeur: string): TypeVehicule | null {
  const v = valeur.trim().toLowerCase()
  if (v.startsWith('tracteur')) return 'tracteur'
  if (v.startsWith('semi')) return 'semi_remorque'
  return null
}

function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')

  const immatriculation = val('immatriculation')
  const vin = val('vin')
  const typeSaisi = val('type')

  if (!immatriculation) return { valide: false, motif: 'Immatriculation manquante' }
  if (!vin) return { valide: false, motif: 'VIN manquant' }
  if (vehicules.liste.some(v => v.immatriculation === immatriculation)) return { valide: false, motif: `Immatriculation déjà utilisée (${immatriculation})` }
  if (vehicules.liste.some(v => v.vin === vin)) return { valide: false, motif: `VIN déjà utilisé (${vin})` }

  const type = trouverType(typeSaisi)
  if (!type) return { valide: false, motif: `Type non reconnu « ${typeSaisi} » (attendu : tracteur ou semi-remorque)` }

  const marque = val('marque')
  const modele = val('modele')
  if (!marque || !modele) return { valide: false, motif: 'Marque ou modèle manquant' }

  const chargeMaxStr = val('chargeMaxKg')
  const ligneValidee: LigneVehiculeImport = {
    immatriculation, vin, type, typeLibelle: type === 'tracteur' ? 'Tracteur' : 'Semi-remorque',
    marque, modele, categorie: val('categorie') || (type === 'tracteur' ? 'Tracteur routier' : 'Semi-remorque'),
    carburant: val('carburant') || 'Diesel', site: val('site') || 'Dépôt UCODIS Tanjombato',
    chargeMaxKg: chargeMaxStr ? Number(chargeMaxStr) : undefined,
  }
  return { valide: true, donnees: ligneValidee as unknown as Record<string, unknown> }
}

function importerVehicules(lignes: LigneVehiculeImport[]) {
  lignes.forEach(l => {
    vehicules.creer({
      immatriculation: l.immatriculation, vin: l.vin, type: l.type, marque: l.marque, modele: l.modele,
      categorie: l.categorie, carburant: l.carburant, chargeMaxKg: l.chargeMaxKg, site: l.site,
      statut: 'actif', kilometrage: 0,
    })
  })
}

const filtered = computed(() => {
  let rows = vehicules.liste.filter(v => {
    if (montrerArchives.value) { if (v.statut !== 'vendu') return false }
    else if (v.statut === 'vendu') return false
    if (scope.value && v.type !== scope.value) return false
    if (fStatut.value && v.statut !== fStatut.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!v.immatriculation.toLowerCase().includes(q) && !v.vin.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const champs: Record<string, keyof Vehicule> = { vehicule: 'immatriculation', type: 'type', statut: 'statut' }
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
