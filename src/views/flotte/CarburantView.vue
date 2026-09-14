<template>
  <ListPageLayout
    title="Carburant"
    :subtitle="`Méthode plein-à-plein · aucun capteur requis · ${store.anomalies.length} recharge(s) en anomalie`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="totalText"
    :search-placeholder="searchPlaceholder"
    scope-label="Vue :"
    :scope-options="scopeOptions"
    v-model:scope="vue"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(r) => { if (vue === 'recharges') ouvrirFiche((r as RechargeCarburant).id) }"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="importOuvert = true"><Upload class="w-4 h-4" /> Importer un relevé</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <template v-if="vue === 'recharges'">
        <div :class="L.fpField">
          <label :class="L.fpFieldLabel">Statut</label>
          <SearchableDropdown v-model="filterStatut" :items="optStatut" placeholder="Tous" compact />
        </div>
        <div :class="L.fpField">
          <label :class="L.fpFieldLabel">Canal</label>
          <SearchableDropdown v-model="filterCanal" :items="optCanal" placeholder="Tous" compact />
        </div>
      </template>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Véhicule</label>
        <SearchableDropdown v-model="filterVehicule" :items="optionsPlaques" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <!-- ══ VUE 1 - REGISTRE DES RECHARGES ══ -->
    <template #cell-date="{ item }">
      <button class="font-medium text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click="ouvrirFiche(item.id)">{{ fmtDateHeure(item.date) }}</button>
    </template>
    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">{{ item.vehiculePlaque }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.chauffeurNom ?? '-' }}</div>
    </template>
    <template #cell-bons="{ item }">
      <span class="text-sm font-bold text-primary">{{ item.nombreBons ?? 1 }}</span>
      <div v-if="item.litresParBon" class="text-[11px] text-muted-foreground">{{ item.litresParBon }} L/bon</div>
    </template>
    <template #cell-litres="{ item }">
      <span class="text-xs font-medium">{{ item.litres }} L</span>
      <div v-if="item.pleinComplet" class="text-[11px] text-primary">plein complet</div>
    </template>
    <template #cell-montant="{ item }"><span class="text-xs">{{ fmtAr(item.montant) }}</span></template>
    <template #cell-canal="{ item }"><span class="text-xs px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ LIB_CANAL[item.canal as CanalRecharge] }}</span></template>
    <template #cell-controles="{ item }">
      <span v-if="item.statut === 'valide'" class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
      <span v-else-if="['qualifie','en_validation','refacture','classe'].includes(item.statut)" class="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">Qualifiée</span>
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ item.controles.filter((c: any) => !c.ok).length }} anomalie(s)</span>
    </template>

    <!-- ══ VUE 2 - CONSOMMATION PLEIN-À-PLEIN ══ -->
    <template #cell-plaqueConso="{ item }">
      <span class="font-mono text-xs font-semibold text-primary">{{ item.vehiculePlaque }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.chauffeurNom ?? '-' }}</div>
    </template>
    <template #cell-periode="{ item }"><span class="text-xs">{{ fmtJour(item.du) }} → {{ fmtJour(item.au) }}</span></template>
    <template #cell-km="{ item }"><span class="text-xs">{{ item.km.toLocaleString('fr-FR') }} km</span></template>
    <template #cell-litresConso="{ item }"><span class="text-xs">{{ item.litres.toLocaleString('fr-FR') }} L</span></template>
    <template #cell-l100="{ item }"><span class="text-sm font-bold">{{ item.litresPour100km }}</span></template>
    <template #cell-reference="{ item }"><span class="text-xs text-muted-foreground">{{ item.refConso }} L/100 km réf.</span></template>
    <template #cell-ecartConso="{ item }">
      <span class="text-xs font-medium" :class="Math.abs(item.ecartPct) > 8 ? 'text-danger' : Math.abs(item.ecartPct) > 3 ? 'text-warning' : 'text-success'">
        {{ item.ecartPct > 0 ? '+' : '' }}{{ item.ecartPct }} %
      </span>
    </template>

    <!-- ══ VUE 3 - BONS PAR VÉHICULE ══ -->
    <template #cell-plaqueBons="{ item }"><span class="font-mono text-xs font-semibold text-primary">{{ item.plaque }}</span></template>
    <template #cell-nbBons="{ item }"><span class="text-lg font-bold text-primary">{{ item.bons }}</span></template>
    <template #cell-litresBons="{ item }"><span class="text-xs">{{ item.litres.toLocaleString('fr-FR') }} L</span></template>
    <template #cell-montantBons="{ item }"><span class="text-xs">{{ fmtAr(item.montant) }}</span></template>
    <template #cell-part="{ item }">
      <div class="flex items-center gap-2">
        <div class="w-24 h-2 rounded-full bg-background overflow-hidden"><div class="h-full bg-primary rounded-full" :style="{ width: (totalBons ? (item.bons / totalBons) * 100 : 0) + '%' }"></div></div>
        <span class="text-[11px] text-muted-foreground">{{ totalBons ? Math.round((item.bons / totalBons) * 100) : 0 }} %</span>
      </div>
    </template>

    <template #details-panel="{ item }">
      <div v-if="vue === 'recharges'" class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeStatut(item.statut)">{{ libelleStatut(item.statut) }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ fmtDateHeure(item.date) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Litres</div>{{ item.litres }} L</div>
          <div><div class="text-muted-foreground text-[11px]">Montant</div>{{ fmtAr(item.montant) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Chauffeur</div>{{ item.chauffeurNom ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Lieu</div>{{ item.lieu }}</div>
        </div>
        <div v-if="item.statut === 'anomalie'" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">
          {{ item.controles.filter((c: any) => !c.ok).length }} contrôle(s) de vraisemblance en échec.
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
      <div v-else class="text-xs text-muted-foreground">Sélectionnez une recharge dans le registre pour ouvrir sa fiche.</div>
    </template>

    <template #empty>
      <Fuel class="w-8 h-8" />
      <p class="text-sm">{{ messageVide }}</p>
    </template>

    <RechargeCard v-if="ficheId" :recharges="store.recharges" :recharge-id="ficheId" @close="ficheId = null" @voir-conducteur="voirConducteur" />

    <ImportCsvModal
      v-if="importOuvert"
      titre="Importer des relevés de carburant"
      :champs="CHAMPS_IMPORT"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE_CSV"
      description-controles="Contrôles appliqués : véhicule reconnu par sa plaque, date et litres obligatoires, litres positifs."
      :valider="validerLigneImport"
      @close="importOuvert = false"
      @importer="lignes => importerRecharges(lignes as unknown as LigneRechargeImport[])"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Coins, Fuel, Gauge, Ticket, TriangleAlert, Upload } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import RechargeCard from '../../components/flotte/RechargeCard.vue'
import { useCarburantStore, LIB_CANAL } from '../../stores/carburant'
import { useVehiculeStore } from '../../stores/vehicules'
import type { CanalRecharge, RechargeCarburant } from '../../types'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useCarburantStore()
const vehicules = useVehiculeStore()
const router = useRouter()

type Vue = 'recharges' | 'conso' | 'bons'
const vue = ref<Vue>('recharges')

const searchQuery = ref('')
const filterStatut = ref('')
const filterCanal = ref('')
const filterVehicule = ref('')
const ficheId = ref<string | null>(null)
const importOuvert = ref(false)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

function fmtAr(n: number) { return `${n.toLocaleString('fr-FR')} Ar` }
function fmtJour(iso: string) { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

const scopeOptions = [
  { value: 'recharges', label: 'Registre des recharges' },
  { value: 'conso', label: 'Consommation plein-à-plein' },
  { value: 'bons', label: 'Bons par véhicule' },
]

const searchPlaceholder = computed(() => (vue.value === 'recharges' ? 'Plaque, chauffeur, lieu…' : 'Rechercher un véhicule…'))
const messageVide = computed(() => (vue.value === 'recharges' ? 'Aucune recharge trouvée' : vue.value === 'conso' ? 'Aucune période plein-à-plein calculable' : 'Aucun bon enregistré'))
const totalText = computed(() => (vue.value === 'recharges' ? `${totalCount.value} recharge(s)` : vue.value === 'conso' ? `${totalCount.value} période(s)` : `${totalCount.value} véhicule(s)`))

const consoMoyenne = computed(() => {
  const p = store.periodesConso
  if (!p.length) return 0
  return Math.round((p.reduce((s, x) => s + x.litresPour100km, 0) / p.length) * 10) / 10
})
const totalBons = computed(() => store.recharges.reduce((s, r) => s + (r.nombreBons ?? 1), 0))

const kpis = computed(() => [
  { label: 'Litres délivrés', value: `${store.litresDelivres()} L`, icon: Fuel, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Dépense totale', value: fmtAr(store.montantTotal()), icon: Coins, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'Bons délivrés', value: String(totalBons.value), icon: Ticket, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Conso (L/100 km)', value: String(consoMoyenne.value), icon: Gauge, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'En anomalie', value: String(store.anomalies.length), icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
])

const STATUT_LIB: Record<string, { label: string; cls: string }> = {
  valide: { label: 'Valide', cls: 'bg-success-bg text-success' },
  anomalie: { label: 'Anomalie', cls: 'bg-danger-bg text-danger' },
  en_qualification: { label: 'En qualification', cls: 'bg-warning-bg text-warning' },
  qualifie: { label: 'Qualifiée', cls: 'bg-info-bg text-info' },
  en_validation: { label: 'En validation', cls: 'bg-warning-bg text-warning' },
  refacture: { label: 'Refacturée', cls: 'bg-danger-bg text-danger' },
  classe: { label: 'Classée', cls: 'bg-neutral-bg text-neutral' },
}
function classeStatut(s: string) { return STATUT_LIB[s]?.cls ?? '' }
function libelleStatut(s: string) { return STATUT_LIB[s]?.label ?? s }

const optStatut: DropdownItem[] = [
  { id: 'valide', label: 'Valides' }, { id: 'anomalie', label: 'En anomalie' }, { id: 'qualifie', label: 'Qualifiées' },
]
const optCanal: DropdownItem[] = Object.entries(LIB_CANAL).map(([id, label]) => ({ id, label }))
const plaques = computed(() => [...new Set(store.recharges.map(r => r.vehiculePlaque))].sort())
const optionsPlaques = computed<DropdownItem[]>(() => plaques.value.map(p => ({ id: p, label: p })))

const COLONNES: Record<Vue, ListColumn[]> = {
  recharges: [
    { key: 'date', label: 'Date', sortable: true, hideable: false, width: 150 },
    { key: 'vehicule', label: 'Véhicule', sortable: true, width: 150 },
    { key: 'bons', label: 'Bons', width: 90 },
    { key: 'litres', label: 'Litres', width: 110 },
    { key: 'montant', label: 'Montant', width: 130 },
    { key: 'canal', label: 'Canal', width: 120 },
    { key: 'controles', label: 'Contrôles', width: 120 },
  ],
  conso: [
    { key: 'plaqueConso', label: 'Véhicule', sortable: true, hideable: false, width: 150 },
    { key: 'periode', label: 'Période plein-à-plein', width: 160 },
    { key: 'km', label: 'Kilomètres', width: 110 },
    { key: 'litresConso', label: 'Litres', width: 100 },
    { key: 'l100', label: 'L / 100 km', sortable: true, width: 100 },
    { key: 'reference', label: 'Référence', width: 140 },
    { key: 'ecartConso', label: 'Écart', width: 90 },
  ],
  bons: [
    { key: 'plaqueBons', label: 'Véhicule', sortable: true, hideable: false, width: 150 },
    { key: 'nbBons', label: 'Bons délivrés', sortable: true, width: 130 },
    { key: 'litresBons', label: 'Litres', width: 110 },
    { key: 'montantBons', label: 'Montant', width: 130 },
    { key: 'part', label: 'Répartition', width: 170 },
  ],
}
const columns = computed(() => COLONNES[vue.value])

watch([vue, filterStatut, filterCanal, filterVehicule, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { filterStatut.value = ''; filterCanal.value = ''; filterVehicule.value = ''; searchQuery.value = ''; page.value = 1 }

interface LigneBons { plaque: string; bons: number; litres: number; montant: number }

const donnees = computed<any[]>(() => {
  const q = searchQuery.value.toLowerCase()

  if (vue.value === 'recharges') {
    let rows = store.recharges.filter(r => {
      if (filterStatut.value && r.statut !== filterStatut.value) return false
      if (filterCanal.value && r.canal !== filterCanal.value) return false
      if (filterVehicule.value && r.vehiculePlaque !== filterVehicule.value) return false
      if (q && !`${r.vehiculePlaque} ${r.chauffeurNom ?? ''} ${r.lieu}`.toLowerCase().includes(q)) return false
      return true
    })
    return sortKey.value ? tri(rows, sortKey.value) : [...rows].sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }

  if (vue.value === 'conso') {
    let rows = store.periodesConso.filter(p => {
      if (filterVehicule.value && p.vehiculePlaque !== filterVehicule.value) return false
      if (q && !p.vehiculePlaque.toLowerCase().includes(q)) return false
      return true
    })
    return sortKey.value ? tri(rows, sortKey.value) : rows
  }

  // bons par véhicule
  const parVehicule = new Map<string, LigneBons>()
  store.recharges.forEach(r => {
    if (filterVehicule.value && r.vehiculePlaque !== filterVehicule.value) return
    if (q && !r.vehiculePlaque.toLowerCase().includes(q)) return
    const cur = parVehicule.get(r.vehiculePlaque) ?? { plaque: r.vehiculePlaque, bons: 0, litres: 0, montant: 0 }
    cur.bons += r.nombreBons ?? 1
    cur.litres += r.litres
    cur.montant += r.montant
    parVehicule.set(r.vehiculePlaque, cur)
  })
  let rows = [...parVehicule.values()]
  return sortKey.value ? tri(rows, sortKey.value === 'nbBons' ? 'bons' : sortKey.value) : rows.sort((a, b) => b.bons - a.bons)
})
function tri(rows: any[], key: string) {
  return [...rows].sort((a, b) => {
    const cmp = typeof a[key] === 'number' ? a[key] - b[key] : String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
    return sortDir.value === 'asc' ? cmp : -cmp
  })
}

const totalCount = computed(() => donnees.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return donnees.value.slice(s, s + pageSize.value) })

/* ── Import CSV des relevés ───────────────────────────────────── */
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'plaque', libelle: 'Immatriculation véhicule', requis: true },
  { cle: 'date', libelle: 'Date (AAAA-MM-JJ HH:MM)', requis: true },
  { cle: 'litres', libelle: 'Litres', requis: true },
  { cle: 'prixLitre', libelle: 'Prix au litre (Ar)', requis: false },
  { cle: 'lieu', libelle: 'Lieu', requis: false },
]
const COLONNES_APERCU = [
  { cle: 'vehiculePlaque', libelle: 'Véhicule' },
  { cle: 'date', libelle: 'Date' },
  { cle: 'litres', libelle: 'Litres' },
  { cle: 'lieu', libelle: 'Lieu' },
]
const MODELE_CSV = ['Immatriculation véhicule', 'Date', 'Litres', 'Prix au litre', 'Lieu']

interface LigneRechargeImport {
  vehiculeId: string; vehiculePlaque: string; date: string; litres: number; prixLitre: number; montant: number; lieu: string; odometre: number
}

function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')

  const plaque = val('plaque')
  const date = val('date')
  const litresStr = val('litres')

  if (!plaque) return { valide: false, motif: 'Immatriculation manquante' }
  const vehicule = vehicules.liste.find(v => v.immatriculation === plaque)
  if (!vehicule) return { valide: false, motif: `Véhicule inconnu « ${plaque} »` }
  if (!date) return { valide: false, motif: 'Date manquante' }
  const litres = Number(litresStr)
  if (!litresStr || Number.isNaN(litres) || litres <= 0) return { valide: false, motif: 'Litres manquants ou invalides' }

  const prixLitre = Number(val('prixLitre')) || 5_400
  const ligneValidee: LigneRechargeImport = {
    vehiculeId: vehicule.id, vehiculePlaque: vehicule.immatriculation, date, litres,
    prixLitre, montant: Math.round(litres * prixLitre), lieu: val('lieu') || 'Non renseigné', odometre: vehicule.kilometrage,
  }
  return { valide: true, donnees: ligneValidee as unknown as Record<string, unknown> }
}

function importerRecharges(lignes: LigneRechargeImport[]) {
  lignes.forEach(l => {
    store.creer({
      date: l.date, vehiculeId: l.vehiculeId, vehiculePlaque: l.vehiculePlaque,
      litres: l.litres, prixLitre: l.prixLitre, montant: l.montant, odometre: l.odometre,
      // Le fichier importé ne porte pas de coordonnées : le lieu de recharge n'étant pas
      // géocodé automatiquement, on retient par défaut celles du dépôt principal.
      pleinComplet: false, lieu: l.lieu, lat: -18.8792, lng: 47.5079, canal: 'mobile',
    })
  })
}

function ouvrirFiche(id: string) { ficheId.value = id }
function voirConducteur(id: string) { router.push({ name: 'flotte-conducteur-dashboard', params: { id } }) }
</script>
