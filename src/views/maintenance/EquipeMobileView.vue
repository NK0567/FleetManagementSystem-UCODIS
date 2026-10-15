<template>
  <ListPageLayout
    title="Équipe mobile"
    :subtitle="`${store.mobilesEnCours.length} en cours`"
    :columns="columns"
    :items="pageItems"
    :total="totalCount"
    :total-text="`${totalCount} intervention(s)`"
    search-placeholder="Référence, plaque, lieu…"
    scope-label="Type :"
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
      <button :class="L.btnPrimary" @click="declenchementOuvert = true"><Plus class="w-4 h-4" /> Déclencher une intervention</button>
    </template>

    <template #above-table>
      <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-3.5">
        <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
          <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
          <p v-if="k.cible" class="text-[11px] text-muted-foreground mt-0.5">{{ k.cible }}</p>
        </div>
      </div>
    </template>

    <template #cell-reference="{ item }">
      <button class="font-mono font-semibold text-foreground hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer" @click.stop="ouvrirFiche(item.id)">{{ item.reference }}</button>
      <div class="text-[11px] text-muted-foreground">{{ store.libelleMission(item.type) }}</div>
    </template>

    <template #cell-cible="{ item }">
      <span class="font-mono text-xs">{{ item.vehiculePlaque }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.lieu }}</div>
    </template>

    <template #cell-equipe="{ item }">
      <div class="text-[11px] text-muted-foreground leading-snug">
        <div v-for="m in item.equipe" :key="m">{{ m }}</div>
      </div>
    </template>

    <template #cell-delai="{ item }">
      <span v-if="delaiIntervention(item) != null" class="text-xs font-medium text-foreground">
        {{ fmtDuree(delaiIntervention(item) ?? 0) }}
      </span>
      <span v-else class="text-muted-foreground">-</span>
      <div v-if="dureeIntervention(item) != null" class="text-[11px]" :class="(dureeIntervention(item) ?? 0) > obj.tempsMoyenMaxMinutes ? 'text-danger' : 'text-muted-foreground'">intervention {{ fmtDuree(dureeIntervention(item) ?? 0) }}</div>
    </template>


    <template #cell-resultat="{ item }">
      <span v-if="!item.clotureLe" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning-bg text-warning">En cours</span>
      <span v-else-if="item.resolu" class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Résolue</span>
      <span v-else class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Non résolue</span>
    </template>

    <template #cell-date="{ item }">
      <span class="text-xs">{{ fmtDateHeure(item.declencheLe) }}</span>
      <div class="text-[11px] text-muted-foreground">{{ item.arriveeLe ? `arrivée ${fmtDateHeure(item.arriveeLe)}` : 'en route' }}</div>
    </template>

    <template #details-panel="{ item }">
      <div class="flex flex-col gap-3">
        <div>
          <div class="font-mono font-semibold text-foreground">{{ item.reference }}</div>
          <div class="text-xs text-muted-foreground">{{ store.libelleMission(item.type) }}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Lieu</div>{{ item.lieu }}</div>
          <div><div class="text-muted-foreground text-[11px]">Camion</div><span class="font-mono">{{ item.vehiculePlaque }}</span></div>
          <div v-if="delaiIntervention(item) != null"><div class="text-muted-foreground text-[11px]">Délai d'arrivée</div>{{ fmtDuree(delaiIntervention(item) ?? 0) }}</div>
        </div>

        <div>
          <div class="text-muted-foreground text-[11px] mb-1">Équipe envoyée</div>
          <div v-for="m in item.equipe" :key="m" class="text-[11px] text-foreground">· {{ m }}</div>
        </div>

        <p v-if="item.observation" class="text-[11px] text-muted-foreground leading-snug">{{ item.observation }}</p>
        <div v-if="store.estMissionControle(item.type) && item.nbControles != null" class="text-xs"><div class="text-muted-foreground text-[11px]">Contrôles</div>{{ item.nbControles }} réalisés, {{ item.nbPositifs ?? 0 }} cas positifs</div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Départ</div>{{ fmtDateHeure(item.declencheLe) }}</div>
          <div><div class="text-muted-foreground text-[11px]">Arrivée</div>{{ item.arriveeLe ? fmtDateHeure(item.arriveeLe) : 'en route' }}</div>
        </div>
        <div v-if="item.ordreTravailId" class="text-xs"><div class="text-muted-foreground text-[11px]">Ordre de travail</div><span class="font-mono">{{ item.ordreTravailId }}</span></div>
        <button :class="L.btnPrimary" class="w-full justify-center" @click="ouvrirFiche(item.id)">Ouvrir la fiche</button>
      </div>
    </template>

    <template #empty><Users class="w-8 h-8" /><p class="text-sm">Aucune intervention</p></template>
    <InterventionMobileCard v-if="ficheId" :interventions="filtered" :intervention-id="ficheId" @close="ficheId = null" @creer="ficheId = null; declenchementOuvert = true" />
    <InterventionMobileFormModal v-if="declenchementOuvert" @close="declenchementOuvert = false" @cree="id => { declenchementOuvert = false; ficheId = id }" />
  </ListPageLayout>
