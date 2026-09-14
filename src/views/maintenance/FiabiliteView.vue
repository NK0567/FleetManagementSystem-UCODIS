<template>
  <div :class="L.pageWrap">
    <div :class="L.pageHeader">
      <div>
        <div :class="L.pageTitle">Fiabilité</div>
        <div :class="L.pageSub">Indicateurs de fiabilité et coûts de maintenance</div>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-3.5">
      <div v-for="k in kpis" :key="k.label" :class="L.kpiCard">
        <p class="text-xl font-bold leading-none" :class="k.cls">{{ k.value }}</p>
        <p class="text-xs text-muted-foreground mt-1">{{ k.label }}</p>
        <p v-if="k.cible" class="text-[11px] text-muted-foreground mt-0.5">{{ k.cible }}</p>
      </div>
    </div>

    <div class="flex gap-1 border-b border-border mb-3.5 overflow-x-auto">
      <button v-for="t in onglets" :key="t.key" @click="onglet = t.key"
        class="px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer bg-transparent"
        :class="onglet === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'">
        {{ t.label }}
      </button>
    </div>

    <div v-if="onglet === 'fiabilite'" class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
      <div :class="L.card">
        <div :class="L.cardTitle"><Gauge class="w-4 h-4 text-primary" /> Indicateurs de fiabilité</div>
        <table :class="L.table">
          <thead><tr><th :class="L.th">Indicateur</th><th :class="L.th">Formule</th><th :class="L.th">Valeur</th></tr></thead>
          <tbody>
            <tr><td :class="L.td"><span class="text-xs font-medium">MTTR</span></td><td :class="L.td"><span class="text-[11px] text-muted-foreground">Durée moyenne ouverture → clôture</span></td><td :class="L.td"><span class="text-xs font-semibold">{{ store.mttrHeures != null ? store.mttrHeures + ' h' : '-' }}</span></td></tr>
            <tr><td :class="L.td"><span class="text-xs font-medium">MTBF</span></td><td :class="L.td"><span class="text-[11px] text-muted-foreground">Kilomètres moyens entre deux pannes</span></td><td :class="L.td"><span class="text-xs font-semibold">{{ store.mtbfKm != null ? store.mtbfKm.toLocaleString('fr-FR') + ' km' : '-' }}</span></td></tr>
            <tr><td :class="L.td"><span class="text-xs font-medium">Ratio préventif</span></td><td :class="L.td"><span class="text-[11px] text-muted-foreground">Préventifs ÷ total des ordres</span></td><td :class="L.td"><span class="text-xs font-semibold" :class="(store.ratioPreventif ?? 0) >= 60 ? 'text-success' : 'text-danger'">{{ store.ratioPreventif != null ? store.ratioPreventif + ' %' : '-' }}</span></td></tr>
            <tr><td :class="L.td"><span class="text-xs font-medium">Taux de disponibilité</span></td><td :class="L.td"><span class="text-[11px] text-muted-foreground">(Jours théoriques − jours perdus) ÷ jours théoriques</span></td><td :class="L.td"><span class="text-xs font-semibold" :class="(tauxDispo ?? 0) >= 80 ? 'text-success' : 'text-danger'">{{ tauxDispo != null ? tauxDispo + ' %' : '-' }}</span></td></tr>
            <tr><td :class="L.td"><span class="text-xs font-medium">Préventif réalisé dans les délais</span></td><td :class="L.td"><span class="text-[11px] text-muted-foreground">Préventifs clôturés ÷ préventifs planifiés</span></td><td :class="L.td"><span class="text-xs font-semibold">{{ store.tauxRealisationPreventif != null ? store.tauxRealisationPreventif + ' %' : '-' }}</span></td></tr>
            <tr><td :class="L.td"><span class="text-xs font-medium">Ratio humain / technique</span></td><td :class="L.td"><span class="text-[11px] text-muted-foreground">Jours perdus humains ÷ techniques</span></td><td :class="L.td"><span class="text-xs font-semibold">{{ store.ratioHumainTechnique ?? '-' }}</span></td></tr>
          </tbody>
        </table>
      </div>

      <div :class="L.card">
        <div :class="L.cardTitle"><AlertTriangle class="w-4 h-4 text-primary" /> Pannes par sous-système</div>
        <div v-if="!store.pannesParSousSysteme.length" class="text-xs text-muted-foreground py-3">Aucune panne corrective enregistrée.</div>
        <div v-else class="flex flex-col gap-2.5">
          <div v-for="p in store.pannesParSousSysteme" :key="p.sousSysteme">
            <div class="flex items-baseline justify-between mb-1"><span class="text-xs text-foreground">{{ LIB_SOUS_SYSTEME[p.sousSysteme] }}</span><span class="text-xs font-semibold">{{ p.nb }}</span></div>
            <div class="h-2 rounded-full bg-background overflow-hidden"><div class="h-full bg-primary rounded-full" :style="{ width: (p.nb / maxPannes * 100) + '%' }" /></div>
          </div>
        </div>
      </div>

      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Gauge class="w-4 h-4 text-primary" /> MTBF par sous-système</div>
          <span class="text-[11px] text-muted-foreground">kilomètres entre deux pannes</span>
        </div>
        <div v-if="!store.mtbfParSousSysteme.length" class="text-xs text-muted-foreground py-3">Pas assez de pannes enregistrées pour calculer un MTBF par organe.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Sous-système</th><th :class="L.th">Pannes</th><th :class="L.th">MTBF</th></tr></thead>
          <tbody>
            <tr v-for="m in store.mtbfParSousSysteme" :key="m.sousSysteme">
              <td :class="L.td"><span class="text-xs">{{ LIB_SOUS_SYSTEME[m.sousSysteme] }}</span></td>
              <td :class="L.td"><span class="text-xs">{{ m.nb }}</span></td>
              <td :class="L.td"><span class="text-xs font-semibold">{{ m.mtbfKm != null ? m.mtbfKm.toLocaleString('fr-FR') + ' km' : 'panne unique' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><CalendarOff class="w-4 h-4 text-primary" /> Jours perdus par cause</div>
          <span class="flex items-center gap-2">
            <MentionSimulation groupe="immobilisation" texte="coût simulé" />
            <span v-if="store.coutTotalImmobilisations != null" class="text-[11px] font-semibold text-danger">{{ fmtAr(store.coutTotalImmobilisations) }}</span>
          </span>
        </div>
        <div class="flex flex-col gap-2.5">
          <div v-for="(jours, famille) in store.joursPerdusParFamille" :key="famille">
            <div class="flex items-baseline justify-between mb-1">
              <span class="text-xs text-foreground">{{ LIB_FAMILLE_INDISPO[famille as FamilleIndispo] }}</span>
              <span class="flex items-baseline gap-2">
                <span v-if="store.coutParFamille" class="text-[11px] text-danger">{{ fmtAr(store.coutParFamille[famille as string] ?? 0) }}</span>
                <span class="text-xs font-semibold">{{ jours }} j</span>
              </span>
            </div>
            <div class="h-2 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="CLS_FAMILLE[famille as FamilleIndispo]" :style="{ width: (totalJours ? (jours as number) / totalJours * 100 : 0) + '%' }" /></div>
          </div>
        </div>
        <p v-if="!store.coutImmoRenseigne" class="text-[11px] text-muted-foreground mt-3">Coût journalier non renseigné. <RouterLink :to="{ name: 'maintenance-parametres' }" class="underline">Paramétrer</RouterLink></p>
      </div>

      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Wrench class="w-4 h-4 text-primary" /> Top véhicules à problèmes</div>
          <span class="text-[11px] text-muted-foreground">par nombre d'interventions</span>
        </div>
        <div v-if="!store.topVehiculesProblematiques.length" class="text-xs text-muted-foreground py-3">Aucune intervention enregistrée.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Véhicule</th><th :class="L.th">Interventions</th><th :class="L.th">dont sur route</th><th :class="L.th">Jours immobilisé</th></tr></thead>
          <tbody>
            <tr v-for="v in store.topVehiculesProblematiques" :key="v.vehiculeId">
              <td :class="L.td"><span class="font-mono text-xs">{{ v.plaque }}</span></td>
              <td :class="L.td"><span class="text-xs font-semibold">{{ v.nb }}</span></td>
              <td :class="L.td"><span class="text-xs" :class="v.surRoute ? 'text-warning' : ''">{{ v.surRoute }}</span></td>
              <td :class="L.td"><span class="text-xs" :class="v.joursImmo > 5 ? 'text-danger font-medium' : ''">{{ v.joursImmo }} j</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div :class="L.card">
        <div :class="L.cardTitle"><Truck class="w-4 h-4 text-primary" /> Pannes sur route vs atelier</div>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <p class="text-2xl font-bold" :class="(store.pannesSurRoute.pct ?? 0) > 30 ? 'text-warning' : 'text-foreground'">{{ store.pannesSurRoute.pct != null ? store.pannesSurRoute.pct + ' %' : '-' }}</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">{{ store.pannesSurRoute.nb }} dépannage(s) sur route sur {{ store.pannesSurRoute.total }} intervention(s) correctives</p>
          </div>
          <div class="h-10 w-10 rounded-full flex items-center justify-center bg-warning-bg shrink-0"><Truck class="w-5 h-5 text-warning" /></div>
        </div>
        <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Un dépannage sur route est une panne non anticipée, traitée en urgence, distinct d'une visite
          programmée à l'atelier. Un taux élevé signale un manque de préventif plutôt qu'un simple aléa.
        </p>
      </div>

      <div :class="L.card">
        <div class="flex items-center justify-between mb-3">
          <div :class="L.cardTitle" class="!mb-0"><Gauge class="w-4 h-4 text-primary" /> Immobilisation rapportée au kilométrage</div>
          <span class="text-[11px] text-muted-foreground">jours perdus / 10 000 km (12 mois)</span>
        </div>
        <div v-if="!vehiculesAvecRatio.length" class="text-xs text-muted-foreground py-3">Pas assez de relevés carburant sur 12 mois pour estimer un kilométrage annuel.</div>
        <table v-else :class="L.table">
          <thead><tr><th :class="L.th">Véhicule</th><th :class="L.th">Km estimés (12 mois)</th><th :class="L.th">Jours perdus / 10 000 km</th></tr></thead>
          <tbody>
            <tr v-for="v in vehiculesAvecRatio" :key="v.vehiculeId">
              <td :class="L.td"><span class="font-mono text-xs">{{ v.plaque }}</span></td>
              <td :class="L.td"><span class="text-xs">{{ v.km!.toLocaleString('fr-FR') }} km</span></td>
              <td :class="L.td"><span class="text-xs font-semibold" :class="v.ratio! > 3 ? 'text-danger' : 'text-foreground'">{{ v.ratio }} j</span></td>
            </tr>
          </tbody>
        </table>
        <p class="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Un véhicule qui roule peu accumule mécaniquement moins de jours perdus en valeur absolue : ce ratio
          le remet à l'échelle de son usage réel plutôt que de le comparer en brut à un véhicule qui parcourt
          deux fois plus de kilomètres.
        </p>
      </div>
    </div>

    <div v-else-if="onglet === 'couts'" :class="L.card">
      <div class="flex items-center justify-between mb-3">
        <div :class="L.cardTitle" class="!mb-0"><Coins class="w-4 h-4 text-primary" /> Coûts par ordre de travail</div>
        <span class="flex items-center gap-2">
          <MentionSimulation groupe="mainOeuvre" texte="tarif horaire simulé" />
          <span class="text-[11px] text-muted-foreground">{{ store.tarifRenseigne ? "pièces, sous-traitance et main-d'œuvre" : 'pièces et sous-traitance' }}</span>
        </span>
      </div>
      <table :class="L.table">
        <thead><tr><th :class="L.th">Ordre</th><th :class="L.th">Véhicule</th><th :class="L.th">Sous-système</th><th :class="L.th">Type</th><th :class="L.th">Pièces</th><th :class="L.th">Sous-traitance</th><th :class="L.th">Main-d'œuvre</th><th :class="L.th">Coût complet</th></tr></thead>
        <tbody>
          <tr v-for="o in ordresParCout" :key="o.id">
            <td :class="L.td"><span class="font-mono text-xs">{{ o.reference }}</span></td>
            <td :class="L.td"><span class="font-mono text-xs">{{ o.vehiculePlaque }}</span></td>
            <td :class="L.td"><span class="text-xs">{{ o.sousSysteme ? LIB_SOUS_SYSTEME[o.sousSysteme] : '-' }}</span></td>
            <td :class="L.td"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="o.typeMaintenance === 'preventif' ? 'bg-success-bg text-success' : 'bg-info-bg text-info'">{{ LIB_TYPE_MAINTENANCE[o.typeMaintenance] }}</span></td>
            <td :class="L.td"><span class="text-xs">{{ store.coutPieces(o) ? fmtAr(store.coutPieces(o)) : '-' }}</span></td>
            <td :class="L.td"><span class="text-xs">{{ store.coutSousTraitance(o) ? fmtAr(store.coutSousTraitance(o)) : '-' }}</span></td>
            <td :class="L.td">
              <span v-if="store.coutMainOeuvre(o) != null" class="text-xs">{{ fmtAr(store.coutMainOeuvre(o)!) }} <span class="text-[10px] text-muted-foreground">({{ store.heuresOT(o) }} h)</span></span>
              <span v-else class="text-[11px] text-warning">{{ store.heuresOT(o) }} h non valorisées</span>
            </td>
            <td :class="L.td"><span class="text-xs font-semibold">{{ fmtAr(store.coutOT(o)) }}</span></td>
          </tr>
        </tbody>
      </table>

      <p class="text-[13px] font-semibold text-foreground mt-5 mb-2">Coût cumulé par véhicule</p>
      <table :class="L.table">
        <thead><tr><th :class="L.th">Véhicule</th><th :class="L.th">Interventions</th><th :class="L.th">Jours immobilisé</th><th :class="L.th">Coût immobilisation</th><th :class="L.th">Coût réparations</th><th :class="L.th">Coût au km</th></tr></thead>
        <tbody>
          <tr v-for="v in store.coutCumuleParVehicule" :key="v.vehiculeId">
            <td :class="L.td"><span class="font-mono text-xs">{{ v.plaque }}</span></td>
            <td :class="L.td"><span class="text-xs">{{ v.nb }}</span></td>
            <td :class="L.td"><span class="text-xs" :class="v.joursImmo > 5 ? 'text-danger font-medium' : ''">{{ v.joursImmo }} j</span></td>
            <td :class="L.td"><span v-if="v.coutImmo != null" class="text-xs text-danger font-medium">{{ fmtAr(v.coutImmo) }}</span><span v-else class="text-muted-foreground">-</span></td>
            <td :class="L.td"><span class="text-xs font-semibold">{{ fmtAr(v.cout) }}</span></td>
            <td :class="L.td"><span class="text-xs">{{ coutKm(v.vehiculeId) != null ? fmtAr(coutKm(v.vehiculeId)!) + ' / km' : '-' }}</span></td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.tarifRenseigne" class="flex items-start gap-2.5 bg-success-bg border border-success/20 rounded-lg px-3.5 py-2.5 mt-3">
        <Coins class="w-4 h-4 shrink-0 mt-px text-success" />
        <p class="text-[11px] text-success leading-relaxed">Main-d'œuvre : {{ fmtAr(store.coutMainOeuvreTotal ?? 0) }}, soit {{ partMainOeuvre }} % du total.</p>
      </div>
      <div v-else class="flex items-start gap-2.5 bg-background border border-border rounded-lg px-3.5 py-2.5 mt-3">
        <FileQuestion class="w-4 h-4 shrink-0 mt-px text-muted-foreground" />
        <p class="text-[11px] text-muted-foreground leading-relaxed">{{ heuresNonValorisees }} h sans tarif horaire. <RouterLink :to="{ name: 'maintenance-parametres' }" class="underline">Paramétrer</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Fiabilité et coûts, repris du socle FMS (US 3.5.1 et 3.5.2). Le
 * tarif horaire et le coût d'immobilisation journalier se paramètrent
 * dans Paramétrage → Paramètres de l'atelier ; tant qu'ils sont vides,
 * le coût reste partiel et l'écran le dit.
 */
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Gauge, AlertTriangle, CalendarOff, Coins, FileQuestion, Wrench, Truck } from '@lucide/vue'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useVehiculeStore } from '../../stores/vehicules'
import MentionSimulation from '../../components/maintenance/MentionSimulation.vue'
import { LIB_SOUS_SYSTEME, LIB_TYPE_MAINTENANCE, LIB_FAMILLE_INDISPO } from '../../types/maintenance'
import type { FamilleIndispo } from '../../types/maintenance'
import * as L from '../../lib/listClasses'

