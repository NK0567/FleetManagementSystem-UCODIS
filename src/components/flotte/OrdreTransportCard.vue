<script setup lang="ts">
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
 * Planifier affecte l'ordre au chauffeur, qui en est notifié : il n'y a
 * pas d'étape où il accepterait ou refuserait. L'ordre passe de
 * lui-même en cours dès que le chauffeur signe sa première livraison,
 * depuis son espace. Annuler reste réservé au planificateur, jamais
 * une action possible depuis l'espace du chauffeur.
 */
import { ref, computed, watch } from 'vue'
import CardModalShell from '../shared/CardModalShell.vue'
import FormSection from '../ui/form-field/FormSection.vue'
import SearchableDropdown from '../ui/SearchableDropdown.vue'
import type { DropdownItem } from '../ui/SearchableDropdown.vue'
import FleetMap from './FleetMap.vue'
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, CalendarClock, CheckCircle2, Circle, CircleX, Clock,
  FileCheck, Mail, MapPin, MapPinCheck, Package, Printer, ShieldAlert, Smartphone, Star, Truck, UserCheck, X, XCircle,
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
import { fmtDateHeure, horsTournee, chargeOrdre } from '../../utils/voyageUtils'
import type { StatutVoyage, EtapeVoyage, Voyage } from '../../types'

const props = defineProps<{ voyages: Voyage[]; voyageId: string }>()
const emit = defineEmits<{ close: []; created: [id: string]; ouvrir: [id: string] }>()

const store = useVoyagesStore()
const vehicules = useVehiculeStore()
const personnel = usePersonnelStore()
const trajets = useTrajetsStore()
const sitesStore = useSitesStore()
const docsVehicule = useDocumentsVehiculeStore()

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

const STATUTS: Record<StatutVoyage, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-warning-bg text-warning' },
  planifie: { label: 'Planifié', cls: 'bg-info-bg text-info' },
  confirme: { label: 'Confirmé', cls: 'bg-info-bg text-info' },
  pret: { label: 'Prêt pour exécution', cls: 'bg-info-bg text-info' },
  affecte: { label: 'Affecté', cls: 'bg-primary/10 text-primary' },
  en_cours: { label: 'En cours', cls: 'bg-primary/10 text-primary' },
  livre: { label: 'En attente de clôture', cls: 'bg-success-bg text-success' },
  cloture: { label: 'Clôturé', cls: 'bg-neutral-bg text-neutral' },
  litige: { label: 'En litige', cls: 'bg-danger-bg text-danger' },
  annule: { label: 'Annulé', cls: 'bg-danger-bg text-danger' },
}

/** Les lignes, comme le général, ne se modifient qu'avant le
 *  déclenchement de l'exécution : une fois « en cours », seul le
 *  chauffeur fait progresser la tournée, en recueillant les
 *  signatures. */
/** Tant que la tournée n'est pas encore Confirmée, elle reste
 *  modifiable : le planificateur peut retirer une ligne dont le
 *  destinataire s'avère indisponible, sans attendre qu'elle repasse en
 *  attente. */
