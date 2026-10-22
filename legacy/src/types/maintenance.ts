import { reactive } from 'vue'
/* ══════════════════════════════════════════════════════════════
   MODULE MAINTENANCE ET INTERVENTIONS
   ══════════════════════════════════════════════════════════════
   Référentiel générique à tout poids lourd : nomenclature ISO 14224
   (système, sous-système, mode de défaillance), cinq causes racines,
   codes d'indisponibilité par famille. Chaque liste n'est qu'un point de
   départ : l'entreprise la tient elle-même dans le paramétrage.
   ══════════════════════════════════════════════════════════════ */

/* ── Nomenclature ISO 14224 : cinq systèmes, onze sous-systèmes, dont
      la citerne et ses équipements de chargement ───────────────── */
/** Code de système : niveau le plus haut de la nomenclature. */
export type Systeme = string

export const LIB_SYSTEME: Record<Systeme, string> = reactive({
  groupe_motopropulseur: 'Groupe motopropulseur',
  liaison_sol:           'Freinage et liaison au sol',
  electricite:           'Équipement électrique',
  structure:             'Structure et carrosserie',
  chargement:            'Équipement de chargement',
})

/** Code de sous-système : la liste se tient dans le paramétrage,
 *  celle-ci n'est que la nomenclature proposée au départ. */
export type SousSysteme = string

export const LIB_SOUS_SYSTEME: Record<SousSysteme, string> = reactive({
  moteur:               'Moteur',
  transmission:         'Transmission',
  circuit_air:          "Circuit d'air",
  circuit_carburant:    'Circuit carburant',
  freinage:             'Freinage',
  electricite:          'Électricité et électronique',
  direction_suspension: 'Direction et suspension',
  roues_roulements:     'Roues et roulements',
  chassis_tolerie:      'Châssis et tôlerie',
  citerne:              'Citerne et équipements de chargement',
  refroidissement:      'Refroidissement',
})

/** Système de rattachement de chaque sous-système de départ. */
export const SYSTEME_PAR_SOUS_SYSTEME: Record<SousSysteme, Systeme> = {
  moteur:               'groupe_motopropulseur',
  transmission:         'groupe_motopropulseur',
  circuit_air:          'groupe_motopropulseur',
  circuit_carburant:    'groupe_motopropulseur',
  refroidissement:      'groupe_motopropulseur',
  freinage:             'liaison_sol',
  direction_suspension: 'liaison_sol',
  roues_roulements:     'liaison_sol',
  electricite:          'electricite',
  chassis_tolerie:      'structure',
  citerne:              'chargement',
}

/* ── Les huit modes de défaillance, génériques ───────────────── */
export type ModeDefaillance = string

export const LIB_MODE_DEFAILLANCE: Record<ModeDefaillance, string> = reactive({
  fuite:                  'Fuite',
  blocage:                'Blocage',
  rupture:                'Rupture',
  perte_puissance:        'Perte de puissance',
  surchauffe:             'Surchauffe',
  defaillance_electrique: 'Défaillance électrique',
  usure_excessive:        'Usure excessive',
  non_fonctionnel:        'Non fonctionnel',
})

/* ── Les cinq causes racines (méthode RCM), génériques ───────── */
export type CauseRacine = string

export const LIB_CAUSE_RACINE: Record<CauseRacine, string> = reactive({
  conception:               'Défaut de conception',
  fournisseur:              'Défaut fournisseur',
  erreur_humaine:           'Erreur humaine',
  environnement:            'Conditions environnementales',
  maintenance_insuffisante: 'Maintenance insuffisante',
})

/* ══════════════════════════════════════════════════════════════
   Codes d'indisponibilité : quatre familles, et une liste de départ
   générique que chaque entreprise adapte dans le paramétrage.
   ══════════════════════════════════════════════════════════════ */
export type FamilleIndispo = 'technique' | 'reglementaire' | 'administrative' | 'humaine'

export const LIB_FAMILLE_INDISPO: Record<FamilleIndispo, string> = {
  technique:      'Technique',
  reglementaire:  'Réglementaire',
  administrative: 'Administrative',
  humaine:        'Humaine',
}

/** Code d'indisponibilité : librement défini par chaque entreprise dans le
 *  paramétrage (store codificationIndispo) ; CODES_INDISPO n'est que la
 *  liste proposée au départ. */
export type CodeIndispo = string

export interface DefinitionIndispo {
  code: CodeIndispo
  famille: FamilleIndispo
  libelle: string
}

