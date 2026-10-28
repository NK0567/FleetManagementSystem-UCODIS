/* ══════════════════════════════════════════════════════════════
   Types du FMS Trucks UCODIS.
   Les rôles et les fonctions viennent de la SOP UCD-TRUCK-FLOT-001,
   section 3 · Responsabilités. Aucun rôle n'est inventé, à
   l'exception de « direction », signalé comme tel dans le document
   de user stories.
   ══════════════════════════════════════════════════════════════ */

export type RoleUtilisateur =
  | 'admin'
  | 'responsable_flotte'
  | 'maintenancier'
  | 'charge_clientele'
  | 'commercial'
  | 'depot'
  | 'direction'
  | 'conducteur'
  | 'aide_conducteur'

export interface Utilisateur {
  id: string
  nom: string
  role: RoleUtilisateur
  identifiant: string
  personnelId?: string
  entiteId?: string
  entiteNom?: string
  actif: boolean
  dernierAcces?: string
}

/* ── Structure ────────────────────────────────────────────────── */

export type TypeEntite = 'direction' | 'service' | 'equipe'

/**
 * Statut de validation de l'entité dans la maquette elle-même · pas un
 * statut métier UCODIS. « à valider » sert à représenter les entités
 * proposées dans le document de user stories (ex. le futur module
 * « Opérations et voyages ») qui attendent une confirmation d'UCODIS.
 */
export type StatutEntite = 'validee' | 'a_valider'

export interface Entite {
  id: string
  code: string
  nom: string
  type: TypeEntite
  parentId: string | null
  responsableNom?: string
  responsableId?: string
  effectif: number
  site?: string
  description?: string
  statut: StatutEntite
  soumiseLe?: string
}

/* ── Fonctions (postes) ───────────────────────────────────────── */

export interface Fonction {
  id: string
  code: string
  libelle: string
  entiteId: string
  /** Responsabilités reprises mot pour mot de la SOP. */
  responsabilites: string[]
  /** true si la fonction conduit un camion : impose permis + habilitation. */
  conduit: boolean
  effectif: number
}

/* ── Personnel ────────────────────────────────────────────────── */

export type StatutPersonnel = 'actif' | 'conge' | 'suspendu' | 'fin_contrat' | 'archive'
/** Type de contrat, paramétré dans la configuration (typesContrat). */
export type TypeContrat = string

export interface Personnel {
  id: string
  matricule: string
  nom: string
  prenom: string
  nomComplet: string
  fonctionId: string
  fonctionLibelle: string
  entiteId: string
  entiteNom: string
  site: string
  telephone: string
  email?: string
  cin: string
  dateNaissance: string
  /** Champs d'identité repris des projets de référence · sans équivalent
   *  dans les documents UCODIS, ils restent optionnels et n'empêchent
   *  jamais l'enregistrement d'une fiche incomplète. */
  genre?: 'M' | 'F'
  lieuNaissance?: string
  situationFamiliale?: 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf/Veuve'
  typePieceIdentite?: 'CIN' | 'Passeport' | 'Permis de séjour'
  /** Catégorie de classification · détermine le droit annuel par défaut. */
  categorieId?: string
  contrat: TypeContrat
  dateEntree: string
  dateSortie?: string
  statut: StatutPersonnel
  /** Renseigné uniquement pour les conducteurs et aides conducteurs. */
  conduit: boolean
  habilite: boolean
  habilitePar?: string
  habiliteLe?: string
  motifRetraitHabilitation?: string
  compteSysteme: boolean
  /** Indisponibilités saisies dans le FMS, sans dépendre d'un module du personnel (FMS-DB-12). */
  indisponibilitesManuelles?: { id: string; du: string; au: string; motif: string; par: string }[]
}

/* ── Documents du personnel ───────────────────────────────────── */

/** Code d'un type de document du référentiel (store typesDocuments) : les
 *  types se paramètrent, ils ne sont plus figés dans le code. */
export type TypeDocument = string
/** Pièce jointe : le scan du document, conservé avec lui. */
export interface PieceJointe { nom: string; dataUrl?: string }
/** États qui ne se déduisent pas d'une date et se saisissent. */
export type StatutSaisiDocument = 'annule' | 'perdu'
export type EtatDocument = 'valide' | 'proche' | 'expire' | 'absent' | 'annule' | 'perdu'

export interface DocumentPersonnel {
  id: string
  personnelId: string
  type: TypeDocument
  libelle: string
  reference?: string
  categorie?: string
  dateDelivrance: string
  dateExpiration?: string
  fichier?: string
  version: number
  archive: boolean
  scan?: PieceJointe
  delaiNotificationJours?: number
  statutSaisi?: StatutSaisiDocument
  motifStatut?: string
  /** Remplacé par un document plus récent du même type. */
  remplacePar?: string
}

/* ── Journal ──────────────────────────────────────────────────── */

export interface EntreeJournal {
  id: string
  horodatage: string
  auteur: string
  action: string
  cible: string
  detail?: string
}

/* ── Paramètres ───────────────────────────────────────────────── */

export interface Site {
  id: string
  code: string
  nom: string
  adresse: string
  type: 'siege' | 'depot' | 'garage'
}

export interface Societe {
  raisonSociale: string
  entite: string
  activite: string
  adresse: string
  pays: string
  nifStat: string
  parcTracteurs: number
  parcSemiRemorques: number
  /** Préfixe des matricules générés pour le personnel. */
  prefixeMatricule: string
}

export interface Parametres {
  /** Cahier des charges module 9 : alerte à J-30 par défaut, paramétrable. */
  seuilAlerteJours: number
  escaladeJours: number
  /**
   * Le cahier des charges cite les règles HOS/ELD, qui sont
   * nord-américaines. Les seuils sont donc paramétrables ici et
   * non codés en dur · voir « Points à trancher », point 6.
   */
  conduiteMaxJournaliereH: number
  reposMinJournalierH: number
  conduiteMaxHebdoH: number
}

/* ── Véhicules (module 1) ─────────────────────────────────────── */

/** Code d'un type de véhicule du référentiel paramétrable (store typesVehicules). */
export type TypeVehicule = string
/** Statut opérationnel (FMS-DB-02), déduit des faits enregistrés. « sorti » est le statut administratif de sortie du parc. */
export type StatutVehicule = 'disponible' | 'affecte' | 'en_mission' | 'en_maintenance' | 'immobilise' | 'hors_service' | 'sorti'
/** Compartiment d'une citerne : son volume est saisi à sa définition et suit la citerne. */
export interface Compartiment { numero: number; volumeL: number; produit?: string }

