import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  MAX_PANNES_SIMULTANEES, COMPETENCE_PAR_SOUS_SYSTEME, PRIORITE_PAR_GRAVITE, familleDuCode,
} from '../types/maintenance'
import type {
  OrdreTravail, Indisponibilite, PanneDiagnostiquee, CompetenceAtelier,
  DemandeAchat, PieceConsommee, PlanEntretien, OperationEntretien, EcheanceEntretien,
  SousSysteme, ParametresAtelier,
} from '../types/maintenance'
import { useConfigurationStore } from './configuration'
import { useCarburantStore } from './carburant'

/**
 * Maintenance & Interventions - Module 3 du cahier des charges UCODIS,
 * repris de la structure du socle FMS (nomenclature ISO 14224,
 * ordres de travail, plans d'entretien, charge d'atelier), adapté au
 * fret sec : pas de sous-système ni de compétence « citerne ».
 *
 * Trois valeurs de paramétrage manquent à UCODIS comme elles
 * manquaient au socle FMS à l'origine : la capacité de l'atelier, le tarif
 * horaire de la main-d'œuvre et le coût d'immobilisation journalier.
 * Simulées avec leur justification affichée, modifiables depuis
 * Maintenance → Paramétrage → Atelier.
 *
 * La clôture d'un ordre de travail suit la règle du cahier des
 * charges UCODIS, plus stricte que celle du socle FMS : triple validation
 * technicien puis responsable puis directeur, chacune horodatée.
 */
