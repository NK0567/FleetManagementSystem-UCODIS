<script setup lang="ts">
import { maintenantMs } from '../../utils/horloge'
/**
 * Fiche d'un ordre de transport - à la fois l'écran de création et
 * celui de consultation/édition, en une seule fiche en superposition,
 * pour qu'il n'y ait jamais l'impression de changer d'écran entre les
 * deux : la création n'affiche que la section Générale ; valider la
 * création fait immédiatement apparaître la section Lignes de
 * livraison à la suite, sans fermer ni rouvrir quoi que ce soit.
 *
 * Un ordre n'est jamais figé à un seul client : le destinataire se
 * rattache à chaque ligne, jamais à l'ordre lui-même, si bien que la
 * section Générale ne porte plus de champ Client. Une ligne peut aussi
 * bien être une livraison chez un client qu'un transfert entre deux
 * sites internes.
 *
 * Planifier affecte l'ordre au conducteur, qui en est notifié : il n'y a
 * pas d'étape où il accepterait ou refuserait. L'ordre passe en cours dès
 * que le conducteur marque son arrivée au premier point. Planifier, annuler
 * et clôturer sont réservés aux rôles habilités dans les paramètres.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import FleetMap from './FleetMap.vue'
import VoyageCard from './VoyageCard.vue'
import ChoixMotif from '../planification/ChoixMotif.vue'
import FicheDebriefing from '../planification/FicheDebriefing.vue'
import SuiteLivraison from '../planification/SuiteLivraison.vue'
import FacturationExpedition from '../planification/FacturationExpedition.vue'
import DossierDocumentaire from '../planification/DossierDocumentaire.vue'
import ExecutionTransporteur from '../planification/ExecutionTransporteur.vue'
import TourneeCarburant from '../planification/TourneeCarburant.vue'
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, CalendarClock, CheckCircle2, Circle, CircleX, Clock,
  FileCheck, FolderOpen, ListOrdered, Mail, MapPin, MapPinCheck, Navigation, Package, Printer, ShieldAlert, Smartphone, Star, Truck, UserCheck, X, XCircle,
} from '@lucide/vue'
import * as cls from '../../lib/formClasses'
import { useVoyagesStore } from '../../stores/voyages'
import { useCommandesStore } from '../../stores/commandes'
import { useParametresPlanificationStore } from '../../stores/parametresPlanification'
import { useAuthStore } from '../../stores/auth'
import { useClientsStore } from '../../stores/clients'
import { useVehiculeStore } from '../../stores/vehicules'
import { usePersonnelStore } from '../../stores/personnel'
import { useTrajetsStore } from '../../stores/trajets'
import { useSitesStore } from '../../stores/sites'
import { useDocumentsVehiculeStore } from '../../stores/documentsVehicule'
import { useDocumentsStore } from '../../stores/documentsPersonnel'
import { useProduitsStore } from '../../stores/produits'
import { usePrestatairesStore } from '../../stores/prestataires'
import { useContraintesLivraisonStore } from '../../stores/contraintesLivraison'
import { useControlesTransportStore } from '../../stores/controlesTransport'
import { heurePrevue, heureEstimee, retardMinutes, estEnRetard, positionVehicule, positionInconnue, fmtHeure, fmtRetard } from '../../lib/horairesLivraison'
import { distanceKm } from '../../lib/propositionChargement'
import { lieuLisible, distanceTraceM } from '../../utils/geo'
import { useTelematiqueStore } from '../../stores/telematique'
import { useConfigurationStore } from '../../stores/configuration'
import { LIB_ROLE_ETAPE } from '../../utils/voyageUtils'
import { fmtDateHeure, horsTournee, chargeOrdre, dansLaTournee, retourAControler, STATUTS_VOYAGE, libelleFinLigne } from '../../utils/voyageUtils'
import type { Commande, EtapeVoyage, Voyage } from '../../types'

const props = defineProps<{ voyages: Voyage[]; voyageId: string }>()
const emit = defineEmits<{ close: []; created: [id: string]; ouvrir: [id: string] }>()

const store = useVoyagesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const trajets = useTrajetsStore()
const sitesStore = useSitesStore()
const docsVehicule = useDocumentsVehiculeStore()
const docsPersonnel = useDocumentsStore()
const auth = useAuthStore()
const paramsPlanif = useParametresPlanificationStore()
/** Planifier, annuler, clôturer : rôles habilités seulement. */
const peutPiloter = computed(() => paramsPlanif.peutPiloter(auth.role))

/** Chaîne vide = fiche en création : aucun enregistrement n'existe
 *  encore. Dès la création validée, idCourant prend l'identifiant du
 *  nouvel ordre et la même fiche continue, inchangée à l'écran. */
const idCourant = ref(props.voyageId)
/** Le parent peut rouvrir la fiche sur un autre ordre sans démonter ce
 *  composant (ex. « Voir le nouvel ordre ») : sans cette resynchronisation,
 *  idCourant resterait figé sur l'ordre ouvert au premier montage. */
watch(() => props.voyageId, v => { idCourant.value = v })
const enCreation = computed(() => !idCourant.value)
const courant = computed<Voyage | null>(() => (idCourant.value ? store.getById(idCourant.value) ?? null : null))

const STATUTS = STATUTS_VOYAGE

/** Message affiché dans la fiche : motif d'un refus ou résultat d'une action. */
const message = ref<{ texte: string; erreur: boolean } | null>(null)
function resultat(res: { ok: boolean; motif?: string }, succes?: string) {
  message.value = res.ok ? (succes ? { texte: succes, erreur: false } : null) : { texte: res.motif ?? 'Action impossible.', erreur: true }
  return res.ok
}

/** Les lignes, comme le général, ne se modifient qu'avant le
 *  déclenchement de l'exécution : une fois « en cours », seul le
 *  chauffeur fait progresser la tournée, en recueillant les
 *  signatures. */
/** Tant que la tournée n'est pas encore Confirmée, elle reste
 *  modifiable : le planificateur peut retirer une ligne dont le
 *  destinataire s'avère indisponible, sans attendre qu'elle repasse en
 *  attente. */
const modifiable = computed(() => !auth.lectureSeule && (enCreation.value || courant.value?.statut === 'en_attente' || courant.value?.statut === 'planifie'))
/** Conducteur et semi-remorque restent modifiables à la main à tout moment,
 *  jusqu'à la fin de la tournée (terminée, clôturée ou annulée). */
const affectationModifiable = computed(() => !auth.lectureSeule && (enCreation.value || (!!courant.value && !['livre', 'cloture', 'annule'].includes(courant.value.statut))))
/** Tournée de carburant : composée, chargée et modifiée par ses propres sections (plan de chargement, bons). */
const carburant = computed(() => !!courant.value?.carburant)
/** Ordre annulé ou clôturé : plus aucune action, seulement la consultation. */
const figee = computed(() => !!courant.value && store.figee(courant.value))
const peutAnnuler = computed(() => peutPiloter.value && !!courant.value && courant.value.statut !== 'livre' && courant.value.statut !== 'cloture' && courant.value.statut !== 'annule')
watch(idCourant, () => { message.value = null })

const pageTitle = computed(() => {
  if (enCreation.value) return 'Nouvel ordre de transport'
  return courant.value ? `${courant.value.numeroOT || courant.value.reference} · ${courant.value.clientNom}` : ''
})

/* ── Navigation entre fiches, comme partout ailleurs dans l'application ── */
const index = computed(() => props.voyages.findIndex(v => v.id === idCourant.value))
const hasPrev = computed(() => !enCreation.value && index.value > 0)
const hasNext = computed(() => !enCreation.value && index.value >= 0 && index.value < props.voyages.length - 1)
const currentNo = computed(() => courant.value?.numeroOT || courant.value?.reference || null)
const sidebarItems = computed(() => props.voyages.map(v => ({ no: v.numeroOT || v.reference, label: v.clientNom })))
function goPrev() { if (hasPrev.value) idCourant.value = props.voyages[index.value - 1]!.id }
function goNext() { if (hasNext.value) idCourant.value = props.voyages[index.value + 1]!.id }
function selectSidebar(no: string) { const v = props.voyages.find(x => (x.numeroOT || x.reference) === no); if (v) idCourant.value = v.id }

/* ── Général : champs communs à la création et à l'édition ───────── */
const enEdition = ref(true)
const produitsStore = useProduitsStore()
const prestataires = usePrestatairesStore()
const contraintesStore = useContraintesLivraisonStore()
const controles = useControlesTransportStore()
const formVide = () => ({
  vehiculeId: '', chauffeurIdManuel: '', semiRemorqueId: '', datePlanifiee: '', numeroOT: '',
  confirmationRequise: true,
  moyen: 'propres' as 'propres' | 'externe', transporteurId: '', vehiculeTransporteurId: '', conducteurTransporteurId: '',
  modeTransport: paramsPlanif.parametres.modesTransport[0] ?? '', trajetId: '',
})
const form = ref(formVide())
/* À la réouverture, le conducteur et la semi-remorque sont ceux enregistrés
 * sur l'ordre, y compris s'ils ont été choisis à la main. */
watch(courant, v => {
  if (!v) return
  form.value = {
    vehiculeId: v.vehiculeId ?? '', chauffeurIdManuel: v.chauffeurId ?? '', semiRemorqueId: v.semiRemorqueId ?? '', datePlanifiee: v.datePlanifiee,
    numeroOT: v.numeroOT ?? '',
    confirmationRequise: v.confirmationRequise ?? true,
    moyen: v.moyen ?? 'propres', transporteurId: v.transporteurId ?? '', vehiculeTransporteurId: v.vehiculeTransporteurId ?? '', conducteurTransporteurId: v.conducteurTransporteurId ?? '',
    modeTransport: v.modeTransport ?? '', trajetId: v.trajetId ?? '',
  }
  enEdition.value = false
}, { immediate: true })

/** Le chauffeur se déduit de l'affectation du véhicule choisi, mais ce
 *  n'est qu'une proposition : la planification ne l'impose jamais sans
 *  vérifier qu'il n'est pas en congé, et le planificateur peut à tout
 *  moment le remplacer à la main - notamment pour cette raison. */
const chauffeurDeduitId = computed(() => {
  if (!form.value.vehiculeId) return null
  return vehicules.affectationActive(form.value.vehiculeId)?.conducteurId ?? null
})
/** Seul un changement de véhicule fait par le planificateur propose le
 *  conducteur et la semi-remorque déduits ; revenir au véhicule enregistré
 *  reprend ce qui était enregistré. Les deux champs restent modifiables. */
watch(() => form.value.vehiculeId, id => {
  const v = courant.value
  if (v && id === (v.vehiculeId ?? '')) {
    form.value.chauffeurIdManuel = v.chauffeurId ?? ''
    form.value.semiRemorqueId = v.semiRemorqueId ?? ''
    return
  }
  form.value.chauffeurIdManuel = (id && vehicules.affectationActive(id)?.conducteurId) || ''
  form.value.semiRemorqueId = (id && vehicules.attelageActif(id)?.semiRemorqueId) || ''
})
const chauffeurEffectifId = computed(() => form.value.chauffeurIdManuel || chauffeurDeduitId.value)
const chauffeur = computed(() => chauffeurEffectifId.value ? personnel.parId(chauffeurEffectifId.value)?.nomComplet ?? null : null)
/** Comme les véhicules : seuls les conducteurs disponibles à la date prévue et aux pièces en règle sont proposés. */
const optConducteurs = computed<DropdownItem[]>(() => personnel.conducteurs
  .filter(c => store.controleConducteur(c.id, form.value.datePlanifiee || undefined, courant.value?.id).ok)
  .map(c => ({ id: c.id, label: c.nomComplet })))

/** Indisponibilité du chauffeur retenu (déduit ou choisi à la main),
 *  pour quelque motif que ce soit - absence approuvée ou déjà engagé
 *  ailleurs - signalée, jamais juste ignorée. */
const chauffeurIndispo = computed(() => {
  if (!chauffeurEffectifId.value) return null
  return store.chauffeurIndisponible(chauffeurEffectifId.value, form.value.datePlanifiee || undefined, courant.value?.id)
})

const semiRemorque = computed(() => form.value.semiRemorqueId ? vehicules.parId(form.value.semiRemorqueId)?.immatriculation ?? null : null)
/** Semi-remorques proposées : en état, en règle, et non engagées sur un autre
 *  ordre ; celle attelée au tracteur choisi et celle enregistrée en tête. */
const optSemiRemorques = computed<DropdownItem[]>(() => {
  const attelee = form.value.vehiculeId ? vehicules.attelageActif(form.value.vehiculeId)?.semiRemorqueId : undefined
  return vehicules.semiRemorques
    .filter(s => s.id === courant.value?.semiRemorqueId || s.id === attelee
      || (vehicules.estUtilisable(s) && docsVehicule.enRegle(s.id) && !vehicules.attelageDe(s.id) && !store.remorqueOccupee(s.id, courant.value?.id)))
    .map(s => ({ id: s.id, label: s.immatriculation, sublabel: s.id === attelee ? 'Attelée au tracteur' : s.chargeMaxKg ? `${s.chargeMaxKg.toLocaleString('fr-FR')} kg` : undefined }))
})

/** Un véhicule dont une pièce administrative est expirée, ou déjà engagé
 *  sur un autre ordre non terminé, n'est simplement pas proposé au choix :
 *  la planification fait ce qui lui incombe en silence, sans message. */
/** L'infobulle des destinataires se pilote par un état réactif plutôt que
 *  par le survol CSS pur, jugé instable dans cette configuration Tailwind. */
const infobulle = ref<'destinataires' | null>(null)
const optVehicules = computed<DropdownItem[]>(() =>
  vehicules.tracteurs
    .filter(t => {
      const sr = vehicules.attelageActif(t.id)?.semiRemorqueId
      return docsVehicule.enRegle(t.id) && (!sr || docsVehicule.enRegle(sr)) && vehicules.estUtilisable(t) && !store.vehiculeOccupe(t.id, courant.value?.id)
    })
    .map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))
/** Marchandise de l'ordre : jamais saisie, calculée à partir des produits des lignes. */
const marchandiseOrdre = computed(() => courant.value?.carburant ? courant.value.marchandise.typeProduit : store.marchandiseDe(lignesAffichees.value))

/* ── Moyens : nos véhicules ou un transporteur externe ── */
const externe = computed(() => (enEdition.value ? form.value.moyen : courant.value?.moyen) === 'externe')
const optTransporteurs = computed<DropdownItem[]>(() => prestataires.transporteursAutorises().map(t => ({ id: t.id, label: t.nom, sublabel: t.telephone })))
const transporteurChoisi = computed(() => prestataires.getById(enEdition.value ? form.value.transporteurId : courant.value?.transporteurId))
const optVehiculesTransporteur = computed<DropdownItem[]>(() => (transporteurChoisi.value?.vehicules ?? []).map(x => ({ id: x.id, label: x.immatriculation, sublabel: [x.typeVehicule, x.chargeUtileKg ? `${x.chargeUtileKg.toLocaleString('fr-FR')} kg` : ''].filter(Boolean).join(' · ') })))
const optConducteursTransporteur = computed<DropdownItem[]>(() => (transporteurChoisi.value?.conducteurs ?? []).map(x => ({ id: x.id, label: x.nom, sublabel: x.telephone })))
watch(() => form.value.transporteurId, (id, ancien) => { if (ancien !== undefined && id !== ancien && id !== (courant.value?.transporteurId ?? '')) { form.value.vehiculeTransporteurId = ''; form.value.conducteurTransporteurId = '' } })
const optModes = computed(() => paramsPlanif.parametres.modesTransport)
const optTrajets = computed<DropdownItem[]>(() => [{ id: '', label: 'Aucun' }, ...trajets.actifs.map(t => ({ id: t.id, label: t.libelle, sublabel: `${t.distanceEstimeeKm} km` }))])
/** Moyens annoncés (véhicule, conducteur), quels qu'ils soient. */
const moyens = computed(() => courant.value ? store.moyensDe(courant.value) : { vehicule: '-', conducteur: '-' })

/* ── Date dépassée ── */
const depassement = computed(() => courant.value ? controles.etatDepassement(courant.value) : null)
const depassementCommande = (c: Commande) => controles.etatDepassement(c)

const blocages = computed(() => {
  const out: string[] = []
  if (!enEdition.value || form.value.moyen === 'externe') return out
  if (form.value.vehiculeId && !chauffeur.value) out.push("Ce véhicule n'a aucun conducteur affecté : choisissez un conducteur à la main.")
  if (chauffeurIndispo.value) out.push(`${chauffeur.value} n'est pas disponible (${chauffeurIndispo.value}) : choisissez un autre conducteur.`)
  if (chauffeurEffectifId.value && !docsPersonnel.enRegle(chauffeurEffectifId.value)) out.push(`${chauffeur.value} n'est pas en règle : une pièce obligatoire est expirée ou manquante.`)
  return out
})

