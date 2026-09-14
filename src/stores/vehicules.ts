import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Vehicule, Attelage, AffectationVehicule, StatutVehicule, EquipementEmbarque } from '../types'
import { usePersonnelStore } from './personnel'

export type StatutOperationnel = 'en_mouvement' | 'arrete' | 'allume_immobile' | 'signal_perdu'

/**
 * Parc UCODIS Transport : dix tracteurs et dix semi-remorques, comme le
 * décrit le cahier des charges (feuille Sommaires, section I). Un seul
 * objet Véhicule porte les deux, distingué par le champ « type » · voir
 * le point à trancher n°3 du document de user stories.
 *
 * VIN et immatriculations sont fictifs mais au format malgache courant.
 */
const TRACTEURS: Array<[string, string, string, StatutVehicule, string | undefined, number]> = [
  ['4021 TBA', 'Sinotruk', 'Howo A7',      'actif',        undefined,               182_400],
  ['4022 TBA', 'Sinotruk', 'Howo A7',      'affecte',      undefined,               165_900],
  ['4023 TBA', 'Sinotruk', 'Howo A7',      'affecte',      undefined,               201_300],
  ['4024 TBA', 'Foton',    'Auman EST',    'affecte',      undefined,                98_500],
  ['4025 TBA', 'Foton',    'Auman EST',    'reparation',   'Casse boîte de vitesse', 244_100],
  ['4026 TBA', 'Foton',    'Auman EST',    'affecte',      undefined,               176_700],
  ['4027 TBA', 'Howo',     'T7H',          'actif',        undefined,                54_200],
  ['4028 TBA', 'Howo',     'T7H',          'affecte',      undefined,               132_800],
  ['4029 TBA', 'Howo',     'T7H',          'hors_service', 'Accident, expertise en cours', 289_400],
  ['4030 TBA', 'Dongfeng', 'KL',           'affecte',      undefined,               112_600],
]

const SEMI_REMORQUES: Array<[string, string, string, StatutVehicule, number]> = [
  ['RM 4101', 'Guillaume', 'Fourgon 3 essieux',  'actif',   0],
  ['RM 4102', 'Guillaume', 'Fourgon 3 essieux',  'affecte', 0],
  ['RM 4103', 'Guillaume', 'Fourgon 3 essieux',  'affecte', 0],
  ['RM 4104', 'Schmitz',   'Plateau 3 essieux',  'affecte', 0],
  ['RM 4105', 'Schmitz',   'Plateau 3 essieux',  'affecte', 0],
  ['RM 4106', 'Schmitz',   'Plateau 3 essieux',  'affecte', 0],
  ['RM 4107', 'Krone',     'Bâchée 3 essieux',   'actif',   0],
  ['RM 4108', 'Krone',     'Bâchée 3 essieux',   'affecte', 0],
  ['RM 4109', 'Krone',     'Bâchée 3 essieux',   'actif',      0],
  ['RM 4110', 'Guillaume', 'Fourgon 3 essieux',  'affecte', 0],
]

function seedVehicules(): Vehicule[] {
  const out: Vehicule[] = []
  TRACTEURS.forEach(([immat, marque, modele, statut, motif, km], i) => {
    out.push({
      id: `v-tr-${i + 1}`, immatriculation: immat,
      vin: `LZGJTR${(2024000 + i).toString()}`, type: 'tracteur',
      marque, modele, categorie: 'Tracteur routier', carburant: 'Diesel',
      site: 'Dépôt UCODIS Tanjombato', statut, motifIndisponibilite: motif, kilometrage: km,
      annee: 2021 + (i % 4), dateMiseEnCirculation: `${2021 + (i % 4)}-0${(i % 9) + 1}-15`,
      modeAcquisition: i % 3 === 0 ? 'leasing' : 'achat',
      coutAcquisitionAr: 185_000_000 + i * 4_000_000,
      valeurResiduelleAr: Math.max(20_000_000, 185_000_000 + i * 4_000_000 - km * 350),
    })
  })
  SEMI_REMORQUES.forEach(([immat, marque, modele, statut, km], i) => {
    out.push({
      id: `v-sr-${i + 1}`, immatriculation: immat,
      vin: `LZGJSR${(2024000 + i).toString()}`, type: 'semi_remorque',
      marque, modele, categorie: 'Semi-remorque', carburant: 'Sans objet',
      chargeMaxKg: 32_000, site: 'Dépôt UCODIS Tanjombato',
      statut, motifIndisponibilite: undefined, kilometrage: km,
      annee: 2020 + (i % 5), dateMiseEnCirculation: `${2020 + (i % 5)}-0${(i % 9) + 1}-01`,
      modeAcquisition: 'achat', coutAcquisitionAr: 58_000_000 + i * 1_500_000,
      valeurResiduelleAr: 58_000_000 + i * 1_500_000 - 12_000_000,
    })
  })
  return out
}

