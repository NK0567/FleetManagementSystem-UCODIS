<template>
  <div class="px-7 py-6 h-[calc(100vh-56px)] max-[900px]:h-auto">
    <div class="flex items-center justify-between mb-3.5 gap-3 flex-wrap">
      <div>
        <div class="text-lg font-semibold">Carte temps réel</div>
        <div class="text-[13px] text-muted-foreground mt-px">Position du parc en circulation</div>
      </div>
    </div>

    <div class="flex h-[calc(100%-110px)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-card shadow-sm max-[900px]:flex-col max-[900px]:h-auto">

      <!-- Panneau gauche : liste des tracteurs -->
      <div class="w-[280px] shrink-0 flex flex-col border-r border-border overflow-hidden max-[900px]:w-full max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:max-h-[300px]">
        <div class="px-3.5 pt-3.5 pb-2.5 border-b border-border">
          <div class="flex items-center gap-2 mb-2">
            <Truck class="w-4 h-4 text-primary shrink-0" />
            <span class="text-[13px] font-semibold text-foreground">Flotte UCODIS</span>
            <span class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {{ tracteursFiltres.length }}/{{ vehicules.tracteurs.length }}
            </span>
          </div>
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input v-model="recherche" type="text" placeholder="Plaque, chauffeur, marque…"
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
            v-for="(t, i) in tracteursFiltres" :key="t.id"
            class="w-full text-left px-3.5 py-2.5 border-b border-border/50 transition-colors flex items-start gap-2.5 bg-transparent border-0 cursor-pointer"
            :class="selectionId === t.id ? 'bg-primary/10' : 'hover:bg-background'"
            @click="selectionner(t.id)"
          >
            <span class="w-2.5 h-2.5 rounded-full shrink-0 mt-1" :style="{ background: couleurStatut(vehicules.statutsOp[t.id]) }"></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-[12px] font-bold text-foreground">{{ idCourt(i) }}</span>
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
              <div v-if="conducteurDe(t.id)" class="text-[10px] text-muted-foreground mt-0.5 truncate">
                <User class="w-2.5 h-2.5 inline-block mr-0.5 align-[-1px]" />{{ conducteurDe(t.id) }}
              </div>
            </div>
          </button>
          <div v-if="tracteursFiltres.length === 0" class="p-6 text-center text-[12px] text-muted-foreground">Aucun résultat.</div>
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
        <Transition name="fade">
          <div v-if="vehiculeSelectionne && !ficheVoyageId"
               class="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl px-5 py-3 flex items-center gap-5 min-w-[420px] max-w-[600px]">
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
                <span v-if="vehicules.statutsOp[vehiculeSelectionne.id] === 'en_mouvement'" class="text-success font-medium">
                  {{ vehicules.positions[vehiculeSelectionne.id]?.vitesse ?? 0 }} km/h
                </span>
              </div>
            </div>
            <button class="text-muted-foreground hover:text-foreground transition-colors ml-2 bg-transparent border-0 cursor-pointer" @click="selectionId = null">
              <X class="w-4 h-4" />
            </button>
          </div>
        </Transition>

        <!-- Voyage en cours du véhicule sélectionné -->
        <Transition name="slide-left">
          <div v-if="voyageDuVehicule && !ficheVoyageId"
               class="absolute top-3 left-3 z-[600] w-[300px] max-h-[calc(100%-24px)] overflow-y-auto bg-card border border-border rounded-xl shadow-lg">
            <div class="px-3.5 py-2.5 border-b border-border">
              <div class="flex items-center gap-1.5">
                <Route class="w-3.5 h-3.5 text-primary shrink-0" />
                <span class="font-mono text-[12px] font-semibold text-foreground">{{ voyageDuVehicule.reference }}</span>
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

              <div v-if="voyageDuVehicule.etapes.length">
                <p class="text-[11px] font-semibold text-foreground mb-1.5">
                  Points de passage
                  <span class="font-normal text-muted-foreground">({{ voyageDuVehicule.etapes.filter(e => e.franchi).length }}/{{ voyageDuVehicule.etapes.length }})</span>
                </p>
                <ol class="relative pl-4 border-l-2 border-border flex flex-col gap-2">
                  <li v-for="e in voyageDuVehicule.etapes" :key="e.id" class="relative">
                    <span class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-card" :class="e.franchi ? 'bg-success' : 'bg-border'"></span>
                    <p class="text-[11px] font-medium text-foreground leading-tight">{{ e.siteNom }}</p>
                    <p class="text-[10px] text-muted-foreground">
                      {{ LIB_ROLE_ETAPE[e.role] }}<span v-if="e.pausePrevueMin"> · +{{ e.pausePrevueMin }} min</span>
                    </p>
                  </li>
                </ol>
              </div>

              <button class="w-full py-1.5 rounded-lg text-[12px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-0 cursor-pointer"
                      @click="ficheVoyageId = voyageDuVehicule.id">
                Ouvrir le dossier de voyage
              </button>
            </div>
          </div>
        </Transition>

        <FleetMap
          :marqueurs="marqueurs"
          :show-legend="false"
          height="100%"
          :selected-id="selectionId"
          @select="selectionner"
        />

        <!-- Bouton flottant d'alertes -->
        <div v-if="!ficheVoyageId" class="absolute bottom-5 right-5 z-[700] flex flex-col items-end gap-2">
          <Transition name="fade">
            <div v-if="alertesOuvertes" class="w-[320px] max-h-[380px] overflow-y-auto bg-card border border-border rounded-xl shadow-xl">
              <div class="flex items-center justify-between px-3.5 py-2.5 border-b border-border sticky top-0 bg-card">
                <span class="text-[12px] font-semibold text-foreground">Alertes en cours</span>
                <span class="text-[11px] text-muted-foreground">{{ docsVehicule.alertesActives.length }}</span>
              </div>
              <div v-if="!docsVehicule.alertesActives.length" class="px-3.5 py-6 text-center text-[11px] text-muted-foreground">
                Aucune alerte active.
              </div>
              <RouterLink
                v-for="d in docsVehicule.alertesActives" :key="d.id" :to="{ name: 'flotte-documents-vehicule' }"
                class="w-full text-left px-3.5 py-2.5 border-b border-border block no-underline text-foreground hover:bg-background transition-colors"
              >
                <div class="flex items-start gap-2">
                  <TriangleAlert class="w-3.5 h-3.5 shrink-0 mt-0.5" :class="docsVehicule.etat(d) === 'expire' ? 'text-danger' : 'text-warning'" />
                  <div class="min-w-0 flex-1">
                    <p class="text-[12px] font-medium text-foreground">{{ vehicules.parId(d.vehiculeId)?.immatriculation }} · {{ d.type }}</p>
                    <p class="text-[11px] text-muted-foreground leading-snug">Échéance : {{ formatDate(d.echeance) }}</p>
                  </div>
                </div>
              </RouterLink>
            </div>
          </Transition>

          <button class="w-14 h-14 rounded-full border-0 cursor-pointer shadow-lg flex items-center justify-center relative transition-transform hover:scale-105"
                  :class="docsVehicule.alertesActives.length ? 'bg-danger' : 'bg-primary'"
                  :title="`${docsVehicule.alertesActives.length} alerte(s) en cours`"
                  @click="alertesOuvertes = !alertesOuvertes">
            <X v-if="alertesOuvertes" class="w-6 h-6 text-white" />
            <Bell v-else class="w-6 h-6 text-white" />
            <span v-if="docsVehicule.alertesActives.length && !alertesOuvertes"
                  class="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-danger text-[11px] font-bold flex items-center justify-center border-2 border-danger">
              {{ docsVehicule.alertesActives.length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <VoyageCard v-if="ficheVoyageId" :voyages="voyages.voyages" :voyage-id="ficheVoyageId" @close="ficheVoyageId = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Bell, PauseCircle, PlayCircle, Route, Search, Truck, TriangleAlert, User, X } from '@lucide/vue'
import FleetMap from '../../components/flotte/FleetMap.vue'
import VoyageCard from '../../components/flotte/VoyageCard.vue'
import * as L from '../../lib/listClasses'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useVoyagesStore } from '../../stores/voyages'
import { formatDate } from '../../utils/helpers'
import { LIB_ROLE_ETAPE } from '../../utils/voyageUtils'
import type { StatutOperationnel } from '../../stores/vehicules'

const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const docsVehicule = useDocumentsVehiculeStore()
const voyages = useVoyagesStore()

const ficheVoyageId = ref<string | null>(null)

const STATUTS: { key: StatutOperationnel; label: string; color: string }[] = [
  { key: 'en_mouvement', label: 'En mouvement', color: '#16a34a' },
  { key: 'arrete', label: 'Arrêté', color: '#6b7280' },
  { key: 'allume_immobile', label: 'Allumé / Immobile', color: '#ca8a04' },
  { key: 'signal_perdu', label: 'Signal perdu', color: '#dc2626' },
]
function couleurStatut(s?: StatutOperationnel) { return STATUTS.find(x => x.key === s)?.color ?? '#6b7280' }
function libelleStatut(s?: StatutOperationnel) { return STATUTS.find(x => x.key === s)?.label ?? 'Inconnu' }

const recherche = ref('')
const selectionId = ref<string | null>(null)
const alertesOuvertes = ref(false)

const tracteursAvecPosition = computed(() => vehicules.tracteurs.filter(t => vehicules.positions[t.id]))
const tracteursFiltres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  if (!q) return tracteursAvecPosition.value
  return tracteursAvecPosition.value.filter(t =>
    `${t.immatriculation} ${t.marque} ${t.modele} ${conducteurDe(t.id) ?? ''}`.toLowerCase().includes(q))
})

