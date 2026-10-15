import { maintenant } from '../utils/horloge'
import { defineStore } from 'pinia'
import { ref, computed, watch, reactive } from 'vue'
import type { EcartItineraire, NatureEcart, TypeEcart, GraviteEcart, DecisionEcart } from '../types'
import { useVoyagesStore } from './voyages'

/** Libellés affichés : ceux réglés dans la Configuration, onglet Types d'écart (FMS-GP-02). */
export const LIB_TYPE_ECART: Record<TypeEcart, string> = reactive({
  sortie_trajet: 'Sortie du corridor',
  arret_non_planifie: 'Arrêt non planifié',
  point_passage_manque: 'Point de passage manqué',
  ecart_kilometrique: 'Écart kilométrique',
  fenetre_horaire: 'Hors fenêtre horaire',
  ordre_passage: 'Ordre de passage non respecté',
  temps_trajet: 'Dépassement du temps de trajet',
  repos_hors_parking: 'Repos hors parking désigné',
  conduite_continue: 'Conduite continue dépassée',
  conduite_journaliere: 'Conduite journalière dépassée',
  travail_journalier: 'Travail journalier dépassé',
  repos_hebdomadaire: 'Repos hebdomadaire insuffisant',
  conduite_nuit: 'Conduite de nuit non autorisée',
})

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

