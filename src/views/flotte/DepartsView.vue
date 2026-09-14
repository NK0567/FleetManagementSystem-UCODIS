<template>
  <ListPageLayout
    title="Autorisations de départ"
    subtitle="Contrôle des départs de 5 h à 6 h · 1 en attente de décision"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} autorisation(s)`"
    search-placeholder="Référence, plaque, chauffeur…"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(a) => ouvrirFiche((a as AutorisationDepart).id)"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #cell-autorisation="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFiche(item.id)">{{ item.reference }}</button>
      <div class="text-[11px] text-muted-foreground font-mono">{{ item.voyageRef ?? '-' }}</div>
    </template>
    <template #cell-vehicule="{ item }"><span class="font-mono text-xs">{{ item.vehiculePlaque }}</span></template>
    <template #cell-chauffeur="{ item }"><span class="text-xs">{{ item.chauffeurNom }}</span></template>
    <template #cell-controles="{ item }">
      <div class="flex items-center gap-1">
        <component :is="c.conforme ? CircleCheck : CircleX" v-for="(c, i) in item.controles" :key="i" class="w-4 h-4" :class="c.conforme ? 'text-success' : 'text-danger'" />
      </div>
      <div class="text-[11px] text-muted-foreground mt-0.5">{{ store.nbConformes(item) }}/4 conformes</div>
    </template>
    <template #cell-decision="{ item }">
      <span v-if="!item.decideLe" class="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">En attente</span>
      <span v-else-if="item.accordee" class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Accordée</span>
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Refusée</span>
      <div v-if="item.decidePar" class="text-[11px] text-muted-foreground mt-0.5">{{ item.decidePar }}</div>
    </template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.demandeeLe) }}</span></template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span v-if="!item.decideLe" class="text-xs font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">En attente</span>
          <span v-else-if="item.accordee" class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Accordée</span>
          <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Refusée</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground font-mono">{{ item.vehiculePlaque }} · {{ item.chauffeurNom }}</div>
        </div>
        <div class="flex flex-col gap-1.5">
          <div v-for="(c, i) in item.controles" :key="i" class="flex items-center gap-2 text-xs">
            <component :is="c.conforme ? CircleCheck : CircleX" class="w-3.5 h-3.5 shrink-0" :class="c.conforme ? 'text-success' : 'text-danger'" />
            {{ LIB_CONTROLE_DEPART[c.controle] }}
          </div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <ShieldCheck class="w-8 h-8" />
      <p class="text-sm">Aucune autorisation trouvée</p>
    </template>

    <AutorisationCard v-if="ficheId" :autorisations="filtered" :autorisation-id="ficheId" @close="ficheId = null" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CircleCheck, CircleX, Clock, ShieldCheck, ThumbsDown, ThumbsUp } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import AutorisationCard from '../../components/flotte/AutorisationCard.vue'
import { useDepartsStore, LIB_CONTROLE_DEPART } from '../../stores/departs'
import type { AutorisationDepart } from '../../types'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useDepartsStore()

const searchQuery = ref('')
const activeScope = ref('')
const ficheId = ref<string | null>(null)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

const kpis = computed(() => [
  { label: 'Total', value: store.autorisations.length, icon: ShieldCheck, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'En attente', value: store.enAttente.length, icon: Clock, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Accordées', value: store.accordees.length, icon: ThumbsUp, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Refusées', value: store.refusees.length, icon: ThumbsDown, bg: 'bg-danger-bg', iconColor: 'text-danger' },
])

const scopeOptions = [
  { value: '', label: 'Toutes' },
  { value: 'attente', label: 'En attente' },
  { value: 'accordee', label: 'Accordées' },
  { value: 'refusee', label: 'Refusées' },
]

const columns = computed<ListColumn[]>(() => [
  { key: 'autorisation', label: 'Autorisation', sortable: true, hideable: false, width: 150 },
  { key: 'vehicule', label: 'Véhicule', width: 110 },
  { key: 'chauffeur', label: 'Chauffeur', width: 150 },
  { key: 'controles', label: 'Contrôles', width: 140 },
  { key: 'decision', label: 'Décision', width: 130 },
  { key: 'date', label: 'Demandée le', sortable: true, width: 130 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = store.autorisations.filter(a => {
    if (activeScope.value === 'attente' && a.decideLe) return false
    if (activeScope.value === 'accordee' && !(a.decideLe && a.accordee)) return false
    if (activeScope.value === 'refusee' && !(a.decideLe && !a.accordee)) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${a.reference} ${a.vehiculePlaque} ${a.chauffeurNom}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const k = sortKey.value as keyof AutorisationDepart
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  } else {
    rows = [...rows].sort((a, b) => +new Date(b.demandeeLe) - +new Date(a.demandeeLe))
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

function ouvrirFiche(id: string) { ficheId.value = id }
</script>
