import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EcartItineraire, NatureEcart, TypeEcart, GraviteEcart, DecisionEcart } from '../types'
import { useVoyagesStore } from './voyages'

export const LIB_TYPE_ECART: Record<TypeEcart, string> = {
  sortie_trajet: 'Sortie de trajet',
  arret_non_planifie: 'Arrêt non planifié',
  point_passage_manque: 'Point de passage manqué',
  ecart_kilometrique: 'Écart kilométrique',
  fenetre_horaire: 'Hors fenêtre horaire',
}

export const LIB_NATURE: Record<NatureEcart, { label: string; cls: string }> = {
  a_qualifier: { label: 'À qualifier', cls: 'bg-warning-bg text-warning' },
  autorisee: { label: 'Déviation autorisée', cls: 'bg-info-bg text-info' },
  subie: { label: 'Déviation subie', cls: 'bg-primary/10 text-primary' },
  non_justifiee: { label: 'Non justifiée', cls: 'bg-danger-bg text-danger' },
}

export const LIB_GRAVITE: Record<GraviteEcart, { label: string; cls: string }> = {
  mineur: { label: 'Mineur', cls: 'bg-neutral-bg text-neutral' },
  majeur: { label: 'Majeur', cls: 'bg-warning-bg text-warning' },
  critique: { label: 'Critique', cls: 'bg-danger-bg text-danger' },
}

/**
 * Store des écarts d'itinéraire · repris du module Conformité du socle FMS
 * (leur propre menu « Conformité » pointe vers un écran « Écarts »).
 * Règle fondatrice conservée à l'identique : un écart naît TOUJOURS
 * « à qualifier », le système ne présume jamais d'une intention. Seul un
 * écart qualifié « non justifiée » est retenu contre le conducteur.
 */
export const useEcartsStore = defineStore('ecarts', () => {
  const ecarts = ref<EcartItineraire[]>([
    {
      id: 'ECA-001', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148', vehiculePlaque: '4021 TBA',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)',
      type: 'sortie_trajet', gravite: 'majeur', nature: 'a_qualifier',
      detecteLe: '2026-08-24T11:18:00', dureeMin: 96, distanceKm: 41, ecartLateralMaxM: 6200,
      lat: -19.1520, lng: 48.3480, lieu: 'Piste secondaire, 14 km au sud de Moramanga',
    },
    {
      id: 'ECA-002', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148', vehiculePlaque: '4021 TBA',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)',
      type: 'arret_non_planifie', gravite: 'critique', nature: 'a_qualifier',
      detecteLe: '2026-08-24T11:42:00', dureeMin: 45,
      lat: -19.1520, lng: 48.3480, lieu: 'Piste secondaire, 14 km au sud de Moramanga',
    },
    {
      id: 'ECA-003', voyageId: 'VOY-005', voyageRef: 'VOY-2026-0146', vehiculePlaque: '4024 TBA',
      chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy',
      trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)',
      type: 'sortie_trajet', gravite: 'mineur', nature: 'subie',
      detecteLe: '2026-08-26T09:48:00', dureeMin: 26, distanceKm: 8, ecartLateralMaxM: 1400,
      lat: -18.6800, lng: 48.9200, lieu: 'Déviation chantier RN2, PK 62',
      justificationChauffeur: 'Route barrée par des travaux, déviation imposée sur place.',
      justifieLe: '2026-08-26T15:10:00',
      qualifiePar: 'Responsable Flotte', qualifieLe: '2026-08-27T08:30:00',
      motifQualification: 'Déviation de chantier confirmée.', decision: 'classe',
    },
    {
      id: 'ECA-004', voyageId: 'VOY-003', voyageRef: 'VOY-2026-0147', vehiculePlaque: '4022 TBA',
      chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo',
      trajetLibelle: 'Antananarivo → Mahajanga (RN4)',
      type: 'fenetre_horaire', gravite: 'mineur', nature: 'autorisee',
      detecteLe: '2026-08-20T19:05:00', dureeMin: 70,
      lat: -16.9500, lng: 46.8333, lieu: 'Maevatanana',
      qualifiePar: 'Responsable Flotte', qualifieLe: '2026-08-21T07:45:00',
      motifQualification: 'Départ décalé sur instruction du client, accord tracé au dossier.', decision: 'classe',
    },
  ])

  const getById = (id: string) => ecarts.value.find(e => e.id === id)
  const aQualifier = computed(() => ecarts.value.filter(e => e.nature === 'a_qualifier'))
  const infractions = computed(() => ecarts.value.filter(e => e.nature === 'non_justifiee'))
  const ecartsDuVoyage = (voyageId: string) => ecarts.value.filter(e => e.voyageId === voyageId)
  const ecartsDuChauffeur = (chauffeurId: string) => ecarts.value.filter(e => e.chauffeurId === chauffeurId)

  const parNature = computed(() => {
    const acc = {} as Record<NatureEcart, number>
    ecarts.value.forEach(e => { acc[e.nature] = (acc[e.nature] ?? 0) + 1 })
    return acc
  })

  /** Taux de conformité : part des voyages sans écart non justifié. */
  const tauxConformite = computed(() => {
    const voyages = useVoyagesStore()
    const nbVoyages = voyages.voyages.length
    if (!nbVoyages) return 100
    const voyagesEnFaute = new Set(infractions.value.map(e => e.voyageId)).size
    return Math.round(((nbVoyages - voyagesEnFaute) / nbVoyages) * 100)
  })

  function justifier(id: string, texte: string) {
    const e = getById(id)
    if (!e) return
    e.justificationChauffeur = texte
    e.justifieLe = new Date().toISOString()
  }

  /** Qualification par l'exploitation. Le motif est obligatoire : c'est ce qui rend le dossier opposable. */
  function qualifier(id: string, nature: Exclude<NatureEcart, 'a_qualifier'>, motif: string, par: string, decision: DecisionEcart = 'classe') {
    const e = getById(id)
    if (!e) return
    e.nature = nature
    e.motifQualification = motif
    e.qualifiePar = par
    e.qualifieLe = new Date().toISOString()
    e.decision = decision
  }

  return {
    ecarts, aQualifier, infractions, parNature, tauxConformite,
    getById, ecartsDuVoyage, ecartsDuChauffeur, justifier, qualifier,
  }
})