export interface Vehicule {
  id: string
  immatriculation: string
  vin: string
  type: TypeVehicule
  marque: string
  modele: string
  categorie: string
  carburant: string
  /** Capacité du réservoir en litres, pour le contrôle des pleins. */
  capaciteReservoirL?: number
  chargeMaxKg?: number
  /** Volume utile de la caisse, pour la semi-remorque. */
  volumeMaxM3?: number
  site: string
  statut: StatutVehicule
  motifIndisponibilite?: string
  kilometrage: number
  /** Compteur d'heures moteur, pour les entretiens dont le seuil est en heures. */
  heuresMoteur?: number
  annee?: number
  dateMiseEnCirculation?: string
  modeAcquisition?: 'achat' | 'location' | 'leasing'
  coutAcquisitionAr?: number
  valeurResiduelleAr?: number
  sortie?: { motif: string; date: string; par: string; kilometrageSortie?: number; commentaire?: string }
  /** Statut choisi à la main, quand aucun fait ne le porte (hors service). */
  statutManuel?: { statut: 'hors_service'; motif: string; par: string; le: string }
  /** Immatriculations précédentes, avec la date du changement (FMS-DB-04). */
  historiqueImmatriculations?: { ancienne: string; nouvelle: string; le: string; par: string; motif?: string }[]
  photos?: PieceJointe[]
  compartiments?: Compartiment[]
  /** Tiers associé à l'acquisition : vendeur, loueur, banque ou constructeur. */
  prestataireAcquisitionId?: string
  mensualiteAr?: number
  dateAcquisition?: string
  /** Relevés de kilométrage, dont celui demandé au retour de voyage. */
  relevesKm?: { le: string; km: number; source: string; voyageRef?: string }[]
}

/** Code d'un type d'équipement embarqué du référentiel paramétrable (store typesEquipements). */
export type TypeEquipement = string
export type EtatEquipement = 'operationnel' | 'hors_service' | 'desinstalle'
export interface EquipementEmbarque {
  id: string
  vehiculeId: string
  type: TypeEquipement
  numeroSerie?: string
  etat: EtatEquipement
  /** Échéance de vérification ou de remplacement, pour les équipements qui en ont une. */
  echeance?: string
  installeLe?: string
}

export interface Attelage {
  id: string
  tracteurId: string
  semiRemorqueId: string
  dateDebut: string
  dateFin?: string
}

export interface AffectationVehicule {
  id: string
  vehiculeId: string
  conducteurId: string
  dateDebut: string
  dateFin?: string
}

/* ── Voyages (Flotte · Exploitation) ──────────────────────────
 * Repris du module Voyages du socle FMS, adapté au fret général d'UCODIS :
 * poids et nombre de cartons plutôt que volumes de carburant, écart de
 * poids plutôt que coulage. Aucun des dix modules du cahier des charges
 * ne s'appelle « Voyages » ; cette entité reprend ce que la SOP décrit
 * (fiche de voyage, bon de livraison, carnet de bord) sous une forme
 * activable, comme convenu. */

export type StatutVoyage = 'en_attente' | 'planifie' | 'confirme' | 'pret' | 'en_cours' | 'livre' | 'cloture' | 'annule'
export type RoleEtape = 'depart' | 'chargement' | 'repos' | 'controle' | 'livraison' | 'arrivee'

