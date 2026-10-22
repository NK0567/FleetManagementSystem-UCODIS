<template>
  <div class="px-7 py-6 max-w-[1400px] mx-auto w-full max-[640px]:px-4">

    <div class="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
      <div>
        <div class="text-lg font-semibold">Vue d'ensemble</div>
        <div class="text-[13px] text-muted-foreground mt-px">{{ dateDuJour }}</div>
      </div>
      <RouterLink :to="{ name: 'flotte-carte' }" :class="btnPrimary">
        <Activity class="w-4 h-4" /> Temps réel
      </RouterLink>
    </div>

    <!-- Indicateurs avec barre de progression, comme la référence -->
    <div class="grid grid-cols-4 gap-2.5 mb-3.5 max-lg:grid-cols-2">
      <div :class="kpiCard">
        <div class="flex items-start justify-between mb-1">
          <div :class="kpiLabel">Véhicules motorisés disponibles</div>
          <div :class="kpiAccent" class="bg-info-bg"><Truck class="w-[17px] h-[17px] text-info" /></div>
        </div>
        <div :class="kpiValue">{{ tracteursActifs }}</div>
        <div :class="kpiSub">sur {{ vehicules.tracteurs.length }} au total</div>
        <div :class="barreFond"><div :class="barreRemplie" class="bg-info" :style="{ width: pct(tracteursActifs, vehicules.tracteurs.length) + '%' }"></div></div>
      </div>
      <div :class="kpiCard">
        <div class="flex items-start justify-between mb-1">
          <div :class="kpiLabel">Véhicules tractés disponibles</div>
          <div :class="kpiAccent" class="bg-info-bg"><Container class="w-[17px] h-[17px] text-info" /></div>
        </div>
        <div :class="kpiValue">{{ semisActives }}</div>
        <div :class="kpiSub">sur {{ vehicules.semiRemorques.length }} au total</div>
        <div :class="barreFond"><div :class="barreRemplie" class="bg-info" :style="{ width: pct(semisActives, vehicules.semiRemorques.length) + '%' }"></div></div>
      </div>
      <div :class="kpiCard">
        <div class="flex items-start justify-between mb-1">
          <div :class="kpiLabel">Conducteurs disponibles</div>
          <div :class="kpiAccent" class="bg-success-bg"><Users class="w-[17px] h-[17px] text-success" /></div>
        </div>
        <div :class="kpiValue">{{ conducteursDisponibles }}</div>
        <div :class="kpiSub">sur {{ personnel.conducteurs.length }} au total</div>
        <div :class="barreFond"><div :class="barreRemplie" class="bg-success" :style="{ width: pct(conducteursDisponibles, personnel.conducteurs.length) + '%' }"></div></div>
      </div>
      <div :class="kpiCard">
        <div class="flex items-start justify-between mb-1">
          <div :class="kpiLabel">Alertes documents</div>
          <div :class="kpiAccent" class="bg-danger-bg"><FileWarning class="w-[17px] h-[17px] text-danger" /></div>
        </div>
        <div :class="kpiValue" class="!text-danger">{{ docsVehicule.alertesActives.length }}</div>
        <div :class="kpiSub">nécessitent attention</div>
        <div class="text-[11px] text-danger mt-1.5 flex items-center gap-1">
          <TriangleAlert class="w-3 h-3" /> {{ docsVehicule.critiques.length }} critiques · {{ docsVehicule.avertissements.length }} avertissements
        </div>
      </div>
    </div>

    <!-- Disponibilité du parc (FMS-RA-01) -->
    <div class="bg-card border border-border rounded-lg p-4 mb-3.5">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Gauge class="w-4 h-4 text-primary" /> Disponibilité du parc</div>
        <RouterLink :to="{ name: 'flotte-rapports' }" class="text-[11px] font-semibold text-primary no-underline hover:underline">Rapports</RouterLink>
      </div>
      <div class="grid grid-cols-5 gap-3 max-lg:grid-cols-2">
        <div>
          <div class="text-[24px] font-semibold leading-none" :class="ind.couleur('disponibilite', tauxDispo)">{{ tauxDispo != null ? tauxDispo + ' %' : '-' }}</div>
          <div class="text-[12px] text-muted-foreground mt-1">{{ ind.libelle('disponibilite') }} sur 30 jours</div>
          <div v-if="ind.texteCible('disponibilite')" class="text-[11px] text-muted-foreground">{{ ind.texteCible('disponibilite') }}</div>
        </div>
        <div><div class="text-[24px] font-semibold leading-none text-success">{{ parc.disponibles }}</div><div class="text-[12px] text-muted-foreground mt-1">Disponibles</div></div>
        <div><div class="text-[24px] font-semibold leading-none text-primary">{{ parc.enMission }}</div><div class="text-[12px] text-muted-foreground mt-1">En mission</div></div>
        <div><div class="text-[24px] font-semibold leading-none" :class="parc.immobilises.length ? 'text-danger' : 'text-foreground'">{{ parc.immobilises.length }}</div><div class="text-[12px] text-muted-foreground mt-1">Immobilisés</div></div>
        <div>
          <div class="text-[24px] font-semibold leading-none">{{ parc.ageMoyen != null ? parc.ageMoyen.toLocaleString('fr-FR') + ' ans' : '-' }}</div>
          <div class="text-[12px] text-muted-foreground mt-1">{{ ind.libelle('ageMoyen') }}</div>
          <div v-if="ind.texteCible('ageMoyen')" class="text-[11px]" :class="ind.couleur('ageMoyen', parc.ageMoyen)">{{ ind.texteCible('ageMoyen') }}</div>
        </div>
      </div>
    </div>

    <!-- Situation de la flotte, comme sur la carte : chaque situation ouvre la carte filtrée -->
    <div class="bg-card border border-border rounded-lg p-4 mb-3.5">
      <div class="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3">
        <Activity class="w-4 h-4 text-primary" /> État de mouvement
      </div>
      <div class="flex gap-2.5 flex-wrap">
        <RouterLink v-for="s in SITUATIONS" :key="s" :to="{ name: 'flotte-carte', query: { situation: s } }"
              class="inline-flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-[13px] font-medium no-underline hover:opacity-80"
              :class="CLS_SITUATION[s]">
          {{ LIB_SITUATION[s] }}
          <span class="text-[11px] font-bold rounded-full px-1.5 py-px bg-card/60">{{ situations.compte.value[s] }}</span>
        </RouterLink>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 max-lg:grid-cols-1">

      <!-- Dernières alertes -->
      <div :class="card">
        <div class="flex items-center justify-between mb-3">
          <div :class="cardTitle" class="!mb-0"><TriangleAlert class="w-4 h-4 text-danger" /> Dernières alertes</div>
          <RouterLink :to="{ name: 'flotte-alertes' }" class="text-[11px] font-semibold text-muted-foreground bg-background rounded-full px-2 py-0.5 no-underline hover:text-primary">{{ alertes.enCours.length }} alertes</RouterLink>
        </div>
        <div class="flex flex-col gap-0.5 max-h-[360px] overflow-y-auto">
          <RouterLink v-for="a in alertesTriees" :key="a.cle" :to="{ name: 'flotte-alertes', query: { alerte: a.cle } }" class="flex items-center gap-3 py-2.5 border-b border-border last:border-0 no-underline hover:bg-background">
            <span class="w-2 h-2 rounded-full shrink-0" :class="a.gravite === 'critique' ? 'bg-danger' : 'bg-warning'"></span>
            <div class="min-w-0 flex-1">
              <div class="text-[13px] font-semibold text-foreground">{{ a.titre }}</div>
              <div class="text-[11px] text-muted-foreground">{{ a.message }}</div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  :class="a.gravite === 'critique' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">
              {{ a.gravite === 'critique' ? 'Critique' : 'Avertissement' }}
            </span>
          </RouterLink>
          <div v-if="alertesTriees.length === 0" class="text-center text-muted-foreground text-[13px] py-8">Aucune alerte en cours.</div>
        </div>
      </div>

      <!-- Véhicules récents -->
      <div :class="card">
        <div class="flex items-center justify-between mb-3">
          <div :class="cardTitle" class="!mb-0"><MapPin class="w-4 h-4 text-primary" /> Véhicules suivis</div>
          <RouterLink :to="{ name: 'flotte-carte' }" class="text-[11px] font-semibold text-primary no-underline hover:underline">Voir sur la carte</RouterLink>
        </div>
        <div class="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                <th class="pb-2 font-semibold">Véhicule</th>
                <th class="pb-2 font-semibold">Conducteur</th>
                <th class="pb-2 font-semibold">Statut</th>
                <th class="pb-2 font-semibold">Dernière position</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in vehiculesSuivis" :key="t.id" class="border-t border-border cursor-pointer hover:bg-background"
                  @click="router.push({ name: 'flotte-vehicules', query: { vehicule: t.id } })">
                <td class="py-2 font-mono font-semibold text-primary">{{ t.immatriculation }}</td>
                <td class="py-2 text-muted-foreground truncate max-w-[110px]">{{ conducteurDe(t.id) ?? '-' }}</td>
                <td class="py-2">
                  <span class="text-[10px] font-medium px-1.5 py-px rounded-full" :style="{ background: couleurOp(t.id) + '22', color: couleurOp(t.id) }">
                    {{ libelleOp(t.id) }}
                  </span>
                </td>
                <td class="py-2 text-muted-foreground flex items-center gap-1"><MapPin class="w-3 h-3 shrink-0" /> {{ positionApprox(t.id) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="vehicules.immobilises.length" class="bg-card border border-danger/25 rounded-lg overflow-hidden mt-3 mb-3">
      <div class="flex items-center gap-2 px-4 py-2.5 bg-danger-bg border-b border-danger/15">
        <TriangleAlert class="w-4 h-4 text-danger shrink-0" />
        <span class="text-[13px] font-semibold text-danger">{{ vehicules.immobilises.length }} véhicule(s) immobilisé(s)</span>
      </div>
      <div class="divide-y divide-border">
        <RouterLink v-for="v in vehicules.immobilises" :key="v.id" :to="{ name: 'flotte-vehicules', query: { vehicule: v.id } }"
                    class="flex items-center gap-3 px-4 py-2.5 no-underline text-foreground hover:bg-background">
          <div class="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0"><Truck class="w-4 h-4 text-muted-foreground" /></div>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-medium truncate">{{ v.immatriculation }} · {{ v.marque }} {{ v.modele }}</div>
            <div class="text-[11px] text-muted-foreground">{{ v.motifIndisponibilite }}</div>
          </div>
          <StatusPill :statut="v.statut" :libelle="vehicules.LIBELLES_STATUT[v.statut]" />
        </RouterLink>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 max-lg:grid-cols-1 mb-3">
      <!-- Attelages et conducteurs -->
      <div :class="card" class="col-span-2 max-lg:col-span-1">
        <div :class="cardTitle"><Link2 class="w-4 h-4 text-primary" /> Attelages et conducteurs</div>
        <div class="flex flex-col gap-2 max-h-[340px] overflow-y-auto">
          <div v-for="tr in vehicules.tracteurs" :key="tr.id" class="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
            <span class="font-mono text-xs font-semibold text-primary w-[85px] shrink-0">{{ tr.immatriculation }}</span>
            <StatusPill :statut="tr.statut" :libelle="vehicules.LIBELLES_STATUT[tr.statut]" />
            <ArrowRight class="w-3 h-3 text-muted-foreground shrink-0" />
            <span class="text-[12px] flex-1 min-w-0 truncate">
              <template v-if="attelageDe(tr.id)">{{ semiDe(tr.id) }}</template>
              <template v-else><span class="italic text-muted-foreground">Non attelé</span></template>
            </span>
            <UserAvatar v-if="conducteurDe(tr.id)" :nom="conducteurDe(tr.id)!" taille="sm" />
            <span class="text-[12px] text-muted-foreground w-[140px] shrink-0 truncate">
              {{ conducteurDe(tr.id) ?? 'Non affecté' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Répartition du parc -->
      <div :class="card">
        <div :class="cardTitle"><ChartColumn class="w-4 h-4 text-primary" /> Répartition du parc</div>
        <div class="flex flex-col gap-2.5">
          <div v-for="s in repartitionParc" :key="s.statut" class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full shrink-0" :class="s.couleur"></span>
            <span class="text-[13px] flex-1">{{ vehicules.LIBELLES_STATUT[s.statut] }}</span>
            <span class="text-[13px] font-semibold tabular-nums">{{ s.nb }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useSituationsFlotte, LIB_SITUATION, CLS_SITUATION, SITUATIONS } from '../../composables/situationsFlotte'
import { Activity, ArrowRight, Gauge, ChartColumn, Container, FileWarning, Link2, MapPin, TriangleAlert, Truck, Users } from '@lucide/vue'
import StatusPill from '../../components/ui/StatusPill.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useIndicateursStore } from '../../stores/indicateurs'
import { useReportingStore } from '../../stores/reporting'
import { useMaintenanceStore } from '../../stores/maintenance'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useDisponibilitesStore } from '../../stores/disponibilites'
import { useAlertesStore } from '../../stores/alertes'
import { useTelematiqueStore } from '../../stores/telematique'
import { aujourdhuiDate } from '../../utils/horloge'
import type { StatutOperationnel } from '../../stores/vehicules'

const vehicules = useVehiculeStore()
const ind = useIndicateursStore()
const reporting = useReportingStore()
const maintenance = useMaintenanceStore()
/** Disponibilité du parc (FMS-RA-01) : même calcul que les rapports et la fiabilité. */
const parc = computed(() => reporting.etatDuParc())
const tauxDispo = computed(() => maintenance.tauxDisponibilite(parc.value.total))
const personnel = usePersonnelStore()
const docsVehicule = useDocumentsVehiculeStore()
const alertes = useAlertesStore()
const dispos = useDisponibilitesStore()
const telematique = useTelematiqueStore()
/** Mêmes situations que la carte temps réel. */
const situations = useSituationsFlotte()
const router = useRouter()

const btnPrimary = 'px-4 py-[7px] rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 bg-primary text-primary-foreground no-underline transition-colors hover:bg-primary/90'
const kpiCard = 'bg-card border border-border rounded-lg px-3.5 py-3'
const kpiAccent = 'w-8 h-8 rounded-md flex items-center justify-center shrink-0'
const kpiLabel = 'text-[13px] text-muted-foreground'
const kpiValue = 'text-[28px] font-semibold leading-none mt-1'
const kpiSub = 'text-xs text-muted-foreground mt-[3px] mb-2'
const barreFond = 'h-1.5 rounded-full bg-background overflow-hidden'
const barreRemplie = 'h-full rounded-full transition-all'
const card = 'bg-card border border-border rounded-lg p-3.5'
const cardTitle = 'flex items-center gap-1.5 text-sm font-semibold text-foreground mb-3'

const dateDuJour = computed(() => aujourdhuiDate().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
function pct(n: number, total: number) { return total > 0 ? Math.round((n / total) * 100) : 0 }

/** Disponible : même définition que le bloc « Disponibles » (libre ou affecté, hors mission et hors immobilisation). */
const estDisponible = (v: { statut: string }) => v.statut === 'disponible' || v.statut === 'affecte'
const tracteursActifs = computed(() => vehicules.tracteurs.filter(estDisponible).length)
const semisActives = computed(() => vehicules.semiRemorques.filter(estDisponible).length)
const conducteursDisponibles = computed(() => personnel.conducteurs.filter(c => dispos.disponibilite(c.id).etat === 'disponible' && dispos.eligibilite(c.id).ok).length)

const COULEURS_OP: Record<StatutOperationnel, string> = {
  en_mouvement: '#16a34a', arrete: '#6b7280', allume_immobile: '#ca8a04', signal_perdu: '#dc2626',
}
const LIBELLES_OP: Record<StatutOperationnel, string> = {
  en_mouvement: 'En mouvement', arrete: 'Arrêté', allume_immobile: 'Allumé / Immobile', signal_perdu: 'Signal perdu',
}
function couleurOp(id: string) { return COULEURS_OP[vehicules.statutsOp[id] ?? 'arrete'] }
function libelleOp(id: string) { return LIBELLES_OP[vehicules.statutsOp[id] ?? 'arrete'] }

function conducteurDe(vehiculeId: string) {
  const af = vehicules.affectationActive(vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
}

function positionApprox(vehiculeId: string) {
  const pos = vehicules.positions[vehiculeId]
  if (!pos || !vehicules.aBoitier(vehiculeId)) return '-'
  return telematique.lieuDe(pos)
}

/** Véhicules équipés d'un boîtier, donc suivis par la télématique. */
const vehiculesSuivis = computed(() => vehicules.tracteurs.filter(t => vehicules.aBoitier(t.id)))

function attelageDe(tracteurId: string) { return vehicules.attelageActif(tracteurId) }
function semiDe(tracteurId: string) {
  const at = vehicules.attelageActif(tracteurId)
  if (!at) return null
  return vehicules.parId(at.semiRemorqueId)?.immatriculation ?? null
}

const COULEURS_STATUT: Record<string, string> = {
  disponible: 'bg-success', affecte: 'bg-info', en_mission: 'bg-primary', en_maintenance: 'bg-warning',
  immobilise: 'bg-danger', hors_service: 'bg-danger', sorti: 'bg-neutral',
}
const repartitionParc = computed(() => {
  const ordre: Array<keyof typeof vehicules.LIBELLES_STATUT> = ['disponible', 'affecte', 'en_mission', 'en_maintenance', 'immobilise', 'hors_service', 'sorti']
  return ordre
    .map(statut => ({ statut, nb: vehicules.liste.filter(v => v.statut === statut).length, couleur: COULEURS_STATUT[statut] }))
    .filter(s => s.nb > 0)
})

const alertesTriees = computed(() =>
  [...alertes.enCours].sort((a, b) => (a.gravite === 'critique' ? 0 : 1) - (b.gravite === 'critique' ? 0 : 1)).slice(0, 8),
)
</script>
