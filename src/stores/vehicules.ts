import { aujourdhuiISO, maintenant, decaler } from '../utils/horloge'
import { defineStore } from 'pinia'
import { useDisponibilitesStore } from './disponibilites'
import { useSitesStore } from './sites'
import { ref, computed, watch } from 'vue'
import type { Vehicule, Attelage, AffectationVehicule, StatutVehicule, EquipementEmbarque, PieceJointe, Compartiment } from '../types'
import { useTypesVehiculesStore } from './typesVehicules'
import { useTypesEquipementsStore } from './typesEquipements'
import { usePersonnelStore } from './personnel'
import { useVoyagesStore } from './voyages'
import { useTrajetsStore } from './trajets'
import { CITERNES_DEMO, EQUIPEMENTS_DEMO } from './donneesCarburant'

export type StatutOperationnel = 'en_mouvement' | 'arrete' | 'allume_immobile' | 'signal_perdu'

/**
 * Parc de démonstration : dix tracteurs, dix semi-remorques et quatre citernes.
 * Un seul objet Véhicule porte tous les types, distingués par le champ
 * « type », dont le rôle (motorisé, tracté, compartiments) vient du
 * référentiel paramétrable des types de véhicules.
 */
const TRACTEURS: Array<[string, string, string, StatutVehicule, string | undefined, number]> = [
  ['4021 TBA', 'Sinotruk', 'Howo A7',      'disponible',        undefined,               182_400],
  ['4022 TBA', 'Sinotruk', 'Howo A7',      'affecte',      undefined,               165_900],
  ['4023 TBA', 'Sinotruk', 'Howo A7',      'affecte',      undefined,               201_300],
  ['4024 TBA', 'Foton',    'Auman EST',    'affecte',      undefined,                98_500],
  ['4025 TBA', 'Foton',    'Auman EST',    'en_maintenance', 'Casse boîte de vitesse', 244_100],
  ['4026 TBA', 'Foton',    'Auman EST',    'affecte',      undefined,               176_700],
  ['4027 TBA', 'Howo',     'T7H',          'disponible',        undefined,                54_200],
  ['4028 TBA', 'Howo',     'T7H',          'affecte',      undefined,               132_800],
  ['4029 TBA', 'Howo',     'T7H',          'hors_service', 'Accident, expertise en cours', 289_400],
  ['4030 TBA', 'Dongfeng', 'KL',           'affecte',      undefined,               112_600],
]

const SEMI_REMORQUES: Array<[string, string, string, StatutVehicule, number]> = [
  ['RM 4101', 'Guillaume', 'Fourgon 3 essieux',  'disponible',   0],
  ['RM 4102', 'Guillaume', 'Fourgon 3 essieux',  'affecte', 0],
  ['RM 4103', 'Guillaume', 'Fourgon 3 essieux',  'affecte', 0],
  ['RM 4104', 'Schmitz',   'Plateau 3 essieux',  'affecte', 0],
  ['RM 4105', 'Schmitz',   'Plateau 3 essieux',  'affecte', 0],
  ['RM 4106', 'Schmitz',   'Plateau 3 essieux',  'affecte', 0],
  ['RM 4107', 'Krone',     'Bâchée 3 essieux',   'disponible',   0],
  ['RM 4108', 'Krone',     'Bâchée 3 essieux',   'affecte', 0],
  ['RM 4109', 'Krone',     'Bâchée 3 essieux',   'disponible',      0],
  ['RM 4110', 'Guillaume', 'Fourgon 3 essieux',  'affecte', 0],
]