export interface EtapeVoyage {
  id: string
  siteId?: string
  siteNom: string
  ordre: number
  lat: number
  lng: number
  role: RoleEtape
  volet?: VoletTrajet
  intervalleMin: number
  pausePrevueMin?: number
  /** Livraison qui exige un véhicule équipé d'une pompe opérationnelle. */
  pompeExigee?: boolean
  franchi: boolean
  /** Propre au module Planification : chaque ligne porte son propre
   *  destinataire plutôt que l'ordre entier. Absent = transfert entre
   *  sites internes plutôt que livraison chez un client. */
  destinataire?: string
  adresseLivraison?: string
  /** Le chauffeur marque son arrivée sur place, avant de recueillir la
   *  signature du destinataire : deux gestes distincts, l'un atteste
   *  qu'il est passé, l'autre que la livraison a bien été reçue. */
  /** Confirmation de disponibilité du destinataire, recueillie par
   *  téléphone avant le chargement, pour éviter un retour coûteux si le
   *  client s'avère finalement indisponible. Distincte de la signature
   *  de livraison, qui n'intervient qu'après le passage du chauffeur. */
  confirmeLe?: string
  /** Le destinataire, appelé avant chargement, indique ne pas pouvoir être
   *  livré à la date prévue. Sa ligne sort de la tournée : elle ne compte
   *  plus ni pour la confirmation des autres destinataires, ni pour le
   *  chargement, ni pour l'exécution - l'indisponibilité d'un client
   *  n'affecte jamais les autres. */
  indisponibleLe?: string
  motifIndisponibilite?: string
  /** Date à laquelle le client dit pouvoir être livré. */
  dateDisponibleClient?: string
  /** Replanification : le planificateur programme une nouvelle date avec
   *  le client, puis attend sa confirmation. La date reste « proposée »
   *  tant que le client ne l'a pas confirmée. */
  dateProposeePlanif?: string
  dateConfirmeeLe?: string
  /** Ce que l'entrepôt déclare avoir chargé pour cette ligne, pour que le
   *  chauffeur puisse le contrôler avant de valider. */
  contenuCharge?: string
  /** Les articles de cette ligne, tirés de ce que l'entrepôt déclare avoir
   *  chargé pour ce destinataire. */
  articles?: ArticleLigne[]
  /** Le client a demandé sur place de reporter à une autre date : la
   *  marchandise retourne à l'entrepôt pour être replanifiée, et la ligne
   *  sort de la tournée. Distinct d'un point simplement reporté, qui sera
   *  retenté plus tard dans la même tournée. */
  retourEntrepotLe?: string
  motifRetour?: string
  retourRecuLe?: string
  /** L'entrepôt contrôle l'état de la marchandise à son retour, avant de la
   *  considérer réceptionnée : c'est un produit qui a voyagé et qu'on ne
   *  peut pas simplement supposer intact. */
  retourConformeLe?: string
  retourNonConformeLe?: string
  motifRetourNonConforme?: string
  /** Renseigné une fois que le chauffeur a rapporté à l'entrepôt les
   *  articles non livrés de cette ligne : sans quoi le rappel doit rester
   *  visible pour lui, même après la fin de la tournée qui le portait. */
  articlesRapportesLe?: string
  /** Une fois la nouvelle date confirmée par le client, cette ligne est
   *  reprise automatiquement dans un nouvel ordre, à cette date : cet
   *  identifiant relie l'une à l'autre. */
  repriseDansVoyageId?: string
  /** Reliquat d'une livraison partielle (articles non livrés) repris dans un
   *  ordre en attente : date retenue et ordre de reprise. */
  reliquatReprisLe?: string
  reliquatDate?: string
  reliquatRepriseDansVoyageId?: string
  /** Contrôle du chauffeur, ligne par ligne : ce que l'entrepôt déclare pour
   *  ce destinataire est conforme, ou non. Une ligne non conforme sort de la
   *  tournée, à recharger et à replanifier, sans affecter les autres. */
  chargementConformeLe?: string
  chargementNonConformeLe?: string
  motifNonConformite?: string
  /** Poids et volume de cette ligne, quand elle vient d'une commande
   *  regroupée : sert à recalculer le poids chargé de l'ordre entier. */
  poidsKg?: number
  volumeM3?: number
  arriveeLe?: string
  /** Le chauffeur déclare, depuis son propre appareil, avoir effectué la
   *  livraison : ça fait avancer sa tournée, mais ça ne prouve pas que le
   *  client a reçu la marchandise. Un chauffeur pourrait le déclarer sans
   *  être passé chez le client. */
  livreParChauffeurLe?: string
  /** Confirmation de réception par le client lui-même, depuis son propre
   *  espace de suivi : seule cette action fait foi, jamais une saisie faite
   *  sur l'appareil du chauffeur. */
  receptionConfirmeeClientLe?: string
  /** Vrai quand la réponse de disponibilité a été enregistrée par un agent
   *  au téléphone plutôt que par le client depuis son lien. La page du client
   *  affiche la même chose dans les deux cas. */
  reponseViaAgent?: boolean
  /** Le client conteste la déclaration du chauffeur : il n'a rien reçu, ou
   *  pas ce qui est déclaré. La ligne passe en litige, à traiter par le
   *  planificateur ; c'est le garde-fou contre une livraison déclarée mais
   *  jamais faite. */
  receptionContesteeLe?: string
  motifContestation?: string
  /** Le planificateur a traité la contestation (enquête, avoir, relivraison...). */
  contestationTraiteeLe?: string
  noteTraitementContestation?: string
  /** Code du motif de traitement choisi dans la liste réglable. */
  codeTraitementContestation?: string
  contestationTraiteePar?: string
  /** Retour non conforme constaté sur la ligne d'origine, repris sur la ligne replanifiée. */
  nonConformiteReprise?: string
  /** Historique des notifications automatiques envoyées au destinataire
   *  de cette ligne, simulées puisqu'aucun canal SMS ou e-mail réel
   *  n'est branché dans cette maquette. */
  notifications?: NotificationClient[]
  /** Bon de livraison électronique, émis automatiquement dès la
   *  signature recueillie. */
  eBL?: BonLivraisonElectronique
  /** Enquête de satisfaction, envoyée avec le e-BL ; la réponse reste
   *  facultative pour le destinataire. */
  satisfactionEnvoyeeLe?: string
  satisfactionNote?: number
  satisfactionCommentaire?: string
  /** Canal des notifications pour cette ligne : repris de la commande, ou du
   *  canal préféré du client par défaut. */
  canalNotification?: 'sms' | 'email' | 'sms_email'
  /** Commande dont cette ligne est la livraison : toute ligne d'un ordre est
   *  une commande, reçue du système de commandes ou saisie dans l'ordre. */
  commandeId?: string
  /** Contenu commandé : pré-remplit la déclaration de chargement de l'entrepôt. */
  contenuCommande?: string
  /** Référence externe de la commande (ex. numéro de bon de livraison),
   *  reprise sur la ligne pour suivre le bon jusqu'au camion. */
  referenceExterne?: string
  /** Le point est reporté quand le chauffeur ne peut pas le livrer sur
   *  le moment (client fermé, absent...) : la séquence continue sans
   *  lui plutôt que de bloquer les livraisons suivantes. Il reste
   *  accessible pour être retenté ensuite. */
  reporteLe?: string
  motifReport?: string
  /** Le point est annulé quand le client annule sa commande en cours de
   *  route : contrairement à un report, il ne sera plus jamais retenté.
   *  Distinct de l'annulation de la tournée entière, qui reste réservée
   *  au planificateur. */
  ligneAnnuleeLe?: string
  motifAnnulationLigne?: string
  /** Annulation demandée par le client avant le départ, enregistrée par le
   *  planificateur (et non un refus sur place). */
  annuleeAvantDepart?: boolean
  /** Marchandise qui revient à l'entrepôt (refus sur place) : contrôlée à
   *  son retour comme toute marchandise revenue de tournée. */
  retourAttenduLe?: string
  /** Nombre d'unités commandées et chargées (unité de comptage paramétrée). */
  nombreUnites?: number
  /** Produit transporté pour cette livraison (référentiel des produits). */
  produit?: string
  /** Heure d'arrivée prévue, fixée à la planification. */
  heurePrevue?: string
  /** Quantité reçue, saisie à la déclaration de la livraison. */
  quantiteRecue?: number
  /** Justification d'une quantité hors tolérance quand le réglage bloque la saisie. */
  justificationQuantite?: string
  /** La quantité reçue a été confirmée par le destinataire avec sa réception. */
  quantiteConfirmeeClientLe?: string
  ecartQuantite?: EcartQuantite
  notesProtet?: NoteProtet[]
  responsabilite?: ResponsabiliteLivraison
  facturation?: FacturationLivraison
  /** Carburant : bon de livraison généré à la validation de la tournée. */
  bonLivraison?: { numero: string; emisLe: string; statut: 'emis' | 'annule' | 'devie' }
  /** Carburant : volumes dépotés chez le client, compartiment par compartiment. */
  mesuresDepotees?: MesureCompartiment[]
  /** Carburant : incident qui a annulé ou dévié ce bon de livraison. */
  incidentBon?: IncidentBon
  /** Carburant : livraison déviée vers un autre client, ou reçue d'une déviation. */
  devieeVers?: string
  devieeDe?: string
  /** Carburant : l'écart n'a pas pu être contrôlé (volumes non saisis à l'enlèvement), avec la raison. */
  ecartNonControle?: string
  /** Fret : quantité chargée déclarée par l'entrepôt ; elle sert de référence au contrôle d'écart. */
  quantiteChargee?: number
  /** Qui a enregistré le refus : le conducteur (ou le planificateur pour un transporteur externe), ou le destinataire lui-même depuis son lien. */
  refusSaisiPar?: 'conducteur' | 'destinataire'
  /** Report avec retour décidé parce que le client est absent ou fermé (et non à sa demande). */
  retourClientAbsent?: boolean
  /** Carburant : la commande de la ligne sortie de la tournée est remise parmi les commandes à planifier. */
  commandeRemiseLe?: string
  /** Erreurs de saisie corrigées sur cette livraison : qui, quand, quoi, et pourquoi. */
  corrections?: { le: string; par: string; action: string; motif?: string }[]
}

