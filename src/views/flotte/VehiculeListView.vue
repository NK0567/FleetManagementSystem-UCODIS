<template>
  <ListPageLayout
    title="Véhicules"
    :subtitle="`${vehicules.auParc.length} véhicule(s) au parc · ${vehicules.immobilises.length} indisponible(s) · ${vehicules.archives.length} sorti(s) du parc`"
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
          <div><div :class="L.kpiItemVal">{{ vehicules.tracteurs.filter(v => v.statut !== 'sorti').length }}</div><div :class="L.kpiItemLbl">Tracteurs</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-info-bg"><Container class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.semiRemorques.filter(v => v.statut !== 'sorti').length }}</div><div :class="L.kpiItemLbl">Semi-remorques</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="L.kpiItemIcon" class="bg-danger-bg"><TriangleAlert class="w-[18px] h-[18px] text-danger" /></div>
          <div><div :class="L.kpiItemVal">{{ vehicules.immobilises.length }}</div><div :class="L.kpiItemLbl">Indisponibles</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Statut</label>
        <SearchableDropdown v-model="fStatut" :items="optStatuts" placeholder="Tous les statuts" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Base</label>
        <SearchableDropdown v-model="fBase" :items="optBases" placeholder="Toutes les bases" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Site actuel</label>
        <SearchableDropdown v-model="fSite" :items="optSites" placeholder="Tous les sites" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Affectation</label>
        <SearchableDropdown v-model="fAffectation" :items="optAffectation" placeholder="Toutes" compact />
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
            :class="typesVeh.estMotorise(item.type) ? 'bg-primary/10 text-primary' : 'bg-info-bg text-info'">
        {{ typesVeh.libelle(item.type) }}
      </span>
    </template>
    <template #cell-cause="{ item }">
      <template v-if="statuts.causeDe(item.id) && item.motifIndisponibilite">
        <span v-if="statuts.causeDe(item.id)?.code" class="font-mono text-[11px] font-semibold mr-1">{{ statuts.causeDe(item.id)?.code }}</span>
        <span class="text-xs">{{ item.motifIndisponibilite }}</span>
      </template>
      <span v-else class="text-xs text-muted-foreground">-</span>
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
                :class="typesVeh.estMotorise(item.type) ? 'bg-primary/10 text-primary' : 'bg-info-bg text-info'">
            {{ typesVeh.libelle(item.type) }}
          </span>
          <StatusPill :statut="item.statut" :libelle="vehicules.LIBELLES_STATUT[item.statut]" />
        </div>
        <div class="grid grid-cols-2 gap-2 text-[12px]">
          <div><div class="text-muted-foreground text-[11px]">VIN (numéro de châssis)</div><span class="font-mono">{{ item.vin }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Base</div>{{ item.site }}</div>
          <div><div class="text-muted-foreground text-[11px]">Kilométrage</div>{{ item.kilometrage.toLocaleString('fr-FR') }} km</div>
          <div><div class="text-muted-foreground text-[11px]">Attelage</div>{{ attelageLabel(item) || 'Non attelé' }}</div>
        </div>
        <div v-if="item.motifIndisponibilite" class="text-[12px] bg-danger-bg text-danger rounded px-2.5 py-1.5">
          <span v-if="statuts.causeDe(item.id)?.code" class="font-mono font-semibold mr-1">{{ statuts.causeDe(item.id)?.code }}</span>{{ item.motifIndisponibilite }}
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
      :champs="CHAMPS_IMPORT" import-id="vehicules"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE_CSV"
      description-controles="Immatriculation et VIN obligatoires et uniques ; type, base et charge maximale contrôlés."
      :valider="validerLigneImport"
      @close="showImport = false"
      @importer="lignes => importerVehicules(lignes as unknown as LigneVehiculeImport[])"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Archive, Container, Link2, Plus, TriangleAlert, Truck, Upload } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import VehiculeCard from '../../components/cards/VehiculeCard.vue'
import NouveauVehiculeModal from '../../components/NouveauVehiculeModal.vue'
import { IMPORTS } from '../../stores/imports'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import * as L from '../../lib/listClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useTypesVehiculesStore } from '../../stores/typesVehicules'
import { useStatutsVehiculesStore } from '../../stores/statutsVehicules'
import { useSitesStore } from '../../stores/sites'
import { useConfigurationStore } from '../../stores/configuration'
import { siteContenant } from '../../utils/geo'
import { useRoute } from 'vue-router'
import type { Vehicule, StatutVehicule, TypeVehicule } from '../../types'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const typesVeh = useTypesVehiculesStore()
const statuts = useStatutsVehiculesStore()
const sites = useSitesStore()
const configuration = useConfigurationStore()
const route = useRoute()

