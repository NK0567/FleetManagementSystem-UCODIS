<template>
  <ListPageLayout
    title="Contrôles techniques"
    :subtitle="`16 points contrôlés à chaque pause · ${store.avecAnomalie.length} checklist(s) avec anomalie`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="totalText"
    :search-placeholder="vue === 'checklists' ? 'Référence, plaque, chauffeur…' : 'Référence, plaque, auditeur…'"
    scope-label="Vue :"
    :scope-options="scopeOptions"
    v-model:scope="vue"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(c: any) => { vue === 'checklists' ? ouvrirFicheChecklist(c.id) : ouvrirFicheAudit(c.id) }"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <!-- ══ VUE 1 - CHECKLISTS SUR ROUTE ══ -->
    <template #cell-checklist="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFicheChecklist(item.id)">{{ item.reference }}</button>
      <div class="text-[11px] text-muted-foreground font-mono">{{ item.voyageRef ?? '-' }}</div>
    </template>
    <template #cell-vehicule="{ item }">
      <span class="font-mono text-xs">{{ item.tracteurPlaque }}</span>
      <div v-if="item.semiRemorquePlaque" class="text-[11px] text-muted-foreground font-mono">{{ item.semiRemorquePlaque }}</div>
    </template>
    <template #cell-chauffeur="{ item }"><span class="text-xs">{{ item.chauffeurNom }}</span></template>
    <template #cell-releves="{ item }"><span class="text-xs">{{ item.releves.length }} relevé(s)</span></template>
    <template #cell-resultat="{ item }">
      <span v-if="store.nbAnomalies(item) === 0" class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ store.nbAnomalies(item) }} anomalie(s)</span>
    </template>
    <template #cell-signature="{ item }">
      <span class="text-xs" :class="item.signeParChauffeur ? 'text-success' : 'text-warning'">{{ item.signeParChauffeur ? 'Signée' : 'Non signée' }}</span>
      <div v-if="item.synchroniseLe" class="text-[11px] text-muted-foreground">synchro. {{ fmtDateHeure(item.synchroniseLe) }}</div>
    </template>
    <template #cell-date="{ item }"><span class="text-xs">{{ fmtDateHeure(item.dateDebut) }}</span></template>

    <!-- ══ VUE 2 - AUDITS DE CONFORMITÉ ══ -->
    <template #cell-refAudit="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFicheAudit(item.id)">{{ item.reference }}</button>
    </template>
    <template #cell-vehiculeAudit="{ item }">
      <span class="font-mono text-xs">{{ item.tracteurPlaque }}</span>
      <div v-if="item.semiRemorquePlaque" class="text-[11px] text-muted-foreground font-mono">{{ item.semiRemorquePlaque }}</div>
    </template>
    <template #cell-auditeur="{ item }"><span class="text-xs">{{ item.auditeur }}</span></template>
    <template #cell-postes="{ item }">
      <span class="text-xs">{{ item.resultats.length }} poste(s)</span>
      <div v-if="store.nbNonConformes(item)" class="text-[11px] text-danger font-medium">{{ store.nbNonConformes(item) }} non conforme(s)</div>
    </template>
    <template #cell-verdict="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="item.conforme ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.conforme ? 'Conforme' : 'Non conforme' }}</span>
    </template>
    <template #cell-contreVisite="{ item }">
      <span v-if="item.contreVisiteLe" class="text-xs text-warning font-medium">{{ fmtDateHeure(item.contreVisiteLe) }}</span>
      <span v-else class="text-muted-foreground text-xs">-</span>
    </template>
    <template #cell-dateAudit="{ item }"><span class="text-xs">{{ fmtDateHeure(item.date) }}</span></template>

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
        <div><div class="text-muted-foreground text-[11px]">Chauffeur</div>{{ item.chauffeurNom }}</div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFicheChecklist(item.id)">Ouvrir la fiche</button>
      </div>
      <div v-else class="flex flex-col gap-3">
        <div>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="item.conforme ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'">{{ item.conforme ? 'Conforme' : 'Non conforme' }}</span>
          <div class="font-mono font-semibold text-foreground mt-1.5">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">Audit de conformité</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Tracteur</div><span class="font-mono">{{ item.tracteurPlaque }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Auditeur</div>{{ item.auditeur }}</div>
        </div>
        <div v-if="item.contreVisiteLe" class="bg-warning-bg text-warning rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Contre-visite programmée le {{ fmtDateHeure(item.contreVisiteLe) }}.
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFicheAudit(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty>
      <ClipboardCheck class="w-8 h-8" />
      <p class="text-sm">{{ vue === 'checklists' ? 'Aucune checklist trouvée' : 'Aucun audit trouvé' }}</p>
    </template>

    <ChecklistCard v-if="ficheChecklistId" :checklists="store.checklists" :checklist-id="ficheChecklistId" @close="ficheChecklistId = null" />
    <AuditCard v-if="ficheAuditId" :audits="store.audits" :audit-id="ficheAuditId" @close="ficheAuditId = null" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ClipboardCheck, ClipboardList, FileCheck, ShieldCheck, TriangleAlert } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import ChecklistCard from '../../components/flotte/ChecklistCard.vue'
