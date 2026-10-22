<template>
  <ListPageLayout
    title="Accidents et incidents"
    :subtitle="`${ouverts} dossier(s) ouvert(s) · ${store.tauxAccidents} accident(s) par million de km`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} dossier(s)`"
    search-placeholder="Référence, plaque, lieu, conducteur…" scope-label="Dossiers :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(s: any) => ficheId = s.id"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="declarationOuverte = true"><Plus class="w-4 h-4" /> Déclarer un accident ou un incident</button>
    </template>
    <template #cell-reference="{ item }"><button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ficheId = item.id">{{ item.reference }}</button><div class="text-[11px] text-muted-foreground">{{ item.nature === 'incident' ? 'Incident' : 'Accident' }}</div></template>
    <template #cell-vehicule="{ item }"><span class="font-mono text-xs">{{ item.vehiculePlaque }}</span><div class="text-[11px] text-muted-foreground">{{ item.chauffeurNom ?? '-' }}</div></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span><div class="text-[11px] text-muted-foreground truncate">{{ item.lieu }}</div></template>
    <template #cell-gravite="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE_SINISTRE[item.gravite as GraviteSinistre].cls">{{ LIB_GRAVITE_SINISTRE[item.gravite as GraviteSinistre].label }}</span></template>
    <template #cell-suites="{ item }"><span class="text-xs">{{ item.ordreTravailRef ?? 'sans réparation' }}</span><div class="text-[11px] text-muted-foreground">{{ LIB_INDEMNISATION[item.statutIndemnisation as StatutIndemnisation] }}</div></template>
    <template #cell-statut="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.statutDossier === 'clos' ? 'bg-neutral-bg text-neutral' : 'bg-info-bg text-info'">{{ item.statutDossier === 'clos' ? 'Clos' : 'Ouvert' }}</span></template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE_SINISTRE[item.gravite as GraviteSinistre].cls">{{ LIB_GRAVITE_SINISTRE[item.gravite as GraviteSinistre].label }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">{{ fmtDateHeure(item.date) }} · {{ item.lieu }}</div>
        </div>
        <p class="text-xs text-foreground leading-relaxed">{{ item.circonstances }}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Conducteur</div>{{ item.chauffeurNom ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Réparation</div>{{ item.ordreTravailRef ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Photos</div>{{ item.photos?.length ?? 0 }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><Siren class="w-8 h-8" /><p class="text-sm">Aucun dossier</p></template>
  </ListPageLayout>
  <SinistreCard v-if="ficheId" :key="ficheId" :sinistres="filtered" :sinistre-id="ficheId" @close="ficheId = null" />
  <IncidentFormModal v-if="declarationOuverte" @close="declarationOuverte = false" @cree="id => { declarationOuverte = false; ficheId = id }" />
</template>

<script setup lang="ts">
/** Accidents et incidents : déclaration, dossier, suites (FMS-SC-06). */
import { ref, computed, watch } from 'vue'
import { Plus, Siren } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SinistreCard from '../../components/flotte/SinistreCard.vue'
import IncidentFormModal from '../../components/flotte/IncidentFormModal.vue'
import { useAssurancesStore, LIB_GRAVITE_SINISTRE, LIB_INDEMNISATION } from '../../stores/assurances'
import { fmtDateHeure } from '../../utils/voyageUtils'
import type { GraviteSinistre, StatutIndemnisation } from '../../types'
import * as L from '../../lib/listClasses'

const store = useAssurancesStore()
const scope = ref('')
const scopeOptions = [{ value: '', label: 'Tous' }, { value: 'ouvert', label: 'Ouverts' }, { value: 'clos', label: 'Clos' }, { value: 'accident', label: 'Accidents' }, { value: 'incident', label: 'Incidents' }]
const searchQuery = ref(''); const page = ref(1); const pageSize = ref(15)
const ficheId = ref<string | null>(null); const declarationOuverte = ref(false)
watch([scope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; page.value = 1 }
const ouverts = computed(() => store.sinistres.filter(s => s.statutDossier !== 'clos').length)
const filtered = computed(() => store.sinistres.filter(s => {
  if (scope.value === 'ouvert' && s.statutDossier === 'clos') return false
  if (scope.value === 'clos' && s.statutDossier !== 'clos') return false
  if (scope.value === 'accident' && (s.nature ?? 'accident') !== 'accident') return false
  if (scope.value === 'incident' && s.nature !== 'incident') return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${s.reference} ${s.vehiculePlaque} ${s.lieu} ${s.chauffeurNom ?? ''}`.toLowerCase().includes(q)
}).sort((a, b) => b.date.localeCompare(a.date)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Dossier', hideable: false, width: 150 },
  { key: 'vehicule', label: 'Véhicule', width: 170 },
  { key: 'date', label: 'Date et lieu', width: 210 },
  { key: 'gravite', label: 'Gravité', width: 140 },
  { key: 'suites', label: 'Suites', width: 190 },
  { key: 'statut', label: 'Dossier', width: 100 },
])
</script>