export const CODES_INDISPO: DefinitionIndispo[] = [
  { code: 'PNN', famille: 'technique',      libelle: 'Panne' },
  { code: 'MTN', famille: 'technique',      libelle: 'Entretien planifié' },
  { code: 'ATP', famille: 'technique',      libelle: 'Attente de pièce' },
  { code: 'EDP', famille: 'technique',      libelle: 'Entretien dépassé' },
  { code: 'ACC', famille: 'technique',      libelle: 'Accident' },
  { code: 'VIS', famille: 'reglementaire',  libelle: 'Visite technique' },
  { code: 'CTV', famille: 'reglementaire',  libelle: 'Contre-visite' },
  { code: 'DOC', famille: 'reglementaire',  libelle: 'Document obligatoire expiré' },
  { code: 'ADM', famille: 'administrative', libelle: 'Démarche administrative en cours' },
  { code: 'ABS', famille: 'humaine',        libelle: 'Absence de conducteur' },
]

export const familleDuCode = (c: CodeIndispo): FamilleIndispo =>
  CODES_INDISPO.find(x => x.code === c)?.famille ?? 'technique'

export const libelleDuCode = (c: CodeIndispo): string =>
  CODES_INDISPO.find(x => x.code === c)?.libelle ?? c

export interface Indisponibilite {
  id: string
  vehiculeId: string
  vehiculePlaque: string
  code: CodeIndispo
  famille: FamilleIndispo
  debut: string
  fin?: string
  dureeJours?: number
  ordreTravailId?: string
  /** Autres ordres ouverts sur le même véhicule pendant cette indisponibilité :
   *  elle ne se referme qu'à la clôture du dernier. */
  autresOrdres?: string[]
  commentaire?: string
  /** Ouverte par le système (entretien dépassé, inspection non conforme
   *  en attente de contre-visite) : elle se lève seule quand la situation disparaît. */
  auto?: 'entretienDepasse' | 'inspectionNonConforme'
}

/* ══════════════════════════════════════════════════════════════
   Ordre de travail
   ══════════════════════════════════════════════════════════════ */
export type StatutOT =
  | 'ouvert' | 'diagnostique' | 'attente_piece' | 'en_cours'
  | 'attente_validation' | 'cloture' | 'annule'

export const LIB_STATUT_OT: Record<StatutOT, string> = {
  ouvert:             'Ouvert',
  diagnostique:       'Diagnostiqué',
  attente_piece:      'En attente de pièce',
  en_cours:           'En cours',
  attente_validation: 'À valider',
  cloture:            'Clôturé',
  annule:             'Annulé',
}

export type OrigineOT =
  | 'remontee_chauffeur' | 'checklist' | 'alerte_preventive' | 'constat_garage' | 'equipe_mobile' | 'telematique'

export const LIB_ORIGINE_OT: Record<OrigineOT, string> = {
  remontee_chauffeur: 'Remontée chauffeur',
  checklist:          'Anomalie de checklist',
  alerte_preventive:  'Échéance préventive',
  constat_garage:     'Constat au garage',
  equipe_mobile:      'Dépannage sur route',
  telematique:        'Défaut remonté par le véhicule',
}

export type TypeMaintenance = 'preventif' | 'correctif' | 'ameliorative'

export const LIB_TYPE_MAINTENANCE: Record<TypeMaintenance, string> = {
  preventif:    'Préventif',
  correctif:    'Correctif',
  ameliorative: 'Améliorative',
}

export type GraviteOT = 'mineure' | 'majeure' | 'critique'

export const LIB_GRAVITE_OT: Record<GraviteOT, { label: string; cls: string }> = {
  mineure:  { label: 'Mineure',  cls: 'bg-neutral-bg text-neutral' },
  majeure:  { label: 'Majeure',  cls: 'bg-warning-bg text-warning' },
  critique: { label: 'Critique', cls: 'bg-danger-bg text-danger' },
}

export interface PieceConsommee {
  id: string
  reference: string
  designation: string
  quantite: number
  prixUnitaireAr: number
  origine: 'stock' | 'achat'
  demandeAchatId?: string
  dateReception?: string
}

export type StatutAchat = 'demandee' | 'commandee' | 'receptionnee' | 'annulee'

export const LIB_STATUT_ACHAT: Record<StatutAchat, string> = {
  demandee:     'Demandée',
  commandee:    'Commandée',
  receptionnee: 'Réceptionnée',
  annulee:      'Annulée',
}

