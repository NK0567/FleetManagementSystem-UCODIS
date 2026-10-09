<template>
  <ListPageLayout
    title="Carburant"
    :subtitle="vue === 'emissions' ? `${(co2Total / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t de CO2 émises · ${eco.partFaiblesEmissions.pct} % du parc motorisé à faibles émissions (${eco.partFaiblesEmissions.faibles} sur ${eco.partFaiblesEmissions.total})` : `Méthode plein-à-plein · ${store.anomalies.length} plein(s) et ${store.ecartsAQualifier.length} écart(s) de consommation à qualifier`"
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
    @open-card="(r: any) => { if (vue === 'recharges') ouvrirFiche(r.id); else if (vue === 'conso') ficheEcartId = r.id }"
  >
    <template #header-actions>
      <button :class="L.btnOutline" @click="importOuvert = true"><Upload class="w-4 h-4" /> Importer un relevé</button>
      <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Nouveau plein</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem" class="cursor-pointer" @click="k.action()">
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
      <div v-if="vue === 'conso'" :class="L.fpField">
        <label :class="L.fpFieldLabel">Suite</label>
        <SearchableDropdown v-model="filterEcart" :items="optEcart" placeholder="Toutes" compact />
      </div>
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
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">À qualifier · {{ item.controles.filter((c: any) => !c.ok).length }} contrôle(s)</span>
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
    <template #cell-reference="{ item }"><span class="text-xs text-muted-foreground">{{ item.refConso }} L/100 km</span><div class="text-[11px] text-muted-foreground truncate">{{ item.trajetLibelle ?? 'corridor non renseigné' }}</div></template>
    <template #cell-statutEcart="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_ECART[store.statutEcart(item)].cls">{{ LIB_STATUT_ECART[store.statutEcart(item)].label }}</span></template>
    <template #cell-ecartConso="{ item }">
      <span class="text-xs font-medium" :class="Math.abs(item.ecartPct) > store.parametres.seuilEcartConsoPct ? 'text-danger' : Math.abs(item.ecartPct) > store.parametres.seuilEcartConsoPct / 2 ? 'text-warning' : 'text-success'">
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

    <!-- ══ VUE 4 - ÉMISSIONS ET ÉCOCONDUITE ══ -->
    <template #cell-plaqueEmis="{ item }"><span class="font-mono text-xs font-semibold text-primary">{{ item.plaque }}</span><div class="text-[11px] text-muted-foreground">{{ vehicules.parId(item.vehiculeId)?.carburant ?? '-' }}</div></template>
    <template #cell-litresEmis="{ item }"><span class="text-xs">{{ item.litres.toLocaleString('fr-FR') }} L</span></template>
    <template #cell-co2="{ item }"><span class="text-sm font-bold">{{ (item.co2Kg / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }} t</span></template>
    <template #cell-gkm="{ item }"><span class="text-xs">{{ item.gParKm != null ? item.gParKm.toLocaleString('fr-FR') + ' g/km' : '-' }}</span></template>
    <template #cell-eco="{ item }">
      <span class="text-xs">{{ eco.evenementsDuVehicule(item.vehiculeId).filter(e => e.type === 'acceleration_brusque').length }} accélération(s)</span>
      <div class="text-[11px] text-muted-foreground">{{ eco.evenementsDuVehicule(item.vehiculeId).filter(e => e.type === 'ralenti_prolonge').length }} ralenti(s) prolongé(s)</div>
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
      <div v-else-if="vue === 'conso'" class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_ECART[store.statutEcart(item)].cls">{{ LIB_STATUT_ECART[store.statutEcart(item)].label }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ fmtJour(item.du) }} → {{ fmtJour(item.au) }} · {{ item.chauffeurNom ?? '-' }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Réel</div>{{ item.litresPour100km }} L/100 km</div>
          <div><div class="text-muted-foreground text-[11px]">Référence</div>{{ item.refConso }} L/100 km</div>
          <div><div class="text-muted-foreground text-[11px]">Écart</div><span :class="Math.abs(item.ecartPct) > store.parametres.seuilEcartConsoPct ? 'text-danger font-semibold' : ''">{{ item.ecartPct > 0 ? '+' : '' }}{{ item.ecartPct }} %</span></div>
          <div><div class="text-muted-foreground text-[11px]">Corridor</div>{{ item.trajetLibelle ?? '-' }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheEcartId = item.id">Ouvrir la fiche</button>
      </div>
      <div v-else-if="vue === 'emissions'" class="flex flex-col gap-3">
        <div>
          <div class="font-mono font-semibold text-foreground">{{ item.plaque }}</div>
          <div class="text-xs text-muted-foreground">{{ vehicules.parId(item.vehiculeId)?.carburant ?? '-' }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">CO2 émis</div>{{ item.co2Kg.toLocaleString('fr-FR') }} kg</div>
          <div><div class="text-muted-foreground text-[11px]">Par km</div>{{ item.gParKm != null ? item.gParKm + ' g' : '-' }}</div>
        </div>
        <div>
          <div class="text-muted-foreground text-[11px] mb-1">Événements d'écoconduite</div>
          <p v-if="!eco.evenementsDuVehicule(item.vehiculeId).length" class="text-xs text-muted-foreground">Aucun</p>
          <div v-for="e in eco.evenementsDuVehicule(item.vehiculeId)" :key="e.id" class="text-xs border-b border-border/60 py-1">
            {{ LIB_EVENEMENT_ECO[e.type] }}<template v-if="e.dureeMin"> ({{ e.dureeMin }} min)</template>
            <div class="text-[11px] text-muted-foreground">{{ fmtDateHeure(e.date) }} · {{ e.lieu }} · {{ nomConducteur(e.conducteurId) }}</div>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col gap-2 text-xs">
        <div class="font-mono font-semibold text-foreground">{{ item.plaque }}</div>
        <div><div class="text-muted-foreground text-[11px]">Bons délivrés</div>{{ item.bons }}</div>
        <div><div class="text-muted-foreground text-[11px]">Litres</div>{{ item.litres.toLocaleString('fr-FR') }} L</div>
        <div><div class="text-muted-foreground text-[11px]">Montant</div>{{ fmtAr(item.montant) }}</div>
      </div>
    </template>

    <template #empty>
      <Fuel class="w-8 h-8" />
      <p class="text-sm">{{ messageVide }}</p>
    </template>

    <RechargeCard v-if="ficheId" :key="ficheId" :recharges="ordreRecharges" :recharge-id="ficheId" @close="ficheId = null" @voir-conducteur="voirConducteur" />
    <EcartConsoCard v-if="ficheEcartId" :periodes="store.periodesConso" :periode-id="ficheEcartId" @close="ficheEcartId = null" @ouvrir-plein="id => { ficheEcartId = null; ficheId = id }" />
    <RechargeFormModal v-if="creationOuverte" @close="creationOuverte = false" @cree="id => { creationOuverte = false; vue = 'recharges'; ficheId = id }" />

    <ImportCsvModal
      v-if="importOuvert"
      titre="Importer des relevés de carburant"
      :champs="CHAMPS_IMPORT"
      :apercu-colonnes="COLONNES_APERCU"
      :modele="MODELE_CSV"
      description-controles="Contrôles appliqués : véhicule reconnu par sa plaque, date valide et passée, litres, kilométrage et prix au litre positifs, chauffeur reconnu s'il est indiqué, plein pas déjà enregistré."
      :valider="validerLigneImport"
      @close="importOuvert = false"
      @importer="lignes => importerRecharges(lignes as unknown as LigneRechargeImport[])"
    />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Coins, Fuel, Gauge, Leaf, Plus, Scale, TriangleAlert, Upload } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import RechargeCard from '../../components/flotte/RechargeCard.vue'
import RechargeFormModal from '../../components/flotte/RechargeFormModal.vue'
import EcartConsoCard from '../../components/flotte/EcartConsoCard.vue'
import { useCarburantStore, LIB_CANAL, LIB_STATUT_ECART } from '../../stores/carburant'
import { useEcoconduiteStore, LIB_EVENEMENT_ECO } from '../../stores/ecoconduite'
import { usePersonnelStore } from '../../stores/personnel'
import { useVehiculeStore } from '../../stores/vehicules'
import type { CanalRecharge, RechargeCarburant } from '../../types'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'
import * as cls from '../../lib/formClasses'

const store = useCarburantStore()
const vehicules = useVehiculeStore()
const eco = useEcoconduiteStore()
const personnel = usePersonnelStore()
const router = useRouter()
const nomConducteur = (id: string) => personnel.liste.find(p => p.id === id)?.nomComplet ?? id

type Vue = 'recharges' | 'conso' | 'bons' | 'emissions'
const vue = ref<Vue>('recharges')

const searchQuery = ref('')
const filterStatut = ref('')
const filterCanal = ref('')
const filterVehicule = ref('')
const ficheId = ref<string | null>(null)
const ficheEcartId = ref<string | null>(null)
const creationOuverte = ref(false)
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
  { value: 'emissions', label: 'Émissions et écoconduite' },
]

