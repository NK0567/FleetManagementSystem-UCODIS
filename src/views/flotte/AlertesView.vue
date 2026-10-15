<template>
  <ListPageLayout
    title="Alertes"
    :subtitle="`${store.enCours.length} alerte(s) en cours · ${store.escaladees.length} escaladée(s)`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} alerte(s)`" row-key="cle"
    search-placeholder="Titre, véhicule, personne…" scope-label="Vue :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(a: any) => ficheCle = a.cle"
  >
    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem" class="cursor-pointer" @click="scope = k.scope">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>
    <template #filters>
      <div :class="L.fpField"><label :class="L.fpFieldLabel">Catégorie</label><SearchableDropdown v-model="categorie" :items="optCategories" placeholder="Toutes" compact /></div>
      <button class="mt-auto py-[7px] bg-transparent border-0 text-xs text-muted-foreground cursor-pointer hover:text-primary" @click="resetFilters">Réinitialiser</button>
    </template>
    <template #cell-titre="{ item }">
      <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full shrink-0" :class="GRAV[item.gravite as GraviteAlerte]"></span>
        <button class="font-medium text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click.stop="ficheCle = item.cle">{{ item.titre }}</button></div>
      <div class="text-[11px] text-muted-foreground truncate">{{ item.message }}</div>
    </template>
    <template #cell-categorie="{ item }"><span class="text-xs">{{ LIB_CATEGORIE_ALERTE[item.categorie as CategorieAlerte] }}</span></template>
    <template #cell-depuis="{ item }"><span class="text-xs">{{ fmtDateHeure(item.depuis) }}</span></template>
    <template #cell-statut="{ item }">
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_ALERTE[item.statut as StatutAlerte].cls">{{ LIB_STATUT_ALERTE[item.statut as StatutAlerte].label }}</span>
      <div v-if="item.escaladeeLe" class="text-[11px] text-danger font-medium">escaladée · {{ libRole(item.escaladeeVers ?? store.regles[item.categorie as CategorieAlerte]?.niveau) }}</div>
    </template>
    <template #cell-traitement="{ item }"><span class="text-xs">{{ item.traiteePar ?? item.prisePar ?? '-' }}</span><div class="text-[11px] text-muted-foreground">{{ item.traiteeLe ? fmtDateHeure(item.traiteeLe) : item.priseLe ? fmtDateHeure(item.priseLe) : '' }}</div></template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_ALERTE[item.statut as StatutAlerte].cls">{{ LIB_STATUT_ALERTE[item.statut as StatutAlerte].label }}</span>
          <div class="font-medium text-foreground mt-1.5">{{ item.titre }}</div>
          <div class="text-xs text-muted-foreground">{{ item.message }}</div>
        </div>
        <div class="text-[11px] text-muted-foreground">Diffusion : {{ canauxDe(item.categorie as CategorieAlerte) }}</div>
        <div v-if="item.escaladeeLe" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">Escaladée le {{ fmtDateHeure(item.escaladeeLe) }} vers {{ libRole(item.escaladeeVers ?? store.regles[item.categorie as CategorieAlerte]?.niveau) }}.</div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheCle = item.cle">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><BellRing class="w-8 h-8" /><p class="text-sm">Aucune alerte</p></template>
  </ListPageLayout>
  <AlerteCard v-if="ficheCle" :key="ficheCle" :cles="filtered.map(a => a.cle)" :cle="ficheCle" @close="ficheCle = null" />
</template>

<script setup lang="ts">
/** Tableau des alertes : en cours, escaladées, historique et utilité (FMS-SC-08, SC-09). */
import { LIBELLE_ROLE } from '../../stores/auth'
import { useReglesDocumentsStore } from '../../stores/reglesDocuments'
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { BellRing, CircleCheck, Clock, TrendingUp } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import AlerteCard from '../../components/flotte/AlerteCard.vue'
import { useAlertesStore, LIB_CATEGORIE_ALERTE, LIB_STATUT_ALERTE, type CategorieAlerte, type StatutAlerte, type GraviteAlerte } from '../../stores/alertes'
import { fmtDateHeure } from '../../utils/voyageUtils'
import * as L from '../../lib/listClasses'

const store = useAlertesStore()
const libRole = (r?: string) => r ? (LIBELLE_ROLE as Record<string, string>)[r] ?? r : ''
const reglesDocs = useReglesDocumentsStore()
/** Canaux réglés pour l'événement, vers les rôles cochés de sa règle (FMS-PA-06). */
function canauxDe(c: CategorieAlerte): string {
  const r = store.regles[c]
  return reglesDocs.diffusion(!!r?.email, !!r?.sms, r?.destinataires ?? [])
}
const route = useRoute()
const GRAV: Record<GraviteAlerte, string> = { critique: 'bg-danger', avertissement: 'bg-warning', info: 'bg-info' }
const scope = ref('en_cours')
const scopeOptions = [{ value: 'en_cours', label: 'En cours' }, { value: 'escaladees', label: 'Escaladées' }, { value: 'historique', label: 'Historique (closes)' }, { value: '', label: 'Toutes' }]
const searchQuery = ref(''); const categorie = ref(''); const page = ref(1); const pageSize = ref(15)
const ficheCle = ref<string | null>(typeof route.query.alerte === 'string' ? route.query.alerte : null)
watch(() => route.query.alerte, v => { if (typeof v === 'string') ficheCle.value = v })
watch([scope, searchQuery, categorie, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = 'en_cours'; searchQuery.value = ''; categorie.value = ''; page.value = 1 }
const optCategories: DropdownItem[] = Object.entries(LIB_CATEGORIE_ALERTE).map(([id, label]) => ({ id, label }))
const filtered = computed(() => store.toutes.filter(a => {
  if (scope.value === 'en_cours' && !['nouvelle', 'prise_en_charge'].includes(a.statut)) return false
  if (scope.value === 'escaladees' && !(a.escaladeeLe && ['nouvelle', 'prise_en_charge'].includes(a.statut))) return false
  if (scope.value === 'historique' && !['traitee', 'resolue'].includes(a.statut)) return false
  if (categorie.value && a.categorie !== categorie.value) return false
  const q = searchQuery.value.toLowerCase()
  return !q || `${a.titre} ${a.message}`.toLowerCase().includes(q)
}))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const kpis = computed(() => [
  { label: 'En cours', value: store.enCours.length, scope: 'en_cours', icon: BellRing, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { label: 'Escaladées', value: store.escaladees.length, scope: 'escaladees', icon: TrendingUp, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Traitées', value: store.statistiques.traitees, scope: 'historique', icon: CircleCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Délai moyen de traitement', value: store.statistiques.delaiMoyenH != null ? `${store.statistiques.delaiMoyenH} h` : '-', scope: 'historique', icon: Clock, bg: 'bg-info-bg', iconColor: 'text-info' },
])
const columns = computed<ListColumn[]>(() => [
  { key: 'titre', label: 'Alerte', hideable: false, width: 320 },
  { key: 'categorie', label: 'Catégorie', width: 140 },
  { key: 'depuis', label: 'Depuis', width: 150 },
  { key: 'statut', label: 'Statut', width: 170 },
  { key: 'traitement', label: 'Traitée par', width: 160 },
])
</script>
