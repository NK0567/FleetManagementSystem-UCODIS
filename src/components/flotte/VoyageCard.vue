<script setup lang="ts">
/**
 * Fiche voyage, dossier complet de l'expédition : l'ordre, l'affectation, le
 * plan de trajet, le déroulé point par point (arrivée, déclaration,
 * confirmation, report, refus, contestation), la marchandise et ses écarts
 * par destinataire, la conformité du trajet, la fiche de débriefing et les
 * documents. La même fiche s'ouvre depuis la Flotte et depuis la fiche de
 * l'ordre de transport, dans la Planification.
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
import { calculerEcartPoids, fmtKg, fmtDateHeure, LIB_ROLE_ETAPE, STATUTS_VOYAGE, dansLaTournee, libelleFinLigne } from '../../utils/voyageUtils'
import { useVehiculeStore } from '../../stores/vehicules'
import * as cls from '../../lib/formClasses'
import { useAuthStore } from '../../stores/auth'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import FicheDebriefing from '../planification/FicheDebriefing.vue'
import DossierDocumentaire from '../planification/DossierDocumentaire.vue'
import { heurePrevue, fmtHeure, fmtRetard, retardMinutes } from '../../lib/horairesLivraison'
import { LIB_QUALIFICATION } from '../../stores/voyages'
import type { EtapeVoyage, Voyage } from '../../types'

/** sansCloture : ouvert depuis la Planification, qui porte déjà le bouton de clôture. */
const props = defineProps<{ voyages: Voyage[]; voyageId: string; sansCloture?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useVoyagesStore()
const ecartsStore = useEcartsStore()
const carburantStore = useCarburantStore()
const configStore = useConfigurationStore()
const disposTemps = useDisponibilitesStore()
const auth = useAuthStore()
const paramsPlanif = useParametresPlanificationStore()

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

const STATUTS: Record<string, string> = Object.fromEntries(Object.entries(STATUTS_VOYAGE).map(([k, v]) => [k, v.label]))

const ecartPoids = computed(() => (courant.value ? calculerEcartPoids(courant.value) : null))
/* Tolérance affichée : pour une tournée de carburant, l'écart autorisé paramétré (entreprise, client, produit). */
const toleranceAffichee = computed(() => {
  const v = courant.value
  if (!v) return ''
  if (!v.carburant) return `${v.toleranceEcartPoidsPourcent} %`
  const ctrl = useControlesTransportStore()
  const clients = [...new Set(v.etapes.filter(e => e.bonLivraison).map(e => `${e.destinataire ?? ''}|${e.produit ?? ''}`))]
  const textes = [...new Set(clients.map(k => { const [c, p] = k.split('|'); const t = ctrl.toleranceFor(c || undefined, p || undefined); return `${t.valeur.toLocaleString('fr-FR')} ${t.libelleUnite}` }))]
  return textes.length ? textes.join(' ; ') : `${ctrl.toleranceEntreprise().valeur.toLocaleString('fr-FR')} %`
})
const ecartKm = computed(() => (courant.value ? store.ecartKm(courant.value.id) : null))
const dossier = computed(() => (courant.value ? store.completudeDossier(courant.value.id) : null))
const documents = computed(() => (courant.value ? store.documentsDuVoyage(courant.value.id) : []))
const ecarts = computed(() => (courant.value ? ecartsStore.ecartsDuVoyage(courant.value.id) : []))
const compteEcarts = computed(() => (courant.value ? ecartsStore.compteDuVoyage(courant.value.id) : null))
/** Seul un écart non justifié est en faute ; un écart à qualifier reste en attente. */
const clsEcart = (nature: string) => nature === 'non_justifiee' ? 'text-danger' : nature === 'a_qualifier' ? 'text-warning' : 'text-muted-foreground'
const recharges = computed(() => (courant.value ? carburantStore.recharges.filter(r => r.voyageId === courant.value!.id) : []))
const litresVoyage = computed(() => recharges.value.reduce((s, r) => s + r.litres, 0))

const moyens = computed(() => courant.value ? store.moyensDe(courant.value) : { vehicule: '-', conducteur: '-' })
/** Unité d'une ligne : litres à 15 °C (ou litres) pour le carburant, l'unité de comptage sinon. */
const uniteDe = (e: EtapeVoyage) => courant.value ? store.uniteQuantite(courant.value, e) : paramsPlanif.parametres.uniteComptage
/** Quantité de l'ordre : somme de ses lignes encore dans la tournée, dans l'unité de ces lignes. */
const quantiteOrdre = computed(() => {
  const parUnite = new Map<string, number>()
  ;(courant.value?.etapes ?? []).filter(e => dansLaTournee(e) && e.nombreUnites != null).forEach(e => parUnite.set(uniteDe(e), (parUnite.get(uniteDe(e)) ?? 0) + (e.nombreUnites ?? 0)))
  return [...parUnite].map(([u, n]) => `${n.toLocaleString('fr-FR')} ${u}`).join(' ; ') || 'Non renseignée'
})
/** Pièces prévues au dossier (ou déjà jointes) : rien n'est affiché comme absent quand rien n'est prévu. */
const TYPES_DOC = ['ordre_transport', 'bon_chargement', 'feuille_route', 'bon_livraison', 'note_reserve'] as const
const piecesAffichees = computed(() => TYPES_DOC.filter(t => documents.value.some(d => d.type === t && (d.obligatoire || d.present))))

/** Étapes du statut de l'expédition, avec leur date quand elle est connue. */
const ORDRE_STATUTS = ['en_attente', 'planifie', 'confirme', 'pret', 'en_cours', 'livre', 'cloture'] as const
const jalons = computed(() => {
  const v = courant.value
  if (!v) return []
  const rang = v.statut === 'annule' ? -1 : ORDRE_STATUTS.indexOf(v.statut as typeof ORDRE_STATUTS[number])
  const dates: Record<string, string | undefined> = {
    en_attente: v.createdAt, planifie: v.planifieLe, confirme: v.confirmeLe, pret: v.chargementChauffeurLe,
    en_cours: v.dateDepartReel, livre: v.dateArriveeReelle, cloture: v.clotureLe,
  }
  const out: { statut: string; label: string; date?: string; atteint: boolean }[] = ORDRE_STATUTS.map((s, i) => ({ statut: s, label: STATUTS_VOYAGE[s].label, date: dates[s], atteint: v.statut === 'annule' ? !!dates[s] : i <= rang }))
  if (v.statut === 'annule') out.push({ statut: 'annule', label: STATUTS_VOYAGE.annule.label, date: v.annuleLe, atteint: true })
  return out
})

/** Points du déroulé : livraisons et passages, avec ce qui s'y est passé. */
function evenements(e: EtapeVoyage): { texte: string; cls: string }[] {
  const out: { texte: string; cls: string }[] = []
  if (e.indisponibleLe) out.push({ texte: `Indisponible : ${e.motifIndisponibilite ?? ''}`, cls: 'text-warning' })
  if (e.chargementNonConformeLe) out.push({ texte: `Non conforme au chargement : ${e.motifNonConformite ?? ''}`, cls: 'text-warning' })
  if (e.reporteLe) out.push({ texte: `Reporté le ${fmtDateHeure(e.reporteLe)} : ${e.motifReport ?? ''}`, cls: 'text-warning' })
  if (e.retourEntrepotLe) out.push({ texte: `Report demandé sur place le ${fmtDateHeure(e.retourEntrepotLe)} : ${e.motifRetour ?? ''}`, cls: 'text-warning' })
  if (e.ligneAnnuleeLe) out.push({ texte: `${libelleFinLigne(e)} le ${fmtDateHeure(e.ligneAnnuleeLe)} : ${e.motifAnnulationLigne ?? ''}`, cls: 'text-danger' })
  if (e.receptionContesteeLe) out.push({ texte: `Contestée le ${fmtDateHeure(e.receptionContesteeLe)} : ${e.motifContestation ?? ''}${e.contestationTraiteeLe ? ` · traitée : ${e.noteTraitementContestation}` : ''}`, cls: e.contestationTraiteeLe ? 'text-muted-foreground' : 'text-danger' })
  return out
}
function etat(e: EtapeVoyage): { label: string; cls: string } {
  if (e.receptionConfirmeeClientLe) return { label: 'Confirmée', cls: 'bg-success-bg text-success' }
  if (e.receptionContesteeLe) return { label: 'Contestée', cls: 'bg-danger-bg text-danger' }
  if (e.ligneAnnuleeLe) return { label: libelleFinLigne(e)!, cls: 'bg-danger-bg text-danger' }
  if (e.indisponibleLe || e.chargementNonConformeLe || e.retourEntrepotLe) return { label: 'À replanifier', cls: 'bg-warning-bg text-warning' }
  if (e.livreParChauffeurLe) return { label: 'Déclarée', cls: 'bg-info-bg text-info' }
  if (e.reporteLe) return { label: 'Reportée', cls: 'bg-warning-bg text-warning' }
  if (e.franchi) return { label: 'Desservi', cls: 'bg-success-bg text-success' }
  if (e.arriveeLe) return { label: 'Sur place', cls: 'bg-info-bg text-info' }
  if (voyageTermine.value) return { label: 'Manqué', cls: 'bg-danger-bg text-danger' }
  return { label: 'À desservir', cls: 'bg-neutral-bg text-neutral' }
}
const prevueDe = (e: EtapeVoyage) => courant.value ? heurePrevue(courant.value, e) : null
const retardDe = (e: EtapeVoyage) => courant.value && e.arriveeLe ? retardMinutes(courant.value, e) : null
/** Marchandise et écarts, destinataire par destinataire. */
const livraisonsDestinataires = computed(() => courant.value?.etapes.filter(e => e.destinataire).sort((a, b) => a.ordre - b.ordre) ?? [])

/* Comme sur la carte du tableau : une ligne sortie de la tournée n'est plus à desservir. */
const avancement = computed(() => {
  const lignes = courant.value?.etapes.filter(dansLaTournee) ?? []
  const total = lignes.length
  const faits = lignes.filter(e => e.franchi).length
  return { total, faits, pct: total ? Math.round((faits / total) * 100) : 0 }
})
/** Un site n'est manqué qu'une fois le voyage terminé ; avant, il reste à desservir. */
const voyageTermine = computed(() => !!courant.value && ['livre', 'cloture'].includes(courant.value.statut))
/* Une livraison refusée, annulée ou sortie de la tournée est réglée : elle n'est pas un site manqué. */
const sitesManques = computed(() => (voyageTermine.value ? courant.value?.etapes.filter(e => !e.franchi && dansLaTournee(e)).length ?? 0 : 0))
/** Le conducteur n'est dit « déduit de l'affectation » que s'il l'est vraiment :
 *  un conducteur choisi à la main par le planificateur ne l'est pas. */
const vehiculesStore = useVehiculeStore()
const conducteurDeduit = computed(() => !!courant.value?.vehiculeId && !!courant.value.chauffeurId
  && vehiculesStore.affectationActive(courant.value.vehiculeId)?.conducteurId === courant.value.chauffeurId)

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

/** Même règle de clôture que depuis la Planification (store.cloturer). */
const blocagesCloture = computed(() => courant.value?.statut === 'livre' ? store.blocagesCloture(courant.value.id, kmRetourSaisi.value) : [])
const peutCloturer = computed(() => paramsPlanif.peutPiloter(auth.role))
function cloturerVoyage() {
  erreurCloture.value = ''; resultatCloture.value = ''; alerteCloture.value = ''
  if (!courant.value) return
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
        <FormSection title="Identification" :recaps="[courant.reference, courant.numeroOT]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Référence du voyage</span><span :class="lecture" class="font-mono font-semibold">{{ courant.reference }}</span></div>
            <div :class="champ"><span :class="champLabel">N° d'ordre de transport</span><span :class="lecture" class="font-mono">{{ courant.numeroOT ?? '-' }}</span></div>
            <div v-if="courant.modeTransport" :class="champ"><span :class="champLabel">Mode de transport</span><span :class="lecture">{{ courant.modeTransport }}</span></div>
            <div :class="champ"><span :class="champLabel">{{ courant.carburant ? 'Écart autorisé' : "Tolérance d'écart de poids" }}</span><span :class="lecture">{{ toleranceAffichee }}</span></div>
            <div :class="champ"><span :class="champLabel">Produit transporté</span><span :class="lecture">{{ courant.marchandise.typeProduit }}</span></div>
            <div :class="champ"><span :class="champLabel">Itinéraire</span><span :class="lecture">{{ courant.origine }} → {{ courant.destination }}</span></div>
          </div>
        </FormSection>

        <!-- 2. AFFECTATION -->
        <FormSection title="Affectation" :recaps="[moyens.vehicule, moyens.conducteur]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <template v-if="courant.moyen === 'externe'">
              <div :class="champ"><span :class="champLabel">Transporteur externe</span><span :class="lecture" class="font-semibold">{{ courant.transporteurNom ?? '-' }}</span></div>
              <div :class="champ"><span :class="champLabel">Véhicule du transporteur</span><span :class="lecture" class="font-mono">{{ courant.vehiculeTransporteurPlaque ?? 'Non précisé' }}</span></div>
              <div :class="champ"><span :class="champLabel">Conducteur du transporteur</span><span :class="lecture">{{ courant.conducteurTransporteurNom ?? 'Non précisé' }}</span></div>
            </template>
            <template v-else>
            <div :class="champ"><span :class="champLabel">Tracteur</span><span :class="lecture" class="font-mono font-semibold">{{ courant.vehiculePlaque ?? '-' }}</span></div>
            <div :class="champ"><span :class="champLabel">Semi-remorque attelée</span><span :class="lecture" class="font-mono">{{ courant.semiRemorquePlaque ?? '-' }}</span></div>
            <div :class="champ"><span :class="champLabel">Conducteur <span v-if="conducteurDeduit" class="normal-case font-normal text-muted-foreground">· déduit de l'affectation</span></span><span :class="lecture">{{ courant.chauffeurNom ?? '-' }}</span></div>
            </template>
            <div :class="champ"><span :class="champLabel">Départ prévu</span><span :class="lecture">{{ fmtDateHeure(courant.datePlanifiee) }}</span></div>
            <div :class="champ"><span :class="champLabel">Début d'exécution</span><span :class="lecture">{{ fmtDateHeure(courant.dateDepartReel) }}</span></div>
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
          <table v-if="courant.planTrajet?.length" class="w-full border-collapse mb-3">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">#</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Point du trajet de référence</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Rôle</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Trajet maximal</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Arrêt maximal</th>
            </tr></thead>
            <tbody>
              <tr v-for="p in courant.planTrajet" :key="p.id" class="border-b border-border/60 text-xs">
                <td class="py-1.5 font-mono">{{ p.ordre }}</td><td class="py-1.5">{{ p.siteNom }}</td><td class="py-1.5 text-muted-foreground">{{ LIB_ROLE_ETAPE[p.role] }}</td>
                <td class="py-1.5">{{ p.intervalleMin ? `${p.intervalleMin} min` : '-' }}</td><td class="py-1.5">{{ p.pausePrevueMin ? `${p.pausePrevueMin} min` : '-' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="courant.historiqueItineraire?.length" class="mb-3">
            <span :class="champLabel">Historique de l'itinéraire</span>
            <p v-for="h in courant.historiqueItineraire" :key="h.le" class="text-xs text-foreground">{{ fmtDateHeure(h.le) }} · {{ h.ancienLibelle }} → {{ h.nouveauLibelle }} <span class="text-muted-foreground">({{ h.motif }}, {{ h.par }})</span></p>
          </div>
          <FleetMap v-if="courant.etapes.length" :trace-prevu="courant.etapes.map(e => ({ lat: e.lat, lng: e.lng }))" :marqueurs="marqueursEtapes" height="280px" :show-legend="false" />
        </FormSection>

        <!-- 4. DÉROULÉ SITE PAR SITE -->
        <FormSection title="Déroulé point par point" :recaps="[STATUTS[courant.statut], `${avancement.faits}/${avancement.total} desservis`, sitesManques ? `${sitesManques} manqué(s)` : null]">
          <div class="flex items-start gap-1 mb-4 flex-wrap">
            <div v-for="j in jalons" :key="j.statut" class="flex-1 min-w-[90px] rounded-md px-2 py-1.5" :class="j.atteint ? (j.statut === 'annule' ? 'bg-danger-bg' : 'bg-success-bg') : 'bg-background'">
              <p class="text-[10px] font-semibold" :class="j.atteint ? (j.statut === 'annule' ? 'text-danger' : 'text-success') : 'text-muted-foreground'">{{ j.label }}</p>
              <p class="text-[10px] text-muted-foreground">{{ j.date ? fmtDateHeure(j.date) : '' }}</p>
            </div>
          </div>
          <div v-if="courant.etapes.length" class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-2 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="avancement.pct === 100 ? 'bg-success' : 'bg-primary'" :style="{ width: avancement.pct + '%' }"></div></div>
            <span class="text-xs font-semibold">{{ avancement.pct }} %</span>
          </div>
          <table v-if="courant.etapes.length" class="w-full border-collapse">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">#</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Site</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Rôle</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Prévue</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Arrivée</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Déclaration</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Confirmation</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">État</th>
            </tr></thead>
            <tbody>
              <template v-for="e in [...courant.etapes].sort((a, b) => a.ordre - b.ordre)" :key="e.id">
              <tr class="border-b border-border/60 align-top">
                <td class="py-2 text-xs font-mono">{{ e.ordre }}</td>
                <td class="py-2">
                  <span class="text-xs font-medium text-foreground">{{ e.destinataire ?? e.siteNom }}</span>
                  <span v-if="e.destinataire" class="block text-[11px] text-muted-foreground">{{ e.adresseLivraison ?? e.siteNom }}</span>
                  <span v-for="ev in evenements(e)" :key="ev.texte" class="block text-[11px]" :class="ev.cls">{{ ev.texte }}</span>
                </td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background text-muted-foreground">{{ LIB_ROLE_ETAPE[e.role] }}</span></td>
                <td class="py-2 text-xs">{{ prevueDe(e) ? fmtHeure(prevueDe(e)) : '-' }}</td>
                <td class="py-2 text-xs">{{ e.arriveeLe ? fmtDateHeure(e.arriveeLe) : '-' }}<span v-if="retardDe(e)" class="block text-[11px]" :class="(retardDe(e) ?? 0) > 0 ? 'text-danger' : 'text-success'">{{ fmtRetard(retardDe(e)) }}</span></td>
                <td class="py-2 text-xs">{{ e.livreParChauffeurLe ? fmtDateHeure(e.livreParChauffeurLe) : '-' }}</td>
                <td class="py-2 text-xs">{{ e.receptionConfirmeeClientLe ? fmtDateHeure(e.receptionConfirmeeClientLe) : e.livreParChauffeurLe && e.destinataire && !e.receptionContesteeLe ? 'En attente du client' : '-' }}<span v-if="e.eBL?.signePar" class="block text-[11px] text-muted-foreground">{{ e.eBL.signePar }}</span></td>
                <td class="py-2"><span class="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" :class="etat(e).cls">{{ etat(e).label }}</span></td>
              </tr>
              </template>
            </tbody>
          </table>
          <p v-else class="text-[12px] text-muted-foreground italic">Aucune séquence de site enregistrée pour ce voyage ponctuel.</p>
        </FormSection>

        <!-- 5. MARCHANDISE ET ÉCART DE POIDS (équivalent UCODIS de « Volumétrie & coulage ») -->
        <FormSection title="Marchandise et écart de poids" :recaps="[courant.marchandise.typeProduit, ecartPoids?.ecartPourcent != null ? `${ecartPoids.ecartPourcent} %` : null]">
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 max-sm:grid-cols-1">
            <div :class="champ"><span :class="champLabel">Type de marchandise</span><span :class="lecture">{{ courant.marchandise.typeProduit }}</span></div>
            <div :class="champ"><span :class="champLabel">Quantité de l'ordre</span><span :class="lecture" data-quantite-ordre>{{ quantiteOrdre }}</span></div>
            <div :class="champ"><span :class="champLabel">Poids chargé</span><span :class="lecture">{{ fmtKg(courant.marchandise.poidsChargeKg) }}</span></div>
            <div :class="champ"><span :class="champLabel">Poids livré</span><span :class="lecture">{{ courant.marchandise.poidsDechargeKg != null ? fmtKg(courant.marchandise.poidsDechargeKg) : 'Non renseigné' }}</span></div>
          </div>
          <div v-if="ecartPoids && ecartPoids.ecartPourcent != null" class="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <span class="text-[13px] font-semibold" :class="{ 'text-success': ecartPoids.verdict === 'dans_tolerance', 'text-warning': ecartPoids.verdict === 'hors_mineur', 'text-danger': ecartPoids.verdict === 'hors_majeur' }">Écart : {{ ecartPoids.ecartPourcent }} %</span>
            <span class="text-[11px] text-muted-foreground">seuil {{ toleranceAffichee }}</span>
          </div>
          <table v-if="livraisonsDestinataires.length" class="w-full border-collapse mt-3">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Destinataire</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Chargé</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Reçu</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Écart</th>
            </tr></thead>
            <tbody>
              <tr v-for="e in livraisonsDestinataires" :key="e.id" class="border-b border-border/60 align-top text-xs">
                <td class="py-2"><span class="font-medium text-foreground">{{ e.destinataire }}</span><span v-if="e.referenceExterne" class="block text-[11px] font-mono text-muted-foreground">{{ e.referenceExterne }}</span></td>
                <td class="py-2">{{ e.contenuCharge ?? e.contenuCommande ?? '-' }}<span v-if="e.nombreUnites != null" class="block text-[11px] text-muted-foreground">{{ e.nombreUnites.toLocaleString('fr-FR') }} {{ uniteDe(e) }}<template v-if="e.poidsKg"> · {{ fmtKg(e.poidsKg) }}</template></span></td>
                <td class="py-2">{{ e.quantiteRecue != null ? `${e.quantiteRecue.toLocaleString('fr-FR')} ${uniteDe(e)}` : '-' }}<span v-if="e.quantiteConfirmeeClientLe" class="block text-[11px] text-success">confirmé par le destinataire</span>
                  <span v-for="a in e.eBL?.articlesNonLivres ?? []" :key="a.libelle" class="block text-[11px] text-warning line-through">{{ a.libelle }} ({{ a.motif }})</span></td>
                <td class="py-2">
                  <template v-if="e.ecartQuantite">
                    <span :class="e.ecartQuantite.qualification ? 'text-foreground' : 'text-warning'">{{ e.ecartQuantite.ecart > 0 ? '+' : '' }}{{ e.ecartQuantite.ecart }} {{ e.ecartQuantite.unite ?? uniteDe(e) }}</span>
                    <span class="block text-[11px]" :class="e.ecartQuantite.qualification ? 'text-muted-foreground' : 'text-warning'">{{ e.ecartQuantite.qualification ? `${LIB_QUALIFICATION[e.ecartQuantite.qualification]}, ${e.ecartQuantite.imputableConducteur ? 'imputable' : 'non imputable'} au conducteur` : 'À qualifier' }}</span>
                  </template>
                  <span v-else class="text-muted-foreground">{{ e.quantiteRecue != null ? 'Dans la tolérance' : '-' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
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

        <!-- FICHE DE DÉBRIEFING -->
        <FormSection v-if="['en_cours', 'livre', 'cloture'].includes(courant.statut) || courant.debriefing" title="Fiche de débriefing" :recaps="[courant.debriefing ? 'Enregistrée' : 'Non enregistrée']" :default-open="false">
          <FicheDebriefing :voyage="courant" lecture-seule />
        </FormSection>

        <!-- 8. DOSSIER DOCUMENTAIRE -->
        <FormSection title="Dossier documentaire" :recaps="[dossier?.total ? `${dossier.presents}/${dossier.total}` : null]">
          <div v-if="dossier?.total" class="flex items-center gap-2 mb-3" data-jauge-dossier>
            <div class="flex-1 h-2 rounded-full bg-background overflow-hidden"><div class="h-full rounded-full" :class="dossier?.complet ? 'bg-success' : 'bg-warning'" :style="{ width: dossier ? (dossier.presents / dossier.total) * 100 + '%' : '0%' }"></div></div>
            <span class="text-xs font-semibold">{{ dossier ? `${dossier.presents}/${dossier.total}` : '-' }}</span>
          </div>
          <div v-if="piecesAffichees.length" class="flex flex-col gap-2" data-pieces-dossier>
            <div v-for="type in piecesAffichees" :key="type"
                 class="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
              <span class="text-[13px] text-foreground">{{ LIB_DOC[type as keyof typeof LIB_DOC] }}</span>
              <template v-if="documents.find(d => d.type === type)?.present">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success-bg text-success">{{ documents.find(d => d.type === type)?.numero ?? 'Présent' }}</span>
              </template>
              <span v-else class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-bg text-neutral">Absent</span>
            </div>
          </div>
          <div :class="piecesAffichees.length ? 'mt-4 pt-3 border-t border-border' : ''">
            <p :class="champLabel" class="mb-1">Produit par l'expédition</p>
            <DossierDocumentaire :voyage="courant" />
          </div>
          <template v-if="courant.statut === 'livre' && peutCloturer && !props.sansCloture">
            <div :class="champ" class="mt-3.5">
              <label :class="champLabel">Kilométrage au retour</label>
              <input v-model.number="kmRetourSaisi" type="number" :class="cls.fieldInput" placeholder="Repris du compteur si vide" />
              <p v-if="courant.kmDepart != null" class="text-[11px] text-muted-foreground">Départ relevé à {{ courant.kmDepart.toLocaleString('fr-FR') }} km.</p>
            </div>
            <p v-for="b in blocagesCloture" :key="b" class="text-[11px] text-warning mt-1.5">{{ b }}</p>
            <p v-if="erreurCloture" class="text-[12px] text-danger flex items-center gap-1.5 mt-2"><AlertCircle class="w-3.5 h-3.5 shrink-0" /> {{ erreurCloture }}</p>
            <button :class="cls.btnPrimary" class="w-full justify-center mt-2.5" :disabled="blocagesCloture.length > 0" @click="cloturerVoyage">Clôturer le voyage</button>
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
