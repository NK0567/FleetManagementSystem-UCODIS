<template>
  <ListPageLayout
    title="Contrôles"
    :subtitle="vue === 'checklists'
      ? `${store.pointsActifs.length} points contrôlés à chaque pause · ${store.avecAnomalie.length} checklist(s) avec anomalie`
      : `${inspections.postesActifs.length} postes dans la grille · ${inspections.enAttenteContreVisite.length} contre-visite(s) à réaliser`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="totalText"
    :search-placeholder="vue === 'checklists' ? 'Référence, plaque, conducteur…' : 'Référence, plaque, inspecteur…'"
    scope-label="Vue :"
    :scope-options="scopeOptions"
    v-model:scope="vue"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(c: any) => { vue === 'checklists' ? ouvrirFicheChecklist(c.id) : ouvrirFicheInspection(c.id) }"
  >
    <template #header-actions>
      <button v-if="vue === 'inspections'" :class="L.btnPrimary" @click="saisie = {}"><Plus class="w-4 h-4" /> Nouvelle inspection</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <!-- ══ VUE 1 - CHECKLISTS SUR ROUTE (FMS-SC-03) ══ -->
    <template #cell-checklist="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFicheChecklist(item.id)">{{ item.reference }}</button>
      <div class="text-[11px] text-muted-foreground font-mono">{{ item.voyageRef ?? '-' }}</div>
    </template>
    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs">{{ item.tracteurPlaque }}</span>
      <div v-if="item.semiRemorquePlaque" class="text-[11px] text-muted-foreground font-mono">{{ item.semiRemorquePlaque }}</div>
    </template>
    <template #cell-chauffeur="{ item }"><span class="text-xs">{{ item.chauffeurNom }}</span></template>
    <template #cell-signature="{ item }">
      <span v-if="item.signeParChauffeur" class="text-xs text-success">Signée</span>
      <span v-else class="text-xs text-warning">Non signée</span>
      <div v-if="item.signeParChauffeur && item.signeLe" class="text-[11px] text-muted-foreground">le {{ fmtDateHeure(item.signeLe) }}</div>
    </template>
    <template #cell-releves="{ item }"><span class="text-xs">{{ item.releves.length }} relevé(s)</span></template>
    <template #cell-resultat="{ item }">
      <span v-if="store.nbAnomalies(item) === 0" class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ store.nbAnomalies(item) }} anomalie(s)</span>
    </template>
    <template #cell-synchronisation="{ item }">
      <span class="text-xs" :class="item.synchroniseLe ? 'text-success' : 'text-warning'">{{ item.synchroniseLe ? 'Synchronisée' : 'Non synchronisée' }}</span>
      <div v-if="item.synchroniseLe" class="text-[11px] text-muted-foreground">le {{ fmtDateHeure(item.synchroniseLe) }}</div>
    </template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.dateDebut) }}</span></template>

    <!-- ══ VUE 2 - INSPECTIONS PÉRIODIQUES (FMS-MA-10) ══ -->
    <template #cell-refInspection="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFicheInspection(item.id)">{{ item.reference }}</button>
      <div v-if="item.contreVisiteDe" class="text-[11px] text-muted-foreground">Contre-visite</div>
    </template>
    <template #cell-vehiculeInspection="{ item }">
      <span class="font-mono text-xs">{{ item.tracteurPlaque }}</span>
      <div v-if="item.semiRemorquePlaque" class="text-[11px] text-muted-foreground font-mono">{{ item.semiRemorquePlaque }}</div>
    </template>
    <template #cell-inspecteur="{ item }"><span class="text-xs">{{ item.auditeur }}</span></template>
    <template #cell-postes="{ item }">
      <span class="text-xs">{{ item.resultats.length }} poste(s)</span>
      <div v-if="inspections.nbNonConformes(item)" class="text-[11px] text-danger font-medium">{{ inspections.nbNonConformes(item) }} non conforme(s)</div>
    </template>
    <template #cell-verdict="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.conforme ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.conforme ? 'Conforme' : 'Non conforme' }}</span>
    </template>
    <template #cell-contreVisite="{ item }">
      <span v-if="!item.conforme && !item.leveeParId" class="text-xs text-warning font-medium">{{ fmtDateHeure(item.contreVisiteLe) }}</span>
      <span v-else-if="item.leveeParId" class="text-xs text-muted-foreground">Réalisée</span>
      <span v-else class="text-muted-foreground text-xs">-</span>
    </template>
    <template #cell-dateInspection="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span></template>

    <template #details-panel="{ item }">
      <div v-if="vue === 'checklists'" class="flex flex-col gap-3">
        <div>
          <span v-if="store.nbAnomalies(item) === 0" class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
          <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ store.nbAnomalies(item) }} anomalie(s)</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">Checklist sur route</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Tracteur</div><span class="font-mono">{{ item.tracteurPlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Semi-remorque</div><span class="font-mono">{{ item.semiRemorquePlaque ?? '-' }}</span></div>
        </div>
        <div><div class="text-muted-foreground text-[11px]">Conducteur</div>{{ item.chauffeurNom }}</div>
        <div><div class="text-muted-foreground text-[11px]">Signature</div>{{ item.signeParChauffeur ? `Signée par ${item.chauffeurNom}${item.signeLe ? ', le ' + fmtDateHeure(item.signeLe) : ''}` : 'Non signée' }}</div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFicheChecklist(item.id)">Ouvrir la fiche</button>
      </div>
      <div v-else class="flex flex-col gap-3">
        <div>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="item.conforme ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.conforme ? 'Conforme' : 'Non conforme' }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">Inspection périodique</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Tracteur</div><span class="font-mono">{{ item.tracteurPlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Inspecteur</div>{{ item.auditeur }}</div>
        </div>
        <div v-if="!item.conforme && !item.leveeParId" class="bg-warning-bg text-warning rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Contre-visite prévue le {{ fmtDateHeure(item.contreVisiteLe) }}.
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFicheInspection(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <ClipboardCheck class="w-8 h-8" />
      <p class="text-sm">{{ vue === 'checklists' ? 'Aucune checklist trouvée' : 'Aucune inspection trouvée' }}</p>
    </template>

    <ChecklistCard v-if="ficheChecklistId" :checklists="store.checklists" :checklist-id="ficheChecklistId" @close="ficheChecklistId = null" />
    <InspectionCard v-if="ficheInspectionId" :key="ficheInspectionId" :ids="donnees.map(a => a.id)" :inspection-id="ficheInspectionId" @close="ficheInspectionId = null"
      @contre-visite="id => { ficheInspectionId = null; saisie = { vehiculeId: id } }" />
    <InspectionFormModal v-if="saisie" :vehicule-id="saisie.vehiculeId" @close="saisie = null" @cree="id => { saisie = null; ficheInspectionId = id }" />
  </ListPageLayout>
</template>

<script setup lang="ts">
/** Checklists sur route (FMS-SC-03) et inspections périodiques du véhicule et de la citerne (FMS-MA-10). */
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ClipboardCheck, ClipboardList, FileCheck, Plus, ShieldCheck, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import ChecklistCard from '../../components/flotte/ChecklistCard.vue'
import InspectionCard from '../../components/maintenance/InspectionCard.vue'
import InspectionFormModal from '../../components/maintenance/InspectionFormModal.vue'
import { useControlesStore } from '../../stores/controles'
import { useInspectionsStore } from '../../stores/inspections'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useControlesStore()
const inspections = useInspectionsStore()
const route = useRoute()

type Vue = 'checklists' | 'inspections'
const vue = ref<Vue>(route.query.vue === 'inspections' ? 'inspections' : 'checklists')

const searchQuery = ref('')
const ficheChecklistId = ref<string | null>(typeof route.query.checklist === 'string' ? route.query.checklist : null)
watch(() => route.query.checklist, v => { if (typeof v === 'string') { vue.value = 'checklists'; ficheChecklistId.value = v } })
const ficheInspectionId = ref<string | null>(typeof route.query.inspection === 'string' ? route.query.inspection : null)
const saisie = ref<{ vehiculeId?: string } | null>(null)
watch(() => route.query.inspection, v => { if (typeof v === 'string') { vue.value = 'inspections'; ficheInspectionId.value = v } })
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

const scopeOptions = [
  { value: 'checklists', label: 'Checklists sur route' },
  { value: 'inspections', label: 'Inspections périodiques' },
]

const kpis = computed(() => vue.value === 'checklists' ? [
  { label: 'Checklists', value: store.checklists.length, icon: ClipboardList, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Avec anomalie', value: store.avecAnomalie.length, icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Synchronisées', value: store.synchronisees.length, icon: FileCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Relevés totaux', value: store.relevesTotaux, icon: ClipboardCheck, bg: 'bg-info-bg', iconColor: 'text-info' },
] : [
  { label: 'Inspections', value: inspections.inspections.length, icon: ShieldCheck, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Non conformes', value: inspections.inspections.filter(a => !a.conforme).length, icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Contre-visites à réaliser', value: inspections.enAttenteContreVisite.length, icon: FileCheck, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Postes de la grille', value: inspections.postesActifs.length, icon: ClipboardCheck, bg: 'bg-info-bg', iconColor: 'text-info' },
])

const totalText = computed(() => vue.value === 'checklists' ? `${totalCount.value} checklist(s)` : `${totalCount.value} inspection(s)`)

const COLONNES: Record<Vue, ListColumn[]> = {
  checklists: [
    { key: 'checklist', label: 'Checklist', sortable: true, hideable: false, width: 150 },
    { key: 'vehicule', label: 'Véhicule', width: 130 },
    { key: 'chauffeur', label: 'Conducteur', width: 150 },
    { key: 'signature', label: 'Signature', width: 130 },
    { key: 'releves', label: 'Relevés', width: 110 },
    { key: 'resultat', label: 'Résultat', width: 120 },
    { key: 'synchronisation', label: 'Synchronisation', width: 150 },
    { key: 'date', label: 'Date', sortable: true, width: 110 },
  ],
  inspections: [
    { key: 'refInspection', label: 'Inspection', sortable: true, hideable: false, width: 150 },
    { key: 'vehiculeInspection', label: 'Véhicule', width: 130 },
    { key: 'inspecteur', label: 'Inspecteur', width: 150 },
    { key: 'postes', label: 'Postes', width: 130 },
    { key: 'verdict', label: 'Verdict', width: 120 },
    { key: 'contreVisite', label: 'Contre-visite', width: 130 },
    { key: 'dateInspection', label: 'Date', sortable: true, width: 110 },
  ],
}
const columns = computed(() => COLONNES[vue.value])

watch([vue, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { searchQuery.value = ''; page.value = 1 }

const donnees = computed<any[]>(() => {
  const q = searchQuery.value.toLowerCase()
  if (vue.value === 'checklists') {
    return store.checklists.filter(c => !q || `${c.reference} ${c.tracteurPlaque} ${c.chauffeurNom}`.toLowerCase().includes(q))
  }
  return inspections.inspections.filter(a => !q || `${a.reference} ${a.tracteurPlaque} ${a.auditeur}`.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date))
})

const totalCount = computed(() => donnees.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return donnees.value.slice(s, s + pageSize.value) })

function ouvrirFicheChecklist(id: string) { ficheChecklistId.value = id }
function ouvrirFicheInspection(id: string) { ficheInspectionId.value = id }
</script>