/* ── Livraison de carburant (TMS) ─────────────────────────────── */

/** Mesure d'un compartiment : au chargement (BSL) ou au dépotage chez le client. */
export interface MesureCompartiment {
  numero: number
  /** Chaque mesure est facultative à l'enlèvement : seules les mesures saisies sont gardées. */
  volumeL?: number
  temperature?: number
  densite?: number
  volume15?: number
  /** Volume à 15 °C calculé avec la méthode réglée (aucune valeur saisie du BSL ou du relevé). */
  volume15Calcule?: boolean
  /** Livraison : compartiment non dépoté (0 L), avec son motif. */
  motifNonDepote?: string
}

/** Un compartiment d'une citerne dans le plan de chargement d'une tournée de carburant. */
export interface CompartimentPlan {
  /** Camion (véhicule motorisé) de la tournée qui porte la citerne. */
  vehiculeId: string
  citerneId: string
  numero: number
  capaciteL: number
  produit?: string
  volumeL?: number
  commandeId?: string
  client?: string
  /** Bon de livraison annulé avant le chargement : ce compartiment n'est pas chargé. */
  nonCharge?: boolean
  /** Déviation : commande et client d'origine du compartiment, pour garder le bon d'origine lisible. */
  commandeOrigineId?: string
  clientOrigine?: string
  /** Contrôle du conducteur, compartiment par compartiment. */
  conformeLe?: string
  nonConformeLe?: string
  motifNonConformite?: string
}

/** Camion d'une tournée de carburant : le véhicule motorisé et sa citerne. */
export interface CamionTournee { vehiculeId: string; plaque: string; citerneId: string; citernePlaque: string; chauffeurId?: string; chauffeurNom?: string }

/** Opération tracée sur un bon (changement de camion ou de dépôt, transmission, annulation, déviation). */
export interface OperationBon { le: string; par: string; action: string; motif?: string }

/** Bon d'enlèvement : ce que le dépôt doit charger dans un camion, compartiment par compartiment. */
export interface BonEnlevement {
  numero: string
  statut: 'emis' | 'confirme' | 'annule'
  emisLe: string
  transmisLe?: string
  transmisA?: string
  /** Données du BSL remis par le dépôt à la sortie du carburant. */
  bsl?: { numero: string; saisiLe: string; saisiPar: string; parDepot: boolean; mesures: MesureCompartiment[] }
  historique: OperationBon[]
}

/** Incident qui annule ou dévie un bon : type d'incident, type de motif et code motif paramétrés. */
export interface IncidentBon { typeIncident: string; typeMotif: string; codeMotif: string; commentaire?: string; le: string; par: string }

/** Tournée de carburant, portée par l'ordre de transport. */
export interface TourneeCarburant {
  /** Référence commune à tous les ordres nés de la même tournée. */
  reference: string
  depotId: string
  depotNom: string
  dateValidite: string
  region: string
  camions: CamionTournee[]
  commandeIds: string[]
  plan: CompartimentPlan[]
  planEnregistreLe?: string
  /** Tournée à plusieurs camions : rang de ce camion et nombre de camions retenus à la validation. */
  rangCamion?: number
  nbCamions?: number
  valideeLe?: string
  valideePar?: string
  bonEnlevement?: BonEnlevement
}

/** Écart entre la quantité chargée et la quantité reçue, à qualifier. */
export type QualificationEcart = 'gain' | 'coulage'
export interface EcartQuantite {
  quantiteChargee: number
  quantiteRecue: number
  /** Reçue moins chargée : positif = gain, négatif = manque. */
  ecart: number
  horsTolerance: boolean
  motif?: string
  /** Unité de l'écart : « L à 15 °C » ou « L » pour le carburant, l'unité de comptage sinon. */
  unite?: string
  detecteLe: string
  /** Aucune conséquence n'est tirée tant que l'écart n'est pas qualifié. */
  qualification?: QualificationEcart
  imputableConducteur?: boolean
  commentaire?: string
  qualifieLe?: string
  qualifiePar?: string
}

/** Note de protêt : réserve formalisée sur une livraison. */
export type StatutNoteProtet = 'en_preparation' | 'emise' | 'cloturee'
export interface NoteProtet {
  id: string
  numero: string
  motif: string
  quantiteEnCause: number
  piecesJointes: PieceJointe[]
  statut: StatutNoteProtet
  prepareeLe: string
  prepareePar: string
  emiseLe?: string
  clotureeLe?: string
  issue?: string
}

/** Établissement de la responsabilité en cas d'insatisfaction, de perte ou de dommage. */
export type OrigineProbleme = 'depart' | 'transport' | 'commande'
export type ActeurResponsable = 'ordonnateur' | 'logistique' | 'transporteur_interne' | 'transporteur_externe'
export type TypeImpactFinancier = 'retenue_transporteur' | 'avoir_client'
export interface ResponsabiliteLivraison {
  origine: OrigineProbleme
  /** Acteur qui porte la plus grande part. */
  acteur: ActeurResponsable
  /** Responsabilité partagée : part de chaque acteur, en pourcentage (total 100). */
  repartition?: { acteur: ActeurResponsable; part: number }[]
  /** Motif choisi dans la liste réglable, complété du commentaire. */
  motif?: string
  commentaire: string
  impacts: { type: TypeImpactFinancier; montant: number }[]
  etablieLe: string
  etabliePar: string
}