function seedVehicules(): Vehicule[] {
  const out: Vehicule[] = []
  TRACTEURS.forEach(([immat, marque, modele, statut, motif, km], i) => {
    out.push({
      id: `v-tr-${i + 1}`, immatriculation: immat,
      vin: `LZGJTR${(2024000 + i).toString()}`, type: 'tracteur',
      marque, modele, categorie: 'Tracteur routier', carburant: 'Diesel',
      capaciteReservoirL: marque === 'Sinotruk' || (marque === 'Foton' && i !== 4) ? 500 : marque === 'Dongfeng' ? 450 : 400,
      /* Deux bases de rattachement, pour que les rapports se comparent d'un site à l'autre. */
      site: i % 2 === 1 && i < 9 ? 'Entrepôt Tanjombato' : 'Dépôt Tanjombato', statut, motifIndisponibilite: motif, kilometrage: km,
      annee: 2021 + (i % 4), dateMiseEnCirculation: `${2021 + (i % 4)}-0${(i % 9) + 1}-15`,
      modeAcquisition: i % 3 === 0 ? 'leasing' : 'achat',
      coutAcquisitionAr: 185_000_000 + i * 4_000_000,
      valeurResiduelleAr: Math.max(20_000_000, 185_000_000 + i * 4_000_000 - km * 350),
      mensualiteAr: i % 3 === 0 ? 4_200_000 : undefined, prestataireAcquisitionId: i % 3 === 0 ? 'PRS-009' : undefined,
      dateAcquisition: `${2021 + (i % 4)}-0${(i % 9) + 1}-10`,
      statutManuel: statut === 'hors_service' ? { statut: 'hors_service', motif: motif ?? '', par: 'Hery Andriamalala', le: decaler('2026-08-29T10:00:00') } : undefined,
    })
  })
  SEMI_REMORQUES.forEach(([immat, marque, modele, statut, km], i) => {
    out.push({
      id: `v-sr-${i + 1}`, immatriculation: immat,
      vin: `LZGJSR${(2024000 + i).toString()}`, type: 'semi_remorque',
      marque, modele, categorie: 'Semi-remorque', carburant: 'Sans objet',
      chargeMaxKg: 32_000, volumeMaxM3: 86, site: i % 2 === 1 && i < 9 ? 'Entrepôt Tanjombato' : 'Dépôt Tanjombato',
      statut, motifIndisponibilite: undefined, kilometrage: km,
      annee: 2020 + (i % 5), dateMiseEnCirculation: `${2020 + (i % 5)}-0${(i % 9) + 1}-01`,
      modeAcquisition: 'achat', coutAcquisitionAr: 58_000_000 + i * 1_500_000,
      valeurResiduelleAr: 58_000_000 + i * 1_500_000 - 12_000_000,
    })
  })
  out.push({
    id: 'v-ct-1', immatriculation: 'CT 4201', vin: 'LZGJCT2024000', type: 'citerne', marque: 'Schmitz', modele: 'Citerne 3 compartiments',
    categorie: 'Citerne', carburant: 'Sans objet', chargeMaxKg: 30_000, site: 'Dépôt Tanjombato', statut: 'disponible', kilometrage: 0,
    annee: 2023, dateMiseEnCirculation: decaler('2023-03-01'), modeAcquisition: 'achat', coutAcquisitionAr: 96_000_000, valeurResiduelleAr: 80_000_000,
    compartiments: [{ numero: 1, volumeL: 12_000 }, { numero: 2, volumeL: 10_000 }, { numero: 3, volumeL: 8_000, produit: 'Essence sans plomb' }],
  })
  /* Citernes de la livraison de carburant. */
  CITERNES_DEMO.forEach(c => out.push(JSON.parse(JSON.stringify(c)) as Vehicule))
  return out
}

const CLE_PARC = 'fms-ucodis-parc'

