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
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">

      <!-- À traiter -->
      <div :class="L.card">
        <div :class="L.cardTitle"><AlertTriangle class="w-4 h-4 text-primary" /> À traiter</div>
        <div class="flex flex-col gap-1.5">
          <button v-for="a in aTraiter" :key="a.libelle"
            class="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left bg-transparent border-0 cursor-pointer transition-colors hover:bg-background"
            @click="router.push({ name: a.route })">
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
          <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Véhicules immobilisés</div>
          <button :class="L.btnOutline" @click="router.push({ name: 'maintenance-indisponibilites' })">Tout voir</button>
        </div>
        <div v-if="!store.indisposEnCours.length" class="text-xs text-success py-3">Aucun véhicule immobilisé.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Véhicule</th><th :class="L.th">Motif</th><th :class="L.th">Depuis</th></tr></thead>
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
/**
 * Vue d'ensemble du module Maintenance, reprise du socle FMS.
 * Chaque bloc renvoie vers l'écran détaillé correspondant.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Wrench, Gauge, AlertTriangle, CalendarOff, CalendarClock, PackageSearch } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { LIB_SOUS_SYSTEME, LIB_STATUT_OT, libelleDuCode } from '../../types/maintenance'
import type { StatutOT } from '../../types/maintenance'
import * as L from '../../lib/listClasses'

const router = useRouter()
const store = useMaintenanceStore()

const dateDuJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

const CLS_STATUT: Record<StatutOT, string> = {
  ouvert: 'bg-info-bg text-info', diagnostique: 'bg-primary/10 text-primary',
  attente_piece: 'bg-warning-bg text-warning', en_cours: 'bg-primary/10 text-primary',
  attente_validation: 'bg-warning-bg text-warning', cloture: 'bg-success-bg text-success',
  annule: 'bg-neutral-bg text-neutral',
}

const sansDiagnostic = computed(() => store.ouverts.filter(o => !o.sousSysteme || !o.modeDefaillance || !o.causeRacine).length)

const aTraiter = computed(() => [
  { libelle: 'Échéances dépassées', detail: 'Entretiens préventifs en retard', nb: 0, icon: CalendarClock, cls: 'text-danger', route: 'maintenance-echeances' },
  { libelle: 'En attente de pièce', detail: 'Véhicules immobilisés faute de pièce', nb: store.enAttentePiece.length, icon: PackageSearch, cls: 'text-warning', route: 'maintenance-ordres' },
  { libelle: 'Diagnostic à établir', detail: 'La clôture reste impossible sans lui', nb: sansDiagnostic.value, icon: Wrench, cls: 'text-warning', route: 'maintenance-ordres' },
])

const maxPannes = computed(() => Math.max(1, ...store.pannesParSousSysteme.map(p => p.nb)))

const kpis = computed(() => [
  { label: 'Interventions en cours', value: String(store.ouverts.length), icon: Wrench, bg: 'bg-primary/10', iconColor: 'text-primary', cls: 'text-foreground' },
  { label: 'Véhicules immobilisés', value: String(store.indisposEnCours.length), icon: CalendarOff, bg: 'bg-danger-bg', iconColor: 'text-danger', cls: store.indisposEnCours.length ? 'text-danger' : 'text-success' },
  { label: 'MTTR', value: store.mttrHeures != null ? store.mttrHeures + ' h' : '-', icon: Gauge, bg: 'bg-info-bg', iconColor: 'text-info', cls: 'text-foreground' },
  { label: 'Préventif', value: store.ratioPreventif != null ? store.ratioPreventif + ' %' : '-', icon: AlertTriangle, bg: 'bg-success-bg', iconColor: 'text-success', cls: (store.ratioPreventif ?? 0) >= 60 ? 'text-success' : 'text-danger' },
  { label: 'Coût pièces', value: (store.coutTotal).toLocaleString('fr-FR') + ' Ar', icon: PackageSearch, bg: 'bg-neutral-bg', iconColor: 'text-neutral', cls: 'text-foreground' },
])
</script>
