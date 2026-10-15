<template>
  <ListPageLayout
    title="Documents de l'entreprise"
    :subtitle="`${store.officiels.length} document(s) officiel(s) · ${store.enAttente.length} en attente de validation`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} document(s)`"
    search-placeholder="Mot-clé, nom, référence…" scope-label="Statut :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(d: any) => ficheId = d.id"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="depot = { }"><Upload class="w-4 h-4" /> Déposer un document</button>
    </template>

    <template #filters>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Type</label><SearchableDropdown v-model="filtreType" :items="optTypes" placeholder="Tous" compact /></div>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Entité</label><SearchableDropdown v-model="filtreEntite" :items="optEntites" placeholder="Toutes" compact /></div>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Du</label><input v-model="du" type="date" :class="F.fieldInput" class="!h-[32px] !text-[12px]" /></div>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Au</label><input v-model="au" type="date" :class="F.fieldInput" class="!h-[32px] !text-[12px]" /></div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>

    <template #cell-nom="{ item }"><button class="font-medium text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click.stop="ficheId = item.id">{{ item.nom }}</button><div class="text-[11px] text-muted-foreground font-mono">{{ item.reference }}</div></template>
    <template #cell-type="{ item }"><span class="text-xs">{{ types.libelle(item.type) }}</span><div class="text-[11px] text-muted-foreground">{{ entites.parId(item.entiteId ?? '')?.nom ?? '' }}</div></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ formatDate(item.dateDocument) }}</span></template>
    <template #cell-fin="{ item }"><span v-if="item.dateFin" class="px-2 py-0.5 rounded text-xs font-medium" :class="CLS[store.etat(item)]">{{ formatDate(item.dateFin) }}</span><span v-else class="text-xs text-muted-foreground">illimitée</span></template>
    <template #cell-statut="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_VALIDATION[item.statut].cls">{{ LIB_VALIDATION[item.statut].label }}</span></template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_VALIDATION[item.statut].cls">{{ LIB_VALIDATION[item.statut].label }}</span>
          <div class="font-medium text-foreground mt-1.5">{{ item.nom }}</div>
          <div class="text-xs text-muted-foreground">{{ types.libelle(item.type) }} · {{ item.reference }}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Déposé par</div>{{ item.deposePar }}</div>
          <div><div class="text-muted-foreground text-[11px]">Date</div>{{ formatDate(item.dateDocument) }}</div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Mots-clés</div>{{ item.motsCles.join(', ') || '-' }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><FolderOpen class="w-8 h-8" /><p class="text-sm">Aucun document</p></template>
  </ListPageLayout>

  <DocumentEntrepriseCard v-if="ficheId" :key="ficheId" :ids="filtered.map(d => d.id)" :document-id="ficheId" @close="ficheId = null" @nouvelle-version="id => { ficheId = null; depot = { remplaceId: id } }" />
  <DocumentEntrepriseFormModal v-if="depot" :remplace-id="depot.remplaceId" @close="depot = null" @cree="id => { depot = null; ficheId = id }" />
</template>

<script setup lang="ts">
/** Documents de l'entreprise, recherche et circuit de validation (FMS-SC-02). */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FolderOpen, Upload } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import DocumentEntrepriseCard from '../../components/flotte/DocumentEntrepriseCard.vue'
import DocumentEntrepriseFormModal from '../../components/flotte/DocumentEntrepriseFormModal.vue'
import { useDocumentsEntrepriseStore, LIB_VALIDATION } from '../../stores/documentsEntreprise'
import { useTypesDocumentsStore } from '../../stores/typesDocuments'
import { useEntiteStore } from '../../stores/entites'
import { formatDate } from '../../utils/helpers'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useDocumentsEntrepriseStore()
const types = useTypesDocumentsStore()
const entites = useEntiteStore()
const CLS: Record<string, string> = { valide: 'bg-success-bg text-success', proche: 'bg-warning-bg text-warning', expire: 'bg-danger-bg text-danger' }

const scope = ref('')
const scopeOptions = [{ value: '', label: 'Tous' }, { value: 'valide', label: 'Officiels' }, { value: 'en_attente', label: 'En attente' }, { value: 'rejete', label: 'Rejetés' }]
const searchQuery = ref(''); const filtreType = ref(''); const filtreEntite = ref(''); const du = ref(''); const au = ref('')
const page = ref(1); const pageSize = ref(15)
const ficheId = ref<string | null>(null)
/* Élément ouvert depuis une alerte : il arrive avec son identifiant. */
const routeLien = useRoute()
if (typeof routeLien.query.document === 'string') ficheId.value = routeLien.query.document
watch(() => routeLien.query.document, v => { if (typeof v === 'string') ficheId.value = v })
const depot = ref<{ remplaceId?: string } | null>(null)
watch([scope, searchQuery, filtreType, filtreEntite, du, au, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; filtreType.value = ''; filtreEntite.value = ''; du.value = ''; au.value = ''; page.value = 1 }
const optTypes = computed<DropdownItem[]>(() => types.deCible('entreprise').map(t => ({ id: t.code, label: t.libelle })))
const optEntites = computed<DropdownItem[]>(() => entites.liste.map(e => ({ id: e.id, label: e.nom })))

const filtered = computed(() => store.documents.filter(d => {
  if (scope.value && d.statut !== scope.value) return false
  // « Officiels » : seule la version en vigueur, pas celles qu'une version validée a remplacées.
  if (scope.value === 'valide' && !store.officiels.some(o => o.id === d.id)) return false
  if (filtreType.value && d.type !== filtreType.value) return false
  if (filtreEntite.value && d.entiteId !== filtreEntite.value) return false
  if (du.value && d.dateDocument < du.value) return false
  if (au.value && d.dateDocument > au.value) return false
  const q = searchQuery.value.toLowerCase().trim()
  return !q || `${d.nom} ${d.reference} ${d.motsCles.join(' ')} ${types.libelle(d.type)}`.toLowerCase().includes(q)
}).sort((a, b) => b.deposeLe.localeCompare(a.deposeLe)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const columns = computed<ListColumn[]>(() => [
  { key: 'nom', label: 'Document', hideable: false, width: 260 },
  { key: 'type', label: 'Type et entité', width: 220 },
  { key: 'date', label: 'Date', width: 110 },
  { key: 'fin', label: 'Fin de validité', width: 130 },
  { key: 'statut', label: 'Statut', width: 170 },
])
</script>
