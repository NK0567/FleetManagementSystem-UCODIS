<template>
  <div class="px-7 py-6 h-[calc(100vh-56px)] max-[900px]:h-auto">
    <div class="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
      <div>
        <div class="text-lg font-semibold">Carte temps réel</div>
        <div class="text-[13px] text-muted-foreground mt-px">Position du parc en circulation</div>
      </div>
    </div>

    <!-- Situation de la flotte en temps réel (FMS-GP-05) : un clic filtre la liste et la carte -->
    <div class="grid grid-cols-5 gap-2.5 mb-3.5 max-md:grid-cols-2">
      <button v-for="k in kpisSituation" :key="k.s" type="button"
              :class="[L.kpiItem, situation === k.s && 'ring-1 ring-primary']" class="cursor-pointer text-left"
              @click="situation = situation === k.s ? '' : k.s">
        <div :class="[L.kpiItemIcon, k.bg]"><component :is="k.icon" class="w-[18px] h-[18px]" :class="k.iconColor" /></div>
        <div><div :class="L.kpiItemVal">{{ situations.compte.value[k.s] }}</div><div :class="L.kpiItemLbl">{{ LIB_SITUATION[k.s] }}</div></div>
      </button>
    </div>

    <div class="flex h-[calc(100%-180px)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-card shadow-sm max-[900px]:flex-col max-[900px]:h-auto">

      <!-- Panneau gauche : liste des tracteurs -->
      <div class="w-[280px] shrink-0 flex flex-col border-r border-border overflow-hidden max-[900px]:w-full max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:max-h-[300px]">
        <div class="px-3.5 pt-3.5 pb-2.5 border-b border-border">
          <div class="flex items-center gap-2 mb-2">
            <Truck class="w-4 h-4 text-primary shrink-0" />
            <span class="text-[13px] font-semibold text-foreground">Flotte</span>
            <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {{ tracteursFiltres.length }}/{{ vehicules.tracteurs.length }}
            </span>
          </div>
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input v-model="recherche" type="text" placeholder="Plaque, conducteur, marque…"
                   class="w-full h-[30px] pl-8 pr-2.5 rounded-lg border border-border bg-background text-[12px] outline-none focus:border-primary" />
          </div>
        </div>

        <div class="px-3.5 py-2.5 border-b border-border">
          <button :class="[L.btnPrimary, '!w-full !justify-center', vehicules.simulationActive && '!bg-danger']" @click="basculerSimulation">
            <component :is="vehicules.simulationActive ? PauseCircle : PlayCircle" class="w-4 h-4" />
            {{ vehicules.simulationActive ? 'Arrêter la simulation' : 'Lancer la simulation' }}
          </button>
          <div v-if="vehicules.simulationActive" class="flex items-center gap-1.5 mt-2">
            <span class="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"></span>
            <span class="text-[10px] text-muted-foreground">Simulation en cours</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto py-1">
          <button
            v-for="t in tracteursFiltres" :key="t.id"
            class="w-full text-left px-3.5 py-2.5 border-b border-border/50 transition-colors flex items-start gap-2.5 bg-transparent border-0 cursor-pointer"
            :class="selectionId === t.id ? 'bg-primary/10' : 'hover:bg-background'"
            @click="selectionner(t.id)"
          >
            <span class="w-2.5 h-2.5 rounded-full shrink-0 mt-1" :style="{ background: couleurStatut(vehicules.statutsOp[t.id]) }"></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-[12px] font-bold text-foreground">{{ idCourt(t.id) }}</span>
                  <span class="text-[11px] font-mono text-muted-foreground truncate">{{ t.immatriculation }}</span>
                  <TriangleAlert v-if="aAlerte(t.id)" class="w-3 h-3 text-danger shrink-0" />
                </div>
                <span class="text-[11px] font-semibold shrink-0" :class="niveauCarburant(t.id) <= 25 ? 'text-danger' : 'text-foreground'">
                  {{ niveauCarburant(t.id) }}%
                </span>
              </div>
              <div class="text-[11px] text-muted-foreground truncate mt-0.5">{{ t.marque }} {{ t.modele }}</div>
              <div class="h-1 rounded-full bg-background overflow-hidden mt-1">
                <div class="h-full rounded-full" :class="niveauCarburant(t.id) <= 25 ? 'bg-danger' : 'bg-success'" :style="{ width: niveauCarburant(t.id) + '%' }"></div>
              </div>
              <div class="flex items-center gap-1.5 mt-1.5">
                <span class="text-[10px] font-medium px-1.5 py-px rounded-full"
                      :style="{ background: couleurStatut(vehicules.statutsOp[t.id]) + '22', color: couleurStatut(vehicules.statutsOp[t.id]) }">
                  {{ libelleStatut(vehicules.statutsOp[t.id]) }}
                </span>
                <span v-if="vehicules.statutsOp[t.id] === 'en_mouvement'" class="text-[10px] text-muted-foreground">
                  {{ vehicules.positions[t.id]?.vitesse ?? 0 }} km/h
                </span>
              </div>
              <div v-if="badgesDe(t.id).length" class="flex flex-wrap gap-1 mt-1">
                <span v-for="b in badgesDe(t.id)" :key="b" class="text-[10px] font-medium px-1.5 py-px rounded-full" :class="CLS_SITUATION[b]">{{ LIB_SITUATION[b] }}</span>
              </div>
              <div v-if="conducteurDe(t.id)" class="text-[10px] text-muted-foreground mt-0.5 truncate">
                <User class="w-2.5 h-2.5 inline-block mr-0.5 align-[-1px]" />{{ conducteurDe(t.id) }}
              </div>
            </div>
          </button>
          <div v-if="tracteursFiltres.length === 0" class="p-6 text-center text-[12px] text-muted-foreground">
            Aucun résultat.
            <button v-if="situation" class="block mx-auto mt-1 text-primary bg-transparent border-0 cursor-pointer hover:underline" @click="situation = ''">Afficher toute la flotte</button>
          </div>
        </div>

        <div class="px-3.5 py-3 border-t border-border grid grid-cols-2 gap-x-3 gap-y-1.5">
          <div v-for="s in STATUTS" :key="s.key" class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: s.color }"></span>
            <span class="text-[10px] text-muted-foreground">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <!-- Carte -->
      <div class="flex-1 min-w-0 relative max-[900px]:h-[420px]">

        <!-- Info camion sélectionné, en survol au centre haut -->
        <Transition name="fade-r">
          <div v-if="vehiculeSelectionne && !ficheVoyageId"
               class="absolute top-3 right-3 z-[500] bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl px-5 py-3 flex items-center gap-5 min-w-[360px] max-w-[calc(100%-340px)] max-[900px]:left-3 max-[900px]:min-w-0 max-[900px]:max-w-none">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{ background: couleurStatut(vehicules.statutsOp[vehiculeSelectionne.id]) + '20' }">
              <Truck class="w-5 h-5" :style="{ color: couleurStatut(vehicules.statutsOp[vehiculeSelectionne.id]) }" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-foreground text-[14px]">{{ vehiculeSelectionne.immatriculation }}</span>
                <span class="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      :style="{ background: couleurStatut(vehicules.statutsOp[vehiculeSelectionne.id]) + '22', color: couleurStatut(vehicules.statutsOp[vehiculeSelectionne.id]) }">
                  {{ libelleStatut(vehicules.statutsOp[vehiculeSelectionne.id]) }}
                </span>
              </div>
              <div class="flex items-center gap-4 mt-0.5 text-[11px] text-muted-foreground">
                <span>{{ vehiculeSelectionne.marque }} {{ vehiculeSelectionne.modele }}</span>
                <span v-if="conducteurDe(vehiculeSelectionne.id)"><User class="w-3 h-3 inline mr-0.5" />{{ conducteurDe(vehiculeSelectionne.id) }}</span>
                <RouterLink v-if="alertes.enCoursDuVehicule(vehiculeSelectionne.id).length" :to="{ name: 'flotte-alertes' }" class="text-danger font-medium no-underline hover:underline">
                  {{ alertes.enCoursDuVehicule(vehiculeSelectionne.id).length }} alerte(s)
                </RouterLink>
                <span v-if="vehicules.statutsOp[vehiculeSelectionne.id] === 'en_mouvement'" class="text-success font-medium">
                  {{ vehicules.positions[vehiculeSelectionne.id]?.vitesse ?? 0 }} km/h
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1 shrink-0">
              <button class="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground border-0 cursor-pointer hover:bg-primary/90" @click="ficheVehiculeId = vehiculeSelectionne.id">Ouvrir la fiche</button>
              <button class="text-[11px] font-semibold px-2.5 py-1 rounded-md border-0 cursor-pointer" :class="historiqueOuvert ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'" @click="basculerHistorique">Historique</button>
              <RouterLink :to="{ name: 'flotte-telemetrie', query: { vehicule: vehiculeSelectionne.id } }" class="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 no-underline text-center">Événements</RouterLink>
            </div>
            <button class="text-muted-foreground hover:text-foreground transition-colors ml-1 bg-transparent border-0 cursor-pointer" @click="selectionId = null">
              <X class="w-4 h-4" />
            </button>
          </div>
        </Transition>

        <!-- Voyage en cours du véhicule sélectionné -->
        <Transition name="slide-left">
          <div v-if="voyageDuVehicule && !ficheVoyageId && !historiqueOuvert"
               class="absolute top-3 left-3 z-[600] w-[300px] max-h-[calc(100%-24px)] overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
            <div class="px-3.5 py-2.5 border-b border-border" data-ordre-en-cours>
              <div class="flex items-center gap-1.5">
                <Route class="w-3.5 h-3.5 text-primary shrink-0" />
                <span class="font-mono text-[12px] font-semibold text-foreground">{{ voyageDuVehicule.numeroOT || voyageDuVehicule.reference }}</span>
                <span class="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="STATUTS_VOYAGE[voyageDuVehicule.statut].cls">{{ STATUTS_VOYAGE[voyageDuVehicule.statut].label }}</span>
              </div>
              <p class="text-[11px] text-muted-foreground truncate mt-0.5">{{ voyageDuVehicule.trajetLibelle ?? 'Trajet ponctuel' }}</p>
            </div>

            <div class="px-3.5 py-3 flex flex-col gap-3">
              <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                <div><dt class="text-muted-foreground text-[10px]">Client</dt><dd class="text-foreground">{{ voyageDuVehicule.clientNom }}</dd></div>
                <div><dt class="text-muted-foreground text-[10px]">Marchandise</dt><dd class="text-foreground">{{ voyageDuVehicule.marchandise.typeProduit }}</dd></div>
                <div><dt class="text-muted-foreground text-[10px]">Km référence</dt><dd class="text-foreground">{{ voyageDuVehicule.kmReference }} km</dd></div>
                <div><dt class="text-muted-foreground text-[10px]">Semi-remorque</dt><dd class="font-mono text-foreground">{{ voyageDuVehicule.semiRemorquePlaque ?? '-' }}</dd></div>
              </dl>

              <div v-if="pointsVoyage.length">
                <p class="text-[11px] font-semibold text-foreground mb-1.5">
                  Points de passage
                  <span class="font-normal text-muted-foreground">({{ pointsVoyage.filter(x => x.e.franchi).length }}/{{ pointsVoyage.length }})</span>
                </p>
                <ol class="relative pl-4 border-l-2 border-border flex flex-col gap-2" data-points-passage>
                  <li v-for="x in pointsVoyage" :key="x.e.id" class="relative">
                    <span class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-card" :class="x.e.franchi ? 'bg-success' : 'bg-border'"></span>
                    <p class="text-[11px] font-medium text-foreground leading-tight">{{ x.e.destinataire ?? x.e.siteNom }}</p>
                    <p class="text-[10px] text-muted-foreground">
                      {{ LIB_ROLE_ETAPE[x.e.role] }}<span v-if="x.heure"> · {{ x.heure }}</span>
                      <span v-if="x.retard" :class="x.enRetard ? 'text-danger font-medium' : 'text-success'"> · {{ x.retard }}</span>
                    </p>
                  </li>
                </ol>
                <p v-if="positionInconnue(voyageDuVehicule)" class="text-[10px] text-warning mt-1.5">Position inconnue : heures estimées depuis le dernier point réglé</p>
              </div>

              <button class="w-full py-1.5 rounded-lg text-[12px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-0 cursor-pointer"
                      @click="ficheVoyageId = voyageDuVehicule.id">
                Dossier complet
              </button>
            </div>
          </div>
        </Transition>

        <FleetMap
          :marqueurs="marqueursAffiches"
          :trace-prevu="tracePrevu"
          :trace-reelle="traceRejouee"
          :zones="zones"
          :ajuster-vue="!historiqueOuvert || traceRejouee.length < 2"
          :show-legend="false"
          height="100%"
          :selected-id="selectionId"
          @select="selectionner"
        />

        <!-- Historique du trajet : rejeu par période (FMS-GP-01) -->
        <div v-if="historiqueOuvert && vehiculeSelectionne && !ficheVoyageId" class="absolute bottom-5 left-3 z-[650] w-[340px] max-w-[calc(100%-24px)] bg-card border border-border rounded-xl shadow-xl p-3.5 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[12px] font-semibold text-foreground">Historique · <span class="font-mono">{{ vehiculeSelectionne.immatriculation }}</span></span>
            <button class="text-muted-foreground hover:text-foreground bg-transparent border-0 cursor-pointer" @click="fermerHistorique"><X class="w-4 h-4" /></button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1"><label class="text-[10px] text-muted-foreground">Du</label><input v-model="histDu" type="datetime-local" class="h-[30px] px-2 rounded-md border border-border bg-background text-[11px] outline-none focus:border-primary" /></div>
            <div class="flex flex-col gap-1"><label class="text-[10px] text-muted-foreground">Au</label><input v-model="histAu" type="datetime-local" class="h-[30px] px-2 rounded-md border border-border bg-background text-[11px] outline-none focus:border-primary" /></div>
          </div>
          <p v-if="periodeInvalide" class="text-[11px] text-danger">La date de début suit la date de fin.</p>
          <p v-else-if="!pointsHistorique.length" class="text-[11px] text-muted-foreground">Aucune position enregistrée sur cette période.</p>
          <template v-else>
            <div class="flex items-center gap-2">
              <button class="w-8 h-8 rounded-full bg-primary text-primary-foreground border-0 cursor-pointer flex items-center justify-center shrink-0" :title="lecture ? 'Pause' : 'Lire'" @click="basculerLecture">
                <component :is="lecture ? Pause : Play" class="w-4 h-4" />
              </button>
              <input v-model.number="indexRejeu" type="range" min="0" :max="pointsHistorique.length - 1" class="flex-1" />
            </div>
            <div v-if="pointRejeu" class="grid grid-cols-3 gap-2 text-[11px]">
              <div><div class="text-muted-foreground text-[10px]">Heure</div>{{ fmtDateHeure(pointRejeu.t) }}</div>
              <div><div class="text-muted-foreground text-[10px]">Vitesse</div>{{ pointRejeu.vitesse }} km/h</div>
              <div><div class="text-muted-foreground text-[10px]">Lieu</div>{{ telematique.lieuDe(pointRejeu) }}</div>
            </div>
            <div class="text-[10px] text-muted-foreground">{{ pointsHistorique.length }} position(s) · {{ evenementsPeriode.length }} événement(s) sur la période</div>
          </template>
        </div>

        <!-- Bouton flottant d'alertes -->
        <div v-if="!ficheVoyageId" class="absolute top-3 bottom-5 right-5 z-[1000] flex flex-col items-end justify-end gap-2 pointer-events-none">
          <Transition name="fade">
            <div v-if="alertesOuvertes" class="w-[320px] max-h-[380px] min-h-0 shrink overflow-y-auto bg-card border border-border rounded-xl shadow-xl pointer-events-auto">
              <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-border sticky top-0 z-10 bg-card">
                <span class="text-[12px] font-semibold text-foreground">Alertes en cours</span>
                <span class="text-[11px] text-muted-foreground">{{ alertes.enCours.length }}</span>
              </div>
              <div v-if="!alertes.enCours.length" class="px-3.5 py-6 text-center text-[11px] text-muted-foreground">
                Aucune alerte active.
              </div>
              <RouterLink
                v-for="a in alertes.enCours" :key="a.cle" :to="{ name: 'flotte-alertes', query: { alerte: a.cle } }"
                class="w-full text-left px-3.5 py-2.5 border-b border-border block no-underline text-foreground hover:bg-background transition-colors"
              >
                <div class="flex items-start gap-2">
                  <TriangleAlert class="w-3.5 h-3.5 shrink-0 mt-0.5" :class="a.gravite === 'critique' ? 'text-danger' : 'text-warning'" />
                  <div class="min-w-0 flex-1">
                    <p class="text-[12px] font-medium text-foreground">{{ a.titre }}</p>
                    <p class="text-[11px] text-muted-foreground leading-snug">{{ a.message }}</p>
                  </div>
                </div>
              </RouterLink>
            </div>
          </Transition>

          <button class="w-14 h-14 shrink-0 rounded-full border-0 cursor-pointer shadow-lg flex items-center justify-center relative transition-transform hover:scale-105 pointer-events-auto"
                  :class="alertes.enCours.length ? 'bg-danger' : 'bg-primary'"
                  :title="`${alertes.enCours.length} alerte(s) en cours`"
                  @click="alertesOuvertes = !alertesOuvertes">
            <X v-if="alertesOuvertes" class="w-6 h-6 text-white" />
            <Bell v-else class="w-6 h-6 text-white" />
            <span v-if="alertes.enCours.length && !alertesOuvertes"
                  class="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-danger text-[11px] font-bold flex items-center justify-center border-2 border-danger">
              {{ alertes.enCours.length > 99 ? '99+' : alertes.enCours.length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <VoyageCard v-if="ficheVoyageId" :voyages="voyages.voyages" :voyage-id="ficheVoyageId" @close="ficheVoyageId = null" />
    <VehiculeCard v-if="ficheVehiculeId" :vehicules="vehicules.tracteurs" :vehicule-id="ficheVehiculeId" @close="ficheVehiculeId = null" />
  </div>
</template>

<script setup lang="ts">
import { aujourdhuiDate, maintenant } from '../../utils/horloge'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Bell, BellRing, CircleSlash, MapPinOff, Pause, PauseCircle, Play, PlayCircle, Route, Search, Truck, TriangleAlert, User, WifiOff, X } from '@lucide/vue'
import { useSituationsFlotte, LIB_SITUATION, CLS_SITUATION, SITUATIONS, type Situation } from '../../composables/situationsFlotte'
import FleetMap from '../../components/flotte/FleetMap.vue'
import VoyageCard from '../../components/flotte/VoyageCard.vue'
import VehiculeCard from '../../components/cards/VehiculeCard.vue'
import { useTelematiqueStore } from '../../stores/telematique'
import { useAlertesStore } from '../../stores/alertes'
import { useSitesStore } from '../../stores/sites'
import { useTypesSitesStore } from '../../stores/typesSites'
import { useConfigurationStore } from '../../stores/configuration'
import { fmtDateHeure, dansLaTournee, STATUTS_VOYAGE } from '../../utils/voyageUtils'
import { heureEstimee, retardMinutes, estEnRetard, positionInconnue, fmtHeure, fmtArrivee, fmtRetard } from '../../lib/horairesLivraison'
import * as L from '../../lib/listClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useVoyagesStore } from '../../stores/voyages'
import { LIB_ROLE_ETAPE } from '../../utils/voyageUtils'
import type { StatutOperationnel } from '../../stores/vehicules'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const voyages = useVoyagesStore()
const telematique = useTelematiqueStore()
const alertes = useAlertesStore()
const sites = useSitesStore()
const typesSites = useTypesSitesStore()
const configuration = useConfigurationStore()
const route = useRoute()

const ficheVoyageId = ref<string | null>(null)
const ficheVehiculeId = ref<string | null>(null)

const STATUTS: { key: StatutOperationnel; label: string; color: string }[] = [
  { key: 'en_mouvement', label: 'En mouvement', color: '#16a34a' },
  { key: 'arrete', label: 'Arrêté', color: '#6b7280' },
  { key: 'allume_immobile', label: 'Allumé / Immobile', color: '#ca8a04' },
  { key: 'signal_perdu', label: 'Signal perdu', color: '#dc2626' },
]
function couleurStatut(s?: StatutOperationnel) { return STATUTS.find(x => x.key === s)?.color ?? '#6b7280' }
function libelleStatut(s?: StatutOperationnel) { return STATUTS.find(x => x.key === s)?.label ?? 'Inconnu' }

const recherche = ref('')
const situations = useSituationsFlotte()
const situation = ref<Situation | ''>(typeof route.query.situation === 'string' && (SITUATIONS as string[]).includes(route.query.situation) ? route.query.situation as Situation : '')
watch(() => route.query.situation, v => { situation.value = typeof v === 'string' && (SITUATIONS as string[]).includes(v) ? v as Situation : '' })
const kpisSituation: { s: Situation; icon: unknown; bg: string; iconColor: string }[] = [
  { s: 'mission', icon: Route, bg: 'bg-success-bg', iconColor: 'text-success' },
  { s: 'arret', icon: CircleSlash, bg: 'bg-neutral-bg', iconColor: 'text-neutral' },
  { s: 'alerte', icon: BellRing, bg: 'bg-danger-bg', iconColor: 'text-danger' },
  { s: 'hors_zone', icon: MapPinOff, bg: 'bg-warning-bg', iconColor: 'text-warning' },
  { s: 'signal', icon: WifiOff, bg: 'bg-info-bg', iconColor: 'text-info' },
]
/** Situations ajoutées au statut déjà affiché sur la ligne. */
const badgesDe = (id: string) => situations.situationsDe(id).filter(x => x === 'mission' || x === 'hors_zone' || x === 'alerte')
const selectionId = ref<string | null>(null)
const alertesOuvertes = ref(false)

const tracteursAvecPosition = computed(() => vehicules.tracteurs.filter(t => vehicules.positions[t.id]))
const tracteursFiltres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  const base = tracteursAvecPosition.value.filter(t => situations.dans(t.id, situation.value))
  if (!q) return base
  return base.filter(t =>
    `${t.immatriculation} ${t.marque} ${t.modele} ${conducteurDe(t.id) ?? ''}`.toLowerCase().includes(q))
})