const store = useMaintenanceStore()
const vehicules = useVehiculeStore()
function fmtAr(n: number) { return n.toLocaleString('fr-FR') + ' Ar' }

const onglet = ref<'fiabilite' | 'couts'>('fiabilite')

const CLS_FAMILLE: Record<FamilleIndispo, string> = {
  technique: 'bg-danger', reglementaire: 'bg-warning', administrative: 'bg-info', humaine: 'bg-primary',
}

const heuresNonValorisees = computed(() => store.ordres.reduce((s, o) => s + store.heuresOT(o), 0))
const partMainOeuvre = computed(() => {
  const mo = store.coutMainOeuvreTotal
  if (mo == null || !store.coutTotal) return 0
  return Math.round((mo / store.coutTotal) * 100)
})

const nbVehiculesParc = computed(() => vehicules.liste.length)
const tauxDispo = computed(() => store.tauxDisponibilite(nbVehiculesParc.value))
function coutKm(vehiculeId: string): number | null { return store.coutParKmObserve(vehiculeId) }
const maxPannes = computed(() => Math.max(1, ...store.pannesParSousSysteme.map(p => p.nb)))

const vehiculesAvecRatio = computed(() => {
  const vehiculeIds = new Set(store.ordres.map(o => o.vehiculeId))
  return [...vehiculeIds]
    .map(id => {
      const km = store.kmAnnuelEstime(id)
      const ratio = store.joursImmoPour10000km(id)
      const plaque = store.ordresDuVehicule(id)[0]?.vehiculePlaque ?? id
      return { vehiculeId: id, plaque, km, ratio }
    })
    .filter((v): v is { vehiculeId: string; plaque: string; km: number; ratio: number } => v.km != null && v.ratio != null)
    .sort((a, b) => b.ratio - a.ratio)
})

