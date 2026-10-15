<script setup lang="ts">
/**
 * Fiche voyage, copiée à la lettre de la structure de VoyageCard du socle FMS
 * (Identification, Affectation, Plan de trajet, Déroulé site par site,
 * Marchandise, Temps réglementaires, Conformité, Dossier documentaire,
 * Carburant du camion), données UCODIS. Trois sections du socle FMS ne sont
 * pas reprises : « Volumétrie & coulage » et « Détection de siphonnage »
 * concernent la mesure de carburant liquide (tankers du socle FMS), sans objet
 * pour du fret sec - remplacées par « Marchandise et écart de poids »,
 * déjà l'équivalent correct pour UCODIS. « Débriefing au retour » reprend
 * un formulaire papier de référence à neuf infractions dont UCODIS n'a pas
 * communiqué d'équivalent : fabriquer ce formulaire serait inventer une
 * procédure, pas l'adapter.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import FleetMap from './FleetMap.vue'
import StatusPill from '../ui/StatusPill.vue'
import { CheckCircle2, TriangleAlert, AlertCircle } from '@lucide/vue'
import { useVoyagesStore, LIB_DOC } from '../../stores/voyages'
import { useEcartsStore, LIB_TYPE_ECART, LIB_NATURE } from '../../stores/ecarts'
import { useCarburantStore } from '../../stores/carburant'
import { useDisponibilitesStore } from '../../stores/disponibilites'
import { useConfigurationStore } from '../../stores/configuration'
import { calculerEcartPoids, fmtKg, fmtDateHeure, LIB_ROLE_ETAPE } from '../../utils/voyageUtils'
import * as cls from '../../lib/formClasses'
import type { Voyage } from '../../types'

const props = defineProps<{ voyages: Voyage[]; voyageId: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useVoyagesStore()
const ecartsStore = useEcartsStore()
const carburantStore = useCarburantStore()
const configStore = useConfigurationStore()
const disposTemps = useDisponibilitesStore()

const idCourant = ref(props.voyageId)
watch(() => props.voyageId, v => { idCourant.value = v })

const courant = computed<Voyage | null>(() => props.voyages.find(v => v.id === idCourant.value) ?? null)
const index = computed(() => props.voyages.findIndex(v => v.id === idCourant.value))
const hasPrev = computed(() => index.value > 0)
const hasNext = computed(() => index.value >= 0 && index.value < props.voyages.length - 1)
const sidebarItems = computed(() => props.voyages.map(v => ({ no: v.reference, label: v.clientNom })))
const currentNo = computed(() => courant.value?.reference ?? null)

function goPrev() { if (hasPrev.value) idCourant.value = props.voyages[index.value - 1]!.id }
function goNext() { if (hasNext.value) idCourant.value = props.voyages[index.value + 1]!.id }
function selectSidebar(no: string) {
  const v = props.voyages.find(x => x.reference === no)
  if (v) idCourant.value = v.id
}

const STATUTS: Record<string, string> = {
  en_attente: 'En attente', planifie: 'Planifié', affecte: 'Affecté', en_cours: 'En cours',
  livre: 'Livré', cloture: 'Clôturé', litige: 'En litige', annule: 'Annulé',
}

const ecartPoids = computed(() => (courant.value ? calculerEcartPoids(courant.value) : null))
const ecartKm = computed(() => (courant.value ? store.ecartKm(courant.value.id) : null))
const dossier = computed(() => (courant.value ? store.completudeDossier(courant.value.id) : null))
const documents = computed(() => (courant.value ? store.documentsDuVoyage(courant.value.id) : []))
const ecarts = computed(() => (courant.value ? ecartsStore.ecartsDuVoyage(courant.value.id) : []))
const compteEcarts = computed(() => (courant.value ? ecartsStore.compteDuVoyage(courant.value.id) : null))
/** Seul un écart non justifié est en faute ; un écart à qualifier reste en attente. */
const clsEcart = (nature: string) => nature === 'non_justifiee' ? 'text-danger' : nature === 'a_qualifier' ? 'text-warning' : 'text-muted-foreground'
const recharges = computed(() => (courant.value ? carburantStore.recharges.filter(r => r.voyageId === courant.value!.id) : []))
const litresVoyage = computed(() => recharges.value.reduce((s, r) => s + r.litres, 0))