function conducteurDe(vehiculeId: string) {
  const af = vehicules.affectationActive(vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
}
function selectionner(id: string) { selectionId.value = selectionId.value === id ? null : id }

/** Identifiant court de flotte, comme la référence (TRC-001…) · dérivé de l'ordre du parc. */
function idCourt(id: string) { return `TR-${String(vehicules.tracteurs.findIndex(t => t.id === id) + 1).padStart(3, '0')}` }
function niveauCarburant(vehiculeId: string) { return vehicules.telemetrieDe(vehiculeId)?.niveauCarburant ?? 0 }
function aAlerte(vehiculeId: string) { return alertes.enCoursDuVehicule(vehiculeId).length > 0 }

const vehiculeSelectionne = computed(() => (selectionId.value ? vehicules.parId(selectionId.value) : null))

/** L'ordre en cours du véhicule sélectionné, et lui seul. */
const voyageDuVehicule = computed(() => selectionId.value ? telematique.voyageEnCoursDe(selectionId.value) : null)
/** Points de l'ordre par rang, sans les lignes sorties de la tournée, avec l'heure (réelle ou estimée) et le retard. */
const pointsVoyage = computed(() => {
  const v = voyageDuVehicule.value
  if (!v) return []
  return [...v.etapes].filter(dansLaTournee).sort((a, b) => a.ordre - b.ordre).map(e => {
    const estimee = heureEstimee(v, e)
    const r = e.role === 'livraison' ? retardMinutes(v, e) : null
    const heure = e.arriveeLe ? `arrivé à ${fmtHeure(new Date(e.arriveeLe))}` : e.franchi ? '' : estimee ? `arrivée estimée ${fmtArrivee(estimee)}` : ''
    return { e, heure, retard: r != null && r !== 0 ? fmtRetard(r) : '', enRetard: e.role === 'livraison' && estEnRetard(v, e) }
  })
})

const marqueurs = computed(() => tracteursFiltres.value.map(t => {
  const pos = vehicules.positions[t.id]!
  const statut = libelleStatut(vehicules.statutsOp[t.id])
  return {
    id: t.id, lat: pos.lat, lng: pos.lng, couleur: couleurStatut(vehicules.statutsOp[t.id]),
    libelle: t.immatriculation, sousTitre: [conducteurDe(t.id), `${pos.vitesse ?? 0} km/h`].filter(Boolean).join(' · '),
    enMouvement: vehicules.statutsOp[t.id] === 'en_mouvement',
    popupHtml: `<div style="font-size:12px;min-width:150px">
      <strong>${t.immatriculation}</strong> · ${statut}<br/>
      <span style="color:#6b7280">${t.marque} ${t.modele}</span><br/>
      Vitesse : ${pos.vitesse ?? 0} km/h<br/>
      Carburant : ${niveauCarburant(t.id)} %<br/>
      ${telematique.lieuDe(pos)}
    </div>`,
  }
}))

/* ── Zones de géorepérage et tracé prévu du voyage sélectionné ── */
const zones = computed(() => sites.actifs.map(s => ({ id: s.id, lat: s.lat, lng: s.lng, rayonM: s.rayonM ?? configuration.parametres.rayonValidationPassageM,
  couleur: typesSites.get(s.type)?.couleur ?? '#0B4480', libelle: `${s.nom} · ${s.type}` })))
const tracePrevu = computed(() => {
  const v = selectionId.value ? telematique.voyageEnCoursDe(selectionId.value) : null
  return v ? [...v.etapes].sort((a, b) => a.ordre - b.ordre).map(e => ({ lat: e.lat, lng: e.lng })) : []
})

/* ── Historique : rejeu des positions sur une période (FMS-GP-01) ── */
const historiqueOuvert = ref(false)
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const histDu = ref(''); const histAu = ref('')
const indexRejeu = ref(0)
const lecture = ref(false)
let minuteurRejeu: ReturnType<typeof setInterval> | null = null
/** Période par défaut : la journée du jour, de minuit jusqu'à maintenant. */
function periodeParDefaut(jour?: string) {
  if (jour) { histDu.value = `${jour}T00:00`; histAu.value = `${jour}T23:59`; return }
  histDu.value = local(aujourdhuiDate()); histAu.value = local(maintenant())
}
const periodeInvalide = computed(() => !!histDu.value && !!histAu.value && histDu.value > histAu.value)
const bornes = computed(() => histDu.value && histAu.value && !periodeInvalide.value
  ? { du: new Date(histDu.value).toISOString(), au: new Date(histAu.value + ':59').toISOString() } : null)
const pointsHistorique = computed(() => historiqueOuvert.value && selectionId.value && bornes.value ? telematique.trace(selectionId.value, bornes.value.du, bornes.value.au) : [])
const pointRejeu = computed(() => pointsHistorique.value[Math.min(indexRejeu.value, pointsHistorique.value.length - 1)] ?? null)
const traceRejouee = computed(() => pointsHistorique.value.slice(0, indexRejeu.value + 1))
const evenementsPeriode = computed(() => selectionId.value && bornes.value
  ? telematique.duVehicule(selectionId.value).filter(e => e.date >= bornes.value!.du && e.date <= bornes.value!.au) : [])
watch(() => pointsHistorique.value.length, n => { if (!lecture.value) indexRejeu.value = n ? n - 1 : 0 })
watch([histDu, histAu, selectionId], () => arreterLecture())
function arreterLecture() { lecture.value = false; if (minuteurRejeu) { clearInterval(minuteurRejeu); minuteurRejeu = null } }
function basculerLecture() {
  if (lecture.value) { arreterLecture(); return }
  if (indexRejeu.value >= pointsHistorique.value.length - 1) indexRejeu.value = 0
  lecture.value = true
  minuteurRejeu = setInterval(() => {
    if (indexRejeu.value >= pointsHistorique.value.length - 1) { arreterLecture(); return }
    indexRejeu.value++
  }, 250)
}
function basculerHistorique() {
  if (historiqueOuvert.value) { fermerHistorique(); return }
  if (selectionId.value) periodeParDefaut()
  historiqueOuvert.value = true
}
function fermerHistorique() { arreterLecture(); historiqueOuvert.value = false }
watch(selectionId, id => { if (!id) fermerHistorique(); else if (historiqueOuvert.value) periodeParDefaut() })
onBeforeUnmount(arreterLecture)

/** En rejeu, le véhicule sélectionné est montré à sa position passée. */
const marqueursAffiches = computed(() => {
  if (!historiqueOuvert.value || !pointRejeu.value || !selectionId.value) return marqueurs.value
  const p = pointRejeu.value
  return marqueurs.value.map(m => m.id === selectionId.value ? { ...m, lat: p.lat, lng: p.lng, couleur: '#7c3aed', enMouvement: lecture.value } : m)
})

/* Arrivée depuis un autre écran : véhicule présélectionné, éventuellement sur un jour donné. */
if (typeof route.query.vehicule === 'string' && vehicules.parId(route.query.vehicule)) {
  selectionId.value = route.query.vehicule
  if (typeof route.query.du === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.du)) { periodeParDefaut(route.query.du); historiqueOuvert.value = true }
}

function basculerSimulation() {
  vehicules.simulationActive ? vehicules.arreterSimulation() : vehicules.demarrerSimulation()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px) translateX(-50%); }
.fade-r-enter-active, .fade-r-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-r-enter-from, .fade-r-leave-to { opacity: 0; transform: translateY(-6px); }
.slide-left-enter-active, .slide-left-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