const totalJours = computed(() => Object.values(store.joursPerdusParFamille).reduce((s, v) => s + v, 0))
const ordresParCout = computed(() => [...store.ordres].sort((a, b) => store.coutOT(b) - store.coutOT(a)))

const onglets = computed(() => [{ key: 'fiabilite' as const, label: 'Fiabilité' }, { key: 'couts' as const, label: 'Coûts' }])

const kpis = computed(() => [
  { label: 'MTTR', value: store.mttrHeures != null ? store.mttrHeures + ' h' : '-', cls: 'text-foreground', cible: '' },
  { label: 'MTBF', value: store.mtbfKm != null ? Math.round(store.mtbfKm / 1000) + 'k km' : '-', cls: 'text-foreground', cible: '' },
  { label: 'Préventif', value: store.ratioPreventif != null ? store.ratioPreventif + ' %' : '-', cls: (store.ratioPreventif ?? 0) >= 60 ? 'text-success' : 'text-danger', cible: 'cible ≥ 60 %' },
  { label: 'Ordres ouverts', value: String(store.ouverts.length), cls: 'text-foreground', cible: '' },
  { label: 'Coût pièces', value: fmtAr(store.coutTotal), cls: 'text-foreground', cible: store.tarifRenseigne ? "main-d'œuvre incluse" : "hors main-d'œuvre" },
  { label: 'Coût immobilisations', value: store.coutTotalImmobilisations != null ? fmtAr(store.coutTotalImmobilisations) : '-', cls: store.coutTotalImmobilisations != null ? 'text-danger' : 'text-muted-foreground', cible: store.coutImmoRenseigne ? '' : 'coût journalier à renseigner' },
])
</script>