/** Facturation de la prestation faite pour le compte d'un client. */
export interface FacturationLivraison {
  statut: 'a_facturer' | 'facturee'
  /** Client facturé (référentiel des clients). */
  clientId: string
  montant: number
  detail: string
  reference?: string
  factureeLe?: string
  factureePar?: string
  /** Forfait au trajet : part du forfait de l'expédition portée par cette livraison. */
  partForfait?: number
  /** Avoir établi après la facturation, à émettre puis émis. */
  avoirAEmettre?: { montant: number; depuisLe: string; reference?: string; emisLe?: string; emisPar?: string }
}

/** Point du plan de trajet prévisionnel, repris d'un trajet de référence. */
export interface PointPlanTrajet {
  id: string
  siteNom: string
  ordre: number
  lat: number
  lng: number
  role: RoleEtape
  /** Temps de trajet maximal depuis le point précédent, en minutes. */
  intervalleMin: number
  /** Durée d'arrêt maximale, en minutes. */
  pausePrevueMin?: number
}

/** Modification de l'itinéraire en cours de voyage : l'ancien trajet reste dans l'historique. */
export interface ModificationItineraire {
  le: string
  par: string
  motif: string
  ancienTrajetId?: string
  ancienLibelle: string
  ancienPlan: PointPlanTrajet[]
  nouveauTrajetId?: string
  nouveauLibelle: string
}

/** Fiche de débriefing d'un voyage. */
export interface FicheDebriefing {
  numeroBon: string
  dateChargement: string
  dateDechargement: string
  lieu: string
  vehicule: string
  citerne: string
  gainOuCoulage: string
  observations: string
  enregistreeLe: string
  enregistreePar: string
}

/** Facture d'un transporteur externe, contrôlée face au tarif convenu. */
export interface FactureTransporteur {
  reference: string
  montantFacture: number
  saisieLe: string
  saisiePar: string
  statut: 'a_controler' | 'validee' | 'refusee'
  motifRefus?: string
  decideeLe?: string
  decideePar?: string
  /** Validée sans grille tarifaire applicable, par un rôle habilité : le motif. */
  motifValidationSansTarif?: string
}

export type TypeNotificationClient = 'planification' | 'demarrage' | 'livraison' | 'annulation' | 'hors_tournee' | 'date_proposee'

export interface NotificationClient {
  id: string
  type: TypeNotificationClient
  canal: 'sms' | 'email'
  envoyeeLe: string
  contenu: string
  /** Numéro ou adresse e-mail utilisé, repris de la commande ou de la fiche client. */
  a?: string
  /** Non envoyée : aucune coordonnée pour ce canal ; le planificateur le voit dans la fiche de l'ordre. */
  nonEnvoyee?: boolean
}

/** Un article d'une ligne de livraison : une ligne peut en compter plusieurs,
 *  et chacun a son propre sort - le premier peut être livré pendant que le
 *  deuxième présente une anomalie. */
export interface ArticleLigne {
  id: string
  libelle: string
  statut?: 'livre' | 'non_livre'
  motif?: string
}

export interface BonLivraisonElectronique {
  reference: string
  emisLe: string
  destinataire: string
  adresse: string
  produit: string
  /** Nom du client qui a confirmé la réception depuis son espace de suivi.
   *  Vide tant que seul le chauffeur a déclaré la livraison. */
  signePar?: string
  /** Articles de la ligne qui n'ont pas pu être livrés, avec le motif : la
   *  livraison est alors partielle. */
  articlesNonLivres?: { libelle: string; motif: string }[]
  /** Quantité reçue déclarée, que la confirmation du client atteste. */
  quantiteRecue?: number
  /** Carburant : volumes dépotés, compartiment par compartiment. */
  volumes?: MesureCompartiment[]
}

export interface Trajet {
  id: string
  code: string
  libelle: string
  recurrent: boolean
  clientNom: string
  statut: 'actif' | 'archive'
  distanceEstimeeKm: number
  dureeEstimeeMin: number
  etapes: Omit<EtapeVoyage, 'franchi'>[]
}

export type TypeDocVoyage = 'ordre_transport' | 'bon_chargement' | 'feuille_route' | 'bon_livraison' | 'note_reserve'

export interface DocumentVoyage {
  id: string
  voyageId: string
  type: TypeDocVoyage
  numero?: string
  emetteur?: string
  date?: string
  obligatoire: boolean
  present: boolean
}

export interface Marchandise {
  typeProduit: string
  nombreCartons: number
  poidsChargeKg: number
  poidsDechargeKg?: number
}

/** Une commande de transport, enregistrée dès qu'elle arrive, avant tout
 *  rattachement à un chargement : un destinataire, une adresse, un contenu,
 *  une date souhaitée. Elle attend, seule, d'être regroupée avec d'autres
 *  dans un chargement au moment de composer une tournée. */
