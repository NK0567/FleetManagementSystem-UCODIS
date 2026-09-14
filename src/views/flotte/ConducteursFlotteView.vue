<template>
  <ListPageLayout
    title="Conducteurs"
    :subtitle="`${personnel.conducteurs.length} conducteur(s) enregistré(s) · ${nonAffectables.length} non affectable(s)`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} conducteur(s)`"
    search-placeholder="Nom, matricule, n° de permis…"
    scope-label="Statut :"
    :scope-options="scopeOptions"
    v-model:scope="activeScope"
    v-model:search-query="searchQuery"
    v-model:sort-key="sortKey"
    v-model:sort-dir="sortDir"
    v-model:page="page"
    v-model:page-size="pageSize"
    @reset-filters="resetFilters"
    @open-card="(c) => ouvrirFiche((c as Personnel).id)"
  >
    <template #above-table>
      <div v-if="nonAffectables.length" class="flex items-start gap-2.5 bg-danger-bg text-danger rounded-lg px-3.5 py-2.5 mb-3.5">
        <ShieldAlert class="w-4 h-4 shrink-0 mt-px" />
        <p class="text-xs leading-relaxed">
          {{ nonAffectables.length }} conducteur(s) ne peuvent pas être affectés :
          <span v-for="(c, i) in nonAffectables" :key="c.id">{{ i ? ' · ' : '' }}{{ c.nomComplet }} ({{ motifBlocage(c.id) }})</span>.
          L'autorisation de départ leur sera refusée tant que la pièce n'est pas régularisée.
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
          <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
          <div><div :class="L.kpiItemVal">{{ k.value }}</div><div :class="L.kpiItemLbl">{{ k.label }}</div></div>
        </div>
      </div>
    </template>

    <template #cell-conducteur="{ item }">
      <div class="flex items-center gap-2">
        <UserAvatar :nom="item.nomComplet" taille="sm" />
        <div>
          <p class="font-medium text-foreground text-xs">{{ item.nomComplet }}</p>
          <p class="text-[11px] text-muted-foreground">{{ item.matricule }}</p>
        </div>
      </div>
    </template>
    <template #cell-permis="{ item }">
      <span v-if="permisEcheance(item.id)" class="text-[11px] font-medium px-1.5 py-0.5 rounded" :class="classeEcheance(permisEcheance(item.id))">{{ formatDate(permisEcheance(item.id)) }}</span>
      <span v-else class="text-muted-foreground text-xs">-</span>
    </template>
    <template #cell-visite="{ item }">
      <span v-if="visiteEcheance(item.id)" class="text-[11px] font-medium px-1.5 py-0.5 rounded" :class="classeEcheance(visiteEcheance(item.id))">{{ formatDate(visiteEcheance(item.id)) }}</span>
      <span v-else class="text-muted-foreground text-xs">-</span>
    </template>
    <template #cell-score="{ item }">
      <div class="flex items-center gap-2">
        <div class="w-16 h-1.5 bg-background rounded-full overflow-hidden"><div class="h-full rounded-full" :class="barreScore(scoreDe(item.id))" :style="{ width: scoreDe(item.id) + '%' }"></div></div>
        <span class="text-xs font-semibold" :class="texteScore(scoreDe(item.id))">{{ scoreDe(item.id) }}</span>
      </div>
    </template>
    <template #cell-statut="{ item }">
      <span v-if="motifBlocage(item.id)" class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Non affectable</span>
      <span v-else class="text-xs font-medium px-2 py-0.5 rounded-full" :class="estAffecte(item.id) ? 'bg-primary/10 text-primary' : 'bg-success-bg text-success'">{{ estAffecte(item.id) ? 'Affecté' : 'Disponible' }}</span>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UserAvatar :nom="item.nomComplet" taille="md" />
          <div>
            <div class="font-semibold text-foreground">{{ item.nomComplet }}</div>
            <div class="text-xs text-muted-foreground">{{ item.matricule }}</div>
          </div>
        </div>

        <div v-if="motifBlocage(item.id)" class="bg-danger-bg text-danger rounded-md px-2.5 py-2 text-[11px] leading-snug">
          Affectation refusée : {{ motifBlocage(item.id) }}. L'autorisation de départ ne peut pas être délivrée tant que la pièce n'est pas régularisée.
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">N° de permis</div><span class="font-mono text-[11px]">{{ permisDoc(item.id)?.reference ?? '-' }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Catégorie</div>{{ permisDoc(item.id)?.categorie ?? '-' }}</div>
          <div><div class="text-muted-foreground text-[11px]">Exp. permis</div><span :class="classeEcheance(permisEcheance(item.id))" class="px-1.5 py-0.5 rounded">{{ formatDate(permisEcheance(item.id)) }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Visite médicale</div><span :class="classeEcheance(visiteEcheance(item.id))" class="px-1.5 py-0.5 rounded">{{ formatDate(visiteEcheance(item.id)) }}</span></div>
          <div><div class="text-muted-foreground text-[11px]">Score conduite</div><span :class="texteScore(scoreDe(item.id))" class="font-semibold">{{ scoreDe(item.id) }} / 100</span></div>
          <div><div class="text-muted-foreground text-[11px]">Écarts</div>{{ ecartsStore.ecartsDuChauffeur(item.id).length }}</div>
        </div>

        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
        <button :class="L.btnOutline" class="w-full justify-center" @click="voirPageComplete(item.id)"><ExternalLink class="w-4 h-4" /> Voir la page complète</button>
      </div>
    </template>

    <template #empty>
      <User class="w-8 h-8" />
      <p class="text-sm">Aucun conducteur trouvé</p>
    </template>

    <ConducteurFicheCard v-if="ficheId" :conducteurs="filtered" :conducteur-id="ficheId" @close="ficheId = null" @voir-page-complete="voirPageComplete" />
  </ListPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ExternalLink, ShieldAlert, User, UserCheck, Users, UserX } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import ConducteurFicheCard from '../../components/flotte/ConducteurFicheCard.vue'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useEcartsStore } from '../../stores/ecarts'
