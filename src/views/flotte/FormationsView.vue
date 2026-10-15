<template>
  <ListPageLayout
    title="Formations"
    :subtitle="`${store.aPlanifier.length} formation(s) à planifier, dont ${proposeesScore} proposée(s) pour un score sous ${store.seuilScore}`"
    :columns="columns" :items="pageItems" :total="totalCount" :total-text="`${totalCount} formation(s)`"
    search-placeholder="Conducteur, thème…" scope-label="Statut :" :scope-options="scopeOptions"
    v-model:scope="scope" v-model:search-query="searchQuery" v-model:page="page" v-model:page-size="pageSize"
    @reset-filters="resetFilters" @open-card="(f: any) => ficheId = f.id"
  >
    <template #header-actions>
      <button :class="L.btnPrimary" @click="creationOuverte = true"><Plus class="w-4 h-4" /> Déclencher une formation</button>
    </template>
    <template #cell-conducteur="{ item }"><button class="font-medium text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer text-left" @click.stop="ficheId = item.id">{{ nom(item.conducteurId) }}</button></template>
    <template #cell-theme="{ item }"><span class="text-xs">{{ item.theme }}</span><div class="text-[11px] text-muted-foreground">{{ LIB_MOTIF_FORMATION[item.motif as MotifFormation] }}{{ item.origineRef ? ` · ${item.origineRef}` : '' }}</div></template>
    <template #cell-date="{ item }"><span class="text-xs">{{ formatDate(item.suivieLe ?? item.prevueLe ?? item.declencheeLe) }}</span></template>
    <template #cell-statut="{ item }"><span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_FORMATION[item.statut as StatutFormation].cls">{{ LIB_STATUT_FORMATION[item.statut as StatutFormation].label }}</span></template>
    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <span class="text-[11px] font-medium px-2 py-0.5 rounded-full" :class="LIB_STATUT_FORMATION[item.statut as StatutFormation].cls">{{ LIB_STATUT_FORMATION[item.statut as StatutFormation].label }}</span>
          <div class="font-medium text-foreground mt-1.5">{{ item.theme }}</div>
          <div class="text-xs text-muted-foreground">{{ nom(item.conducteurId) }}</div>
        </div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ficheId = item.id">Ouvrir la fiche</button>
      </div>
    </template>
    <template #empty><GraduationCap class="w-8 h-8" /><p class="text-sm">Aucune formation</p></template>
  </ListPageLayout>
  <FormationCard v-if="ficheId" :key="ficheId" :ids="filtered.map(f => f.id)" :formation-id="ficheId" @close="ficheId = null" />
  <CreateModalShell v-if="creationOuverte" title="Déclencher une formation" banner-label="Flotte · Formations" create-label="Déclencher" :save-error="erreur || null" @close="creationOuverte = false" @create="declencher">
    <template #form>
      <div class="px-8 py-6 max-w-3xl mx-auto">
        <FormSection title="Formation">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="F.field"><label :class="F.fieldLabel">Conducteur *</label><SearchableDropdown v-model="form.conducteurId" :items="optConducteurs" placeholder="Choisir…" /></div>
            <div :class="F.field"><label :class="F.fieldLabel">Motif</label><SearchableDropdown v-model="form.motif" :items="optMotifs" placeholder="Choisir…" /></div>
            <div :class="F.field" class="col-span-2 max-sm:col-span-1"><label :class="F.fieldLabel">Thème *</label><input v-model="form.theme" :class="F.fieldInput" placeholder="ex. Conduite préventive, écoconduite…" /></div>
          </div>
        </FormSection>
      </div>
    </template>
  </CreateModalShell>
</template>

<script setup lang="ts">
/** Formations ciblées, déclenchées selon le score ou un événement, et leur historique (FMS-SC-07). */
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { GraduationCap, Plus } from '@lucide/vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import CreateModalShell from '../../components/shared/CreateModalShell.vue'
import FormSection from '../../components/ui/form-field/FormSection.vue'
import SearchableDropdown from '../../components/ui/SearchableDropdown.vue'
import type { DropdownItem } from '../../components/ui/SearchableDropdown.vue'
import FormationCard from '../../components/flotte/FormationCard.vue'
import { useFormationsStore, LIB_MOTIF_FORMATION, LIB_STATUT_FORMATION, type MotifFormation, type StatutFormation } from '../../stores/formations'
import { usePersonnelStore } from '../../stores/personnel'
import { useScoresConducteursStore } from '../../stores/scoresConducteurs'
import { useAuthStore } from '../../stores/auth'
import { formatDate } from '../../utils/helpers'
import * as L from '../../lib/listClasses'
import * as F from '../../lib/formClasses'

const store = useFormationsStore()
const personnel = usePersonnelStore()
const scores = useScoresConducteursStore()
const auth = useAuthStore()
const nom = (id: string) => personnel.parId(id)?.nomComplet ?? id
const scope = ref('')
const scopeOptions = [{ value: '', label: 'Toutes' }, { value: 'a_planifier', label: 'À planifier' }, { value: 'planifiee', label: 'Planifiées' }, { value: 'suivie', label: 'Suivies' }, { value: 'annulee', label: 'Annulées' }]
const searchQuery = ref(''); const page = ref(1); const pageSize = ref(15)
const ficheId = ref<string | null>(null); const creationOuverte = ref(false); const erreur = ref('')
/* Élément ouvert depuis une alerte : il arrive avec son identifiant. */
const routeLien = useRoute()
if (typeof routeLien.query.formation === 'string') ficheId.value = routeLien.query.formation
watch(() => routeLien.query.formation, v => { if (typeof v === 'string') ficheId.value = v })
watch([scope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { scope.value = ''; searchQuery.value = ''; page.value = 1 }
const filtered = computed(() => store.formations.filter(f => (!scope.value || f.statut === scope.value)
  && (!searchQuery.value || `${nom(f.conducteurId)} ${f.theme}`.toLowerCase().includes(searchQuery.value.toLowerCase())))
  .sort((a, b) => b.declencheeLe.localeCompare(a.declencheeLe)))
const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => { const s = (page.value - 1) * pageSize.value; return filtered.value.slice(s, s + pageSize.value) })
const columns = computed<ListColumn[]>(() => [
  { key: 'conducteur', label: 'Conducteur', hideable: false, width: 190 },
  { key: 'theme', label: 'Thème et motif', width: 300 },
  { key: 'date', label: 'Date', width: 120 },
  { key: 'statut', label: 'Statut', width: 120 },
])
/** Formations proposées automatiquement par le score (règle unique : stores/scoresConducteurs). */
const proposeesScore = computed(() => store.aPlanifier.filter(f => f.motif === 'score').length)
const form = ref({ conducteurId: '', motif: 'autre' as MotifFormation, theme: '' })
const optConducteurs = computed<DropdownItem[]>(() => personnel.conducteurs.map(c => ({ id: c.id, label: c.nomComplet, sublabel: `score ${scores.scoreGlobal(c.id)}/100` })))
const optMotifs: DropdownItem[] = Object.entries(LIB_MOTIF_FORMATION).map(([id, label]) => ({ id, label }))
function declencher() {
  const r = store.declencher({ conducteurId: form.value.conducteurId, theme: form.value.theme, motif: form.value.motif }, auth.user?.nom ?? 'Responsable')
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  creationOuverte.value = false; erreur.value = ''; form.value = { conducteurId: '', motif: 'autre', theme: '' }; ficheId.value = r.id!
}
</script>
