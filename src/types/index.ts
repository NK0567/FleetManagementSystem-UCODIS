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

export type StatutPersonnel = 'actif' | 'conge' | 'suspendu' | 'archive'
export type TypeContrat = 'CDI' | 'CDD' | 'Journalier' | 'Stage'

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
}

/* ── Documents du personnel ───────────────────────────────────── */

export type TypeDocument =
  | 'permis'
  | 'visite_medicale'
  | 'cin'
  | 'contrat'
  | 'formation'
  | 'certification'

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

export type TypeVehicule = 'tracteur' | 'semi_remorque'
export type StatutVehicule = 'actif' | 'affecte' | 'reparation' | 'hors_service' | 'vendu'

export interface Vehicule {
  id: string
  immatriculation: string
  vin: string
  type: TypeVehicule
  marque: string
  modele: string
  categorie: string
  carburant: string
  chargeMaxKg?: number
  site: string
  statut: StatutVehicule
  motifIndisponibilite?: string
  kilometrage: number
  annee?: number
  dateMiseEnCirculation?: string
  modeAcquisition?: 'achat' | 'location' | 'leasing'
  coutAcquisitionAr?: number
  valeurResiduelleAr?: number
  sortie?: { motif: string; date: string; par: string; kilometrageSortie?: number; commentaire?: string }
}

/** Équipements embarqués repris du référentiel du socle FMS, en retenant
 *  seulement ce qui s'applique à un transport de fret sec : le boîtier
 *  embarqué, la balise GPS et le détecteur de fatigue. Les caméras dôme
 *  et vanne du référentiel surveillent une citerne d'hydrocarbures ; elles
 *  n'ont pas d'équivalent chez UCODIS. */
export type TypeEquipement = 'obc' | 'gps' | 'dms'
export type EtatEquipement = 'operationnel' | 'hors_service' | 'desinstalle'
export interface EquipementEmbarque {
  id: string
  vehiculeId: string
  type: TypeEquipement
  numeroSerie?: string
  etat: EtatEquipement
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

export type StatutVoyage = 'en_attente' | 'planifie' | 'affecte' | 'en_cours' | 'livre' | 'cloture' | 'litige' | 'annule'
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
  franchi: boolean
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

export interface ArretReleve {
  id: string
  voyageId: string
  debut: string
  fin: string
  dureeMin: number
  lat: number
  lng: number
  lieu: string
  dansSiteDeclare: boolean
  justifie: boolean
  motif?: string
}

export interface Marchandise {
  typeProduit: string
  nombreCartons: number
  poidsChargeKg: number
  poidsDechargeKg?: number
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
  nbEcarts: number
  nbArretsNonJustifies: number
  createdAt: string
  /** Renseigné quand le chauffeur refuse l'ordre de transport depuis son espace. */
  refuseLe?: string
  motifRefus?: string
}

/* ── Écarts d'itinéraire (Flotte · Conformité) ────────────────
 * Repris du module Conformité du socle FMS (en réalité nommé « Écarts » dans
 * leur propre code : la « Conformité » du menu pointe vers cet écran).
 * Un écart naît toujours à qualifier : le système mesure, il ne présume
 * jamais d'une intention. */

export type TypeEcart = 'sortie_trajet' | 'arret_non_planifie' | 'point_passage_manque' | 'ecart_kilometrique' | 'fenetre_horaire'
export type GraviteEcart = 'mineur' | 'majeur' | 'critique'
export type NatureEcart = 'a_qualifier' | 'autorisee' | 'subie' | 'non_justifiee'
export type DecisionEcart = 'classe' | 'avertissement' | 'sanction'

export interface EcartItineraire {
  id: string
  voyageId: string
  voyageRef: string
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
  justificationChauffeur?: string
  justifieLe?: string
  qualifiePar?: string
  qualifieLe?: string
  motifQualification?: string
  decision?: DecisionEcart
}

/* ── Carburant (Flotte · Exploitation) ────────────────────────
 * Repris du module Carburant du socle FMS : méthode plein-à-plein, sans
 * capteur · exactement la situation d'UCODIS. Le recoupement par position
 * GPS est retiré : aucun prestataire de ce type n'est nommé dans les
 * documents UCODIS. */

export type CanalRecharge = 'mobile' | 'import' | 'regularisation'
export type StatutRecharge = 'valide' | 'anomalie' | 'en_qualification' | 'qualifie' | 'en_validation' | 'refacture' | 'classe'
export type QualifEcartCarburant = 'technique' | 'conduite' | 'prelevement' | 'saisie'

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
  nombreBons?: number
  litresParBon?: number
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
  montantRefacture?: number
  validation?: { valideur: string; role: string; decision: 'approuve' | 'rejete'; date: string; commentaire?: string }
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
}

/* ── Sites (Flotte · référentiel géographique) ────────────────
 * Repris du store sites du socle FMS, adapté au réseau réel d'UCODIS déjà
 * établi (dépôt Tanjombato, corridor RN2, RN7, RN4). */

export type TypeSiteReseau = 'Dépôt' | 'Entrepôt client' | 'Zone à risque' | 'Point de contrôle' | 'Relais'
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
  actif: boolean
}

/* ── État de flotte, Contrôles, Départs, Assurances (Flotte) ──
 * Repris à la lettre des documents de référence du socle FMS (courriels
 * « ÉTAT FLOTTE », formulaire « Checklist sur Route » v4, projet
 * Control Room). Les treize codes d'état, les seize points de
 * contrôle et les quatre contrôles de départ sont conservés tels
 * quels : ce sont des vocabulaires de travail, pas des équipements ;
 * rien n'empêche de les reprendre pour UCODIS en attendant que ses
 * propres formulaires soient fournis. */

export type GroupeEtatFlotte = 'operationnel' | 'transit' | 'attente'
export type CodeEtatFlotte =
  | 'DEP-PRV' | 'DEP-REA' | 'RET-VID' | 'RET-CHG' | 'ANN-VYG'
  | 'TR-LIV' | 'TR-CHG' | 'TR-VID' | 'TR-RET'
  | 'ATT-CHG' | 'ATT-LIV' | 'ATT-DEP' | 'ATT-ADM'

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
}

export interface PointChecklistRoute { code: string; libelle: string }
export type ResultatPoint = 'conforme' | 'anomalie' | 'non_verifie'

export interface ReleveChecklist {
  pause: number
  horodatage: string
  lieu?: string
  resultats: Record<string, ResultatPoint>
  commentaire?: string
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
  synchroniseLe?: string
}

/* ── Audits de conformité (Contrôles, seconde vue) ─────────────
 * Repris du classeur « base gestion véhicule et maintenance » du socle
 * FMS, postes codés. Les points propres aux matières dangereuses
 * (panneaux orange, plaques-étiquettes) sont retirés : UCODIS
 * transporte du fret sec, pas de produits réglementés ADR. */
export interface PosteAudit { code: string; categorie: string; libelle: string }

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
}

export type ControleDepart = 'checklist' | 'alcool_drogue' | 'documents_chauffeur' | 'documents_vehicule'

export interface ResultatControleDepart { controle: ControleDepart; conforme: boolean; detail?: string }

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
  briefingSecuriteFait?: boolean
  reposHebdoVerifie?: boolean
  suiviActiveLe?: string
}

export type StatutPolice = 'active' | 'expiree' | 'resiliee'

export interface PoliceAssurance {
  id: string
  vehiculeId: string
  vehiculePlaque: string
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
  responsabiliteUcodis?: boolean
  ordreTravailRef?: string
}
