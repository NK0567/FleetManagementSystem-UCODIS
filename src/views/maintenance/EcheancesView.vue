<template>
  <ListPageLayout
    title="Échéances préventives"
    :subtitle="`${depassees} échéance(s) dépassée(s) · ${proches} proche(s) du seuil`"
    :columns="columns"
    row-key="cle"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} échéance(s)`"
    search-placeholder="Plaque, opération…"
    scope-label="État :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
  >
    <template #above-table>
      <div v-if="modelesProvisoires.length" class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3.5">
        <FileQuestion class="w-4 h-4 shrink-0 mt-px" />
        <p class="text-xs leading-relaxed">
          {{ modelesProvisoires.length }} plan(s) d'entretien sont provisoires : {{ modelesProvisoires.join(' · ') }}.
          Les échéances qui en découlent sont réelles et doivent être traitées, mais les intervalles restent à
          confirmer avec UCODIS dans Paramétrage → Plans d'entretien.
        </p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
          <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
        </div>
      </div>
    </template>

    <template #cell-vehicule="{ item }">
      <span class="font-mono font-semibold text-foreground">{{ item.vehiculePlaque }}</span>
    </template>

    <template #cell-operation="{ item }">
      <span class="text-xs font-medium">{{ item.operationLibelle }}</span>
      <div class="text-[11px] text-muted-foreground">{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</div>
    </template>

    <template #cell-nature="{ item }">
      <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">{{ LIB_NATURE_OPERATION[item.nature] }}</span>
    </template>

    <template #cell-echeance="{ item }">
      <span v-if="item.kmProchain" class="text-xs">{{ item.kmProchain.toLocaleString('fr-FR') }} km</span>
      <div v-if="item.kmRestants != null" class="text-[11px]" :class="item.kmRestants < 0 ? 'text-danger font-medium' : 'text-muted-foreground'">
        {{ item.kmRestants < 0 ? `dépassée de ${Math.abs(item.kmRestants).toLocaleString('fr-FR')} km` : `dans ${item.kmRestants.toLocaleString('fr-FR')} km` }}
      </div>
    </template>

    <template #cell-etat="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="CLS_ETAT[item.statut]">{{ LIB_ETAT[item.statut] }}</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="CLS_ETAT[item.statut]">{{ LIB_ETAT[item.statut] }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ item.operationLibelle }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Sous-système</div>{{ LIB_SOUS_SYSTEME[item.sousSysteme] }}</div>
          <div><div class="text-muted-foreground text-[11px]">Nature</div>{{ LIB_NATURE_OPERATION[item.nature] }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Prochaine échéance</div>{{ item.kmProchain ? item.kmProchain.toLocaleString('fr-FR') + ' km' : '-' }}</div>
        </div>
        <div v-if="item.statut === 'depassee'" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Échéance dépassée. Programmer l'intervention en priorité pour éviter une panne.
        </div>
        <div v-if="planProvisoire(item.vehiculeId)" class="bg-warning-bg text-warning rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Intervalle provisoire. {{ planProvisoire(item.vehiculeId)?.source }}
        </div>
      </div>
    </template>

    <template #empty><CalendarClock class="w-8 h-8" /><p class="text-sm">Aucune échéance à venir</p></template>
  </ListPageLayout>
</template>

<script setup lang="ts">
/**
 * Échéances préventives, repris du socle FMS (US 3.1.2). Le
 * déclenchement se fait au premier des deux seuils atteint,
 * kilométrage ou date, selon le plan d'entretien du modèle.
 */
import { ref, computed, watch } from 'vue'
import { CalendarClock, FileQuestion } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import { LIB_SOUS_SYSTEME, LIB_NATURE_OPERATION } from '../../types/maintenance'
import type { EcheanceEntretien } from '../../types/maintenance'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()
const vehicules = useVehiculeStore()

const searchQuery = ref('')
const activeScope = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(20)

const LIB_ETAT: Record<EcheanceEntretien['statut'], string> = { a_venir: 'À venir', proche: 'Proche', depassee: 'Dépassée' }
const CLS_ETAT: Record<EcheanceEntretien['statut'], string> = {
  a_venir: 'bg-neutral-bg text-neutral', proche: 'bg-warning-bg text-warning', depassee: 'bg-danger-bg text-danger',
}

const scopeOptions = [
  { value: '', label: 'Toutes' },
  { value: 'depassee', label: 'Dépassées' },
  { value: 'proche', label: 'Proches du seuil' },
  { value: 'a_venir', label: 'À venir' },
]

type EcheanceListee = EcheanceEntretien & { cle: string }

const echeances = computed<EcheanceListee[]>(() =>
  vehicules.liste
    .filter(v => v.type === 'tracteur')
    .flatMap(v => {
      const p = store.passagesDe(v.id)
      return store.echeancesDuVehicule(v.id, v.immatriculation, v.modele, v.kilometrage, p.km, p.dates)
    })
    .map(e => ({ ...e, cle: `${e.vehiculeId}-${e.operationId}` }))
    .sort((a, b) => (a.kmRestants ?? Infinity) - (b.kmRestants ?? Infinity)))

function planProvisoire(vehiculeId: string) {
  const v = vehicules.parId(vehiculeId)
  const plan = v?.modele ? store.planDuModele(v.modele) : undefined
  return plan?.provisoire ? plan : null
}

const modelesProvisoires = computed(() => {
  const modeles = new Set(
    vehicules.liste.filter(v => v.modele && store.planDuModele(v.modele)?.provisoire).map(v => `${v.marque} ${v.modele}`.trim()))
  return [...modeles]
})

const depassees = computed(() => echeances.value.filter(e => e.statut === 'depassee').length)
const proches = computed(() => echeances.value.filter(e => e.statut === 'proche').length)

const kpis = computed(() => [
  { label: 'Dépassées', value: String(depassees.value), cls: depassees.value ? 'text-danger' : 'text-success' },
  { label: 'Proches du seuil', value: String(proches.value), cls: proches.value ? 'text-warning' : 'text-foreground' },
  { label: 'À venir', value: String(echeances.value.filter(e => e.statut === 'a_venir').length), cls: 'text-foreground' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule', label: 'Véhicule', sortable: true, width: 150 },
  { key: 'operation', label: 'Opération', width: 320 },
  { key: 'nature', label: 'Nature', width: 130 },
  { key: 'echeance', label: 'Échéance', sortable: true, width: 210 },
  { key: 'etat', label: 'État', sortable: true, width: 130 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() =>
  echeances.value.filter(e => {
    if (activeScope.value && e.statut !== activeScope.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${e.vehiculePlaque} ${e.operationLibelle}`.toLowerCase().includes(q)) return false
    }
    return true
  }))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
</script>