export const useVehiculeStore = defineStore('vehicules', () => {
  const liste = ref<Vehicule[]>(seedVehicules())
  const attelages = ref<Attelage[]>([])
  const affectations = ref<AffectationVehicule[]>([])

  /** Équipements embarqués : boîtier + GPS par tracteur, cohérent avec la
   *  Carte temps réel et la Télémétrie déjà simulées, plus un détecteur
   *  de fatigue sur trois véhicules. */
  const equipements = ref<EquipementEmbarque[]>(
    liste.value.filter(v => v.type === 'tracteur').flatMap((v, i) => {
      const out: EquipementEmbarque[] = [
        { id: `eq-obc-${i + 1}`, vehiculeId: v.id, type: 'obc', numeroSerie: `OBC-${2024000 + i}`, etat: v.statut === 'hors_service' ? 'hors_service' : 'operationnel' },
        { id: `eq-gps-${i + 1}`, vehiculeId: v.id, type: 'gps', numeroSerie: `GPS-${2024000 + i}`, etat: v.statut === 'hors_service' ? 'hors_service' : 'operationnel' },
      ]
      if (i % 3 === 0) out.push({ id: `eq-dms-${i + 1}`, vehiculeId: v.id, type: 'dms', numeroSerie: `DMS-${3024000 + i}`, etat: 'operationnel' })
      return out
    }),
  )

  const equipementsDe = (vehiculeId: string) => equipements.value.filter(e => e.vehiculeId === vehiculeId)

  const tracteurs = computed(() => liste.value.filter(v => v.type === 'tracteur'))
  const semiRemorques = computed(() => liste.value.filter(v => v.type === 'semi_remorque'))

  const LIBELLES_STATUT: Record<StatutVehicule, string> = {
    actif: 'Disponible', affecte: 'Affecté', reparation: 'En réparation',
    hors_service: 'Hors service', vendu: 'Vendu',
  }

  const disponibles = computed(() => liste.value.filter(v => v.statut === 'actif'))
  const enCirculation = computed(() => liste.value.filter(v => v.statut === 'affecte'))
  const immobilises = computed(() => liste.value.filter(v => v.statut === 'reparation' || v.statut === 'hors_service'))
  const archives = computed(() => liste.value.filter(v => v.statut === 'vendu'))
  const auParc = computed(() => liste.value.filter(v => v.statut !== 'vendu'))

  function parId(id: string) { return liste.value.find(v => v.id === id) ?? null }

  const tracteursLibres = computed(() => tracteurs.value.filter(t => !attelageActif(t.id) && t.statut !== 'hors_service' && t.statut !== 'vendu'))
  const semiRemorquesLibres = computed(() => semiRemorques.value.filter(s => !attelageDe(s.id) && s.statut !== 'hors_service' && s.statut !== 'vendu'))
  const tracteursSansConducteur = computed(() => tracteurs.value.filter(t => !affectationActive(t.id) && t.statut !== 'hors_service' && t.statut !== 'vendu'))

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
        attelages.value.push({ id: `at-${i + 1}`, tracteurId: tr.id, semiRemorqueId: sr.id, dateDebut: '2025-01-10' })
      }
      const cond = conducteurs[i]
      if (cond && (tr.statut === 'affecte' || tr.statut === 'actif')) {
        affectations.value.push({ id: `af-${i + 1}`, vehiculeId: tr.id, conducteurId: cond.id, dateDebut: '2025-01-10' })
      }
    })
  }
  initialiserDemonstration()

  /** Traçabilité de la dernière modification, comme sur les autres écrans. */
  let prochainAttelageId = attelages.value.length + 1
  let prochaineAffectationId = affectations.value.length + 1

  /** US 1.4.2 · atteler un tracteur à une semi-remorque, chacun devant être libre. */
  function atteler(tracteurId: string, semiRemorqueId: string, dateDebut: string) {
    if (attelageActif(tracteurId) || attelageDe(semiRemorqueId)) return false
    attelages.value.push({ id: `at-perso-${prochainAttelageId++}`, tracteurId, semiRemorqueId, dateDebut })
    return true
  }
  /** Le détachement date une fin, il ne supprime jamais l'attelage. */
  function dételer(attelageId: string, dateFin: string) {
    const a = attelages.value.find(x => x.id === attelageId)
    if (a) a.dateFin = dateFin
  }

  /** US 1.4.1 · affecter un camion à un conducteur ; un seul conducteur actif par camion. */
  function affecterConducteur(vehiculeId: string, conducteurId: string, dateDebut: string) {
    if (affectationActive(vehiculeId)) return false
    affectations.value.push({ id: `af-perso-${prochaineAffectationId++}`, vehiculeId, conducteurId, dateDebut })
    return true
  }
  function retirerAffectation(affectationId: string, dateFin: string) {
    const a = affectations.value.find(x => x.id === affectationId)
    if (a) a.dateFin = dateFin
  }

  let prochainVehiculeId = liste.value.length + 1
  function creer(saisie: Omit<Vehicule, 'id'>) {
    const id = `v-perso-${prochainVehiculeId++}`
    liste.value.push({ ...saisie, id })
    return id
  }

  /** Sortie du parc : réversible, jamais une suppression. Exclut le
   *  véhicule des listes courantes, des affectations et des indicateurs
   *  de disponibilité sans rien effacer de son historique. */
  function sortirDuParc(vehiculeId: string, saisie: { motif: string; date: string; par: string; kilometrageSortie?: number; commentaire?: string }) {
    const v = parId(vehiculeId)
    if (!v) return
    v.statut = 'vendu'
    v.sortie = saisie
  }
  function reintegrer(vehiculeId: string) {
    const v = parId(vehiculeId)
    if (!v) return
    v.statut = 'actif'
    v.sortie = undefined
  }

  /* ══════════════════════════════════════════════════════════════
   * Position et télémétrie · DONNÉES SIMULÉES.
   *
   * Aucun boîtier de géolocalisation n'est nommé dans les documents
   * UCODIS. Comme le fait déjà le socle FMS de référence sur son
   * propre écran (« Données simulées - Connecter le boîtier embarqué
   * pour données réelles »), la position et les mesures embarquées
   * sont ici générées côté client, jamais présentées comme réelles.
   * ══════════════════════════════════════════════════════════════ */

  /** Corridor par défaut : Antananarivo ↔ Toamasina (RN2), le principal
   *  axe fret de Madagascar · un point de départ plausible en l'absence
   *  de trajets réels communiqués par UCODIS. */
  const CORRIDOR_RN2 = [
    { lat: -18.8792, lng: 47.5079 }, // Antananarivo
    { lat: -18.9333, lng: 47.9333 }, // Moramanga
    { lat: -18.6667, lng: 48.9833 }, // Brickaville
    { lat: -18.1492, lng: 49.4023 }, // Toamasina
  ]

  interface PositionSimulee { lat: number; lng: number; vitesse: number; waypoint: number; progres: number }
  const positions = ref<Record<string, PositionSimulee>>({})
  const statutsOp = ref<Record<string, StatutOperationnel>>({})
  const simulationActive = ref(false)
  let minuteur: ReturnType<typeof setInterval> | null = null

  function initPositions() {
    tracteurs.value.forEach((t, i) => {
      const depart = CORRIDOR_RN2[i % CORRIDOR_RN2.length]!
      positions.value[t.id] = { lat: depart.lat, lng: depart.lng, vitesse: 0, waypoint: i % CORRIDOR_RN2.length, progres: 0 }
      statutsOp.value[t.id] = t.statut === 'affecte'
        ? (i % 4 === 3 ? 'signal_perdu' : i % 3 === 0 ? 'allume_immobile' : 'en_mouvement')
        : 'arrete'
    })
  }
  initPositions()

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

  function avancerVehicule(id: string) {
    if (statutsOp.value[id] !== 'en_mouvement') return
    const pos = positions.value[id]
    if (!pos) return
    pos.progres += 0.05
    if (pos.progres >= 1) { pos.progres = 0; pos.waypoint = (pos.waypoint + 1) % (CORRIDOR_RN2.length - 1) }
    const de = CORRIDOR_RN2[pos.waypoint]!
    const vers = CORRIDOR_RN2[(pos.waypoint + 1) % CORRIDOR_RN2.length]!
    pos.lat = lerp(de.lat, vers.lat, pos.progres)
    pos.lng = lerp(de.lng, vers.lng, pos.progres)
    pos.vitesse = Math.round(55 + Math.sin(pos.progres * Math.PI * 4) * 20)
  }

  function demarrerSimulation() {
    simulationActive.value = true
    minuteur = setInterval(() => { tracteurs.value.forEach(t => avancerVehicule(t.id)) }, 1500)
  }
  function arreterSimulation() {
    simulationActive.value = false
    if (minuteur) { clearInterval(minuteur); minuteur = null }
  }

  /** Lecture de télémétrie simulée pour un tracteur · kilométrage, carburant, moteur, code défaut, signal. */
  /** Deux ou trois camions immobilisés n'ont jamais de remontée : un tracteur
   *  sans télémétrie l'affiche honnêtement plutôt que de masquer l'absence
   *  de donnée. */
  function aBoitier(vehiculeId: string) {
    const v = parId(vehiculeId)
    return v ? v.statut !== 'hors_service' : false
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
      codeDefaut: seed % 6 === 0 ? 'P0420 · Rendement catalyseur' : null,
      signalOk: statutOp !== 'signal_perdu',
      vitesse: pos?.vitesse ?? 0,
      derniereMAJ: new Date().toISOString(),
    }
  }

  /** Cinq derniers relevés espacés de 35 minutes, cohérents avec la lecture courante. */
  function historiqueTelemetrie(vehiculeId: string) {
    const actuel = telemetrieDe(vehiculeId)
    if (!actuel) return []
    const out: { horodatage: string; kilometrage: number; niveauCarburant: number; etatMoteur: boolean; codeDefaut: string | null }[] = []
    const maintenant = new Date(actuel.derniereMAJ)
    for (let i = 0; i < 5; i++) {
      const h = new Date(maintenant.getTime() - i * 35 * 60_000)
      out.push({
        horodatage: h.toISOString(),
        kilometrage: actuel.kilometrage - i * 12,
        niveauCarburant: Math.min(100, actuel.niveauCarburant + i * 4),
        etatMoteur: i === 0 ? actuel.etatMoteur : true,
        codeDefaut: i === 0 ? actuel.codeDefaut : null,
      })
    }
    return out
  }

  return {
    liste, tracteurs, semiRemorques, attelages, affectations, LIBELLES_STATUT,
    disponibles, enCirculation, immobilises, archives, auParc,
    tracteursLibres, semiRemorquesLibres, tracteursSansConducteur,
    parId, attelageActif, attelageDe, affectationActive, atteler, dételer, affecterConducteur, retirerAffectation,
    creer, sortirDuParc, reintegrer,
    equipements, equipementsDe,
    positions, statutsOp, simulationActive, demarrerSimulation, arreterSimulation,
    aBoitier, telemetrieDe, historiqueTelemetrie, CORRIDOR_RN2,
  }
})