import type { Personnel } from '../../types'
import { formatDate, etatEcheance } from '../../utils/helpers'
import * as L from '../../lib/listClasses'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const docsPersonnel = useDocumentsStore()
const ecartsStore = useEcartsStore()
const router = useRouter()

const searchQuery = ref('')
const activeScope = ref('')
const ficheId = ref<string | null>(null)
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
const page = ref(1)
const pageSize = ref(15)

function permisDoc(id: string) { return docsPersonnel.parPersonnel(id).find(d => d.type === 'permis') }
function permisEcheance(id: string) { return permisDoc(id)?.dateExpiration }
function visiteEcheance(id: string) { return docsPersonnel.parPersonnel(id).find(d => d.type === 'visite_medicale')?.dateExpiration }
function classeEcheance(date?: string) {
  const e = etatEcheance(date)
  return e === 'expire' ? 'bg-danger-bg text-danger' : e === 'proche' ? 'bg-warning-bg text-warning' : 'text-muted-foreground'
}
function motifBlocage(id: string) {
  const c = personnel.parId(id)
  if (!c?.habilite) return 'non habilité'
  if (!docsPersonnel.enRegle(id)) return 'pièce expirée'
  return null
}
const nonAffectables = computed(() => personnel.conducteurs.filter(c => motifBlocage(c.id)))
function estAffecte(id: string) { return !!vehicules.affectations.find(a => a.conducteurId === id && !a.dateFin) }

/** Score simplifié : 100 de départ, pénalisé par écart non justifié et pièce non en règle. */
function scoreDe(id: string) {
  let s = 100
  s -= ecartsStore.ecartsDuChauffeur(id).filter(e => e.nature === 'non_justifiee').length * 15
  s -= ecartsStore.ecartsDuChauffeur(id).filter(e => e.nature === 'a_qualifier').length * 5
  if (!docsPersonnel.enRegle(id)) s -= 20
  return Math.max(0, Math.min(100, s))
}
function barreScore(s: number) { return s >= 80 ? 'bg-success' : s >= 60 ? 'bg-warning' : 'bg-danger' }
function texteScore(s: number) { return s >= 80 ? 'text-success' : s >= 60 ? 'text-warning' : 'text-danger' }

const kpis = computed(() => [
  { label: 'Conducteurs', value: personnel.conducteurs.length, icon: Users, bg: 'bg-primary/10', iconColor: 'text-primary' },
  { label: 'Disponibles et affectables', value: personnel.conducteurs.filter(c => !motifBlocage(c.id) && !estAffecte(c.id)).length, icon: UserCheck, bg: 'bg-success-bg', iconColor: 'text-success' },
  { label: 'Non affectables', value: nonAffectables.value.length, icon: UserX, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { label: 'Échéances proches', value: personnel.conducteurs.filter(c => etatEcheance(permisEcheance(c.id)) === 'proche' || etatEcheance(visiteEcheance(c.id)) === 'proche').length, icon: ShieldAlert, bg: 'bg-warning-bg', iconColor: 'text-warning' },
])

const scopeOptions = [
  { value: '', label: 'Tous' },
  { value: 'disponible', label: 'Disponibles' },
  { value: 'affecte', label: 'Affectés' },
  { value: 'bloque', label: 'Non affectables' },
]

const columns = computed<ListColumn[]>(() => [
  { key: 'conducteur', label: 'Conducteur', sortable: true, hideable: false, width: 170 },
  { key: 'permis', label: 'Permis (expiration)', width: 130 },
  { key: 'visite', label: 'Visite médicale', width: 130 },
  { key: 'score', label: 'Score conduite', width: 130 },
  { key: 'statut', label: 'Statut', width: 130 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() => {
  let rows = personnel.conducteurs.filter(c => {
    if (activeScope.value === 'disponible' && (motifBlocage(c.id) || estAffecte(c.id))) return false
    if (activeScope.value === 'affecte' && !estAffecte(c.id)) return false
    if (activeScope.value === 'bloque' && !motifBlocage(c.id)) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      if (!`${c.nomComplet} ${c.matricule}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  if (sortKey.value) {
    const k = sortKey.value as keyof Personnel
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[k] ?? '').localeCompare(String(b[k] ?? ''))
      return sortDir.value === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })

function ouvrirFiche(id: string) { ficheId.value = id }
function voirPageComplete(id: string) { router.push({ name: 'flotte-conducteur-dashboard', params: { id } }) }
</script>