const searchPlaceholder = computed(() => (vue.value === 'recharges' ? 'Plaque, chauffeur, lieu…' : 'Rechercher un véhicule…'))
const messageVide = computed(() => ({ recharges: 'Aucun plein trouvé', conso: 'Aucune période plein-à-plein calculable', bons: 'Aucun bon enregistré', emissions: 'Aucune consommation enregistrée' })[vue.value])
const totalText = computed(() => (vue.value === 'recharges' ? `${totalCount.value} plein(s)` : vue.value === 'conso' ? `${totalCount.value} période(s)` : `${totalCount.value} véhicule(s)`))

const consoMoyenne = computed(() => {
  const p = store.periodesConso
  if (!p.length) return 0
  return Math.round((p.reduce((s, x) => s + x.litresPour100km, 0) / p.length) * 10) / 10
})
const totalBons = computed(() => store.recharges.reduce((s, r) => s + (r.nombreBons ?? 1), 0))

const co2Total = computed(() => store.emissionsParVehicule.reduce((s, e) => s + e.co2Kg, 0))
const kpis = computed(() => [
  { label: 'Litres délivrés', value: `${store.litresDelivres().toLocaleString('fr-FR')} L`, icon: Fuel, bg: 'bg-primary/10', iconColor: 'text-primary', action: () => { vue.value = 'recharges'; filterStatut.value = '' } },
  { label: 'Dépense totale', value: fmtAr(store.montantTotal()), icon: Coins, bg: 'bg-info-bg', iconColor: 'text-info', action: () => { vue.value = 'recharges'; filterStatut.value = '' } },
  { label: 'Conso (L/100 km)', value: String(consoMoyenne.value), icon: Gauge, bg: 'bg-success-bg', iconColor: 'text-success', action: () => { vue.value = 'conso' } },
  { label: 'Pleins à qualifier', value: String(store.anomalies.length), icon: TriangleAlert, bg: 'bg-warning-bg', iconColor: 'text-warning', action: () => { vue.value = 'recharges'; filterStatut.value = 'anomalie' } },
  { label: 'Écarts à qualifier', value: String(store.ecartsAQualifier.length), icon: Scale, bg: 'bg-danger-bg', iconColor: 'text-danger', action: () => { vue.value = 'conso'; filterEcart.value = 'a_qualifier' } },
  { label: 'CO2 émis', value: `${(co2Total.value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t`, icon: Leaf, bg: 'bg-neutral-bg', iconColor: 'text-neutral', action: () => { vue.value = 'emissions' } },
])