function enterEdit() { enEdition.value = true }
function cancelEdit() { enEdition.value = false }

/** Valide la section Générale : crée l'ordre s'il n'existe pas encore
 *  (la fiche continue alors, sans se fermer), ou met à jour l'existant. */
const erreur = ref('')
function save() {
  erreur.value = ''
  if (form.value.moyen === 'externe') { saveExterne(); return }
  if (!form.value.vehiculeId) { erreur.value = 'Choisissez un véhicule.'; return }
  if (!form.value.datePlanifiee) { erreur.value = 'Renseignez la date prévue.'; return }
  if (!chauffeur.value) { erreur.value = 'Choisissez un conducteur.'; return }
  if (chauffeurIndispo.value) { erreur.value = `${chauffeur.value} n'est pas disponible (${chauffeurIndispo.value}) : choisissez un autre conducteur.`; return }
  if (!docsPersonnel.enRegle(chauffeurEffectifId.value!)) { erreur.value = `${chauffeur.value} n'est pas en règle : une pièce obligatoire est expirée ou manquante.`; return }
  /* Même contrôle qu'en modification : une semi-remorque déjà engagée ailleurs est refusée. */
  if (enCreation.value && form.value.semiRemorqueId && store.remorqueOccupee(form.value.semiRemorqueId)) { erreur.value = 'Cette semi-remorque est déjà engagée sur un autre ordre.'; return }

  const vehicule = vehicules.parId(form.value.vehiculeId)

  if (enCreation.value) {
    const cree = store.creerOrdreControle({
      vehiculeId: form.value.vehiculeId, vehiculePlaque: vehicule?.immatriculation ?? '',
      chauffeurId: chauffeurEffectifId.value ?? undefined, chauffeurNom: chauffeur.value ?? undefined,
      semiRemorqueId: form.value.semiRemorqueId || undefined, semiRemorquePlaque: semiRemorque.value ?? undefined,
      datePlanifiee: form.value.datePlanifiee,
      numeroOT: form.value.numeroOT,
      confirmationRequise: form.value.confirmationRequise,
      moyen: 'propres', modeTransport: form.value.modeTransport || undefined, trajetId: form.value.trajetId || undefined,
    })
    if (!cree.ok || !cree.id) { erreur.value = cree.motif ?? ''; return }
    idCourant.value = cree.id
    emit('created', cree.id)
    return
  }

  const v = courant.value
  if (!v) return
  const moyensAvant = store.moyensDe(v)
  if (modifiable.value) {
    const t = store.definirTransport(v.id, { moyen: 'propres', modeTransport: form.value.modeTransport || undefined, trajetId: form.value.trajetId || undefined })
    if (!t.ok) { erreur.value = t.motif ?? ''; return }
  }
  const res = store.modifierAffectation(v.id, {
    chauffeurId: chauffeurEffectifId.value ?? undefined, chauffeurNom: chauffeur.value ?? undefined,
    semiRemorqueId: form.value.semiRemorqueId || undefined, semiRemorquePlaque: semiRemorque.value ?? undefined,
  })
  if (!res.ok) { erreur.value = res.motif ?? ''; return }
  if (modifiable.value) {
    v.vehiculeId = form.value.vehiculeId
    v.vehiculePlaque = vehicule?.immatriculation
    v.datePlanifiee = form.value.datePlanifiee
    v.numeroOT = form.value.numeroOT || undefined
  }
  /* La confirmation par destinataire ne se règle qu'avant la planification. */
  if (v.statut === 'en_attente') v.confirmationRequise = form.value.confirmationRequise
  store.recalculerHeuresPrevues(v.id)
  store.renotifierSiMoyensChanges(v.id, moyensAvant)
  enEdition.value = false
}

/** Transporteur externe : ni véhicule ni conducteur de la flotte ; son
 *  véhicule et son conducteur sont facultatifs. */
function saveExterne() {
  const f = form.value
  if (!f.transporteurId) { erreur.value = 'Choisissez le transporteur externe.'; return }
  if (!f.datePlanifiee) { erreur.value = 'Renseignez la date prévue.'; return }
  if (enCreation.value) {
    const cree = store.creerOrdreControle({
      datePlanifiee: f.datePlanifiee, numeroOT: f.numeroOT, confirmationRequise: f.confirmationRequise,
      moyen: 'externe', transporteurId: f.transporteurId, vehiculeTransporteurId: f.vehiculeTransporteurId || undefined, conducteurTransporteurId: f.conducteurTransporteurId || undefined,
      modeTransport: f.modeTransport || undefined, trajetId: f.trajetId || undefined,
    })
    if (!cree.ok || !cree.id) { erreur.value = cree.motif ?? ''; return }
    idCourant.value = cree.id
    emit('created', cree.id)
    return
  }
  const v = courant.value
  if (!v) return
  if (!modifiable.value) { enEdition.value = false; return }
  const moyensAvantExterne = store.moyensDe(v)
  const r = store.definirTransport(v.id, {
    moyen: 'externe', transporteurId: f.transporteurId, vehiculeTransporteurId: f.vehiculeTransporteurId || undefined, conducteurTransporteurId: f.conducteurTransporteurId || undefined,
    modeTransport: f.modeTransport || undefined, trajetId: f.trajetId || undefined,
  })
  if (!r.ok) { erreur.value = r.motif ?? ''; return }
  v.datePlanifiee = f.datePlanifiee
  v.numeroOT = f.numeroOT || undefined
  if (v.statut === 'en_attente') v.confirmationRequise = f.confirmationRequise
  store.recalculerHeuresPrevues(v.id)
  store.renotifierSiMoyensChanges(v.id, moyensAvantExterne)
  enEdition.value = false
}

/* ── Lignes de livraison : chaque ligne porte son propre destinataire,
     client ou transfert entre sites internes, jamais l'ordre entier.
     Brouillon local tant que l'ordre reste modifiable, pour permettre
     d'ajouter et de réordonner sans écrire à chaque geste ; une fois
     verrouillé, l'affichage relit directement la donnée du store, pour
     rester à jour même si le chauffeur signe une livraison pendant que
     la fiche reste ouverte. ── */
const lignesLocales = ref<EtapeVoyage[]>([])
/* Chaque modification locale est enregistrée aussitôt : la copie locale peut
 * donc toujours être resynchronisée sur les lignes enregistrées, y compris
 * quand elles changent ailleurs (réponse du client, agent, entrepôt). */
watch(() => courant.value?.etapes, etapes => { lignesLocales.value = etapes ? [...etapes].sort((a, b) => a.ordre - b.ordre) : [] }, { immediate: true, deep: true })
const lignesAffichees = computed(() => modifiable.value ? lignesLocales.value : [...(courant.value?.etapes ?? [])].sort((a, b) => a.ordre - b.ordre))

const typeLigne = ref<'client' | 'transfert'>('client')

/* ── Regroupement des commandes : le point de départ n'est pas la création
     directe d'une ligne, mais des commandes déjà enregistrées, en attente
     d'être affectées à un chargement. Le poids cumulé des commandes
     cochées est comparé à la capacité du véhicule choisi. ───────────── */