export interface Commande {
  id: string
  destinataire: string
  adresseLivraison: string
  lat: number
  lng: number
  /** Un site interne, pour un transfert plutôt qu'une livraison client. */
  siteId?: string
  contenu: string
  poidsKg: number
  volumeM3?: number
  dateSouhaitee: string
  /** Date au-delà de laquelle la commande, non exécutée, est expirée ;
   *  à défaut, la date souhaitée. Le comportement (alerte ou blocage) se règle. */
  dateValidite?: string
  /** Canal des notifications pour cette commande ; par défaut celui de la
   *  fiche client, précisable ici (livraison chez un tiers, par exemple). */
  canalNotification?: 'sms' | 'email' | 'sms_email'
  /** Téléphone et e-mail du destinataire pour cette commande (livraison chez
   *  un tiers, par exemple) ; à défaut, ceux de la fiche client. */
  telephoneDestinataire?: string
  emailDestinataire?: string
  /** Commande répartie en parts : contenu, nombre d'unités et poids de la commande entière, d'où se recalcule le contenu de chaque part. */
  contenuInitial?: string
  unitesInitiales?: number
  poidsInitial?: number
  /** Nombre d'unités à livrer (cartons, colis, palettes... selon le
   *  paramétrage de l'entreprise). */
  nombreUnites?: number
  /** Référence de la commande dans le système de gestion commerciale de
   *  l'entreprise (par exemple le numéro de bon de livraison). Son libellé
   *  et son caractère obligatoire se paramètrent. */
  referenceExterne?: string
  commentaire?: string
  /** Qui a émis la demande de livraison, et comment elle est arrivée. */
  emisPar?: string
  emisParRole?: string
  origine?: 'demande' | 'systeme_externe' | 'planificateur'
  /** Client qui confie ses marchandises à l'entreprise pour cette expédition ;
   *  vide : marchandises de l'entreprise elle-même. */
  ordonnateurExterne?: string
  /** Qui paie le fret : l'ordonnateur ou le destinataire (par défaut, le réglage de la planification). */
  fretALaCharge?: 'ordonnateur' | 'destinataire'
  /** en_attente : attend un ordre ; affectee : dans un ordre ;
   *  rejetee : renvoyée à l'émetteur avec un motif, modifiable puis
   *  renvoyable ; annulee : retirée par son émetteur. */
  statut: 'en_attente' | 'affectee' | 'rejetee' | 'annulee'
  motifRejet?: string
  rejeteeLe?: string
  rejeteePar?: string
  motifAnnulation?: string
  annuleeLe?: string
  /** Renseigné une fois la commande affectée à un ordre de transport. */
  voyageId?: string
  createdAt: string
  /** Réponse de l'ordonnateur à l'enquête sur l'exécution de sa demande,
   *  distincte de celle du destinataire. */
  enqueteOrdonnateur?: EnqueteOrdonnateur
  /** Produit transporté (référentiel des produits). */
  produit?: string
  /** Carburant : volume commandé en litres, dépôt de chargement, pompe exigée et mode de livraison. */
  volumeL?: number
  depotId?: string
  pompeExigee?: boolean
  /** Livrée par camion (passe par la planification) ou enlevée directement par le client (n'y passe pas). */
  modeLivraison?: 'camion' | 'enlevement_client'
  /** Région du lieu de livraison ; à défaut, celle du site le plus proche. */
  region?: string
  /** Commande répartie en plusieurs parts (plusieurs camions) : identifiant de la
   *  commande d'origine. Chaque part garde la même référence et a sa propre
   *  livraison ; absent pour une commande entière ou pour la commande d'origine. */
  partDe?: string
}

/** Notes de 1 à 5 données par l'ordonnateur une fois l'expédition terminée. */
export interface EnqueteOrdonnateur {
  respectOrdre: number
  delais: number
  qualite: number
  commentaire?: string
  reponduLe: string
  reponduPar: string
}

export interface Voyage {
  id: string
  reference: string
  numeroOT?: string
  statut: StatutVoyage
  clientNom: string
  toleranceEcartPoidsPourcent: number
  trajetId?: string
  trajetLibelle?: string
  etapes: EtapeVoyage[]
  origine: string
  destination: string
  vehiculeId?: string
  vehiculePlaque?: string
  semiRemorqueId?: string
  semiRemorquePlaque?: string
  chauffeurId?: string
  chauffeurNom?: string
  datePlanifiee: string
  dateDepartReel?: string
  dateArriveeReelle?: string
  kmReference: number
  kmDepart?: number
  kmArrivee?: number
  marchandise: Marchandise
  createdAt: string
  /** Renseigné quand le planificateur ou le responsable annule la
   *  tournée : jamais une action du chauffeur, à aucun moment. */
  annuleLe?: string
  motifAnnulation?: string
  /** Double contrôle du chargement, entre Confirmé et Prêt pour
   *  exécution : l'entrepôt déclare avoir chargé, puis le chauffeur
   *  contrôle et valide à son tour que ce qui a été chargé correspond
   *  à ce qui doit l'être - un partage de responsabilité, ni l'un ni
   *  l'autre ne suffisant seul. */
  chargementEntrepotLe?: string
  chargementChauffeurLe?: string
  /** Certains clients n'exigent pas d'être appelés avant chargement :
   *  l'étape de confirmation reste possible pour tous, mais peut être
   *  désactivée tournée par tournée. Vrai par défaut. */
  confirmationRequise?: boolean
  /** Ordre créé automatiquement pour regrouper des lignes replanifiées à une
   *  même date : les lignes replanifiées au même jour s'y ajoutent au lieu de
   *  créer chacune un ordre d'une seule ligne. */
  creeParReplanification?: boolean
  /** Ordres d'origine des lignes reprises dans cet ordre de replanification. */
  replanifieDepuis?: string[]
  /** Notifications envoyées au chauffeur affecté (tournée confiée, annulée). */
  notificationsChauffeur?: { le: string; message: string; /** Conducteur visé quand ce n'est pas celui de l'ordre (conducteur retiré). */ chauffeurId?: string }[]
  /** Moyens de l'expédition : nos véhicules, ou un transporteur externe. */
  moyen?: 'propres' | 'externe'
  transporteurId?: string
  transporteurNom?: string
  vehiculeTransporteurId?: string
  vehiculeTransporteurPlaque?: string
  conducteurTransporteurId?: string
  conducteurTransporteurNom?: string
  /** Mode de transport (liste paramétrée). */
  modeTransport?: string
  /** Plan de trajet prévisionnel repris du trajet de référence rattaché. */
  planTrajet?: PointPlanTrajet[]
  historiqueItineraire?: ModificationItineraire[]
  planifieLe?: string
  confirmeLe?: string
  clotureLe?: string
  codeMotifAnnulation?: string
  debriefing?: FicheDebriefing
  factureTransporteur?: FactureTransporteur
  /** Tournée de carburant : dépôt, validité, région, camions, plan de chargement et bons. */
  carburant?: TourneeCarburant
}

/* ── Écarts d'itinéraire (Flotte · Conformité) ────────────────
 * Repris du module Conformité du socle FMS (en réalité nommé « Écarts » dans
 * leur propre code : la « Conformité » du menu pointe vers cet écran).
 * Un écart naît toujours à qualifier : le système mesure, il ne présume
 * jamais d'une intention. */