const STATUT_LIB: Record<string, { label: string; cls: string }> = {
  valide: { label: 'Valide', cls: 'bg-success-bg text-success' },
  anomalie: { label: 'À qualifier', cls: 'bg-warning-bg text-warning' },
  en_qualification: { label: 'En qualification', cls: 'bg-warning-bg text-warning' },
  qualifie: { label: 'Qualifiée', cls: 'bg-info-bg text-info' },
  en_validation: { label: 'En validation', cls: 'bg-warning-bg text-warning' },
  refacture: { label: 'Refacturée', cls: 'bg-danger-bg text-danger' },
  classe: { label: 'Classée', cls: 'bg-neutral-bg text-neutral' },
}
function classeStatut(s: string) { return STATUT_LIB[s]?.cls ?? '' }
function libelleStatut(s: string) { return STATUT_LIB[s]?.label ?? s }

const optStatut: DropdownItem[] = [
  { id: 'valide', label: 'Conformes' }, { id: 'anomalie', label: 'À qualifier' }, { id: 'qualifie', label: 'Qualifiés' },
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
    { key: 'reference', label: 'Référence', width: 170 },
    { key: 'ecartConso', label: 'Écart', width: 90 },
    { key: 'statutEcart', label: 'Suite', width: 150 },
  ],
  bons: [
    { key: 'plaqueBons', label: 'Véhicule', sortable: true, hideable: false, width: 150 },
    { key: 'nbBons', label: 'Bons délivrés', sortable: true, width: 130 },
    { key: 'litresBons', label: 'Litres', width: 110 },
    { key: 'montantBons', label: 'Montant', width: 130 },
    { key: 'part', label: 'Répartition', width: 170 },
  ],
  emissions: [
    { key: 'plaqueEmis', label: 'Véhicule', sortable: true, hideable: false, width: 150 },
    { key: 'litresEmis', label: 'Litres', width: 110 },
    { key: 'co2', label: 'CO2 émis', sortable: true, width: 120 },
    { key: 'gkm', label: 'Par km', width: 110 },
    { key: 'eco', label: 'Écoconduite', width: 180 },
  ],
}
const columns = computed(() => COLONNES[vue.value])

