<template>
  <ListPageLayout
    title="Contrôles du véhicule"
    :subtitle="`Avant le chargement, au retour de voyage et à la réception d'un camion neuf · ${anomaliesOuvertes} contrôle(s) avec anomalie bloquante`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} contrôle(s)`"
    search-placeholder="Plaque, contrôleur…"
    scope-label="Moment :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(c: any) => ouvrirFiche(c.id)"
  >
    <template #header-actions>
      <button :class="L.btnOutline" @click="reglageOuvert = !reglageOuvert"><Settings2 class="w-4 h-4" /> Points de contrôle</button>
      <button :class="L.btnPrimary" @click="saisieOuverte = true"><Plus class="w-4 h-4" /> Nouveau contrôle</button>
    </template>

    <template #above-table>
      <ReglagePointsControle v-if="reglageOuvert" class="mb-3.5" />
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-4.5 h-4.5" :class="k.iconColor" /></div>
          <div class="min-w-0">
            <p class="text-xl font-bold leading-none truncate">{{ k.value }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ k.label }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #cell-vehicule="{ item }"><button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFiche(item.id)">{{ item.vehiculePlaque }}</button></template>
    <template #cell-moment="{ item }"><span class="text-xs">{{ LIB_MOMENT_CONTROLE[item.moment] }}</span></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span><div class="text-[11px] text-muted-foreground">{{ item.controlePar }}</div></template>
    <template #cell-resultat="{ item }">
      <span v-if="!nbAnomalies(item)" class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
      <span v-else-if="store.anomaliesBloquantes(item).length" class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ nbAnomalies(item) }} anomalie(s), bloquant</span>
      <span v-else class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warning-bg text-warning">{{ nbAnomalies(item) }} anomalie(s)</span>
    </template>
    <template #cell-ot="{ item }">
      <span v-if="item.ordreTravailId" class="font-mono text-[11px] text-primary">{{ item.ordreTravailId }}</span>
      <span v-else class="text-muted-foreground">-</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ LIB_MOMENT_CONTROLE[item.moment] }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ fmtDateHeure(item.date) }} · {{ item.controlePar }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Points contrôlés</div>{{ Object.keys(item.resultats).length }}</div>
          <div><div class="text-muted-foreground text-[11px]">Anomalies</div><span :class="nbAnomalies(item) ? 'text-danger font-semibold' : 'text-success'">{{ nbAnomalies(item) }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Kilométrage</div>{{ item.kilometrage != null ? item.kilometrage.toLocaleString('fr-FR') + ' km' : '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Ordre de travail</div><span class="font-mono">{{ item.ordreTravailId ?? '-' }}</span></div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty><ClipboardCheck class="w-8 h-8" /><p class="text-sm">Aucun contrôle</p></template>
    <ControleVehiculeCard v-if="ficheId" :controles="filtered" :controle-id="ficheId" @close="ficheId = null" @creer="ficheId = null; saisieOuverte = true" />
    <ControleVehiculeFormModal v-if="saisieOuverte" @close="saisieOuverte = false" @cree="id => { saisieOuverte = false; ficheId = id }" />
  </ListPageLayout>
</template>

<script setup lang="ts">
/** Contrôles du véhicule par le maintenancier (FMS-MA-09). */
import { ref, computed, watch } from 'vue'
import { Plus, ClipboardCheck, CircleCheck, TriangleAlert, Wrench, Settings2 } from '@lucide/vue'
import ReglagePointsControle from '../../components/maintenance/ReglagePointsControle.vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import ControleVehiculeCard from '../../components/maintenance/ControleVehiculeCard.vue'
import ControleVehiculeFormModal from '../../components/maintenance/ControleVehiculeFormModal.vue'
import { useControlesVehiculeStore, LIB_MOMENT_CONTROLE, type ControleVehicule } from '../../stores/controlesVehicule'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useControlesVehiculeStore()
const reglageOuvert = ref(false)
const saisieOuverte = ref(false)
const ficheId = ref<string | null>(null)
function ouvrirFiche(id: string) { ficheId.value = id }

/* Liste */
const nbAnomalies = (c: ControleVehicule) => Object.values(c.resultats).filter(r => r === 'anomalie').length
const kpis = computed(() => [
  { label: 'Contrôles', value: store.controles.length, icon: ClipboardCheck, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Conformes', value: store.controles.filter(c => !nbAnomalies(c)).length, icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Avec anomalie', value: store.controles.filter(c => nbAnomalies(c)).length, icon: TriangleAlert, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Ordres ouverts', value: store.controles.filter(c => c.ordreTravailId).length, icon: Wrench, bg: 'bg-danger-bg', iconColor: 'text-danger' },
])
const anomaliesOuvertes = computed(() => store.controles.filter(c => store.anomaliesBloquantes(c).length).length)
const searchQuery = ref(''); const activeScope = ref(''); const sortKey = ref(''); const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1); const pageSize = ref(20)
const scopeOptions = [{ value: '', label: 'Tous' }, ...Object.entries(LIB_MOMENT_CONTROLE).map(([value, label]) => ({ value, label }))]
const columns: ListColumn[] = [
  { key: 'vehicule', label: 'Véhicule', width: 130 },
  { key: 'moment', label: 'Moment', width: 200 },
  { key: 'date', label: 'Date', width: 180 },
  { key: 'resultat', label: 'Résultat', width: 190 },
  { key: 'ot', label: 'Ordre de travail', width: 150 },
]
watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }
const filtered = computed(() => store.controles.filter(c => {
  if (activeScope.value && c.moment !== activeScope.value) return false
  if (searchQuery.value && !`${c.vehiculePlaque} ${c.controlePar}`.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
  return true
}).sort((a, b) => +new Date(b.date) - +new Date(a.date)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
</script>