export const useVehiculeStore = defineStore('vehicules', () => {
  const typesVeh = useTypesVehiculesStore()
  const typesEq = useTypesEquipementsStore()
  const liste = ref<Vehicule[]>(seedVehicules())
  const attelages = ref<Attelage[]>([])
  const affectations = ref<AffectationVehicule[]>([])

  /** Équipements embarqués : boîtier + GPS par tracteur, cohérent avec la
   *  Carte temps réel et la Télémétrie déjà simulées, plus un détecteur
   *  de fatigue sur trois véhicules. */
  const equipements = ref<EquipementEmbarque[]>(
    liste.value.filter(v => v.type === 'tracteur').flatMap((v, i) => {
      const echeance = (mois: number) => `2027-0${(i % 6) + 1}-${String(10 + mois).padStart(2, '0')}`
      const out: EquipementEmbarque[] = [
        { id: `eq-obc-${i + 1}`, vehiculeId: v.id, type: 'obc', numeroSerie: `OBC-${2024000 + i}`, etat: v.statut === 'hors_service' ? 'hors_service' : 'operationnel' },
        { id: `eq-gps-${i + 1}`, vehiculeId: v.id, type: 'gps', numeroSerie: `GPS-${2024000 + i}`, etat: v.statut === 'hors_service' ? 'hors_service' : 'operationnel' },
      ]
      if (i % 3 !== 1) out.push({ id: `eq-dms-${i + 1}`, vehiculeId: v.id, type: 'dms', numeroSerie: `DMS-${3024000 + i}`, etat: 'operationnel' })
      out.push({ id: `eq-ext-${i + 1}`, vehiculeId: v.id, type: 'extincteur', numeroSerie: `EXT-${5024000 + i}`, etat: 'operationnel', echeance: i === 3 ? decaler('2026-08-31') : i === 6 ? decaler('2026-09-20') : echeance(i) })
      out.push({ id: `eq-kap-${i + 1}`, vehiculeId: v.id, type: 'kit_antipollution', etat: 'operationnel', echeance: echeance(i + 3) })
      return out
    }).concat(EQUIPEMENTS_DEMO.map(e => ({ ...e }))),
  )

  const equipementsDe = (vehiculeId: string) => equipements.value.filter(e => e.vehiculeId === vehiculeId)

  /** Véhicules motorisés (tracteurs et porteurs) et véhicules tractés, selon leur type paramétré. */
  /* Les véhicules sortis du parc restent consultables dans les archives, pas dans l'exploitation (FMS-DB-07). */
  const tracteurs = computed(() => liste.value.filter(v => typesVeh.estMotorise(v.type) && v.statut !== 'sorti'))
  const semiRemorques = computed(() => liste.value.filter(v => typesVeh.estTracte(v.type) && v.statut !== 'sorti'))

  const LIBELLES_STATUT: Record<StatutVehicule, string> = {
    disponible: 'Disponible', affecte: 'Affecté', en_mission: 'En mission', en_maintenance: 'En maintenance',
    immobilise: 'Immobilisé', hors_service: 'Hors service', sorti: 'Sorti du parc',
  }
  /** Un véhicule hors service, immobilisé, en maintenance ou sorti n'est pas proposé. */
  const INDISPONIBLES: StatutVehicule[] = ['hors_service', 'immobilise', 'en_maintenance', 'sorti']
  const estUtilisable = (v: Vehicule) => !INDISPONIBLES.includes(v.statut)

  const disponibles = computed(() => liste.value.filter(v => v.statut === 'disponible'))
  const enCirculation = computed(() => liste.value.filter(v => v.statut === 'affecte' || v.statut === 'en_mission'))
  const immobilises = computed(() => liste.value.filter(v => v.statut === 'en_maintenance' || v.statut === 'immobilise' || v.statut === 'hors_service'))
  const archives = computed(() => liste.value.filter(v => v.statut === 'sorti'))
  const auParc = computed(() => liste.value.filter(v => v.statut !== 'sorti'))

  function parId(id: string) { return liste.value.find(v => v.id === id) ?? null }
  /** Capacité du réservoir, saisie dans la fiche véhicule. */
  function modifierCapaciteReservoir(id: string, litres: number | undefined) {
    const v = parId(id); if (v) v.capaciteReservoirL = litres && litres > 0 ? litres : undefined
  }
  /** Conducteur affecté au véhicule à une date donnée (affectation en vigueur ce jour-là). */
  function conducteurAffecteLe(vehiculeId: string, dateISO: string) {
    const jour = dateISO.slice(0, 10)
    return affectations.value.find(a => a.vehiculeId === vehiculeId && a.dateDebut.slice(0, 10) <= jour && (!a.dateFin || a.dateFin.slice(0, 10) >= jour))?.conducteurId ?? null
  }

  const tracteursLibres = computed(() => tracteurs.value.filter(t => typesVeh.get(t.type)?.attelage === 'tracte' && !attelageActif(t.id) && estUtilisable(t)))
  const semiRemorquesLibres = computed(() => semiRemorques.value.filter(s => !attelageDe(s.id) && estUtilisable(s)))
  const tracteursSansConducteur = computed(() => tracteurs.value.filter(t => !affectationActive(t.id) && estUtilisable(t)))

  function attelageActif(tracteurId: string) {
    return attelages.value.find(a => a.tracteurId === tracteurId && !a.dateFin) ?? null
  }
  function attelageDe(vehiculeId: string) {
    return attelages.value.find(a => (a.tracteurId === vehiculeId || a.semiRemorqueId === vehiculeId) && !a.dateFin) ?? null
  }
  function affectationActive(vehiculeId: string) {
    return affectations.value.find(a => a.vehiculeId === vehiculeId && !a.dateFin) ?? null
  }

  /* ── Rattachements de démonstration : un tracteur, sa remorque et son
     conducteur, dans l'ordre des listes · cohérent avec le personnel
     déjà créé (dix conducteurs, fonctionId 'f-cond'). */
  function initialiserDemonstration() {
    const personnel = usePersonnelStore()
    const conducteurs = personnel.conducteurs
    tracteurs.value.forEach((tr, i) => {
      const sr = semiRemorques.value[i]
      if (sr && tr.statut !== 'hors_service') {
        attelages.value.push({ id: `at-${i + 1}`, tracteurId: tr.id, semiRemorqueId: sr.id, dateDebut: decaler('2025-01-10') })
      }
      const cond = conducteurs[i]
      if (cond && (tr.statut === 'affecte' || tr.statut === 'disponible')) {
        affectations.value.push({ id: `af-${i + 1}`, vehiculeId: tr.id, conducteurId: cond.id, dateDebut: decaler('2025-01-10') })
      }
    })
  }
  /* Le parc, ses attelages, ses affectations et ses équipements sont conservés d'une session à l'autre. */
  let charge = false
  try {
    const b = localStorage.getItem(CLE_PARC)
    if (b) {
      const d = JSON.parse(b)
      liste.value = d.liste; attelages.value = d.attelages; affectations.value = d.affectations; equipements.value = d.equipements
      charge = true
    }
  } catch { /* défaut */ }
  if (!charge) initialiserDemonstration()
  /* Parc enregistré avant l'ajout des citernes de démonstration : elles le complètent. */
  CITERNES_DEMO.filter(c => !liste.value.some(v => v.id === c.id)).forEach(c => liste.value.push(JSON.parse(JSON.stringify(c)) as Vehicule))
  EQUIPEMENTS_DEMO.filter(e => !equipements.value.some(x => x.id === e.id)).forEach(e => equipements.value.push({ ...e }))
  watch([liste, attelages, affectations, equipements], () => {
    try { localStorage.setItem(CLE_PARC, JSON.stringify({ liste: liste.value, attelages: attelages.value, affectations: affectations.value, equipements: equipements.value })) } catch { /* stockage plein */ }
  }, { deep: true })

  const nouvelId = (prefixe: string, existants: { id: string }[]) => { let n = existants.length + 1; while (existants.some(x => x.id === `${prefixe}-${n}`)) n++; return `${prefixe}-${n}` }

  /** FMS-DB-10 · atteler : seuls des véhicules réellement libres et de rôles compatibles. */
  function atteler(tracteurId: string, semiRemorqueId: string, dateDebut: string): { ok: boolean; motif?: string } {
    const t = parId(tracteurId); const r = parId(semiRemorqueId)
    if (!t || !r) return { ok: false, motif: 'Choisissez le tracteur et la remorque.' }
    if (typesVeh.get(t.type)?.attelage !== 'tracte') return { ok: false, motif: `${t.immatriculation} ne tire pas de remorque.` }
    if (!typesVeh.estTracte(r.type)) return { ok: false, motif: `${r.immatriculation} ne s'attelle pas à un tracteur.` }
    if (attelageActif(tracteurId)) return { ok: false, motif: `${t.immatriculation} est déjà attelé.` }
    if (attelageDe(semiRemorqueId)) return { ok: false, motif: `${r.immatriculation} est déjà attelée.` }
    for (const v of [t, r]) if (!estUtilisable(v)) return { ok: false, motif: `${v.immatriculation} n'est pas disponible (${LIBELLES_STATUT[v.statut].toLowerCase()}).` }
    if (!dateDebut) return { ok: false, motif: "Indiquez la date de début de l'attelage." }
    /* Le nouvel attelage ne peut pas commencer avant la fin d'un attelage passé de l'un des deux véhicules. */
    const chevauche = attelages.value.find(a => a.dateFin && (a.tracteurId === tracteurId || a.semiRemorqueId === semiRemorqueId) && dateDebut < a.dateFin.slice(0, 10))
    if (chevauche) {
      const autre = parId(chevauche.tracteurId === tracteurId ? chevauche.semiRemorqueId : chevauche.tracteurId)?.immatriculation ?? ''
      const veh = chevauche.tracteurId === tracteurId ? t.immatriculation : r.immatriculation
      return { ok: false, motif: `${veh} était attelé à ${autre} jusqu'au ${new Date(chevauche.dateFin!).toLocaleDateString('fr-FR')} : choisissez une date de début à partir de cette date.` }
    }
    attelages.value.push({ id: nouvelId('at-perso', attelages.value), tracteurId, semiRemorqueId, dateDebut })
    return { ok: true }
  }
  /** Le détachement date une fin, il ne supprime jamais l'attelage. */
  function dételer(attelageId: string, dateFin: string): { ok: boolean; motif?: string } {
    const a = attelages.value.find(x => x.id === attelageId)
    if (!a) return { ok: false, motif: 'Attelage introuvable.' }
    if (!dateFin) return { ok: false, motif: 'Indiquez la date de fin.' }
    if (dateFin < a.dateDebut.slice(0, 10)) return { ok: false, motif: "La fin ne peut pas précéder le début de l'attelage." }
    const voyage = useVoyagesStore().voyages.find(v => v.statut === 'en_cours' && (v.vehiculeId === a.tracteurId || v.semiRemorqueId === a.semiRemorqueId))
    if (voyage) return { ok: false, motif: `Un voyage est en cours avec cet ensemble (${voyage.reference}).` }
    a.dateFin = dateFin
    return { ok: true }
  }

  /** US 1.4.1 · affecter un camion à un conducteur ; un seul conducteur actif par camion. */
  function affecterConducteur(vehiculeId: string, conducteurId: string, dateDebut: string, base?: string): { ok: boolean; motif?: string } {
    const v = parId(vehiculeId); if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
    if (affectationActive(vehiculeId)) return { ok: false, motif: `${v.immatriculation} a déjà un conducteur affecté.` }
    if (affectations.value.some(a => a.conducteurId === conducteurId && !a.dateFin)) return { ok: false, motif: 'Ce conducteur est déjà affecté à un autre véhicule.' }
    if (!estUtilisable(v)) return { ok: false, motif: `${v.immatriculation} n'est pas disponible (${LIBELLES_STATUT[v.statut].toLowerCase()}).` }
    /* Les règles d'éligibilité s'appliquent quel que soit l'écran d'origine (FMS-DB-09, DB-11). */
    const elig = useDisponibilitesStore().eligibilite(conducteurId, vehiculeId, dateDebut)
    if (!elig.ok) return { ok: false, motif: elig.motif }
    affectations.value.push({ id: nouvelId('af-perso', affectations.value), vehiculeId, conducteurId, dateDebut })
    if (base) v.site = base
    return { ok: true }
  }
  function changerBase(vehiculeId: string, base: string) { const v = parId(vehiculeId); if (v && base) v.site = base }
  function retirerAffectation(affectationId: string, dateFin: string): { ok: boolean; motif?: string } {
    const a = affectations.value.find(x => x.id === affectationId)
    if (!a) return { ok: false, motif: 'Affectation introuvable.' }
    if (!dateFin || dateFin < a.dateDebut.slice(0, 10)) return { ok: false, motif: "La fin ne peut pas précéder le début de l'affectation." }
    a.dateFin = dateFin
    return { ok: true }
  }

  /** L'identifiant interne est généré ici et ne se modifie jamais (FMS-DB-01). */
  function creer(saisie: Omit<Vehicule, 'id'>) {
    const id = nouvelId('v-perso', liste.value)
    liste.value.push({ ...saisie, id })
    /* Un véhicule motorisé ajouté est à l'arrêt ; il n'a pas encore de boîtier,
     * donc pas de position : elle apparaît dès qu'un boîtier opérationnel lui est déclaré. */
    if (typesVeh.estMotorise(saisie.type)) statutsOp.value[id] = 'arrete'
    return id
  }
  /** FMS-DB-04 · nouvelle immatriculation, l'ancienne reste dans l'historique avec la date du changement. */
  function changerImmatriculation(id: string, nouvelle: string, par: string, motif?: string): { ok: boolean; motif?: string } {
    const v = parId(id); if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
    const n = nouvelle.trim().toUpperCase()
    if (!n) return { ok: false, motif: 'Indiquez la nouvelle immatriculation.' }
    if (n === v.immatriculation) return { ok: false, motif: "C'est déjà l'immatriculation du véhicule." }
    const autre = liste.value.find(x => x.id !== id && (x.immatriculation === n || x.historiqueImmatriculations?.some(h => h.ancienne === n)))
    if (autre) return { ok: false, motif: `L'immatriculation ${n} est déjà portée ou a été portée par un autre véhicule.` }
    ;(v.historiqueImmatriculations ??= []).push({ ancienne: v.immatriculation, nouvelle: n, le: maintenant().toISOString(), par, motif: motif?.trim() || undefined })
    v.immatriculation = n
    return { ok: true }
  }
  function ajouterPhoto(id: string, photo: PieceJointe) { const v = parId(id); if (v) (v.photos ??= []).push(photo) }
  function retirerPhoto(id: string, index: number) { const v = parId(id); if (v?.photos) v.photos.splice(index, 1) }
  /** Compartiments d'une citerne : volumes précis, numérotés dans l'ordre. */
  function definirCompartiments(id: string, compartiments: Compartiment[]): { ok: boolean; motif?: string } {
    const v = parId(id); if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
    if (!typesVeh.aCompartiments(v.type)) return { ok: false, motif: "Ce type de véhicule n'a pas de compartiments." }
    if (!compartiments.length) return { ok: false, motif: 'Une citerne a au moins un compartiment.' }
    if (compartiments.some(c => !Number.isFinite(c.volumeL) || c.volumeL <= 0)) return { ok: false, motif: 'Chaque compartiment a un volume positif, en litres.' }
    v.compartiments = compartiments.map((c, i) => ({ ...c, numero: i + 1 }))
    return { ok: true }
  }
  /* ── Équipements embarqués (FMS-DB-05) ── */
  function ajouterEquipement(d: Omit<EquipementEmbarque, 'id' | 'etat'>): { ok: boolean; motif?: string } {
    if (!parId(d.vehiculeId)) return { ok: false, motif: 'Véhicule introuvable.' }
    const def = typesEq.get(d.type); if (!def) return { ok: false, motif: "Choisissez le type d'équipement." }
    if (def.avecEcheance && !d.echeance) return { ok: false, motif: `${def.libelle} : indiquez son échéance.` }
    if (d.numeroSerie && equipements.value.some(e => e.numeroSerie === d.numeroSerie!.trim() && e.etat !== 'desinstalle')) return { ok: false, motif: 'Ce numéro de série est déjà installé sur un véhicule.' }
    equipements.value.push({ ...d, numeroSerie: d.numeroSerie?.trim() || undefined, id: nouvelId('eq-perso', equipements.value), etat: 'operationnel' })
    synchroniserPosition(d.vehiculeId)
    return { ok: true }
  }
  function modifierEquipement(id: string, d: Partial<Pick<EquipementEmbarque, 'etat' | 'echeance' | 'numeroSerie'>>): { ok: boolean; motif?: string } {
    const e = equipements.value.find(x => x.id === id); if (!e) return { ok: false, motif: 'Équipement introuvable.' }
    if (typesEq.get(e.type)?.avecEcheance && d.echeance === '') return { ok: false, motif: "Cet équipement doit garder une échéance." }
    Object.assign(e, d)
    synchroniserPosition(e.vehiculeId)
    return { ok: true }
  }
  const aPompe = (vehiculeId: string) => equipementsDe(vehiculeId).some(e => e.type === 'pompe' && e.etat === 'operationnel')

  /** Sortie du parc : réversible, jamais une suppression. Exclut le
   *  véhicule des listes courantes, des affectations et des indicateurs
   *  de disponibilité sans rien effacer de son historique. */
  /** Sortie du parc (FMS-DB-07) : une date et un motif ; le véhicule passe dans les archives sans rien perdre de son historique. */
  function sortirDuParc(vehiculeId: string, saisie: { motif: string; date: string; par: string; kilometrageSortie?: number; commentaire?: string }): { ok: boolean; motif?: string } {
    const v = parId(vehiculeId)
    if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
    if (v.sortie) return { ok: false, motif: 'Ce véhicule est déjà sorti du parc.' }
    if (!saisie.motif.trim()) return { ok: false, motif: 'Indiquez le motif de la sortie.' }
    if (!saisie.date) return { ok: false, motif: 'Indiquez la date de la sortie.' }
    if (saisie.date > aujourdhuiISO()) return { ok: false, motif: 'La date de sortie ne peut pas être future.' }
    if (!saisie.par.trim()) return { ok: false, motif: 'Indiquez qui a décidé la sortie.' }
    if (saisie.kilometrageSortie != null && saisie.kilometrageSortie < 0) return { ok: false, motif: 'Le kilométrage ne peut pas être négatif.' }
    if (attelageDe(vehiculeId)) return { ok: false, motif: 'Dételez ce véhicule avant de le sortir du parc.' }
    if (affectationActive(vehiculeId)) return { ok: false, motif: 'Retirez son affectation avant de le sortir du parc.' }
    v.statut = 'sorti'
    v.sortie = { ...saisie, motif: saisie.motif.trim(), par: saisie.par.trim(), commentaire: saisie.commentaire?.trim() || undefined }
    return { ok: true }
  }

  /* ══════════════════════════════════════════════════════════════
   * Position et télémétrie : DONNÉES SIMULÉES.
   *
   * Tant qu'aucun boîtier n'est raccordé, la position et les mesures
   * embarquées sont générées côté client. Un véhicule en voyage suit le
   * tracé de son voyage (les sites de ses étapes) ; sans voyage, il suit
   * le premier trajet de référence disponible. Le scénario de
   * démonstration ajoute un détour, un arrêt prolongé, des excès de vitesse
   * et quelques signaux du boîtier et de la caméra, pour que les détections
   * aient de quoi s'exercer.
   * ══════════════════════════════════════════════════════════════ */

  /** Tracé de repli : utilisé seulement si aucun trajet de référence n'existe. */
  const CORRIDOR_RN2 = [
    { lat: -18.8792, lng: 47.5079 },
    { lat: -18.9333, lng: 47.9333 },
    { lat: -18.6667, lng: 48.9833 },
    { lat: -18.1492, lng: 49.4023 },
  ]
  /** Minutes simulées par pas de simulation : sert à mesurer la durée des arrêts et des écarts. */
  const MINUTES_PAR_PAS = 2

  interface PositionSimulee { lat: number; lng: number; vitesse: number; waypoint: number; progres: number; arretRestant?: number; cap?: number }
  const positions = ref<Record<string, PositionSimulee>>({})
  const statutsOp = ref<Record<string, StatutOperationnel>>({})
  const simulationActive = ref(false)
  /** Compteur de pas : la télématique s'y abonne pour traiter chaque nouvelle remontée. */
  const pas = ref(0)
  /** Signaux ponctuels remontés au dernier pas (boîtier, caméra, diagnostic). */
  const signauxBoitier = ref<{ vehiculeId: string; code: string; valeur?: number }[]>([])
  let minuteur: ReturnType<typeof setInterval> | null = null

  /** Scénario de démonstration, par véhicule : détour sur un segment, arrêt prolongé, survitesse. */
  const SCENARIO: Record<string, { detourSegment?: number; arretSegment?: number; arretPas?: number; biaisVitesse?: number }> = {
    'v-tr-3': { detourSegment: 1, arretSegment: 2, arretPas: 16 },
    'v-tr-6': { biaisVitesse: 32 },
  }

  function traceDe(vehiculeId: string): { lat: number; lng: number }[] {
    const voyage = useVoyagesStore().voyages.find(v => v.vehiculeId === vehiculeId && v.statut === 'en_cours')
    const pts = voyage ? [...voyage.etapes].sort((a, b) => a.ordre - b.ordre).map(e => ({ lat: e.lat, lng: e.lng })) : []
    if (pts.length >= 2) return pts
    const trajet = useTrajetsStore().trajets.find(t => t.statut === 'actif' && t.etapes.length >= 2)
    return trajet ? trajet.etapes.map(e => ({ lat: e.lat, lng: e.lng })) : CORRIDOR_RN2
  }

  /** Seul un véhicule équipé d'un boîtier opérationnel a une position : aucune n'est inventée pour les autres. */
  /** Boîtier déclaré : le véhicule remonte sa première position, sur sa base ;
   *  boîtier retiré ou hors service : sa position disparaît. */
  function synchroniserPosition(id: string) {
    const v = parId(id)
    if (!v || !typesVeh.estMotorise(v.type)) return
    if (!aBoitier(id)) { delete positions.value[id]; return }
    if (positions.value[id]) return
    const base = useSitesStore().sites.find(x => x.nom === v.site)
    const depart = base ? { lat: base.lat, lng: base.lng } : traceDe(id)[0]
    if (depart) positions.value[id] = { lat: depart.lat, lng: depart.lng, vitesse: 0, waypoint: 0, progres: 0 }
  }
  function initPositions() {
    tracteurs.value.forEach((t, i) => {
      if (!aBoitier(t.id)) { statutsOp.value[t.id] = 'arrete'; return }
      const trace = traceDe(t.id)
      /* En voyage, le véhicule reprend après sa dernière étape franchie. */
      const voyage = useVoyagesStore().voyages.find(v => v.vehiculeId === t.id && v.statut === 'en_cours')
      const franchies = voyage ? [...voyage.etapes].sort((a, b) => a.ordre - b.ordre).map(e => e.franchi) : []
      const w = trace.length < 2 ? 0 : voyage && franchies.length === trace.length
        ? Math.max(0, Math.min(trace.length - 2, franchies.lastIndexOf(true)))
        : i % (trace.length - 1)
      const depart = trace[w]!
      statutsOp.value[t.id] = (t.statut === 'affecte' || t.statut === 'en_mission')
        ? (i % 4 === 3 ? 'signal_perdu' : i % 3 === 0 ? 'allume_immobile' : 'en_mouvement')
        : 'arrete'
      positions.value[t.id] = { lat: depart.lat, lng: depart.lng, vitesse: statutsOp.value[t.id] === 'en_mouvement' ? 55 : 0, waypoint: w, progres: 0 }
    })
  }
  initPositions()

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

  function avancerVehicule(id: string, index: number) {
    const statut = statutsOp.value[id]
    const pos = positions.value[id]
    /* Un véhicule devenu indisponible en cours de route s'arrête. */
    const v = parId(id)
    /* Boîtier retiré ou hors service : plus aucune position remontée. */
    if (!aBoitier(id)) { delete positions.value[id]; return }
    if (pos && v && !estUtilisable(v) && statut !== 'arrete') { statutsOp.value[id] = 'arrete'; pos.vitesse = 0; return }
    if (!pos || (statut !== 'en_mouvement' && !(statut === 'allume_immobile' && pos.arretRestant))) return
    const sc = SCENARIO[id] ?? {}
    if (pos.arretRestant) {
      pos.arretRestant--
      pos.vitesse = 0
      statutsOp.value[id] = pos.arretRestant ? 'allume_immobile' : 'en_mouvement'
      return
    }
    const trace = traceDe(id)
    if (trace.length < 2) return
    const avant = pos.progres
    pos.progres += 0.05
    if (sc.arretSegment === pos.waypoint && avant < 0.5 && pos.progres >= 0.5 && sc.arretPas) {
      pos.arretRestant = sc.arretPas
      statutsOp.value[id] = 'allume_immobile'
    }
    if (pos.progres >= 1) { pos.progres = 0; pos.waypoint = (pos.waypoint + 1) % (trace.length - 1) }
    const de = trace[pos.waypoint]!
    const vers = trace[pos.waypoint + 1] ?? trace[0]!
    let lat = lerp(de.lat, vers.lat, pos.progres)
    let lng = lerp(de.lng, vers.lng, pos.progres)
    if (sc.detourSegment === pos.waypoint && pos.progres > 0.25 && pos.progres < 0.75) {
      const bosse = Math.sin(((pos.progres - 0.25) / 0.5) * Math.PI) * 0.07
      const dx = vers.lng - de.lng, dy = vers.lat - de.lat
      const n = Math.hypot(dx, dy) || 1
      lat += (dx / n) * bosse
      lng -= (dy / n) * bosse
    }
    pos.lat = lat; pos.lng = lng
    pos.vitesse = pos.arretRestant ? 0 : Math.round(55 + Math.sin(pos.progres * Math.PI * 4) * 20 + (sc.biaisVitesse ?? 0))
    /* Signaux ponctuels du boîtier et de la caméra, à intervalle régulier et décalé par véhicule. */
    const cycle = (pas.value + index * 7) % 45
    if (cycle === 0) signauxBoitier.value.push({ vehiculeId: id, code: 'FREINAGE', valeur: 0.52 })
    if (cycle === 15) signauxBoitier.value.push({ vehiculeId: id, code: 'ACCEL', valeur: 0.41 })
    if (cycle === 30 && equipements.value.some(e => e.vehiculeId === id && e.type === 'dms' && e.etat === 'operationnel'))
      signauxBoitier.value.push({ vehiculeId: id, code: ['CEINTURE', 'TELEPHONE', 'SOMNOLENCE'][pas.value % 3]! })
  }

  function demarrerSimulation() {
    if (minuteur) return
    simulationActive.value = true
    minuteur = setInterval(() => {
      signauxBoitier.value = []
      /* Un véhicule parti en mission depuis le chargement se met en route. */
      tracteurs.value.forEach(t => { if (t.statut === 'en_mission' && statutsOp.value[t.id] === 'arrete' && aBoitier(t.id)) statutsOp.value[t.id] = 'en_mouvement' })
      tracteurs.value.forEach(t => synchroniserPosition(t.id))
      tracteurs.value.forEach((t, i) => avancerVehicule(t.id, i))
      pas.value++
    }, 1500)
  }
  function arreterSimulation() {
    simulationActive.value = false
    if (minuteur) { clearInterval(minuteur); minuteur = null }
  }

  /** Lecture de télémétrie simulée pour un tracteur · kilométrage, carburant, moteur, code défaut, signal. */
  /** Deux ou trois camions immobilisés n'ont jamais de remontée : un tracteur
   *  sans télémétrie l'affiche honnêtement plutôt que de masquer l'absence
   *  de donnée. */
  /** Le véhicule remonte des données s'il a un boîtier (GPS ou ordinateur de bord) déclaré et opérationnel (FMS-DB-05). */
  function aBoitier(vehiculeId: string) {
    const v = parId(vehiculeId)
    if (!v || v.statut === 'hors_service' || v.statut === 'sorti') return false
    return equipements.value.some(e => e.vehiculeId === vehiculeId && (e.type === 'gps' || e.type === 'obc') && e.etat === 'operationnel')
  }

  function telemetrieDe(vehiculeId: string) {
    const v = parId(vehiculeId)
    if (!v || !aBoitier(vehiculeId)) return null
    const statutOp = statutsOp.value[vehiculeId] ?? 'arrete'
    const pos = positions.value[vehiculeId]
    const seed = vehiculeId.charCodeAt(vehiculeId.length - 1)
    return {
      kilometrage: v.kilometrage,
      niveauCarburant: Math.max(8, 90 - (seed * 7) % 85),
      etatMoteur: statutOp === 'en_mouvement' || statutOp === 'allume_immobile',
      signalOk: statutOp !== 'signal_perdu',
      vitesse: pos?.vitesse ?? 0,
      derniereMAJ: maintenant().toISOString(),
    }
  }

  /** Cinq derniers relevés espacés de 35 minutes, cohérents avec la lecture courante. */
  function historiqueTelemetrie(vehiculeId: string) {
    const actuel = telemetrieDe(vehiculeId)
    if (!actuel) return []
    const out: { horodatage: string; kilometrage: number; niveauCarburant: number; etatMoteur: boolean }[] = []
    const maintenant = new Date(actuel.derniereMAJ)
    for (let i = 0; i < 5; i++) {
      const h = new Date(maintenant.getTime() - i * 35 * 60_000)
      out.push({
        horodatage: h.toISOString(),
        kilometrage: actuel.kilometrage - i * 12,
        niveauCarburant: Math.min(100, actuel.niveauCarburant + i * 4),
        etatMoteur: i === 0 ? actuel.etatMoteur : true,
      })
    }
    return out
  }

  return {
    liste, tracteurs, semiRemorques, attelages, affectations, LIBELLES_STATUT, modifierCapaciteReservoir, conducteurAffecteLe,
    disponibles, enCirculation, immobilises, archives, auParc,
    tracteursLibres, semiRemorquesLibres, tracteursSansConducteur,
    parId, attelageActif, attelageDe, affectationActive, atteler, dételer, affecterConducteur, retirerAffectation,
    creer, sortirDuParc, changerImmatriculation, ajouterPhoto, retirerPhoto, definirCompartiments, changerBase, estUtilisable,
    equipements, equipementsDe, ajouterEquipement, modifierEquipement, aPompe,
    positions, statutsOp, simulationActive, demarrerSimulation, arreterSimulation,
    aBoitier, telemetrieDe, historiqueTelemetrie, CORRIDOR_RN2, traceDe, pas, signauxBoitier, MINUTES_PAR_PAS,
  }
})