const avancement = computed(() => {
  const total = courant.value?.etapes.length ?? 0
  const faits = courant.value?.etapes.filter(e => e.franchi).length ?? 0
  return { total, faits, pct: total ? Math.round((faits / total) * 100) : 0 }
})
/** Un site n'est manqué qu'une fois le voyage terminé ; avant, il reste à desservir. */
const voyageTermine = computed(() => !!courant.value && ['livre', 'cloture', 'litige'].includes(courant.value.statut))
const sitesManques = computed(() => (voyageTermine.value ? courant.value?.etapes.filter(e => !e.franchi).length ?? 0 : 0))

/** Temps réglementaires : durée réelle du voyage face aux seuils de Configuration.
 *  Simplifié par rapport au socle FMS (pas de relevé de pauses granulaire côté UCODIS) :
 *  seule la durée totale départ → arrivée est comparée au plafond journalier. */
const dureeVoyageMin = computed(() => {
  if (!courant.value?.dateDepartReel || !courant.value?.dateArriveeReelle) return null
  return Math.round((+new Date(courant.value.dateArriveeReelle) - +new Date(courant.value.dateDepartReel)) / 60_000)
})
/** Dépassements du voyage : même calcul que sur la fiche du conducteur (repos avant départ, plafonds compris). */
const depassementsVoyage = computed(() => courant.value?.chauffeurId ? disposTemps.depassementsTemps(courant.value.chauffeurId).filter(d => d.voyageId === courant.value!.id) : [])
const depassementTemps = computed(() => depassementsVoyage.value.length > 0)
function fmtDuree(min: number | null) {
  if (min == null) return '-'
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`
}

const marqueursEtapes = computed(() => (courant.value?.etapes.map((e, i) => ({
  id: e.id, lat: e.lat, lng: e.lng, libelle: `${i + 1}. ${e.siteNom}`, couleur: e.franchi ? '#16a34a' : '#94a3b8', numero: i + 1,
})) ?? []))

const pageTitle = computed(() => (courant.value ? `${courant.value.reference} · ${courant.value.clientNom}` : ''))
const champ = 'flex flex-col gap-1'
const champLabel = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]'
const lecture = 'text-[13px] text-foreground'

const kmRetourSaisi = ref<number | null>(null)
const erreurCloture = ref('')
const resultatCloture = ref('')
const alerteCloture = ref('')
watch(idCourant, () => { erreurCloture.value = ''; resultatCloture.value = ''; alerteCloture.value = '' })
watch(courant, v => { kmRetourSaisi.value = v?.kmArrivee ?? null }, { immediate: true })

function cloturerVoyage() {
  erreurCloture.value = ''; resultatCloture.value = ''; alerteCloture.value = ''
  if (!courant.value) return
  if (kmRetourSaisi.value == null || Number.isNaN(kmRetourSaisi.value)) { erreurCloture.value = 'Le kilométrage au retour est obligatoire pour clôturer le voyage.'; return }
  const id = courant.value.id
  const res = store.cloturer(id, kmRetourSaisi.value)
  if (!res.ok) { erreurCloture.value = res.motif ?? ''; return }
  resultatCloture.value = 'Voyage clôturé.'
  alerteCloture.value = res.alerteEcart ?? ''
}
</script>

<template>
  <CardModalShell
    v-if="courant"
    :page-title="pageTitle"
    :page-number="courant.reference"
    banner-label="Fiche voyage"
    :is-edit-mode="false"
    :sidebar-items="sidebarItems"
    :current-no="currentNo"
    :has-prev="hasPrev"
    :has-next="hasNext"
    hide-action-bar
    @close="emit('close')"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <StatusPill :statut="courant.statut" :libelle="STATUTS[courant.statut]" />
      <span v-if="courant.numeroOT" class="text-[11px] font-mono px-2.5 py-[3px] rounded-full bg-background text-muted-foreground">{{ courant.numeroOT }}</span>
      <span v-if="sitesManques" class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-warning-bg text-warning">{{ sitesManques }} site(s) manqué(s)</span>
    </template>

    <template #form>
      <div class="px-6 py-5 max-w-4xl mx-auto">

        <!-- 1. IDENTIFICATION -->
        <FormSection title="Identification" :recaps="[courant.reference, courant.numeroOT, courant.clientNom]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Référence du voyage</span><span :class="lecture" class="font-mono font-semibold">{{ courant.reference }}</span></div>
            <div :class="champ"><span :class="champLabel">N° d'ordre de transport</span><span :class="lecture" class="font-mono">{{ courant.numeroOT ?? '-' }}</span></div>
            <div :class="champ"><span :class="champLabel">Client donneur d'ordre</span><span :class="lecture">{{ courant.clientNom }}</span></div>
            <div :class="champ"><span :class="champLabel">Tolérance d'écart de poids</span><span :class="lecture">{{ courant.toleranceEcartPoidsPourcent }} %</span></div>
            <div :class="champ"><span :class="champLabel">Produit transporté</span><span :class="lecture">{{ courant.marchandise.typeProduit }}</span></div>
            <div :class="champ"><span :class="champLabel">Itinéraire</span><span :class="lecture">{{ courant.origine }} → {{ courant.destination }}</span></div>
          </div>
        </FormSection>

        <!-- 2. AFFECTATION -->
        <FormSection title="Affectation" :recaps="[courant.vehiculePlaque, courant.chauffeurNom]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Tracteur</span><span :class="lecture" class="font-mono font-semibold">{{ courant.vehiculePlaque ?? '-' }}</span></div>
            <div :class="champ"><span :class="champLabel">Semi-remorque attelée</span><span :class="lecture" class="font-mono">{{ courant.semiRemorquePlaque ?? '-' }}</span></div>
            <div :class="champ"><span :class="champLabel">Conducteur <span class="normal-case font-normal text-muted-foreground">· déduit de l'affectation</span></span><span :class="lecture">{{ courant.chauffeurNom ?? '-' }}</span></div>
            <div :class="champ"><span :class="champLabel">Départ prévu</span><span :class="lecture">{{ fmtDateHeure(courant.datePlanifiee) }}</span></div>
            <div :class="champ"><span :class="champLabel">Départ réel</span><span :class="lecture">{{ fmtDateHeure(courant.dateDepartReel) }}</span></div>
            <div :class="champ"><span :class="champLabel">Arrivée réelle</span><span :class="lecture">{{ fmtDateHeure(courant.dateArriveeReelle) }}</span></div>
          </div>
        </FormSection>

        <!-- 3. PLAN DE TRAJET -->
        <FormSection title="Plan de trajet" :recaps="[courant.trajetLibelle ?? 'Trajet ponctuel', `${courant.etapes.length} sites`, `${courant.kmReference} km`]">
          <div class="grid grid-cols-3 gap-x-6 gap-y-4 mb-4 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Trajet de référence</span><span :class="lecture">{{ courant.trajetLibelle ?? 'Composé pour ce voyage' }}</span></div>
            <div :class="champ"><span :class="champLabel">Sites affectés</span><span :class="lecture">{{ courant.etapes.length }}</span></div>
            <div :class="champ"><span :class="champLabel">Kilométrage de référence</span><span :class="lecture">{{ courant.kmReference }} km</span></div>
          </div>
          <FleetMap v-if="courant.etapes.length" :trace-prevu="courant.etapes.map(e => ({ lat: e.lat, lng: e.lng }))" :marqueurs="marqueursEtapes" height="280px" :show-legend="false" />
        </FormSection>

        <!-- 4. DÉROULÉ SITE PAR SITE -->
        <FormSection title="Déroulé site par site" :recaps="[`${avancement.faits}/${avancement.total} desservis`, sitesManques ? `${sitesManques} manqué(s)` : null]">
          <div v-if="courant.etapes.length" class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-2 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="avancement.pct === 100 ? 'bg-success' : 'bg-primary'" :style="{ width: avancement.pct + '%' }"></div></div>
            <span class="text-xs font-semibold">{{ avancement.pct }} %</span>
          </div>
          <table v-if="courant.etapes.length" class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">#</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Site</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Rôle</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Arrivée</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">État</th>
            </tr></thead>
            <tbody>
              <tr v-for="e in courant.etapes" :key="e.id" class="border-b border-border/60">
                <td class="py-2 text-xs font-mono">{{ e.ordre }}</td>
                <td class="py-2">
                  <span class="text-xs font-medium text-foreground">{{ e.siteNom }}</span>
                </td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background text-muted-foreground">{{ LIB_ROLE_ETAPE[e.role] }}</span></td>
                <td class="py-2 text-xs">{{ e.pausePrevueMin ? e.pausePrevueMin + ' min de pause prévue' : '-' }}</td>
                <td class="py-2">
                  <span v-if="e.franchi" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">Desservi</span>
                  <span v-else-if="voyageTermine" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-danger-bg text-danger">Manqué</span>
                  <span v-else class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">À desservir</span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-[12px] text-muted-foreground italic">Aucune séquence de site enregistrée pour ce voyage ponctuel.</p>
        </FormSection>

        <!-- 5. MARCHANDISE ET ÉCART DE POIDS (équivalent UCODIS de « Volumétrie & coulage ») -->
        <FormSection title="Marchandise et écart de poids" :recaps="[courant.marchandise.typeProduit, ecartPoids?.ecartPourcent != null ? `${ecartPoids.ecartPourcent} %` : null]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Type de marchandise</span><span :class="lecture">{{ courant.marchandise.typeProduit }}</span></div>
            <div :class="champ"><span :class="champLabel">Nombre de cartons</span><span :class="lecture">{{ courant.marchandise.nombreCartons }}</span></div>
            <div :class="champ"><span :class="champLabel">Poids chargé</span><span :class="lecture">{{ fmtKg(courant.marchandise.poidsChargeKg) }}</span></div>
            <div :class="champ"><span :class="champLabel">Poids livré</span><span :class="lecture">{{ courant.marchandise.poidsDechargeKg != null ? fmtKg(courant.marchandise.poidsDechargeKg) : 'Non renseigné' }}</span></div>
          </div>
          <div v-if="ecartPoids && ecartPoids.ecartPourcent != null" class="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <span class="text-[13px] font-semibold" :class="{ 'text-success': ecartPoids.verdict === 'dans_tolerance', 'text-warning': ecartPoids.verdict === 'hors_mineur', 'text-danger': ecartPoids.verdict === 'hors_majeur' }">Écart : {{ ecartPoids.ecartPourcent }} %</span>
            <span class="text-[11px] text-muted-foreground">seuil {{ courant.toleranceEcartPoidsPourcent }} %</span>
          </div>
          <div v-if="ecartKm && ecartKm.ecartKm != null" class="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-x-6 gap-y-2 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Km réel</span><span :class="lecture">{{ (courant.kmArrivee ?? 0) - (courant.kmDepart ?? 0) }} km</span></div>
            <div :class="champ"><span :class="champLabel">Écart au kilométrage prévu</span><span :class="[lecture, ecartKm.horsTolerance ? 'text-danger font-medium' : 'text-success']">{{ ecartKm.ecartKm }} km ({{ ecartKm.ecartPourcent }} %)</span></div>
          </div>
        </FormSection>

        <!-- 6. TEMPS RÉGLEMENTAIRES -->
        <FormSection title="Temps réglementaires" :recaps="[depassementTemps ? 'dépassement' : 'conforme', fmtDuree(dureeVoyageMin)]">
          <div class="grid grid-cols-2 gap-3 mb-2 max-sm:grid-cols-1">
            <div>
              <span :class="champLabel">Durée totale du voyage</span>
              <p class="text-lg font-bold" :class="depassementTemps ? 'text-danger' : 'text-foreground'">{{ fmtDuree(dureeVoyageMin) }}</p>
              <p class="text-[10px] text-muted-foreground">seuil {{ fmtDuree(configStore.parametres.ttjMaxMin) }}</p>
            </div>
          </div>
          <div v-if="dureeVoyageMin == null" class="text-xs text-muted-foreground py-1">Départ ou arrivée réelle non renseignés, durée non calculable.</div>
          <div v-else-if="!depassementTemps" class="flex items-center gap-2 text-xs text-success"><CheckCircle2 class="w-3.5 h-3.5 shrink-0" /> Aucun dépassement des temps de conduite et de repos.</div>
          <template v-else>
            <div v-for="d in depassementsVoyage" :key="d.motif" class="flex items-start gap-2.5 rounded-md px-3 py-2 bg-danger-bg mb-1.5">
              <TriangleAlert class="w-3.5 h-3.5 shrink-0 mt-0.5 text-danger" />
              <p class="text-xs text-danger">{{ d.motif }}.</p>
            </div>
          </template>
        </FormSection>

        <!-- 7. CONFORMITÉ : écarts du voyage, arrêts compris, avec leur qualification -->
        <FormSection title="Conformité" :recaps="[`${ecarts.length} écart(s)`, compteEcarts?.nonJustifies ? `${compteEcarts.nonJustifies} non justifié(s)` : null, compteEcarts?.aQualifier ? `${compteEcarts.aQualifier} à qualifier` : null]">
          <div v-if="!ecarts.length" class="text-xs text-muted-foreground py-2">Aucun écart sur ce voyage.</div>
          <div v-for="e in ecarts" :key="e.id" class="flex items-start gap-2.5 rounded-md border border-border px-3 py-2 mb-1.5">
            <TriangleAlert class="w-3.5 h-3.5 shrink-0 mt-0.5" :class="clsEcart(e.nature)" />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-foreground">{{ LIB_TYPE_ECART[e.type] }}<span v-if="e.dureeMin && (e.type === 'arret_non_planifie' || e.type === 'repos_hors_parking')" class="font-normal text-muted-foreground"> · {{ fmtDuree(e.dureeMin) }}</span></p>
              <p class="text-[11px] text-muted-foreground">{{ e.lieu ?? '' }} · {{ fmtDateHeure(e.detecteLe) }}</p>
            </div>
            <span :class="LIB_NATURE[e.nature].cls" class="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0">{{ LIB_NATURE[e.nature].label }}</span>
          </div>
        </FormSection>

        <!-- 8. DOSSIER DOCUMENTAIRE -->
        <FormSection title="Dossier documentaire" :recaps="[dossier ? `${dossier.presents}/${dossier.total}` : null]">
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-2 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="dossier?.complet ? 'bg-success' : 'bg-warning'" :style="{ width: dossier ? (dossier.presents / dossier.total) * 100 + '%' : '0%' }"></div></div>
            <span class="text-xs font-semibold">{{ dossier ? `${dossier.presents}/${dossier.total}` : '-' }}</span>
          </div>
          <div class="flex flex-col gap-2">
            <div v-for="type in ['ordre_transport','bon_chargement','feuille_route','bon_livraison','note_reserve']" :key="type"
                 class="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
              <span class="text-[13px] text-foreground">{{ LIB_DOC[type as keyof typeof LIB_DOC] }}</span>
              <template v-if="documents.find(d => d.type === type)?.present">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">{{ documents.find(d => d.type === type)?.numero ?? 'Présent' }}</span>
              </template>
              <span v-else class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">Absent</span>
            </div>
          </div>
          <p v-if="dossier && !dossier.complet" class="text-[11px] text-warning mt-2">Dossier incomplet : la clôture du voyage est bloquée.</p>
          <template v-if="courant.statut === 'livre'">
            <div :class="champ" class="mt-3.5">
              <label :class="champLabel">Kilométrage au retour *</label>
              <input v-model.number="kmRetourSaisi" type="number" :class="cls.fieldInput" placeholder="Obligatoire pour clôturer" />
              <p v-if="courant.kmDepart != null" class="text-[11px] text-muted-foreground">Départ relevé à {{ courant.kmDepart.toLocaleString('fr-FR') }} km.</p>
            </div>
            <p v-if="erreurCloture" class="text-[12px] text-danger flex items-center gap-1.5 mt-2"><AlertCircle class="w-3.5 h-3.5 shrink-0" /> {{ erreurCloture }}</p>
            <button :class="cls.btnPrimary" class="w-full justify-center mt-2.5" @click="cloturerVoyage">Clôturer le voyage</button>
          </template>
          <p v-if="resultatCloture" class="text-[12px] mt-2 text-success">{{ resultatCloture }}</p>
          <p v-if="alerteCloture" class="text-[12px] mt-1 text-warning">{{ alerteCloture }}</p>
        </FormSection>

        <!-- 9. CARBURANT DU CAMION -->
        <FormSection title="Carburant du camion" :recaps="[`${recharges.length} recharge(s)`, litresVoyage ? litresVoyage + ' L' : null]" :default-open="false">
          <div v-if="!recharges.length" class="text-xs text-muted-foreground py-2">Aucune recharge rattachée à ce voyage.</div>
          <table v-else class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Date</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Station</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Litres</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Contrôles</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in recharges" :key="r.id" class="border-b border-border/60">
                <td class="py-2 text-xs">{{ fmtDateHeure(r.date) }}</td>
                <td class="py-2 text-xs">{{ r.lieu }}</td>
                <td class="py-2 text-xs">{{ r.litres }} L</td>
                <td class="py-2">
                  <span v-if="r.statut === 'valide'" class="text-[10px] px-2 py-0.5 rounded-full bg-success-bg text-success">Conforme</span>
                  <span v-else class="text-[10px] px-2 py-0.5 rounded-full bg-danger-bg text-danger">{{ r.controles.filter((c: any) => !c.ok).length }} anomalie(s)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </FormSection>

      </div>
    </template>
  </CardModalShell>
</template>
