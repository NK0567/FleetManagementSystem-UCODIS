import { defineStore } from 'pinia'
import { useCodificationIndispoStore } from './codificationIndispo'
import { ref, computed, watch } from 'vue'
import {
  LIB_COMPETENCE, TYPES_MISSION_MOBILE_DEFAUT,
  MAX_PANNES_SIMULTANEES, COMPETENCE_PAR_SOUS_SYSTEME, PRIORITE_PAR_GRAVITE,
} from '../types/maintenance'
import type {
  OrdreTravail, Indisponibilite, PanneDiagnostiquee, CompetenceAtelier,
  DemandeAchat, PieceConsommee, PlanEntretien, OperationEntretien, EcheanceEntretien,
  SousSysteme, ParametresAtelier, InterventionMobile, TypeMissionMobileParam,
} from '../types/maintenance'
import type { Vehicule } from '../types'
import { useNomenclatureStore } from './nomenclature'
import { useConfigurationStore } from './configuration'
import { aujourdhuiISO, maintenantMs, maintenant, isoJour, decaler } from '../utils/horloge'
import { useCarburantStore } from './carburant'
import { useAchatsStore } from './achats'
import { useVehiculeStore } from './vehicules'
import { useTypesVehiculesStore } from './typesVehicules'
import { useDocumentsVehiculeStore } from './documentsVehicule'

/**
 * Maintenance et interventions : plans d'entretien, ordres de travail
 * (nomenclature ISO 14224), indisponibilités, charge de l'atelier interne,
 * atelier externe, équipe mobile.
 *
 * Trois valeurs de paramétrage partent d'une simulation, modifiables dans
 * Paramètres de l'atelier : la capacité de l'atelier, le tarif horaire de
 * la main-d'œuvre et le coût d'immobilisation journalier.
 *
 * La clôture d'un ordre de travail se fait en deux temps : le technicien,
 * ou l'atelier externe, déclare l'intervention terminée ; le responsable
 * maintenance valide ensuite la clôture.
 */
