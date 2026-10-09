<template>
  <ListPageLayout
    title="Immobilisations"
    :subtitle="sousTitre"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} immobilisation(s)`"
    search-placeholder="Plaque, motif…"
    scope-label="Famille :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(i: any) => ouvrirFiche(i.id)"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="declarationOuverte = true"><Plus class="w-4 h-4" /> Déclarer une immobilisation</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
          <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
        </div>
      </div>
    </template>

    <template #cell-vehicule="{ item }"><button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFiche(item.id)">{{ item.vehiculePlaque }}</button></template>

    <template #cell-code="{ item }">
      <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded" :class="CLS_FAMILLE[item.famille]">{{ item.code }}</span>
      <div class="text-[11px] text-muted-foreground">{{ libelleDuCode(item.code) }}</div>
    </template>

    <template #cell-famille="{ item }"><span class="text-xs">{{ LIB_FAMILLE_INDISPO[item.famille] }}</span></template>

    <template #cell-periode="{ item }">
      <span class="text-xs">{{ fmtDateHeure(item.debut) }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.fin ? `au ${fmtDateHeure(item.fin)}` : 'en cours' }}</div>
    </template>

    <template #cell-duree="{ item }">
      <span class="text-sm font-bold" :class="store.dureeIndispo(item) > 3 ? 'text-danger' : 'text-foreground'">{{ store.dureeIndispo(item) }} j</span>
    </template>

    <template #cell-cout="{ item }">
      <span v-if="store.coutIndispo(item) != null" class="text-xs font-semibold text-danger">{{ fmtAr(store.coutIndispo(item)!) }}</span>
      <span v-else class="text-muted-foreground">-</span>
    </template>

    <template #cell-ot="{ item }">
      <span v-if="item.ordreTravailId" class="font-mono text-[11px] text-primary">{{ item.ordreTravailId }}</span>
      <span v-else class="text-muted-foreground">-</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded" :class="CLS_FAMILLE[item.famille]">{{ item.code }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.vehiculePlaque }}</div>
          <div class="text-xs text-muted-foreground">{{ libelleDuCode(item.code) }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Début</div>{{ fmtDateHeure(item.debut) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Fin</div>{{ item.fin ? fmtDateHeure(item.fin) : 'en cours' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Durée</div>{{ store.dureeIndispo(item) }} jour(s)</div>
          <div><div class="text-muted-foreground text-[11px]">Famille</div>{{ LIB_FAMILLE_INDISPO[item.famille] }}</div>
        </div>
        <div v-if="store.coutIndispo(item) != null" class="text-xs"><div class="text-muted-foreground text-[11px]">Coût</div><span class="text-danger font-semibold">{{ fmtAr(store.coutIndispo(item)!) }}</span></div>
        <div v-if="item.ordreTravailId" class="text-xs"><div class="text-muted-foreground text-[11px]">Ordre de travail</div><span class="font-mono">{{ item.ordreTravailId }}</span></div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty><CalendarOff class="w-8 h-8" /><p class="text-sm">Aucune immobilisation</p></template>
    <IndispoCard v-if="ficheId" :indisponibilites="filtered" :indispo-id="ficheId" @close="ficheId = null" @creer="ficheId = null; declarationOuverte = true" />
    <IndispoFormModal v-if="declarationOuverte" @close="declarationOuverte = false" @cree="id => { declarationOuverte = false; ficheId = id }" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
const codif = useCodificationIndispoStore()
const libelleDuCode = (c: string) => codif.libelleDuCode(c)
import { Plus } from '@lucide/vue'
import IndispoCard from '../../components/maintenance/IndispoCard.vue'
import IndispoFormModal from '../../components/maintenance/IndispoFormModal.vue'
/**
 * Immobilisations et codes d'indisponibilité, repris du socle FMS
 * (US 3.3.1). Les codes réglementaires propres au transport français ou
 * maritime d'hydrocarbures (APAVE, Vetting) ont été retirés en amont,
 * dans types/maintenance.ts.
 */
import { ref, computed, watch } from 'vue'
import { CalendarOff } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_FAMILLE_INDISPO } from '../../types/maintenance'
import type { FamilleIndispo } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()
const declarationOuverte = ref(false)
const ficheId = ref<string | null>(null)
function ouvrirFiche(id: string) { ficheId.value = id }
function fmtAr(n: number) { return n.toLocaleString('fr-FR') + ' Ar' }

const searchQuery = ref('')
const activeScope = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(20)

const CLS_FAMILLE: Record<FamilleIndispo, string> = {
  technique: 'bg-danger-bg text-danger', reglementaire: 'bg-warning-bg text-warning',
  administrative: 'bg-info-bg text-info', humaine: 'bg-primary/10 text-primary',
}

const scopeOptions = [
  { value: '', label: 'Toutes les familles' },
  { value: 'technique', label: 'Technique' },
  { value: 'reglementaire', label: 'Réglementaire' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'humaine', label: 'Humaine' },
]

const totalJours = computed(() => Object.values(store.joursPerdusParFamille).reduce((s, v) => s + v, 0))

const sousTitre = computed(() => {
  const base = `${store.indisposEnCours.length} véhicule(s) immobilisé(s) · ${totalJours.value} jour(s) perdus sur la période`
  return store.coutTotalImmobilisations != null ? `${base} · ${fmtAr(store.coutTotalImmobilisations)} de manque à gagner` : base
})

const kpis = computed(() => [
  { label: 'En cours', value: String(store.indisposEnCours.length), cls: 'text-danger' },
  { label: 'Jours techniques', value: String(store.joursPerdusParFamille.technique ?? 0), cls: 'text-foreground' },
  { label: 'Jours réglementaires', value: String(store.joursPerdusParFamille.reglementaire ?? 0), cls: 'text-foreground' },
  { label: store.coutImmoRenseigne ? 'Coût des jours perdus' : 'Ratio humain / technique',
    value: store.coutImmoRenseigne ? fmtAr(store.coutTotalImmobilisations ?? 0) : (store.ratioHumainTechnique != null ? String(store.ratioHumainTechnique) : '-'),
    cls: store.coutImmoRenseigne ? 'text-danger' : 'text-foreground' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'vehicule', label: 'Véhicule', sortable: true, width: 140 },
  { key: 'code', label: 'Motif', width: 220 },
  { key: 'famille', label: 'Famille', sortable: true, width: 130 },
  { key: 'periode', label: 'Période', sortable: true, width: 165 },
  { key: 'duree', label: 'Durée', width: 90 },
  { key: 'cout', label: 'Coût', width: 130 },
  { key: 'ot', label: 'Ordre de travail', width: 150 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() =>
  store.indisponibilites.filter(i => {
    if (activeScope.value && i.famille !== activeScope.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${i.vehiculePlaque} ${i.code} ${libelleDuCode(i.code)}`.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => +new Date(b.debut) - +new Date(a.debut)))

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
</script>