const filterEcart = ref('')
watch([vue, filterStatut, filterCanal, filterVehicule, filterEcart, searchQuery, pageSize], () => { page.value = 1 })
watch(vue, () => { sortKey.value = '' })
function resetFilters() { filterStatut.value = ''; filterCanal.value = ''; filterVehicule.value = ''; filterEcart.value = ''; searchQuery.value = ''; page.value = 1 }
const optEcart: DropdownItem[] = Object.entries(LIB_STATUT_ECART).map(([id, v]) => ({ id, label: v.label }))

interface LigneBons { id: string; plaque: string; bons: number; litres: number; montant: number }

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
      if (filterEcart.value && store.statutEcart(p) !== filterEcart.value) return false
      if (q && !p.vehiculePlaque.toLowerCase().includes(q)) return false
      return true
    })
    return sortKey.value ? tri(rows, sortKey.value) : rows
  }

  if (vue.value === 'emissions') {
    const rows = store.emissionsParVehicule.filter(e => (!filterVehicule.value || e.plaque === filterVehicule.value) && (!q || e.plaque.toLowerCase().includes(q)))
    return sortKey.value ? tri(rows, sortKey.value === 'co2' ? 'co2Kg' : sortKey.value === 'plaqueEmis' ? 'plaque' : sortKey.value) : rows.sort((a, b) => b.co2Kg - a.co2Kg)
  }

  // bons par véhicule
  const parVehicule = new Map<string, LigneBons>()
  store.recharges.forEach(r => {
    if (filterVehicule.value && r.vehiculePlaque !== filterVehicule.value) return
    if (q && !r.vehiculePlaque.toLowerCase().includes(q)) return
    const cur = parVehicule.get(r.vehiculePlaque) ?? { id: r.vehiculePlaque, plaque: r.vehiculePlaque, bons: 0, litres: 0, montant: 0 }
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
const ordreRecharges = computed(() => [...store.recharges].sort((a, b) => +new Date(b.date) - +new Date(a.date)))
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return donnees.value.slice(s, s + pageSize.value) })

/* ── Import CSV des relevés ───────────────────────────────────── */
const CHAMPS_IMPORT: ChampImport[] = [
  { cle: 'plaque', libelle: 'Immatriculation véhicule', requis: true },
  { cle: 'date', libelle: 'Date (AAAA-MM-JJ HH:MM)', requis: true },
  { cle: 'litres', libelle: 'Litres', requis: true },
  { cle: 'km', libelle: 'Kilométrage', requis: true },
  { cle: 'prixLitre', libelle: 'Prix au litre (Ar)', requis: true },
  { cle: 'lieu', libelle: 'Station', requis: false },
  { cle: 'chauffeur', libelle: 'Chauffeur', requis: false },
  { cle: 'plein', libelle: 'Plein complet (oui/non)', requis: false },
]
const COLONNES_APERCU = [
  { cle: 'vehiculePlaque', libelle: 'Véhicule' },
  { cle: 'date', libelle: 'Date' },
  { cle: 'litres', libelle: 'Litres' },
  { cle: 'odometre', libelle: 'Km' },
  { cle: 'lieu', libelle: 'Station' },
]
const MODELE_CSV = ['Immatriculation véhicule', 'Date (AAAA-MM-JJ HH:MM)', 'Litres', 'Kilométrage', 'Prix au litre (Ar)', 'Station', 'Chauffeur', 'Plein complet (oui/non)']

