/* ══════════════════════════════════════════════════════════════
   MODULE 3 - MAINTENANCE & INTERVENTIONS
   ══════════════════════════════════════════════════════════════
   repris de la structure du socle FMS, adapté à UCODIS :
   UCODIS transporte du fret sec, pas des hydrocarbures en citerne.
   Le sous-système et la compétence atelier « Citerne » du socle FMS n'ont
   donc pas d'équivalent ici et ne sont pas repris. Le reste du
   référentiel (nomenclature ISO 14224, huit modes de défaillance,
   cinq causes racines RCM) est générique à tout poids lourd et
   repris à l'identique.

   Le cahier des charges UCODIS (Module 3 - Maintenance &
   Interventions) fournit un exemple concret de plan d'entretien
   pour un Sinotruk Howo, repris tel quel dans les données de
   démonstration du store plutôt qu'ici.
   ══════════════════════════════════════════════════════════════ */

/* ── Nomenclature ISO 14224 - dix sous-systèmes (onze sur le socle FMS,
      moins la citerne) ─────────────────────────────────────────── */
export type SousSysteme =
  | 'moteur' | 'transmission' | 'circuit_air' | 'circuit_carburant'
  | 'freinage' | 'electricite' | 'direction_suspension'
  | 'roues_roulements' | 'chassis_tolerie' | 'refroidissement'

export const LIB_SOUS_SYSTEME: Record<SousSysteme, string> = {
  moteur:               'Moteur',
  transmission:         'Transmission',
  circuit_air:          "Circuit d'air",
  circuit_carburant:    'Circuit carburant',
  freinage:             'Freinage',
  electricite:          'Électricité et électronique',
  direction_suspension: 'Direction et suspension',
  roues_roulements:     'Roues et roulements',
  chassis_tolerie:      'Châssis et tôlerie',
  refroidissement:      'Refroidissement',
}

/* ── Les huit modes de défaillance, génériques ───────────────── */
export type ModeDefaillance =
  | 'fuite' | 'blocage' | 'rupture' | 'perte_puissance'
  | 'surchauffe' | 'defaillance_electrique' | 'usure_excessive' | 'non_fonctionnel'

export const LIB_MODE_DEFAILLANCE: Record<ModeDefaillance, string> = {
  fuite:                  'Fuite',
  blocage:                'Blocage',
  rupture:                'Rupture',
  perte_puissance:        'Perte de puissance',
  surchauffe:             'Surchauffe',
  defaillance_electrique: 'Défaillance électrique',
  usure_excessive:        'Usure excessive',
  non_fonctionnel:        'Non fonctionnel',
}

/* ── Les cinq causes racines (méthode RCM), génériques ───────── */
export type CauseRacine =
  | 'conception' | 'fournisseur' | 'erreur_humaine'
  | 'environnement' | 'maintenance_insuffisante'

export const LIB_CAUSE_RACINE: Record<CauseRacine, string> = {
  conception:               'Défaut de conception',
  fournisseur:              'Défaut fournisseur',
  erreur_humaine:           'Erreur humaine',
  environnement:            'Conditions environnementales',
  maintenance_insuffisante: 'Maintenance insuffisante',
}

/* ══════════════════════════════════════════════════════════════
   Codes d'indisponibilité - repris de la structure du socle FMS (quatre
   familles), mais des organismes réglementaires propres au
   transport français ou maritime d'hydrocarbures (APAVE, Vetting)
   retirés, faute d'équivalent connu à Madagascar pour du fret sec.
   Conservés : les codes techniques, administratifs et humains,
   génériques à toute exploitation de poids lourds.
   ══════════════════════════════════════════════════════════════ */
export type FamilleIndispo = 'technique' | 'reglementaire' | 'administrative' | 'humaine'

export const LIB_FAMILLE_INDISPO: Record<FamilleIndispo, string> = {
  technique:      'Technique',
  reglementaire:  'Réglementaire',
  administrative: 'Administrative',
  humaine:        'Humaine',
}

export type CodeIndispo =
  | 'MTN' | 'PNN' | 'DPN' | 'ACC'
  | 'CTV' | 'VIS'
  | 'DRG' | 'NDP' | 'DSC'
  | 'CON' | 'TRH' | 'MED' | 'ABS' | 'SAN'

export interface DefinitionIndispo {
  code: CodeIndispo
  famille: FamilleIndispo
  libelle: string
}