const openCardId = ref<string | null>(typeof route.query.vehicule === 'string' ? route.query.vehicule : null)
watch(() => route.query.vehicule, v => { if (typeof v === 'string') openCardId.value = v })
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
  { key: 'statut',       label: 'Statut',        sortable: true, width: 130 },
  { key: 'cause',        label: 'Cause',         width: 210 },
  { key: 'conducteur',   label: 'Conducteur',    width: 170 },
  { key: 'site',         label: 'Base',          width: 170 },
])

const scopeOptions = computed(() => [{ value: '', label: 'Tous les véhicules' }, ...typesVeh.types.filter(t => t.actif || vehicules.liste.some(v => v.type === t.code)).map(t => ({ value: t.code, label: t.libelle }))])
const fBase = ref(''); const fSite = ref(''); const fAffectation = ref('')
const optBases = computed<DropdownItem[]>(() => [...new Set(vehicules.liste.map(v => v.site).filter(Boolean))].sort().map(b => ({ id: b, label: b })))
const optSites = computed<DropdownItem[]>(() => [{ id: '__hors', label: 'Hors de tout site' }, ...sites.actifs.map(x => ({ id: x.id, label: x.nom, sublabel: x.type }))])
const optAffectation: DropdownItem[] = [
  { id: 'avec_conducteur', label: 'Avec un conducteur' }, { id: 'sans_conducteur', label: 'Sans conducteur' },
  { id: 'attele', label: 'Attelé' }, { id: 'non_attele', label: 'Non attelé' },
]
/** Site où se trouve le véhicule, d'après sa dernière position ; null hors de tout site, undefined sans position. */
function siteActuel(id: string) {
  const p = vehicules.positions[id]
  return p ? siteContenant(p, sites.sites, configuration.parametres.rayonValidationPassageM)?.id ?? null : undefined
}
const scope = ref('')
const fStatut = ref('')
const searchQuery = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

watch([scope, fStatut, fBase, fSite, fAffectation, searchQuery, pageSize, montrerArchives], () => { page.value = 1 })
function resetFilters() { scope.value = ''; fStatut.value = ''; fBase.value = ''; fSite.value = ''; fAffectation.value = ''; searchQuery.value = ''; page.value = 1 }

/* ── Import CSV du parc ─────────────────────────────────────── */
const CHAMPS_IMPORT: ChampImport[] = IMPORTS.vehicules.champs
const COLONNES_APERCU = [
  { cle: 'immatriculation', libelle: 'Immatriculation' },
  { cle: 'typeLibelle', libelle: 'Type' },
  { cle: 'marque', libelle: 'Marque' },
  { cle: 'modele', libelle: 'Modèle' },
]
const MODELE_CSV = CHAMPS_IMPORT.map(c => c.libelle)

interface LigneVehiculeImport {
  immatriculation: string; vin: string; type: TypeVehicule; typeLibelle: string
  marque: string; modele: string; categorie: string; carburant: string
  chargeMaxKg?: number; site: string
}

/** Le type se reconnaît par son code ou son libellé paramétré. */
function trouverType(valeur: string): TypeVehicule | null {
  const v = valeur.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return typesVeh.types.find(t => t.actif && (norm(t.code) === v || norm(t.libelle) === v))?.code ?? null
}
/** Doublons à l'intérieur du fichier : la première ligne d'une immatriculation ou d'un VIN est retenue. */
const vusDansFichier = new Map<string, Record<string, string>>()
watch(showImport, () => vusDansFichier.clear())
/** La base se choisit parmi les sites actifs, par son nom ou son code. */
function trouverBase(valeur: string) {
  const n = valeur.trim().toLowerCase()
  return sites.actifs.find(x => x.nom.toLowerCase() === n || x.code?.toLowerCase() === n) ?? null
}