</template>

<script setup lang="ts">
/**
 * Interventions de l'équipe mobile sur route. Objectifs suivis, réglés
 * dans Paramètres de l'atelier : nombre d'interventions, taux de
 * résolution et temps moyen d'intervention, sur les 30 derniers jours.
 */
import { ref, computed, watch } from 'vue'
import { Users, Plus } from '@lucide/vue'
import InterventionMobileCard from '../../components/maintenance/InterventionMobileCard.vue'
import InterventionMobileFormModal from '../../components/maintenance/InterventionMobileFormModal.vue'
import ListPageLayout from '../../components/shared/ListPageLayout.vue'
import type { ListColumn } from '../../components/shared/ListPageLayout.vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import type { InterventionMobile } from '../../types/maintenance'
import { fmtDateHeure } from '../../utils/voyageUtils'
import { aujourdhuiISO } from '../../utils/horloge'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()
const declenchementOuvert = ref(false)
const ficheId = ref<string | null>(null)
function ouvrirFiche(id: string) { ficheId.value = id }
const obj = computed(() => store.objectifsMobile)

const searchQuery = ref('')
const activeScope = ref('')
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('desc')
const page = ref(1)
const pageSize = ref(15)

const scopeOptions = computed(() => [
  { value: '', label: 'Toutes les interventions' },
  ...store.typesMissionMobile.filter(t => t.actif || store.interventionsMobiles.some(i => i.type === t.code)).map(t => ({ value: t.code, label: t.libelle })),
])