export type TypeEcart = 'sortie_trajet' | 'arret_non_planifie' | 'point_passage_manque' | 'ecart_kilometrique' | 'fenetre_horaire'
  | 'ordre_passage' | 'temps_trajet' | 'repos_hors_parking'
  | 'conduite_continue' | 'conduite_journaliere' | 'travail_journalier' | 'repos_hebdomadaire' | 'conduite_nuit'
export type GraviteEcart = 'mineur' | 'majeur' | 'critique'
export type NatureEcart = 'a_qualifier' | 'autorisee' | 'subie' | 'non_justifiee'
export type DecisionEcart = 'classe' | 'avertissement' | 'sanction'

export interface EcartItineraire {
  id: string
  voyageId: string
  voyageRef: string
  vehiculeId?: string
  vehiculePlaque: string
  chauffeurId?: string
  chauffeurNom?: string
  trajetLibelle?: string
  type: TypeEcart
  gravite: GraviteEcart
  nature: NatureEcart
  detecteLe: string
  dureeMin?: number
  distanceKm?: number
  ecartLateralMaxM?: number
  lat: number
  lng: number
  lieu?: string
  /** Étapes du voyage concernées (point manqué, ordre de passage). */
  etapeIds?: string[]
  /** Écart constaté par la télématique, encore en cours tant que finLe est vide. */
  source?: 'telematique' | 'saisie'
  finLe?: string
  justificationChauffeur?: string
  justifieLe?: string
  qualifiePar?: string
  qualifieLe?: string
  motifQualification?: string
  decision?: DecisionEcart
}

/* ── Carburant (Flotte · Exploitation) ────────────────────────
 * Méthode plein à plein, sans capteur de niveau. */

/** Mode de saisie, déduit du contexte : bureau, espace du chauffeur, import d'un fichier, transaction de carte. */
export type CanalRecharge = 'manuelle' | 'mobile' | 'import' | 'carte'
/** Un plein se qualifie seulement : la retenue passe par l'écart de consommation. */
export type StatutRecharge = 'valide' | 'anomalie' | 'qualifie'
/** Identifiant d'une cause d'écart, définie dans Configuration, onglet Carburant. */
export type QualifEcartCarburant = string

export interface ControleVraisemblance {
  code: string
  libelle: string
  ok: boolean
  detail: string
}

export interface RechargeCarburant {
  id: string
  date: string
  vehiculeId: string
  vehiculePlaque: string
  chauffeurId?: string
  chauffeurNom?: string
  voyageId?: string
  voyageRef?: string
  litres: number
  prixLitre: number
  montant: number
  odometre: number
  pleinComplet: boolean
  lieu: string
  lat: number
  lng: number
  positionVehicule?: { lat: number; lng: number; ecartKm: number }
  canal: CanalRecharge
  controles: ControleVraisemblance[]
  statut: StatutRecharge
  qualification?: QualifEcartCarburant
  commentaire?: string
  /** Reçu de la station, photographié depuis le téléphone ou joint au bureau. */
  recu?: { nom: string; dataUrl?: string }
  /** Transaction de carte carburant rapprochée de ce plein. */
  transactionId?: string
  saisiPar?: string
  saisiLe?: string
}

export interface PeriodeConso {
  vehiculeId: string
  vehiculePlaque: string
  du: string
  au: string
  litres: number
  km: number
  litresPour100km: number
  refConso: number
  ecartPct: number
  chauffeurNom?: string
  /** Clé stable de la période (véhicule, premier et dernier plein). */
  id?: string
  chauffeurId?: string
  trajetId?: string
  trajetLibelle?: string
  /** Origine de la référence retenue : véhicule sur le corridor, corridor, véhicule seul, ou défaut. */
  origineRef?: 'vehicule_corridor' | 'corridor' | 'vehicule' | 'defaut'
}

/* ── Sites (Flotte · référentiel géographique) ────────────────
 * Repris du store sites du socle FMS, adapté au réseau réel d'UCODIS déjà
 * établi (dépôt Tanjombato, corridor RN2, RN7, RN4). */

/** Libellé d'un type de site du référentiel paramétrable (store typesSites). */
export type TypeSiteReseau = string
export type VoletTrajet = 'aller' | 'retour'

export interface SiteReseau {
  id: string
  code: string
  nom: string
  type: TypeSiteReseau
  lat: number
  lng: number
  ville: string
  region?: string
  adresse?: string
  /** Rayon de la zone de géorepérage ; à défaut, le rayon de validation des passages. */
  rayonM?: number
  actif: boolean
  /** Dépôt ou site qui appartient à un tiers : son nom. Vide, le site est à l'entreprise. */
  proprietaireTiers?: string
  /** Adresse e-mail du site (un dépôt y reçoit ses bons d'enlèvement). */
  email?: string
  /** Client à qui appartient ce site de livraison (référentiel des clients) ; vide, le site n'est pas celui d'un client. */
  clientId?: string
}

/* ── État de flotte, Contrôles, Départs, Assurances (Flotte) ──
 * Repris à la lettre des documents de référence du socle FMS (courriels
 * « ÉTAT FLOTTE », formulaire « Checklist sur Route » v4, projet
 * Control Room). Les treize codes d'état, les seize points de
 * contrôle et les quatre contrôles de départ sont conservés tels
 * quels : ce sont des vocabulaires de travail, pas des équipements ;
 * rien n'empêche de les reprendre pour UCODIS en attendant que ses
 * propres formulaires soient fournis. */

export type GroupeEtatFlotte = 'operationnel' | 'transit' | 'attente' | 'immobilise'
export type CodeEtatFlotte =
  | 'DEP-PRV' | 'DEP-REA' | 'RET-VID' | 'RET-CHG' | 'ANN-VYG'
  | 'TR-LIV' | 'TR-CHG' | 'TR-VID' | 'TR-RET'
  | 'ATT-CHG' | 'ATT-LIV' | 'ATT-DEP' | 'ATT-ADM' | 'IMMO' | 'DISP'

export interface LigneEtatFlotte {
  vehiculeId: string
  vehiculePlaque: string
  semiRemorquePlaque?: string
  chauffeurNom?: string
  etat: CodeEtatFlotte
  codeIndispo?: string
  motifIndispo?: string
  remiseEnServicePrevue?: string
  voyageRef?: string
  observation?: string
  /** Lieu lisible : dernière position du boîtier, ou site de rattachement sans boîtier. */
  position?: string
  /** Produit transporté ou mission en cours. */
  mission?: string
}

