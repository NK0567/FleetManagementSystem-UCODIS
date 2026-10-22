<template>
  <ListPageLayout
    title="Supervision de la flotte"
    :subtitle="`${compte.mission} en mission · ${compte.arret} à l'arrêt · ${compte.alerte} en alerte · ${compte.hors_zone} hors zone`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} véhicule(s)`"
    search-placeholder="Plaque, conducteur, voyage…" scope-label="Situation :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(l: any) => ficheId = l.id"
  >
    <template #header-actions>
      <button :class="[L.btnPrimary, vehicules.simulationActive && '!bg-danger']" @click="vehicules.simulationActive ? vehicules.arreterSimulation() : vehicules.demarrerSimulation()">
        <component :is="vehicules.simulationActive ? PauseCircle : PlayCircle" class="w-4 h-4" />
        {{ vehicules.simulationActive ? 'Arrêter la simulation' : 'Lancer la simulation' }}
      </button>
    </template>
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.scope" :class="[L.kpiItem, scope === k.scope && 'ring-1 ring-primary']" class="cursor-pointer" @click="scope = scope === k.scope ? '' : k.scope">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>
    <template #cell-vehicule="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ficheId = item.id">{{ item.plaque }}</button>
      <div class="text-[11px] text-muted-foreground">{{ item.modele }}</div>
    </template>
    <template #cell-conducteur="{ item }"><span class="text-xs">{{ item.conducteur ?? '-' }}</span></template>
    <template #cell-situation="{ item }">
      <div class="flex flex-wrap gap-1">
        <span v-for="b in item.badges" :key="b.label" class="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="b.cls">{{ b.label }}</span>
      </div>
    </template>
    <template #cell-vitesse="{ item }"><span class="text-xs">{{ item.sansBoitier || item.signalPerdu ? '-' : `${item.vitesse} km/h` }}</span></template>
    <template #cell-position="{ item }"><span class="text-xs">{{ item.lieu }}</span></template>
    <template #cell-voyage="{ item }"><span class="font-mono text-xs">{{ item.voyageRef ?? '-' }}</span><div v-if="item.trajet" class="text-[11px] text-muted-foreground truncate">{{ item.trajet }}</div></template>
    <template #cell-alertes="{ item }">
      <span v-if="item.alertes.length" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ item.alertes.length }}</span>
      <span v-else class="text-xs text-muted-foreground">-</span>
    </template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <div class="flex flex-wrap gap-1"><span v-for="b in item.badges" :key="b.label" class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="b.cls">{{ b.label }}</span></div>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.plaque }}</div>
          <div class="text-xs text-muted-foreground">{{ item.modele }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Conducteur</div>{{ item.conducteur ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Vitesse</div>{{ item.sansBoitier || item.signalPerdu ? '-' : `${item.vitesse} km/h` }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Position</div>{{ item.lieu }}</div>
          <div v-if="item.voyageRef" class="col-span-2"><div class="text-muted-foreground text-[11px]">Voyage</div><span class="font-mono">{{ item.voyageRef }}</span> · {{ item.trajet }}</div>
        </div>
        <div v-if="item.alertes.length" class="flex flex-col gap-1">
          <div class="text-muted-foreground text-[11px]">Alertes en cours</div>
          <button v-for="a in item.alertes" :key="a.cle" class="text-left text-xs bg-danger-bg text-danger rounded-md px-2 py-1.5 border-0 cursor-pointer hover:opacity-80" @click="router.push({ name: 'flotte-alertes', query: { alerte: a.cle } })">{{ a.titre }}</button>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
        <button :class="L.btnOutline" class="w-full justify-center" @click="router.push({ name: 'flotte-carte', query: { vehicule: item.id } })">Voir sur la carte</button>
        <button :class="L.btnOutline" class="w-full justify-center" @click="router.push({ name: 'flotte-evenements', query: { vehicule: item.id } })">Événements du véhicule</button>
      </div>
    </template>
    <template #empty><MonitorDot class="w-8 h-8" /><p class="text-sm">Aucun véhicule dans cette situation</p></template>
  </ListPageLayout>
  <VehiculeCard v-if="ficheId" :vehicules="vehicules.tracteurs" :vehicule-id="ficheId" @close="ficheId = null" />
</template>

<script setup lang="ts">
/** Tableau de bord de la flotte en temps réel, pour la salle de contrôle (FMS-GP-05). */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BellRing, CircleSlash, MapPinOff, MonitorDot, PauseCircle, PlayCircle, Route as RouteIcon, WifiOff } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import VehiculeCard from '../../components/cards/VehiculeCard.vue'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useTelematiqueStore } from '../../stores/telematique'
import { useAlertesStore } from '../../stores/alertes'
import * as L from '../../lib/listClasses'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const telematique = useTelematiqueStore()
const alertes = useAlertesStore()
const router = useRouter()

const route = useRoute()
const scope = ref(typeof route.query.situation === 'string' ? route.query.situation : '')
watch(() => route.query.situation, v => { if (typeof v === 'string') scope.value = v })
const scopeOptions = [{ value: '', label: 'Tous' }, { value: 'mission', label: 'En mission' }, { value: 'arret', label: "À l'arrêt" }, { value: 'alerte', label: 'En alerte' }, { value: 'hors_zone', label: 'Hors zone' }, { value: 'signal', label: 'Signal perdu' }]
const searchQuery = ref(''); const page = ref(1); const pageSize = ref(15)
const ficheId = ref<string | null>(null)
watch([scope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; page.value = 1 }

const lignes = computed(() => vehicules.tracteurs.filter(t => t.statut !== 'vendu').map(t => {
  const pos = vehicules.positions[t.id]
  const statut = vehicules.statutsOp[t.id]
  const sansBoitier = !vehicules.aBoitier(t.id) || !pos
  const signalPerdu = !sansBoitier && statut === 'signal_perdu'
  const voyage = telematique.voyageEnCoursDe(t.id)
  const af = vehicules.affectationActive(t.id)
  const conducteur = voyage?.chauffeurNom ?? (af ? personnel.parId(af.conducteurId)?.nomComplet : undefined)
  const enAlerte = alertes.enCoursDuVehicule(t.id)
  const mission = !!voyage
  const arret = !sansBoitier && !signalPerdu && (statut !== 'en_mouvement' || pos.vitesse === 0)
  const horsZone = !sansBoitier && !signalPerdu && telematique.horsZone(t.id)
  const badges: { label: string; cls: string }[] = []
  if (sansBoitier) badges.push({ label: 'Sans boîtier', cls: 'bg-neutral-bg text-neutral' })
  if (signalPerdu) badges.push({ label: 'Signal perdu', cls: 'bg-danger-bg text-danger' })
  if (mission) badges.push({ label: 'En mission', cls: 'bg-success-bg text-success' })
  if (!sansBoitier && !signalPerdu) badges.push(arret ? { label: "À l'arrêt", cls: 'bg-neutral-bg text-neutral' } : { label: 'En mouvement', cls: 'bg-info-bg text-info' })
  if (horsZone) badges.push({ label: 'Hors zone', cls: 'bg-warning-bg text-warning' })
  if (enAlerte.length) badges.push({ label: 'En alerte', cls: 'bg-danger-bg text-danger' })
  return {
    id: t.id, plaque: t.immatriculation, modele: `${t.marque} ${t.modele}`, conducteur, badges, sansBoitier, signalPerdu, mission, arret, horsZone,
    vitesse: pos?.vitesse ?? 0, lieu: sansBoitier ? 'Aucune remontée' : `${signalPerdu ? 'Dernière position : ' : ''}${telematique.lieuDe(pos!)}`,
    voyageRef: voyage?.reference, trajet: voyage?.trajetLibelle, alertes: enAlerte,
  }
}))
type Ligne = (typeof lignes.value)[number]
const dans = (l: Ligne, s: string) => s === 'mission' ? l.mission : s === 'arret' ? l.arret : s === 'alerte' ? l.alertes.length > 0 : s === 'hors_zone' ? l.horsZone : s === 'signal' ? l.signalPerdu : true
const compte = computed(() => Object.fromEntries(['mission', 'arret', 'alerte', 'hors_zone', 'signal'].map(s => [s, lignes.value.filter(l => dans(l, s)).length])) as Record<string, number>)
const filtered = computed(() => lignes.value.filter(l => {
  if (scope.value && !dans(l, scope.value)) return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${l.plaque} ${l.conducteur ?? ''} ${l.voyageRef ?? ''} ${l.modele}`.toLowerCase().includes(q)
}))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const kpis = computed(() => [
  { label: 'En mission', value: compte.value.mission, scope: 'mission', icon: RouteIcon, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: "À l'arrêt", value: compte.value.arret, scope: 'arret', icon: CircleSlash, bg: 'bg-neutral-bg', iconColor: 'text-neutral' },
  { label: 'En alerte', value: compte.value.alerte, scope: 'alerte', icon: BellRing, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Hors zone', value: compte.value.hors_zone, scope: 'hors_zone', icon: MapPinOff, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Signal perdu', value: compte.value.signal, scope: 'signal', icon: WifiOff, bg: 'bg-info-bg', iconColor: 'text-info' },
])
const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule', label: 'Véhicule', hideable: false, width: 140 },
  { key: 'conducteur', label: 'Conducteur', width: 170 },
  { key: 'situation', label: 'Situation', width: 230 },
  { key: 'vitesse', label: 'Vitesse', width: 90 },
  { key: 'position', label: 'Position', width: 220 },
  { key: 'voyage', label: 'Voyage', width: 200 },
  { key: 'alertes', label: 'Alertes', width: 80 },
])
</script>
