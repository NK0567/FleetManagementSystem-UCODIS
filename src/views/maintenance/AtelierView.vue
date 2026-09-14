<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Charge de l'atelier</div>
        <div :class="L.pageSub">{{ store.ouverts.length }} intervention(s) à réaliser · {{ store.chargeTotaleH }} h estimées</div>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
      <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
        <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
        <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
        <p v-if="k.note" class="text-[11px] text-muted-foreground mt-0.5">{{ k.note }}</p>
      </div>
    </div>

    <!-- Taux d'occupation -->
    <div v-if="store.capaciteRenseignee" :class="L.card" class="mb-3.5">
      <div class="flex items-center justify-between mb-3">
        <div :class="L.cardTitle" class="!mb-0"><Gauge class="w-4 h-4 text-primary" /> Taux d'occupation</div>
        <span class="text-[11px] text-muted-foreground">
          {{ cap.postes }} poste(s) × {{ cap.heuresParJour }} h × {{ cap.joursOuvresParSemaine }} j = {{ store.capaciteHeuresParSemaine }} h/semaine
        </span>
      </div>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-2xl font-bold leading-none" :class="clsOccupation">{{ store.tauxOccupationSemaine }} %</span>
        <span class="text-xs text-muted-foreground">{{ store.chargeTotaleH }} h de charge pour {{ store.capaciteHeuresParSemaine }} h ouvrables</span>
      </div>
      <div class="h-2.5 rounded-full bg-background overflow-hidden">
        <div class="h-full rounded-full transition-all" :class="clsBarreOccupation" :style="{ width: Math.min(100, store.tauxOccupationSemaine ?? 0) + '%' }" />
      </div>
      <p class="text-[11px] mt-2.5 leading-relaxed" :class="(store.tauxOccupationSemaine ?? 0) > 100 ? 'text-danger' : 'text-muted-foreground'">
        <template v-if="(store.tauxOccupationSemaine ?? 0) > 100">
          L'atelier est saturé : {{ store.joursPourAbsorberCharge }} jour(s) ouvré(s) sont nécessaires pour absorber la charge en attente.
        </template>
        <template v-else>La charge tient dans la semaine ouvrée : {{ store.joursPourAbsorberCharge }} jour(s) ouvré(s) suffisent à l'absorber.</template>
      </p>
    </div>
    <div v-else class="flex items-start gap-2.5 bg-warning-bg text-warning rounded-lg px-3.5 py-2.5 mb-3.5">
      <FileQuestion class="w-4 h-4 shrink-0 mt-px" />
      <div>
        <p class="text-xs font-medium">Taux d'occupation non calculé</p>
        <p class="text-[11px] leading-relaxed mt-0.5">
          La charge est connue - {{ store.chargeTotaleH }} h estimées - mais pas la capacité. Renseignez-la dans
          <RouterLink :to="{ name: 'maintenance-parametres' }" class="underline font-medium">Paramétrage → Paramètres de l'atelier</RouterLink>.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
      <!-- Charge par mécanicien -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Users class="w-4 h-4 text-primary" /> Charge par mécanicien</div>
          <span class="text-[11px] text-muted-foreground">triée par priorité</span>
        </div>
        <div v-if="!store.chargeParMecanicien.length" class="text-xs text-muted-foreground py-3">Aucun mécanicien affecté à une intervention en cours.</div>
        <div v-else class="flex flex-col gap-3">
          <div v-for="m in store.chargeParMecanicien" :key="m.mecanicien" class="border border-border rounded-lg px-3 py-2.5">
            <div class="flex items-baseline justify-between mb-2">
              <span class="text-xs font-semibold text-foreground">{{ m.mecanicien }}</span>
              <span class="text-[11px] text-muted-foreground">{{ m.interventions.length }} intervention(s) · {{ m.heuresEstimees }} h estimées</span>
            </div>
            <div v-if="!m.interventions.length" class="text-[11px] text-muted-foreground">Aucune intervention en cours.</div>
            <div v-for="o in m.interventions" :key="o.id" class="flex items-center gap-2 py-1.5 border-t border-border/60">
              <span class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 text-white" :class="CLS_PRIORITE[store.prioriteDe(o)]">{{ store.prioriteDe(o) }}</span>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-medium text-foreground truncate">{{ o.reference }} - {{ o.vehiculePlaque }}</p>
                <p class="text-[10px] text-muted-foreground">{{ o.sousSysteme ? LIB_SOUS_SYSTEME[o.sousSysteme] : 'diagnostic à établir' }}<span v-if="o.planifieeLe"> · programmée le {{ formatDate(o.planifieeLe) }}</span></p>
              </div>
              <span v-if="store.competenceDe(o)" class="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0" :class="CLS_COMPETENCE[store.competenceDe(o)!]">{{ LIB_COMPETENCE[store.competenceDe(o)!] }}</span>
              <span class="text-[11px] text-muted-foreground shrink-0">{{ o.dureeEstimeeH ? o.dureeEstimeeH + ' h' : '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Compétences requises -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Wrench class="w-4 h-4 text-primary" /> Compétences requises</div>
          <span class="text-[11px] text-muted-foreground">déduites du diagnostic</span>
        </div>
        <table :class="L.table">
          <thead><tr><th :class="L.th">Compétence</th><th :class="L.th">Interventions</th><th :class="L.th">Heures estimées</th></tr></thead>
          <tbody>
            <tr v-for="c in chargeParCompetence" :key="c.competence">
              <td :class="L.td"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="CLS_COMPETENCE[c.competence]">{{ LIB_COMPETENCE[c.competence] }}</span></td>
              <td :class="L.td"><span class="text-xs font-semibold">{{ c.nb }}</span></td>
              <td :class="L.td"><span class="text-xs">{{ c.heures }} h</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Non affectées -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><TriangleAlert class="w-4 h-4 text-primary" /> Non affectées</div>
          <span class="text-[11px]" :class="store.nonAffectees.length ? 'text-warning' : 'text-success'">{{ store.nonAffectees.length }} en attente</span>
        </div>
        <div v-if="!store.nonAffectees.length" class="text-xs text-success py-3">Toutes les interventions sont affectées.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Ordre</th><th :class="L.th">Véhicule</th><th :class="L.th">Priorité</th><th :class="L.th">Compétence</th></tr></thead>
          <tbody>
            <tr v-for="o in store.nonAffectees" :key="o.id">
              <td :class="L.td"><span class="font-mono text-xs">{{ o.reference }}</span></td>
              <td :class="L.td"><span class="font-mono text-xs">{{ o.vehiculePlaque }}</span></td>
              <td :class="L.td"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="LIB_GRAVITE_OT[o.gravite].cls">{{ LIB_GRAVITE_OT[o.gravite].label }}</span></td>
              <td :class="L.td">
                <span v-if="store.competenceDe(o)" class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="CLS_COMPETENCE[store.competenceDe(o)!]">{{ LIB_COMPETENCE[store.competenceDe(o)!] }}</span>
                <span v-else class="text-[11px] text-warning">diagnostic requis</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Immobilisations programmées -->
      <div :class="L.card">
        <div :class="L.cardTitle"><CalendarClock class="w-4 h-4 text-primary" /> Immobilisations programmées</div>
        <div v-if="!programmees.length" class="text-xs text-muted-foreground py-3">Aucune intervention programmée à une date précise.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Date</th><th :class="L.th">Véhicule</th><th :class="L.th">Durée</th></tr></thead>
          <tbody>
            <tr v-for="o in programmees" :key="o.id">
              <td :class="L.td"><span class="text-xs">{{ formatDate(o.planifieeLe!) }}</span></td>
              <td :class="L.td"><span class="font-mono text-xs">{{ o.vehiculePlaque }}</span></td>
              <td :class="L.td"><span class="text-xs">{{ o.dureeEstimeeH ?? '-' }} h</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Planification de la charge de l'atelier, reprise du socle FMS
 * (US 3.4.1). Les compétences sont nommées dans la user story elle-même
 * (mécanique, électricité, pneumatique - la « citerne » du socle FMS retirée) ;
 * la priorité se déduit de la gravité. Le taux d'occupation suppose la
 * capacité de l'atelier, paramétrée dans Paramètres de l'atelier.
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Users, Wrench, TriangleAlert, CalendarClock, Gauge, FileQuestion } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_SOUS_SYSTEME, LIB_GRAVITE_OT, LIB_COMPETENCE } from '../../types/maintenance'
import type { CompetenceAtelier } from '../../types/maintenance'
import { formatDate } from '../../utils/helpers'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()
const cap = computed(() => store.parametresAtelier.capacite)