export const CODES_INDISPO: DefinitionIndispo[] = [
  { code: 'MTN', famille: 'technique',      libelle: 'Maintenance planifiée' },
  { code: 'PNN', famille: 'technique',      libelle: 'Panne en cours' },
  { code: 'DPN', famille: 'technique',      libelle: 'Dépannage sur site' },
  { code: 'ACC', famille: 'technique',      libelle: 'Accident' },
  { code: 'CTV', famille: 'reglementaire',  libelle: 'Contre-visite technique' },
  { code: 'VIS', famille: 'reglementaire',  libelle: 'Visite technique' },
  { code: 'DRG', famille: 'administrative', libelle: 'Dérogation' },
  { code: 'NDP', famille: 'administrative', libelle: 'Note de protêt' },
  { code: 'DSC', famille: 'administrative', libelle: 'Dossier chauffeur' },
  { code: 'CON', famille: 'humaine',        libelle: 'Congé chauffeur' },
  { code: 'TRH', famille: 'humaine',        libelle: 'Repos chauffeur' },
  { code: 'MED', famille: 'humaine',        libelle: 'Visite médicale' },
  { code: 'ABS', famille: 'humaine',        libelle: 'Absence' },
  { code: 'SAN', famille: 'humaine',        libelle: 'Sanction' },
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
  commentaire?: string
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
  | 'remontee_chauffeur' | 'checklist' | 'alerte_preventive' | 'constat_garage' | 'equipe_mobile'

export const LIB_ORIGINE_OT: Record<OrigineOT, string> = {
  remontee_chauffeur: 'Remontée chauffeur',
  checklist:          'Anomalie de checklist',
  alerte_preventive:  'Échéance préventive',
  constat_garage:     'Constat au garage',
  equipe_mobile:      'Dépannage sur route',
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
  demandee:     'Demande émise',
  commandee:    'Bon de commande établi',
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

/** Tarif horaire interne non communiqué par UCODIS : la main-d'œuvre
 *  reste non valorisée tant qu'il manque, comme sur le socle FMS. */
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

/** Compétences de l'atelier : mécanique, électricité, pneumatique -
 *  la « citerne » du socle FMS retirée, sans équivalent en fret sec. */
export type CompetenceAtelier = 'mecanique' | 'electricite' | 'pneumatique'

export const LIB_COMPETENCE: Record<CompetenceAtelier, string> = {
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

  /** Clôture, avec la triple validation exigée par le cahier des
   *  charges UCODIS : technicien, responsable, puis directeur. */
  clotureLe?: string
  cloturePar?: string
  valideParResponsableLe?: string
  valideParResponsable?: string
  valideParDirecteurLe?: string
  valideParDirecteur?: string

  coutPiecesAr?: number
  kilometrage?: number

  dureeEstimeeH?: number
  planifieeLe?: string
}

/* ══════════════════════════════════════════════════════════════
   Plan d'entretien par modèle - le cahier des charges UCODIS fournit
   un exemple réel pour un Sinotruk Howo, repris dans les données de
   démonstration du store (voir maintenance.ts).
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
  dateProchaine?: string
  kmRestants?: number
  joursRestants?: number
  statut: 'a_venir' | 'proche' | 'depassee'
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
   Équipe mobile - patrouille conjointe dépannage / sécurisation /
   contrôles inopinés. La mention d'une fuite de citerne dans
   « sécurisation » n'a pas d'équivalent en fret sec et devient une
   sécurisation d'accident générique.
   ══════════════════════════════════════════════════════════════ */
export type TypeMissionMobile =
  | 'depannage_mecanique' | 'depannage_electrique' | 'securisation'
  | 'controle_alcool_drogue' | 'controle_clandestin' | 'surveillance'

export const LIB_MISSION_MOBILE: Record<TypeMissionMobile, string> = {
  depannage_mecanique:    'Dépannage mécanique',
  depannage_electrique:   'Dépannage électrique',
  securisation:           "Sécurisation d'accident",
  controle_alcool_drogue: 'Contrôle alcool et drogue',
  controle_clandestin:    'Détection passagers clandestins',
  surveillance:           'Surveillance comportementale',
}

export interface InterventionMobile {
  id: string
  reference: string
  type: TypeMissionMobile
  vehiculeId?: string
  vehiculePlaque?: string
  lieu: string
  lat?: number
  lng?: number
  declencheLe: string
  arriveeLe?: string
  clotureLe?: string
  /** Composition de l'équipe : responsable de mission, HSE, mécanicien, électricien. */
  equipe: string[]
  resolu: boolean
  ordreTravailId?: string
  /** Pour les contrôles : nombre de tests réalisés et nombre de positifs. */
  testsRealises?: number
  testsPositifs?: number
  observation?: string
}