function conducteurDe(vehiculeId: string) {
  const af = vehicules.affectationActive(vehiculeId)
  return af ? personnel.parId(af.conducteurId)?.nomComplet ?? null : null
}
function selectionner(id: string) { selectionId.value = selectionId.value === id ? null : id }

/** Identifiant court de flotte, comme la référence (TRC-001…) · dérivé de l'ordre du parc. */
function idCourt(index: number) { return `TR-${String(index + 1).padStart(3, '0')}` }
function niveauCarburant(vehiculeId: string) { return vehicules.telemetrieDe(vehiculeId)?.niveauCarburant ?? 0 }
function aAlerte(vehiculeId: string) { return docsVehicule.documentsDe(vehiculeId).some(d => docsVehicule.etat(d) !== 'valide') }

const vehiculeSelectionne = computed(() => (selectionId.value ? vehicules.parId(selectionId.value) : null))

/** Le voyage en cours (ou le plus récent à défaut) pour le véhicule sélectionné. */
const voyageDuVehicule = computed(() => {
  if (!selectionId.value) return null
  const tousDuVehicule = voyages.voyages.filter(v => v.vehiculeId === selectionId.value)
  return tousDuVehicule.find(v => v.statut === 'en_cours') ?? tousDuVehicule[0] ?? null
})

const marqueurs = computed(() => tracteursFiltres.value.map(t => {
  const pos = vehicules.positions[t.id]!
  const statut = libelleStatut(vehicules.statutsOp[t.id])
  return {
    id: t.id, lat: pos.lat, lng: pos.lng, couleur: couleurStatut(vehicules.statutsOp[t.id]),
    libelle: t.immatriculation, sousTitre: conducteurDe(t.id) ?? undefined,
    enMouvement: vehicules.statutsOp[t.id] === 'en_mouvement',
    popupHtml: `<div style="font-size:12px;min-width:150px">
      <strong>${t.immatriculation}</strong> · ${statut}<br/>
      <span style="color:#6b7280">${t.marque} ${t.modele}</span><br/>
      ⛽ Carburant : ${niveauCarburant(t.id)}%
    </div>`,
  }
}))

function basculerSimulation() {
  vehicules.simulationActive ? vehicules.arreterSimulation() : vehicules.demarrerSimulation()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px) translateX(-50%); }
.slide-left-enter-active, .slide-left-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