export const useMaintenanceStore = defineStore('maintenance', () => {
  const codification = useCodificationIndispoStore()

  /* ══════════════════════════════════════════════════════════
     Paramètres de l'atelier
     ══════════════════════════════════════════════════════════ */
  const VALEURS_SIMULATION: ParametresAtelier = {
    capacite: {
      site: 'Dépôt Tanjombato',
      postes: 2,
      heuresParJour: 8,
      joursOuvresParSemaine: 6,
      origine: 'simulation',
      justification: "Aucune capacité d'atelier n'a été communiquée par l'entreprise : 2 postes, 8 heures par jour, du lundi au samedi, est une hypothèse de calibrage pour un parc de 20 véhicules.",
    },
    mainOeuvre: {
      tarifUniqueAr: 10_000,
      parCompetence: {},
      origine: 'simulation',
      justification: "Tarif horaire non communiqué : reconstitué sur la base d'un coût mensuel chargé de mécanicien qualifié estimé à 1 000 000 dans la monnaie de l'entreprise, rapporté à 100 heures productives par mois. À remplacer par le tarif réel de l'atelier.",
    },
    immobilisation: {
      moyenJourAr: 450_000,
      tracteurJourAr: null,
      semiRemorqueJourAr: null,
      origine: 'simulation',
      justification: "Manque à gagner journalier non communiqué : reconstitué sur la base d'une marge nette moyenne par rotation, rapportée aux jours d'exploitation d'un ensemble tracteur-remorque. À remplacer par le chiffre réel de l'exploitation.",
    },
  }

  const copier = (v: ParametresAtelier): ParametresAtelier => JSON.parse(JSON.stringify(v))
  const parametresAtelier = ref<ParametresAtelier>(copier(VALEURS_SIMULATION))

  type GroupeParametre = 'capacite' | 'mainOeuvre' | 'immobilisation'

  function marquerSaisiParClient(groupe: GroupeParametre) {
    parametresAtelier.value[groupe].origine = 'client'
    parametresAtelier.value[groupe].justification = undefined
  }
  function restaurerSimulation(groupe: GroupeParametre) {
    const frais = copier(VALEURS_SIMULATION)
    if (groupe === 'capacite') parametresAtelier.value.capacite = frais.capacite
    else if (groupe === 'mainOeuvre') parametresAtelier.value.mainOeuvre = frais.mainOeuvre
    else parametresAtelier.value.immobilisation = frais.immobilisation
  }
  const estSimule = (groupe: GroupeParametre) => parametresAtelier.value[groupe].origine === 'simulation'
  const groupesSimules = computed(() =>
    (['capacite', 'mainOeuvre', 'immobilisation'] as GroupeParametre[]).filter(estSimule))

  function majParametresAtelier(data: Partial<ParametresAtelier>) {
    Object.assign(parametresAtelier.value, data)
  }

  const capaciteRenseignee = computed(() => {
    const c = parametresAtelier.value.capacite
    return c.postes != null && c.heuresParJour != null && c.joursOuvresParSemaine != null
  })
  const capaciteHeuresParJour = computed(() => {
    const c = parametresAtelier.value.capacite
    return capaciteRenseignee.value ? (c.postes! * c.heuresParJour!) : null
  })
  const capaciteHeuresParSemaine = computed(() =>
    capaciteHeuresParJour.value != null
      ? capaciteHeuresParJour.value * (parametresAtelier.value.capacite.joursOuvresParSemaine ?? 6)
      : null)
  const tarifRenseigne = computed(() => parametresAtelier.value.mainOeuvre.tarifUniqueAr != null)
  const coutImmoRenseigne = computed(() => parametresAtelier.value.immobilisation.moyenJourAr != null)

  /* ══════════════════════════════════════════════════════════
     Ordres de travail : données de démonstration cohérentes avec
     le parc (4029 TBA hors service après accident : voici son ordre).
     ══════════════════════════════════════════════════════════ */
  const ordres = ref<OrdreTravail[]>([
    {
      id: 'OT-2026-0033', reference: 'OT-2026-0033', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      origine: 'checklist', declarePar: 'Jaona Ratsimbazafy', declareLe: decaler('2026-08-29T09:45:00'),
      symptome: "Accrochage à l'arrière lors d'une manœuvre de recul sur l'aire de chargement.",
      gravite: 'majeure', typeMaintenance: 'correctif',
      sousSysteme: 'chassis_tolerie', modeDefaillance: 'rupture', causeRacine: 'erreur_humaine',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: decaler('2026-08-29T14:00:00'),
      statut: 'en_cours', mecaniciens: ['Rakoto Andrianina'],
      pieces: [], temps: [{ id: 'TP-001', mecanicienNom: 'Rakoto Andrianina', heures: 6, date: decaler('2026-08-30') }],
      kilometrage: 289_400, dureeEstimeeH: 25, planifieeLe: decaler('2026-08-30'),
    },
    {
      id: 'OT-2026-0032', reference: 'OT-2026-0032', vehiculeId: 'v-sr-9', vehiculePlaque: 'RM 4109',
      origine: 'constat_garage', declarePar: 'Rakoto Andrianina', declareLe: decaler('2026-08-22T08:00:00'),
      symptome: 'Frein à réviser, garniture proche de la limite.',
      gravite: 'majeure', typeMaintenance: 'correctif',
      sousSysteme: 'freinage', modeDefaillance: 'usure_excessive', causeRacine: 'maintenance_insuffisante',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: decaler('2026-08-22T08:30:00'),
      statut: 'cloture', mecaniciens: ['Tojo Rasoanaivo'],
      pieces: [{ id: 'PC-001', reference: 'GRN-STD', designation: 'Garniture de frein', quantite: 4, prixUnitaireAr: 65_000, origine: 'stock' }],
      temps: [{ id: 'TP-002', mecanicienNom: 'Tojo Rasoanaivo', heures: 3, date: decaler('2026-08-24') }],
      travauxRealises: 'Remplacement des garnitures de frein sur les deux essieux.',
      clotureLe: decaler('2026-08-24T16:00:00'), cloturePar: 'Tojo Rasoanaivo',
      termineDeclarePar: 'Tojo Rasoanaivo', termineDeclareLe: decaler('2026-08-24T15:00:00'),
      valideParResponsable: 'Hery Andriamalala', valideParResponsableLe: decaler('2026-08-24T16:00:00'),
      coutPiecesAr: 260_000, kilometrage: 0, dureeEstimeeH: 3,
    },
    {
      id: 'OT-2026-0031', reference: 'OT-2026-0031', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      origine: 'alerte_preventive', declarePar: 'Système', declareLe: decaler('2026-08-28T06:00:00'),
      symptome: 'Entretien préventif : Vidanger le moteur et remplacer le filtre à huile.',
      gravite: 'mineure', typeMaintenance: 'preventif',
      sousSysteme: 'moteur', modeDefaillance: 'usure_excessive', causeRacine: 'maintenance_insuffisante',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: decaler('2026-08-28T06:30:00'),
      statut: 'attente_validation', mecaniciens: ['Rakoto Andrianina'],
      pieces: [
        { id: 'PC-002', reference: 'HUI-15W40', designation: 'Huile moteur 15W40', quantite: 20, prixUnitaireAr: 28_000, origine: 'stock' },
        { id: 'PC-003', reference: 'FLT-HUI-HW', designation: 'Filtre à huile Howo', quantite: 1, prixUnitaireAr: 45_000, origine: 'stock' },
      ],
      temps: [{ id: 'TP-003', mecanicienNom: 'Rakoto Andrianina', heures: 1.5, date: decaler('2026-08-28') }],
      travauxRealises: 'Vidange moteur et remplacement du filtre à huile.',
      cloturePar: 'Rakoto Andrianina', termineDeclarePar: 'Rakoto Andrianina', termineDeclareLe: decaler('2026-08-28T08:00:00'),
      coutPiecesAr: 605_000, kilometrage: 165_900, dureeEstimeeH: 2, operationsPlan: ['OP-001'],
    },
    {
      id: 'OT-2026-0030', reference: 'OT-2026-0030', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      origine: 'remontee_chauffeur', declarePar: 'Solofo Rakotomanga', declareLe: decaler('2026-08-31T18:20:00'),
      symptome: 'Bruit anormal au freinage, à diagnostiquer.',
      gravite: 'majeure', typeMaintenance: 'correctif',
      statut: 'ouvert', mecaniciens: [], pieces: [], temps: [],
      kilometrage: 182_400,
    },
    {
      id: 'OT-2026-0029', reference: 'OT-2026-0029', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA',
      origine: 'constat_garage', declarePar: 'Rakoto Andrianina', declareLe: decaler('2026-08-15T07:30:00'),
      symptome: 'Casse de la boîte de vitesses, immobilisation immédiate.',
      gravite: 'critique', typeMaintenance: 'correctif',
      sousSysteme: 'transmission', modeDefaillance: 'rupture', causeRacine: 'maintenance_insuffisante',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: decaler('2026-08-15T09:00:00'),
      statut: 'attente_piece', mecaniciens: ['Rakoto Andrianina'], temps: [],
      pieces: [{ id: 'PC-004', reference: 'BV-FOT-EST', designation: 'Boîte de vitesses complète', quantite: 1, prixUnitaireAr: 3_200_000, origine: 'achat', demandeAchatId: 'DA-2026-0006' }],
      kilometrage: 244_100,
    },
  ])

  const getById = (id: string) => ordres.value.find(o => o.id === id)
  const ouverts = computed(() => ordres.value.filter(o => o.statut !== 'cloture' && o.statut !== 'annule'))
  const enAttentePiece = computed(() => ordres.value.filter(o => o.statut === 'attente_piece'))
  const ordresDuVehicule = (vehiculeId: string) =>
    ordres.value.filter(o => o.vehiculeId === vehiculeId).sort((a, b) => +new Date(b.declareLe) - +new Date(a.declareLe))

  function coutPieces(o: OrdreTravail): number {
    return o.pieces.reduce((s, p) => s + p.quantite * p.prixUnitaireAr, 0)
  }
  /** Atelier externe (montant final s'il est connu, sinon le devis) et
   *  coût global d'une intervention reprise de l'historique. */
  function coutSousTraitance(o: OrdreTravail): number {
    const externe = o.prestataire && !o.sousGarantie ? (o.montantFinalAr ?? o.montantDevisAr ?? 0) : 0
    return externe + (o.coutRepriseAr ?? 0)
  }
  function tarifHoraireDe(o: OrdreTravail): number | null {
    const m = parametresAtelier.value.mainOeuvre
    const c = competenceDe(o)
    return (c ? m.parCompetence[c] : undefined) ?? m.tarifUniqueAr ?? null
  }
  function heuresOT(o: OrdreTravail): number {
    return o.temps.reduce((s, t) => s + t.heures, 0)
  }
  function coutMainOeuvre(o: OrdreTravail): number | null {
    const tarif = tarifHoraireDe(o)
    return tarif == null ? null : Math.round(heuresOT(o) * tarif)
  }
  function coutOT(o: OrdreTravail): number {
    return coutPieces(o) + coutSousTraitance(o) + (coutMainOeuvre(o) ?? 0)
  }

  /* ══ Demandes d'achat ═══════════════════════════════════════ */
  const demandes = ref<DemandeAchat[]>([
    { id: 'DA-2026-0006', ordreTravailId: 'OT-2026-0029', reference: 'BV-FOT-EST',
      designation: 'Boîte de vitesses complète', quantite: 1, statut: 'commandee',
      fournisseur: 'Somaco Antananarivo', numeroBonCommande: 'BC-2026-0088',
      dateDemande: decaler('2026-08-15T09:15:00'), dateCommande: decaler('2026-08-16T08:00:00'), montantAr: 3_200_000, delaiJours: 21 },
  ])
  const demandesDeLOT = (otId: string) => demandes.value.filter(d => d.ordreTravailId === otId)
  function delaiReception(d: DemandeAchat): number | null {
    if (!d.dateCommande || !d.dateReception) return null
    return Math.round((+new Date(d.dateReception) - +new Date(d.dateCommande)) / 86_400_000)
  }

  /* ══ Indisponibilités ═══════════════════════════════════════ */
  const indisponibilites = ref<Indisponibilite[]>([
    { id: 'IND-001', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA', code: 'ACC', famille: 'technique',
      debut: decaler('2026-08-29T09:45:00'), ordreTravailId: 'OT-2026-0033',
      commentaire: 'Immobilisé après accrochage, en réparation carrosserie.' },
    { id: 'IND-002', vehiculeId: 'v-sr-9', vehiculePlaque: 'RM 4109', code: 'MTN', famille: 'technique',
      debut: decaler('2026-08-22T08:00:00'), fin: decaler('2026-08-24T15:00:00'), dureeJours: 3, ordreTravailId: 'OT-2026-0032' },
    { id: 'IND-003', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', code: 'MTN', famille: 'technique',
      debut: decaler('2026-08-28T06:00:00'), ordreTravailId: 'OT-2026-0031' },
    { id: 'IND-004', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA', code: 'PNN', famille: 'technique',
      debut: decaler('2026-08-15T07:30:00'), ordreTravailId: 'OT-2026-0029',
      commentaire: 'Immobilisé dans l\'attente de la boîte de vitesses de remplacement.' },
    { id: 'IND-005', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', code: 'PNN', famille: 'technique',
      debut: decaler('2026-08-31T18:20:00'), ordreTravailId: 'OT-2026-0030' },
  ])
  /** Identifiant unique, même pour plusieurs indisponibilités ouvertes dans la même milliseconde. */
  function nouvelIdIndispo() {
    let n = maintenantMs(); while (indisponibilites.value.some(i => i.id === `IND-${n}`)) n++
    return `IND-${n}`
  }
  const indisposEnCours = computed(() => indisponibilites.value.filter(i => !i.fin))
  /** Ordres de travail rattachés à une indisponibilité : un véhicule n'a
   *  qu'une indisponibilité ouverte, que plusieurs ordres peuvent partager. */
  const ordresDeLIndispo = (i: Indisponibilite) => [i.ordreTravailId, ...(i.autresOrdres ?? [])].filter((x): x is string => !!x)
  const indispoDeLOT = (ref: string) => indisponibilites.value.find(i => ordresDeLIndispo(i).includes(ref))
  const indisposDuVehicule = (vehiculeId: string) => indisponibilites.value.filter(i => i.vehiculeId === vehiculeId)
  function dureeIndispo(i: Indisponibilite): number {
    const fin = i.fin ? +new Date(i.fin) : maintenantMs()
    return Math.max(1, Math.round((fin - +new Date(i.debut)) / 86_400_000))
  }
  const joursPerdusParFamille = computed(() => {
    const acc: Record<string, number> = { technique: 0, reglementaire: 0, administrative: 0, humaine: 0 }
    indisponibilites.value.forEach(i => { acc[codification.familleDuCode(i.code)] = (acc[codification.familleDuCode(i.code)] ?? 0) + dureeIndispo(i) })
    return acc
  })
  /** Coût journalier selon que le véhicule est motorisé ou tracté, d'après son type. */
  function coutJournalierDe(i: Indisponibilite): number | null {
    const c = parametresAtelier.value.immobilisation
    const v = useVehiculeStore().parId(i.vehiculeId)
    const motorise = v ? useTypesVehiculesStore().estMotorise(v.type) : true
    return (motorise ? c.tracteurJourAr : c.semiRemorqueJourAr) ?? c.moyenJourAr ?? null
  }
  function coutIndispo(i: Indisponibilite): number | null {
    const j = coutJournalierDe(i)
    return j == null ? null : dureeIndispo(i) * j
  }
  const coutTotalImmobilisations = computed(() => {
    if (!coutImmoRenseigne.value) return null
    return indisponibilites.value.reduce((s, i) => s + (coutIndispo(i) ?? 0), 0)
  })
  const ratioHumainTechnique = computed(() => {
    const j = joursPerdusParFamille.value
    return j.technique ? Number(((j.humaine ?? 0) / j.technique).toFixed(2)) : null
  })
  const coutParFamille = computed(() => {
    if (!coutImmoRenseigne.value) return null
    const acc: Record<string, number> = { technique: 0, reglementaire: 0, administrative: 0, humaine: 0 }
    indisponibilites.value.forEach(i => { const f = codification.familleDuCode(i.code); acc[f] = (acc[f] ?? 0) + (coutIndispo(i) ?? 0) })
    return acc
  })

  /* ══════════════════════════════════════════════════════════
     Équipe mobile : dépannage d'un camion bloqué sur la route.
     ══════════════════════════════════════════════════════════ */
  const interventionsMobiles = ref<InterventionMobile[]>([
    { id: 'IM-2026-0012', reference: 'IM-2026-0012', type: 'depannage_mecanique',
      vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      lieu: 'RN2, PK 84, environs de Moramanga', lat: -18.94, lng: 48.22,
      declencheLe: decaler('2026-08-29T09:50:00'), arriveeLe: decaler('2026-08-29T11:15:00'),
      clotureLe: decaler('2026-08-29T13:40:00'),
      equipe: ['Naina Rakotobe', 'Rakoto Andrianina'],
      resolu: false, ordreTravailId: 'OT-2026-0033',
      observation: "Accrochage à l'arrière, tôlerie endommagée. Camion remorqué au dépôt de Tanjombato." },
    { id: 'IM-2026-0011', reference: 'IM-2026-0011', type: 'depannage_electrique',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA',
      lieu: 'RN7, PK 42 après Ambatolampy',
      declencheLe: decaler('2026-08-25T05:30:00'), arriveeLe: decaler('2026-08-25T06:45:00'),
      clotureLe: decaler('2026-08-25T07:30:00'),
      equipe: ['Naina Rakotobe', 'Tojo Rasoanaivo'],
      resolu: true,
      observation: 'Cosse de batterie desserrée, resserrée sur place. Le camion a repris la route.' },
    { id: 'IM-2026-0010', reference: 'IM-2026-0010', type: 'controle_alcool_drogue',
      vehiculeId: 'v-tr-6', vehiculePlaque: '4026 TBA',
      lieu: 'RN7, poste de contrôle de Behenjy',
      declencheLe: decaler('2026-08-21T05:00:00'), arriveeLe: decaler('2026-08-21T05:50:00'),
      clotureLe: decaler('2026-08-21T09:30:00'),
      equipe: ['Naina Rakotobe', 'Hery Andriamalala'],
      resolu: true, nbControles: 14, nbPositifs: 1,
      commentaireControles: 'Un conducteur positif à l\'alcool, retiré de la conduite et remplacé.' },
  ])
  const mobilesEnCours = computed(() => interventionsMobiles.value.filter(i => !i.clotureLe))

  /* ══════════════════════════════════════════════════════════
     Plans d'entretien par marque et modèle, repris du plan constructeur.
     Un plan provisoire produit des échéances réelles ; ses intervalles
     restent à confirmer.
     ══════════════════════════════════════════════════════════ */
  const plans = ref<PlanEntretien[]>([
    {
      id: 'PE-001', marque: 'Sinotruk', modele: 'Howo A7', actif: true,
      provisoire: true,
      source: 'Plan constructeur Sinotruk Howo-NX 400.',
      operations: [
        { id: 'OP-001', libelle: "Vidanger le moteur et remplacer le filtre à huile", sousSysteme: 'moteur', nature: 'remplacer', intervalleKm: 10_000 },
        { id: 'OP-002', libelle: 'Échanger le filtre et le préfiltre gazoil', sousSysteme: 'circuit_carburant', nature: 'remplacer', intervalleKm: 10_000 },
        { id: 'OP-003', libelle: 'Vidanger le circuit de refroidissement et échanger le bouchon pression/dépression', sousSysteme: 'refroidissement', nature: 'remplacer', intervalleKm: 40_000 },
        { id: 'OP-004', libelle: "Échanger le filtre à air (primaire et secondaire) et nettoyer la cuve", sousSysteme: 'circuit_air', nature: 'remplacer', intervalleKm: 30_000 },
        { id: 'OP-005', libelle: "Effectuer l'échange des courroies", sousSysteme: 'moteur', nature: 'remplacer', intervalleKm: 60_000 },
        { id: 'OP-006', libelle: 'Échanger la chaîne de distribution', sousSysteme: 'moteur', nature: 'remplacer', intervalleKm: 200_000 },
        { id: 'OP-007', libelle: "Vidanger le circuit d'assistance hydraulique d'embrayage", sousSysteme: 'transmission', nature: 'remplacer', intervalleKm: 80_000 },
        { id: 'OP-008', libelle: 'Vidanger la boîte de vitesses mécanique', sousSysteme: 'transmission', nature: 'remplacer', intervalleKm: 50_000 },
        { id: 'OP-009', libelle: 'Vidanger le pont (huile 80W90)', sousSysteme: 'transmission', nature: 'remplacer', intervalleKm: 50_000 },
        { id: 'OP-010', libelle: 'Graisser les moyeux de roues avant et arrière', sousSysteme: 'roues_roulements', nature: 'lubrifier', intervalleKm: 10_000 },
        { id: 'OP-011', libelle: 'Vérifier le niveau de liquide de direction', sousSysteme: 'direction_suspension', nature: 'verifier', intervalleKm: 10_000 },
        { id: 'OP-012', libelle: 'Vérifier la garniture de frein', sousSysteme: 'freinage', nature: 'verifier', intervalleKm: 10_000 },
      ],
    },
    {
      id: 'PE-002', marque: 'Dongfeng', modele: 'KL', actif: true, provisoire: true,
      source: "Aucun plan constructeur reçu pour ce modèle : intervalles calqués sur le plan Sinotruk Howo.",
      operations: [
        { id: 'OP-101', libelle: "Vidanger le moteur et remplacer le filtre à huile", sousSysteme: 'moteur', nature: 'remplacer', intervalleKm: 10_000 },
        { id: 'OP-102', libelle: 'Vérifier la garniture de frein', sousSysteme: 'freinage', nature: 'verifier', intervalleKm: 10_000 },
      ],
    },
  ])

  type Passages = { km: Record<string, number>; dates: Record<string, string>; heures?: Record<string, number> }
  const derniersPassages = ref<Record<string, Passages>>({
    /* v-tr-1, 4021 TBA, 182 400 km : dernière vidange faite tôt, échéance dépassée */
    'v-tr-1': { km: { 'OP-001': 165_000, 'OP-002': 165_000, 'OP-010': 175_000, 'OP-011': 175_000, 'OP-012': 175_000 }, dates: {} },
    /* v-tr-2, 4022 TBA, 165 900 km : vidange faite le 28/08, tout est frais */
    'v-tr-2': { km: { 'OP-001': 165_900, 'OP-002': 165_900 }, dates: {} },
  })
  const passagesDe = (vehiculeId: string): Passages => derniersPassages.value[vehiculeId] ?? { km: {}, dates: {}, heures: {} }
  function enregistrerPassage(vehiculeId: string, operationId: string, km: number, date: string, heures?: number) {
    const e = derniersPassages.value[vehiculeId] ?? { km: {}, dates: {}, heures: {} }
    e.km[operationId] = km
    e.dates[operationId] = date
    if (heures != null) (e.heures ??= {})[operationId] = heures
    derniersPassages.value[vehiculeId] = e
  }

  /** Plan d'un véhicule : retrouvé par sa marque ET son modèle. */
  const memeTexte = (a?: string, b?: string) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()
  const planDe = (marque?: string, modele?: string) => plans.value.find(p => memeTexte(p.marque, marque) && memeTexte(p.modele, modele))
  const planDuModele = (marque?: string, modele?: string) => { const p = planDe(marque, modele); return p?.actif ? p : undefined }
  const getPlan = (id: string) => plans.value.find(p => p.id === id)

  let seqPlan = plans.value.length
  let seqOperation = 0
  function creerPlan(marque: string, modele: string): string | null {
    if (!marque.trim() || !modele.trim()) return null
    if (planDe(marque, modele)) return null
    const id = `PE-${String(++seqPlan).padStart(3, '0')}`
    plans.value.push({ id, marque: marque.trim(), modele: modele.trim(), actif: true, operations: [] })
    return id
  }
  function majPlan(id: string, data: Partial<Pick<PlanEntretien, 'marque' | 'modele' | 'actif'>>) {
    const p = getPlan(id); if (p) Object.assign(p, data)
  }
  function basculerPlanActif(id: string) { const p = getPlan(id); if (p) p.actif = !p.actif }
  function supprimerPlan(id: string): boolean {
    const i = plans.value.findIndex(p => p.id === id)
    if (i < 0) return false
    plans.value.splice(i, 1)
    return true
  }
  function dupliquerPlan(id: string, marque: string, modele: string): string | null {
    const source = getPlan(id); if (!source) return null
    const nouveau = creerPlan(marque, modele); if (!nouveau) return null
    getPlan(nouveau)!.operations = source.operations.map(op => ({ ...op, id: `OP-${maintenantMs()}-${++seqOperation}` }))
    return nouveau
  }
  /** Contrôle d'une opération : libellé, sous-système et au moins un seuil positif (km, heures ou jours). */
  function controleOperation(op: Omit<OperationEntretien, 'id'>): string | null {
    if (!op.libelle.trim()) return "Indiquez le libellé de l'opération."
    if (!op.sousSysteme) return 'Choisissez le sous-système.'
    const seuils = [op.intervalleKm, op.intervalleHeures, op.intervalleJours]
    if (seuils.some(v => v != null && !(v > 0))) return 'Un seuil doit être un nombre positif.'
    if (!seuils.some(v => v != null && v > 0)) return 'Indiquez au moins un seuil : kilomètres, heures ou jours.'
    return null
  }
  const sansVide = (v?: number) => (v != null && v > 0 ? v : undefined)
  function ajouterOperation(planId: string, op: Omit<OperationEntretien, 'id'>): { ok: boolean; motif?: string } {
    const p = getPlan(planId); if (!p) return { ok: false, motif: 'Plan introuvable.' }
    const motif = controleOperation(op); if (motif) return { ok: false, motif }
    p.operations.push({ ...op, libelle: op.libelle.trim(), intervalleKm: sansVide(op.intervalleKm), intervalleHeures: sansVide(op.intervalleHeures),
      intervalleJours: sansVide(op.intervalleJours), id: `OP-${maintenantMs()}-${++seqOperation}` })
    return { ok: true }
  }
  function majOperation(planId: string, opId: string, data: Partial<OperationEntretien>): { ok: boolean; motif?: string } {
    const op = getPlan(planId)?.operations.find(o => o.id === opId); if (!op) return { ok: false, motif: 'Opération introuvable.' }
    const motif = controleOperation({ ...op, ...data }); if (motif) return { ok: false, motif }
    Object.assign(op, data)
    return { ok: true }
  }
  function supprimerOperation(planId: string, opId: string): boolean {
    const p = getPlan(planId); if (!p) return false
    const i = p.operations.findIndex(o => o.id === opId); if (i < 0) return false
    p.operations.splice(i, 1)
    return true
  }

  const config = useConfigurationStore()
  const PREAVIS_KM = computed(() => config.parametres.preavisEntretienKm)
  const PREAVIS_JOURS = computed(() => config.parametres.preavisEntretienJours)
  /** Préavis en heures moteur, pour les opérations dont le seuil est en heures. */
  const preavisHeures = ref(50)
  try { const b = localStorage.getItem('fms-ucodis-preavis-heures'); if (b && Number(b) > 0) preavisHeures.value = Number(b) } catch { /* défaut */ }
  watch(preavisHeures, v => { try { localStorage.setItem('fms-ucodis-preavis-heures', String(v)) } catch { /* ignoré */ } })
  function majPreavisHeures(v: number): { ok: boolean; motif?: string } {
    if (!(v > 0)) return { ok: false, motif: 'Le préavis en heures doit être un nombre positif.' }
    preavisHeures.value = Math.round(v)
    return { ok: true }
  }

  type VehiculeEcheance = Pick<Vehicule, 'id' | 'immatriculation' | 'kilometrage'> & Partial<Pick<Vehicule, 'marque' | 'modele' | 'heuresMoteur'>>
  /** Échéances d'un véhicule selon le plan de sa marque et de son modèle.
   *  L'échéance se déclenche au premier seuil atteint : kilomètres, heures
   *  moteur ou date. */
  function echeancesDuVehicule(v: VehiculeEcheance, passages: Passages): EcheanceEntretien[] {
    const plan = planDuModele(v.marque, v.modele)
    if (!plan) return []
    const instant = maintenantMs()
    return plan.operations.map(op => {
      const base = { vehiculeId: v.id, vehiculePlaque: v.immatriculation, operationId: op.id, operationLibelle: op.libelle, sousSysteme: op.sousSysteme, nature: op.nature }
      const dernierKm = passages.km[op.id]
      const derniereDate = passages.dates[op.id]
      const dernieresHeures = passages.heures?.[op.id]
      if (dernierKm == null && !derniereDate && dernieresHeures == null) return { ...base, statut: 'a_renseigner' as const }

      const kmProchain = op.intervalleKm && dernierKm != null ? dernierKm + op.intervalleKm : undefined
      const kmRestants = kmProchain != null ? kmProchain - v.kilometrage : undefined

      const heuresProchain = op.intervalleHeures && dernieresHeures != null ? dernieresHeures + op.intervalleHeures : undefined
      const heuresRestantes = heuresProchain != null && v.heuresMoteur != null ? heuresProchain - v.heuresMoteur : undefined

      let dateProchaine: string | undefined
      let joursRestants: number | undefined
      if (op.intervalleJours && derniereDate) {
        const echeance = new Date(derniereDate)
        echeance.setDate(echeance.getDate() + op.intervalleJours)
        dateProchaine = isoJour(echeance)
        joursRestants = Math.ceil((+echeance - instant) / 86_400_000)
      }
      const depassee = [kmRestants, heuresRestantes, joursRestants].some(r => r != null && r < 0)
      const proche = (kmRestants != null && kmRestants <= PREAVIS_KM.value) || (heuresRestantes != null && heuresRestantes <= preavisHeures.value)
        || (joursRestants != null && joursRestants <= PREAVIS_JOURS.value)
      const statut: EcheanceEntretien['statut'] = depassee ? 'depassee' : proche ? 'proche' : 'a_venir'

      return { ...base, kmProchain, kmRestants, heuresProchain, heuresRestantes, dateProchaine, joursRestants, statut }
    })
  }

  /** Échéances d'un véhicule du parc, à partir de ses derniers passages connus. */
  function echeancesDe(v: VehiculeEcheance): EcheanceEntretien[] {
    return echeancesDuVehicule(v, passagesDe(v.id))
  }
  /** Ordre de travail préventif ouvert qui traite déjà cette opération. */
  const otPreventifOuvert = (vehiculeId: string, operationId: string) =>
    ordres.value.find(o => o.vehiculeId === vehiculeId && o.statut !== 'cloture' && o.statut !== 'annule' && o.operationsPlan?.includes(operationId))
  /** Renseigne le dernier passage connu d'une opération (reprise de l'existant). */
  function renseignerPassage(vehiculeId: string, operationId: string, d: { km: number | null; date: string; heures?: number | null }, kmActuel: number, heuresActuelles?: number): { ok: boolean; motif?: string } {
    const { km, date } = d; const heures = d.heures ?? null
    if (km == null && !date && heures == null) return { ok: false, motif: 'Indiquez le kilométrage, les heures moteur ou la date du dernier passage.' }
    if (km != null && (km < 0 || km > kmActuel)) return { ok: false, motif: `Le kilométrage doit être compris entre 0 et ${kmActuel.toLocaleString('fr-FR')} km.` }
    if (heures != null && (heures < 0 || (heuresActuelles != null && heures > heuresActuelles)))
      return { ok: false, motif: heuresActuelles != null ? `Les heures moteur doivent être comprises entre 0 et ${heuresActuelles.toLocaleString('fr-FR')} h.` : 'Les heures moteur ne peuvent pas être négatives.' }
    if (date && date > aujourdhuiISO()) return { ok: false, motif: 'La date ne peut pas être dans le futur.' }
    const e = derniersPassages.value[vehiculeId] ?? { km: {}, dates: {}, heures: {} }
    if (km != null) e.km[operationId] = km
    if (date) e.dates[operationId] = date
    if (heures != null) (e.heures ??= {})[operationId] = heures
    derniersPassages.value[vehiculeId] = e
    return { ok: true }
  }

  function echeancesDuParc(vehicules: VehiculeEcheance[]): EcheanceEntretien[] {
    return vehicules.flatMap(v => echeancesDe(v))
  }

  /* ══ Indicateurs de performance ══════════════════════════════ */
  const mttrHeures = computed(() => {
    /* L'historique repris n'a pas de durée d'immobilisation réelle : il n'entre pas dans le MTTR. */
    const clos = ordres.value.filter(o => o.statut === 'cloture' && o.clotureLe && !o.repriseHistorique)
    if (!clos.length) return null
    const total = clos.reduce((s, o) => s + (+new Date(o.clotureLe!) - +new Date(o.declareLe)) / 3_600_000, 0)
    return Number((total / clos.length).toFixed(1))
  })
  const mtbfKm = computed(() => {
    const correctifs = ordres.value.filter(o => o.typeMaintenance === 'correctif' && o.kilometrage != null)
    if (correctifs.length < 2) return null
    const parVehicule = new Map<string, number[]>()
    correctifs.forEach(o => { const l = parVehicule.get(o.vehiculeId) ?? []; l.push(o.kilometrage!); parVehicule.set(o.vehiculeId, l) })
    const ecarts: number[] = []
    parVehicule.forEach(kms => { kms.sort((a, b) => a - b); for (let i = 1; i < kms.length; i++) ecarts.push(kms[i]! - kms[i - 1]!) })
    return ecarts.length ? Math.round(ecarts.reduce((a, b) => a + b, 0) / ecarts.length) : null
  })
  /** Part des ordres préventifs ; la cible se règle avec les indicateurs. */
  const ratioPreventif = computed(() => {
    const reels = ordres.value.filter(o => o.statut !== 'annule' && !o.repriseHistorique)
    if (!reels.length) return null
    return Math.round((reels.filter(o => o.typeMaintenance === 'preventif').length / reels.length) * 100)
  })
  const pannesParSousSysteme = computed(() => {
    const acc = new Map<SousSysteme, number>()
    ordres.value.filter(o => o.typeMaintenance === 'correctif' && o.sousSysteme)
      .forEach(o => acc.set(o.sousSysteme!, (acc.get(o.sousSysteme!) ?? 0) + 1))
    return [...acc.entries()].map(([sousSysteme, nb]) => ({ sousSysteme, nb })).sort((a, b) => b.nb - a.nb)
  })
  const mtbfParSousSysteme = computed(() => {
    const parSS = new Map<SousSysteme, number[]>()
    ordres.value.filter(o => o.typeMaintenance === 'correctif' && o.sousSysteme && o.kilometrage != null)
      .forEach(o => { const l = parSS.get(o.sousSysteme!) ?? []; l.push(o.kilometrage!); parSS.set(o.sousSysteme!, l) })
    const out: { sousSysteme: SousSysteme; mtbfKm: number | null; nb: number }[] = []
    parSS.forEach((kms, ss) => {
      kms.sort((a, b) => a - b)
      const ecarts: number[] = []
      for (let i = 1; i < kms.length; i++) ecarts.push(kms[i]! - kms[i - 1]!)
      out.push({ sousSysteme: ss, mtbfKm: ecarts.length ? Math.round(ecarts.reduce((a, b) => a + b, 0) / ecarts.length) : null, nb: kms.length })
    })
    return out.sort((a, b) => b.nb - a.nb)
  })
  /** Jours d'immobilisation tombant dans la période [fin - jours, fin] : une
   *  immobilisation commencée avant la période n'y compte que pour sa part. */
  function joursPerdusSurPeriode(joursPeriode = 30, fin = maintenantMs(), vehiculeIds?: Set<string>): number {
    const debut = fin - joursPeriode * 86_400_000
    return indisponibilites.value.filter(i => !vehiculeIds || vehiculeIds.has(i.vehiculeId)).reduce((s, i) => {
      const d = Math.max(debut, +new Date(i.debut)); const f = Math.min(fin, i.fin ? +new Date(i.fin) : fin)
      return s + Math.max(0, (f - d) / 86_400_000)
    }, 0)
  }
  function tauxDisponibilite(nbVehicules: number, joursPeriode = 30, fin = maintenantMs(), vehiculeIds?: Set<string>): number | null {
    if (!nbVehicules) return null
    const joursTheoriques = nbVehicules * joursPeriode
    const perdus = Math.min(joursTheoriques, joursPerdusSurPeriode(joursPeriode, fin, vehiculeIds))
    return Math.round(((joursTheoriques - perdus) / joursTheoriques) * 100)
  }
  function coutParKm(vehiculeId: string, kmParcourus: number): number | null {
    if (!kmParcourus) return null
    const cout = ordresDuVehicule(vehiculeId).reduce((s, o) => s + coutOT(o), 0)
    return Math.round(cout / kmParcourus)
  }
  /** Écart entre le premier et le dernier relevé porté par les ordres de
   *  travail : c'est la distance parcourue pendant que ces coûts étaient
   *  engagés, pas le kilométrage total du véhicule depuis sa mise en service. */
  function kmSurPeriodeObservee(vehiculeId: string): number | null {
    const releves = ordresDuVehicule(vehiculeId).map(o => o.kilometrage).filter((k): k is number => k != null)
    if (releves.length < 2) return null
    const ecart = Math.max(...releves) - Math.min(...releves)
    return ecart > 0 ? ecart : null
  }
  function coutParKmObserve(vehiculeId: string): number | null {
    const km = kmSurPeriodeObservee(vehiculeId)
    return km ? coutParKm(vehiculeId, km) : null
  }
  const topVehiculesProblematiques = computed(() => {
    const acc = new Map<string, { vehiculeId: string; plaque: string; nb: number; joursImmo: number; surRoute: number }>()
    ordres.value.forEach(o => {
      const e = acc.get(o.vehiculeId) ?? { vehiculeId: o.vehiculeId, plaque: o.vehiculePlaque, nb: 0, joursImmo: 0, surRoute: 0 }
      e.nb += 1
      if (o.origine === 'equipe_mobile') e.surRoute += 1
      acc.set(o.vehiculeId, e)
    })
    indisponibilites.value.forEach(i => { const e = acc.get(i.vehiculeId); if (e) e.joursImmo += dureeIndispo(i) })
    return [...acc.values()].sort((a, b) => b.nb - a.nb).slice(0, 5)
  })
  const pannesSurRoute = computed(() => {
    const correctifs = ordres.value.filter(o => o.typeMaintenance === 'correctif')
    const surRoute = correctifs.filter(o => o.origine === 'equipe_mobile')
    return { nb: surRoute.length, total: correctifs.length, pct: correctifs.length ? Math.round((surRoute.length / correctifs.length) * 100) : null }
  })
  /** Kilométrage estimé sur les 12 derniers mois, à partir des relevés
   *  d'odomètre du carburant : plus fréquents et plus fiables que les
   *  seuls relevés portés par les ordres de travail. */
  function kmAnnuelEstime(vehiculeId: string): number | null {
    const carbStore = useCarburantStore()
    const depuis = maintenantMs() - 365 * 86_400_000
    const releves = carbStore.rechargesDuVehicule(vehiculeId).filter(r => +new Date(r.date) >= depuis).map(r => r.odometre)
    if (releves.length < 2) return null
    const ecart = Math.max(...releves) - Math.min(...releves)
    return ecart > 0 ? ecart : null
  }
  function joursImmoPour10000km(vehiculeId: string): number | null {
    const km = kmAnnuelEstime(vehiculeId)
    if (!km) return null
    const jours = indisposDuVehicule(vehiculeId).reduce((s, i) => s + dureeIndispo(i), 0)
    return Number(((jours / km) * 10_000).toFixed(1))
  }
  const coutCumuleParVehicule = computed(() => {
    const acc = new Map<string, { plaque: string; cout: number; mainOeuvre: number; nb: number; joursImmo: number; coutImmo: number | null }>()
    ordres.value.forEach(o => {
      const e = acc.get(o.vehiculeId) ?? { plaque: o.vehiculePlaque, cout: 0, mainOeuvre: 0, nb: 0, joursImmo: 0, coutImmo: null }
      e.cout += coutOT(o); e.mainOeuvre += coutMainOeuvre(o) ?? 0; e.nb += 1
      acc.set(o.vehiculeId, e)
    })
    indisponibilites.value.forEach(i => {
      const e = acc.get(i.vehiculeId); if (!e) return
      e.joursImmo += dureeIndispo(i)
      const c = coutIndispo(i)
      if (c != null) e.coutImmo = (e.coutImmo ?? 0) + c
    })
    return [...acc.entries()].map(([vehiculeId, e]) => ({ vehiculeId, ...e })).sort((a, b) => b.cout - a.cout)
  })
  const coutTotal = computed(() => ordres.value.reduce((s, o) => s + coutOT(o), 0))
  const coutMainOeuvreTotal = computed(() => ordres.value.reduce((s, o) => s + (coutMainOeuvre(o) ?? 0), 0))
  /** Préventif réalisé dans les délais : parmi les ordres préventifs dus à ce
   *  jour (date planifiée passée, ou non planifiés), part de ceux clôturés au
   *  plus tard à leur date planifiée. Reprise d'historique exclue. */
  const tauxRealisationPreventif = computed(() => {
    const jour = aujourdhuiISO()
    const dus = ordres.value.filter(o => o.typeMaintenance === 'preventif' && o.statut !== 'annule' && !o.repriseHistorique
      && (!o.planifieeLe || o.planifieeLe.slice(0, 10) <= jour))
    if (!dus.length) return null
    const aTemps = dus.filter(o => o.statut === 'cloture' && (!o.planifieeLe || (o.clotureLe ?? '').slice(0, 10) <= o.planifieeLe.slice(0, 10)))
    return Math.round((aTemps.length / dus.length) * 100)
  })
  /** Interventions ouvertes planifiées à venir, et celles dont la date planifiée est passée. */
  const otPlanifies = computed(() => ouverts.value.filter(o => o.planifieeLe && o.planifieeLe.slice(0, 10) >= aujourdhuiISO()))
  const otEnRetard = computed(() => ouverts.value.filter(o => o.planifieeLe && o.planifieeLe.slice(0, 10) < aujourdhuiISO()))
  /** Coût du préventif face au correctif, reprise d'historique comprise dans les coûts réels. */
  const coutParType = computed(() => {
    const acc = { preventif: 0, correctif: 0 }
    ordres.value.filter(o => o.statut !== 'annule').forEach(o => { acc[o.typeMaintenance === 'preventif' ? 'preventif' : 'correctif'] += coutOT(o) })
    return acc
  })
  /** Coût de maintenance au kilomètre sur le parc : coûts des véhicules dont le kilométrage parcouru est connu, divisés par ce kilométrage. */
  const coutParKmParc = computed(() => {
    let cout = 0; let km = 0
    new Set(ordres.value.map(o => o.vehiculeId)).forEach(id => { const k = kmSurPeriodeObservee(id); if (k) { km += k; cout += ordresDuVehicule(id).reduce((s, o) => s + coutOT(o), 0) } })
    return km ? Math.round(cout / km) : null
  })
  const compter = (champ: 'modeDefaillance' | 'causeRacine') => {
    const acc = new Map<string, number>()
    ordres.value.filter(o => o.typeMaintenance === 'correctif' && o[champ]).forEach(o => acc.set(o[champ]!, (acc.get(o[champ]!) ?? 0) + 1))
    return [...acc.entries()].map(([code, nb]) => ({ code, nb })).sort((a, b) => b.nb - a.nb)
  }
  const modesFrequents = computed(() => compter('modeDefaillance'))
  const causesRacines = computed(() => compter('causeRacine'))

  /* ══ Charge de l'atelier ═════════════════════════════════════ */
  const mecaniciensConnus = computed(() =>
    [...new Set([...techniciens.value.filter(t => t.actif).map(t => t.nom), ...ordres.value.filter(o => !o.prestataire).flatMap(o => [...o.mecaniciens, ...o.temps.map(t => t.mecanicienNom)])])].filter(Boolean).sort())
  function competenceDe(o: OrdreTravail): CompetenceAtelier | null {
    return o.sousSysteme ? (competenceParSousSysteme.value[o.sousSysteme] ?? COMPETENCE_PAR_SOUS_SYSTEME[o.sousSysteme] ?? null) : null
  }
  /* ── Compétences et techniciens de l'atelier interne ── */
  const CLE_COMP = 'fms-ucodis-competences-atelier'
  const CLE_COMP_SS = 'fms-ucodis-competence-sous-systeme'
  const CLE_TECH = 'fms-ucodis-techniciens'
  const competences = ref<{ code: string; libelle: string }[]>(Object.entries(LIB_COMPETENCE).map(([code, libelle]) => ({ code, libelle })))
  const competenceParSousSysteme = ref<Record<string, string>>({ ...COMPETENCE_PAR_SOUS_SYSTEME })
  const techniciens = ref<{ nom: string; competences: string[]; actif: boolean }[]>([
    { nom: 'Rakoto Andrianina', competences: ['mecanique', 'electricite'], actif: true },
    { nom: 'Tojo Rasoanaivo', competences: ['mecanique', 'pneumatique'], actif: true },
  ])
  try { const b = localStorage.getItem(CLE_COMP); if (b) competences.value = JSON.parse(b) } catch { /* défaut */ }
  try { const b = localStorage.getItem(CLE_COMP_SS); if (b) Object.assign(competenceParSousSysteme.value, JSON.parse(b)) } catch { /* défaut */ }
  try { const b = localStorage.getItem(CLE_TECH); if (b) techniciens.value = JSON.parse(b) } catch { /* défaut */ }
  watch(competences, v => { try { localStorage.setItem(CLE_COMP, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(competenceParSousSysteme, v => { try { localStorage.setItem(CLE_COMP_SS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(techniciens, v => { try { localStorage.setItem(CLE_TECH, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  const libelleCompetence = (code: string) => competences.value.find(c => c.code === code)?.libelle ?? code
  /** Techniciens actifs capables de l'intervention (tous si la compétence n'est pas encore connue). */
  function techniciensPour(o: OrdreTravail) {
    const c = competenceDe(o)
    return techniciens.value.filter(t => t.actif && (!c || t.competences.includes(c)))
  }
  function ajouterCompetence(libelle: string): { ok: boolean; motif?: string } {
    const l = libelle.trim(); if (!l) return { ok: false, motif: 'Indiquez le libellé de la compétence.' }
    if (competences.value.some(c => c.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Cette compétence existe déjà.' }
    const code = l.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `c${competences.value.length + 1}`
    competences.value.push({ code: competences.value.some(c => c.code === code) ? `${code}_${competences.value.length + 1}` : code, libelle: l })
    return { ok: true }
  }
  /** Libellé d'une compétence : vide ou en doublon, il est refusé. */
  function renommerCompetence(code: string, libelle: string): { ok: boolean; motif?: string } {
    const c = competences.value.find(x => x.code === code); if (!c) return { ok: false, motif: 'Compétence introuvable.' }
    const l = libelle.trim(); if (!l) return { ok: false, motif: 'Le libellé de la compétence ne peut pas être vide.' }
    if (competences.value.some(x => x.code !== code && x.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Cette compétence existe déjà.' }
    c.libelle = l
    return { ok: true }
  }
  /** Une compétence ne se supprime que si aucun technicien ni sous-système ne l'utilise. */
  function supprimerCompetence(code: string): { ok: boolean; motif?: string } {
    const nbTech = techniciens.value.filter(t => t.competences.includes(code)).length
    const nbSS = useNomenclatureStore().listes.sousSystemes.filter(e => competenceParSousSysteme.value[e.code] === code).length
    if (nbTech || nbSS) return { ok: false, motif: `Compétence utilisée par ${nbTech} technicien(s) et ${nbSS} sous-système(s) : retirez-la d'abord.` }
    competences.value = competences.value.filter(c => c.code !== code)
    return { ok: true }
  }
  function ajouterTechnicien(nom: string, comps: string[]): { ok: boolean; motif?: string } {
    const n = nom.trim(); if (!n) return { ok: false, motif: 'Indiquez le nom du technicien.' }
    if (techniciens.value.some(t => t.nom.toLowerCase() === n.toLowerCase())) return { ok: false, motif: 'Ce technicien existe déjà.' }
    if (!comps.length) return { ok: false, motif: 'Cochez au moins une compétence.' }
    techniciens.value.push({ nom: n, competences: [...comps], actif: true })
    return { ok: true }
  }
  function basculerCompetenceTechnicien(nom: string, code: string): { ok: boolean; motif?: string } {
    const t = techniciens.value.find(x => x.nom === nom); if (!t) return { ok: false, motif: 'Technicien introuvable.' }
    if (t.competences.includes(code)) {
      if (t.competences.length <= 1) return { ok: false, motif: 'Un technicien garde au moins une compétence.' }
      t.competences = t.competences.filter(c => c !== code)
    } else t.competences.push(code)
    return { ok: true }
  }
  function prioriteDe(o: OrdreTravail): number { return PRIORITE_PAR_GRAVITE[o.gravite] }
  const chargeParMecanicien = computed(() =>
    mecaniciensConnus.value.map(nom => {
      const affectes = ordres.value.filter(o => o.statut !== 'cloture' && o.statut !== 'annule' && !o.prestataire && o.mecaniciens.includes(nom))
      return {
        mecanicien: nom,
        interventions: affectes.sort((a, b) => prioriteDe(a) - prioriteDe(b)),
        heuresEstimees: affectes.reduce((s, o) => s + (o.dureeEstimeeH ?? 0), 0),
        heuresPassees: affectes.reduce((s, o) => s + heuresOT(o), 0),
      }
    }))
  const nonAffectees = computed(() => ordres.value.filter(o => o.statut !== 'cloture' && o.statut !== 'annule' && !o.prestataire && !o.mecaniciens.length))
  const chargeTotaleH = computed(() => ouverts.value.filter(o => !o.prestataire).reduce((s, o) => s + (o.dureeEstimeeH ?? 0), 0))
  function tauxOccupation(jours?: number): number | null {
    if (!capaciteHeuresParJour.value) return null
    const horizon = jours ?? parametresAtelier.value.capacite.joursOuvresParSemaine ?? 6
    const dispo = capaciteHeuresParJour.value * horizon
    return dispo ? Math.round((chargeTotaleH.value / dispo) * 100) : null
  }
  const tauxOccupationSemaine = computed(() => tauxOccupation())
  const joursPourAbsorberCharge = computed(() =>
    capaciteHeuresParJour.value ? Math.ceil(chargeTotaleH.value / capaciteHeuresParJour.value) : null)

  /** Planifie, replanifie ou réaffecte une intervention de l'atelier interne. */
  function planifier(id: string, date: string, dureeH: number, mecaniciens: string[]): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || !OT_ACTIF(o)) return { ok: false, motif: 'Intervention introuvable ou terminée.' }
    if (o.prestataire) return { ok: false, motif: 'Intervention confiée à un atelier externe : elle ne se planifie pas ici.' }
    if (!mecaniciens.length) return { ok: false, motif: 'Choisissez au moins un technicien.' }
    if (!date) return { ok: false, motif: 'Indiquez la date prévue.' }
    if (date < aujourdhuiISO()) return { ok: false, motif: 'La date prévue ne peut pas être passée.' }
    if (!(dureeH > 0)) return { ok: false, motif: 'Indiquez une durée estimée positive.' }
    o.planifieeLe = date; o.dureeEstimeeH = dureeH; o.mecaniciens = [...mecaniciens]
    return { ok: true }
  }

  /* ══ Actions ═══════════════════════════════════════════════ */
  let seqOT = 33
  /** Ouvre un ordre de travail et rend le véhicule indisponible. Un véhicule
   *  n'a qu'une indisponibilité ouverte : si elle existe déjà (sans ordre, ou
   *  liée à un autre ordre), l'ordre s'y rattache. Le code peut être imposé
   *  (accident, par exemple) ; le début peut être celui du constat. */
  function creerOT(data: Omit<OrdreTravail, 'id' | 'reference' | 'statut' | 'pieces' | 'temps' | 'mecaniciens'>, opts: { codeIndispo?: string; debut?: string } = {}) {
    let ref = ''
    do { ref = `OT-${maintenant().getFullYear()}-${String(++seqOT).padStart(4, '0')}` } while (ordres.value.some(o => o.id === ref))
    ordres.value.unshift({ ...data, id: ref, reference: ref, statut: 'ouvert', pieces: [], temps: [], mecaniciens: [] })
    const existante = indisponibilites.value.find(i => i.vehiculeId === data.vehiculeId && !i.fin)
    if (existante) {
      if (!existante.ordreTravailId) existante.ordreTravailId = ref
      else existante.autresOrdres = [...(existante.autresOrdres ?? []), ref]
      return ref
    }
    const defaut = codification.codeAuto(data.typeMaintenance === 'preventif' ? 'preventif' : 'correctif')
    const code = [opts.codeIndispo, defaut].find(c => c && codification.codes.some(x => x.code === c)) ?? codification.codes.find(x => x.famille === 'technique')?.code ?? defaut
    indisponibilites.value.unshift({
      id: nouvelIdIndispo(), vehiculeId: data.vehiculeId, vehiculePlaque: data.vehiculePlaque,
      code, famille: codification.familleDuCode(code),
      debut: opts.debut ?? maintenant().toISOString(), ordreTravailId: ref,
    })
    return ref
  }
  /** L'intervention préventive proposée à l'approche du seuil (FMS-MA-01). */
  function creerOTPreventif(v: VehiculeEcheance, operationIds: string[], par: string): { ok: boolean; motif?: string; ref?: string } {
    const plan = planDuModele(v.marque, v.modele)
    const ops = plan?.operations.filter(o => operationIds.includes(o.id)) ?? []
    if (!ops.length) return { ok: false, motif: 'Aucune opération du plan à traiter.' }
    const deja = ops.map(o => otPreventifOuvert(v.id, o.id)).find(Boolean)
    if (deja) return { ok: false, motif: `L'ordre de travail ${deja.reference} traite déjà cette opération.` }
    const ref = creerOT({ vehiculeId: v.id, vehiculePlaque: v.immatriculation, origine: 'alerte_preventive', declarePar: par, declareLe: maintenant().toISOString(),
      symptome: `Entretien préventif : ${ops.map(o => o.libelle).join(' ; ')}.`, gravite: 'mineure', typeMaintenance: 'preventif',
      sousSysteme: ops[0]!.sousSysteme, kilometrage: v.kilometrage, operationsPlan: ops.map(o => o.id) })
    return { ok: true, ref }
  }
  const codeIndispoDeLOT = (ref: string) => indispoDeLOT(ref)?.code
  /** Le préventif n'exige que le sous-système ; le correctif exige aussi le mode de défaillance et la cause racine. */
  const diagnosticComplet = (o: Pick<OrdreTravail, 'typeMaintenance' | 'sousSysteme' | 'modeDefaillance' | 'causeRacine'>) =>
    !!o.sousSysteme && (o.typeMaintenance === 'preventif' || (!!o.modeDefaillance && !!o.causeRacine))
  /** Le diagnostic ne se modifie plus une fois l'intervention déclarée terminée. */
  function diagnostiquer(id: string, d: Pick<OrdreTravail, 'sousSysteme' | 'modeDefaillance' | 'causeRacine'>, par: string): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o) return { ok: false, motif: 'Ordre introuvable.' }
    if (!OT_ACTIF(o)) return { ok: false, motif: "L'intervention est déclarée terminée : le diagnostic ne se modifie plus." }
    if (!diagnosticComplet({ typeMaintenance: o.typeMaintenance, ...d }))
      return { ok: false, motif: o.typeMaintenance === 'preventif' ? 'Choisissez le sous-système.' : 'Choisissez le sous-système, le mode de défaillance et la cause racine.' }
    Object.assign(o, d, { diagnostiquePar: par, diagnostiqueLe: maintenant().toISOString() })
    if (o.statut === 'ouvert') o.statut = 'diagnostique'
    return { ok: true }
  }
  function ajouterPanne(id: string, panne: Omit<PanneDiagnostiquee, 'id'>): boolean {
    const o = getById(id); if (!o) return false
    if (!o.pannes) o.pannes = []
    if (o.pannes.length >= MAX_PANNES_SIMULTANEES - 1) return false
    o.pannes.push({ ...panne, id: `PA-${maintenantMs()}` })
    return true
  }
  function ajouterPiece(id: string, p: Omit<PieceConsommee, 'id'>) {
    const o = getById(id); if (!o) return
    o.pieces.push({ ...p, id: `PC-${maintenantMs()}` })
    if (p.origine === 'achat') o.statut = 'attente_piece'
  }
  const OT_ACTIF = (o: OrdreTravail) => o.statut !== 'cloture' && o.statut !== 'annule' && o.statut !== 'attente_validation'
  /** Pièce consommée depuis le stock (FMS-MA-05) : le stock baisse et le mouvement trace l'ordre. */
  function consommerPiece(id: string, d: { reference: string; designation: string; quantite: number; prixUnitaireAr: number }): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || !OT_ACTIF(o)) return { ok: false, motif: "L'ordre de travail n'accepte plus de pièce." }
    if (!d.designation.trim()) return { ok: false, motif: 'Choisissez ou décrivez la pièce.' }
    if (!(d.quantite > 0)) return { ok: false, motif: 'La quantité doit être positive.' }
    const achats = useAchatsStore()
    const produit = d.reference ? achats.getProduitParReference(d.reference) : undefined
    if (!produit) return { ok: false, motif: "Cette pièce n'est pas suivie en stock : faites une demande d'achat." }
    if (produit.stockActuel < d.quantite) return { ok: false, motif: `Stock insuffisant : ${produit.stockActuel} disponible(s). Faites une demande d'achat pour le reste.` }
    achats.sortirDuStock(produit.reference, d.quantite, o.id, o.vehiculePlaque, o.kilometrage)
    ajouterPiece(id, { ...d, origine: 'stock' })
    return { ok: true }
  }
  /** Pièce manquante : demande d'achat transmise au système d'achat de l'entreprise ; l'ordre passe en attente de pièce. */
  function demanderAchat(id: string, d: { reference: string; designation: string; quantite: number; prixUnitaireAr: number }): { ok: boolean; motif?: string; ref?: string } {
    const o = getById(id); if (!o || !OT_ACTIF(o)) return { ok: false, motif: "L'ordre de travail n'accepte plus de pièce." }
    if (!d.designation.trim()) return { ok: false, motif: 'Choisissez ou décrivez la pièce.' }
    if (!(d.quantite > 0)) return { ok: false, motif: 'La quantité doit être positive.' }
    const annee = maintenant().getFullYear()
    const n = Math.max(0, ...demandes.value.filter(x => x.id.startsWith(`DA-${annee}-`)).map(x => Number(x.id.split('-')[2]) || 0)) + 1
    const ref = `DA-${annee}-${String(n).padStart(4, '0')}`
    demandes.value.push({ id: ref, ordreTravailId: o.id, reference: d.reference || '-', designation: d.designation.trim(), quantite: d.quantite,
      statut: 'demandee', dateDemande: maintenant().toISOString(), montantAr: d.prixUnitaireAr ? d.prixUnitaireAr * d.quantite : undefined })
    ajouterPiece(id, { ...d, designation: d.designation.trim(), origine: 'achat', demandeAchatId: ref })
    return { ok: true, ref }
  }
  /** Retour du système d'achat : commande passée, puis pièce reçue. */
  function suivreAchat(daId: string, etape: 'commandee' | 'receptionnee', d: { numeroBonCommande?: string; fournisseur?: string } = {}): { ok: boolean; motif?: string } {
    const da = demandes.value.find(x => x.id === daId); if (!da) return { ok: false, motif: 'Demande introuvable.' }
    const instant = maintenant().toISOString()
    if (etape === 'commandee') {
      if (da.statut !== 'demandee') return { ok: false, motif: 'Cette demande est déjà commandée.' }
      if (!d.numeroBonCommande?.trim()) return { ok: false, motif: 'Indiquez le numéro du bon de commande.' }
      Object.assign(da, { statut: 'commandee', dateCommande: instant, numeroBonCommande: d.numeroBonCommande.trim(), fournisseur: d.fournisseur?.trim() || da.fournisseur })
      return { ok: true }
    }
    if (da.statut !== 'commandee') return { ok: false, motif: 'La pièce doit être commandée avant d’être reçue.' }
    da.statut = 'receptionnee'; da.dateReception = instant
    if (da.dateCommande) da.delaiJours = delaiReception(da) ?? undefined
    const o = getById(da.ordreTravailId)
    const piece = o?.pieces.find(p => p.demandeAchatId === da.id)
    if (piece) piece.dateReception = instant
    /* Toutes les pièces reçues : l'intervention reprend. */
    if (o && o.statut === 'attente_piece' && !demandes.value.some(x => x.ordreTravailId === o.id && x.statut !== 'receptionnee' && x.statut !== 'annulee'))
      o.statut = o.mecaniciens.length || o.temps.length ? 'en_cours' : (o.sousSysteme ? 'diagnostique' : 'ouvert')
    return { ok: true }
  }
  /** Main-d'œuvre passée sur l'ordre (FMS-MA-03). */
  function ajouterTemps(id: string, d: { mecanicienNom: string; heures: number; date: string }): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || !OT_ACTIF(o)) return { ok: false, motif: "L'ordre de travail n'accepte plus de temps." }
    if (o.prestataire) return { ok: false, motif: "Intervention confiée à un atelier externe : son temps n'est pas saisi ici." }
    if (!d.mecanicienNom.trim()) return { ok: false, motif: 'Choisissez le technicien.' }
    if (!(d.heures > 0) || d.heures > 24) return { ok: false, motif: 'Indiquez un nombre d’heures entre 0 et 24.' }
    if (!d.date || d.date > isoJour(maintenant())) return { ok: false, motif: 'Indiquez une date passée ou du jour.' }
    if (d.date < o.declareLe.slice(0, 10)) return { ok: false, motif: "La date précède l'ouverture de l'ordre." }
    o.temps.push({ id: `TP-${maintenantMs()}`, mecanicienNom: d.mecanicienNom.trim(), heures: d.heures, date: d.date })
    if (!o.mecaniciens.includes(d.mecanicienNom.trim())) o.mecaniciens.push(d.mecanicienNom.trim())
    if (o.statut === 'ouvert' || o.statut === 'diagnostique') o.statut = 'en_cours'
    return { ok: true }
  }

  /** Pièce achetée pas encore reçue : l'intervention ne peut pas être terminée. */
  const piecesEnAttente = (o: OrdreTravail) =>
    demandes.value.filter(d => d.ordreTravailId === o.id && d.statut !== 'receptionnee' && d.statut !== 'annulee')
  /** Fin d'intervention, en deux temps : le technicien interne, ou
   *  l'atelier externe, déclare l'intervention terminée ; le responsable
   *  maintenance valide ensuite, ce qui clôture l'ordre, referme
   *  l'indisponibilité du véhicule et alimente le temps moyen de
   *  réparation. Le diagnostic et les travaux décrits sont exigés. */
  function cloturer(id: string, travaux: string, par: string): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o) return { ok: false, motif: 'Ordre introuvable.' }
    if (!OT_ACTIF(o)) return { ok: false, motif: "L'intervention est déjà déclarée terminée." }
    const attente = piecesEnAttente(o)
    if (o.statut === 'attente_piece' || attente.length)
      return { ok: false, motif: `L'ordre attend encore ${attente.length > 1 ? 'des pièces' : 'une pièce'} non reçue${attente.length ? ` (${attente.map(d => d.id).join(', ')})` : ''}.` }
    if (!diagnosticComplet(o))
      return { ok: false, motif: o.typeMaintenance === 'preventif' ? 'Indiquez le sous-système dans le diagnostic.' : 'Complétez le diagnostic : sous-système, mode de défaillance et cause racine.' }
    if (!travaux.trim()) return { ok: false, motif: 'Décrivez les travaux réalisés.' }
    o.statut = 'attente_validation'
    o.travauxRealises = travaux.trim()
    o.coutPiecesAr = coutOT(o)
    o.cloturePar = par
    /* La fin est déclarée au nom du technicien qui a fait le travail. */
    o.termineDeclarePar = o.prestataire ?? o.mecaniciens[0] ?? par
    o.termineDeclareLe = maintenant().toISOString()
    return { ok: true }
  }
  function validerParResponsable(id: string, par: string): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || o.statut !== 'attente_validation') return { ok: false, motif: "L'intervention n'attend pas de validation." }
    if (o.termineDeclarePar && o.termineDeclarePar.toLowerCase() === par.toLowerCase())
      return { ok: false, motif: 'La clôture se valide par une autre personne que celle qui a déclaré la fin.' }
    o.valideParResponsable = par
    o.valideParResponsableLe = maintenant().toISOString()
    o.statut = 'cloture'
    o.clotureLe = o.valideParResponsableLe
    /* L'indisponibilité se referme avec le dernier ordre ouvert qui la porte. */
    const ind = indisponibilites.value.find(i => !i.fin && ordresDeLIndispo(i).includes(id))
    if (ind) {
      const restants = ordresDeLIndispo(ind).filter(r => r !== id && getById(r) && getById(r)!.statut !== 'cloture' && getById(r)!.statut !== 'annule')
      if (restants.length) { ind.ordreTravailId = restants[0]; ind.autresOrdres = restants.slice(1) }
      else { ind.fin = o.clotureLe; ind.dureeJours = dureeIndispo(ind) }
    }
    /* Entretien préventif réalisé : l'échéance repart de ce passage. */
    const heures = useVehiculeStore().parId(o.vehiculeId)?.heuresMoteur
    o.operationsPlan?.forEach(op => enregistrerPassage(o.vehiculeId, op, o.kilometrage ?? 0, o.clotureLe!.slice(0, 10), heures))
    return { ok: true }
  }
  /** Le responsable refuse la fin déclarée : l'intervention reprend. */
  function refuserFin(id: string): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || o.statut !== 'attente_validation') return { ok: false, motif: "L'intervention n'attend pas de validation." }
    o.statut = 'en_cours'; o.termineDeclarePar = undefined; o.termineDeclareLe = undefined
    if (o.prestataire) o.retourLe = undefined
    return { ok: true }
  }

  /* ══ Reprise de l'historique ═══════════════════════════════ */
  /** Mots repérés dans un libellé libre pour proposer un sous-système de la
   *  nomenclature ; la proposition est toujours validée par une personne. */
  const MOTS_SOUS_SYSTEME: [SousSysteme, string[]][] = [
    ['freinage', ['frein', 'garniture', 'plaquette', 'tambour', 'disque']],
    ['moteur', ['moteur', 'vidange', 'huile', 'injecteur', 'culasse', 'courroie']],
    ['transmission', ['boîte', 'boite', 'embrayage', 'pont', 'cardan', 'vitesse']],
    ['electricite', ['batterie', 'alternateur', 'démarreur', 'demarreur', 'phare', 'feu', 'électri', 'electri', 'câble']],
    ['circuit_air', ['air', 'compresseur', 'valve', 'flexible']],
    ['circuit_carburant', ['gazole', 'gasoil', 'carburant', 'réservoir', 'pompe à']],
    ['direction_suspension', ['direction', 'suspension', 'amortisseur', 'ressort', 'lame', 'rotule']],
    ['roues_roulements', ['roue', 'roulement', 'pneu', 'jante', 'moyeu']],
    ['chassis_tolerie', ['châssis', 'chassis', 'tôle', 'tole', 'carrosserie', 'pare-choc', 'soudure']],
    ['refroidissement', ['radiateur', 'refroidissement', 'ventilateur', 'thermostat', 'durite']],
    ['citerne', ['citerne', 'cuve', 'compartiment', 'vanne', 'clapet', 'trou d']],
  ]
  /** Seuls les sous-systèmes actifs de la nomenclature sont proposés. */
  function proposerSousSysteme(libelle: string): SousSysteme | null {
    const t = libelle.toLowerCase()
    const actifs = new Set(useNomenclatureStore().listes.sousSystemes.filter(e => e.actif).map(e => e.code))
    return MOTS_SOUS_SYSTEME.find(([ss, mots]) => actifs.has(ss) && mots.some(m => t.includes(m)))?.[0] ?? null
  }
  /** Importe des interventions anciennes, déjà réalisées, avec leur
   *  sous-système validé : elles rejoignent l'historique du véhicule,
   *  clôturées, sans rendre le véhicule indisponible. */
  function importerHistorique(lignes: { vehiculeId: string; vehiculePlaque: string; date: string; libelle: string; coutAr: number; sousSysteme: SousSysteme }[]) {
    // Un fichier réimporté par erreur ne doit pas doubler l'historique :
    // même véhicule, même date et même description = déjà présent.
    const deja = (l: { vehiculeId: string; date: string; libelle: string }) => ordres.value.some(o =>
      o.vehiculeId === l.vehiculeId && o.declareLe.slice(0, 10) === l.date && o.symptome.trim().toLowerCase() === l.libelle.trim().toLowerCase())
    const nouvelles = lignes.filter(l => !deja(l))
    nouvelles.forEach(l => {
      const ref = `HIS-${l.date.slice(0, 7)}-${++seqOT}`
      ordres.value.push({ id: ref, reference: ref, vehiculeId: l.vehiculeId, vehiculePlaque: l.vehiculePlaque, origine: 'constat_garage',
        declarePar: "Reprise de l'historique", declareLe: l.date, symptome: l.libelle, gravite: 'mineure', typeMaintenance: 'correctif',
        sousSysteme: l.sousSysteme, statut: 'cloture', mecaniciens: [], pieces: [], temps: [], travauxRealises: l.libelle,
        repriseHistorique: true, coutRepriseAr: l.coutAr, clotureLe: l.date, valideParResponsable: "Reprise de l'historique", valideParResponsableLe: l.date })
    })
    return { importees: nouvelles.length, ignorees: lignes.length - nouvelles.length }
  }

  /* ══ Équipe mobile ═════════════════════════════════════════ */
  /** Objectifs de l'équipe mobile, paramétrables par entreprise. */
  const objectifsMobile = ref({ interventionsParMois: 10, tauxResolutionPct: 90, tempsMoyenMaxMinutes: 240, controlesParMois: 20 })
  try { const b = localStorage.getItem('fms-ucodis-objectifs-mobile'); if (b) Object.assign(objectifsMobile.value, JSON.parse(b)) } catch { /* défaut */ }
  watch(objectifsMobile, v => { try { localStorage.setItem('fms-ucodis-objectifs-mobile', JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })
  let seqMobile = 12
  /** Types de mission de l'équipe mobile, paramétrables. Les anciens codes restent reconnus. */
  const typesMissionMobile = ref<TypeMissionMobileParam[]>(TYPES_MISSION_MOBILE_DEFAUT.map(t => ({ ...t })))
  try {
    const b = localStorage.getItem('fms-ucodis-types-mission-mobile')
    if (b) {
      const lus = JSON.parse(b) as TypeMissionMobileParam[]
      /* Un type de départ absent de la liste enregistrée y est rajouté. */
      typesMissionMobile.value = [...lus, ...TYPES_MISSION_MOBILE_DEFAUT.filter(t => !lus.some(l => l.code === t.code)).map(t => ({ ...t }))]
    }
  } catch { /* défaut */ }
  watch(typesMissionMobile, v => { try { localStorage.setItem('fms-ucodis-types-mission-mobile', JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })
  const typesMissionActifs = computed(() => typesMissionMobile.value.filter(t => t.actif))
  const typeMission = (code: string) => typesMissionMobile.value.find(t => t.code === code)
  const libelleMission = (code: string) => typeMission(code)?.libelle ?? code.replace(/_/g, ' ').replace(/^./, m => m.toUpperCase())
  const estMissionControle = (code: string) => !!typeMission(code)?.controle
  const normaliserLib = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  function ajouterTypeMission(libelle: string, controle: boolean): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Saisissez le libellé du type de mission.' }
    if (typesMissionMobile.value.some(t => normaliserLib(t.libelle) === normaliserLib(l))) return { ok: false, motif: `Le type de mission « ${l} » existe déjà.` }
    let code = normaliserLib(l).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'mission'
    const base = code; let n = 2
    while (typesMissionMobile.value.some(t => t.code === code)) code = `${base}_${n++}`
    typesMissionMobile.value.push({ code, libelle: l, actif: true, controle })
    return { ok: true }
  }
  function renommerTypeMission(code: string, libelle: string): { ok: boolean; motif?: string } {
    const t = typeMission(code); if (!t) return { ok: false, motif: 'Type de mission introuvable.' }
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Le libellé du type de mission ne peut pas être vide.' }
    if (typesMissionMobile.value.some(x => x.code !== code && normaliserLib(x.libelle) === normaliserLib(l))) return { ok: false, motif: `Le type de mission « ${l} » existe déjà.` }
    t.libelle = l
    return { ok: true }
  }
  function reinitialiserTypesMission() { typesMissionMobile.value = TYPES_MISSION_MOBILE_DEFAUT.map(t => ({ ...t })) }
  /** Mission de contrôle : nombre de contrôles réalisés, de cas positifs et commentaire. */
  function saisirControlesMobile(id: string, nbControles: number | null, nbPositifs: number | null, commentaire: string): { ok: boolean; motif?: string } {
    const i = interventionsMobiles.value.find(x => x.id === id); if (!i) return { ok: false, motif: 'Intervention introuvable.' }
    if (!estMissionControle(i.type)) return { ok: false, motif: "Cette mission n'est pas une mission de contrôle." }
    if (i.clotureLe) return { ok: false, motif: 'Intervention clôturée : ses contrôles ne se modifient plus.' }
    if (nbControles == null || Number.isNaN(nbControles)) return { ok: false, motif: 'Indiquez le nombre de contrôles réalisés.' }
    if (nbPositifs == null || Number.isNaN(nbPositifs)) return { ok: false, motif: 'Indiquez le nombre de cas positifs (0 si aucun).' }
    if (nbControles < 0 || nbPositifs < 0 || !Number.isInteger(nbControles) || !Number.isInteger(nbPositifs)) return { ok: false, motif: 'Les nombres de contrôles et de cas positifs sont des entiers positifs.' }
    if (nbPositifs > nbControles) return { ok: false, motif: 'Le nombre de cas positifs ne peut pas dépasser le nombre de contrôles réalisés.' }
    i.nbControles = nbControles; i.nbPositifs = nbPositifs; i.commentaireControles = commentaire.trim() || undefined
    return { ok: true }
  }
  /** Contrôle des heures de départ et d'arrivée : passées, et l'arrivée après le départ. */
  function controleHeures(departLe: string, arriveeLe?: string): string | null {
    if (!departLe || isNaN(+new Date(departLe))) return "Indiquez l'heure de départ."
    if (+new Date(departLe) > maintenantMs()) return "L'heure de départ ne peut pas être dans le futur."
    if (arriveeLe) {
      if (isNaN(+new Date(arriveeLe))) return "Indiquez l'heure d'arrivée."
      if (+new Date(arriveeLe) > maintenantMs()) return "L'heure d'arrivée ne peut pas être dans le futur."
      if (+new Date(arriveeLe) < +new Date(departLe)) return "L'arrivée ne peut pas précéder le départ."
    }
    return null
  }
  /** Déclenche une intervention de l'équipe mobile : position du camion,
   *  équipe envoyée et heure de départ (l'instant présent par défaut). */
  function declencherMobile(d: Pick<InterventionMobile, 'type' | 'vehiculeId' | 'vehiculePlaque' | 'lieu' | 'lat' | 'lng' | 'equipe'> & { departLe?: string }): { ok: boolean; motif?: string; id?: string } {
    if (!d.type || !typeMission(d.type)?.actif) return { ok: false, motif: 'Choisissez le type de mission.' }
    if (!d.vehiculeId) return { ok: false, motif: 'Choisissez le camion à dépanner.' }
    if (!d.lieu.trim()) return { ok: false, motif: 'Indiquez la position du camion.' }
    if (!d.equipe.length) return { ok: false, motif: "Indiquez l'équipe envoyée." }
    const departLe = d.departLe ? new Date(d.departLe).toISOString() : maintenant().toISOString()
    const motif = controleHeures(departLe); if (motif) return { ok: false, motif }
    if (interventionsMobiles.value.some(i => i.vehiculeId === d.vehiculeId && !i.clotureLe))
      return { ok: false, motif: `Une intervention est déjà en cours pour ${d.vehiculePlaque}.` }
    let ref = ''
    do { ref = `IM-${maintenant().getFullYear()}-${String(++seqMobile).padStart(4, '0')}` } while (interventionsMobiles.value.some(i => i.id === ref))
    const { departLe: _d, ...reste } = d
    interventionsMobiles.value.unshift({ ...reste, lieu: d.lieu.trim(), id: ref, reference: ref, declencheLe: departLe, resolu: false })
    return { ok: true, id: ref }
  }
  /** Heures de départ et d'arrivée, modifiables jusqu'à la clôture. */
  function majHeuresMobile(id: string, d: { departLe: string; arriveeLe?: string }): { ok: boolean; motif?: string } {
    const i = interventionsMobiles.value.find(x => x.id === id); if (!i) return { ok: false, motif: 'Intervention introuvable.' }
    if (i.clotureLe) return { ok: false, motif: 'Intervention clôturée : ses heures ne se modifient plus.' }
    const departLe = d.departLe ? new Date(d.departLe).toISOString() : ''
    const arriveeLe = d.arriveeLe ? new Date(d.arriveeLe).toISOString() : undefined
    const motif = controleHeures(departLe, arriveeLe); if (motif) return { ok: false, motif }
    i.declencheLe = departLe
    i.arriveeLe = arriveeLe
    return { ok: true }
  }
  /** Arrivée de l'équipe sur place, à l'heure indiquée (l'instant présent par défaut). */
  function arriveeMobile(id: string, arriveeLe?: string): { ok: boolean; motif?: string } {
    const i = interventionsMobiles.value.find(x => x.id === id); if (!i) return { ok: false, motif: 'Intervention introuvable.' }
    return majHeuresMobile(id, { departLe: i.declencheLe, arriveeLe: arriveeLe || maintenant().toISOString() })
  }
  /** Clôture : résolue sur place, ou non résolue avec ouverture d'un ordre
   *  de travail pour le véhicule (qui devient indisponible). */
  function cloturerMobile(id: string, resolu: boolean, observation: string, ouvrirOT: boolean): { ok: boolean; motif?: string } {
    const i = interventionsMobiles.value.find(x => x.id === id); if (!i || i.clotureLe) return { ok: false, motif: 'Intervention déjà clôturée.' }
    if (!i.arriveeLe) return { ok: false, motif: "Indiquez d'abord l'heure d'arrivée de l'équipe." }
    if (!resolu && !observation.trim()) return { ok: false, motif: "Décrivez ce qui n'a pas pu être résolu." }
    i.clotureLe = maintenant().toISOString(); i.resolu = resolu; i.observation = observation.trim() || i.observation
    if (ouvrirOT && !resolu) {
      i.ordreTravailId = creerOT({ vehiculeId: i.vehiculeId, vehiculePlaque: i.vehiculePlaque, origine: 'equipe_mobile', declarePar: i.equipe[0] ?? 'Équipe mobile',
        declareLe: i.clotureLe, symptome: `Dépannage sur route (${i.lieu}) non résolu sur place.${observation.trim() ? ' ' + observation.trim() : ''}`, gravite: 'majeure', typeMaintenance: 'correctif',
        kilometrage: useVehiculeStore().parId(i.vehiculeId)?.kilometrage })
    }
    return { ok: true }
  }

  /* ══ Qualification des indisponibilités ════════════════════ */
  /** Requalifie une immobilisation avec un code de la codification de
   *  l'entreprise ; la famille suit le code. */
  function qualifierIndispo(id: string, code: string): { ok: boolean; motif?: string } {
    const i = indisponibilites.value.find(x => x.id === id); if (!i) return { ok: false, motif: 'Indisponibilité introuvable.' }
    if (!codification.codes.some(c => c.code === code)) return { ok: false, motif: 'Choisissez une cause de la codification.' }
    i.code = code; i.famille = codification.familleDuCode(code)
    return { ok: true }
  }
  /** Indisponibilité déclarée hors ordre de travail (visite, absence du
   *  conducteur, démarche administrative...). */
  function declarerIndispo(d: { vehiculeId: string; vehiculePlaque: string; code: string; debut: string; commentaire?: string }): { ok: boolean; motif?: string; id?: string } {
    if (!d.vehiculeId || !d.code || !d.debut) return { ok: false, motif: 'Indiquez le véhicule, la cause et le début.' }
    if (!codification.codes.some(c => c.code === d.code)) return { ok: false, motif: 'Choisissez une cause de la codification.' }
    if (indisponibilites.value.some(i => i.vehiculeId === d.vehiculeId && !i.fin))
      return { ok: false, motif: `${d.vehiculePlaque} est déjà indisponible : qualifiez ou levez l'indisponibilité en cours.` }
    if (isNaN(new Date(d.debut).getTime())) return { ok: false, motif: 'Indiquez le début.' }
    if (new Date(d.debut).getTime() > maintenantMs()) return { ok: false, motif: "Le début de l'indisponibilité ne peut pas être dans le futur." }
    const id = nouvelIdIndispo()
    indisponibilites.value.unshift({ id, vehiculeId: d.vehiculeId, vehiculePlaque: d.vehiculePlaque,
      code: d.code, famille: codification.familleDuCode(d.code), debut: d.debut, commentaire: d.commentaire })
    return { ok: true, id }
  }
  /** Lève une indisponibilité sans ordre de travail ; celle d'un ordre se
   *  referme à sa clôture. */
  function leverIndispo(id: string, opts: { systeme?: boolean } = {}): { ok: boolean; motif?: string } {
    const i = indisponibilites.value.find(x => x.id === id); if (!i) return { ok: false, motif: 'Indisponibilité introuvable.' }
    if (i.fin) return { ok: false, motif: 'Indisponibilité déjà levée.' }
    if (i.ordreTravailId) return { ok: false, motif: "Elle se lève à la clôture de l'ordre de travail." }
    if (i.auto && !opts.systeme) return { ok: false, motif: i.auto === 'entretienDepasse'
      ? "Elle se lève quand l'entretien dépassé est réalisé." : 'Elle se lève quand la contre-visite est conforme.' }
    /* Indisponibilité réglementaire : elle ne se lève pas tant qu'un document obligatoire reste hors validité. */
    const docsV = useDocumentsVehiculeStore()
    if (!opts.systeme && docsV.indisposAuto[i.vehiculeId] === i.id && !docsV.enRegle(i.vehiculeId))
      return { ok: false, motif: `Document obligatoire hors validité (${docsV.manquants(i.vehiculeId).map(t => t.libelle).join(', ')}) : elle se lève quand le véhicule est en règle.` }
    i.fin = maintenant().toISOString(); i.dureeJours = dureeIndispo(i)
    return { ok: true }
  }

  /* ══ Atelier externe ═══════════════════════════════════════ */
  /** Confie l'intervention à un atelier externe autorisé : l'ordre garde
   *  sa qualification (diagnostic, cause, pièces, coût), seul son
   *  exécutant change. */
  function confierAtelierExterne(id: string, d: { prestataireId: string; prestataireNom: string; remiseLe: string; retourPrevuLe?: string; montantDevisAr?: number }): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o) return { ok: false, motif: 'Ordre introuvable.' }
    if (o.statut === 'cloture' || o.statut === 'attente_validation') return { ok: false, motif: "L'intervention est déjà terminée." }
    if (d.retourPrevuLe && d.retourPrevuLe < d.remiseLe) return { ok: false, motif: 'Le retour prévu ne peut pas précéder la remise du véhicule.' }
    if (d.montantDevisAr != null && d.montantDevisAr < 0) return { ok: false, motif: 'Le montant du devis ne peut pas être négatif.' }
    o.prestataireId = d.prestataireId; o.prestataire = d.prestataireNom
    o.remiseAtelierLe = d.remiseLe; o.retourPrevuLe = d.retourPrevuLe
    if (d.montantDevisAr != null) o.montantDevisAr = d.montantDevisAr
    o.mecaniciens = []
    if (o.statut === 'ouvert' || o.statut === 'diagnostique') o.statut = 'en_cours'
    return { ok: true }
  }
  /** Suivi de l'atelier externe : avancement, retour prévu et montant du
   *  devis restent modifiables jusqu'au retour du véhicule. */
  function suivreAtelierExterne(id: string, d: { avancement?: string; retourPrevuLe?: string; montantDevisAr?: number | null }): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || !o.prestataire) return { ok: false, motif: 'Ordre introuvable.' }
    if (o.retourLe || !OT_ACTIF(o)) return { ok: false, motif: 'Le véhicule est revenu : le suivi ne se modifie plus.' }
    if (d.retourPrevuLe && o.remiseAtelierLe && d.retourPrevuLe < o.remiseAtelierLe) return { ok: false, motif: 'Le retour prévu ne peut pas précéder la remise du véhicule.' }
    if (d.montantDevisAr != null && (isNaN(d.montantDevisAr) || d.montantDevisAr < 0)) return { ok: false, motif: 'Le montant du devis ne peut pas être négatif.' }
    if (d.avancement !== undefined) o.avancementExterne = d.avancement.trim() || undefined
    if (d.retourPrevuLe !== undefined) o.retourPrevuLe = d.retourPrevuLe || undefined
    if (d.montantDevisAr !== undefined) o.montantDevisAr = d.montantDevisAr ?? undefined
    return { ok: true }
  }
  /** Retour du véhicule : l'atelier externe déclare l'intervention
   *  terminée, avec son montant final, puis le responsable valide. */
  function retourAtelierExterne(id: string, travaux: string, retourLe: string, montantFinalAr?: number | null): { ok: boolean; motif?: string } {
    const o = getById(id); if (!o || !o.prestataire) return { ok: false, motif: 'Ordre introuvable.' }
    if (!retourLe) return { ok: false, motif: 'Indiquez la date de retour du véhicule.' }
    if (o.remiseAtelierLe && retourLe < o.remiseAtelierLe) return { ok: false, motif: 'Le retour ne peut pas précéder la remise du véhicule.' }
    if (retourLe > aujourdhuiISO()) return { ok: false, motif: 'La date de retour ne peut pas être dans le futur.' }
    if (montantFinalAr != null && (isNaN(montantFinalAr) || montantFinalAr < 0)) return { ok: false, motif: 'Le montant final ne peut pas être négatif.' }
    const r = cloturer(id, travaux, o.prestataire)
    if (!r.ok) return r
    o.retourLe = retourLe
    if (montantFinalAr != null) o.montantFinalAr = montantFinalAr
    return { ok: true }
  }
  const auxAteliersExternes = computed(() => ordres.value.filter(o => o.prestataireId && o.statut !== 'cloture' && o.statut !== 'annule'))

  return {
    codeIndispoDeLOT, indispoDeLOT, ordresDeLIndispo, diagnosticComplet, piecesEnAttente, preavisHeures, majPreavisHeures, planDe,
    renommerCompetence, supprimerCompetence, majHeuresMobile, ordres, getById, ouverts, enAttentePiece, ordresDuVehicule,
    coutOT, coutPieces, coutSousTraitance, coutMainOeuvre, tarifHoraireDe, heuresOT,
    demandes, demandesDeLOT, delaiReception, consommerPiece, demanderAchat, suivreAchat, ajouterTemps, creerOTPreventif, otPreventifOuvert, renseignerPassage, echeancesDe,
    indisponibilites, indisposEnCours, indisposDuVehicule, dureeIndispo,
    joursPerdusParFamille, ratioHumainTechnique,
    coutIndispo, coutJournalierDe, coutParFamille, coutTotalImmobilisations,
    interventionsMobiles, mobilesEnCours,
    plans, getPlan, planDuModele, echeancesDuVehicule, echeancesDuParc, PREAVIS_KM, PREAVIS_JOURS,
    derniersPassages, passagesDe, enregistrerPassage,
    creerPlan, majPlan, basculerPlanActif, supprimerPlan, dupliquerPlan,
    ajouterOperation, majOperation, supprimerOperation,
    mttrHeures, mtbfKm, ratioPreventif, pannesParSousSysteme, coutTotal, coutMainOeuvreTotal, tauxRealisationPreventif,
    mtbfParSousSysteme, tauxDisponibilite, joursPerdusSurPeriode, otPlanifies, otEnRetard, coutParType, coutParKmParc, modesFrequents, causesRacines, coutParKmObserve, topVehiculesProblematiques, pannesSurRoute,
    kmAnnuelEstime, joursImmoPour10000km, coutCumuleParVehicule,
    mecaniciensConnus, competenceDe, competences, competenceParSousSysteme, techniciens, libelleCompetence, techniciensPour, ajouterCompetence, ajouterTechnicien, basculerCompetenceTechnicien, prioriteDe, chargeParMecanicien,
    nonAffectees, chargeTotaleH, tauxOccupation, tauxOccupationSemaine, joursPourAbsorberCharge, planifier,
    parametresAtelier, majParametresAtelier, capaciteRenseignee,
    VALEURS_SIMULATION, marquerSaisiParClient, restaurerSimulation, estSimule, groupesSimules,
    capaciteHeuresParJour, capaciteHeuresParSemaine, tarifRenseigne, coutImmoRenseigne,
    creerOT, diagnostiquer, ajouterPiece, ajouterPanne, cloturer, validerParResponsable, refuserFin,
    qualifierIndispo, declarerIndispo, leverIndispo,
    proposerSousSysteme, importerHistorique,
    objectifsMobile, declencherMobile, arriveeMobile, cloturerMobile,
    typesMissionMobile, typesMissionActifs, libelleMission, estMissionControle, ajouterTypeMission, renommerTypeMission, reinitialiserTypesMission, saisirControlesMobile,
    confierAtelierExterne, suivreAtelierExterne, retourAtelierExterne, auxAteliersExternes,
  }
})