const commandesStore = useCommandesStore()
const rejetOuvert = ref<string | null>(null)
const motifRejet = ref('')
function rejeterDemande(id: string) {
  const res = commandesStore.rejeter(id, motifRejet.value, auth.user?.nom ?? 'le planificateur')
  if (!resultat(res, 'Demande rejetée, motif transmis à son ordonnateur.')) return
  commandesCochees.value.delete(id)
  rejetOuvert.value = null
}
const clientsStore = useClientsStore()
const commandesCochees = ref<Set<string>>(new Set())
function toggleCommande(id: string) {
  const s = new Set(commandesCochees.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  commandesCochees.value = s
}
/** Charge actuelle de l'ordre, calculée à partir de ses lignes. */
const chargeActuelle = computed(() => chargeOrdre({ etapes: lignesAffichees.value }))
const poidsDejaCharge = computed(() => chargeActuelle.value.poidsKg)
const poidsCommandesCochees = computed(() => [...commandesCochees.value].reduce((s, id) => s + (commandesStore.getById(id)?.poidsKg ?? 0), 0))
/** La charge maximale se lit sur la semi-remorque attelée, pas sur le
 *  tracteur : c'est elle qui porte la marchandise. */
const semiRemorqueChoisie = computed(() => {
  const id = enEdition.value ? form.value.semiRemorqueId : courant.value?.semiRemorqueId
  return id ? vehicules.parId(id) ?? null : null
})
const vehiculeTransporteurChoisi = computed(() => transporteurChoisi.value?.vehicules?.find(x => x.id === (enEdition.value ? form.value.vehiculeTransporteurId : courant.value?.vehiculeTransporteurId)))
const capaciteVehicule = computed(() => externe.value ? vehiculeTransporteurChoisi.value?.chargeUtileKg : semiRemorqueChoisie.value?.chargeMaxKg)
const capaciteVolume = computed(() => externe.value ? vehiculeTransporteurChoisi.value?.volumeM3 : semiRemorqueChoisie.value?.volumeMaxM3)
const libelleCapacite = computed(() => externe.value ? `véhicule ${vehiculeTransporteurChoisi.value?.immatriculation ?? ''} du transporteur` : `semi-remorque ${semiRemorqueChoisie.value?.immatriculation ?? ''}`)
const tauxPoids = computed(() => capaciteVehicule.value ? Math.round(chargeActuelle.value.poidsKg / capaciteVehicule.value * 100) : 0)
const tauxVolume = computed(() => capaciteVolume.value ? Math.round(chargeActuelle.value.volumeM3 / capaciteVolume.value * 100) : 0)
/** Dépassement sur l'ordre tel qu'il est : bloque la planification. */
const surcharge = computed(() => (!!capaciteVehicule.value && chargeActuelle.value.poidsKg > capaciteVehicule.value)
  || (!!capaciteVolume.value && chargeActuelle.value.volumeM3 > capaciteVolume.value))
function couleurJauge(t: number) { return t > 100 ? 'bg-danger' : t >= 90 ? 'bg-warning' : 'bg-success' }
const poidsTotalProjete = computed(() => poidsDejaCharge.value + poidsCommandesCochees.value)
const volumeCommandesCochees = computed(() => [...commandesCochees.value].reduce((s, id) => s + (commandesStore.getById(id)?.volumeM3 ?? 0), 0))
const volumeTotalProjete = computed(() => chargeActuelle.value.volumeM3 + volumeCommandesCochees.value)
const depassementCapacite = computed(() => (!!capaciteVehicule.value && poidsTotalProjete.value > capaciteVehicule.value)
  || (!!capaciteVolume.value && volumeTotalProjete.value > capaciteVolume.value))

/** Contraintes de livraison et compatibilité des produits de l'ordre, avec
 *  d'éventuelles livraisons en plus : contrôlées avant tout ajout. */
function controleAvec(ajouts: { produit?: string; client?: string; siteId?: string }[]) {
  const v = courant.value
  if (!v) return { ok: true }
  const lignes = lignesAffichees.value.filter(dansLaTournee)
  return contraintesStore.respecteContraintes({
    vehiculeIds: v.moyen === 'externe' ? [] : [v.vehiculeId, v.semiRemorqueId].filter((x): x is string => !!x),
    transporteurId: v.moyen === 'externe' ? v.transporteurId : undefined,
    vehiculesTransporteurIds: v.moyen === 'externe' && v.vehiculeTransporteurId ? [v.vehiculeTransporteurId] : undefined,
    produits: [...lignes.map(e => e.produit), ...ajouts.map(a => a.produit)].filter((x): x is string => !!x),
    livraisons: [...lignes.map(e => ({ client: e.destinataire, siteId: e.siteId, pompeExigee: e.pompeExigee })), ...ajouts.map(a => ({ client: a.client, siteId: a.siteId }))],
  })
}
const controleCochees = computed(() => controleAvec([...commandesCochees.value].map(id => commandesStore.getById(id)).filter((c): c is Commande => !!c)
  .map(c => ({ produit: store.produitDeCommande(c), client: c.siteId ? undefined : c.destinataire, siteId: c.siteId }))))
const controleOrdre = computed(() => courant.value && lignesAffichees.value.length ? store.controleContraintes(courant.value) : { ok: true as const, motif: undefined })

function ajouterCommandesSelectionnees() {
  if (!courant.value || !commandesCochees.value.size) return
  const ids = [...commandesCochees.value]
  const bloquee = ids.map(id => commandesStore.getById(id)!).find(c => !controles.peutCharger(c).ok)
  if (bloquee) { resultat({ ok: false, motif: `${bloquee.destinataire} : ${controles.peutCharger(bloquee).motif}` }); return }
  if (!controleCochees.value.ok) { resultat(controleCochees.value); return }
  const deja = ids.find(id => partDejaDansOrdre(id))
  if (deja) { resultat({ ok: false, motif: MOTIF_PART_DEJA }); return }
  rattacherCommandes(ids)
  commandesCochees.value = new Set()
}
/* ── Commande partagée : on ne prend qu'une partie d'une commande à livrer (poids, nombre d'unités,
     volume au prorata) ; le reste demeure une commande à livrer, liée à l'originale. ── */
const MOTIF_PART_DEJA = 'Une partie de cette commande est déjà dans cet ordre.'
const partDejaDansOrdre = (id: string) => {
  const c = commandesStore.getById(id)
  return !!c && lignesLocales.value.some(l => { const x = l.commandeId ? commandesStore.getById(l.commandeId) : undefined; return !!x && x.id !== c.id && commandesStore.racine(x) === commandesStore.racine(c) })
}
const partieOuverte = ref<string | null>(null)
const partie = ref<{ poidsKg: number | null; nombreUnites: number | null }>({ poidsKg: null, nombreUnites: null })
const erreurPartie = ref('')
/** Proposition : ce qui tient dans la place restante du véhicule. */
function ouvrirPartie(c: Commande) {
  erreurPartie.value = ''
  partieOuverte.value = c.id
  const placeKg = capaciteVehicule.value ? capaciteVehicule.value - poidsDejaCharge.value : c.poidsKg / 2
  const placeM3 = capaciteVolume.value && c.volumeM3 ? (capaciteVolume.value - chargeActuelle.value.volumeM3) / c.volumeM3 : 1
  const f = Math.max(0, Math.min(1, placeKg / c.poidsKg, placeM3))
  const unites = c.nombreUnites ? Math.floor(c.nombreUnites * f) : null
  const poids = unites != null && c.nombreUnites ? Math.floor(c.poidsKg * unites / c.nombreUnites) : Math.floor(c.poidsKg * f)
  partie.value = { poidsKg: poids > 0 && poids < c.poidsKg ? poids : null, nombreUnites: unites && unites < (c.nombreUnites ?? 0) ? unites : null }
}
function prendrePartie(c: Commande) {
  erreurPartie.value = ''
  if (!courant.value) return
  if (partDejaDansOrdre(c.id)) { erreurPartie.value = MOTIF_PART_DEJA; return }
  const peut = controles.peutCharger(c)
  if (!peut.ok) { erreurPartie.value = peut.motif ?? ''; return }
  const ctrl = controleAvec([{ produit: store.produitDeCommande(c), client: c.siteId ? undefined : c.destinataire, siteId: c.siteId }])
  if (!ctrl.ok) { erreurPartie.value = ctrl.motif ?? ''; return }
  /* Le contrôle de charge porte sur la partie prise. */
  const poids = Number(partie.value.poidsKg)
  if (Number.isFinite(poids) && poids > 0 && poids <= c.poidsKg) {
    const vol = c.volumeM3 ? c.volumeM3 * poids / c.poidsKg : 0
    if (capaciteVehicule.value && poidsDejaCharge.value + poids > capaciteVehicule.value) {
      erreurPartie.value = `La partie dépasse la capacité du véhicule : il reste ${Math.max(0, capaciteVehicule.value - poidsDejaCharge.value).toLocaleString('fr-FR')} kg de place.`; return
    }
    if (capaciteVolume.value && chargeActuelle.value.volumeM3 + vol > capaciteVolume.value) {
      erreurPartie.value = `La partie dépasse le volume du véhicule : il reste ${Math.max(0, capaciteVolume.value - chargeActuelle.value.volumeM3).toLocaleString('fr-FR')} m³ de place.`; return
    }
  }
  const r = commandesStore.fractionner(c.id, { poidsKg: partie.value.poidsKg, nombreUnites: partie.value.nombreUnites })
  if (!r.ok) { erreurPartie.value = r.motif ?? ''; return }
  rattacherCommandes([r.partId!])
  commandesCochees.value.delete(c.id)
  partieOuverte.value = null
  message.value = { texte: r.resteId ? 'Partie de la commande ajoutée à l\'ordre : le reste demeure à livrer.' : 'Commande ajoutée à l\'ordre.', erreur: false }
}
/** Mention d'une ligne ou d'une commande répartie en plusieurs parts. */
function mentionPart(commandeId?: string): string {
  if (!commandeId) return ''
  const c = commandesStore.getById(commandeId)
  if (!c || !commandesStore.estRepartie(c.id)) return ''
  if (c.statut === 'en_attente') {
    const origine = commandesStore.getById(commandesStore.racine(c))
    return `Reste de la commande${origine && origine.id !== c.id ? ` ${origine.referenceExterne ?? origine.id}` : ''}`
  }
  const rang = commandesStore.rangPart(c.id)
  return rang ? `Part ${rang.rang} sur ${rang.total} de la commande` : ''
}
function rattacherCommandes(ids: string[]) {
  if (!courant.value) return
  if (!peutPiloter.value) { resultat({ ok: false, motif: "Votre rôle n'est pas habilité à planifier, annuler ou clôturer une tournée." }); return }
  const nouvelles: EtapeVoyage[] = ids.map((id, i) => {
    const c = commandesStore.getById(id)!
    return {
      id: `${courant.value!.id}-L${maintenantMs()}-${i}`, ordre: lignesLocales.value.length + i + 1,
      siteId: c.siteId, siteNom: c.adresseLivraison, destinataire: c.siteId ? undefined : c.destinataire,
      adresseLivraison: c.adresseLivraison, lat: c.lat, lng: c.lng, role: 'livraison', intervalleMin: 0, franchi: false,
      poidsKg: c.poidsKg, volumeM3: c.volumeM3, canalNotification: c.canalNotification,
      commandeId: c.id, contenuCommande: c.contenu, referenceExterne: c.referenceExterne,
      nombreUnites: c.nombreUnites, produit: store.produitDeCommande(c),
    }
  })
  lignesLocales.value = [...lignesLocales.value, ...nouvelles]
  commandesStore.affecter(ids, courant.value.id)
  enregistrerLignes()
}

const ligneVide = () => ({ destinataire: '', adresse: '', siteId: '', contenu: '', poidsKg: undefined as number | undefined, volumeM3: undefined as number | undefined, canal: 'sms' as 'sms' | 'email' | 'sms_email',
  reference: '', nombreUnites: undefined as number | undefined, produit: '', confiees: false, ordonnateurExterne: '', telephone: '', email: '' })
const nouvelleLigne = ref(ligneVide())
/* Le canal se pré-remplit avec celui de la fiche client dès que le nom est reconnu. */
watch(() => nouvelleLigne.value.destinataire, nom => { nouvelleLigne.value.canal = clientsStore.canalPour(nom.trim()) })
const optSites = computed<DropdownItem[]>(() => sitesStore.actifs.map(s => ({ id: s.id, label: s.nom, sublabel: s.ville })))
/** Destinataires et ordonnateurs : fiches du référentiel des clients. */
const clientsConnus = computed(() => clientsStore.destinataires().map(c => c.nom))
const ordonnateursExternes = computed(() => clientsStore.ordonnateurs('externe').map(c => c.nom))
/* L'adresse se pré-remplit avec le site de livraison du client s'il n'en a qu'un ; avec plusieurs, ils sont proposés ; sinon l'adresse de sa fiche. */
watch(() => nouvelleLigne.value.destinataire, nom => {
  const c = clientsStore.parNom(nom.trim())
  if (!c || nouvelleLigne.value.adresse.trim()) return
  const sitesClient = sitesStore.sitesDuClient(c.id)
  if (sitesClient.length === 1) nouvelleLigne.value.adresse = sitesClient[0]!.nom
  else if (!sitesClient.length) nouvelleLigne.value.adresse = [c.adresse, c.ville].filter(Boolean).join(', ')
})

/** Point de départ de l'ordre : son étape de départ, sinon la base du
 *  véhicule, sinon le premier dépôt actif du référentiel des sites. */
function pointDeDepart(): { lat: number; lng: number } | null {
  const depart = courant.value?.etapes.find(e => e.role === 'depart')
  if (depart) return { lat: depart.lat, lng: depart.lng }
  const base = courant.value?.vehiculeId ? vehicules.parId(courant.value.vehiculeId)?.site : undefined
  const site = (base && sitesStore.actifs.find(s => s.nom === base))
    || sitesStore.depots[0]
    || sitesStore.actifs[0]
  return site ? { lat: site.lat, lng: site.lng } : null
}

/** Aucune adresse client réelle n'est géocodée dans cette maquette :
 *  la position est simulée autour du point de départ, pour que la carte
 *  reste lisible plutôt que pour représenter une localisation exacte. */
function positionSimulee() {
  const base = pointDeDepart() ?? { lat: 0, lng: 0 }
  return { lat: base.lat + (Math.random() - 0.5) * 0.6, lng: base.lng + (Math.random() - 0.5) * 0.6 }
}

function ajouterLigne() {
  if (!courant.value) return
  if (!peutPiloter.value) { resultat({ ok: false, motif: "Votre rôle n'est pas habilité à planifier, annuler ou clôturer une tournée." }); return }
  const tel = nouvelleLigne.value.telephone.trim(), mail = nouvelleLigne.value.email.trim()
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { resultat({ ok: false, motif: `Adresse e-mail invalide : ${mail}` }); return }
  if (tel && !/^[+0-9 ().-]{6,}$/.test(tel)) { resultat({ ok: false, motif: `Numéro de téléphone invalide : ${tel}` }); return }
  let ligne: EtapeVoyage
  /* Chaque ligne porte un poids : c'est ce qui permet de vérifier la charge
   * de n'importe quel ordre face à la capacité du véhicule. */
  if (!nouvelleLigne.value.poidsKg || nouvelleLigne.value.poidsKg <= 0) { resultat({ ok: false, motif: 'Indiquez le poids de la marchandise pour cette commande.' }); return }
  if (nouvelleLigne.value.volumeM3 != null && nouvelleLigne.value.volumeM3 < 0) { resultat({ ok: false, motif: 'Le volume ne peut pas être négatif.' }); return }
  if (!nouvelleLigne.value.contenu.trim()) { resultat({ ok: false, motif: 'Indiquez le contenu de la commande.' }); return }
  const p = paramsPlanif.parametres
  const reference = nouvelleLigne.value.reference.trim()
  if (p.referenceExterneObligatoire && !reference) { resultat({ ok: false, motif: `Indiquez le ${p.libelleReferenceExterne.toLowerCase()}.` }); return }
  if (reference && commandesStore.referenceConnue(reference)) { resultat({ ok: false, motif: `Ce ${p.libelleReferenceExterne.toLowerCase()} est déjà enregistré.` }); return }
  const unites = nouvelleLigne.value.nombreUnites
  if (unites != null && (unites as unknown) !== '' && (!Number.isInteger(Number(unites)) || Number(unites) <= 0)) { resultat({ ok: false, motif: `Le nombre de ${p.uniteComptage} doit être un entier positif.` }); return }
  if (nouvelleLigne.value.confiees && !nouvelleLigne.value.ordonnateurExterne.trim()) { resultat({ ok: false, motif: 'Indiquez le client qui confie les marchandises.' }); return }
  const produit = nouvelleLigne.value.produit || undefined
  const ctrl = controleAvec([{ produit, client: typeLigne.value === 'client' ? nouvelleLigne.value.destinataire.trim() : undefined, siteId: typeLigne.value === 'transfert' ? nouvelleLigne.value.siteId : undefined }])
  if (!ctrl.ok) { resultat(ctrl); return }
  if (typeLigne.value === 'client') {
    if (!nouvelleLigne.value.destinataire.trim() || !nouvelleLigne.value.adresse.trim()) return
    /* Site de livraison du client choisi comme adresse : sa position réelle ; sinon position simulée. */
    const siteClient = sitesStore.sitesDuClient(nouvelleLigne.value.destinataire.trim()).find(st => st.nom === nouvelleLigne.value.adresse.trim())
    const { lat, lng } = siteClient ?? positionSimulee()
    ligne = {
      id: `${courant.value.id}-L${maintenantMs()}`, ordre: lignesLocales.value.length + 1,
      siteNom: nouvelleLigne.value.adresse.trim(), destinataire: nouvelleLigne.value.destinataire.trim(),
      adresseLivraison: nouvelleLigne.value.adresse.trim(), lat, lng, role: 'livraison', intervalleMin: 0, franchi: false,
      poidsKg: nouvelleLigne.value.poidsKg, volumeM3: nouvelleLigne.value.volumeM3,
      canalNotification: nouvelleLigne.value.canal,
    }
  } else {
    const site = sitesStore.getById(nouvelleLigne.value.siteId)
    if (!site) return
    ligne = {
      id: `${courant.value.id}-L${maintenantMs()}`, ordre: lignesLocales.value.length + 1,
      siteId: site.id, siteNom: site.nom, lat: site.lat, lng: site.lng, role: 'livraison', intervalleMin: 0, franchi: false,
      poidsKg: nouvelleLigne.value.poidsKg, volumeM3: nouvelleLigne.value.volumeM3,
    }
  }
  /* Une ligne saisie ici est une commande comme une autre : elle est
   * enregistrée parmi les commandes et rattachée aussitôt à cet ordre. */
  const commandeId = commandesStore.creer({
    destinataire: ligne.destinataire ?? ligne.siteNom, adresseLivraison: ligne.adresseLivraison ?? ligne.siteNom,
    lat: ligne.lat, lng: ligne.lng, siteId: ligne.siteId, contenu: nouvelleLigne.value.contenu.trim(),
    poidsKg: nouvelleLigne.value.poidsKg!, volumeM3: nouvelleLigne.value.volumeM3,
    dateSouhaitee: courant.value.datePlanifiee.slice(0, 10), canalNotification: ligne.canalNotification,
    emisPar: auth.user?.nom, emisParRole: auth.role ?? undefined, origine: 'planificateur',
    referenceExterne: reference || undefined, nombreUnites: unites != null && (unites as unknown) !== '' ? Number(unites) : undefined, produit,
    ordonnateurExterne: nouvelleLigne.value.confiees ? nouvelleLigne.value.ordonnateurExterne.trim() : undefined,
    telephoneDestinataire: typeLigne.value === 'client' ? tel || undefined : undefined, emailDestinataire: typeLigne.value === 'client' ? mail || undefined : undefined,
  })
  commandesStore.affecter([commandeId], courant.value.id)
  ligne.commandeId = commandeId
  ligne.contenuCommande = nouvelleLigne.value.contenu.trim()
  ligne.referenceExterne = reference || undefined
  ligne.nombreUnites = unites != null && (unites as unknown) !== '' ? Number(unites) : undefined
  ligne.produit = produit
  lignesLocales.value = [...lignesLocales.value, ligne]
  nouvelleLigne.value = ligneVide()
  enregistrerLignes()
}
function retirerLigne(id: string) {
  if (!peutPiloter.value) { resultat({ ok: false, motif: "Votre rôle n'est pas habilité à planifier, annuler ou clôturer une tournée." }); return }
  /* Une ligne qui venait d'une commande regroupée doit la libérer, pour
   *  qu'elle redevienne disponible pour un autre chargement plutôt que de
   *  rester affectée à un ordre qui ne la porte plus. */
  const commandeId = lignesLocales.value.find(l => l.id === id)?.commandeId
  if (commandeId) commandesStore.remettreEnAttente(commandeId)
  lignesLocales.value = lignesLocales.value.filter(l => l.id !== id)
  enregistrerLignes()
}
/** Propose l'ordre de livraison selon la proximité géographique : on part
 *  du dépôt et on va chaque fois vers la ligne restante la plus proche.
 *  C'est une proposition, que le planificateur peut ensuite corriger à
 *  la main avec les flèches. */
function optimiserOrdre() {
  if (lignesLocales.value.length < 2) return
  let pos = pointDeDepart() ?? { lat: lignesLocales.value[0]!.lat, lng: lignesLocales.value[0]!.lng }
  const restantes = [...lignesLocales.value]
  const ordonnees: EtapeVoyage[] = []
  while (restantes.length) {
    let iMin = 0, dMin = Infinity
    restantes.forEach((l, i) => {
      const d = (l.lat - pos.lat) ** 2 + (l.lng - pos.lng) ** 2
      if (d < dMin) { dMin = d; iMin = i }
    })
    const [suivante] = restantes.splice(iMin, 1)
    ordonnees.push(suivante!)
    pos = { lat: suivante!.lat, lng: suivante!.lng }
  }
  lignesLocales.value = ordonnees
  enregistrerLignes()
}
function deplacerLigne(id: string, sens: -1 | 1) {
  const i = lignesLocales.value.findIndex(l => l.id === id)
  const j = i + sens
  if (i < 0 || j < 0 || j >= lignesLocales.value.length) return
  const copie = [...lignesLocales.value]
  ;[copie[i], copie[j]] = [copie[j]!, copie[i]!]
  lignesLocales.value = copie
  enregistrerLignes()
}
function enregistrerLignes() {
  if (!courant.value) return
  /* Le rang de chaque ligne suit sa place dans la liste : sans cette
   * renumérotation, l'ordre proposé par proximité ou corrigé avec les
   * flèches serait perdu à l'enregistrement. */
  resultat(store.definirLignes(courant.value.id, lignesLocales.value.map((l, i) => ({ ...l, ordre: i + 1 }))))
  lignesLocales.value = [...courant.value.etapes].sort((a, b) => a.ordre - b.ordre)
}

const marqueursCarte = computed(() => lignesAffichees.value.map((l, i) => ({
  id: l.id, lat: l.lat, lng: l.lng, libelle: `${i + 1}. ${l.destinataire ?? l.siteNom}`,
  couleur: l.franchi ? '#16a34a' : '#94a3b8', numero: i + 1,
})))

/* ── Communication client : notifications et bon de livraison
   électronique, générés automatiquement par le store à la
   planification et à chaque signature. ─────────────────────────── */
const lignesAvecDestinataire = computed(() => lignesAffichees.value.filter(l => l.destinataire))
const destinatairesUniques = computed(() => [...new Set(lignesAvecDestinataire.value.map(l => l.destinataire!))])
const totalNotifications = computed(() => lignesAvecDestinataire.value.reduce((s, l) => s + (l.notifications?.length ?? 0), 0))
const totalBL = computed(() => lignesAvecDestinataire.value.filter(l => l.eBL).length)
/** Notifications non envoyées faute de téléphone ou d'e-mail : signalées au planificateur. */
const totalNonEnvoyees = computed(() => lignesAvecDestinataire.value.reduce((s, l) => s + store.notificationsNonEnvoyees(l).length, 0))
const eBLOuvert = ref<string | null>(null)
const eBLCourant = computed(() => lignesAffichees.value.find(l => l.id === eBLOuvert.value)?.eBL ?? null)
/** Unité de la ligne du bon ouvert : litres à 15 °C (ou litres) pour le carburant, l'unité de comptage sinon. */
const uniteEBL = computed(() => {
  const l = lignesAffichees.value.find(x => x.id === eBLOuvert.value)
  return l && courant.value ? store.uniteQuantite(courant.value, l) : paramsPlanif.parametres.uniteComptage
})

/* ── Actions : planifier (déclenche l'exécution) et annuler ──────── */
function planifier() {
  if (!courant.value) return
  resultat(store.planifier(courant.value.id), 'Ordre planifié : le conducteur et les destinataires sont notifiés.')
}

/** Dernier contrôle avant archivage définitif : jamais une action du
 *  chauffeur, toujours celle du planificateur ou du responsable. */
const lignesReliquat = computed(() => lignesAffichees.value.filter(l => l.eBL?.articlesNonLivres?.length))
const dateReliquat = ref<Record<string, string>>({})
function replanifierReliquat(etapeId: string) {
  if (!courant.value) return
  resultat(store.replanifierReliquat(courant.value.id, etapeId, dateReliquat.value[etapeId] ?? ''), 'Reliquat repris dans l\'ordre en attente de ce jour.')
}
const lignesContestees = computed(() => lignesAffichees.value.filter(l => l.receptionContesteeLe))
const noteTraitement = ref<Record<string, string>>({})
const codeTraitement = ref<Record<string, string | undefined>>({})
/* Ordre clôturé : le traitement d'une contestation reste la seule action permise. */
const peutTraiterContestation = computed(() => peutPiloter.value && !!courant.value && (courant.value.statut === 'cloture' || store.suiteOuverte(courant.value)))
function traiterContestation(etapeId: string) {
  if (!courant.value) return
  resultat(store.traiterContestation(courant.value.id, etapeId, noteTraitement.value[etapeId] ?? '', codeTraitement.value[etapeId]), 'Contestation marquée traitée.')
}
/** Même règle de clôture que depuis Flotte > Voyages. */
const kmRetour = ref<number | null>(null)
watch(courant, v => { kmRetour.value = v?.kmArrivee ?? null }, { immediate: true })
const blocagesCloture = computed(() => courant.value?.statut === 'livre' ? store.blocagesCloture(courant.value.id, kmRetour.value, 'ordre') : [])
function cloturer() {
  if (!courant.value) return
  const res = store.cloturer(courant.value.id, kmRetour.value, 'ordre')
  if (resultat(res, 'Ordre clôturé et archivé.') && res.alerteEcart) message.value = { texte: `Ordre clôturé et archivé. ${res.alerteEcart}`, erreur: false }
}

/** Annulation demandée par le client avant le départ, enregistrée ici. */
const annulationClientOuverte = ref<string | null>(null)
const motifAnnulationClient = ref('')
watch(annulationClientOuverte, () => { motifAnnulationClient.value = '' })
function annulerPourLeClient(etapeId: string) {
  if (!courant.value) return
  if (!resultat(store.annulerLigneAvantDepart(courant.value.id, etapeId, motifAnnulationClient.value), 'Livraison annulée à la demande du client.')) return
  annulationClientOuverte.value = null; motifAnnulationClient.value = ''
}

/** Après une action qui modifie une ligne directement dans le store
 *  (confirmation, replanification...) plutôt que via le brouillon local,
 *  resynchronise l'affichage : sans ça, une tournée encore modifiable
 *  (Planifié) continuerait d'afficher l'ancien état, puisque
 *  lignesAffichees y lit le brouillon plutôt que le store en direct. */
function synchroniserLignesLocales() {
  if (courant.value) lignesLocales.value = [...courant.value.etapes].sort((a, b) => a.ordre - b.ordre)
}

const lignesChargement = computed(() => lignesAffichees.value.filter(dansLaTournee))
/** Marchandises revenues de tournée, contrôlées par l'entrepôt à leur retour. */
const lignesEnRetour = computed(() => lignesAffichees.value.filter(retourAControler))
function motifRetour(l: EtapeVoyage) {
  if (l.retourEntrepotLe) return `${l.retourClientAbsent ? 'Client absent, marchandise ramenée' : 'Report demandé sur place'} : ${l.motifRetour ?? ''}`
  if (l.retourAttenduLe && l.ligneAnnuleeLe) return `${libelleFinLigne(l) === 'Refusée' ? 'Refusée par le destinataire' : `${libelleFinLigne(l)}, produit chargé à ramener`} : ${l.motifAnnulationLigne ?? ''}`
  if (l.retourAttenduLe) return `Tournée annulée, produit chargé à ramener${courant.value?.motifAnnulation ? ` : ${courant.value.motifAnnulation}` : ''}`
  return `Articles non livrés : ${l.eBL?.articlesNonLivres?.map(a => `${a.libelle} (${a.motif})`).join(', ') ?? ''}`
}
/** Lignes que le chauffeur a jugées non conformes : sorties de la tournée,
 *  à recharger et à replanifier, sans gêner les autres. */
const lignesNonConformes = computed(() => lignesAffichees.value.filter(l => l.chargementNonConformeLe))

const lignesConcernees = computed(() => lignesAvecDestinataire.value.filter(l => !l.indisponibleLe))
/** Déclaration du chargement par l'entrepôt, saisie depuis la fiche. */
const contenusSaisis = ref<Record<string, string>>({})
/** Quantité chargée par destinataire, pré-remplie avec celle de la commande. */
const quantitesSaisies = ref<Record<string, number | null>>({})
const peutDeclarerChargement = computed(() => !auth.lectureSeule && paramsPlanif.peutDeclarerChargement(auth.role))
/** Correction de la déclaration par l'entrepôt, tant que le conducteur n'a pas contrôlé la ligne. */
const correctionChargement = ref<{ id: string; contenu: string; quantite: number | null; motif: string } | null>(null)
function ouvrirCorrectionChargement(l: EtapeVoyage) { correctionChargement.value = { id: l.id, contenu: l.contenuCharge ?? '', quantite: l.quantiteChargee ?? null, motif: '' } }
function corrigerChargement() {
  const c = correctionChargement.value
  if (!courant.value || !c) return
  if (resultat(store.corrigerChargementEntrepot(courant.value.id, c.id, c.contenu, c.quantite, c.motif), 'Déclaration de chargement corrigée.')) correctionChargement.value = null
}
/* ── Autorisation de départ, dès que la tournée est prête ── */
const autorisation = computed(() => courant.value ? store.etatAutorisationDepart(courant.value) : null)
function demanderAutorisation() {
  if (!courant.value) return
  resultat(store.demanderAutorisationDepart(courant.value.id), 'Autorisation de départ demandée.')
}
/* ── Plus aucune livraison dans la tournée : le planificateur l'annule ── */
const tourneeVide = computed(() => !!courant.value && ['planifie', 'confirme'].includes(courant.value.statut) && courant.value.etapes.length > 0 && !courant.value.etapes.some(dansLaTournee))
/** Pré-remplit la déclaration de chargement avec le contenu commandé, sans
 *  jamais écraser ce que l'entrepôt a déjà saisi. */
function preparerSaisieChargement() {
  const suivant = { ...contenusSaisis.value }
  ;(courant.value?.etapes ?? []).forEach(e => { if (!suivant[e.id]) suivant[e.id] = e.contenuCharge ?? e.contenuCommande ?? '' })
  contenusSaisis.value = suivant
  const q = { ...quantitesSaisies.value }
  ;(courant.value?.etapes ?? []).forEach(e => { if (!(e.id in q)) q[e.id] = e.quantiteChargee ?? e.nombreUnites ?? null })
  quantitesSaisies.value = q
}
watch(() => courant.value?.etapes, preparerSaisieChargement, { immediate: true, deep: true })
watch(() => courant.value?.chargementEntrepotLe, preparerSaisieChargement)
function declarerChargementEntrepot() {
  if (!courant.value) return
  resultat(store.declarerChargementEntrepot(courant.value.id, contenusSaisis.value, quantitesSaisies.value), 'Chargement déclaré : le conducteur peut le contrôler.')
}

/* ── Heures de livraison : prévue, estimée, retard ── */
const avecHoraires = computed(() => !!courant.value && !['en_attente', 'annule'].includes(courant.value.statut))
function horaire(l: EtapeVoyage) {
  const v = courant.value
  if (!v || !dansLaTournee(l) && !l.arriveeLe) return null
  const prevue = heurePrevue(v, l)
  const estimee = heureEstimee(v, l)
  const retard = retardMinutes(v, l)
  return { prevue, estimee, reelle: !!l.arriveeLe, retard, enRetard: estEnRetard(v, l) }
}
/** Position GPS du véhicule : complète le statut de l'expédition en cours. */
const position = computed(() => {
  const v = courant.value
  if (!v || v.statut !== 'en_cours') return null
  const p = positionVehicule(v)
  if (!p) return null
  const prochaine = [...v.etapes].sort((a, b) => a.ordre - b.ordre).find(e => dansLaTournee(e) && !e.franchi && !e.reporteLe && e.role === 'livraison')
  return { ...p, lieu: lieuLisible(p, sitesStore.sites, 500), prochaine, distanceKm: prochaine ? Math.round(distanceKm(p, prochaine)) : null }
})

/** En route sans position connue (pas de boîtier, signal perdu, transporteur externe) :
 *  les heures estimées partent du dernier point réglé. */
const positionAbsente = computed(() => {
  const v = courant.value
  if (!v || !positionInconnue(v)) return null
  const prochaine = [...v.etapes].sort((a, b) => a.ordre - b.ordre).find(e => dansLaTournee(e) && !e.franchi && !e.reporteLe && e.role === 'livraison')
  return { prochaine }
})

/* ── Plan de trajet et modification de l'itinéraire en cours de voyage ── */
const planAffiche = computed(() => courant.value?.planTrajet?.length ? courant.value.planTrajet : [])
/** Zones à risque portées par les sites que le plan traverse (types de sites interdits du suivi GPS). */
const telematique = useTelematiqueStore()
const zonesRisque = computed(() => {
  const trace = [...planAffiche.value].sort((a, b) => a.ordre - b.ordre)
  if (!trace.length) return []
  const types = telematique.parametres.typesSitesInterdits
  return sitesStore.actifs.filter(s => types.includes(s.type) && distanceTraceM(s, trace) <= (s.rayonM ?? 0))
})
/** Temps de conduite prévu par le plan, et temps de conduite et de repos repris des seuils de la Flotte. */
const seuilsConduite = computed(() => useConfigurationStore().parametres)
const conduitePrevueMin = computed(() => planAffiche.value.reduce((t, p) => t + (p.intervalleMin || 0), 0))
function duree(min: number) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min` }
const itineraireModifiable = computed(() => peutPiloter.value && !!courant.value && ['confirme', 'pret', 'en_cours'].includes(courant.value.statut))
const itineraireOuvert = ref(false)
const nouveauTrajet = ref('')
const motifItineraire = ref('')
function modifierItineraire() {
  if (!courant.value) return
  if (!resultat(store.modifierItineraire(courant.value.id, nouveauTrajet.value, motifItineraire.value), courant.value.moyen === 'externe' ? 'Itinéraire modifié : le transporteur est notifié.' : 'Itinéraire modifié : le conducteur est notifié.')) return
  itineraireOuvert.value = false; nouveauTrajet.value = ''; motifItineraire.value = ''
}

/* ── Suite des livraisons, satisfaction, dossier ── */
const lignesSuivies = computed(() => lignesAffichees.value.filter(l => l.destinataire && (l.arriveeLe || l.livreParChauffeurLe || l.ligneAnnuleeLe || l.chargementNonConformeLe || l.retourEntrepotLe || l.notesProtet?.length)))
const enquetesOrdonnateur = computed(() => courant.value ? commandesStore.enquetesOrdonnateurDuVoyage(courant.value.id) : [])
const lignesSatisfaction = computed(() => lignesAvecDestinataire.value.filter(l => l.satisfactionEnvoyeeLe))
const dossierOuvert = ref(false)
const aSuivre = computed(() => !!courant.value && (['en_cours', 'livre', 'cloture'].includes(courant.value.statut) || (courant.value.statut === 'annule' && store.suiteOuverte(courant.value))))
/** Lien d'enquête de l'ordonnateur, une commande par lien (page publique, comme le suivi du destinataire). */
const liensEnquete = computed(() => {
  if (!courant.value || !['livre', 'cloture'].includes(courant.value.statut)) return []
  const vues = new Set<string>()
  return courant.value.etapes.filter(e => e.commandeId).map(e => ({ e, c: commandesStore.getById(commandesStore.racine(commandesStore.getById(e.commandeId!)!) ) }))
    .filter(x => x.c && !x.c.enqueteOrdonnateur && commandesStore.enqueteProposee(x.c.id) && !vues.has(x.c.id) && vues.add(x.c.id))
})

/** Simulation de l'ordre de chargement, inverse de l'ordre de livraison. */
const simulationOuverte = ref(false)
/** Premier chargé = dernier livré. */
const ordreDeChargement = computed(() => [...lignesChargement.value].reverse())
function zoneChargement(i: number, total: number) {
  if (total <= 1) return 'Une seule livraison'
  return i === 0 ? 'Fond du camion' : i === total - 1 ? 'Porte du camion' : 'Milieu du camion'
}

/** Réception d'un retour : l'entrepôt contrôle l'état de la marchandise
 *  avant de la considérer réceptionnée. */
const controleRetourOuvert = ref<string | null>(null)
const motifNonConformeRetour = ref('')
function recevoirRetourLigne(etapeId: string, conforme: boolean) {
  if (!courant.value) return
  if (!resultat(store.recevoirRetour(courant.value.id, etapeId, conforme, motifNonConformeRetour.value), conforme ? 'Retour réceptionné, état conforme.' : 'Retour réceptionné comme non conforme.')) return
  controleRetourOuvert.value = null; motifNonConformeRetour.value = ''
}

const secoursOuvert = ref<string | null>(null)
const dateProgrammee = ref('')
function accepterDate(etapeId: string) {
  if (!courant.value) return
  if (!resultat(store.accepterDateClient(courant.value.id, etapeId), 'Date acceptée : la ligne est reprise dans l\'ordre en attente de ce jour.')) return
  synchroniserLignesLocales()
}
function proposerDate(etapeId: string) {
  if (!courant.value || !dateProgrammee.value) return
  if (!resultat(store.proposerDate(courant.value.id, etapeId, dateProgrammee.value), 'Date proposée au client.')) return
  secoursOuvert.value = null; dateProgrammee.value = ''
  synchroniserLignesLocales()
}
function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }
/** Lignes sorties de la tournée, à replanifier, quelle qu'en soit la cause :
 *  le planificateur les reprend toutes de la même façon. */
const lignesAReplanifier = computed(() => lignesAffichees.value.filter(l => horsTournee(l)))
function causeHors(l: EtapeVoyage) {
  if (l.retourEntrepotLe) return l.retourClientAbsent ? 'Client absent' : 'Report demandé sur place'
  if (l.chargementNonConformeLe) return 'Non conforme au chargement'
  return 'Indisponible'
}
function detailHors(l: EtapeVoyage) {
  if (l.retourEntrepotLe) return l.motifRetour
  if (l.chargementNonConformeLe) return l.motifNonConformite
  return l.motifIndisponibilite
}

const annulationOuverte = ref(false)
const motifAnnulation = ref('')
const codeAnnulation = ref<string | undefined>()
function annuler() {
  if (!courant.value || !motifAnnulation.value.trim()) return
  if (!resultat(store.annuler(courant.value.id, motifAnnulation.value, codeAnnulation.value), courant.value.moyen === 'externe' ? 'Ordre annulé : le transporteur est notifié.' : 'Ordre annulé : le conducteur est notifié.')) return
  annulationOuverte.value = false
  motifAnnulation.value = ''
}
</script>

<template>
  <CardModalShell
    :page-title="pageTitle"
    :page-number="courant?.numeroOT || courant?.reference"
    banner-label="Ordre de transport"
    :is-edit-mode="enEdition"
    :sidebar-items="sidebarItems"
    :current-no="currentNo"
    :has-prev="hasPrev"
    :has-next="hasNext"
    :show-title-new-button="false"
    :show-edit="!carburant && (externe ? modifiable : affectationModifiable)"
    hide-action-bar
    :has-unsaved-changes="enEdition"
    @close="emit('close')"
    @enter-edit="enterEdit"
    @cancel-edit="cancelEdit"
    @save="save"
    @go-prev="goPrev"
    @go-next="goNext"
    @select-sidebar="selectSidebar"
  >
    <template #title-badges>
      <span v-if="courant" class="text-[11px] font-medium px-2.5 py-[3px] rounded-full" :class="STATUTS[courant.statut].cls">{{ STATUTS[courant.statut].label }}</span>
      <span v-else class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-warning-bg text-warning">Nouvel ordre</span>
      <span v-if="depassement?.expiree" class="text-[11px] font-medium px-2.5 py-[3px] rounded-full" :class="depassement.bloque ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">Date dépassée</span>
      <span v-if="courant?.creeParReplanification" class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-background text-muted-foreground">{{ courant.replanifieDepuis?.length ? `Replanifié depuis ${courant.replanifieDepuis.join(', ')}` : 'Replanifié' }}</span>
      <span v-if="courant?.moyen === 'externe'" class="text-[11px] font-medium px-2.5 py-[3px] rounded-full bg-background text-muted-foreground">{{ courant.transporteurNom }}</span>
    </template>

    <template #form>
      <div class="px-8 py-5 max-w-6xl mx-auto">

        <div v-if="courant" class="flex items-end justify-end gap-2 mb-3.5 flex-wrap">
          <button v-if="courant.statut !== 'en_attente'" :class="cls.btnOutline" @click="dossierOuvert = true">
            <FolderOpen class="w-4 h-4" /> Dossier complet
          </button>
          <button v-if="peutAnnuler" :class="cls.btnOutline" class="!text-danger !border-danger/30 hover:!bg-danger-bg" @click="annulationOuverte = true">
            <XCircle class="w-4 h-4" /> Annuler
          </button>
          <button v-if="courant.statut === 'en_attente' && peutPiloter && !carburant" :class="cls.btnPrimary" :disabled="!lignesAffichees.length || surcharge"
                  :title="!lignesAffichees.length ? 'Ajoutez au moins une ligne de livraison avant de planifier cet ordre.' : surcharge ? 'Le chargement dépasse la capacité du véhicule : retirez des lignes ou choisissez un autre véhicule.' : undefined" @click="planifier">
            <CalendarClock class="w-4 h-4" /> Planifier
          </button>
          <template v-if="courant.statut === 'livre' && peutPiloter">
            <button :class="cls.btnPrimary" class="!bg-success hover:!bg-success/90" :disabled="blocagesCloture.length > 0" @click="cloturer">
              <CheckCircle2 class="w-4 h-4" /> Clôturer
            </button>
          </template>
        </div>
        <div v-if="courant?.statut === 'livre' && peutPiloter && blocagesCloture.length" class="flex flex-col gap-1 mb-3.5">
          <p v-for="b in blocagesCloture" :key="b" class="text-[11px] text-warning text-right">{{ b }}</p>
        </div>
        <div v-if="depassement?.expiree" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3.5" :class="depassement.bloque ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'">
          <CalendarClock class="w-4 h-4 shrink-0" /><p class="text-xs flex-1">{{ depassement.motif }}</p>
        </div>
        <div v-if="autorisation" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3.5 flex-wrap" :class="autorisation.etat === 'accordee' ? 'bg-success-bg text-success' : autorisation.etat === 'refusee' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'" data-autorisation>
          <ShieldAlert class="w-4 h-4 shrink-0" />
          <p class="text-xs flex-1">{{ autorisation.libelle }}<template v-if="autorisation.motif"> : {{ autorisation.motif }}</template></p>
          <button v-if="peutPiloter && courant?.statut === 'pret' && (autorisation.etat === 'a_demander' || autorisation.etat === 'refusee')" :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="demanderAutorisation">Demander l'autorisation de départ</button>
        </div>
        <div v-if="tourneeVide && peutAnnuler && !annulationOuverte" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3.5 bg-warning-bg text-warning" data-tournee-vide>
          <AlertTriangle class="w-4 h-4 shrink-0" />
          <p class="text-xs flex-1">Plus aucune livraison dans cette tournée{{ courant?.carburant?.bonEnlevement?.statut === 'confirme' ? ' : le produit chargé revient au dépôt' : '' }}.</p>
          <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] !text-danger !border-danger/30" @click="annulationOuverte = true">Annuler la tournée</button>
        </div>
        <p v-if="courant?.statut === 'en_attente' && peutPiloter && !lignesAffichees.length && !carburant" class="text-[11px] text-warning text-right -mt-2.5 mb-3.5">
          Ajoutez au moins une ligne de livraison avant de planifier cet ordre.
        </p>

        <div v-if="message" class="flex items-center gap-2 rounded-lg px-3.5 py-2.5 mb-3.5" :class="message.erreur ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success'">
          <component :is="message.erreur ? AlertCircle : CheckCircle2" class="w-4 h-4 shrink-0" />
          <p class="text-xs flex-1">{{ message.texte }}</p>
          <button class="bg-transparent border-0 cursor-pointer text-inherit" title="Fermer" @click="message = null"><X class="w-4 h-4" /></button>
        </div>

        <!-- Annulation -->
        <div v-if="annulationOuverte" class="flex flex-col gap-2 bg-danger-bg rounded-lg px-4 py-3 mb-3.5">
          <p class="text-xs text-danger font-medium">Annuler cet ordre de transport</p>
          <ChoixMotif type-motif="ANNULATION" placeholder="Motif de l'annulation (obligatoire)…" @change="(m, c) => { motifAnnulation = m; codeAnnulation = c }" />
          <div class="flex justify-end gap-2">
            <button :class="cls.btnOutline" @click="annulationOuverte = false; motifAnnulation = ''">Renoncer</button>
            <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90" :disabled="!motifAnnulation.trim()" @click="annuler">Confirmer l'annulation</button>
          </div>
        </div>

        <!-- GÉNÉRAL -->
        <FormSection title="Général" :recaps="courant ? [moyens.vehicule, moyens.conducteur] : []" :default-open="true">

          <div v-if="enEdition && modifiable" class="flex items-center gap-1.5 mb-4">
            <button :class="form.moyen === 'propres' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="form.moyen = 'propres'"><Truck class="w-3.5 h-3.5" /> Nos moyens</button>
            <button :class="form.moyen === 'externe' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="form.moyen = 'externe'"><Truck class="w-3.5 h-3.5" /> Transporteur externe</button>
          </div>

          <div v-if="externe" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4 mb-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Transporteur</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.transporteurId" :items="optTransporteurs" placeholder="Choisir un transporteur…" vide="Aucun transporteur externe autorisé dans le référentiel des prestataires." />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate">{{ courant?.transporteurNom ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Véhicule du transporteur</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.vehiculeTransporteurId" :items="optVehiculesTransporteur" placeholder="Facultatif…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.vehiculeTransporteurPlaque ?? 'Non précisé' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Conducteur du transporteur</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.conducteurTransporteurId" :items="optConducteursTransporteur" placeholder="Facultatif…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant?.conducteurTransporteurNom ?? 'Non précisé' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Date prévue</label>
              <input v-if="enEdition && modifiable" v-model="form.datePlanifiee" type="datetime-local" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant ? fmtDateHeure(courant.datePlanifiee) : '-' }}</div>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4 mb-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Véhicule</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" vide="Aucun véhicule disponible, en état et en règle." />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.vehiculePlaque ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Conducteur</label>
              <SearchableDropdown v-if="enEdition && affectationModifiable" v-model="form.chauffeurIdManuel" :items="optConducteurs" placeholder="Choisir un conducteur…" vide="Aucun conducteur disponible à cette date avec ses pièces en règle." />
              <div v-else class="h-[38px] px-2.5 rounded-md border flex items-center text-[13px]"
                   :class="chauffeurIndispo && !['livre', 'cloture', 'annule'].includes(courant?.statut ?? '') ? 'bg-danger-bg border-danger/30 text-danger font-medium' : courant?.chauffeurNom ? 'bg-primary/5 border-primary/20 text-primary font-medium' : 'bg-background border-border text-muted-foreground'">
                <AlertTriangle v-if="chauffeurIndispo && affectationModifiable" class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <UserCheck v-else-if="courant?.chauffeurNom" class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <AlertCircle v-else class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span class="truncate">{{ courant?.chauffeurNom ?? 'Aucune affectation' }}</span>
              </div>
              <span v-if="chauffeurIndispo && affectationModifiable" class="text-[10px] text-danger">Non disponible ({{ chauffeurIndispo }}) : choisissez-en un autre</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Date prévue</label>
              <input v-if="enEdition && modifiable" v-model="form.datePlanifiee" type="datetime-local" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant ? fmtDateHeure(courant.datePlanifiee) : '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">N° ordre de transport</label>
              <input v-if="enEdition && modifiable" v-model="form.numeroOT" :class="cls.fieldInput" placeholder="OT-2026-…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.numeroOT ?? '-' }}</div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4">
            <div class="flex flex-col gap-1.5 relative" @mouseenter="destinatairesUniques.length > 1 && (infobulle = 'destinataires')" @mouseleave="infobulle = null">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Destinataires</label>
              <div class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate" :class="destinatairesUniques.length > 1 ? 'underline decoration-dotted underline-offset-2 cursor-help' : ''">{{ courant?.clientNom ?? 'Aucune ligne' }}</div>
              <div v-if="infobulle === 'destinataires'" class="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-md shadow-lg px-3 py-2 min-w-[220px]">
                <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-1">{{ destinatairesUniques.length }} destinataires</p>
                <p v-for="d in destinatairesUniques" :key="d" class="text-[12px] text-foreground leading-snug">{{ d }}</p>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Marchandise</label>
              <div class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate">{{ marchandiseOrdre || '-' }}</div>
            </div>
            <div v-if="externe" class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">N° ordre de transport</label>
              <input v-if="enEdition && modifiable" v-model="form.numeroOT" :class="cls.fieldInput" placeholder="OT-2026-…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.numeroOT ?? '-' }}</div>
            </div>
            <div v-else class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">{{ carburant ? 'Citerne' : 'Semi-remorque' }}</label>
              <SearchableDropdown v-if="enEdition && affectationModifiable" v-model="form.semiRemorqueId" :items="optSemiRemorques" placeholder="Choisir une semi-remorque…" />
              <div v-else class="h-[38px] px-2.5 rounded-md bg-background border border-border flex items-center text-[13px] text-foreground font-mono truncate">
                {{ courant?.semiRemorquePlaque ?? 'Aucune semi-remorque' }}
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Poids chargé (kg)</label>
              <div class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ chargeActuelle.poidsKg.toLocaleString('fr-FR') }} kg</div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4 mt-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Mode de transport</label>
              <select v-if="enEdition && modifiable" v-model="form.modeTransport" :class="cls.fieldSelect">
                <option value="">Non précisé</option>
                <option v-for="m in optModes" :key="m" :value="m">{{ m }}</option>
              </select>
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ courant?.modeTransport ?? 'Non précisé' }}</div>
            </div>
            <div class="flex flex-col gap-1.5 sm:col-span-1 xl:col-span-2">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Trajet de référence</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.trajetId" :items="optTrajets" placeholder="Facultatif…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate">{{ courant?.trajetLibelle ?? 'Aucun' }}</div>
            </div>
          </div>

          <!-- Charge du véhicule : vaut pour tout ordre, quelle que soit l'origine de ses lignes -->
          <div v-if="courant && !carburant && (capaciteVehicule || capaciteVolume)" class="mt-4 rounded-md border px-3.5 py-3" :class="surcharge ? 'border-danger/40 bg-danger-bg/40' : 'border-border'">
            <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-2">Charge du véhicule · {{ libelleCapacite }}</p>
            <div v-if="capaciteVehicule" class="mb-2">
              <div class="flex items-center justify-between text-[12px] mb-1">
                <span class="text-foreground">Poids</span>
                <span :class="tauxPoids > 100 ? 'text-danger font-semibold' : 'text-muted-foreground'">{{ chargeActuelle.poidsKg.toLocaleString('fr-FR') }} / {{ capaciteVehicule.toLocaleString('fr-FR') }} kg ({{ tauxPoids }} %)</span>
              </div>
              <div class="h-2 rounded-full bg-border overflow-hidden"><div class="h-full rounded-full" :class="couleurJauge(tauxPoids)" :style="{ width: Math.min(tauxPoids, 100) + '%' }"></div></div>
            </div>
            <div v-if="capaciteVolume">
              <div class="flex items-center justify-between text-[12px] mb-1">
                <span class="text-foreground">Volume</span>
                <span :class="tauxVolume > 100 ? 'text-danger font-semibold' : 'text-muted-foreground'">{{ chargeActuelle.volumeM3.toLocaleString('fr-FR') }} / {{ capaciteVolume }} m³ ({{ tauxVolume }} %)</span>
              </div>
              <div class="h-2 rounded-full bg-border overflow-hidden"><div class="h-full rounded-full" :class="couleurJauge(tauxVolume)" :style="{ width: Math.min(tauxVolume, 100) + '%' }"></div></div>
            </div>
            <p v-if="surcharge" class="text-[11px] text-danger mt-2 flex items-center gap-1"><AlertTriangle class="w-3.5 h-3.5" /> Le chargement dépasse la capacité du véhicule : retirez des lignes ou choisissez un autre véhicule. La planification est bloquée.</p>
          </div>
          <p v-else-if="courant && !carburant && courant.statut === 'en_attente' && !capaciteVehicule && !externe" class="text-[11px] text-danger mt-4 flex items-center gap-1">
            <AlertTriangle class="w-3.5 h-3.5" /> Aucune semi-remorque n'est choisie : la capacité est inconnue et l'ordre ne peut pas être planifié.
          </p>

          <label v-if="enEdition && (enCreation || courant?.statut === 'en_attente')" class="flex items-center gap-2 mt-4 text-[12px] text-foreground cursor-pointer w-fit">
            <input type="checkbox" v-model="form.confirmationRequise" class="w-4 h-4 accent-primary" />
            Demander à chaque destinataire de confirmer sa disponibilité
          </label>
          <p v-else-if="courant" class="text-[11px] text-muted-foreground mt-4">
            {{ courant.confirmationRequise === false ? 'Confirmation de disponibilité des destinataires désactivée.' : 'Confirmation de disponibilité des destinataires requise avant chargement.' }}
          </p>

          <div v-if="blocages.length" class="flex flex-col gap-1.5 mt-4">
            <div v-for="b in blocages" :key="b" class="flex items-center gap-2 rounded-lg px-3 py-2 bg-danger-bg text-danger">
              <ShieldAlert class="w-4 h-4 shrink-0" />
              <p class="text-xs flex-1">{{ b }}</p>
            </div>
          </div>
          <p v-if="erreur" class="text-[12px] text-danger flex items-center gap-1.5 mt-3">
            <AlertCircle class="w-3.5 h-3.5" /> {{ erreur }}
          </p>

          <div v-if="enEdition && affectationModifiable" class="flex justify-end mt-4">
            <button :class="cls.btnPrimary" @click="save">{{ enCreation ? "Créer l'ordre" : 'Enregistrer' }}</button>
          </div>
        </FormSection>

        <!-- TOURNÉE DE CARBURANT : plan de chargement par compartiment et bons -->
        <TourneeCarburant v-if="courant?.carburant" :voyage="courant" />

        <!-- LIGNES DE LIVRAISON : n'apparaît qu'une fois l'ordre créé. Une tournée de carburant en attente
             liste déjà ses commandes dans sa propre section : une seule liste des clients. -->
        <FormSection v-if="courant && !(carburant && courant.statut === 'en_attente')" title="Commandes à livrer" :recaps="[`${lignesAffichees.length} commande(s)`, courant.clientNom]" :default-open="true">

          <div v-if="!lignesAffichees.length" class="text-xs text-muted-foreground py-2 mb-3">Aucune ligne pour l'instant.</div>
          <div v-else class="flex flex-col gap-1.5 mb-4">
            <div v-for="(l, i) in lignesAffichees" :key="l.id" class="flex items-center gap-2.5 rounded-md px-3 py-2.5"
                 :class="l.franchi ? 'bg-success-bg' : l.ligneAnnuleeLe ? 'bg-danger-bg' : (l.reporteLe || horsTournee(l)) ? 'bg-warning-bg' : l.arriveeLe ? 'bg-info-bg' : 'bg-background'">
              <component :is="l.franchi ? CheckCircle2 : l.ligneAnnuleeLe ? CircleX : horsTournee(l) ? AlertTriangle : l.reporteLe ? Clock : l.arriveeLe ? MapPinCheck : Circle" class="w-4 h-4 shrink-0"
                         :class="l.franchi ? 'text-success' : l.ligneAnnuleeLe ? 'text-danger' : (l.reporteLe || horsTournee(l)) ? 'text-warning' : l.arriveeLe ? 'text-info' : 'text-muted-foreground'" />
              <span class="text-[11px] font-semibold text-muted-foreground w-5">{{ i + 1 }}</span>
              <component :is="l.destinataire ? Package : MapPin" class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div class="flex-1 min-w-0">
                <span class="text-xs text-foreground font-medium">{{ l.destinataire ?? l.siteNom }}</span>
                <span v-if="l.referenceExterne" class="text-[11px] font-mono text-muted-foreground">{{ l.referenceExterne }}</span>
                <span v-if="mentionPart(l.commandeId)" class="text-[11px] text-info" data-part> · {{ mentionPart(l.commandeId) }}</span>
                <span v-if="l.destinataire" class="text-[11px] text-muted-foreground"> · {{ l.adresseLivraison }}</span>
                <span v-else class="text-[11px] text-muted-foreground"> · transfert interne</span>
                <span v-if="avecHoraires && horaire(l)" class="block text-[11px]" :class="horaire(l)!.enRetard ? 'text-danger' : 'text-muted-foreground'">
                  Prévue {{ fmtHeure(horaire(l)!.prevue) }}<template v-if="horaire(l)!.estimee"> · {{ horaire(l)!.reelle ? 'arrivée' : 'estimée' }} {{ fmtHeure(horaire(l)!.estimee) }}</template><template v-if="horaire(l)!.retard != null && horaire(l)!.retard !== 0"> · {{ fmtRetard(horaire(l)!.retard) }}</template>
                </span>
                <span v-if="l.reporteLe" class="block text-[11px] text-warning">Reportée : {{ l.motifReport }}</span>
                <span v-if="l.ligneAnnuleeLe" class="block text-[11px] text-danger">{{ libelleFinLigne(l) }} : {{ l.motifAnnulationLigne }}</span>
                <span v-for="c in (l.corrections ?? []).filter(x => !x.action.startsWith('Quantité reçue corrigée'))" :key="c.le + c.action" class="block text-[11px] text-muted-foreground" data-correction>{{ c.action }}<template v-if="c.motif"> ({{ c.motif }})</template> · {{ c.par }}, {{ fmtDateHeure(c.le) }}</span>
                <div v-if="annulationClientOuverte === l.id" class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <ChoixMotif type-motif="ANNULATION" placeholder="Motif donné par le client (obligatoire)…" @change="m => motifAnnulationClient = m" />
                  <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="annulationClientOuverte = null; motifAnnulationClient = ''">Renoncer</button>
                  <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px]" :disabled="!motifAnnulationClient.trim()" @click="annulerPourLeClient(l.id)">Annuler cette livraison</button>
                </div>
              </div>
              <button v-if="peutPiloter && !carburant && l.destinataire && dansLaTournee(l) && (courant.statut === 'confirme' || courant.statut === 'pret') && annulationClientOuverte !== l.id"
                      class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="annulationClientOuverte = l.id; motifAnnulationClient = ''">Annulation demandée par le client</button>
              <span v-if="l.franchi && !l.destinataire" class="text-[11px] text-success shrink-0">Passage confirmé</span>
              <span v-else-if="l.franchi && l.receptionConfirmeeClientLe" class="text-[11px] text-success shrink-0">Réception confirmée par {{ l.eBL?.signePar }}{{ l.eBL?.articlesNonLivres?.length ? ' (partielle)' : '' }}</span>
              <span v-else-if="l.franchi && l.receptionContesteeLe && !l.contestationTraiteeLe" class="text-[11px] text-danger font-medium shrink-0">Contestée</span>
              <span v-else-if="l.franchi && l.contestationTraiteeLe" class="text-[11px] text-muted-foreground shrink-0">Contestation traitée</span>
              <span v-else-if="l.franchi && store.confirmeeTacitement(l)" class="text-[11px] text-success shrink-0">Confirmée tacitement</span>
              <span v-else-if="l.franchi" class="text-[11px] text-warning shrink-0">Déclarée par le conducteur, en attente du client</span>
              <span v-if="l.nonConformiteReprise" class="text-[11px] text-danger shrink-0" data-non-conformite-reprise>Retour non conforme : {{ l.nonConformiteReprise }}</span>
              <span v-else-if="l.ligneAnnuleeLe" class="text-[11px] text-danger shrink-0">{{ libelleFinLigne(l) }}</span>
              <span v-else-if="l.indisponibleLe" class="text-[11px] text-warning shrink-0">Indisponible, à replanifier</span>
              <span v-else-if="l.chargementNonConformeLe" class="text-[11px] text-warning shrink-0">Non conforme, à replanifier</span>
              <span v-else-if="l.retourEntrepotLe" class="text-[11px] text-warning shrink-0">{{ carburant ? 'Retour au dépôt' : "Retour à l'entrepôt" }}, à replanifier</span>
              <span v-else-if="l.reporteLe" class="text-[11px] text-warning shrink-0">Reportée</span>
              <span v-else-if="l.arriveeLe" class="text-[11px] text-info shrink-0">Conducteur sur place, livraison à déclarer</span>
              <button v-if="l.eBL" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer shrink-0" @click="eBLOuvert = l.id">Voir le bon de livraison</button>
              <template v-if="modifiable && !carburant && peutPiloter">
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground hover:bg-border/40 shrink-0" :disabled="i === 0" @click="deplacerLigne(l.id, -1)"><ArrowUp class="w-3.5 h-3.5" /></button>
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground hover:bg-border/40 shrink-0" :disabled="i === lignesAffichees.length - 1" @click="deplacerLigne(l.id, 1)"><ArrowDown class="w-3.5 h-3.5" /></button>
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-danger hover:bg-danger-bg shrink-0" @click="retirerLigne(l.id)"><X class="w-3.5 h-3.5" /></button>
              </template>
            </div>
          </div>

          <p v-if="!controleOrdre.ok" class="text-[11px] text-danger mb-3 flex items-center gap-1"><AlertTriangle class="w-3.5 h-3.5 shrink-0" /> {{ controleOrdre.motif }}</p>

          <div v-if="marqueursCarte.length" class="rounded-lg overflow-hidden border border-border mb-4">
            <FleetMap :marqueurs="marqueursCarte" height="260px" />
          </div>

          <div v-if="modifiable && !carburant && peutPiloter && lignesLocales.length > 1" class="flex justify-end mb-3">
            <button :class="cls.btnOutline" class="!py-1.5 !text-[12px]" @click="optimiserOrdre">
              <MapPin class="w-3.5 h-3.5" /> Proposer l'ordre par proximité
            </button>
          </div>

          <template v-if="modifiable && !carburant">
            <!-- COMMANDES REÇUES : arrivées du système de commandes, pas encore dans
                 un ordre. Les cocher les rattache à cet ordre. -->
            <div v-if="commandesStore.enAttenteFret.length" class="rounded-lg border border-border px-3.5 py-3 mb-4">
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-2">
                Commandes à livrer en attente d'un ordre ({{ commandesStore.enAttenteFret.length }})
              </p>
              <div class="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto mb-3">
                <div v-for="c in commandesStore.enAttenteFret" :key="c.id" class="rounded-md px-2 py-1.5 hover:bg-background">
                  <label class="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" class="w-4 h-4 accent-primary shrink-0 mt-0.5" :checked="commandesCochees.has(c.id)" :disabled="depassementCommande(c).bloque || !peutPiloter" @change="toggleCommande(c.id)" />
                    <div class="flex-1 min-w-0 text-[12px]">
                      <span class="text-foreground font-medium">{{ c.destinataire }}</span>
                      <span v-if="c.referenceExterne" class="text-muted-foreground font-mono"> · {{ c.referenceExterne }}</span>
                      <span class="text-muted-foreground"> · {{ c.contenu }}<template v-if="c.nombreUnites"> · {{ c.nombreUnites }} {{ paramsPlanif.parametres.uniteComptage }}</template> · {{ c.poidsKg }} kg{{ c.volumeM3 ? ` · ${c.volumeM3} m³` : '' }} · souhaitée le {{ new Date(c.dateSouhaitee).toLocaleDateString('fr-FR') }}</span>
                      <p class="text-[11px] text-muted-foreground">Ordonnateur : {{ c.ordonnateurExterne ?? c.emisPar ?? 'système de gestion' }}<template v-if="c.commentaire"> · « {{ c.commentaire }} »</template></p>
                      <p v-if="mentionPart(c.id)" class="text-[11px] text-info" data-reste>{{ mentionPart(c.id) }}</p>
                      <p v-if="depassementCommande(c).expiree" class="text-[11px]" :class="depassementCommande(c).bloque ? 'text-danger' : 'text-warning'">{{ depassementCommande(c).motif }}</p>
                    </div>
                    <button v-if="peutPiloter && partieOuverte !== c.id && !depassementCommande(c).bloque" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click.prevent="ouvrirPartie(c)">Prendre une partie</button>
                    <button v-if="rejetOuvert !== c.id && peutPiloter && !commandesStore.estRepartie(c.id)" class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click.prevent="rejetOuvert = c.id; motifRejet = ''">Rejeter</button>
                  </label>
                  <div v-if="partieOuverte === c.id" class="flex items-center gap-2 mt-1.5 pl-6 flex-wrap" data-partie>
                    <label class="flex items-center gap-1.5 text-[11px] text-muted-foreground">Poids (kg)
                      <input v-model.number="partie.poidsKg" type="number" min="1" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[110px]" /></label>
                    <label v-if="c.nombreUnites" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">Nombre de {{ paramsPlanif.parametres.uniteComptage }}
                      <input v-model.number="partie.nombreUnites" type="number" min="1" step="1" :class="cls.fieldInput" class="!h-[30px] !text-[12px] !w-[90px]" /></label>
                    <span v-if="c.volumeM3 && Number(partie.poidsKg) > 0" class="text-[11px] text-muted-foreground">soit {{ (Math.round(c.volumeM3 * Number(partie.poidsKg) / c.poidsKg * 100) / 100).toLocaleString('fr-FR') }} m³</span>
                    <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="partieOuverte = null; erreurPartie = ''">Renoncer</button>
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="prendrePartie(c)">Ajouter cette partie à l'ordre</button>
                    <p v-if="erreurPartie" class="w-full text-[11px] text-danger">{{ erreurPartie }}</p>
                  </div>
                  <div v-if="rejetOuvert === c.id" class="flex items-center gap-2 mt-1.5 pl-6 flex-wrap">
                    <input v-model="motifRejet" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[200px]" placeholder="Motif du rejet, transmis à l'ordonnateur…" />
                    <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="rejetOuvert = null">Renoncer</button>
                    <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px]" :disabled="!motifRejet.trim()" @click="rejeterDemande(c.id)">Rejeter la demande</button>
                  </div>
                </div>
              </div>
              <div v-if="capaciteVehicule || form.vehiculeId" class="flex items-center justify-between text-[12px] mb-2.5" :class="depassementCapacite ? 'text-danger font-medium' : 'text-muted-foreground'">
                <span>Poids après ajout : {{ poidsTotalProjete.toLocaleString('fr-FR') }}{{ capaciteVehicule ? ` / ${capaciteVehicule.toLocaleString('fr-FR')}` : '' }} kg<template v-if="capaciteVolume"> · volume {{ volumeTotalProjete }} / {{ capaciteVolume }} m³</template></span>
                <span v-if="depassementCapacite" class="flex items-center gap-1"><AlertTriangle class="w-3.5 h-3.5" /> Dépasse la capacité du véhicule</span>
              </div>
              <p v-if="commandesCochees.size && !controleCochees.ok" class="text-[11px] text-danger mb-2.5 flex items-center gap-1"><AlertTriangle class="w-3.5 h-3.5 shrink-0" /> {{ controleCochees.motif }}</p>
              <div v-if="peutPiloter" class="flex justify-end">
                <button :class="cls.btnPrimary" :disabled="!commandesCochees.size || depassementCapacite || !controleCochees.ok" @click="ajouterCommandesSelectionnees">
                  <Package class="w-4 h-4" /> Ajouter {{ commandesCochees.size || '' }} à l'ordre
                </button>
              </div>
            </div>

            <p v-if="!commandesStore.enAttenteFret.length" class="text-[12px] text-muted-foreground italic mb-3">Aucune commande à livrer en attente.</p>
            <template v-if="paramsPlanif.parametres.saisieParPlanificateur && peutPiloter">
            <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em] mb-2">Ou saisir une nouvelle commande</p>
            <div class="flex items-center gap-1.5 mb-3">
              <button :class="typeLigne === 'client' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="typeLigne = 'client'">
                <Package class="w-3.5 h-3.5" /> Livraison client
              </button>
              <button :class="typeLigne === 'transfert' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="typeLigne = 'transfert'">
                <Truck class="w-3.5 h-3.5" /> Transfert interne
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <template v-if="typeLigne === 'client'">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Destinataire</label>
                  <input v-model="nouvelleLigne.destinataire" :class="cls.fieldInput" placeholder="Nom du client…" list="clients-connus" />
                  <datalist id="clients-connus">
                    <option v-for="c in clientsConnus" :key="c" :value="c" />
                  </datalist>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Adresse de livraison</label>
                  <input v-model="nouvelleLigne.adresse" :class="cls.fieldInput" placeholder="Adresse…" list="sites-du-client" />
                  <datalist id="sites-du-client">
                    <option v-for="st in sitesStore.sitesDuClient(nouvelleLigne.destinataire.trim())" :key="st.id" :value="st.nom">{{ [st.adresse, st.ville].filter(Boolean).join(', ') }}</option>
                  </datalist>
                </div>
              </template>
              <div v-else class="flex flex-col gap-1.5 sm:col-span-2">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Site interne</label>
                <SearchableDropdown v-model="nouvelleLigne.siteId" :items="optSites" placeholder="Choisir un site…" vide="Aucun site actif dans le référentiel des sites." />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Poids (kg)</label>
                <input v-model.number="nouvelleLigne.poidsKg" type="number" min="1" :class="cls.fieldInput" placeholder="Obligatoire" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Volume (m³)</label>
                <input v-model.number="nouvelleLigne.volumeM3" type="number" min="0" step="0.1" :class="cls.fieldInput" placeholder="Facultatif" />
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-2">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Contenu commandé</label>
                <input v-model="nouvelleLigne.contenu" :class="cls.fieldInput" placeholder="Articles commandés, séparés par une virgule (ex. 10 cartons de riz, 5 sacs de sucre)" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">{{ paramsPlanif.parametres.libelleReferenceExterne }}</label>
                <input v-model="nouvelleLigne.reference" :class="cls.fieldInput" :placeholder="paramsPlanif.parametres.referenceExterneObligatoire ? 'Obligatoire' : 'Facultatif'" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Nombre de {{ paramsPlanif.parametres.uniteComptage }}</label>
                <input v-model.number="nouvelleLigne.nombreUnites" type="number" min="1" step="1" :class="cls.fieldInput" placeholder="Facultatif" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Produit</label>
                <select v-model="nouvelleLigne.produit" :class="cls.fieldSelect">
                  <option value="">{{ produitsStore.produitsActifs().length ? 'Non précisé' : 'Aucun produit actif dans les référentiels' }}</option>
                  <option v-for="p in produitsStore.produitsActifs()" :key="p.id" :value="p.nom">{{ p.nom }}</option>
                </select>
              </div>
              <template v-if="typeLigne === 'client'">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Téléphone du destinataire</label>
                  <input v-model="nouvelleLigne.telephone" :class="cls.fieldInput" placeholder="Facultatif, sinon celui de la fiche client" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">E-mail du destinataire</label>
                  <input v-model="nouvelleLigne.email" :class="cls.fieldInput" placeholder="Facultatif, sinon celui de la fiche client" />
                </div>
              </template>
              <div v-if="typeLigne === 'client'" class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Notifications du client</label>
                <select v-model="nouvelleLigne.canal" :class="cls.fieldInput">
                  <option value="sms">SMS</option><option value="email">E-mail</option><option value="sms_email">SMS et e-mail</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5 sm:col-span-2">
                <label class="flex items-center gap-2 text-[12px] text-foreground cursor-pointer w-fit">
                  <input v-model="nouvelleLigne.confiees" type="checkbox" class="w-4 h-4 accent-primary" /> Marchandises confiées par un client
                </label>
                <template v-if="nouvelleLigne.confiees">
                  <input v-model="nouvelleLigne.ordonnateurExterne" :class="cls.fieldInput" list="ordonnateurs-externes" placeholder="Client qui confie les marchandises…" />
                  <datalist id="ordonnateurs-externes"><option v-for="c in ordonnateursExternes" :key="c" :value="c" /></datalist>
                </template>
              </div>
            </div>
            <div class="flex justify-end mt-3">
              <button :class="cls.btnPrimary" :disabled="!nouvelleLigne.poidsKg || !nouvelleLigne.contenu.trim() || (paramsPlanif.parametres.referenceExterneObligatoire && !nouvelleLigne.reference.trim()) || (typeLigne === 'client' ? (!nouvelleLigne.destinataire.trim() || !nouvelleLigne.adresse.trim()) : !nouvelleLigne.siteId)" @click="ajouterLigne">Ajouter la commande</button>
            </div>
            </template>
          </template>
        </FormSection>

        <!-- PLAN DE TRAJET : repris du trajet de référence rattaché ; l'itinéraire se
             modifie en cours de voyage avec un motif, l'ancien reste dans l'historique. -->
        <FormSection v-if="courant && (planAffiche.length || courant.historiqueItineraire?.length || itineraireModifiable)" title="Plan de trajet"
                     :recaps="[courant.modeTransport, courant.trajetLibelle ?? 'Aucun trajet de référence']" :default-open="false">
          <table v-if="planAffiche.length" class="w-full border-collapse mb-3">
            <thead><tr class="border-b border-border">
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">#</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Point</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Rôle</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Temps de trajet maximal</th>
              <th class="text-left py-1.5 text-[11px] font-semibold text-muted-foreground">Arrêt maximal</th>
            </tr></thead>
            <tbody>
              <tr v-for="p in planAffiche" :key="p.id" class="border-b border-border/60 text-[12px]">
                <td class="py-1.5 font-mono">{{ p.ordre }}</td>
                <td class="py-1.5 text-foreground">{{ p.siteNom }}</td>
                <td class="py-1.5 text-muted-foreground">{{ LIB_ROLE_ETAPE[p.role] }}</td>
                <td class="py-1.5">{{ p.intervalleMin ? `${p.intervalleMin} min` : '-' }}</td>
                <td class="py-1.5">{{ p.pausePrevueMin ? `${p.pausePrevueMin} min` : '-' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-[12px] text-muted-foreground mb-3">Aucun trajet de référence rattaché à cet ordre.</p>
          <div v-if="planAffiche.length" class="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1 text-[12px] mb-3">
            <p><span class="text-muted-foreground">Zones à risque :</span> <span :class="zonesRisque.length ? 'text-danger font-medium' : 'text-foreground'">{{ zonesRisque.length ? zonesRisque.map(z => z.nom).join(', ') : 'aucune' }}</span></p>
            <p><span class="text-muted-foreground">Temps de conduite prévu :</span> {{ conduitePrevueMin ? duree(conduitePrevueMin) : '-' }}</p>
            <p><span class="text-muted-foreground">Conduite continue maximale :</span> {{ duree(seuilsConduite.tccMaxMin) }}, puis pause de {{ duree(seuilsConduite.pauseApresTccMin) }}</p>
            <p><span class="text-muted-foreground">Conduite journalière maximale :</span> {{ duree(seuilsConduite.tcjMaxMin) }}</p>
            <p><span class="text-muted-foreground">Repos minimal avant départ :</span> {{ seuilsConduite.reposMinAvantDepartH }} h</p>
          </div>
          <div v-if="courant.historiqueItineraire?.length" class="mb-3">
            <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-1">Historique de l'itinéraire</p>
            <p v-for="h in courant.historiqueItineraire" :key="h.le" class="text-[12px] text-foreground">
              {{ fmtDateHeure(h.le) }} · {{ h.ancienLibelle }} → {{ h.nouveauLibelle }} <span class="text-muted-foreground">({{ h.motif }}, {{ h.par }})</span>
            </p>
          </div>
          <template v-if="itineraireModifiable">
            <button v-if="!itineraireOuvert" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0" @click="itineraireOuvert = true">Modifier l'itinéraire</button>
            <div v-else class="flex items-center gap-2 flex-wrap">
              <div class="w-[260px]"><SearchableDropdown v-model="nouveauTrajet" :items="optTrajets.filter(t => t.id && t.id !== courant!.trajetId)" placeholder="Nouveau trajet de référence…" /></div>
              <input v-model="motifItineraire" :class="cls.fieldInput" class="!h-[34px] !text-[12px] flex-1 min-w-[200px]" placeholder="Motif de la modification (obligatoire)…" />
              <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="itineraireOuvert = false">Renoncer</button>
              <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!nouveauTrajet || !motifItineraire.trim()" @click="modifierItineraire">Modifier</button>
            </div>
          </template>
        </FormSection>

        <!-- SUIVI : position du véhicule (complément du statut) et, pour un transporteur
             externe, ce qu'il remonte de son exécution. -->
        <FormSection v-if="courant && (position || positionAbsente || (courant.moyen === 'externe' && peutPiloter && ['confirme', 'pret', 'en_cours'].includes(courant.statut)))" title="Suivi de l'expédition"
                     :recaps="[STATUTS[courant.statut].label, position ? position.lieu : positionAbsente ? 'position inconnue' : null]" :default-open="true">
          <div v-if="positionAbsente" class="flex items-start gap-2.5 rounded-md bg-warning-bg px-3 py-2.5 mb-3" data-position-inconnue>
            <Navigation class="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div class="text-[12px] text-foreground">
              <p>Position du véhicule : inconnue</p>
              <p v-if="positionAbsente.prochaine" class="text-muted-foreground">Prochaine livraison : {{ positionAbsente.prochaine.destinataire ?? positionAbsente.prochaine.siteNom }} · arrivée estimée {{ fmtHeure(horaire(positionAbsente.prochaine)?.estimee) }}, depuis le dernier point réglé</p>
            </div>
          </div>
          <div v-if="position" class="flex items-start gap-2.5 rounded-md bg-info-bg px-3 py-2.5 mb-3">
            <Navigation class="w-4 h-4 text-info shrink-0 mt-0.5" />
            <div class="text-[12px] text-foreground">
              <p>Position du véhicule : {{ position.lieu }} <span class="text-muted-foreground font-mono">({{ position.lat.toFixed(4) }}, {{ position.lng.toFixed(4) }})</span> · {{ position.vitesse }} km/h</p>
              <p v-if="position.prochaine" class="text-muted-foreground">Prochaine livraison : {{ position.prochaine.destinataire ?? position.prochaine.siteNom }}, à {{ position.distanceKm }} km · arrivée estimée {{ fmtHeure(horaire(position.prochaine)?.estimee) }}</p>
            </div>
          </div>
          <ExecutionTransporteur v-if="courant.moyen === 'externe' && peutPiloter && ['confirme', 'pret', 'en_cours'].includes(courant.statut)" :voyage="courant" @resultat="(r, ok) => { resultat(r, ok); synchroniserLignesLocales() }" />
        </FormSection>

        <!-- CONFIRMATION CLIENT : suivi en lecture seule. Le client répond depuis son
             lien de suivi ; s'il tarde, l'agent chargé des appels enregistre sa
             réponse depuis l'espace « Confirmations clients ». -->
        <FormSection v-if="courant && lignesAvecDestinataire.length && courant.statut !== 'en_attente' && courant.confirmationRequise !== false" title="Confirmation client"
                     :recaps="[`${lignesConcernees.filter(l => l.confirmeLe).length}/${lignesConcernees.length} confirmés`, ...(lignesAvecDestinataire.length - lignesConcernees.length ? [`${lignesAvecDestinataire.length - lignesConcernees.length} à replanifier`] : [])]" :default-open="courant.statut === 'planifie'">
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesAvecDestinataire" :key="l.id" class="flex items-center gap-2.5 rounded-md px-3 py-2.5"
                 :class="l.confirmeLe ? 'bg-success-bg' : l.indisponibleLe ? 'bg-warning-bg' : 'bg-background'">
              <component :is="l.confirmeLe ? CheckCircle2 : l.indisponibleLe ? AlertTriangle : Circle" class="w-4 h-4 shrink-0"
                         :class="l.confirmeLe ? 'text-success' : l.indisponibleLe ? 'text-warning' : 'text-muted-foreground'" />
              <span class="text-[13px] text-foreground flex-1">{{ l.destinataire }}</span>
              <span v-if="l.confirmeLe" class="text-[11px] text-success shrink-0">Confirmé</span>
              <span v-else-if="l.indisponibleLe" class="text-[11px] text-warning shrink-0">Indisponible</span>
              <span v-else class="text-[11px] text-muted-foreground italic shrink-0">En attente de sa réponse</span>
            </div>
          </div>
        </FormSection>

        <!-- LIGNES À REPLANIFIER : quelle qu'en soit la cause, le client propose sa
             date depuis son espace, le planificateur l'accepte. -->
        <FormSection v-if="courant && lignesAReplanifier.length" title="Lignes à replanifier" :recaps="[`${lignesAReplanifier.length} ligne(s)`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesAReplanifier" :key="l.id" class="rounded-md px-3 py-2.5 bg-warning-bg">
              <div class="flex items-center gap-2.5">
                <AlertTriangle class="w-4 h-4 shrink-0 text-warning" />
                <span class="text-[13px] text-foreground flex-1">{{ l.destinataire ?? l.siteNom }}</span>
                <span class="text-[11px] text-warning shrink-0">{{ causeHors(l) }}</span>
              </div>
              <div class="mt-1 pl-[26px] flex flex-col gap-1.5">
                <p class="text-[11px] text-warning">
                  {{ detailHors(l) }}
                </p>

                <p v-if="l.retourConformeLe" class="text-[11px] text-success">Marchandise revenue à l'entrepôt le {{ fmtDateHeure(l.retourConformeLe) }}, état conforme.</p>
                <p v-if="l.retourNonConformeLe" class="text-[11px] text-danger">Marchandise revenue à l'entrepôt le {{ fmtDateHeure(l.retourNonConformeLe) }}, non conforme : {{ l.motifRetourNonConforme }}.</p>

                <p v-if="l.dateConfirmeeLe && l.commandeRemiseLe" class="text-[11px] text-success font-medium" data-remise-carburant>
                  Replanifié au {{ fmtJour(l.dateProposeePlanif) }} : la commande est remise parmi les commandes de carburant à planifier.
                </p>
                <p v-else-if="l.dateConfirmeeLe" class="text-[11px] text-success font-medium">
                  Replanifié au {{ fmtJour(l.dateProposeePlanif) }}, repris automatiquement dans un nouvel ordre en attente.
                  <button v-if="l.repriseDansVoyageId" class="underline bg-transparent border-0 cursor-pointer p-0 text-success font-medium" @click="emit('ouvrir', l.repriseDansVoyageId)">Voir le nouvel ordre</button>
                </p>

                <!-- Une date proposée par le planificateur attend la confirmation du
                     client, qu'elle réponde à une absence de date ou contre-propose
                     celle du client : c'est donc le premier cas examiné. -->
                <template v-else-if="l.dateProposeePlanif">
                  <p class="text-[11px] text-foreground">Date proposée au client : <span class="font-semibold">{{ fmtJour(l.dateProposeePlanif) }}</span>, en attente de sa confirmation.</p>
                </template>

                <!-- Chemin normal : le client a proposé sa propre date -->
                <template v-else-if="l.dateDisponibleClient">
                  <p class="text-[11px] text-foreground">Le client propose d'être livré à partir du <span class="font-semibold">{{ fmtJour(l.dateDisponibleClient) }}</span>.</p>
                  <div v-if="!figee && secoursOuvert !== l.id" class="flex items-center gap-3">
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="accepterDate(l.id)">Accepter cette date</button>
                    <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="secoursOuvert = l.id; dateProgrammee = ''">Lui proposer une autre date</button>
                  </div>
                  <div v-else-if="!figee" class="flex items-center gap-2 flex-wrap">
                    <input v-model="dateProgrammee" type="date" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[170px]" />
                    <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="secoursOuvert = null; dateProgrammee = ''">Renoncer</button>
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!dateProgrammee" @click="proposerDate(l.id)">Proposer cette date</button>
                  </div>
                </template>

                <!-- Aucune date encore : on attend le client, ou je propose moi-même -->
                <template v-else>
                  <p v-if="secoursOuvert !== l.id || figee" class="text-[11px] text-muted-foreground italic">
                    En attente de la date du client.
                    <button v-if="!figee" class="underline bg-transparent border-0 cursor-pointer p-0 text-muted-foreground" @click="secoursOuvert = l.id; dateProgrammee = ''">Lui proposer une date moi-même</button>
                  </p>
                  <div v-else class="flex items-center gap-2 flex-wrap">
                    <input v-model="dateProgrammee" type="date" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[170px]" />
                    <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="secoursOuvert = null; dateProgrammee = ''">Renoncer</button>
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!dateProgrammee" @click="proposerDate(l.id)">Proposer au client</button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- MARCHANDISES EN RETOUR : contrôlées par l'entrepôt à leur arrivée -->
        <FormSection v-if="courant && lignesEnRetour.length" title="Marchandises en retour" :recaps="[`${lignesEnRetour.filter(l => !l.retourRecuLe).length} à contrôler`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesEnRetour" :key="l.id" class="rounded-md px-3 py-2.5" :class="l.retourRecuLe ? 'bg-background' : 'bg-warning-bg'">
              <div class="flex items-center gap-2.5">
                <Package class="w-4 h-4 shrink-0" :class="l.retourRecuLe ? 'text-muted-foreground' : 'text-warning'" />
                <span class="text-[13px] text-foreground flex-1">{{ l.destinataire ?? l.siteNom }}</span>
              </div>
              <p class="text-[11px] text-muted-foreground mt-1 pl-[26px]">{{ motifRetour(l) }}</p>
              <div class="mt-1 pl-[26px] flex flex-col gap-1.5">
                <div v-if="!l.retourRecuLe && controleRetourOuvert !== l.id && !auth.lectureSeule" class="flex items-center gap-3">
                  <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="recevoirRetourLigne(l.id, true)">État conforme, réceptionner</button>
                  <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="controleRetourOuvert = l.id; motifNonConformeRetour = ''">Non conforme</button>
                </div>
                <div v-if="controleRetourOuvert === l.id" class="flex items-center gap-2 flex-wrap">
                  <ChoixMotif type-motif="NON_CONFORMITE" placeholder="Ce qui ne va pas sur la marchandise revenue…" @change="m => motifNonConformeRetour = m" />
                  <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="controleRetourOuvert = null; motifNonConformeRetour = ''">Renoncer</button>
                  <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifNonConformeRetour.trim()" @click="recevoirRetourLigne(l.id, false)">Réceptionner comme non conforme</button>
                </div>
                <p v-if="l.articlesRapportesLe && !l.retourRecuLe" class="text-[11px] text-warning font-medium" data-remis-conducteur>Remis par le conducteur le {{ fmtDateHeure(l.articlesRapportesLe) }}, à contrôler.</p>
                <p v-if="l.retourConformeLe" class="text-[11px] text-success">Réceptionnée le {{ fmtDateHeure(l.retourConformeLe) }}, état conforme.</p>
                <p v-if="l.retourNonConformeLe" class="text-[11px] text-danger">Réceptionnée le {{ fmtDateHeure(l.retourNonConformeLe) }}, non conforme : {{ l.motifRetourNonConforme }}.</p>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- CHARGEMENT : l'entrepôt déclare ce qu'il a chargé, ligne par ligne ;
             le chauffeur le contrôle ensuite depuis son propre espace. -->
        <FormSection v-if="courant && !carburant && (courant.statut === 'confirme' || courant.statut === 'pret' || courant.statut === 'en_cours' || courant.statut === 'livre' || courant.statut === 'cloture')" title="Chargement"
                     :recaps="[courant.chargementEntrepotLe ? 'Entrepôt : fait' : 'Entrepôt : à faire', courant.chargementChauffeurLe ? 'Conducteur : fait' : 'Conducteur : à faire']" :default-open="courant.statut === 'confirme'">
          <div class="flex items-center gap-3 mb-3.5">
            <button v-if="!courant.chargementEntrepotLe" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 inline-flex items-center gap-1" @click="simulationOuverte = !simulationOuverte">
              <ListOrdered class="w-3.5 h-3.5" /> Simuler le chargement
            </button>
            <RouterLink :to="`/chargement/${courant.id}`" target="_blank" class="text-[11px] text-primary underline inline-flex items-center gap-1">
              <Printer class="w-3.5 h-3.5" /> Imprimer la liste de chargement
            </RouterLink>
          </div>

          <div v-if="simulationOuverte && !courant.chargementEntrepotLe" class="rounded-md bg-info-bg px-3 py-2.5 mb-3.5">
            <p class="text-[11px] font-semibold text-info uppercase tracking-[0.04em] mb-1">Ordre de chargement</p>
            <p class="text-[11px] text-muted-foreground mb-2">On charge d'abord ce qui sera livré en dernier, pour que la marchandise du premier arrêt soit près des portes. L'ordre de chargement suit donc l'ordre de livraison : pour le changer, modifiez l'ordre des commandes à livrer. Les clients qui ont dit ne pas être disponibles ne sont pas chargés.</p>
            <div v-for="(l, i) in ordreDeChargement" :key="l.id" class="flex items-center gap-2 text-[12px] py-0.5">
              <span class="w-5 h-5 rounded-full bg-info text-white text-[10px] font-bold flex items-center justify-center shrink-0">{{ i + 1 }}</span>
              <span class="text-foreground flex-1">{{ l.destinataire ?? l.siteNom }}</span>
              <span class="text-muted-foreground">{{ zoneChargement(i, ordreDeChargement.length) }} · livré en {{ ordreDeChargement.length - i }}<sup>e</sup></span>
            </div>
          </div>

          <div v-for="l in lignesNonConformes" :key="l.id" class="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-danger-bg text-danger mb-2">
            <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
            <p class="text-xs">Non-conformité signalée par le conducteur pour {{ l.destinataire ?? l.siteNom }} : {{ l.motifNonConformite }}. Ligne sortie de la tournée, à replanifier.</p>
          </div>

          <!-- Déclaration par l'entrepôt, destinataire par destinataire -->
          <template v-if="!courant.chargementEntrepotLe && courant.statut === 'confirme' && peutDeclarerChargement">
            <div class="flex flex-col gap-2">
              <div v-for="l in lignesChargement" :key="l.id" class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-muted-foreground">{{ l.destinataire ?? l.siteNom }}</label>
                <div class="flex items-center gap-2">
                  <input v-model="contenusSaisis[l.id]" :class="cls.fieldInput" class="!h-[34px] !text-[12px] flex-1" placeholder="Articles chargés, séparés par une virgule…" />
                  <input v-if="l.nombreUnites != null" v-model.number="quantitesSaisies[l.id]" type="number" min="0" step="1" :class="cls.fieldInput" class="!h-[34px] !text-[12px] !w-[120px]" :title="`Nombre de ${paramsPlanif.parametres.uniteComptage} chargés`" :placeholder="paramsPlanif.parametres.uniteComptage" data-quantite-chargee />
                </div>
              </div>
            </div>
            <div class="flex justify-end mt-3 mb-3.5">
              <button :class="cls.btnPrimary" @click="declarerChargementEntrepot"><Package class="w-4 h-4" /> Déclarer le chargement effectué</button>
            </div>
          </template>
          <div v-else-if="lignesChargement.some(l => l.contenuCharge)" class="flex flex-col gap-1.5 mb-3.5">
            <div v-for="l in lignesChargement" :key="l.id" class="text-[12px]">
              <div class="flex gap-2 items-center flex-wrap">
                <span class="text-muted-foreground shrink-0">{{ l.destinataire ?? l.siteNom }} :</span>
                <span class="text-foreground">{{ l.contenuCharge }}<template v-if="l.quantiteChargee != null"> · {{ l.quantiteChargee }} {{ paramsPlanif.parametres.uniteComptage }}</template></span>
                <span v-if="l.chargementConformeLe" class="text-success shrink-0">Conforme</span>
                <button v-else-if="courant.statut === 'confirme' && peutDeclarerChargement && correctionChargement?.id !== l.id" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click="ouvrirCorrectionChargement(l)">Corriger</button>
              </div>
              <div v-if="correctionChargement?.id === l.id" class="flex items-center gap-2 mt-1.5 flex-wrap" data-correction-chargement>
                <input v-model="correctionChargement.contenu" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[200px]" placeholder="Articles chargés, séparés par une virgule…" />
                <input v-if="l.nombreUnites != null" v-model.number="correctionChargement.quantite" type="number" min="0" step="1" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[110px]" :placeholder="paramsPlanif.parametres.uniteComptage" />
                <input v-model="correctionChargement.motif" :class="cls.fieldInput" class="!h-[32px] !text-[12px] flex-1 min-w-[180px]" placeholder="Motif de la correction (obligatoire)…" />
                <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="correctionChargement = null">Renoncer</button>
                <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!correctionChargement.motif.trim()" @click="corrigerChargement">Enregistrer la correction</button>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2.5 rounded-md px-3 py-2.5" :class="courant.chargementEntrepotLe ? 'bg-success-bg' : 'bg-background'">
              <component :is="courant.chargementEntrepotLe ? CheckCircle2 : Circle" class="w-4 h-4 shrink-0" :class="courant.chargementEntrepotLe ? 'text-success' : 'text-muted-foreground'" />
              <span class="text-[13px] text-foreground flex-1">Chargement déclaré par l'entrepôt</span>
              <span v-if="courant.chargementEntrepotLe" class="text-[11px] text-success">{{ fmtDateHeure(courant.chargementEntrepotLe) }}</span>
            </div>
            <div class="flex items-center gap-2.5 rounded-md px-3 py-2.5" :class="courant.chargementChauffeurLe ? 'bg-success-bg' : 'bg-background'">
              <component :is="courant.chargementChauffeurLe ? CheckCircle2 : Circle" class="w-4 h-4 shrink-0" :class="courant.chargementChauffeurLe ? 'text-success' : 'text-muted-foreground'" />
              <span class="text-[13px] text-foreground flex-1">Chargement contrôlé et validé par le conducteur</span>
              <span v-if="courant.chargementChauffeurLe" class="text-[11px] text-success">{{ fmtDateHeure(courant.chargementChauffeurLe) }}</span>
              <span v-else class="text-[11px] text-muted-foreground italic">À faire par le conducteur</span>
            </div>
          </div>
        </FormSection>

        <!-- RELIQUATS : articles non livrés d'une livraison partielle, à reprendre -->
        <FormSection v-if="courant && lignesReliquat.length" title="Reliquats à replanifier" :recaps="[`${lignesReliquat.filter(l => !l.reliquatReprisLe).length} à replanifier`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesReliquat" :key="l.id" class="rounded-md px-3 py-2.5" :class="l.reliquatReprisLe ? 'bg-background' : 'bg-warning-bg'">
              <div class="flex items-center gap-2.5 flex-wrap">
                <Package class="w-4 h-4 shrink-0 text-warning" />
                <span class="text-[13px] text-foreground flex-1">{{ l.destinataire }}</span>
                <span class="text-[11px] text-muted-foreground">{{ l.eBL?.articlesNonLivres?.map(a => `${a.libelle} (${a.motif})`).join(' · ') }}</span>
              </div>
              <p v-if="l.retourNonConformeLe" class="text-[11px] text-danger mt-1 pl-[26px]">Retour non conforme : {{ l.motifRetourNonConforme }}</p>
              <p v-if="l.reliquatReprisLe && l.commandeRemiseLe" class="text-[11px] text-success mt-1 pl-[26px]" data-remise-carburant>
                Remis parmi les commandes de carburant à planifier, à livrer à partir du {{ fmtJour(l.reliquatDate) }}.
              </p>
              <p v-else-if="l.reliquatReprisLe" class="text-[11px] text-success mt-1 pl-[26px]">
                Repris dans l'ordre en attente du {{ fmtJour(l.reliquatDate) }}.
                <button v-if="l.reliquatRepriseDansVoyageId" class="underline bg-transparent border-0 cursor-pointer p-0 text-success" @click="emit('ouvrir', l.reliquatRepriseDansVoyageId)">Voir l'ordre</button>
              </p>
              <div v-else-if="!figee" class="flex items-center gap-2 mt-2 pl-[26px] flex-wrap">
                <input v-model="dateReliquat[l.id]" type="date" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[170px]" />
                <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!dateReliquat[l.id]" @click="replanifierReliquat(l.id)">Replanifier ce reliquat</button>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- CONTESTATIONS : le client dit ne pas avoir reçu ce que le chauffeur a déclaré -->
        <FormSection v-if="courant && lignesContestees.length" title="Livraisons contestées" :recaps="[`${lignesContestees.filter(l => !l.contestationTraiteeLe).length} à traiter`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesContestees" :key="l.id" class="rounded-md px-3 py-2.5" :class="l.contestationTraiteeLe ? 'bg-background' : 'bg-danger-bg'">
              <div class="flex items-center gap-2.5">
                <ShieldAlert class="w-4 h-4 shrink-0" :class="l.contestationTraiteeLe ? 'text-muted-foreground' : 'text-danger'" />
                <span class="text-[13px] text-foreground flex-1">{{ l.destinataire }}</span>
                <span class="text-[11px] text-muted-foreground shrink-0">déclarée le {{ fmtDateHeure(l.livreParChauffeurLe) }}, contestée le {{ fmtDateHeure(l.receptionContesteeLe) }}</span>
              </div>
              <p class="text-[12px] text-foreground mt-1 pl-[26px]">« {{ l.motifContestation }} »</p>
              <p v-if="l.contestationTraiteeLe" class="text-[11px] text-muted-foreground mt-1 pl-[26px]">Traitée le {{ fmtDateHeure(l.contestationTraiteeLe) }} : {{ l.noteTraitementContestation }}</p>
              <div v-else-if="peutTraiterContestation" class="flex items-center gap-2 mt-2 pl-[26px]">
                <ChoixMotif type-motif="CONTESTATION" placeholder="Comment la contestation a été traitée (enquête, relivraison, avoir…)" @change="(m, c) => { noteTraitement[l.id] = m; codeTraitement[l.id] = c }" />
                <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!noteTraitement[l.id]?.trim()" @click="traiterContestation(l.id)">Marquer traitée</button>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection v-if="courant && lignesAvecDestinataire.length" title="Communication client" :recaps="[`${totalNotifications} notification(s)`, totalNonEnvoyees ? `${totalNonEnvoyees} non envoyée(s)` : null, `${totalBL} bon(s) de livraison`]" :default-open="totalNonEnvoyees > 0">
          <p v-if="totalNonEnvoyees" class="text-[12px] text-danger flex items-center gap-1.5 mb-2" data-non-envoyees><AlertTriangle class="w-3.5 h-3.5 shrink-0" /> {{ totalNonEnvoyees }} notification(s) non envoyée(s) : coordonnée manquante. Complétez le téléphone ou l'e-mail du client.</p>
          <div class="flex flex-col gap-3">
            <div v-for="l in lignesAvecDestinataire" :key="l.id" class="rounded-lg border border-border px-3.5 py-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-semibold text-foreground">{{ l.destinataire }}</span>
                <RouterLink :to="`/suivi/${l.id}`" target="_blank" class="text-[11px] text-primary underline">Ouvrir son espace de suivi</RouterLink>
              </div>
              <p class="text-[11px] text-muted-foreground mb-2 flex items-center gap-3 flex-wrap" data-coordonnees>
                <span class="flex items-center gap-1.5"><Smartphone class="w-3 h-3 shrink-0" /> Téléphone : <span :class="store.coordonneesDe(l).telephone ? 'font-mono text-foreground' : 'text-warning'">{{ store.coordonneesDe(l).telephone ?? 'non renseigné' }}</span></span>
                <span class="flex items-center gap-1.5"><Mail class="w-3 h-3 shrink-0" /> E-mail : <span :class="store.coordonneesDe(l).email ? 'font-mono text-foreground' : 'text-warning'">{{ store.coordonneesDe(l).email ?? 'non renseigné' }}</span></span>
              </p>
              <div v-if="!l.notifications?.length" class="text-[11px] text-muted-foreground">Aucune notification envoyée pour l'instant.</div>
              <div v-else class="flex flex-col gap-1.5">
                <div v-for="n in l.notifications" :key="n.id" class="flex items-start gap-2 text-[11px]">
                  <component :is="n.canal === 'sms' ? Smartphone : Mail" class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-px" />
                  <div class="flex-1">
                    <span class="text-muted-foreground">{{ fmtDateHeure(n.envoyeeLe) }} · </span>
                    <span v-if="n.nonEnvoyee" class="text-danger font-medium">non envoyée : coordonnée manquante · </span>
                    <span v-else-if="n.a" class="text-muted-foreground font-mono">{{ n.a }} · </span>
                    <span class="text-foreground">{{ n.contenu }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- SUITE DES LIVRAISONS : quantités et écarts, notes de protêt, responsabilités -->
        <FormSection v-if="courant && lignesSuivies.length" title="Suite des livraisons"
                     :recaps="[`${lignesSuivies.filter(l => l.ecartQuantite && !l.ecartQuantite.qualification).length} écart(s) à qualifier`, `${lignesSuivies.reduce((n, l) => n + (l.notesProtet?.filter(x => x.statut !== 'cloturee').length ?? 0), 0)} note(s) de protêt ouverte(s)`]" :default-open="false">
          <div class="flex flex-col gap-3">
            <div v-for="l in lignesSuivies" :key="l.id" class="rounded-lg border border-border px-3.5 py-3">
              <p class="text-xs font-semibold text-foreground mb-2">{{ l.destinataire }}<span v-if="l.referenceExterne" class="font-mono font-normal text-muted-foreground"> · {{ l.referenceExterne }}</span></p>
              <SuiteLivraison :voyage="courant" :ligne="l" />
            </div>
          </div>
        </FormSection>

        <!-- SATISFACTION : réponses du destinataire et de l'ordonnateur, distinctes -->
        <FormSection v-if="courant && (lignesSatisfaction.length || enquetesOrdonnateur.length || liensEnquete.length)" title="Satisfaction"
                     :recaps="[`${lignesSatisfaction.filter(l => l.satisfactionNote != null).length} réponse(s) de destinataire`, `${enquetesOrdonnateur.length} réponse(s) d'ordonnateur`]" :default-open="false">
          <div class="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div>
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-1.5">Destinataires</p>
              <p v-if="!lignesSatisfaction.length" class="text-[12px] text-muted-foreground">Aucune enquête envoyée.</p>
              <div v-for="l in lignesSatisfaction" :key="l.id" class="py-1.5 border-b border-border/60 last:border-0">
                <p class="text-[12px] text-foreground font-medium">{{ l.destinataire }}</p>
                <div v-if="l.satisfactionNote != null" class="flex items-center gap-2">
                  <div class="flex items-center gap-0.5"><Star v-for="n in 5" :key="n" class="w-3.5 h-3.5" :class="n <= l.satisfactionNote! ? 'fill-yellow-400 text-yellow-400' : 'text-border'" /></div>
                  <span class="text-[11px] text-muted-foreground">{{ l.satisfactionNote }}/5</span>
                </div>
                <p v-if="l.satisfactionCommentaire" class="text-[11px] text-foreground italic">« {{ l.satisfactionCommentaire }} »</p>
                <span v-if="l.satisfactionNote == null" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-info-bg text-info inline-block mt-0.5">Enquête envoyée · en attente de réponse</span>
              </div>
            </div>
            <div>
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-1.5">Ordonnateurs</p>
              <p v-if="!enquetesOrdonnateur.length" class="text-[12px] text-muted-foreground">Aucune réponse pour l'instant.</p>
              <p v-for="x in liensEnquete" :key="x.c!.id" class="text-[11px] text-muted-foreground" data-lien-enquete>{{ x.c!.ordonnateurExterne ?? x.c!.emisPar ?? 'Système de gestion' }} · {{ x.c!.referenceExterne ?? x.c!.destinataire }} : <RouterLink :to="`/suivi/${x.e.id}?enquete=ordonnateur`" target="_blank" class="text-primary underline">lien de son enquête</RouterLink></p>
              <div v-for="{ commande: c, enquete: q } in enquetesOrdonnateur" :key="c.id" class="py-1.5 border-b border-border/60 last:border-0">
                <p class="text-[12px] text-foreground font-medium">{{ q.reponduPar }} <span class="font-normal text-muted-foreground">· demande pour {{ c.destinataire }}</span></p>
                <p class="text-[11px] text-muted-foreground">Respect de la demande {{ q.respectOrdre }}/5 · délais {{ q.delais }}/5 · qualité {{ q.qualite }}/5</p>
                <p v-if="q.commentaire" class="text-[11px] text-foreground italic">« {{ q.commentaire }} »</p>
              </div>
            </div>
          </div>
        </FormSection>

        <!-- FACTURATION -->
        <FormSection v-if="courant && (aSuivre || courant.moyen === 'externe')" title="Facturation" :recaps="[courant.moyen === 'externe' ? courant.transporteurNom : null]" :default-open="false">
          <FacturationExpedition :voyage="courant" />
        </FormSection>

        <!-- FICHE DE DÉBRIEFING -->
        <FormSection v-if="courant && aSuivre" title="Fiche de débriefing" :recaps="[courant.debriefing ? 'Enregistrée' : 'À remplir']" :default-open="false">
          <FicheDebriefing :voyage="courant" />
        </FormSection>

        <!-- DOSSIER DOCUMENTAIRE : constitué automatiquement -->
        <FormSection v-if="courant && courant.statut !== 'en_attente'" title="Dossier documentaire" :default-open="false">
          <DossierDocumentaire :voyage="courant" />
        </FormSection>

      </div>
    </template>
  </CardModalShell>

  <!-- Dossier complet de l'expédition, le même que dans Flotte > Voyages -->
  <VoyageCard v-if="dossierOuvert && courant" :voyages="[courant]" :voyage-id="courant.id" sans-cloture @close="dossierOuvert = false" />

  <!-- Bon de livraison électronique -->
  <div v-if="eBLCourant" class="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4" @click.self="eBLOuvert = null">
    <div class="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="bg-primary px-5 py-3.5 flex items-center justify-between">
        <h3 class="text-white font-semibold flex items-center gap-2"><FileCheck class="w-4 h-4" /> Bon de livraison électronique</h3>
        <button class="text-white/80 hover:text-white bg-transparent border-0 cursor-pointer" @click="eBLOuvert = null"><X class="w-5 h-5" /></button>
      </div>
      <div class="p-5 flex flex-col gap-3">
        <div class="text-center pb-3 border-b border-border">
          <p class="font-mono text-sm font-semibold text-foreground">{{ eBLCourant.reference }}</p>
          <p class="text-[11px] text-muted-foreground">émis le {{ fmtDateHeure(eBLCourant.emisLe) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div><div class="text-muted-foreground text-[11px]">Destinataire</div>{{ eBLCourant.destinataire }}</div>
          <div><div class="text-muted-foreground text-[11px]">Ordre de transport</div><span class="font-mono">{{ courant?.numeroOT || courant?.reference }}</span></div>
          <div class="col-span-2"><div class="text-muted-foreground text-[11px]">Adresse de livraison</div>{{ eBLCourant.adresse }}</div>
          <div><div class="text-muted-foreground text-[11px]">Marchandise</div>{{ eBLCourant.produit }}</div>
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ moyens.vehicule }}</span></div>
          <div v-if="eBLCourant.quantiteRecue != null"><div class="text-muted-foreground text-[11px]">Quantité reçue</div>{{ eBLCourant.quantiteRecue.toLocaleString('fr-FR') }} {{ uniteEBL }}</div>
        </div>
        <div v-if="eBLCourant.articlesNonLivres?.length" class="bg-warning-bg text-warning rounded-md px-3 py-2 text-[11px]">
          <p class="font-semibold mb-1">Livraison partielle : articles non livrés</p>
          <p v-for="a in eBLCourant.articlesNonLivres" :key="a.libelle">{{ a.libelle }} : {{ a.motif }}</p>
        </div>
        <div v-if="eBLCourant.signePar" class="bg-success-bg text-success rounded-md px-3 py-2 flex items-center gap-2 text-[11px]">
          <FileCheck class="w-4 h-4 shrink-0" /> Réception confirmée par le client : {{ eBLCourant.signePar }}
        </div>
        <div v-else class="bg-warning-bg text-warning rounded-md px-3 py-2 flex items-center gap-2 text-[11px]">
          <Clock class="w-4 h-4 shrink-0" /> Livraison déclarée par le conducteur, en attente de la confirmation du client.
        </div>
      </div>
    </div>
  </div>
</template>