/** Formate une durée en minutes en heures et minutes lisibles. */
function fmtDuree(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h ${m > 0 ? m + ' min' : ''}`.trim() : `${m} min`
}

/** Délai entre le départ et l'arrivée sur place, en minutes. */
function delaiIntervention(i: InterventionMobile): number | null {
  if (!i.arriveeLe) return null
  return Math.round((+new Date(i.arriveeLe) - +new Date(i.declencheLe)) / 60_000)
}

/** Temps d'intervention : du départ à la clôture, en minutes. */
function dureeIntervention(i: InterventionMobile): number | null {
  if (!i.clotureLe) return null
  return Math.round((+new Date(i.clotureLe) - +new Date(i.declencheLe)) / 60_000)
}
/** Période de suivi : les 30 derniers jours. */
const depuis = new Date(new Date(aujourdhuiISO()).getTime() - 30 * 86_400_000).toISOString()
const duMois = computed(() => store.interventionsMobiles.filter(i => i.declencheLe >= depuis))
const tempsMoyen = computed(() => {
  const d = duMois.value.map(dureeIntervention).filter((x): x is number => x != null)
  return d.length ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : null
})
const tauxResolution = computed(() => {
  const closes = duMois.value.filter(i => i.clotureLe)
  if (!closes.length) return null
  return Math.round(closes.filter(i => i.resolu).length / closes.length * 100)
})


/** Missions de contrôle : contrôles réalisés et cas positifs sur la période. */
const controlesDuMois = computed(() => duMois.value.filter(i => store.estMissionControle(i.type))
  .reduce((acc, i) => ({ controles: acc.controles + (i.nbControles ?? 0), positifs: acc.positifs + (i.nbPositifs ?? 0) }), { controles: 0, positifs: 0 }))

const delaiMoyen = computed(() => {
  const d = duMois.value.map(delaiIntervention).filter((x): x is number => x != null)
  if (!d.length) return null
  return Math.round(d.reduce((a, b) => a + b, 0) / d.length)
})

const kpis = computed(() => [
  { label: 'Interventions sur 30 jours', value: String(duMois.value.length), cls: duMois.value.length >= obj.value.interventionsParMois ? 'text-success' : 'text-warning', cible: `cible ≥ ${obj.value.interventionsParMois}` },
  { label: 'Taux de résolution', value: tauxResolution.value != null ? tauxResolution.value + ' %' : '-', cls: (tauxResolution.value ?? 0) >= obj.value.tauxResolutionPct ? 'text-success' : 'text-danger', cible: `cible ≥ ${obj.value.tauxResolutionPct} %` },
  { label: "Temps moyen d'intervention", value: tempsMoyen.value != null ? fmtDuree(tempsMoyen.value) : '-', cls: (tempsMoyen.value ?? 0) <= obj.value.tempsMoyenMaxMinutes ? 'text-success' : 'text-danger', cible: `cible ≤ ${fmtDuree(obj.value.tempsMoyenMaxMinutes)}` },
  { label: "Délai moyen d'arrivée", value: delaiMoyen.value != null ? fmtDuree(delaiMoyen.value) : '-', cls: 'text-foreground', cible: '' },
  { label: 'Contrôles sur 30 jours', value: String(controlesDuMois.value.controles), cls: controlesDuMois.value.controles >= obj.value.controlesParMois ? 'text-success' : 'text-warning', cible: `cible ≥ ${obj.value.controlesParMois}` },
  { label: 'Cas positifs sur 30 jours', value: String(controlesDuMois.value.positifs), cls: controlesDuMois.value.positifs ? 'text-danger' : 'text-foreground', cible: controlesDuMois.value.controles ? `${Math.round(controlesDuMois.value.positifs / controlesDuMois.value.controles * 100)} % des contrôles` : '' },
])

const columns = computed<ListColumn[]>(() => [
  { key: 'reference', label: 'Intervention', sortable: true, width: 200 },
  { key: 'cible', label: 'Camion et position', width: 220 },
  { key: 'equipe', label: 'Équipe', width: 210 },
  { key: 'delai', label: "Délai d'arrivée", width: 130 },
  { key: 'resultat', label: 'Résultat', width: 120 },
  { key: 'date', label: 'Départ', sortable: true, width: 170 },
])

watch([activeScope, searchQuery, pageSize], () => { page.value = 1 })
function resetFilters() { activeScope.value = ''; searchQuery.value = ''; page.value = 1 }

const filtered = computed(() =>
  store.interventionsMobiles
    .filter(i => {
      if (activeScope.value && i.type !== activeScope.value) return false
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        if (!`${i.reference} ${i.vehiculePlaque} ${i.lieu}`.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      const dir = sortDir.value === 'asc' ? 1 : -1
      if (sortKey.value === 'reference') return dir * a.reference.localeCompare(b.reference)
      if (sortKey.value === 'date') return dir * (+new Date(a.declencheLe) - +new Date(b.declencheLe))
      return +new Date(b.declencheLe) - +new Date(a.declencheLe)
    }))

const totalCount = computed(() => filtered.value.length)
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
</script>