export interface PointChecklistRoute { code: string; libelle: string; actif?: boolean }
export type ResultatPoint = 'conforme' | 'anomalie' | 'non_verifie'

export interface ReleveChecklist {
  pause: number
  horodatage: string
  lieu?: string
  resultats: Record<string, ResultatPoint>
  commentaire?: string
  /** Commentaire par point, obligatoire sur une anomalie. */
  commentaires?: Record<string, string>
  /** Libellés des points au moment du relevé, pour un historique lisible. */
  libelles?: Record<string, string>
  /** Ordres de travail ouverts sur une anomalie, par point. */
  ordresTravail?: Record<string, string>
  /** Saisi sans réseau puis synchronisé. */
  saisiHorsLigneLe?: string
}

export interface ChecklistRoute {
  id: string
  reference: string
  voyageId?: string
  voyageRef?: string
  vehiculeId: string
  tracteurPlaque: string
  semiRemorquePlaque?: string
  chauffeurId?: string
  chauffeurNom: string
  dateDebut: string
  dateFin?: string
  releves: ReleveChecklist[]
  signeParChauffeur: boolean
  /** Date et heure de la dernière signature (enregistrement depuis l'espace du conducteur). */
  signeLe?: string
  synchroniseLe?: string
}

/* ── Audits de conformité (Contrôles, seconde vue) ─────────────
 * Repris du classeur « base gestion véhicule et maintenance » du socle
 * FMS, postes codés. Les points propres aux matières dangereuses
 * (panneaux orange, plaques-étiquettes) sont retirés : UCODIS
 * transporte du fret sec, pas de produits réglementés ADR. */
export interface PosteAudit { code: string; categorie: string; libelle: string; actif?: boolean }

export type VerdictPoste = 'conforme' | 'conforme_observation' | 'non_conforme'

export interface ResultatPoste { code: string; verdict: VerdictPoste; observation?: string }

export interface AuditConformite {
  id: string
  reference: string
  vehiculeId: string
  tracteurPlaque: string
  semiRemorquePlaque?: string
  date: string
  auditeur: string
  resultats: ResultatPoste[]
  contreVisiteLe?: string
  conforme: boolean
  commentaire?: string
  /** Rapport daté et signé (FMS-MA-10). */
  signataire?: string
  signeLe?: string
  /** Libellés de la grille au moment de l'inspection. */
  libelles?: Record<string, { categorie: string; libelle: string }>
  /** Inspection dont celle-ci est la contre-visite. */
  contreVisiteDe?: string
  /** Contre-visite qui a levé la non-conformité. */
  leveeParId?: string
  ordreTravailId?: string
}

export type ControleDepart = 'checklist' | 'documents_chauffeur' | 'documents_vehicule' | 'repos' | 'vehicule' | 'conducteur'

export interface ResultatControleDepart {
  controle: ControleDepart
  conforme: boolean
  detail?: string
  /** Contrôle du conducteur paramétré : code, libellé et caractère bloquant
   *  figés au moment de la décision. */
  code?: string
  libelle?: string
  bloquant?: boolean
  /** Faux tant que la personne qui délivre n'a pas coché le contrôle. */
  renseigne?: boolean
}

/** Contrôle du conducteur avant départ, paramétré dans Configuration > Sécurité. */
export interface ControleConducteurDepart { code: string; libelle: string; bloquant: boolean; actif: boolean }
/** Résultat coché sur la fiche d'autorisation pour un contrôle du conducteur. */
export interface SaisieControleConducteur { conforme: boolean; commentaire?: string; par?: string; le?: string }

export interface AutorisationDepart {
  id: string
  reference: string
  voyageId?: string
  voyageRef?: string
  vehiculeId: string
  vehiculePlaque: string
  chauffeurId?: string
  chauffeurNom: string
  demandeeLe: string
  controles: ResultatControleDepart[]
  /** Checklist des 16 points, remplie directement depuis cette fiche avant
   *  de valider le contrôle « Checklist véhicule conforme ». Absente tant
   *  qu'elle n'a pas été réalisée. */
  checklistDepart?: Record<string, boolean>
  checklistValideeLe?: string
  accordee: boolean
  decidePar?: string
  decideLe?: string
  motifRefus?: string
  suiviActiveLe?: string
  /** Caméra du véhicule activée à la délivrance, quand il en est équipé. */
  cameraActiveeLe?: string
  demandeePar?: string
  /** Contrôles du conducteur cochés par la personne qui délivre, par code. */
  saisiesConducteur?: Record<string, SaisieControleConducteur>
}

export type StatutPolice = 'active' | 'expiree' | 'resiliee'

export interface PoliceAssurance {
  id: string
  vehiculeId: string
  vehiculePlaque: string
  /** Assureur, choisi parmi les prestataires assureurs autorisés. */
  assureurId?: string
  compagnie: string
  numeroPolice: string
  couverture: string
  dateDebut: string
  dateEcheance: string
  primeAnnuelleAr?: number
  franchiseAr?: number
  statut: StatutPolice
}

export type GraviteSinistre = 'materiel_leger' | 'materiel_lourd' | 'corporel' | 'environnemental'
export type StatutIndemnisation = 'non_declare' | 'declare' | 'expertise' | 'accepte' | 'refuse' | 'regle'

export interface Sinistre {
  id: string
  reference: string
  vehiculeId: string
  vehiculePlaque: string
  date: string
  lieu: string
  circonstances: string
  gravite: GraviteSinistre
  chauffeurId?: string
  chauffeurNom?: string
  tiersImpliques?: string
  montantDommagesAr?: number
  statutIndemnisation: StatutIndemnisation
  montantIndemniseAr?: number
  policeId?: string
  kilometrage?: number
  responsabiliteEntreprise?: boolean
  ordreTravailRef?: string
  /** Accident (avec dommages) ou incident (sans dommage, mais à analyser). */
  nature?: 'accident' | 'incident'
  photos?: PieceJointe[]
  /** Suite disciplinaire décidée pour le conducteur, le cas échéant. */
  sanction?: string
  analyse?: string
  statutDossier?: 'ouvert' | 'clos'
  clotureLe?: string
  declarePar?: string
  historique?: { le: string; par: string; action: string }[]
}
