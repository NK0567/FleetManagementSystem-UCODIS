<template>
  <ListPageLayout
    title="Événements télématiques"
    :subtitle="`${store.defautsOuverts.length} défaut(s) moteur à traiter · ${store.signauxPerdus.length} signal(aux) perdu(s)`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} événement(s)`"
    search-placeholder="Plaque, conducteur, lieu, code…" scope-label="Famille :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(e: any) => ficheId = e.id"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem" class="cursor-pointer" @click="scope = k.scope">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>
    <template #filters>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Véhicule</label>
        <SearchableDropdown v-model="filtreVehicule" :items="optVehicules" placeholder="Tous" compact />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Du</label>
        <input v-model="du" type="date" :class="F.fieldInput" class="!h-[30px] !text-xs" />
      </div>
      <div :class="L.fpField">
        <label :class="L.fpFieldLabel">Au</label>
        <input v-model="au" type="date" :class="F.fieldInput" class="!h-[30px] !text-xs" />
      </div>
      <p v-if="du && au && du > au" class="text-[11px] text-danger">La date de début suit la date de fin.</p>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer text-left hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>
    <template #cell-type="{ item }">
      <button class="font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left text-xs" @click.stop="ficheId = item.id">
        {{ store.libelleType(item.code) }}<span v-if="item.codeObd" class="font-mono"> {{ item.codeObd }}</span>
      </button>
      <div class="text-[11px] text-muted-foreground">{{ LIB_FAMILLE_EVENEMENT[item.famille as FamilleEvenement] }}</div>
    </template>
    <template #cell-vehicule="{ item }"><span class="font-mono text-xs">{{ item.plaque }}</span><div class="text-[11px] text-muted-foreground">{{ item.conducteurNom ?? 'conducteur non identifié' }}</div></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span><div class="text-[11px] text-muted-foreground truncate">{{ item.lieu }}</div></template>
    <template #cell-mesure="{ item }"><span class="text-xs">{{ mesure(item) }}</span></template>
    <template #cell-gravite="{ item }">
      <span v-if="store.typeDe(item.code)" class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE[store.typeDe(item.code)!.gravite].cls">{{ LIB_GRAVITE[store.typeDe(item.code)!.gravite].label }}</span>
    </template>
    <template #cell-suite="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="suite(item).cls">{{ suite(item).label }}</span></template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="suite(item).cls">{{ suite(item).label }}</span>
          <div class="font-semibold text-foreground mt-1.5">{{ store.libelleType(item.code) }}<span v-if="item.codeObd" class="font-mono"> {{ item.codeObd }}</span></div>
          <div class="text-xs text-muted-foreground">{{ item.id }} · {{ fmtDateHeure(item.date) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.plaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Conducteur</div>{{ item.conducteurNom ?? '-' }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Lieu</div>{{ item.lieu ?? '-' }}</div>
          <div v-if="mesure(item) !== '-'"><div class="text-muted-foreground text-[11px]">Mesure</div>{{ mesure(item) }}</div>
          <div v-if="item.detail" class="col-span-2"><div class="text-muted-foreground text-[11px]">Détail</div>{{ item.detail }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><Radio class="w-8 h-8" /><p class="text-sm">Aucun événement sur la période</p></template>
  </ListPageLayout>
  <EvenementCard v-if="ficheId" :key="ficheId" :ids="filtered.some(e => e.id === ficheId) ? filtered.map(e => e.id) : [ficheId]" :evenement-id="ficheId" @close="ficheId = null" />
</template>

<script setup lang="ts">
/** Journal des événements remontés par les équipements embarqués (FMS-GP-01, GP-03, GP-04). */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Camera, Radio, Gauge, Wrench, WifiOff } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import EvenementCard from '../../components/flotte/EvenementCard.vue'
import { useTelematiqueStore, LIB_FAMILLE_EVENEMENT, type FamilleEvenement, type EvenementTelematique } from '../../stores/telematique'
import { useVehiculeStore } from '../../stores/vehicules'
import { LIB_GRAVITE } from '../../stores/ecarts'
import { fmtDateHeure } from '../../utils/voyageUtils'
import { dansNJours } from '../../utils/horloge'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useTelematiqueStore()
const vehicules = useVehiculeStore()
const route = useRoute()
const scope = ref(typeof route.query.famille === 'string' ? route.query.famille : '')
const scopeOptions = [{ value: '', label: 'Tous' }, ...Object.entries(LIB_FAMILLE_EVENEMENT).map(([value, label]) => ({ value, label }))]
const searchQuery = ref(''); const page = ref(1); const pageSize = ref(15)
const filtreVehicule = ref(typeof route.query.vehicule === 'string' ? route.query.vehicule : '')
const du = ref(''); const au = ref('')
const ficheId = ref<string | null>(typeof route.query.evenement === 'string' ? route.query.evenement : null)
watch(() => route.query.evenement, v => { if (typeof v === 'string') ficheId.value = v })
watch([scope, searchQuery, pageSize, filtreVehicule, du, au], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; filtreVehicule.value = ''; du.value = ''; au.value = ''; page.value = 1 }
const optVehicules = computed<DropdownItem[]>(() => vehicules.tracteurs.map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))

const filtered = computed(() => store.actifs.filter(e => {
  if (scope.value && e.famille !== scope.value) return false
  if (filtreVehicule.value && e.vehiculeId !== filtreVehicule.value) return false
  if (du.value && e.date.slice(0, 10) < du.value) return false
  if (au.value && e.date.slice(0, 10) > au.value) return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${e.plaque} ${e.conducteurNom ?? ''} ${e.lieu ?? ''} ${e.codeObd ?? ''} ${store.libelleType(e.code)} ${e.id}`.toLowerCase().includes(q)
}).sort((a, b) => b.date.localeCompare(a.date)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

function mesure(e: EvenementTelematique) { return e.valeur != null ? `${e.valeur} ${e.unite ?? ''}`.trim() : '-' }
function suite(e: EvenementTelematique): { label: string; cls: string } {
  if (e.ordreTravailRef) return { label: `OT ${e.ordreTravailRef}`, cls: 'bg-info-bg text-info' }
  if (e.infractionId) return { label: 'Infraction ouverte', cls: 'bg-info-bg text-info' }
  if (e.acquitte) return { label: 'Classé sans suite', cls: 'bg-neutral-bg text-neutral' }
  if (e.famille === 'defaut') return { label: 'À traiter', cls: 'bg-warning-bg text-warning' }
  if (e.famille === 'signal') return e.finLe ? { label: 'Rétabli', cls: 'bg-success-bg text-success' } : { label: 'En cours', cls: 'bg-danger-bg text-danger' }
  if (e.famille === 'comportement' || e.famille === 'camera') return store.typeDe(e.code)?.score ? { label: 'Compté au score', cls: 'bg-warning-bg text-warning' } : { label: 'Enregistré', cls: 'bg-neutral-bg text-neutral' }
  return { label: 'Enregistré', cls: 'bg-neutral-bg text-neutral' }
}
const depuis30j = dansNJours(-30)
const kpis = computed(() => [
  { label: 'Comportements à risque (30 j)', value: store.actifs.filter(e => e.famille === 'comportement' && e.date >= depuis30j).length, scope: 'comportement', icon: Gauge, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Signaux caméra (30 j)', value: store.actifs.filter(e => e.famille === 'camera' && e.date >= depuis30j).length, scope: 'camera', icon: Camera, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Défauts moteur à traiter', value: store.defautsOuverts.length, scope: 'defaut', icon: Wrench, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'Signal perdu en cours', value: store.signauxPerdus.length, scope: 'signal', icon: WifiOff, bg: 'bg-neutral-bg', iconColor: 'text-neutral' },
])
const columns = computed<ListColumn[]>(() => [
  { key: 'type', label: 'Événement', hideable: false, width: 220 },
  { key: 'vehicule', label: 'Véhicule', width: 180 },
  { key: 'date', label: 'Date et lieu', width: 200 },
  { key: 'mesure', label: 'Mesure', width: 110 },
  { key: 'gravite', label: 'Gravité', width: 100 },
  { key: 'suite', label: 'Suite', width: 150 },
])
</script>