const clsOccupation = computed(() => {
  const t = store.tauxOccupationSemaine ?? 0
  return t > 100 ? 'text-danger' : t > 90 ? 'text-warning' : 'text-success'
})
const clsBarreOccupation = computed(() => {
  const t = store.tauxOccupationSemaine ?? 0
  return t > 100 ? 'bg-danger' : t > 90 ? 'bg-warning' : 'bg-success'
})

const CLS_PRIORITE: Record<number, string> = { 1: 'bg-danger', 2: 'bg-warning', 3: 'bg-neutral' }
const CLS_COMPETENCE: Record<CompetenceAtelier, string> = {
  mecanique: 'bg-primary/10 text-primary', electricite: 'bg-warning-bg text-warning', pneumatique: 'bg-success-bg text-success',
}

const chargeParCompetence = computed(() => {
  const acc = new Map<CompetenceAtelier, { nb: number; heures: number }>()
  store.ouverts.forEach(o => {
    const c = store.competenceDe(o)
    if (!c) return
    const e = acc.get(c) ?? { nb: 0, heures: 0 }
    e.nb += 1; e.heures += o.dureeEstimeeH ?? 0
    acc.set(c, e)
  })
  return [...acc.entries()].map(([competence, e]) => ({ competence, ...e })).sort((a, b) => b.nb - a.nb)
})

const programmees = computed(() =>
  store.ouverts.filter(o => o.planifieeLe).sort((a, b) => (a.planifieeLe ?? '').localeCompare(b.planifieeLe ?? '')))

const kpis = computed(() => [
  { label: 'Interventions à réaliser', value: String(store.ouverts.length), cls: 'text-foreground' },
  { label: 'Charge estimée', value: store.chargeTotaleH + ' h', cls: 'text-foreground' },
  { label: 'Non affectées', value: String(store.nonAffectees.length), cls: store.nonAffectees.length ? 'text-warning' : 'text-success' },
  { label: 'Taux d\'occupation', value: store.tauxOccupationSemaine != null ? store.tauxOccupationSemaine + ' %' : '-',
    cls: store.tauxOccupationSemaine != null ? clsOccupation.value : 'text-muted-foreground',
    note: store.capaciteRenseignee ? `sur ${store.capaciteHeuresParSemaine} h ouvrables` : 'capacité à renseigner' },
])
</script>