export interface DemandeAchat {
  id: string
  ordreTravailId: string
  reference: string
  designation: string
  quantite: number
  statut: StatutAchat
  fournisseur?: string
  numeroBonCommande?: string
  dateDemande: string
  dateCommande?: string
  dateReception?: string
  montantAr?: number
  delaiJours?: number
}

/** Temps passé par un technicien ; valorisé au tarif horaire de l'atelier. */
export interface TempsPasse {
  id: string
  mecanicienNom: string
  heures: number
  date: string
}

export interface PanneDiagnostiquee {
  id: string
  sousSysteme: SousSysteme
  modeDefaillance: ModeDefaillance
  causeRacine: CauseRacine
  gravite: GraviteOT
  observation?: string
}

export const MAX_PANNES_SIMULTANEES = 4

/** Compétences de l'atelier : une liste de départ, que chaque entreprise
 *  complète dans Paramètres de l'atelier (FMS-MA-12). */
export type CompetenceAtelier = string

export const LIB_COMPETENCE: Record<string, string> = {
  mecanique:   'Mécanique',
  electricite: 'Électricité',
  pneumatique: 'Pneumatique',
}

export type OrigineValeur = 'simulation' | 'client'

export interface CapaciteAtelier {
  origine: OrigineValeur
  justification?: string
  site: string
  postes: number | null
  heuresParJour: number | null
  joursOuvresParSemaine: number | null
}

export interface TarifMainOeuvre {
  origine: OrigineValeur
  justification?: string
  tarifUniqueAr: number | null
  parCompetence: Partial<Record<CompetenceAtelier, number>>
}

export interface CoutImmobilisation {
  origine: OrigineValeur
  justification?: string
  moyenJourAr: number | null
  tracteurJourAr: number | null
  semiRemorqueJourAr: number | null
}

export interface ParametresAtelier {
  capacite: CapaciteAtelier
  mainOeuvre: TarifMainOeuvre
  immobilisation: CoutImmobilisation
}

export const COMPETENCE_PAR_SOUS_SYSTEME: Record<SousSysteme, CompetenceAtelier> = {
  moteur:               'mecanique',
  transmission:         'mecanique',
  circuit_air:          'mecanique',
  circuit_carburant:    'mecanique',
  freinage:             'mecanique',
  electricite:          'electricite',
  direction_suspension: 'mecanique',
  roues_roulements:     'pneumatique',
  chassis_tolerie:      'mecanique',
  refroidissement:      'mecanique',
  citerne:              'mecanique',
}

export const PRIORITE_PAR_GRAVITE: Record<GraviteOT, number> = {
  critique: 1,
  majeure:  2,
  mineure:  3,
}

export interface OrdreTravail {
  id: string
  reference: string
  vehiculeId: string
  vehiculePlaque: string

  origine: OrigineOT
  declarePar: string
  declareLe: string
  symptome: string
  gravite: GraviteOT
  typeMaintenance: TypeMaintenance

  sousSysteme?: SousSysteme
  modeDefaillance?: ModeDefaillance
  causeRacine?: CauseRacine
  diagnostiquePar?: string
  diagnostiqueLe?: string
  pannes?: PanneDiagnostiquee[]

  statut: StatutOT
  mecaniciens: string[]
  pieces: PieceConsommee[]
  temps: TempsPasse[]
  travauxRealises?: string

  prestataire?: string
  montantDevisAr?: number
  sousGarantie?: boolean

  /** Opérations du plan d'entretien traitées par cet ordre (préventif) :
   *  leur dernier passage se met à jour à la clôture. */
  operationsPlan?: string[]

  /** Clôture en deux temps : fin déclarée, puis validation du responsable. */
  clotureLe?: string
  cloturePar?: string
  valideParResponsableLe?: string
  valideParResponsable?: string

  /** Intervention ancienne reprise par import : son coût global est connu,
   *  sans détail des pièces ni de la main-d'œuvre. */
  repriseHistorique?: boolean
  coutRepriseAr?: number

  coutPiecesAr?: number
  kilometrage?: number

  dureeEstimeeH?: number
  planifieeLe?: string