/**
 * Configuration éditable des types d'écart, pour l'onglet Configuration ·
 * Types d'écart. Distincte du vocabulaire fixe TypeEcart utilisé par les
 * écarts eux-mêmes : ici, la gravité et le seuil se règlent sans
 * toucher au code, comme sur le socle FMS.
 */
/**
 * Configuration éditable des types d'écart, pour l'onglet Configuration ·
 * Types d'écart. Reprise à la lettre du référentiel du socle FMS (dix-sept
 * types, cinq catégories) : les cinq écarts réellement détectés par le
 * moteur UCODIS aujourd'hui (voir TypeEcart) en font partie, les douze
 * autres décrivent des règles pas encore instrumentées côté UCODIS
 * (comportement de conduite, temps réglementaires, document) mais
 * restent affichées, actives ou non, comme sur le socle FMS.
 */
export type CategorieEcart = 'itineraire' | 'temps' | 'arret' | 'comportement' | 'document'
export const LIB_CATEGORIE_ECART: Record<CategorieEcart, string> = {
  itineraire: 'Itinéraire', temps: 'Temps réglementaires', arret: 'Arrêts',
  comportement: 'Comportement de conduite', document: 'Documents',
}

export interface ConfigTypeEcart {
  id: string
  code: string
  libelle: string
  categorie: CategorieEcart
  description?: string
  gravite: GraviteEcart
  seuilValeur?: number
  seuilUnite?: string
  actif: boolean
}