function fmtMin(min: number) {
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + ' min' : ''}`.trim() : `${min} min`
}

/** Mesures qui ont un sens pour chaque type d'écart, dans l'ordre d'affichage. */
export function mesuresEcart(e: EcartItineraire): { label: string; value: string }[] {
  const duree = e.dureeMin != null ? fmtMin(e.dureeMin) : '-'
  switch (e.type) {
    case 'sortie_trajet': return [
      { label: 'Écart maximal au tracé', value: e.ecartLateralMaxM != null ? `${(e.ecartLateralMaxM / 1000).toFixed(1)} km` : '-' },
      { label: 'Durée hors corridor', value: duree },
      { label: 'Distance parcourue hors corridor', value: e.distanceKm != null ? `${e.distanceKm} km` : '-' },
    ]
    case 'arret_non_planifie': return [{ label: "Durée de l'arrêt", value: duree }]
    case 'repos_hors_parking': return [{ label: 'Durée du repos', value: duree }]
    case 'temps_trajet': return [{ label: 'Dépassement de la durée prévue', value: duree }]
    case 'fenetre_horaire': return [{ label: "Décalage sur l'heure prévue", value: duree }]
    case 'conduite_nuit': return [{ label: 'Durée de conduite dans la plage de nuit', value: duree }]
    case 'ecart_kilometrique': return [{ label: 'Écart au kilométrage de référence', value: e.distanceKm != null ? `${e.distanceKm} km` : '-' }]
    default: return []
  }
}

/**
 * Store des écarts d'itinéraire · repris du module Conformité du socle FMS
 * (leur propre menu « Conformité » pointe vers un écran « Écarts »).
 * Règle fondatrice conservée à l'identique : un écart naît TOUJOURS
 * « à qualifier », le système ne présume jamais d'une intention. Seul un
 * écart qualifié « non justifiée » est retenu contre le conducteur.
 */
const CLE_ECARTS = 'fms-ucodis-ecarts-itineraire'
const CLE_TYPES_ECART = 'fms-ucodis-types-ecart'

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

  try { const b = localStorage.getItem(CLE_ECARTS); if (b) ecarts.value = JSON.parse(b) } catch { /* défaut */ }
  watch(ecarts, v => { try { localStorage.setItem(CLE_ECARTS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const getById = (id: string) => ecarts.value.find(e => e.id === id)
  /** Écart constaté par la télématique et toujours en cours pour ce voyage et ce type. */
  const enCoursDe = (voyageId: string, type: TypeEcart) => ecarts.value.find(e => e.voyageId === voyageId && e.type === type && e.source === 'telematique' && !e.finLe)
  const aQualifier = computed(() => ecarts.value.filter(e => e.nature === 'a_qualifier'))
  const nonJustifies = computed(() => ecarts.value.filter(e => e.nature === 'non_justifiee'))
  const ecartsDuVoyage = (voyageId: string) => ecarts.value.filter(e => e.voyageId === voyageId)
  /** Compteurs d'un voyage, toujours calculés depuis les écarts enregistrés. */
  function compteDuVoyage(voyageId: string) {
    const liste = ecartsDuVoyage(voyageId)
    const nonJustifies = liste.filter(e => e.nature === 'non_justifiee').length
    const aQualifier = liste.filter(e => e.nature === 'a_qualifier').length
    return { total: liste.length, nonJustifies, aQualifier, conforme: !nonJustifies && !aQualifier }
  }
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
    const voyagesEnFaute = new Set(nonJustifies.value.map(e => e.voyageId)).size
    return Math.round(((nbVoyages - voyagesEnFaute) / nbVoyages) * 100)
  })

  function justifier(id: string, texte: string): { ok: boolean; motif?: string } {
    const e = getById(id)
    if (!e) return { ok: false, motif: 'Écart introuvable.' }
    if (!texte.trim()) return { ok: false, motif: 'Saisissez la justification.' }
    if (e.justificationChauffeur) return { ok: false, motif: 'Une justification est déjà enregistrée.' }
    if (e.nature !== 'a_qualifier') return { ok: false, motif: 'Cet écart est déjà qualifié.' }
    e.justificationChauffeur = texte.trim()
    e.justifieLe = maintenant().toISOString()
    return { ok: true }
  }

  /** Qualification par l'exploitation. Le motif est obligatoire : c'est ce qui rend le dossier opposable. */
  function qualifier(id: string, nature: Exclude<NatureEcart, 'a_qualifier'>, motif: string, par: string, decision: DecisionEcart = 'classe'): { ok: boolean; motif?: string } {
    const e = getById(id)
    if (!e) return { ok: false, motif: 'Écart introuvable.' }
    if (e.nature !== 'a_qualifier') return { ok: false, motif: 'Cet écart est déjà qualifié.' }
    if (!motif.trim()) return { ok: false, motif: 'Le motif est obligatoire.' }
    e.nature = nature
    e.motifQualification = motif.trim()
    e.qualifiePar = par
    e.qualifieLe = maintenant().toISOString()
    e.decision = decision
    return { ok: true }
  }

  /**
   * Écart constaté par la télématique (FMS-GP-02). Il naît toujours « à
   * qualifier » : le système constate, il ne présume d'aucune intention. Un
   * même constat sur le même voyage n'est enregistré qu'une fois.
   */
  function signaler(d: Omit<EcartItineraire, 'id' | 'nature' | 'source'>, unique = false): EcartItineraire | null {
    const doublon = ecarts.value.find(e => e.voyageId === d.voyageId && e.type === d.type && e.source === 'telematique'
      && (unique || !e.finLe || Math.abs(new Date(e.detecteLe).getTime() - new Date(d.detecteLe).getTime()) < 30 * 60_000))
    if (doublon) return null
    let n = ecarts.value.length + 1
    while (ecarts.value.some(e => e.id === `ECA-${String(n).padStart(3, '0')}`)) n++
    const e: EcartItineraire = { ...d, id: `ECA-${String(n).padStart(3, '0')}`, nature: 'a_qualifier', source: 'telematique' }
    ecarts.value.unshift(e)
    return e
  }
  /** Fin d'un écart en cours (retour sur le tracé, reprise de la route) : la mesure se fige. */
  function terminer(id: string, mesures: Partial<Pick<EcartItineraire, 'dureeMin' | 'distanceKm' | 'ecartLateralMaxM'>>) {
    const e = getById(id); if (!e || e.finLe) return
    Object.assign(e, mesures, { finLe: maintenant().toISOString() })
  }
  function mettreAJour(id: string, mesures: Partial<Pick<EcartItineraire, 'dureeMin' | 'distanceKm' | 'ecartLateralMaxM' | 'gravite' | 'lieu' | 'etapeIds'>>) {
    const e = getById(id); if (e && !e.finLe) Object.assign(e, mesures)
  }

  return {
    ecarts, aQualifier, nonJustifies, parNature, tauxConformite,
    getById, ecartsDuVoyage, compteDuVoyage, ecartsDuChauffeur, justifier, qualifier, signaler, terminer, mettreAJour, enCoursDe,
  }
})

/**
 * Types d'écart paramétrables (FMS-GP-02, PA-05) : chaque type a une
 * catégorie, une gravité, un seuil et peut être désactivé. Le champ
 * « detecte » relie le type au constat que fait la télématique ; un type
 * sans constat automatique reste disponible pour la saisie.
 */
export type CategorieEcart = 'itineraire' | 'temps' | 'arret'
export const LIB_CATEGORIE_ECART: Record<CategorieEcart, string> = {
  itineraire: 'Itinéraire', temps: 'Temps réglementaires', arret: 'Arrêts',
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
  detecte?: TypeEcart
}

const TYPES_ECART_DEFAUT: ConfigTypeEcart[] = [
  { id: 'TE-01', code: 'PT-MANQUE', libelle: 'Point de passage manqué', categorie: 'itineraire', gravite: 'majeur', actif: true, detecte: 'point_passage_manque',
    description: "Un site de la séquence n'a pas été atteint à la fin du voyage." },
  { id: 'TE-02', code: 'PT-ORDRE', libelle: 'Ordre de passage non respecté', categorie: 'itineraire', gravite: 'mineur', actif: true, detecte: 'ordre_passage',
    description: 'Un site a été atteint après un site prévu plus loin dans la séquence.' },
  { id: 'TE-03', code: 'TEMPS-TRAJET', libelle: 'Dépassement du temps de trajet', categorie: 'itineraire', gravite: 'mineur', seuilValeur: 30, seuilUnite: 'min', actif: true, detecte: 'temps_trajet',
    description: 'Le trajet dure plus que la durée prévue, au-delà du seuil.' },
  { id: 'TE-16', code: 'KM-ECART', libelle: 'Écart kilométrique', categorie: 'itineraire', gravite: 'mineur', seuilValeur: 5, seuilUnite: '%', actif: true, detecte: 'ecart_kilometrique',
    description: 'Kilométrage relevé hors tolérance du trajet de référence.' },
  { id: 'TE-18', code: 'SORTIE-TRAJET', libelle: 'Sortie du corridor', categorie: 'itineraire', gravite: 'majeur', seuilValeur: 3000, seuilUnite: 'm', actif: true, detecte: 'sortie_trajet',
    description: 'Écart latéral au-delà du couloir du trajet de référence.' },
  { id: 'TE-19', code: 'FENETRE-HORAIRE', libelle: 'Hors fenêtre horaire', categorie: 'itineraire', gravite: 'mineur', seuilValeur: 60, seuilUnite: 'min', actif: true, detecte: 'fenetre_horaire',
    description: "Passage sur un site en avance ou en retard sur l'heure prévue, au-delà du seuil." },
  { id: 'TE-04', code: 'ARRET-NP', libelle: 'Arrêt non planifié', categorie: 'arret', gravite: 'critique', seuilValeur: 20, seuilUnite: 'min', actif: true, detecte: 'arret_non_planifie',
    description: "Immobilisation hors d'un point autorisé au-delà du seuil." },
  { id: 'TE-05', code: 'REPOS-LIEU', libelle: 'Repos hors parking désigné', categorie: 'arret', gravite: 'majeur', seuilValeur: 60, seuilUnite: 'min', actif: true, detecte: 'repos_hors_parking',
    description: "Arrêt assez long pour être un repos, pris ailleurs que dans un parking désigné." },
  { id: 'TE-06', code: 'TCC', libelle: 'Conduite continue dépassée', categorie: 'temps', gravite: 'critique', seuilUnite: 'min', actif: false, detecte: 'conduite_continue',
    description: "Conduite sans la pause obligatoire au-delà du seuil." },
  { id: 'TE-07', code: 'TCJ', libelle: 'Conduite journalière dépassée', categorie: 'temps', gravite: 'critique', seuilUnite: 'min', actif: false, detecte: 'conduite_journaliere' },
  { id: 'TE-08', code: 'TTJ', libelle: 'Travail journalier dépassé', categorie: 'temps', gravite: 'majeur', seuilUnite: 'min', actif: false, detecte: 'travail_journalier' },
  { id: 'TE-09', code: 'TRH', libelle: 'Repos hebdomadaire insuffisant', categorie: 'temps', gravite: 'majeur', seuilUnite: 'h', actif: false, detecte: 'repos_hebdomadaire' },
  { id: 'TE-10', code: 'NUIT', libelle: 'Conduite de nuit non autorisée', categorie: 'temps', gravite: 'majeur', actif: true, detecte: 'conduite_nuit',
    description: 'Véhicule en mouvement pendant un voyage, dans la plage de nuit réglée dans les paramètres.' },
]

export const useConfigTypesEcartStore = defineStore('configTypesEcart', () => {
  const types = ref<ConfigTypeEcart[]>(TYPES_ECART_DEFAUT.map(t => ({ ...t })))
  try {
    const b = localStorage.getItem(CLE_TYPES_ECART)
    if (b) {
      const lus = JSON.parse(b) as ConfigTypeEcart[]
      types.value = [...lus.filter(t => !['comportement', 'document'].includes(t.categorie as string) && t.id !== 'TE-17'), ...TYPES_ECART_DEFAUT.filter(d => !lus.some(t => t.id === d.id)).map(t => ({ ...t }))]
      /* Types de temps : constat relié, seuil lu dans les paramètres (un seul réglage). */
      types.value.forEach(t => { const d = TYPES_ECART_DEFAUT.find(x => x.id === t.id); if (d?.detecte && d.categorie === 'temps') { t.detecte = d.detecte; delete t.seuilValeur } })
    }
  } catch { /* défaut */ }
  watch(types, v => { try { localStorage.setItem(CLE_TYPES_ECART, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(types, v => { v.forEach(t => { if (t.detecte && t.libelle.trim()) LIB_TYPE_ECART[t.detecte] = t.libelle.trim() }) }, { deep: true, immediate: true })

  const parCategorie = computed(() => {
    const acc = {} as Record<CategorieEcart, ConfigTypeEcart[]>
    types.value.forEach(t => {
      if (!acc[t.categorie]) acc[t.categorie] = []
      acc[t.categorie]!.push(t)
    })
    return acc
  })

  const getById = (id: string) => types.value.find(x => x.id === id)
  /** Réglage actif du constat automatique, ou null s'il est désactivé. */
  const reglage = (type: TypeEcart) => types.value.find(t => t.detecte === type && t.actif) ?? null
  function creer(saisie: Omit<ConfigTypeEcart, 'id'>) {
    let n = types.value.length + 1
    while (types.value.some(t => t.id === `TE-perso-${n}`)) n++
    const id = `TE-perso-${n}`
    types.value.push({ ...saisie, id })
    return id
  }
  /** Le code et l'unité du seuil d'un type sont fixés : ils ne se modifient pas. */
  function majType(id: string, saisie: Partial<Omit<ConfigTypeEcart, 'id' | 'code' | 'seuilUnite'>>): { ok: boolean; motif?: string } {
    const t = getById(id)
    if (!t) return { ok: false, motif: "Type d'écart introuvable." }
    if (saisie.libelle != null) {
      const l = saisie.libelle.trim()
      if (!l) return { ok: false, motif: 'Le libellé est obligatoire.' }
      if (types.value.some(x => x.id !== id && x.libelle.trim().toLowerCase() === l.toLowerCase())) return { ok: false, motif: `Le libellé « ${l} » est déjà utilisé.` }
      saisie = { ...saisie, libelle: l }
    }
    if ('seuilValeur' in saisie && (saisie.seuilValeur == null || !Number.isFinite(saisie.seuilValeur) || saisie.seuilValeur < 0))
      return { ok: false, motif: 'Le seuil doit être un nombre positif.' }
    Object.assign(t, saisie)
    return { ok: true }
  }
  function basculerActif(id: string) {
    const t = getById(id)
    if (t) t.actif = !t.actif
  }

  return { types, parCategorie, getById, reglage, creer, majType, basculerActif }
})
