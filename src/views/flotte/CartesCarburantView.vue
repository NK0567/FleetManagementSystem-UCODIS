<template>
  <ListPageLayout
    title="Cartes carburant"
    :subtitle="`${store.cartes.filter(c => c.statut === 'active').length} carte(s) active(s) · ${store.nonRapprochees.length} transaction(s) non rapprochée(s) · ${store.enDepassement.length} en dépassement`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="vue === 'cartes' ? `${totalCount} carte(s)` : `${totalCount} transaction(s)`"
    :search-placeholder="vue === 'cartes' ? 'Numéro, véhicule, chauffeur…' : 'Station, ville, carte…'"
    scope-label="Vue :"
    :scope-options="scopeOptions"
    v-model:scope="vue"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(x: any) => vue === 'cartes' ? (ficheCarteId = x.id) : (ficheTxId = x.id)"
  >
    <template #header-actions>
      <button :class="L.btnOutline" @click="importOuvert = true"><Upload class="w-4 h-4" /> Importer des transactions</button>
      <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Nouvelle carte</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem" class="cursor-pointer" @click="k.action()">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #filters>
      <div v-if="vue === 'transactions'" :class="L.fpField">
        <label :class="L.fpFieldLabel">Rapprochement</label>
        <SearchableDropdown v-model="filtreTx" :items="optFiltreTx" placeholder="Toutes" compact />
      </div>
      <div v-else :class="L.fpField">
        <label :class="L.fpFieldLabel">Statut</label>
        <SearchableDropdown v-model="filtreStatut" :items="optStatut" placeholder="Tous" compact />
      </div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <!-- Cartes -->
    <template #cell-numero="{ item }"><button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click.stop="ficheCarteId = item.id">{{ item.numero }}</button><div class="text-[11px] text-muted-foreground">{{ store.fournisseur(item) }}</div></template>
    <template #cell-titulaire="{ item }"><span class="text-xs" :class="item.rattachement === 'vehicule' && 'font-mono'">{{ store.titulaire(item) }}</span><div class="text-[11px] text-muted-foreground">{{ LIB_RATTACHEMENT[item.rattachement as RattachementCarte] }}</div></template>
    <template #cell-plafond="{ item }"><span class="text-xs">{{ item.limites.montantMensuelAr ? fmtAr(item.limites.montantMensuelAr) : '-' }}</span><div class="text-[11px] text-muted-foreground">{{ item.limites.volumeMensuelL ? item.limites.volumeMensuelL.toLocaleString('fr-FR') + ' L / mois' : '' }}</div></template>
    <template #cell-utilisation="{ item }">
      <template v-if="store.utilisation(item).tauxPct != null">
        <div class="flex items-center gap-2"><div class="w-20 h-1.5 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="store.utilisation(item).tauxPct! > 100 ? 'bg-danger' : store.utilisation(item).tauxPct! > 80 ? 'bg-warning' : 'bg-primary'" :style="{ width: Math.min(100, store.utilisation(item).tauxPct!) + '%' }"></div></div><span class="text-[11px]">{{ store.utilisation(item).tauxPct }} %</span></div>
      </template>
      <span v-else class="text-muted-foreground">-</span>
    </template>
    <template #cell-statutCarte="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeCarte(item)">{{ libCarte(item) }}</span></template>

    <!-- Transactions -->
    <template #cell-dateTx="{ item }"><button class="font-medium text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click.stop="ficheTxId = item.id">{{ fmtDateHeure(item.date) }}</button><div class="text-[11px] text-muted-foreground font-mono">{{ store.getById(item.carteId)?.numero }}</div></template>
    <template #cell-station="{ item }"><span class="text-xs">{{ item.station }}</span><div class="text-[11px] text-muted-foreground">{{ item.ville }}</div></template>
    <template #cell-volume="{ item }"><span class="text-xs">{{ item.litres }} L</span><div class="text-[11px] text-muted-foreground">{{ fmtAr(item.montantAr) }}</div></template>
    <template #cell-rapprochement="{ item }">
      <span v-if="item.rechargeId" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">{{ item.rechargeId }}</span>
      <span v-else class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">Non rapprochée</span>
    </template>
    <template #cell-limites="{ item }">
      <span v-if="!store.depassements(item).length" class="text-[11px] text-success">Dans les limites</span>
      <span v-else class="text-[11px] text-danger font-medium">{{ store.depassements(item).join(' · ') }}</span>
    </template>

    <template #details-panel="{ item }">
      <div v-if="vue === 'cartes'" class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="classeCarte(item)">{{ libCarte(item) }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.numero }}</div>
          <div class="text-xs text-muted-foreground">{{ store.fournisseur(item) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">{{ LIB_RATTACHEMENT[item.rattachement as RattachementCarte] }}</div>{{ store.titulaire(item) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Expiration</div>{{ new Date(item.dateExpiration).toLocaleDateString('fr-FR') }}</div>
          <div><div class="text-muted-foreground text-[11px]">Utilisation</div>{{ store.utilisation(item).tauxPct != null ? store.utilisation(item).tauxPct + ' %' : '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Transactions</div>{{ store.transactionsDe(item.id).length }}</div>
        </div>
        <div v-if="item.statut === 'bloquee'" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">Bloquée : {{ item.motifBlocage }}</div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheCarteId = item.id">Ouvrir la fiche</button>
      </div>
      <div v-else class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.rechargeId ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'">{{ item.rechargeId ? 'Rapprochée' : 'Non rapprochée' }}</span>
          <div class="font-semibold text-foreground mt-1.5">{{ item.station }}</div>
          <div class="text-xs text-muted-foreground">{{ fmtDateHeure(item.date) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Volume</div>{{ item.litres }} L</div>
          <div><div class="text-muted-foreground text-[11px]">Montant</div>{{ fmtAr(item.montantAr) }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Titulaire</div>{{ store.getById(item.carteId) ? store.titulaire(store.getById(item.carteId)!) : '-' }}</div>
        </div>
        <div v-if="store.depassements(item).length" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">{{ store.depassements(item).join(' · ') }}</div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheTxId = item.id">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty><CreditCard class="w-8 h-8" /><p class="text-sm">{{ vue === 'cartes' ? 'Aucune carte' : 'Aucune transaction' }}</p></template>
  </ListPageLayout>

  <CarteCarburantCard v-if="ficheCarteId" :key="ficheCarteId" :cartes="store.cartes" :carte-id="ficheCarteId" @close="ficheCarteId = null" @ouvrir-transaction="id => { ficheCarteId = null; ficheTxId = id }" />
  <TransactionCarteCard v-if="ficheTxId" :key="ficheTxId" :transactions="transactionsTriees" :transaction-id="ficheTxId" @close="ficheTxId = null"
    @ouvrir-plein="id => { ficheTxId = null; fichePleinId = id }" @creer-plein="id => { ficheTxId = null; pleinDepuisTx = id }" @ouvrir-carte="id => { ficheTxId = null; ficheCarteId = id }" />
  <RechargeCard v-if="fichePleinId" :recharges="carburant.recharges" :recharge-id="fichePleinId" @close="fichePleinId = null" />
  <RechargeFormModal v-if="pleinDepuisTx" :transaction-id="pleinDepuisTx" @close="pleinDepuisTx = null" @cree="id => { pleinDepuisTx = null; fichePleinId = id }" />
  <CarteCarburantFormModal v-if="creationOuverte" @close="creationOuverte = false" @cree="id => { creationOuverte = false; vue = 'cartes'; ficheCarteId = id }" />

  <ImportCsvModal
    v-if="importOuvert"
    titre="Importer les transactions du prestataire"
    :champs="CHAMPS"
    :apercu-colonnes="APERCU"
    :modele="MODELE"
    description-controles="Contrôles appliqués : carte reconnue par son numéro, date valide et passée, volume et montant positifs, transaction pas déjà importée. Les transactions importées se rapprochent automatiquement des pleins enregistrés."
    :valider="validerLigne"
    @close="importOuvert = false"
    @importer="lignes => importer(lignes as unknown as LigneTx[])"
  />
</template>

<script setup lang="ts">
/** Cartes carburant et transactions importées du prestataire (FMS-CA-02). */
import { ref, computed, watch } from 'vue'
import { CreditCard, Link2Off, Plus, ShieldOff, TriangleAlert, Upload, CircleCheck } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import ImportCsvModal from '../../components/ui/ImportCsvModal.vue'
import type { ChampImport, LigneValidee } from '../../components/ui/ImportCsvModal.vue'
import CarteCarburantCard from '../../components/flotte/CarteCarburantCard.vue'
import TransactionCarteCard from '../../components/flotte/TransactionCarteCard.vue'
import CarteCarburantFormModal from '../../components/flotte/CarteCarburantFormModal.vue'
import RechargeCard from '../../components/flotte/RechargeCard.vue'
import RechargeFormModal from '../../components/flotte/RechargeFormModal.vue'
import { useCartesCarburantStore, LIB_RATTACHEMENT, type CarteCarburant, type RattachementCarte } from '../../stores/cartesCarburant'
import { useCarburantStore } from '../../stores/carburant'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useCartesCarburantStore()
const carburant = useCarburantStore()

type Vue = 'cartes' | 'transactions'
const vue = ref<Vue>('cartes')
const scopeOptions = [{ value: 'cartes', label: 'Cartes' }, { value: 'transactions', label: 'Transactions' }]
const searchQuery = ref('')
const filtreTx = ref('')
const filtreStatut = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)
const ficheCarteId = ref<string | null>(null)
const ficheTxId = ref<string | null>(null)
const fichePleinId = ref<string | null>(null)
const pleinDepuisTx = ref<string | null>(null)
const creationOuverte = ref(false)
const importOuvert = ref(false)

watch([vue, searchQuery, filtreTx, filtreStatut, pageSize], () => { page.value = 1 })
watch(vue, () => { sortKey.value = '' })
function resetFilters() { searchQuery.value = ''; filtreTx.value = ''; filtreStatut.value = ''; page.value = 1 }
const fmtAr = (n: number) => `${n.toLocaleString('fr-FR')} Ar`

const expiree = (c: CarteCarburant) => c.dateExpiration < new Date().toISOString().slice(0, 10)
const libCarte = (c: CarteCarburant) => expiree(c) ? 'Expirée' : c.statut === 'active' ? 'Active' : 'Bloquée'
const classeCarte = (c: CarteCarburant) => c.statut === 'active' && !expiree(c) ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
const optFiltreTx: DropdownItem[] = [{ id: 'non', label: 'Non rapprochées' }, { id: 'oui', label: 'Rapprochées' }, { id: 'depassement', label: 'En dépassement' }]
const optStatut: DropdownItem[] = [{ id: 'active', label: 'Actives' }, { id: 'bloquee', label: 'Bloquées' }]

const kpis = computed(() => [
  { label: 'Cartes actives', value: String(store.cartes.filter(c => c.statut === 'active' && !expiree(c)).length), icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success', action: () => { vue.value = 'cartes'; filtreStatut.value = 'active' } },
  { label: 'Cartes bloquées', value: String(store.cartes.filter(c => c.statut === 'bloquee').length), icon: ShieldOff, bg: 'bg-neutral-bg', iconColor: 'text-neutral', action: () => { vue.value = 'cartes'; filtreStatut.value = 'bloquee' } },
  { label: 'Non rapprochées', value: String(store.nonRapprochees.length), icon: Link2Off, bg: 'bg-warning-bg', iconColor: 'text-warning', action: () => { vue.value = 'transactions'; filtreTx.value = 'non' } },
  { label: 'En dépassement', value: String(store.enDepassement.length), icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger', action: () => { vue.value = 'transactions'; filtreTx.value = 'depassement' } },
])

const COLONNES: Record<Vue, ListColumn[]> = {
  cartes: [
    { key: 'numero', label: 'Carte', sortable: true, hideable: false, width: 200 },
    { key: 'titulaire', label: 'Titulaire', width: 170 },
    { key: 'plafond', label: 'Plafond mensuel', width: 150 },
    { key: 'utilisation', label: 'Utilisation', width: 150 },
    { key: 'statutCarte', label: 'Statut', width: 110 },
  ],
  transactions: [
    { key: 'dateTx', label: 'Date', sortable: true, hideable: false, width: 190 },
    { key: 'station', label: 'Station', width: 170 },
    { key: 'volume', label: 'Volume', width: 130 },
    { key: 'rapprochement', label: 'Plein', width: 140 },
    { key: 'limites', label: 'Limites', width: 230 },
  ],
}
const columns = computed(() => COLONNES[vue.value])

const transactionsTriees = computed(() => [...store.transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date)))
const donnees = computed<any[]>(() => {
  const q = searchQuery.value.toLowerCase()
  if (vue.value === 'cartes') {
    const rows = store.cartes.filter(c => {
      if (filtreStatut.value === 'active' && (c.statut !== 'active' || expiree(c))) return false
      if (filtreStatut.value === 'bloquee' && c.statut !== 'bloquee') return false
      return !q || `${c.numero} ${store.titulaire(c)} ${store.fournisseur(c)}`.toLowerCase().includes(q)
    })
    return sortKey.value === 'numero' ? [...rows].sort((a, b) => (sortDir.value === 'asc' ? 1 : -1) * a.numero.localeCompare(b.numero)) : rows
  }
  const rows = transactionsTriees.value.filter(t => {
    if (filtreTx.value === 'non' && t.rechargeId) return false
    if (filtreTx.value === 'oui' && !t.rechargeId) return false
    if (filtreTx.value === 'depassement' && !store.depassements(t).length) return false
    return !q || `${t.station} ${t.ville} ${store.getById(t.carteId)?.numero ?? ''}`.toLowerCase().includes(q)
  })
  return sortKey.value === 'dateTx' && sortDir.value === 'asc' ? [...rows].reverse() : rows
})
const totalCount = computed(() => donnees.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return donnees.value.slice(s, s + pageSize.value) })

/* ── Import des transactions ─────────────────────────────── */
const CHAMPS: ChampImport[] = [
  { cle: 'carte', libelle: 'Numéro de carte', requis: true },
  { cle: 'date', libelle: 'Date (AAAA-MM-JJ HH:MM)', requis: true },
  { cle: 'station', libelle: 'Station', requis: true },
  { cle: 'ville', libelle: 'Ville', requis: true },
  { cle: 'litres', libelle: 'Litres', requis: true },
  { cle: 'montant', libelle: 'Montant (Ar)', requis: true },
]
const APERCU = [{ cle: 'numero', libelle: 'Carte' }, { cle: 'date', libelle: 'Date' }, { cle: 'station', libelle: 'Station' }, { cle: 'litres', libelle: 'Litres' }, { cle: 'montantAr', libelle: 'Montant' }]
const MODELE = CHAMPS.map(c => c.libelle)
interface LigneTx { carteId: string; numero: string; date: string; station: string; ville: string; litres: number; montantAr: number }
function normaliserDateHeure(d: string) {
  const fr = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (fr) return `${fr[3]}-${fr[2]!.padStart(2, '0')}-${fr[1]!.padStart(2, '0')}T${(fr[4] ?? '00').padStart(2, '0')}:${fr[5] ?? '00'}`
  const iso = d.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/)
  return iso ? `${iso[1]}T${(iso[2] ?? '00').padStart(2, '0')}:${iso[3] ?? '00'}` : ''
}
const nombre = (v: string) => Number(v.replace(/\s/g, '').replace(',', '.'))
function validerLigne(ligne: Record<string, string>, mapping: Record<string, string>): LigneValidee {
  const val = (cle: string) => (mapping[cle] ? (ligne[mapping[cle]!] ?? '').trim() : '')
  const carte = store.carteParNumero(val('carte'))
  if (!carte) return { valide: false, motif: `Carte inconnue « ${val('carte')} »` }
  const date = normaliserDateHeure(val('date'))
  if (!date || isNaN(new Date(date).getTime())) return { valide: false, motif: `Date invalide « ${val('date')} »` }
  if (new Date(date).getTime() > Date.now()) return { valide: false, motif: 'Date dans le futur' }
  if (!val('station') || !val('ville')) return { valide: false, motif: 'Station ou ville manquante' }
  const litres = nombre(val('litres')); const montant = nombre(val('montant'))
  if (!(litres > 0)) return { valide: false, motif: 'Litres invalides' }
  if (!(montant > 0)) return { valide: false, motif: 'Montant invalide' }
  if (store.estDoublon(carte.id, date, litres)) return { valide: false, motif: 'Transaction déjà importée' }
  const l: LigneTx = { carteId: carte.id, numero: carte.numero, date, station: val('station'), ville: val('ville'), litres, montantAr: montant }
  return { valide: true, donnees: l as unknown as Record<string, unknown> }
}
function importer(lignes: LigneTx[]) {
  store.importer(lignes.map(({ numero: _n, ...l }) => l))
  vue.value = 'transactions'
}
</script>