export const useConfigTypesEcartStore = defineStore('configTypesEcart', () => {
  const types = ref<ConfigTypeEcart[]>([
    { id: 'TE-01', code: 'PT-MANQUE', libelle: 'Point de passage manqué', categorie: 'itineraire', gravite: 'majeur', actif: true,
      description: "Un site de la séquence n'a pas été atteint." },
    { id: 'TE-02', code: 'PT-ORDRE', libelle: 'Point franchi hors séquence', categorie: 'itineraire', gravite: 'mineur', actif: true,
      description: 'Les sites ont été desservis dans un ordre différent de celui prévu.' },
    { id: 'TE-03', code: 'INTERVALLE', libelle: "Dépassement d'intervalle", categorie: 'itineraire', gravite: 'mineur', seuilValeur: 30, seuilUnite: 'min', actif: true,
      description: 'Le temps entre deux points dépasse la durée prévue au-delà du seuil.' },
    { id: 'TE-16', code: 'KM-ECART', libelle: 'Écart kilométrique', categorie: 'itineraire', gravite: 'mineur', seuilValeur: 5, seuilUnite: '%', actif: true,
      description: 'Kilométrage relevé hors tolérance du trajet de référence.' },
    { id: 'TE-04', code: 'ARRET-NP', libelle: 'Arrêt non planifié', categorie: 'arret', gravite: 'critique', seuilValeur: 20, seuilUnite: 'min', actif: true,
      description: "Immobilisation hors d'un site déclaré au-delà du seuil." },
    { id: 'TE-05', code: 'REPOS-LIEU', libelle: 'Repos hors site autorisé', categorie: 'arret', gravite: 'majeur', actif: true,
      description: "Repos pris ailleurs qu'un site du référentiel." },
    { id: 'TE-06', code: 'TCC', libelle: 'Conduite continue dépassée', categorie: 'temps', gravite: 'critique', seuilValeur: 270, seuilUnite: 'min', actif: false,
      description: "Plus de 4 h 30 de conduite sans arrêt d'au moins 45 min." },
    { id: 'TE-07', code: 'TCJ', libelle: 'Conduite journalière dépassée', categorie: 'temps', gravite: 'critique', seuilValeur: 600, seuilUnite: 'min', actif: false,
      description: 'Plus de 10 h de conduite sur la journée.' },
    { id: 'TE-08', code: 'TTJ', libelle: 'Travail journalier dépassé', categorie: 'temps', gravite: 'majeur', seuilValeur: 720, seuilUnite: 'min', actif: false,
      description: 'Plus de 12 h de travail, conduite et pauses comprises.' },
    { id: 'TE-09', code: 'TRH', libelle: 'Repos hebdomadaire insuffisant', categorie: 'temps', gravite: 'majeur', seuilValeur: 24, seuilUnite: 'h', actif: false },
    { id: 'TE-10', code: 'NUIT', libelle: 'Conduite de nuit non autorisée', categorie: 'temps', gravite: 'majeur', actif: false },
    { id: 'TE-11', code: 'SURVITESSE', libelle: 'Survitesse', categorie: 'comportement', gravite: 'majeur', seuilValeur: 5, seuilUnite: '% au-dessus', actif: false },
    { id: 'TE-12', code: 'FREINAGE', libelle: 'Freinage brusque', categorie: 'comportement', gravite: 'mineur', actif: false },
    { id: 'TE-13', code: 'ACCEL', libelle: 'Accélération brusque', categorie: 'comportement', gravite: 'mineur', actif: false },
    { id: 'TE-14', code: 'ACCOTEMENT', libelle: 'Roulage ou arrêt sur accotement', categorie: 'comportement', gravite: 'majeur', actif: false },
    { id: 'TE-15', code: 'CLANDESTIN', libelle: 'Passager clandestin', categorie: 'comportement', gravite: 'critique', actif: false },
    { id: 'TE-17', code: 'DOC-INCOMP', libelle: 'Dossier documentaire incomplet', categorie: 'document', gravite: 'majeur', actif: true },
    { id: 'TE-18', code: 'SORTIE-TRAJET', libelle: 'Sortie de trajet', categorie: 'itineraire', gravite: 'majeur', seuilValeur: 3000, seuilUnite: 'm', actif: true,
      description: "Écart latéral au-delà du couloir de référence. Type propre à UCODIS." },
    { id: 'TE-19', code: 'FENETRE-HORAIRE', libelle: 'Hors fenêtre horaire', categorie: 'itineraire', gravite: 'mineur', seuilValeur: 60, seuilUnite: 'min', actif: true,
      description: 'Passage sur un site hors de la plage horaire attendue. Type propre à UCODIS.' },
  ])

  const parCategorie = computed(() => {
    const acc = {} as Record<CategorieEcart, ConfigTypeEcart[]>
    types.value.forEach(t => {
      if (!acc[t.categorie]) acc[t.categorie] = []
      acc[t.categorie]!.push(t)
    })
    return acc
  })

  const getById = (id: string) => types.value.find(x => x.id === id)
  let prochainNumero = types.value.length + 1
  function creer(saisie: Omit<ConfigTypeEcart, 'id'>) {
    const id = `TE-perso-${prochainNumero++}`
    types.value.push({ ...saisie, id })
    return id
  }
  function majType(id: string, saisie: Partial<Omit<ConfigTypeEcart, 'id'>>) {
    const t = getById(id)
    if (t) Object.assign(t, saisie)
  }
  function basculerActif(id: string) {
    const t = getById(id)
    if (t) t.actif = !t.actif
  }

  return { types, parCategorie, getById, creer, majType, basculerActif }
})