const modifiable = computed(() => enCreation.value || courant.value?.statut === 'en_attente' || courant.value?.statut === 'planifie')
const peutAnnuler = computed(() => courant.value && courant.value.statut !== 'livre' && courant.value.statut !== 'cloture' && courant.value.statut !== 'annule')

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
const form = ref({
  vehiculeId: '', chauffeurIdManuel: '', datePlanifiee: '', numeroOT: '', typeProduit: 'Produits alimentaires secs', poidsChargeKg: 0,
  confirmationRequise: true,
})
watch(courant, v => {
  if (!v) return
  form.value = {
    vehiculeId: v.vehiculeId ?? '', chauffeurIdManuel: '', datePlanifiee: v.datePlanifiee,
    numeroOT: v.numeroOT ?? '', typeProduit: v.marchandise.typeProduit, poidsChargeKg: v.marchandise.poidsChargeKg,
    confirmationRequise: v.confirmationRequise ?? true,
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
/** Le champ manuel se pré-remplit avec le chauffeur déduit à chaque
 *  changement de véhicule, mais reste un champ ordinaire, modifiable à
 *  tout moment par le planificateur - jamais caché derrière un geste
 *  supplémentaire pour en débloquer la modification. */
watch(chauffeurDeduitId, id => { form.value.chauffeurIdManuel = id ?? '' })
const chauffeurEffectifId = computed(() => form.value.chauffeurIdManuel || chauffeurDeduitId.value)
const chauffeur = computed(() => chauffeurEffectifId.value ? personnel.parId(chauffeurEffectifId.value)?.nomComplet ?? null : null)
const optConducteurs = computed<DropdownItem[]>(() => personnel.conducteurs.map(c => ({ id: c.id, label: c.nomComplet })))

/** Indisponibilité du chauffeur retenu (déduit ou choisi à la main),
 *  pour quelque motif que ce soit - absence approuvée ou déjà engagé
 *  ailleurs - signalée, jamais juste ignorée. */
const chauffeurIndispo = computed(() => {
  if (!chauffeurEffectifId.value) return null
  return store.chauffeurIndisponible(chauffeurEffectifId.value, form.value.datePlanifiee || undefined, courant.value?.id)
})

const semiRemorque = computed(() => {
  if (!form.value.vehiculeId) return null
  const at = vehicules.attelageActif(form.value.vehiculeId)
  return at ? vehicules.parId(at.semiRemorqueId)?.immatriculation ?? null : null
})

/** Un véhicule dont une pièce administrative est expirée, ou déjà engagé
 *  sur un autre ordre non terminé, n'est simplement pas proposé au choix :
 *  la planification fait ce qui lui incombe en silence, sans message. */
/** L'infobulle des destinataires se pilote par un état réactif plutôt que
 *  par le survol CSS pur, jugé instable dans cette configuration Tailwind. */
const infobulle = ref<'destinataires' | null>(null)
const optVehicules = computed<DropdownItem[]>(() =>
  vehicules.tracteurs
    .filter(t => docsVehicule.enRegle(t.id) && !store.vehiculeOccupe(t.id, courant.value?.id))
    .map(t => ({ id: t.id, label: t.immatriculation, sublabel: `${t.marque} ${t.modele}` })))
const optProduits: DropdownItem[] = [
  { id: 'Produits alimentaires secs', label: 'Produits alimentaires secs' },
  { id: 'Produits ménagers', label: 'Produits ménagers' },
  { id: 'Boissons', label: 'Boissons' },
  { id: 'Textile', label: 'Textile' },
  { id: 'Matériaux de construction', label: 'Matériaux de construction' },
]

const blocages = computed(() => {
  const out: string[] = []
  if (form.value.vehiculeId && !chauffeur.value) out.push("Ce véhicule n'a aucun conducteur affecté : affectez un conducteur avant de continuer, ou choisissez-en un à la main.")
  if (chauffeurIndispo.value) out.push(`${chauffeur.value} n'est pas disponible (${chauffeurIndispo.value}) : choisissez un autre chauffeur.`)
  return out
})

function enterEdit() { enEdition.value = true }
function cancelEdit() { enEdition.value = false }

/** Valide la section Générale : crée l'ordre s'il n'existe pas encore
 *  (la fiche continue alors, sans se fermer), ou met à jour l'existant. */
const erreur = ref('')
function save() {
  erreur.value = ''
  if (!form.value.vehiculeId) { erreur.value = 'Choisissez un véhicule.'; return }
  if (!form.value.datePlanifiee) { erreur.value = 'Renseignez la date prévue.'; return }
  if (!chauffeur.value) { erreur.value = 'Ce véhicule doit avoir un conducteur affecté, ou choisissez-en un à la main.'; return }
  if (chauffeurIndispo.value) { erreur.value = `${chauffeur.value} n'est pas disponible (${chauffeurIndispo.value}) : choisissez un autre chauffeur.`; return }

  const vehicule = vehicules.parId(form.value.vehiculeId)
  const at = vehicules.attelageActif(form.value.vehiculeId)

  if (enCreation.value) {
    const id = store.creerRapide({
      vehiculeId: form.value.vehiculeId, vehiculePlaque: vehicule?.immatriculation ?? '',
      chauffeurId: chauffeurEffectifId.value ?? undefined, chauffeurNom: chauffeur.value ?? undefined,
      semiRemorqueId: at?.semiRemorqueId, semiRemorquePlaque: semiRemorque.value ?? undefined,
      datePlanifiee: form.value.datePlanifiee,
      numeroOT: form.value.numeroOT, typeProduit: form.value.typeProduit, poidsChargeKg: form.value.poidsChargeKg,
      confirmationRequise: form.value.confirmationRequise,
    })
    idCourant.value = id
    emit('created', id)
    return
  }

  const v = courant.value
  if (!v) return
  v.vehiculeId = form.value.vehiculeId
  v.vehiculePlaque = vehicule?.immatriculation
  v.chauffeurId = chauffeurEffectifId.value ?? undefined
  v.chauffeurNom = chauffeur.value ?? undefined
  v.semiRemorqueId = at?.semiRemorqueId
  v.semiRemorquePlaque = semiRemorque.value ?? undefined
  v.datePlanifiee = form.value.datePlanifiee
  v.numeroOT = form.value.numeroOT || undefined
  v.marchandise.typeProduit = form.value.typeProduit
  v.marchandise.poidsChargeKg = form.value.poidsChargeKg
  v.confirmationRequise = form.value.confirmationRequise
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
const paramsPlanif = useParametresPlanificationStore()
const auth = useAuthStore()
const LIB_ROLES: Record<string, string> = { commercial: "l'équipe commerciale", charge_clientele: 'les chargés de clientèle', responsable_flotte: 'le responsable flotte', admin: "l'administrateur", depot: "l'équipe dépôt", direction: 'la direction' }
const libelleEmetteurs = computed(() => paramsPlanif.parametres.rolesEmetteurs.map(r => LIB_ROLES[r] ?? r).join(', ') || 'les émetteurs désignés')
const rejetOuvert = ref<string | null>(null)
const motifRejet = ref('')
function rejeterDemande(id: string) {
  const res = commandesStore.rejeter(id, motifRejet.value, auth.user?.nom ?? 'le planificateur')
  if (!res.ok) { alert(res.motif); return }
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
const chargeActuelle = computed(() => chargeOrdre({ etapes: lignesAffichees.value, marchandise: { poidsChargeKg: courant.value?.marchandise.poidsChargeKg ?? 0 } }))
const poidsDejaCharge = computed(() => chargeActuelle.value.poidsKg)
const poidsCommandesCochees = computed(() => [...commandesCochees.value].reduce((s, id) => s + (commandesStore.getById(id)?.poidsKg ?? 0), 0))
/** La charge maximale se lit sur la semi-remorque attelée, pas sur le
 *  tracteur : c'est elle qui porte la marchandise. */
const semiRemorqueChoisie = computed(() => {
  const id = form.value.vehiculeId || courant.value?.vehiculeId
  if (!id) return null
  const at = vehicules.attelageActif(id)
  return at ? vehicules.parId(at.semiRemorqueId) : null
})
const capaciteVehicule = computed(() => semiRemorqueChoisie.value?.chargeMaxKg)
const capaciteVolume = computed(() => semiRemorqueChoisie.value?.volumeMaxM3)
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

function ajouterCommandesSelectionnees() {
  if (!courant.value || !commandesCochees.value.size) return
  const ids = [...commandesCochees.value]
  const nouvelles: EtapeVoyage[] = ids.map((id, i) => {
    const c = commandesStore.getById(id)!
    return {
      id: `${courant.value!.id}-L${Date.now()}-${i}`, ordre: lignesLocales.value.length + i + 1,
      siteId: c.siteId, siteNom: c.adresseLivraison, destinataire: c.siteId ? undefined : c.destinataire,
      adresseLivraison: c.adresseLivraison, lat: c.lat, lng: c.lng, role: 'livraison', intervalleMin: 0, franchi: false,
      poidsKg: c.poidsKg, volumeM3: c.volumeM3, canalNotification: c.canalNotification,
      emailDestinataire: c.siteId ? undefined : emailSimule(c.destinataire),
      commandeId: c.id, contenuCommande: c.contenu, referenceExterne: c.referenceExterne,
    }
  })
  lignesLocales.value = [...lignesLocales.value, ...nouvelles]
  commandesStore.affecter(ids, courant.value.id)
  commandesCochees.value = new Set()
  enregistrerLignes()
}

const nouvelleLigne = ref({ destinataire: '', adresse: '', siteId: '', contenu: '', poidsKg: undefined as number | undefined, volumeM3: undefined as number | undefined, canal: 'sms' as 'sms' | 'email' | 'sms_email' })
/* Le canal se pré-remplit avec celui de la fiche client dès que le nom est reconnu. */
watch(() => nouvelleLigne.value.destinataire, nom => { nouvelleLigne.value.canal = clientsStore.canalPour(nom.trim()) })
const optSites = computed<DropdownItem[]>(() => sitesStore.actifs.map(s => ({ id: s.id, label: s.nom, sublabel: s.ville })))
const clientsConnus = computed(() => [...new Set(trajets.trajets.map(t => t.clientNom))])

/** Aucune adresse client réelle n'est géocodée dans cette maquette :
 *  la position est simulée autour du dépôt, pour que la carte reste
 *  lisible plutôt que pour représenter une localisation exacte. */
function positionSimulee() {
  const base = sitesStore.sites.find(s => s.code === 'DEP-TNJ')
  const lat = (base?.lat ?? -18.8792) + (Math.random() - 0.5) * 0.6
  const lng = (base?.lng ?? 47.5079) + (Math.random() - 0.5) * 0.6
  return { lat, lng }
}

/** Adresse e-mail simulée du destinataire, pour montrer clairement à
 *  qui la notification serait adressée - aucun carnet d'adresses réel
 *  n'existe dans cette maquette. */
function emailSimule(destinataire: string) {
  const local = destinataire.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  return `contact@${local}.mg`
}

function ajouterLigne() {
  if (!courant.value) return
  let ligne: EtapeVoyage
  /* Chaque ligne porte un poids : c'est ce qui permet de vérifier la charge
   * de n'importe quel ordre face à la capacité du véhicule. */
  if (!nouvelleLigne.value.poidsKg || nouvelleLigne.value.poidsKg <= 0) { alert('Indiquez le poids de la marchandise pour cette commande.'); return }
  if (!nouvelleLigne.value.contenu.trim()) { alert('Indiquez le contenu de la commande.'); return }
  if (typeLigne.value === 'client') {
    if (!nouvelleLigne.value.destinataire.trim() || !nouvelleLigne.value.adresse.trim()) return
    const { lat, lng } = positionSimulee()
    ligne = {
      id: `${courant.value.id}-L${Date.now()}`, ordre: lignesLocales.value.length + 1,
      siteNom: nouvelleLigne.value.adresse.trim(), destinataire: nouvelleLigne.value.destinataire.trim(),
      adresseLivraison: nouvelleLigne.value.adresse.trim(), lat, lng, role: 'livraison', intervalleMin: 0, franchi: false,
      emailDestinataire: emailSimule(nouvelleLigne.value.destinataire.trim()),
      poidsKg: nouvelleLigne.value.poidsKg, volumeM3: nouvelleLigne.value.volumeM3,
      canalNotification: nouvelleLigne.value.canal,
    }
  } else {
    const site = sitesStore.getById(nouvelleLigne.value.siteId)
    if (!site) return
    ligne = {
      id: `${courant.value.id}-L${Date.now()}`, ordre: lignesLocales.value.length + 1,
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
  })
  commandesStore.affecter([commandeId], courant.value.id)
  ligne.commandeId = commandeId
  ligne.contenuCommande = nouvelleLigne.value.contenu.trim()
  lignesLocales.value = [...lignesLocales.value, ligne]
  nouvelleLigne.value = { destinataire: '', adresse: '', siteId: '', contenu: '', poidsKg: undefined, volumeM3: undefined, canal: 'sms' }
  enregistrerLignes()
}
function retirerLigne(id: string) {
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
  const depot = sitesStore.sites.find(s => s.code === 'DEP-TNJ')
  let pos = { lat: depot?.lat ?? -18.8792, lng: depot?.lng ?? 47.5079 }
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
  store.definirLignes(courant.value.id, lignesLocales.value)
  lignesLocales.value = [...courant.value.etapes].sort((a, b) => a.ordre - b.ordre)
  /* Le poids chargé reflète la somme des lignes issues de commandes, quand
   *  il y en a - sans écraser une saisie manuelle pour des lignes ajoutées
   *  librement, sans poids connu. Écrit directement dans le store, pas
   *  seulement le brouillon local, pour rester visible même hors édition. */
  const charge = chargeOrdre({ etapes: lignesLocales.value, marchandise: { poidsChargeKg: courant.value.marchandise.poidsChargeKg } })
  if (charge.calculeDesLignes) {
    form.value.poidsChargeKg = charge.poidsKg
    courant.value.marchandise.poidsChargeKg = charge.poidsKg
  }
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
const totalEBL = computed(() => lignesAvecDestinataire.value.filter(l => l.eBL).length)
const eBLOuvert = ref<string | null>(null)
const eBLCourant = computed(() => lignesAffichees.value.find(l => l.id === eBLOuvert.value)?.eBL ?? null)

/* ── Actions : planifier (déclenche l'exécution) et annuler ──────── */
function planifier() {
  if (!courant.value) return
  const res = store.planifier(courant.value.id)
  if (!res.ok) alert(res.motif)
}

/** Dernier contrôle avant archivage définitif : jamais une action du
 *  chauffeur, toujours celle du planificateur ou du responsable. */
const lignesReliquat = computed(() => lignesAffichees.value.filter(l => l.eBL?.articlesNonLivres?.length))
const dateReliquat = ref<Record<string, string>>({})
function replanifierReliquat(etapeId: string) {
  if (!courant.value) return
  const res = store.replanifierReliquat(courant.value.id, etapeId, dateReliquat.value[etapeId] ?? '')
  if (!res.ok) alert(res.motif)
}
const lignesContestees = computed(() => lignesAffichees.value.filter(l => l.receptionContesteeLe))
const noteTraitement = ref<Record<string, string>>({})
function traiterContestation(etapeId: string) {
  if (!courant.value) return
  const res = store.traiterContestation(courant.value.id, etapeId, noteTraitement.value[etapeId] ?? '')
  if (!res.ok) alert(res.motif)
}
function cloturer() {
  if (!courant.value) return
  const res = store.cloturerTournee(courant.value.id)
  if (!res.ok) alert(res.motif)
}

/** Après une action qui modifie une ligne directement dans le store
 *  (confirmation, replanification...) plutôt que via le brouillon local,
 *  resynchronise l'affichage : sans ça, une tournée encore modifiable
 *  (Planifié) continuerait d'afficher l'ancien état, puisque
 *  lignesAffichees y lit le brouillon plutôt que le store en direct. */
function synchroniserLignesLocales() {
  if (courant.value) lignesLocales.value = [...courant.value.etapes].sort((a, b) => a.ordre - b.ordre)
}

const lignesChargement = computed(() => lignesAffichees.value.filter(l => !horsTournee(l)))
/** Lignes que le chauffeur a jugées non conformes : sorties de la tournée,
 *  à recharger et à replanifier, sans gêner les autres. */
const lignesNonConformes = computed(() => lignesAffichees.value.filter(l => l.chargementNonConformeLe))

const lignesConcernees = computed(() => lignesAvecDestinataire.value.filter(l => !l.indisponibleLe))
/** Une seule case ouverte à la fois pour le recours - proposer soi-même une
 *  date - qui reste l'exception : le chemin normal est que le client
 *  propose la sienne depuis son espace, et que je l'accepte. */
/** Confirmation téléphonique des destinataires avant chargement : dans
 *  cette maquette, l'action se fait ici plutôt que depuis un écran séparé
 *  pour les agents chargés d'appeler les clients. */

/** Déclaration du chargement par l'entrepôt : dans cette maquette, saisie
 *  depuis la même fiche, faute d'écran d'entrepôt séparé. */
const contenusSaisis = ref<Record<string, string>>({})
/** Pré-remplit la déclaration de chargement avec le contenu commandé, sans
 *  jamais écraser ce que l'entrepôt a déjà saisi. */
function preparerSaisieChargement() {
  const suivant = { ...contenusSaisis.value }
  ;(courant.value?.etapes ?? []).forEach(e => { if (!suivant[e.id]) suivant[e.id] = e.contenuCharge ?? e.contenuCommande ?? '' })
  contenusSaisis.value = suivant
}
watch(() => courant.value?.etapes, preparerSaisieChargement, { immediate: true, deep: true })
watch(() => courant.value?.chargementEntrepotLe, preparerSaisieChargement)
function declarerChargementEntrepot() {
  if (!courant.value) return
  const res = store.declarerChargementEntrepot(courant.value.id, contenusSaisis.value)
  if (!res.ok) alert(res.motif)
}

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
  const res = store.recevoirRetour(courant.value.id, etapeId, conforme, motifNonConformeRetour.value)
  if (!res.ok) { alert(res.motif); return }
  controleRetourOuvert.value = null; motifNonConformeRetour.value = ''
}

const secoursOuvert = ref<string | null>(null)
const dateProgrammee = ref('')
function accepterDate(etapeId: string) {
  if (!courant.value) return
  const res = store.accepterDateClient(courant.value.id, etapeId)
  if (!res.ok) { alert(res.motif); return }
  synchroniserLignesLocales()
}
function proposerDate(etapeId: string) {
  if (!courant.value || !dateProgrammee.value) return
  const res = store.proposerDate(courant.value.id, etapeId, dateProgrammee.value)
  if (!res.ok) { alert(res.motif); return }
  secoursOuvert.value = null; dateProgrammee.value = ''
  synchroniserLignesLocales()
}
function confirmerDateClient(etapeId: string) {
  if (!courant.value) return
  const res = store.confirmerNouvelleDate(courant.value.id, etapeId)
  if (!res.ok) { alert(res.motif); return }
  synchroniserLignesLocales()
}
function dateNeConvientPas(l: EtapeVoyage) {
  if (!courant.value) return
  store.refuserNouvelleDate(courant.value.id, l.id)
  synchroniserLignesLocales()
}
function fmtJour(iso?: string) { return iso ? new Date(iso).toLocaleDateString('fr-FR') : '' }
/** Lignes sorties de la tournée, à replanifier, quelle qu'en soit la cause :
 *  le planificateur les reprend toutes de la même façon. */
const lignesAReplanifier = computed(() => lignesAffichees.value.filter(l => horsTournee(l)))
function causeHors(l: EtapeVoyage) {
  if (l.retourEntrepotLe) return 'Report demandé sur place'
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
function annuler() {
  if (!courant.value || !motifAnnulation.value.trim()) return
  const res = store.annuler(courant.value.id, motifAnnulation.value)
  if (!res.ok) { alert(res.motif); return }
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
    </template>

    <template #form>
      <div class="px-8 py-5 max-w-6xl mx-auto">

        <div v-if="courant && (courant.statut === 'en_attente' || courant.statut === 'confirme' || courant.statut === 'livre' || peutAnnuler)" class="flex items-center justify-end gap-2 mb-3.5">
          <button v-if="peutAnnuler" :class="cls.btnOutline" class="!text-danger !border-danger/30 hover:!bg-danger-bg" @click="annulationOuverte = true">
            <XCircle class="w-4 h-4" /> Annuler
          </button>
          <button v-if="courant.statut === 'en_attente'" :class="cls.btnPrimary" :disabled="!lignesAffichees.length || surcharge" @click="planifier">
            <CalendarClock class="w-4 h-4" /> Plan
          </button>
          <button v-if="courant.statut === 'livre'" :class="cls.btnPrimary" class="!bg-success hover:!bg-success/90" @click="cloturer">
            <CheckCircle2 class="w-4 h-4" /> Clôturer
          </button>
        </div>
        <p v-if="courant?.statut === 'livre'" class="text-[11px] text-muted-foreground text-right -mt-2.5 mb-3.5">
          Toutes les lignes sont réglées : en attente qu'un dernier contrôle avant de clôturer définitivement et
          d'archiver cet ordre.
        </p>
        <p v-if="courant?.statut === 'en_attente' && !lignesAffichees.length" class="text-[11px] text-warning text-right -mt-2.5 mb-3.5">
          Ajoutez au moins une ligne de livraison avant de planifier cet ordre.
        </p>
        <p v-if="courant?.statut === 'en_attente' && lignesAffichees.length > 0" class="text-[11px] text-muted-foreground text-right -mt-2.5 mb-3.5">
          Planifier affecte l'ordre au chauffeur, qui en est notifié, puis appelle chaque destinataire pour confirmer sa disponibilité avant chargement.
        </p>

        <!-- Annulation -->
        <div v-if="annulationOuverte" class="flex flex-col gap-2 bg-danger-bg rounded-lg px-4 py-3 mb-3.5">
          <p class="text-xs text-danger font-medium">Annuler cet ordre de transport</p>
          <textarea v-model="motifAnnulation" rows="2" :class="cls.fieldTextarea" placeholder="Motif de l'annulation (obligatoire)…"></textarea>
          <div class="flex justify-end gap-2">
            <button :class="cls.btnOutline" @click="annulationOuverte = false; motifAnnulation = ''">Renoncer</button>
            <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90" :disabled="!motifAnnulation.trim()" @click="annuler">Confirmer l'annulation</button>
          </div>
        </div>

        <!-- GÉNÉRAL -->
        <FormSection title="Général" :recaps="courant ? [courant.vehiculePlaque, courant.chauffeurNom] : []" :default-open="true">
          <p v-if="enCreation" class="text-[12px] text-muted-foreground mb-3.5 -mt-1">
            Les lignes de livraison - le ou les destinataires notamment - se complètent juste après, à la suite de ce même formulaire.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-4 mb-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Véhicule</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.vehiculeId" :items="optVehicules" placeholder="Choisir…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground font-mono">{{ courant?.vehiculePlaque ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Chauffeur</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.chauffeurIdManuel" :items="optConducteurs" placeholder="Choisir un chauffeur…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border flex items-center text-[13px]"
                   :class="chauffeurIndispo ? 'bg-danger-bg border-danger/30 text-danger font-medium' : (enEdition && modifiable ? chauffeur : courant?.chauffeurNom) ? 'bg-primary/5 border-primary/20 text-primary font-medium' : 'bg-background border-border text-muted-foreground'">
                <AlertTriangle v-if="chauffeurIndispo" class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <UserCheck v-else-if="enEdition && modifiable ? chauffeur : courant?.chauffeurNom" class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <AlertCircle v-else class="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span class="truncate">{{ (enEdition && modifiable ? chauffeur : courant?.chauffeurNom) ?? 'Aucune affectation' }}</span>
              </div>
              <span v-if="chauffeurIndispo" class="text-[10px] text-danger">Non disponible ({{ chauffeurIndispo }}) - choisissez-en un autre</span>
              <span v-else-if="enEdition && modifiable" class="text-[10px] text-muted-foreground">Déduit de l'affectation du véhicule</span>
              <span v-else class="text-[10px] text-muted-foreground">Déduit de l'affectation</span>
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
              <span class="text-[10px] text-muted-foreground">Calculé à partir des lignes ci-dessous</span>
              <div v-if="infobulle === 'destinataires'" class="absolute left-0 top-full mt-1 z-20 bg-card border border-border rounded-md shadow-lg px-3 py-2 min-w-[220px]">
                <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-1">{{ destinatairesUniques.length }} destinataires</p>
                <p v-for="d in destinatairesUniques" :key="d" class="text-[12px] text-foreground leading-snug">{{ d }}</p>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Marchandise</label>
              <SearchableDropdown v-if="enEdition && modifiable" v-model="form.typeProduit" :items="optProduits" placeholder="Sélectionner…" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground truncate">{{ courant?.marchandise.typeProduit ?? '-' }}</div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Semi-remorque</label>
              <div class="h-[38px] px-2.5 rounded-md bg-background border border-border flex items-center text-[13px] text-muted-foreground truncate">
                {{ (enEdition && modifiable ? semiRemorque : courant?.semiRemorquePlaque) ?? 'Aucun attelage' }}
              </div>
              <span class="text-[10px] text-muted-foreground">Déduite de l'attelage</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Poids chargé (kg)</label>
              <div v-if="chargeActuelle.calculeDesLignes" class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ chargeActuelle.poidsKg.toLocaleString('fr-FR') }} kg</div>
              <input v-else-if="enEdition && modifiable" v-model.number="form.poidsChargeKg" type="number" min="0" :class="cls.fieldInput" />
              <div v-else class="h-[38px] px-2.5 rounded-md border border-border bg-background flex items-center text-[13px] text-foreground">{{ (courant?.marchandise.poidsChargeKg ?? 0).toLocaleString('fr-FR') }} kg</div>
              <span v-if="chargeActuelle.calculeDesLignes" class="text-[10px] text-muted-foreground">Calculé à partir des lignes</span>
            </div>
          </div>

          <!-- Charge du véhicule : vaut pour tout ordre, quelle que soit l'origine de ses lignes -->
          <div v-if="courant && (capaciteVehicule || capaciteVolume)" class="mt-4 rounded-md border px-3.5 py-3" :class="surcharge ? 'border-danger/40 bg-danger-bg/40' : 'border-border'">
            <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-2">Charge du véhicule · semi-remorque {{ semiRemorqueChoisie?.immatriculation }}</p>
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

          <label v-if="enEdition && modifiable" class="flex items-center gap-2 mt-4 text-[12px] text-foreground cursor-pointer w-fit">
            <input type="checkbox" v-model="form.confirmationRequise" class="w-4 h-4 accent-primary" />
            Appeler chaque destinataire pour confirmer sa disponibilité avant chargement
          </label>
          <p v-else-if="courant" class="text-[11px] text-muted-foreground mt-4">
            {{ courant.confirmationRequise === false ? "Confirmation client désactivée pour cet ordre : passera directement au chargement une fois planifié." : "Confirmation client requise avant chargement." }}
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

          <div v-if="enEdition && modifiable" class="flex justify-end mt-4">
            <button :class="cls.btnPrimary" @click="save">{{ enCreation ? "Créer l'ordre" : 'Enregistrer' }}</button>
          </div>
        </FormSection>

        <!-- LIGNES DE LIVRAISON : n'apparaît qu'une fois l'ordre créé -->
        <FormSection v-if="courant" title="Commandes à livrer" :recaps="[`${lignesAffichees.length} commande(s)`, courant.clientNom]" :default-open="true">

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
                <span v-if="l.destinataire" class="text-[11px] text-muted-foreground"> · {{ l.adresseLivraison }}</span>
                <span v-else class="text-[11px] text-muted-foreground"> · transfert interne</span>
                <span v-if="l.reporteLe" class="block text-[11px] text-warning">Reportée : {{ l.motifReport }}</span>
                <span v-if="l.ligneAnnuleeLe" class="block text-[11px] text-danger">Annulée par le client : {{ l.motifAnnulationLigne }}</span>
              </div>
              <span v-if="l.franchi && !l.destinataire" class="text-[11px] text-success shrink-0">Passage confirmé</span>
              <span v-else-if="l.franchi && l.receptionConfirmeeClientLe" class="text-[11px] text-success shrink-0">Réception confirmée par {{ l.eBL?.signePar }}{{ l.eBL?.articlesNonLivres?.length ? ' (partielle)' : '' }}</span>
              <span v-else-if="l.franchi && l.receptionContesteeLe && !l.contestationTraiteeLe" class="text-[11px] text-danger font-medium shrink-0">Contestée par le client</span>
              <span v-else-if="l.franchi && l.contestationTraiteeLe" class="text-[11px] text-muted-foreground shrink-0">Contestation traitée</span>
              <span v-else-if="l.franchi" class="text-[11px] text-warning shrink-0" title="Le chauffeur a déclaré la livraison ; seul le client peut confirmer la réception">Déclarée par le chauffeur, en attente du client</span>
              <span v-else-if="l.ligneAnnuleeLe" class="text-[11px] text-danger shrink-0">Annulée</span>
              <span v-else-if="l.indisponibleLe" class="text-[11px] text-warning shrink-0">Indisponible, à replanifier</span>
              <span v-else-if="l.chargementNonConformeLe" class="text-[11px] text-warning shrink-0">Non conforme, à replanifier</span>
              <span v-else-if="l.retourEntrepotLe" class="text-[11px] text-warning shrink-0">Retour à l'entrepôt, à replanifier</span>
              <span v-else-if="l.reporteLe" class="text-[11px] text-warning shrink-0">Reportée</span>
              <span v-else-if="l.arriveeLe" class="text-[11px] text-info shrink-0">Arrivé, signature attendue</span>
              <button v-if="l.eBL" class="text-[11px] text-primary underline bg-transparent border-0 cursor-pointer shrink-0" @click="eBLOuvert = l.id">Voir le e-BL</button>
              <template v-if="modifiable">
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground hover:bg-border/40 shrink-0" :disabled="i === 0" @click="deplacerLigne(l.id, -1)"><ArrowUp class="w-3.5 h-3.5" /></button>
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground hover:bg-border/40 shrink-0" :disabled="i === lignesAffichees.length - 1" @click="deplacerLigne(l.id, 1)"><ArrowDown class="w-3.5 h-3.5" /></button>
                <button class="w-6 h-6 rounded border-0 bg-transparent text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-danger hover:bg-danger-bg shrink-0" @click="retirerLigne(l.id)"><X class="w-3.5 h-3.5" /></button>
              </template>
            </div>
          </div>

          <div v-if="marqueursCarte.length" class="rounded-lg overflow-hidden border border-border mb-4">
            <FleetMap :marqueurs="marqueursCarte" height="260px" />
          </div>

          <template v-if="modifiable">
            <!-- COMMANDES REÇUES : arrivées du système de commandes, pas encore dans
                 un ordre. Les cocher les rattache à cet ordre. -->
            <div v-if="commandesStore.enAttente.length" class="rounded-lg border border-border px-3.5 py-3 mb-4">
              <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-2">
                Commandes reçues, pas encore dans un ordre ({{ commandesStore.enAttente.length }})
              </p>
              <p class="text-[11px] text-muted-foreground mb-2">Elles arrivent du système de commandes (ventes, achats, transferts). Cochez celles qui partent avec ce véhicule.</p>
              <div class="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto mb-3">
                <div v-for="c in commandesStore.enAttente" :key="c.id" class="rounded-md px-2 py-1.5 hover:bg-background">
                  <label class="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" class="w-4 h-4 accent-primary shrink-0 mt-0.5" :checked="commandesCochees.has(c.id)" @change="toggleCommande(c.id)" />
                    <div class="flex-1 min-w-0 text-[12px]">
                      <span class="text-foreground font-medium">{{ c.destinataire }}</span>
                      <span v-if="c.referenceExterne" class="text-muted-foreground font-mono"> · {{ c.referenceExterne }}</span>
                      <span class="text-muted-foreground"> · {{ c.contenu }}<template v-if="c.nombreUnites"> · {{ c.nombreUnites }} {{ paramsPlanif.parametres.uniteComptage }}</template> · {{ c.poidsKg }} kg{{ c.volumeM3 ? ` · ${c.volumeM3} m³` : '' }} · souhaitée le {{ new Date(c.dateSouhaitee).toLocaleDateString('fr-FR') }}</span>
                      <p class="text-[11px] text-muted-foreground">Demandée par {{ c.emisPar ?? 'le système de gestion' }}<template v-if="c.commentaire"> · « {{ c.commentaire }} »</template></p>
                    </div>
                    <button v-if="rejetOuvert !== c.id" class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0 shrink-0" @click.prevent="rejetOuvert = c.id; motifRejet = ''">Rejeter</button>
                  </label>
                  <div v-if="rejetOuvert === c.id" class="flex items-center gap-2 mt-1.5 pl-6 flex-wrap">
                    <input v-model="motifRejet" :class="cls.fieldInput" class="!h-[30px] !text-[12px] flex-1 min-w-[200px]" placeholder="Motif du rejet, transmis à l'émetteur…" />
                    <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="rejetOuvert = null">Renoncer</button>
                    <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px]" :disabled="!motifRejet.trim()" @click="rejeterDemande(c.id)">Rejeter la demande</button>
                  </div>
                </div>
              </div>
              <div v-if="form.vehiculeId" class="flex items-center justify-between text-[12px] mb-2.5" :class="depassementCapacite ? 'text-danger font-medium' : 'text-muted-foreground'">
                <span>Poids après ajout : {{ poidsTotalProjete.toLocaleString('fr-FR') }}{{ capaciteVehicule ? ` / ${capaciteVehicule.toLocaleString('fr-FR')}` : '' }} kg<template v-if="capaciteVolume"> · volume {{ volumeTotalProjete }} / {{ capaciteVolume }} m³</template></span>
                <span v-if="depassementCapacite" class="flex items-center gap-1"><AlertTriangle class="w-3.5 h-3.5" /> Dépasse la capacité du véhicule</span>
              </div>
              <p v-else class="text-[11px] text-muted-foreground italic mb-2.5">Choisissez un véhicule ci-dessus pour comparer le poids à sa capacité.</p>
              <div class="flex justify-end">
                <button :class="cls.btnPrimary" :disabled="!commandesCochees.size || depassementCapacite" @click="ajouterCommandesSelectionnees">
                  <Package class="w-4 h-4" /> Ajouter {{ commandesCochees.size || '' }} au chargement
                </button>
              </div>
            </div>

            <p v-if="!commandesStore.enAttente.length" class="text-[12px] text-muted-foreground italic mb-3">Aucune demande de livraison en attente. Les demandes sont émises par {{ libelleEmetteurs }} depuis leur espace « Demandes de livraison ».</p>
            <template v-if="paramsPlanif.parametres.saisieParPlanificateur">
            <p class="text-[11px] text-muted-foreground uppercase tracking-[0.04em] mb-2">Ou saisir une nouvelle commande</p>
            <div class="flex items-center gap-1.5 mb-3">
              <button :class="typeLigne === 'client' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="typeLigne = 'client'">
                <Package class="w-3.5 h-3.5" /> Livraison client
              </button>
              <button :class="typeLigne === 'transfert' ? cls.btnPrimary : cls.btnOutline" class="!py-1.5 !text-[12px]" @click="typeLigne = 'transfert'">
                <Truck class="w-3.5 h-3.5" /> Transfert interne
              </button>
              <button v-if="lignesLocales.length > 1" :class="cls.btnOutline" class="!py-1.5 !text-[12px] ml-auto" @click="optimiserOrdre">
                <MapPin class="w-3.5 h-3.5" /> Proposer l'ordre par proximité
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
                  <input v-model="nouvelleLigne.adresse" :class="cls.fieldInput" placeholder="Adresse…" />
                </div>
              </template>
              <div v-else class="flex flex-col gap-1.5 sm:col-span-2">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Site interne</label>
                <SearchableDropdown v-model="nouvelleLigne.siteId" :items="optSites" placeholder="Choisir un site…" />
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
              <div v-if="typeLigne === 'client'" class="flex flex-col gap-1.5 sm:col-span-2">
                <label class="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.03em]">Notifications du client</label>
                <select v-model="nouvelleLigne.canal" :class="cls.fieldInput">
                  <option value="sms">SMS</option><option value="email">E-mail</option><option value="sms_email">SMS et e-mail</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end mt-3">
              <button :class="cls.btnPrimary" :disabled="!nouvelleLigne.poidsKg || !nouvelleLigne.contenu.trim() || (typeLigne === 'client' ? (!nouvelleLigne.destinataire.trim() || !nouvelleLigne.adresse.trim()) : !nouvelleLigne.siteId)" @click="ajouterLigne">Ajouter la commande</button>
            </div>
            </template>
          </template>
        </FormSection>

        <!-- CONFIRMATION CLIENT : suivi en lecture seule. Le client répond depuis son
             lien de suivi ; s'il tarde, l'agent chargé des appels enregistre sa
             réponse depuis l'espace « Confirmations clients ». -->
        <FormSection v-if="courant && lignesAvecDestinataire.length && courant.statut !== 'en_attente' && courant.confirmationRequise !== false" title="Confirmation client"
                     :recaps="[`${lignesConcernees.filter(l => l.confirmeLe).length}/${lignesConcernees.length} confirmés`, ...(lignesAvecDestinataire.length - lignesConcernees.length ? [`${lignesAvecDestinataire.length - lignesConcernees.length} à replanifier`] : [])]" :default-open="courant.statut === 'planifie'">
          <p class="text-[11px] text-muted-foreground mb-3">
            Chaque destinataire répond depuis son lien de suivi. S'il tarde, l'agent chargé des appels enregistre
            sa réponse depuis l'espace « Confirmations clients ». Rien n'est saisi ici à leur place.
          </p>
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

                <!-- Retour à l'entrepôt : à contrôler avant réception -->
                <p v-if="l.retourEntrepotLe && !l.retourRecuLe && controleRetourOuvert !== l.id" class="text-[11px] text-foreground">
                  Marchandise en retour vers l'entrepôt.
                  <span class="inline-flex items-center gap-3 ml-1">
                    <button class="text-[11px] text-danger underline bg-transparent border-0 cursor-pointer p-0" @click="controleRetourOuvert = l.id">Non conforme</button>
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="recevoirRetourLigne(l.id, true)">État conforme, réceptionner</button>
                  </span>
                </p>
                <div v-if="controleRetourOuvert === l.id" class="flex items-center gap-2">
                  <input v-model="motifNonConformeRetour" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Ce qui ne va pas sur la marchandise revenue…" />
                  <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px] shrink-0" @click="controleRetourOuvert = null; motifNonConformeRetour = ''">Renoncer</button>
                  <button :class="cls.btnPrimary" class="!bg-danger hover:!bg-danger/90 !py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!motifNonConformeRetour.trim()" @click="recevoirRetourLigne(l.id, false)">Réceptionner comme non conforme</button>
                </div>
                <p v-if="l.retourConformeLe" class="text-[11px] text-success">Marchandise revenue à l'entrepôt le {{ fmtDateHeure(l.retourConformeLe) }}, état conforme.</p>
                <p v-if="l.retourNonConformeLe" class="text-[11px] text-danger">Marchandise revenue à l'entrepôt le {{ fmtDateHeure(l.retourNonConformeLe) }}, non conforme : {{ l.motifRetourNonConforme }}.</p>

                <p v-if="l.dateConfirmeeLe" class="text-[11px] text-success font-medium">
                  Replanifié au {{ fmtJour(l.dateProposeePlanif) }}, repris automatiquement dans un nouvel ordre en attente.
                  <button v-if="l.repriseDansVoyageId" class="underline bg-transparent border-0 cursor-pointer p-0 text-success font-medium" @click="emit('ouvrir', l.repriseDansVoyageId)">Voir le nouvel ordre</button>
                </p>

                <!-- Une date proposée par le planificateur attend la confirmation du
                     client, qu'elle réponde à une absence de date ou contre-propose
                     celle du client : c'est donc le premier cas examiné. -->
                <template v-else-if="l.dateProposeePlanif">
                  <p class="text-[11px] text-foreground">Date proposée au client : <span class="font-semibold">{{ fmtJour(l.dateProposeePlanif) }}</span>, en attente de sa confirmation.</p>
                  <div class="flex items-center gap-3">
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="confirmerDateClient(l.id)">Le client confirme cette date</button>
                    <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="dateNeConvientPas(l)">Cette date ne convient pas</button>
                  </div>
                </template>

                <!-- Chemin normal : le client a proposé sa propre date -->
                <template v-else-if="l.dateDisponibleClient">
                  <p class="text-[11px] text-foreground">Le client propose d'être livré à partir du <span class="font-semibold">{{ fmtJour(l.dateDisponibleClient) }}</span>.</p>
                  <div v-if="secoursOuvert !== l.id" class="flex items-center gap-3">
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" @click="accepterDate(l.id)">Accepter cette date</button>
                    <button class="text-[11px] text-muted-foreground underline bg-transparent border-0 cursor-pointer p-0" @click="secoursOuvert = l.id; dateProgrammee = ''">Lui proposer une autre date</button>
                  </div>
                  <div v-else class="flex items-center gap-2 flex-wrap">
                    <input v-model="dateProgrammee" type="date" :class="cls.fieldInput" class="!h-[32px] !text-[12px] !w-[170px]" />
                    <button :class="cls.btnOutline" class="!py-1 !px-2.5 !text-[11px]" @click="secoursOuvert = null; dateProgrammee = ''">Renoncer</button>
                    <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px]" :disabled="!dateProgrammee" @click="proposerDate(l.id)">Proposer cette date</button>
                  </div>
                </template>

                <!-- Aucune date encore : on attend le client, ou je propose moi-même -->
                <template v-else-if="!l.retourEntrepotLe || l.retourRecuLe">
                  <p v-if="secoursOuvert !== l.id" class="text-[11px] text-muted-foreground italic">
                    En attente que le client indique, depuis son lien de suivi, la date qui lui convient.
                    <button class="underline bg-transparent border-0 cursor-pointer p-0 text-muted-foreground" @click="secoursOuvert = l.id; dateProgrammee = ''">Lui proposer une date moi-même</button>
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

        <!-- CHARGEMENT : l'entrepôt déclare ce qu'il a chargé, ligne par ligne ;
             le chauffeur le contrôle ensuite depuis son propre espace. -->
        <FormSection v-if="courant && (courant.statut === 'confirme' || courant.statut === 'pret' || courant.statut === 'en_cours' || courant.statut === 'livre' || courant.statut === 'cloture')" title="Chargement"
                     :recaps="[courant.chargementEntrepotLe ? 'Entrepôt : fait' : 'Entrepôt : à faire', courant.chargementChauffeurLe ? 'Chauffeur : fait' : 'Chauffeur : à faire']" :default-open="courant.statut === 'confirme'">
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
            <p class="text-xs">Le chauffeur a signalé une non-conformité pour {{ l.destinataire ?? l.siteNom }} : {{ l.motifNonConformite }}. Cette ligne est sortie de la tournée, à recharger et à replanifier. Les autres destinataires ne sont pas affectés.</p>
          </div>

          <!-- Déclaration par l'entrepôt, destinataire par destinataire -->
          <template v-if="!courant.chargementEntrepotLe">
            <div class="flex flex-col gap-2">
              <div v-for="l in lignesChargement" :key="l.id" class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-muted-foreground">{{ l.destinataire ?? l.siteNom }}</label>
                <input v-model="contenusSaisis[l.id]" :class="cls.fieldInput" class="!h-[34px] !text-[12px]" placeholder="Articles chargés, séparés par une virgule…" />
              </div>
            </div>
            <div class="flex justify-end mt-3 mb-3.5">
              <button :class="cls.btnPrimary" @click="declarerChargementEntrepot"><Package class="w-4 h-4" /> Déclarer le chargement effectué</button>
            </div>
          </template>
          <div v-else-if="lignesChargement.some(l => l.contenuCharge)" class="flex flex-col gap-1 mb-3.5">
            <div v-for="l in lignesChargement" :key="l.id" class="text-[12px] flex gap-2">
              <span class="text-muted-foreground shrink-0">{{ l.destinataire ?? l.siteNom }} :</span>
              <span class="text-foreground">{{ l.contenuCharge }}</span>
              <span v-if="l.chargementConformeLe" class="text-success shrink-0">conforme</span>
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
              <span class="text-[13px] text-foreground flex-1">Chargement contrôlé et validé par le chauffeur</span>
              <span v-if="courant.chargementChauffeurLe" class="text-[11px] text-success">{{ fmtDateHeure(courant.chargementChauffeurLe) }}</span>
              <span v-else class="text-[11px] text-muted-foreground italic">Depuis l'espace du chauffeur</span>
            </div>
          </div>
        </FormSection>

        <!-- COMMUNICATION CLIENT : notifications, e-BL, enquête de satisfaction -->
        <!-- RELIQUATS : articles non livrés d'une livraison partielle, à reprendre -->
        <FormSection v-if="courant && lignesReliquat.length" title="Reliquats à replanifier" :recaps="[`${lignesReliquat.filter(l => !l.reliquatReprisLe).length} à replanifier`]" :default-open="true">
          <div class="flex flex-col gap-2">
            <div v-for="l in lignesReliquat" :key="l.id" class="rounded-md px-3 py-2.5" :class="l.reliquatReprisLe ? 'bg-background' : 'bg-warning-bg'">
              <div class="flex items-center gap-2.5 flex-wrap">
                <Package class="w-4 h-4 shrink-0 text-warning" />
                <span class="text-[13px] text-foreground flex-1">{{ l.destinataire }}</span>
                <span class="text-[11px] text-muted-foreground">{{ l.eBL?.articlesNonLivres?.map(a => `${a.libelle} (${a.motif})`).join(' · ') }}</span>
              </div>
              <p v-if="l.reliquatReprisLe" class="text-[11px] text-success mt-1 pl-[26px]">
                Repris dans l'ordre en attente du {{ fmtJour(l.reliquatDate) }}.
                <button v-if="l.reliquatRepriseDansVoyageId" class="underline bg-transparent border-0 cursor-pointer p-0 text-success" @click="emit('ouvrir', l.reliquatRepriseDansVoyageId)">Voir l'ordre</button>
              </p>
              <div v-else class="flex items-center gap-2 mt-2 pl-[26px] flex-wrap">
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
              <div v-else class="flex items-center gap-2 mt-2 pl-[26px]">
                <input v-model="noteTraitement[l.id]" :class="cls.fieldInput" class="!h-[32px] !text-[12px]" placeholder="Comment la contestation a été traitée (enquête, relivraison, avoir…)" />
                <button :class="cls.btnPrimary" class="!py-1 !px-2.5 !text-[11px] shrink-0" :disabled="!noteTraitement[l.id]?.trim()" @click="traiterContestation(l.id)">Marquer traitée</button>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection v-if="courant && lignesAvecDestinataire.length" title="Communication client" :recaps="[`${totalNotifications} notification(s)`, `${totalEBL} e-BL`]" :default-open="false">
          <p class="text-[12px] text-muted-foreground mb-3.5 leading-relaxed">
            Chaque destinataire reçoit automatiquement une notification au démarrage de la tournée, puis à sa
            livraison, avec un lien vers son propre espace de suivi - sans compte ni mot de passe, comme un
            lien de suivi de colis. Le canal SMS ou e-mail réel n'est pas branché dans cette maquette, mais le
            lien lui-même est fonctionnel : ouvrez-le pour voir ce que le destinataire voit.
          </p>
          <div class="flex flex-col gap-3">
            <div v-for="l in lignesAvecDestinataire" :key="l.id" class="rounded-lg border border-border px-3.5 py-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-semibold text-foreground">{{ l.destinataire }}</span>
                <RouterLink :to="`/suivi/${l.id}`" target="_blank" class="text-[11px] text-primary underline">Ouvrir son espace de suivi</RouterLink>
              </div>
              <p v-if="l.emailDestinataire" class="text-[11px] text-muted-foreground mb-2 flex items-center gap-1.5">
                <Mail class="w-3 h-3 shrink-0" /> Serait envoyé par e-mail à <span class="font-mono">{{ l.emailDestinataire }}</span>
              </p>
              <div v-if="!l.notifications?.length" class="text-[11px] text-muted-foreground">Aucune notification envoyée pour l'instant.</div>
              <div v-else class="flex flex-col gap-1.5">
                <div v-for="n in l.notifications" :key="n.id" class="flex items-start gap-2 text-[11px]">
                  <component :is="n.canal === 'sms' ? Smartphone : Mail" class="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-px" />
                  <div class="flex-1">
                    <span class="text-muted-foreground">{{ fmtDateHeure(n.envoyeeLe) }} · </span>
                    <span class="text-foreground">{{ n.contenu }}</span>
                  </div>
                </div>
              </div>

              <div v-if="l.satisfactionEnvoyeeLe" class="mt-2.5 pt-2.5 border-t border-border/60">
                <div v-if="l.satisfactionNote != null" class="flex items-center gap-2">
                  <div class="flex items-center gap-0.5">
                    <Star v-for="n in 5" :key="n" class="w-3.5 h-3.5" :class="n <= l.satisfactionNote! ? 'fill-yellow-400 text-yellow-400' : 'text-border'" />
                  </div>
                  <span class="text-[11px] text-muted-foreground">{{ l.satisfactionNote }}/5</span>
                </div>
                <p v-if="l.satisfactionCommentaire" class="text-[11px] text-foreground italic mt-1">« {{ l.satisfactionCommentaire }} »</p>
                <span v-if="l.satisfactionNote == null" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-info-bg text-info inline-block mt-0.5">Enquête envoyée · en attente de réponse</span>
              </div>
            </div>
          </div>
        </FormSection>

      </div>
    </template>
  </CardModalShell>

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
          <div><div class="text-muted-foreground text-[11px]">Véhicule</div><span class="font-mono">{{ courant?.vehiculePlaque }}</span></div>
        </div>
        <div v-if="eBLCourant.articlesNonLivres?.length" class="bg-warning-bg text-warning rounded-md px-3 py-2 text-[11px]">
          <p class="font-semibold mb-1">Livraison partielle - articles non livrés</p>
          <p v-for="a in eBLCourant.articlesNonLivres" :key="a.libelle">{{ a.libelle }} : {{ a.motif }}</p>
        </div>
        <div v-if="eBLCourant.signePar" class="bg-success-bg text-success rounded-md px-3 py-2 flex items-center gap-2 text-[11px]">
          <FileCheck class="w-4 h-4 shrink-0" /> Réception confirmée par le client lui-même : {{ eBLCourant.signePar }}
        </div>
        <div v-else class="bg-warning-bg text-warning rounded-md px-3 py-2 flex items-center gap-2 text-[11px]">
          <Clock class="w-4 h-4 shrink-0" /> Livraison déclarée par le chauffeur. En attente de la confirmation du client depuis son lien de suivi.
        </div>
      </div>
    </div>
  </div>
</template>