interface LigneRechargeImport {
  vehiculeId: string; vehiculePlaque: string; date: string; litres: number; prixLitre: number; montant: number; lieu: string; odometre: number
  chauffeurId?: string; chauffeurNom?: string; pleinComplet: boolean
}

/** Accepte AAAA-MM-JJ HH:MM ou JJ/MM/AAAA HH:MM. */
function normaliserDateHeure(d: string) {
  const fr = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (fr) return `${fr[3]}-${fr[2]!.padStart(2, '0')}-${fr[1]!.padStart(2, '0')}T${(fr[4] ?? '00').padStart(2, '0')}:${fr[5] ?? '00'}`
  const iso = d.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/)
  return iso ? `${iso[1]}T${(iso[2] ?? '00').padStart(2, '0')}:${iso[3] ?? '00'}` : ''
}
const nombre = (v: string) => Number(v.replace(/\s/g, '').replace(',', '.'))

function validerLigneImport(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')
  const plaque = val('plaque')
  if (!plaque) return { valide: false, motif: 'Immatriculation manquante' }
  const vehicule = vehicules.liste.find(v => v.immatriculation.toLowerCase() === plaque.toLowerCase())
  if (!vehicule) return { valide: false, motif: `Véhicule inconnu « ${plaque} »` }
  const date = normaliserDateHeure(val('date'))
  if (!date || isNaN(new Date(date).getTime())) return { valide: false, motif: `Date invalide « ${val('date')} »` }
  if (new Date(date).getTime() > Date.now()) return { valide: false, motif: 'Date dans le futur' }
  const litres = nombre(val('litres'))
  if (!(litres > 0)) return { valide: false, motif: 'Litres manquants ou invalides' }
  const km = nombre(val('km'))
  if (!(km > 0)) return { valide: false, motif: 'Kilométrage manquant ou invalide' }
  const prixLitre = nombre(val('prixLitre'))
  if (!(prixLitre > 0)) return { valide: false, motif: 'Prix au litre manquant ou invalide' }
  if (store.recharges.some(r => r.vehiculeId === vehicule.id && r.litres === litres && Math.abs(new Date(r.date).getTime() - new Date(date).getTime()) < 10 * 60_000))
    return { valide: false, motif: 'Plein déjà enregistré' }
  const nomCh = val('chauffeur').toLowerCase()
  const ch = nomCh ? personnel.liste.find(p => p.nomComplet.toLowerCase() === nomCh || `${p.nom} ${p.prenom}`.toLowerCase() === nomCh) : undefined
  if (nomCh && !ch) return { valide: false, motif: `Chauffeur inconnu « ${val('chauffeur')} »` }
  const plein = val('plein').toLowerCase()
  const ligneValidee: LigneRechargeImport = {
    vehiculeId: vehicule.id, vehiculePlaque: vehicule.immatriculation, date, litres, prixLitre,
    montant: Math.round(litres * prixLitre), lieu: val('lieu') || 'Non renseignée', odometre: km,
    chauffeurId: ch?.id, chauffeurNom: ch?.nomComplet, pleinComplet: ['oui', 'o', '1', 'vrai', 'yes'].includes(plein),
  }
  return { valide: true, donnees: ligneValidee as unknown as Record<string, unknown> }
}

function importerRecharges(lignes: LigneRechargeImport[]) {
  lignes.forEach(l => {
    store.creer({
      date: l.date, vehiculeId: l.vehiculeId, vehiculePlaque: l.vehiculePlaque, chauffeurId: l.chauffeurId, chauffeurNom: l.chauffeurNom,
      litres: l.litres, prixLitre: l.prixLitre, montant: l.montant, odometre: l.odometre,
      // Le fichier ne porte pas de coordonnées : celles du dépôt principal sont retenues par défaut.
      pleinComplet: l.pleinComplet, lieu: l.lieu, lat: -18.8792, lng: 47.5079, canal: 'import',
      saisiLe: new Date().toISOString(),
    })
  })
}

function ouvrirFiche(id: string) { ficheId.value = id }
function voirConducteur(id: string) { router.push({ name: 'flotte-conducteur-dashboard', params: { id } }) }
</script>