function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')

  const immatriculation = val('immatriculation').toUpperCase()
  const vin = val('vin').toUpperCase()
  const typeSaisi = val('type')

  if (!immatriculation) return { valide: false, motif: 'Immatriculation manquante' }
  if (!vin) return { valide: false, motif: 'VIN manquant' }
  if (vehicules.liste.some(v => v.immatriculation.toUpperCase() === immatriculation || v.historiqueImmatriculations?.some(h => h.ancienne.toUpperCase() === immatriculation))) return { valide: false, motif: `Immatriculation déjà utilisée ou déjà portée (${immatriculation})` }
  if (vehicules.liste.some(v => v.vin.toUpperCase() === vin)) return { valide: false, motif: `VIN déjà utilisé (${vin})` }

  const type = trouverType(typeSaisi)
  if (!type) return { valide: false, motif: `Type non reconnu « ${typeSaisi} » (attendu : ${typesVeh.types.filter(t => t.actif).map(t => t.libelle.toLowerCase()).join(', ')})` }

  const marque = val('marque')
  const modele = val('modele')
  if (!marque || !modele) return { valide: false, motif: 'Marque ou modèle manquant' }

  const baseSaisie = val('site')
  if (!baseSaisie) return { valide: false, motif: 'Base manquante' }
  const base = trouverBase(baseSaisie)
  if (!base) return { valide: false, motif: `Base inconnue « ${baseSaisie} » : elle doit être un site actif` }
  const chargeMaxStr = val('chargeMaxKg').replace(/\s/g, '').replace(',', '.')
  const chargeMaxKg = chargeMaxStr ? Number(chargeMaxStr) : undefined
  if (chargeMaxKg !== undefined && (!Number.isFinite(chargeMaxKg) || chargeMaxKg < 0)) return { valide: false, motif: `Charge maximale invalide « ${val('chargeMaxKg')} » : un nombre positif est attendu` }

  /* Doublons dans le fichier : contrôlés en dernier, seule une ligne valide retient sa plaque et son VIN. */
  const cleI = `i|${immatriculation.toUpperCase()}`; const cleV = `v|${vin.toUpperCase()}`
  const autre = (c: string) => { const x = vusDansFichier.get(c); return !!x && x !== ligne }
  if (autre(cleI)) return { valide: false, motif: `Immatriculation en double dans le fichier (${immatriculation})` }
  if (autre(cleV)) return { valide: false, motif: `VIN en double dans le fichier (${vin})` }
  vusDansFichier.set(cleI, ligne); vusDansFichier.set(cleV, ligne)
  const ligneValidee: LigneVehiculeImport = {
    immatriculation, vin, type, typeLibelle: typesVeh.libelle(type),
    marque, modele, categorie: val('categorie') || typesVeh.libelle(type),
    carburant: val('carburant') || (typesVeh.estMotorise(type) ? 'Diesel' : 'Sans objet'), site: base.nom,
    chargeMaxKg,
  }
  return { valide: true, donnees: ligneValidee as unknown as Record<string, unknown> }
}

function importerVehicules(lignes: LigneVehiculeImport[]) {
  lignes.forEach(l => {
    vehicules.creer({
      immatriculation: l.immatriculation, vin: l.vin, type: l.type, marque: l.marque, modele: l.modele,
      categorie: l.categorie, carburant: l.carburant, chargeMaxKg: l.chargeMaxKg, site: l.site,
      statut: 'disponible', kilometrage: 0,
    })
  })
}

const filtered = computed(() => {
  let rows = vehicules.liste.filter(v => {
    if (montrerArchives.value) { if (v.statut !== 'sorti') return false }
    else if (v.statut === 'sorti') return false
    if (scope.value && v.type !== scope.value) return false
    if (fStatut.value && v.statut !== fStatut.value) return false
    if (fBase.value && v.site !== fBase.value) return false
    if (fSite.value) { const s = siteActuel(v.id); if (fSite.value === '__hors' ? s !== null : s !== fSite.value) return false }
    if (fAffectation.value === 'avec_conducteur' && !vehicules.affectationActive(v.id)) return false
    if (fAffectation.value === 'sans_conducteur' && (vehicules.affectationActive(v.id) || !typesVeh.estMotorise(v.type))) return false
    if (fAffectation.value === 'attele' && !vehicules.attelageDe(v.id)) return false
    if (fAffectation.value === 'non_attele' && vehicules.attelageDe(v.id)) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${v.immatriculation} ${v.vin} ${v.id} ${(v.historiqueImmatriculations ?? []).map(h => h.ancienne).join(' ')}`.toLowerCase().includes(q)) return false
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
    .filter(s => s !== 'sorti')
    .map(s => ({ id: s, label: vehicules.LIBELLES_STATUT[s] })))
</script>