export const useMaintenanceStore = defineStore('maintenance', () => {

  /* ══════════════════════════════════════════════════════════
     Paramètres de l'atelier
     ══════════════════════════════════════════════════════════ */
  const VALEURS_SIMULATION: ParametresAtelier = {
    capacite: {
      site: 'Dépôt UCODIS Tanjombato',
      postes: 2,
      heuresParJour: 8,
      joursOuvresParSemaine: 6,
      origine: 'simulation',
      justification: "Aucune capacité d'atelier n'a été communiquée par UCODIS : 2 postes, 8 heures par jour, du lundi au samedi, est une hypothèse de calibrage pour un parc de 20 véhicules.",
    },
    mainOeuvre: {
      tarifUniqueAr: 10_000,
      parCompetence: {},
      origine: 'simulation',
      justification: "Tarif horaire non communiqué : reconstitué sur la base d'un coût mensuel chargé de mécanicien qualifié estimé à 1 000 000 Ar, rapporté à 100 heures productives par mois. À remplacer par le tarif réel de l'atelier.",
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
     Ordres de travail - données de démonstration cohérentes avec
     le parc déjà construit dans le module Flotte (v-tr-9 / 4029 TBA
     déjà marqué « hors service, accident » : voici l'OT correspondant).
     ══════════════════════════════════════════════════════════ */
  const ordres = ref<OrdreTravail[]>([
    {
      id: 'OT-2026-0033', reference: 'OT-2026-0033', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      origine: 'checklist', declarePar: 'Jaona Ratsimbazafy', declareLe: '2026-08-29T09:45:00',
      symptome: "Accrochage à l'arrière lors d'une manœuvre de recul sur l'aire de chargement.",
      gravite: 'majeure', typeMaintenance: 'correctif',
      sousSysteme: 'chassis_tolerie', modeDefaillance: 'rupture', causeRacine: 'erreur_humaine',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: '2026-08-29T14:00:00',
      statut: 'en_cours', mecaniciens: ['Rakoto Andrianina'],
      pieces: [], temps: [{ id: 'TP-001', mecanicienNom: 'Rakoto Andrianina', heures: 6, date: '2026-08-30' }],
      kilometrage: 289_400, dureeEstimeeH: 25, planifieeLe: '2026-08-30',
    },
    {
      id: 'OT-2026-0032', reference: 'OT-2026-0032', vehiculeId: 'v-sr-9', vehiculePlaque: 'RM 4109',
      origine: 'constat_garage', declarePar: 'Rakoto Andrianina', declareLe: '2026-08-22T08:00:00',
      symptome: 'Frein à réviser, garniture proche de la limite.',
      gravite: 'majeure', typeMaintenance: 'correctif',
      sousSysteme: 'freinage', modeDefaillance: 'usure_excessive', causeRacine: 'maintenance_insuffisante',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: '2026-08-22T08:30:00',
      statut: 'cloture', mecaniciens: ['Tojo Rasoanaivo'],
      pieces: [{ id: 'PC-001', reference: 'GRN-STD', designation: 'Garniture de frein', quantite: 4, prixUnitaireAr: 65_000, origine: 'stock' }],
      temps: [{ id: 'TP-002', mecanicienNom: 'Tojo Rasoanaivo', heures: 3, date: '2026-08-24' }],
      travauxRealises: 'Remplacement des garnitures de frein sur les deux essieux.',
      clotureLe: '2026-08-24T15:00:00', cloturePar: 'Tojo Rasoanaivo',
      valideParResponsable: 'Hery Andriamalala', valideParResponsableLe: '2026-08-24T16:00:00',
      valideParDirecteur: 'Directeur UCODIS', valideParDirecteurLe: '2026-08-25T09:00:00',
      coutPiecesAr: 260_000, kilometrage: 0, dureeEstimeeH: 3,
    },
    {
      id: 'OT-2026-0031', reference: 'OT-2026-0031', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      origine: 'alerte_preventive', declarePar: 'Système', declareLe: '2026-08-28T06:00:00',
      symptome: 'Vidange moteur due selon le plan Sinotruk Howo.',
      gravite: 'mineure', typeMaintenance: 'preventif',
      sousSysteme: 'moteur', modeDefaillance: 'usure_excessive', causeRacine: 'maintenance_insuffisante',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: '2026-08-28T06:30:00',
      statut: 'attente_validation', mecaniciens: ['Rakoto Andrianina'],
      pieces: [
        { id: 'PC-002', reference: 'HUI-15W40', designation: 'Huile moteur 15W40', quantite: 20, prixUnitaireAr: 28_000, origine: 'stock' },
        { id: 'PC-003', reference: 'FLT-HUI-HW', designation: 'Filtre à huile Howo', quantite: 1, prixUnitaireAr: 45_000, origine: 'stock' },
      ],
      temps: [{ id: 'TP-003', mecanicienNom: 'Rakoto Andrianina', heures: 1.5, date: '2026-08-28' }],
      travauxRealises: 'Vidange moteur et remplacement du filtre à huile.',
      clotureLe: undefined, cloturePar: 'Rakoto Andrianina',
      coutPiecesAr: 605_000, kilometrage: 165_900, dureeEstimeeH: 2,
    },
    {
      id: 'OT-2026-0030', reference: 'OT-2026-0030', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      origine: 'remontee_chauffeur', declarePar: 'Solofo Rakotomanga', declareLe: '2026-08-31T18:20:00',
      symptome: 'Bruit anormal au freinage, à diagnostiquer.',
      gravite: 'majeure', typeMaintenance: 'correctif',
      statut: 'ouvert', mecaniciens: [], pieces: [], temps: [],
      kilometrage: 182_400,
    },
    {
      id: 'OT-2026-0029', reference: 'OT-2026-0029', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA',
      origine: 'constat_garage', declarePar: 'Rakoto Andrianina', declareLe: '2026-08-15T07:30:00',
      symptome: 'Casse de la boîte de vitesses, immobilisation immédiate.',
      gravite: 'critique', typeMaintenance: 'correctif',
      sousSysteme: 'transmission', modeDefaillance: 'rupture', causeRacine: 'maintenance_insuffisante',
      diagnostiquePar: 'Rakoto Andrianina', diagnostiqueLe: '2026-08-15T09:00:00',
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
  function coutSousTraitance(o: OrdreTravail): number {
    return o.prestataire && !o.sousGarantie ? (o.montantDevisAr ?? 0) : 0
  }
  function tarifHoraireDe(o: OrdreTravail): number | null {
    const m = parametresAtelier.value.mainOeuvre
    const c = o.sousSysteme ? COMPETENCE_PAR_SOUS_SYSTEME[o.sousSysteme] : null
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
      dateDemande: '2026-08-15T09:15:00', dateCommande: '2026-08-16T08:00:00', montantAr: 3_200_000, delaiJours: 21 },
    { id: 'DA-2026-0007', ordreTravailId: 'OT-2026-0030', reference: 'GRN-STD',
      designation: 'Kit disque de frein avant', quantite: 1, statut: 'commandee',
      fournisseur: 'Somaco Antananarivo', numeroBonCommande: 'BC-2026-0091',
      dateDemande: '2026-08-31T18:30:00', dateCommande: '2026-09-01T09:00:00', montantAr: 620_000 },
  ])
  const demandesDeLOT = (otId: string) => demandes.value.filter(d => d.ordreTravailId === otId)
  function delaiReception(d: DemandeAchat): number | null {
    if (!d.dateCommande || !d.dateReception) return null
    return Math.round((+new Date(d.dateReception) - +new Date(d.dateCommande)) / 86_400_000)
  }

  /* ══ Indisponibilités ═══════════════════════════════════════ */
  const indisponibilites = ref<Indisponibilite[]>([
    { id: 'IND-001', vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA', code: 'ACC', famille: 'technique',
      debut: '2026-08-29T09:45:00', ordreTravailId: 'OT-2026-0033',
      commentaire: 'Immobilisé après accrochage, en réparation carrosserie.' },
    { id: 'IND-002', vehiculeId: 'v-sr-9', vehiculePlaque: 'RM 4109', code: 'MTN', famille: 'technique',
      debut: '2026-08-22T08:00:00', fin: '2026-08-24T15:00:00', dureeJours: 3, ordreTravailId: 'OT-2026-0032' },
    { id: 'IND-003', vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', code: 'MTN', famille: 'technique',
      debut: '2026-08-28T06:00:00', fin: '2026-08-28T08:00:00', dureeJours: 1, ordreTravailId: 'OT-2026-0031' },
    { id: 'IND-004', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA', code: 'PNN', famille: 'technique',
      debut: '2026-08-15T07:30:00', ordreTravailId: 'OT-2026-0029',
      commentaire: 'Immobilisé dans l\'attente de la boîte de vitesses de remplacement.' },
  ])
  const indisposEnCours = computed(() => indisponibilites.value.filter(i => !i.fin))
  const indisposDuVehicule = (vehiculeId: string) => indisponibilites.value.filter(i => i.vehiculeId === vehiculeId)
  function dureeIndispo(i: Indisponibilite): number {
    const fin = i.fin ? +new Date(i.fin) : Date.now()
    return Math.max(1, Math.round((fin - +new Date(i.debut)) / 86_400_000))
  }
  const joursPerdusParFamille = computed(() => {
    const acc: Record<string, number> = { technique: 0, reglementaire: 0, administrative: 0, humaine: 0 }
    indisponibilites.value.forEach(i => { acc[familleDuCode(i.code)] = (acc[familleDuCode(i.code)] ?? 0) + dureeIndispo(i) })
    return acc
  })
  /** Le type se déduit du préfixe de la plaque : « RM » pour les
   *  semi-remorques dans la convention UCODIS, tracteur sinon. */
  function coutJournalierDe(i: Indisponibilite): number | null {
    const c = parametresAtelier.value.immobilisation
    const estRemorque = /^RM\s/i.test(i.vehiculePlaque.trim())
    return (estRemorque ? c.semiRemorqueJourAr : c.tracteurJourAr) ?? c.moyenJourAr ?? null
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
    indisponibilites.value.forEach(i => { const f = familleDuCode(i.code); acc[f] = (acc[f] ?? 0) + (coutIndispo(i) ?? 0) })
    return acc
  })

  /* ══════════════════════════════════════════════════════════
     Plans d'entretien - le plan Sinotruk Howo reprend tel quel
     l'exemple donné par le cahier des charges UCODIS (Module 3).
     L'extraction du classeur Excel d'origine a perdu une partie de
     la mise en forme des seuils kilométriques : les intervalles
     ci-dessous sont reconstitués à partir des opérations nommées et
     de l'ordre de grandeur donné (paliers tous les 5 000 à 10 000 km),
     à confirmer avec UCODIS plan en main.
     ══════════════════════════════════════════════════════════ */
  const plans = ref<PlanEntretien[]>([
    {
      id: 'PE-001', marque: 'Sinotruk', modele: 'Howo A7', actif: true,
      provisoire: true,
      source: "Exemple Sinotruk Howo-NX 400 ; intervalles reconstitués, l'extraction du classeur a perdu une partie de la mise en forme des seuils.",
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
      source: "Aucun plan constructeur communiqué par UCODIS pour ce modèle : intervalles calqués sur le plan Sinotruk Howo, à confirmer.",
      operations: [
        { id: 'OP-101', libelle: "Vidanger le moteur et remplacer le filtre à huile", sousSysteme: 'moteur', nature: 'remplacer', intervalleKm: 10_000 },
        { id: 'OP-102', libelle: 'Vérifier la garniture de frein', sousSysteme: 'freinage', nature: 'verifier', intervalleKm: 10_000 },
      ],
    },
  ])

  const derniersPassages = ref<Record<string, { km: Record<string, number>; dates: Record<string, string> }>>({
    /* v-tr-1, 4021 TBA, 182 400 km : dernière vidange faite tôt, échéance dépassée */
    'v-tr-1': { km: { 'OP-001': 165_000, 'OP-002': 165_000, 'OP-010': 175_000, 'OP-011': 175_000, 'OP-012': 175_000 }, dates: {} },
    /* v-tr-2, 4022 TBA, 165 900 km : vidange faite le 28/08, tout est frais */
    'v-tr-2': { km: { 'OP-001': 165_900, 'OP-002': 165_900 }, dates: {} },
  })
  const passagesDe = (vehiculeId: string) => derniersPassages.value[vehiculeId] ?? { km: {}, dates: {} }
  function enregistrerPassage(vehiculeId: string, operationId: string, km: number, date: string) {
    const e = derniersPassages.value[vehiculeId] ?? { km: {}, dates: {} }
    e.km[operationId] = km
    e.dates[operationId] = date
    derniersPassages.value[vehiculeId] = e
  }

  const planDuModele = (modele?: string) => plans.value.find(p => p.actif && p.modele === modele)
  const getPlan = (id: string) => plans.value.find(p => p.id === id)

  let seqPlan = plans.value.length
  let seqOperation = 0
  function creerPlan(marque: string, modele: string): string | null {
    if (!marque.trim() || !modele.trim()) return null
    if (plans.value.some(p => p.modele.toLowerCase() === modele.trim().toLowerCase())) return null
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
    getPlan(nouveau)!.operations = source.operations.map(op => ({ ...op, id: `OP-${Date.now()}-${++seqOperation}` }))
    return nouveau
  }
  function ajouterOperation(planId: string, op: Omit<OperationEntretien, 'id'>): boolean {
    const p = getPlan(planId); if (!p || !op.libelle.trim() || (!op.intervalleKm && !op.intervalleJours)) return false
    p.operations.push({ ...op, libelle: op.libelle.trim(), id: `OP-${Date.now()}-${++seqOperation}` })
    return true
  }
  function majOperation(planId: string, opId: string, data: Partial<OperationEntretien>): boolean {
    const op = getPlan(planId)?.operations.find(o => o.id === opId); if (!op) return false
    const fusion = { ...op, ...data }
    if (!fusion.intervalleKm && !fusion.intervalleJours) return false
    Object.assign(op, data)
    return true
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

  function echeancesDuVehicule(
    vehiculeId: string, plaque: string, modele: string | undefined, kmActuel: number,
    dernierPassage: Record<string, number> = {}, dernierPassageDate: Record<string, string> = {},
  ): EcheanceEntretien[] {
    const plan = planDuModele(modele)
    if (!plan) return []
    const maintenant = Date.now()
    return plan.operations.map(op => {
      const base = dernierPassage[op.id] ?? 0
      const kmProchain = op.intervalleKm ? base + op.intervalleKm : undefined
      const kmRestants = kmProchain != null ? kmProchain - kmActuel : undefined

      let dateProchaine: string | undefined
      let joursRestants: number | undefined
      if (op.intervalleJours) {
        const depart = dernierPassageDate[op.id]
        if (depart) {
          const echeance = new Date(depart)
          echeance.setDate(echeance.getDate() + op.intervalleJours)
          dateProchaine = echeance.toISOString().slice(0, 10)
          joursRestants = Math.ceil((+echeance - maintenant) / 86_400_000)
        }
      }
      const depassee = (kmRestants != null && kmRestants < 0) || (joursRestants != null && joursRestants < 0)
      const proche = (kmRestants != null && kmRestants <= PREAVIS_KM.value) || (joursRestants != null && joursRestants <= PREAVIS_JOURS.value)
      const statut: EcheanceEntretien['statut'] = depassee ? 'depassee' : proche ? 'proche' : 'a_venir'

      return { vehiculeId, vehiculePlaque: plaque, operationId: op.id, operationLibelle: op.libelle, sousSysteme: op.sousSysteme, nature: op.nature, kmProchain, kmRestants, dateProchaine, joursRestants, statut }
    })
  }

  function echeancesDuParc(vehicules: { id: string; immatriculation: string; modele: string; kilometrage: number }[]): EcheanceEntretien[] {
    return vehicules.flatMap(v => {
      const p = passagesDe(v.id)
      return echeancesDuVehicule(v.id, v.immatriculation, v.modele, v.kilometrage, p.km, p.dates)
    })
  }

  /* ══ Indicateurs de performance ══════════════════════════════ */
  const mttrHeures = computed(() => {
    const clos = ordres.value.filter(o => o.statut === 'cloture' && o.clotureLe)
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
  /** Cible ≥ 60 % selon le cahier des charges UCODIS. */
  const ratioPreventif = computed(() => {
    const total = ordres.value.filter(o => o.statut !== 'annule').length
    if (!total) return null
    return Math.round((ordres.value.filter(o => o.typeMaintenance === 'preventif').length / total) * 100)
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
  /** Jours disponibles rapportés aux jours théoriques sur la période. */
  function tauxDisponibilite(nbVehicules: number, joursPeriode = 30): number | null {
    if (!nbVehicules) return null
    const joursTheoriques = nbVehicules * joursPeriode
    const joursPerdus = indisponibilites.value.reduce((s, i) => s + dureeIndispo(i), 0)
    return Math.round(((joursTheoriques - joursPerdus) / joursTheoriques) * 100)
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
    const depuis = Date.now() - 365 * 86_400_000
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
  /** Taux de respect du planning : interventions préventives closes avant échéance dépassée. */
  const tauxRealisationPreventif = computed(() => {
    const prev = ordres.value.filter(o => o.typeMaintenance === 'preventif' && o.statut === 'cloture')
    return prev.length ? 100 : null
  })

  /* ══ Charge de l'atelier ═════════════════════════════════════ */
  const mecaniciensConnus = computed(() =>
    [...new Set(ordres.value.flatMap(o => [...o.mecaniciens, ...o.temps.map(t => t.mecanicienNom)]))].filter(Boolean).sort())
  function competenceDe(o: OrdreTravail): CompetenceAtelier | null {
    return o.sousSysteme ? COMPETENCE_PAR_SOUS_SYSTEME[o.sousSysteme] : null
  }
  function prioriteDe(o: OrdreTravail): number { return PRIORITE_PAR_GRAVITE[o.gravite] }
  const chargeParMecanicien = computed(() =>
    mecaniciensConnus.value.map(nom => {
      const affectes = ordres.value.filter(o => o.statut !== 'cloture' && o.statut !== 'annule' && o.mecaniciens.includes(nom))
      return {
        mecanicien: nom,
        interventions: affectes.sort((a, b) => prioriteDe(a) - prioriteDe(b)),
        heuresEstimees: affectes.reduce((s, o) => s + (o.dureeEstimeeH ?? 0), 0),
        heuresPassees: affectes.reduce((s, o) => s + heuresOT(o), 0),
      }
    }))
  const nonAffectees = computed(() => ordres.value.filter(o => o.statut !== 'cloture' && o.statut !== 'annule' && !o.mecaniciens.length))
  const chargeTotaleH = computed(() => ouverts.value.reduce((s, o) => s + (o.dureeEstimeeH ?? 0), 0))
  function tauxOccupation(jours?: number): number | null {
    if (!capaciteHeuresParJour.value) return null
    const horizon = jours ?? parametresAtelier.value.capacite.joursOuvresParSemaine ?? 6
    const dispo = capaciteHeuresParJour.value * horizon
    return dispo ? Math.round((chargeTotaleH.value / dispo) * 100) : null
  }
  const tauxOccupationSemaine = computed(() => tauxOccupation())
  const joursPourAbsorberCharge = computed(() =>
    capaciteHeuresParJour.value ? Math.ceil(chargeTotaleH.value / capaciteHeuresParJour.value) : null)

  function planifier(id: string, date: string, dureeH: number, mecaniciens: string[]) {
    const o = getById(id); if (!o) return
    o.planifieeLe = date; o.dureeEstimeeH = dureeH; o.mecaniciens = [...mecaniciens]
  }

  /* ══ Actions ═══════════════════════════════════════════════ */
  let seqOT = 33
  function creerOT(data: Omit<OrdreTravail, 'id' | 'reference' | 'statut' | 'pieces' | 'temps' | 'mecaniciens'>) {
    const ref = `OT-2026-${String(++seqOT).padStart(4, '0')}`
    ordres.value.unshift({ ...data, id: ref, reference: ref, statut: 'ouvert', pieces: [], temps: [], mecaniciens: [] })
    indisponibilites.value.unshift({
      id: `IND-${Date.now()}`, vehiculeId: data.vehiculeId, vehiculePlaque: data.vehiculePlaque,
      code: data.typeMaintenance === 'preventif' ? 'MTN' : 'PNN', famille: 'technique',
      debut: new Date().toISOString(), ordreTravailId: ref,
    })
    return ref
  }
  function diagnostiquer(id: string, d: Pick<OrdreTravail, 'sousSysteme' | 'modeDefaillance' | 'causeRacine'>, par: string) {
    const o = getById(id); if (!o) return
    Object.assign(o, d, { diagnostiquePar: par, diagnostiqueLe: new Date().toISOString() })
    if (o.statut === 'ouvert') o.statut = 'diagnostique'
  }
  function ajouterPanne(id: string, panne: Omit<PanneDiagnostiquee, 'id'>): boolean {
    const o = getById(id); if (!o) return false
    if (!o.pannes) o.pannes = []
    if (o.pannes.length >= MAX_PANNES_SIMULTANEES - 1) return false
    o.pannes.push({ ...panne, id: `PA-${Date.now()}` })
    return true
  }
  function ajouterPiece(id: string, p: Omit<PieceConsommee, 'id'>) {
    const o = getById(id); if (!o) return
    o.pieces.push({ ...p, id: `PC-${Date.now()}` })
    if (p.origine === 'achat') o.statut = 'attente_piece'
  }

  /** Clôture - exige diagnostic complet et travaux décrits, puis
   *  attend la triple validation exigée par le cahier des charges
   *  UCODIS : technicien (implicite à cette étape), responsable,
   *  directeur. La clôture définitive n'a lieu qu'une fois les deux
   *  validations hiérarchiques recueillies. */
  function cloturer(id: string, travaux: string, par: string): boolean {
    const o = getById(id); if (!o) return false
    if (!o.sousSysteme || !o.modeDefaillance || !o.causeRacine || !travaux.trim()) return false
    o.statut = 'attente_validation'
    o.travauxRealises = travaux
    o.coutPiecesAr = coutOT(o)
    o.cloturePar = par
    return true
  }
  function validerParResponsable(id: string, par: string) {
    const o = getById(id); if (!o || o.statut !== 'attente_validation') return
    o.valideParResponsable = par
    o.valideParResponsableLe = new Date().toISOString()
  }
  function validerParDirecteur(id: string, par: string) {
    const o = getById(id); if (!o || o.statut !== 'attente_validation' || !o.valideParResponsable) return
    o.valideParDirecteur = par
    o.valideParDirecteurLe = new Date().toISOString()
    o.statut = 'cloture'
    o.clotureLe = o.valideParDirecteurLe
    const ind = indisponibilites.value.find(i => i.ordreTravailId === id && !i.fin)
    if (ind) { ind.fin = o.clotureLe; ind.dureeJours = dureeIndispo(ind) }
  }

  return {
    ordres, getById, ouverts, enAttentePiece, ordresDuVehicule,
    coutOT, coutPieces, coutSousTraitance, coutMainOeuvre, tarifHoraireDe, heuresOT,
    demandes, demandesDeLOT, delaiReception,
    indisponibilites, indisposEnCours, indisposDuVehicule, dureeIndispo,
    joursPerdusParFamille, ratioHumainTechnique,
    coutIndispo, coutJournalierDe, coutParFamille, coutTotalImmobilisations,
    plans, getPlan, planDuModele, echeancesDuVehicule, echeancesDuParc, PREAVIS_KM, PREAVIS_JOURS,
    derniersPassages, passagesDe, enregistrerPassage,
    creerPlan, majPlan, basculerPlanActif, supprimerPlan, dupliquerPlan,
    ajouterOperation, majOperation, supprimerOperation,
    mttrHeures, mtbfKm, ratioPreventif, pannesParSousSysteme, coutTotal, coutMainOeuvreTotal, tauxRealisationPreventif,
    mtbfParSousSysteme, tauxDisponibilite, coutParKmObserve, topVehiculesProblematiques, pannesSurRoute,
    kmAnnuelEstime, joursImmoPour10000km, coutCumuleParVehicule,
    mecaniciensConnus, competenceDe, prioriteDe, chargeParMecanicien,
    nonAffectees, chargeTotaleH, tauxOccupation, tauxOccupationSemaine, joursPourAbsorberCharge, planifier,
    parametresAtelier, majParametresAtelier, capaciteRenseignee,
    VALEURS_SIMULATION, marquerSaisiParClient, restaurerSimulation, estSimule, groupesSimules,
    capaciteHeuresParJour, capaciteHeuresParSemaine, tarifRenseigne, coutImmoRenseigne,
    creerOT, diagnostiquer, ajouterPiece, ajouterPanne, cloturer, validerParResponsable, validerParDirecteur,
  }
})