import AuditCard from '../../components/flotte/AuditCard.vue'
import { useControlesStore } from '../../stores/controles'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useControlesStore()

type Vue = 'checklists' | 'audits'
const vue = ref<Vue>('checklists')

const searchQuery = ref('')
const ficheChecklistId = ref<string | null>(null)
const ficheAuditId = ref<string | null>(null)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

const scopeOptions = [
  { value: 'checklists', label: 'Checklists sur route' },
  { value: 'audits', label: 'Audits de conformité' },
]

const kpis = computed(() => vue.value === 'checklists' ? [
  { label: 'Checklists', value: store.checklists.length, icon: ClipboardList, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Avec anomalie', value: store.avecAnomalie.length, icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Signées', value: store.signees.length, icon: FileCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Relevés totaux', value: store.relevesTotaux, icon: ClipboardCheck, bg: 'bg-info-bg', iconColor: 'text-info' },
] : [
  { label: 'Audits', value: store.audits.length, icon: ShieldCheck, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Non conformes', value: store.auditsNonConformes.length, icon: TriangleAlert, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Contre-visites', value: store.audits.filter(a => a.contreVisiteLe).length, icon: FileCheck, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Postes contrôlés', value: store.POSTES_AUDIT.length, icon: ClipboardCheck, bg: 'bg-info-bg', iconColor: 'text-info' },
])

const totalText = computed(() => vue.value === 'checklists' ? `${totalCount.value} checklist(s)` : `${totalCount.value} audit(s)`)

const COLONNES: Record<Vue, ListColumn[]> = {
  checklists: [
    { key: 'checklist', label: 'Checklist', sortable: true, hideable: false, width: 150 },
    { key: 'vehicule', label: 'Véhicule', width: 130 },
    { key: 'chauffeur', label: 'Chauffeur', width: 150 },
    { key: 'releves', label: 'Relevés', width: 110 },
    { key: 'resultat', label: 'Résultat', width: 120 },
    { key: 'signature', label: 'Signature', width: 140 },
    { key: 'date', label: 'Date', sortable: true, width: 110 },
  ],
  audits: [
    { key: 'refAudit', label: 'Audit', sortable: true, hideable: false, width: 150 },
    { key: 'vehiculeAudit', label: 'Véhicule', width: 130 },
    { key: 'auditeur', label: 'Auditeur', width: 150 },
    { key: 'postes', label: 'Postes', width: 130 },
    { key: 'verdict', label: 'Verdict', width: 120 },
    { key: 'contreVisite', label: 'Contre-visite', width: 130 },
    { key: 'dateAudit', label: 'Date', sortable: true, width: 110 },
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
  return store.audits.filter(a => !q || `${a.reference} ${a.tracteurPlaque} ${a.auditeur}`.toLowerCase().includes(q))
})

const totalCount = computed(() => donnees.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return donnees.value.slice(s, s + pageSize.value) })

function ouvrirFicheChecklist(id: string) { ficheChecklistId.value = id }
function ouvrirFicheAudit(id: string) { ficheAuditId.value = id }
</script>
