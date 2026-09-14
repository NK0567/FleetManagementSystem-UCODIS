<template>
  <ListPageLayout
    title="Assurances & sinistres"
    :subtitle="`${store.nbSinistres} sinistre(s) · reste à charge ${store.resteACharge.toLocaleString('fr-FR')} Ar`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="totalText"
    :search-placeholder="vue === 'sinistres' ? 'Référence, plaque, lieu…' : 'Police, compagnie, plaque…'"
    scope-label="Vue :"
    :scope-options="scopeOptions"
    v-model:scope="vue"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(s: any) => { if (vue === 'sinistres') ouvrirFiche(s.id) }"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, 'bg-primary/10']"><ShieldAlert class="w-[18px] h-[18px] text-primary" /></div>
          <div><div :class="L.kpiItemVal">{{ store.nbSinistres }}</div><div :class="L.kpiItemLbl">Sinistres</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, 'bg-info-bg']"><Gauge class="w-[18px] h-[18px] text-info" /></div>
          <div><div :class="L.kpiItemVal">{{ store.tauxAccidents }}</div><div :class="L.kpiItemLbl">Accidents par million de km</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, 'bg-warning-bg']"><Coins class="w-[18px] h-[18px] text-warning" /></div>
          <div><div :class="L.kpiItemVal">{{ store.dommagesTotaux.toLocaleString('fr-FR') }} Ar</div><div :class="L.kpiItemLbl">Dommages</div></div>
        </div>
        <div :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, 'bg-danger-bg']"><TriangleAlert class="w-[18px] h-[18px] text-danger" /></div>
          <div><div :class="L.kpiItemVal">{{ store.resteACharge.toLocaleString('fr-FR') }} Ar</div><div :class="L.kpiItemLbl">Reste à charge</div></div>
        </div>
      </div>
    </template>

    <!-- ══ VUE 1 - SINISTRES ══ -->
    <template #cell-reference="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFiche(item.id)">{{ item.reference }}</button>
      <div class="text-[11px] text-muted-foreground">{{ item.lieu }}</div>
    </template>
    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs">{{ item.vehiculePlaque }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.chauffeurNom ?? '-' }}</div>
    </template>
    <template #cell-gravite="{ item }">
      <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="graviteCls(item.gravite)">{{ graviteLabel(item.gravite) }}</span>
      <div class="text-[11px] text-muted-foreground mt-0.5">{{ item.responsabiliteUcodis ? 'responsabilité UCODIS' : 'tiers responsable' }}</div>
    </template>
    <template #cell-dommages="{ item }"><span class="text-xs">{{ (item.montantDommagesAr ?? 0).toLocaleString('fr-FR') }} Ar</span></template>
    <template #cell-indemnisation="{ item }">
      <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="classeIndemnisation(item.statutIndemnisation)">{{ indemnisationLabel(item.statutIndemnisation) }}</span>
      <div v-if="item.montantIndemniseAr" class="text-[11px] text-success mt-0.5">{{ item.montantIndemniseAr.toLocaleString('fr-FR') }} Ar</div>
    </template>
    <template #cell-reste="{ item }"><span class="text-xs font-semibold" :class="resteACharge(item) > 0 ? 'text-danger' : 'text-success'">{{ resteACharge(item).toLocaleString('fr-FR') }} Ar</span></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span></template>

    <!-- ══ VUE 2 - POLICES D'ASSURANCE ══ -->
    <template #cell-police="{ item }">
      <span class="font-mono font-semibold text-foreground text-xs">{{ item.numeroPolice }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.compagnie }}</div>
    </template>
    <template #cell-vehiculePolice="{ item }"><span class="font-mono text-xs">{{ item.vehiculePlaque }}</span></template>
    <template #cell-couverture="{ item }"><span class="text-xs">{{ item.couverture }}</span></template>
    <template #cell-echeance="{ item }">
      <span class="text-xs">{{ formatDate(item.dateEcheance) }}</span>
      <div class="text-[11px] mt-0.5" :class="classeEcheancePolice(item.dateEcheance)">{{ libelleEcheancePolice(item.dateEcheance) }}</div>
    </template>
    <template #cell-prime="{ item }">
      <span class="text-xs">{{ item.primeAnnuelleAr ? item.primeAnnuelleAr.toLocaleString('fr-FR') + ' Ar' : '-' }}</span>
      <div v-if="item.franchiseAr" class="text-[11px] text-muted-foreground">franchise {{ item.franchiseAr.toLocaleString('fr-FR') }} Ar</div>
    </template>
    <template #cell-statutPolice="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="statutPoliceCls(item.statut)">{{ statutPoliceLabel(item.statut) }}</span></template>

    <template #details-panel="{ item }">
      <div v-if="vue === 'sinistres'" class="flex flex-col gap-3">
        <div>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="graviteCls(item.gravite)">{{ graviteLabel(item.gravite) }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">{{ fmtDateHeure(item.date) }} · {{ item.lieu }}</div>
        </div>
        <p class="text-[12px] text-foreground leading-relaxed">{{ item.circonstances }}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Chauffeur</div>{{ item.chauffeurNom ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Dommages</div>{{ (item.montantDommagesAr ?? 0).toLocaleString('fr-FR') }} Ar</div>
          <div><div class="text-muted-foreground text-[11px]">Reste à charge</div>{{ resteACharge(item).toLocaleString('fr-FR') }} Ar</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
      <div v-else class="flex flex-col gap-2 text-xs">
        <div class="font-mono font-semibold text-foreground">{{ item.numeroPolice }}</div>
        <div class="text-muted-foreground">{{ item.compagnie }}</div>
        <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
        <div><div class="text-muted-foreground text-[11px]">Couverture</div>{{ item.couverture }}</div>
        <div><div class="text-muted-foreground text-[11px]">Échéance</div>{{ formatDate(item.dateEcheance) }}</div>
      </div>
    </template>

    <template #empty>
      <ShieldAlert class="w-8 h-8" />
      <p class="text-sm">{{ vue === 'sinistres' ? 'Aucun sinistre trouvé' : 'Aucune police trouvée' }}</p>
    </template>

    <SinistreCard v-if="ficheId" :sinistres="store.sinistres" :sinistre-id="ficheId" @close="ficheId = null" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Coins, Gauge, ShieldAlert, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SinistreCard from '../../components/flotte/SinistreCard.vue'
import { useAssurancesStore, LIB_GRAVITE_SINISTRE, LIB_INDEMNISATION, classeIndemnisation } from '../../stores/assurances'
import type { Sinistre, StatutPolice } from '../../types'
import { formatDate, etatEcheance } from '../../utils/helpers'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useAssurancesStore()

type Vue = 'sinistres' | 'polices'
const vue = ref<Vue>('sinistres')

const searchQuery = ref('')
const ficheId = ref<string | null>(null)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

function resteACharge(s: Sinistre) { return (s.montantDommagesAr ?? 0) - (s.montantIndemniseAr ?? 0) }
function graviteCls(g: string) { return LIB_GRAVITE_SINISTRE[g as keyof typeof LIB_GRAVITE_SINISTRE]?.cls ?? '' }
function graviteLabel(g: string) { return LIB_GRAVITE_SINISTRE[g as keyof typeof LIB_GRAVITE_SINISTRE]?.label ?? g }
function indemnisationLabel(s: string) { return LIB_INDEMNISATION[s as keyof typeof LIB_INDEMNISATION] ?? s }
function statutPoliceCls(s: string) { return STATUT_POLICE_CLS[s as StatutPolice] ?? '' }
function statutPoliceLabel(s: string) { return STATUT_POLICE_LIB[s as StatutPolice] ?? s }

const STATUT_POLICE_LIB: Record<StatutPolice, string> = { active: 'Active', expiree: 'Expirée', resiliee: 'Résiliée' }
const STATUT_POLICE_CLS: Record<StatutPolice, string> = { active: 'bg-success-bg text-success', expiree: 'bg-danger-bg text-danger', resiliee: 'bg-neutral-bg text-neutral' }
function classeEcheancePolice(date: string) {
  const e = etatEcheance(date, 60)
  return e === 'expire' ? 'text-danger' : e === 'proche' ? 'text-warning' : 'text-success'
}
function libelleEcheancePolice(date: string) {
  const e = etatEcheance(date, 60)
  return e === 'expire' ? 'Échue' : e === 'proche' ? 'À renouveler' : 'Valide'
}

const scopeOptions = [
  { value: 'sinistres', label: 'Sinistres' },
  { value: 'polices', label: "Polices d'assurance" },
]
const totalText = computed(() => vue.value === 'sinistres' ? `${totalCount.value} sinistre(s)` : `${totalCount.value} police(s)`)

const COLONNES: Record<Vue, ListColumn[]> = {
  sinistres: [
    { key: 'reference', label: 'Sinistre', sortable: true, hideable: false, width: 150 },
    { key: 'vehicule', label: 'Véhicule', width: 130 },
    { key: 'gravite', label: 'Gravité', width: 150 },
    { key: 'dommages', label: 'Dommages', width: 110 },
    { key: 'indemnisation', label: 'Indemnisation', width: 150 },
    { key: 'reste', label: 'Reste à charge', width: 120 },
    { key: 'date', label: 'Date', sortable: true, width: 110 },
  ],
  polices: [
    { key: 'police', label: 'Police', sortable: true, hideable: false, width: 170 },
    { key: 'vehiculePolice', label: 'Véhicule', width: 110 },
    { key: 'couverture', label: 'Couverture', width: 170 },
    { key: 'echeance', label: 'Échéance', sortable: true, width: 130 },
    { key: 'prime', label: 'Prime', width: 140 },
    { key: 'statutPolice', label: 'Statut', width: 100 },
  ],
}
const columns = computed(() => COLONNES[vue.value])

watch([vue, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { searchQuery.value = ''; page.value = 1 }

const donnees = computed<any[]>(() => {
  const q = searchQuery.value.toLowerCase()
  if (vue.value === 'sinistres') {
    let rows = store.sinistres.filter(s => !q || `${s.reference} ${s.vehiculePlaque} ${s.lieu}`.toLowerCase().includes(q))
    return sortKey.value ? tri(rows) : [...rows].sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }
  let rows = store.polices.filter(p => !q || `${p.numeroPolice} ${p.compagnie} ${p.vehiculePlaque}`.toLowerCase().includes(q))
  return sortKey.value ? tri(rows) : rows
})
function tri(rows: any[]) {
  return [...rows].sort((a, b) => {
    const cmp = String(a[sortKey.value] ?? '').localeCompare(String(b[sortKey.value] ?? ''))
    return sortDir.value === 'asc' ? cmp : -cmp
  })
}

const totalCount = computed(() => donnees.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return donnees.value.slice(s, s + pageSize.value) })

function ouvrirFiche(id: string) { ficheId.value = id }
</script>
