<template>
  <ListPageLayout
    title="Infractions"
    :subtitle="`${store.ouvertes.length} infraction(s) en cours de traitement · ${store.infractions.filter(i => i.source === 'telematique').length} remontée(s) par la télématique`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} infraction(s)`"
    search-placeholder="Référence, plaque, conducteur, lieu…" scope-label="Statut :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(i: any) => ficheId = i.id"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="saisieOuverte = true"><Plus class="w-4 h-4" /> Nouvelle infraction</button>
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
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Origine</label><SearchableDropdown v-model="origine" :items="optOrigines" placeholder="Toutes" compact /></div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>
    <template #cell-reference="{ item }"><button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ficheId = item.id">{{ item.reference }}</button><div class="text-[11px] text-muted-foreground">{{ item.source === 'telematique' ? 'Remontée par la télématique' : 'Saisie manuelle' }}</div></template>
    <template #cell-type="{ item }"><span class="text-xs font-medium">{{ store.libelleType(item.type) }}</span><div class="text-[11px] text-muted-foreground truncate">{{ item.detail }}</div></template>
    <template #cell-conducteur="{ item }"><span class="text-xs">{{ item.conducteurNom ?? 'non identifié' }}</span><div class="text-[11px] text-muted-foreground font-mono">{{ item.vehiculePlaque }}</div></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span><div class="text-[11px] text-muted-foreground truncate">{{ item.lieu }}</div></template>
    <template #cell-gravite="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE_INFRACTION[item.gravite as GraviteInfraction].cls">{{ LIB_GRAVITE_INFRACTION[item.gravite as GraviteInfraction].label }}</span></template>
    <template #cell-statut="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_INFRACTION[item.statut as StatutInfraction].cls">{{ LIB_STATUT_INFRACTION[item.statut as StatutInfraction].label }}</span><div v-if="item.suite" class="text-[11px] text-muted-foreground">{{ store.libelleSuite(item as Infraction) }}</div></template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_INFRACTION[item.statut as StatutInfraction].cls">{{ LIB_STATUT_INFRACTION[item.statut as StatutInfraction].label }}</span>
          <div class="font-semibold text-foreground mt-1.5">{{ store.libelleType(item.type) }}</div>
          <div class="text-xs text-muted-foreground">{{ item.reference }} · {{ fmtDateHeure(item.date) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Conducteur</div>{{ item.conducteurNom ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Détail</div>{{ item.detail || '-' }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><Gavel class="w-8 h-8" /><p class="text-sm">Aucune infraction</p></template>
  </ListPageLayout>
  <InfractionCard v-if="ficheId" :key="ficheId" :ids="filtered.map(i => i.id)" :infraction-id="ficheId" @close="ficheId = null" />
  <InfractionFormModal v-if="saisieOuverte" @close="saisieOuverte = false" @cree="id => { saisieOuverte = false; ficheId = id }" />
</template>

<script setup lang="ts">
/** Infractions de conduite et leur traitement (FMS-SC-05). */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CircleCheck, Gavel, Plus, Radio, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import InfractionCard from '../../components/flotte/InfractionCard.vue'
import InfractionFormModal from '../../components/flotte/InfractionFormModal.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import { useInfractionsStore, LIB_STATUT_INFRACTION, LIB_GRAVITE_INFRACTION, type GraviteInfraction, type StatutInfraction, type Infraction } from '../../stores/infractions'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useInfractionsStore()
const scope = ref('')
const scopeOptions = [{ value: '', label: 'Toutes' }, { value: 'ouvertes', label: 'À traiter' }, { value: 'nouvelle', label: 'Nouvelles' }, { value: 'en_traitement', label: 'En traitement' }, { value: 'cloturee', label: 'Clôturées' }]
const searchQuery = ref(''); const page = ref(1); const pageSize = ref(15)
const origine = ref('')
const optOrigines: DropdownItem[] = [{ id: 'telematique', label: 'Remontées par la télématique' }, { id: 'saisie', label: 'Saisies manuellement' }]
const ficheId = ref<string | null>(null); const saisieOuverte = ref(false)
const routeLien = useRoute()
if (typeof routeLien.query.infraction === 'string') ficheId.value = routeLien.query.infraction
watch(() => routeLien.query.infraction, v => { if (typeof v === 'string') ficheId.value = v })
watch([scope, searchQuery, origine, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; origine.value = ''; page.value = 1 }
const filtered = computed(() => store.infractions.filter(i => {
  if (scope.value === 'ouvertes' && i.statut === 'cloturee') return false
  if (scope.value && scope.value !== 'ouvertes' && i.statut !== scope.value) return false
  if (origine.value && i.source !== origine.value) return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${i.reference} ${i.vehiculePlaque} ${i.conducteurNom ?? ''} ${i.lieu} ${store.libelleType(i.type)}`.toLowerCase().includes(q)
}).sort((a, b) => b.date.localeCompare(a.date)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const kpis = computed(() => [
  { label: 'Nouvelles', value: store.infractions.filter(i => i.statut === 'nouvelle').length, action: () => { scope.value = 'nouvelle'; origine.value = '' }, icon: TriangleAlert, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'En traitement', value: store.infractions.filter(i => i.statut === 'en_traitement').length, action: () => { scope.value = 'en_traitement'; origine.value = '' }, icon: Gavel, bg: 'bg-info-bg', iconColor: 'text-info' },
  { label: 'Clôturées', value: store.infractions.filter(i => i.statut === 'cloturee').length, action: () => { scope.value = 'cloturee'; origine.value = '' }, icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Remontées par la télématique', value: store.infractions.filter(i => i.source === 'telematique').length, action: () => { scope.value = ''; origine.value = 'telematique' }, icon: Radio, bg: 'bg-neutral-bg', iconColor: 'text-neutral' },
])
const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Infraction', hideable: false, width: 140 },
  { key: 'type', label: 'Type', width: 220 },
  { key: 'conducteur', label: 'Conducteur', width: 170 },
  { key: 'date', label: 'Date et lieu', width: 190 },
  { key: 'gravite', label: 'Gravité', width: 100 },
  { key: 'statut', label: 'Statut', width: 160 },
])
</script>