  /** Intervention confiée à un atelier externe : le FMS ne planifie pas son
   *  travail interne, il en suit l'exécution. Le montant final, connu au
   *  retour, remplace le devis dans le coût. */
  prestataireId?: string
  montantFinalAr?: number
  remiseAtelierLe?: string
  retourPrevuLe?: string
  retourLe?: string
  avancementExterne?: string
  /** Déclaration de fin d'intervention, préalable à la validation du
   *  responsable : par le technicien interne ou par l'atelier externe. */
  termineDeclarePar?: string
  termineDeclareLe?: string
}

/* ══════════════════════════════════════════════════════════════
   Plan d'entretien par marque et modèle
   ══════════════════════════════════════════════════════════════ */
export type NatureOperation = 'verifier' | 'lubrifier' | 'remplacer'

export const LIB_NATURE_OPERATION: Record<NatureOperation, string> = {
  verifier:  'Vérifier',
  lubrifier: 'Lubrifier',
  remplacer: 'Remplacer',
}

export interface OperationEntretien {
  id: string
  libelle: string
  sousSysteme: SousSysteme
  nature: NatureOperation
  intervalleKm?: number
  intervalleHeures?: number
  intervalleJours?: number
}

export interface PlanEntretien {
  id: string
  modele: string
  marque: string
  operations: OperationEntretien[]
  actif: boolean
  provisoire?: boolean
  source?: string
}

export interface EcheanceEntretien {
  vehiculeId: string
  vehiculePlaque: string
  operationId: string
  operationLibelle: string
  sousSysteme: SousSysteme
  nature: NatureOperation
  kmProchain?: number
  heuresProchain?: number
  dateProchaine?: string
  kmRestants?: number
  heuresRestantes?: number
  joursRestants?: number
  /** « a_renseigner » : le dernier passage n'est pas connu, l'échéance ne peut pas se calculer. */
  statut: 'a_venir' | 'proche' | 'depassee' | 'a_renseigner'
}

/* ══════════════════════════════════════════════════════════════
   Achats & stock de pièces
   ══════════════════════════════════════════════════════════════ */
export interface Fournisseur {
  id: string
  nom: string
  contact?: string
  telephone?: string
  delaiLivraisonJoursMoyen?: number
  actif: boolean
}

export interface ProduitStock {
  id: string
  reference: string
  designation: string
  sousSysteme?: SousSysteme
  fournisseurPrincipalId?: string
  prixUnitaireAr: number
  stockActuel: number
  seuilAlerte: number
}

export type TypeMouvementStock = 'entree' | 'sortie'

export interface MouvementStock {
  id: string
  produitId: string
  type: TypeMouvementStock
  quantite: number
  date: string
  motif: string
  ordreTravailId?: string
  vehiculePlaque?: string
  kilometrage?: number
  fournisseurId?: string
  numeroBonCommande?: string
  stockApres: number
}

/* ══════════════════════════════════════════════════════════════
   Équipe mobile : dépannage d'un camion bloqué sur la route
   ══════════════════════════════════════════════════════════════ */
/** Code d'un type de mission, paramétré dans Paramètres de l'atelier. */
export type TypeMissionMobile = string

/** Type de mission de l'équipe mobile ; une mission de contrôle compte les
 *  contrôles réalisés et les cas positifs. */
export interface TypeMissionMobileParam { code: string; libelle: string; actif: boolean; controle: boolean }

export const TYPES_MISSION_MOBILE_DEFAUT: TypeMissionMobileParam[] = [
  { code: 'depannage_mecanique', libelle: 'Dépannage mécanique', actif: true, controle: false },
  { code: 'depannage_electrique', libelle: 'Dépannage électrique', actif: true, controle: false },
  { code: 'securisation', libelle: 'Sécurisation', actif: true, controle: false },
  { code: 'controle_alcool_drogue', libelle: 'Contrôle alcool et drogue', actif: true, controle: true },
  { code: 'controle_clandestin', libelle: 'Détection de passagers clandestins', actif: true, controle: true },
  { code: 'surveillance_conduite', libelle: 'Surveillance du comportement de conduite', actif: true, controle: true },
]

export interface InterventionMobile {
  id: string
  reference: string
  type: TypeMissionMobile
  vehiculeId: string
  vehiculePlaque: string
  lieu: string
  lat?: number
  lng?: number
  /** Heure de départ de l'équipe. */
  declencheLe: string
  arriveeLe?: string
  clotureLe?: string
  equipe: string[]
  resolu: boolean
  ordreTravailId?: string
  observation?: string
  /** Mission de contrôle : nombre de contrôles réalisés et de cas positifs. */
  nbControles?: number
  nbPositifs?: number
  commentaireControles?: string
}
