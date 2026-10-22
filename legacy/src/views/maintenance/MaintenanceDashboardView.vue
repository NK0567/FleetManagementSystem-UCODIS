<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Maintenance</div>
        <div :class="L.pageSub">Vue d'ensemble de l'atelier au {{ dateDuJour }}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3.5">
      <div v-for="k in kpis" :key="k.label" :class="L.kpiItem">
        <div :class="[L.kpiItemIcon, k.bg]">
          <component :is="k.icon" class="w-4.5 h-4.5" :class="k.iconColor" />
        </div>
        <div class="min-w-0">
          <p class="text-xl font-bold leading-none truncate" :class="k.cls">{{ k.value }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ k.label }}</p>
          <p v-if="k.cible" class="text-[10px] text-muted-foreground">{{ k.cible }}</p>
        </div>
      </div>
    </div>

    <!-- Indicateurs de maintenance et de fiabilité (FMS-RA-03) -->
    <div :class="L.card" class="mb-3.5">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div :class="L.cardTitle" class="!mb-0"><Gauge class="w-4 h-4 text-primary" /> Indicateurs de maintenance et de fiabilité</div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div v-for="k in indicateurs" :key="k.libelle" class="rounded-md bg-background px-3 py-2.5">
          <p class="text-lg font-bold leading-none" :class="k.cls">{{ k.valeur }}</p>
          <p class="text-[11px] text-muted-foreground mt-1 leading-snug">{{ k.libelle }}</p>
          <p v-if="k.cible" class="text-[10px] text-muted-foreground">{{ k.cible }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">

      <!-- À traiter -->
      <div :class="L.card">
        <div :class="L.cardTitle"><AlertTriangle class="w-4 h-4 text-primary" /> À traiter</div>
        <div class="flex flex-col gap-1.5">
          <button v-for="a in aTraiter" :key="a.libelle"
            class="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left bg-transparent border-0 transition-colors"
            :class="a.actif ? 'cursor-pointer hover:bg-background' : 'cursor-default'"
            @click="a.actif && router.push({ name: a.route })">
            <div class="flex items-start gap-2.5 min-w-0">
              <component :is="a.icon" class="w-4 h-4 shrink-0 mt-px" :class="a.nb ? a.cls : 'text-muted-foreground'" />
              <div class="min-w-0">
                <p class="text-xs font-medium text-foreground">{{ a.libelle }}</p>
                <p class="text-[11px] text-muted-foreground">{{ a.detail }}</p>
              </div>
            </div>
            <span class="text-sm font-bold shrink-0" :class="a.nb ? a.cls : 'text-muted-foreground'">{{ a.nb }}</span>
          </button>
        </div>
      </div>

      <!-- Interventions en cours -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Wrench class="w-4 h-4 text-primary" /> Interventions en cours</div>
          <button :class="L.btnOutline" @click="router.push({ name: 'maintenance-ordres' })">Tout voir</button>
        </div>
        <div v-if="!store.ouverts.length" class="text-xs text-muted-foreground py-3">Aucune intervention en cours.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Ordre</th><th :class="L.th">Véhicule</th><th :class="L.th">Diagnostic</th><th :class="L.th">Statut</th></tr></thead>
          <tbody>
            <tr v-for="o in store.ouverts.slice(0, 6)" :key="o.id">
              <td :class="L.td"><span class="font-mono text-xs">{{ o.reference }}</span></td>
              <td :class="L.td"><span class="font-mono text-xs">{{ o.vehiculePlaque }}</span></td>
              <td :class="L.td"><span class="text-xs">{{ o.sousSysteme ? LIB_SOUS_SYSTEME[o.sousSysteme] : '-' }}</span></td>
              <td :class="L.td"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="CLS_STATUT[o.statut]">{{ LIB_STATUT_OT[o.statut] }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Véhicules immobilisés -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Véhicules indisponibles</div>
          <button v-if="params.estActif('maintenance_indisponibilites')" :class="L.btnOutline" @click="router.push({ name: 'maintenance-indisponibilites' })">Tout voir</button>
        </div>
        <div v-if="!store.indisposEnCours.length" class="text-xs text-success py-3">Aucun véhicule indisponible.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Véhicule</th><th :class="L.th">Cause</th><th :class="L.th">Depuis</th></tr></thead>
          <tbody>
            <tr v-for="i in store.indisposEnCours" :key="i.id">
              <td :class="L.td"><span class="font-mono text-xs">{{ i.vehiculePlaque }}</span></td>
              <td :class="L.td">
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-danger-bg text-danger">{{ i.code }}</span>
                <div class="text-[11px] text-muted-foreground">{{ libelleDuCode(i.code) }}</div>
              </td>
              <td :class="L.td"><span class="text-xs font-medium" :class="store.dureeIndispo(i) > 3 ? 'text-danger' : 'text-foreground'">{{ store.dureeIndispo(i) }} j</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modes de défaillance et causes racines -->
      <div :class="L.card">
        <div :class="L.cardTitle"><AlertTriangle class="w-4 h-4 text-primary" /> Modes de défaillance et causes racines</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Modes les plus fréquents</p>
            <p v-if="!store.modesFrequents.length" class="text-xs text-muted-foreground">Aucun diagnostic enregistré.</p>
            <div v-for="m in store.modesFrequents.slice(0, 5)" :key="m.code" class="flex justify-between text-xs py-1 border-b border-border/60"><span>{{ LIB_MODE_DEFAILLANCE[m.code] ?? m.code }}</span><span class="font-semibold">{{ m.nb }}</span></div>
          </div>
          <div>
            <p class="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Causes racines</p>
            <p v-if="!store.causesRacines.length" class="text-xs text-muted-foreground">Aucune cause renseignée.</p>
            <div v-for="c in store.causesRacines.slice(0, 5)" :key="c.code" class="flex justify-between text-xs py-1 border-b border-border/60"><span>{{ LIB_CAUSE_RACINE[c.code] ?? c.code }}</span><span class="font-semibold">{{ c.nb }}</span></div>
          </div>
        </div>
      </div>

      <!-- Coûts préventif et correctif, jours perdus -->
      <div :class="L.card">
        <div :class="L.cardTitle"><PackageSearch class="w-4 h-4 text-primary" /> Coût préventif et correctif</div>
        <div v-for="t in coutsParType" :key="t.libelle" class="mb-2.5">
          <div class="flex items-baseline justify-between mb-1"><span class="text-xs">{{ t.libelle }}</span><span class="text-xs font-semibold">{{ t.montant.toLocaleString('fr-FR') }} {{ $devise() }} · {{ t.pct }} %</span></div>
          <div class="h-2 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="t.barre" :style="{ width: t.pct + '%' }" /></div>
        </div>
        <div class="flex items-center justify-between rounded-md bg-background px-3 py-2 mt-3">
          <span class="text-xs">Jours perdus pour cause humaine rapportés aux jours perdus pour cause technique</span>
          <span class="text-sm font-bold">{{ store.ratioHumainTechnique ?? '-' }}</span>
        </div>
        <p class="text-[11px] text-muted-foreground mt-1">{{ store.joursPerdusParFamille.humaine ?? 0 }} j humains, {{ store.joursPerdusParFamille.technique ?? 0 }} j techniques</p>
      </div>

      <!-- Pannes par sous-système -->
      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Gauge class="w-4 h-4 text-primary" /> Pannes par sous-système</div>
        </div>
        <div v-if="!store.pannesParSousSysteme.length" class="text-xs text-muted-foreground py-3">Aucune panne corrective enregistrée.</div>
        <div v-else class="flex flex-col gap-2.5">
          <div v-for="p in store.pannesParSousSysteme.slice(0, 6)" :key="p.sousSysteme">
            <div class="flex items-baseline justify-between mb-1">
              <span class="text-xs text-foreground">{{ LIB_SOUS_SYSTEME[p.sousSysteme] }}</span>
              <span class="text-xs font-semibold">{{ p.nb }}</span>
            </div>
            <div class="h-2 rounded-full bg-background overflow-hidden"><div class="h-full bg-primary rounded-full" :style="{ width: (p.nb / maxPannes * 100) + '%' }" /></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { devise } from '../../lib/monnaie'
import { aujourdhuiDate } from '../../utils/horloge'
import { useIndicateursStore } from '../../stores/indicateurs'
import { useCodificationIndispoStore } from '../../stores/codificationIndispo'
const libelleDuCode = (c: string) => useCodificationIndispoStore().libelleDuCode(c)
/**
 * Vue d'ensemble du module Maintenance. Chaque bloc renvoie vers l'écran
 * détaillé correspondant, s'il est activé.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Wrench, Gauge, AlertTriangle, CalendarOff, CalendarClock, PackageSearch } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import { useParametresModulesStore } from '../../stores/parametresModules'
import { LIB_SOUS_SYSTEME, LIB_STATUT_OT, LIB_MODE_DEFAILLANCE, LIB_CAUSE_RACINE } from '../../types/maintenance'
import type { StatutOT } from '../../types/maintenance'
import * as L from '../../lib/listClasses'

const router = useRouter()
const store = useMaintenanceStore()

const dateDuJour = aujourdhuiDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

const CLS_STATUT: Record<StatutOT, string> = {
  ouvert: 'bg-info-bg text-info', diagnostique: 'bg-primary/10 text-primary',
  attente_piece: 'bg-warning-bg text-warning', en_cours: 'bg-primary/10 text-primary',
  attente_validation: 'bg-warning-bg text-warning', cloture: 'bg-success-bg text-success',
  annule: 'bg-neutral-bg text-neutral',
}

const vehiculesStore = useVehiculeStore()
const echeancesDepassees = computed(() => vehiculesStore.liste.filter(v => v.statut !== 'sorti').flatMap(v => store.echeancesDe(v)).filter(e => e.statut === 'depassee').length)
const sansDiagnostic = computed(() => store.ouverts.filter(o => !store.diagnosticComplet(o)).length)

const params = useParametresModulesStore()
const aTraiter = computed(() => [
  { libelle: 'Échéances dépassées', detail: 'Entretiens préventifs en retard', nb: echeancesDepassees.value, icon: CalendarClock, cls: 'text-danger', route: 'maintenance-echeances', actif: params.estActif('maintenance_echeances') },
  { libelle: 'En attente de pièce', detail: 'Véhicules indisponibles faute de pièce', nb: store.enAttentePiece.length, icon: PackageSearch, cls: 'text-warning', route: 'maintenance-ordres', actif: true },
  { libelle: 'Diagnostic à établir', detail: 'Ordres ouverts sans diagnostic complet', nb: sansDiagnostic.value, icon: Wrench, cls: 'text-warning', route: 'maintenance-ordres', actif: true },
])

const maxPannes = computed(() => Math.max(1, ...store.pannesParSousSysteme.map(p => p.nb)))

const ind = useIndicateursStore()
const coutsParType = computed(() => {
  const c = store.coutParType; const total = c.preventif + c.correctif
  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0
  return [
    { libelle: 'Préventif', montant: c.preventif, pct: pct(c.preventif), barre: 'bg-success' },
    { libelle: 'Correctif', montant: c.correctif, pct: pct(c.correctif), barre: 'bg-warning' },
  ]
})
const pctOuTiret = (n: number | null) => n != null ? n + ' %' : '-'
const indicateurs = computed(() => [
  { libelle: 'Planifiées à venir', valeur: String(store.otPlanifies.length), cls: 'text-foreground', cible: '' },
  { libelle: 'En retard sur leur date planifiée', valeur: String(store.otEnRetard.length), cls: store.otEnRetard.length ? 'text-danger' : 'text-success', cible: '' },
  { libelle: ind.libelle('realisationPreventif'), valeur: pctOuTiret(store.tauxRealisationPreventif), cls: ind.couleur('realisationPreventif', store.tauxRealisationPreventif), cible: ind.texteCible('realisationPreventif') },
  { libelle: ind.libelle('coutKm'), valeur: store.coutParKmParc != null ? `${store.coutParKmParc.toLocaleString('fr-FR')} ${devise()}/km` : '-', cls: ind.couleur('coutKm', store.coutParKmParc), cible: ind.texteCible('coutKm') },
  { libelle: ind.libelle('mtbf'), valeur: store.mtbfKm != null ? store.mtbfKm.toLocaleString('fr-FR') + ' km' : '-', cls: ind.couleur('mtbf', store.mtbfKm), cible: ind.texteCible('mtbf') },
])
const kpis = computed(() => [
  { label: 'Interventions en cours', value: String(store.ouverts.length), icon: Wrench, bg: 'bg-primary/10', iconColor: 'text-primary', cls: 'text-foreground' },
  { label: 'Véhicules indisponibles', value: String(store.indisposEnCours.length), icon: CalendarOff, bg: 'bg-danger-bg', iconColor: 'text-danger', cls: store.indisposEnCours.length ? 'text-danger' : 'text-success' },
  { label: ind.libelle('mttr'), value: store.mttrHeures != null ? store.mttrHeures + ' h' : '-', icon: Gauge, bg: 'bg-info-bg', iconColor: 'text-info', cls: ind.couleur('mttr', store.mttrHeures), cible: ind.texteCible('mttr') },
  { label: `${ind.libelle('preventif')}, le reste en correctif`, value: store.ratioPreventif != null ? store.ratioPreventif + ' %' : '-', icon: AlertTriangle, bg: 'bg-success-bg', iconColor: 'text-success', cls: ind.couleur('preventif', store.ratioPreventif), cible: ind.texteCible('preventif') },
  { label: 'Coût des interventions', value: (store.coutTotal).toLocaleString('fr-FR') + ' ' + devise(), icon: PackageSearch, bg: 'bg-neutral-bg', iconColor: 'text-neutral', cls: 'text-foreground' },
])
</script>
