import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useVehiculeStore } from './vehicules'
import { useVoyagesStore } from './voyages'
import { useTrajetsStore } from './trajets'
import { useSitesStore } from './sites'
import { usePersonnelStore } from './personnel'
import { useConfigurationStore } from './configuration'
import { useEcartsStore, useConfigTypesEcartStore, LIB_TYPE_ECART } from './ecarts'
import { useMaintenanceStore } from './maintenance'
import { useInfractionsStore } from './infractions'
import { useDisponibilitesStore, type RegleTemps } from './disponibilites'
import { distanceM, distanceTraceM, siteContenant, lieuLisible, type PointGeo } from '../utils/geo'
import { etapeDuSite, controlerPassage, pointsManques, decalageFenetre, qualifierArret, depassementTemps, type EtapeControlee } from '../utils/detectionTrajet'
import { dansNJours, maintenant, decaler } from '../utils/horloge'
import { calculerEcartKm, horsTournee } from '../utils/voyageUtils'
import type { GraviteEcart, Voyage, TypeEcart, NatureEcart, EcartItineraire } from '../types'

/**
 * Suivi GPS et télématique (FMS-GP-01 à GP-05). Les équipements embarqués
 * remontent la position, la vitesse et des signaux (boîtier, caméra,
 * diagnostic moteur). Le FMS en déduit des informations : entrée et sortie
 * des sites, arrêts, écarts de trajet, comportements à risque, défauts
 * moteur. Chaque information devient un événement daté, rangé dans le
 * journal du véhicule ; selon son type paramétré, il alimente les alertes,
 * le score des conducteurs ou la maintenance.
 */
export type FamilleEvenement = 'comportement' | 'camera' | 'defaut' | 'signal' | 'site' | 'arret'
export type SourceEvenement = 'boitier' | 'camera' | 'obd' | 'gps'
export const LIB_FAMILLE_EVENEMENT: Record<FamilleEvenement, string> = {
  comportement: 'Comportement de conduite', camera: 'Caméra embarquée', defaut: 'Défaut moteur',
  signal: 'Signal', site: 'Entrée et sortie de site', arret: 'Arrêt',
}
export const LIB_SOURCE_EVENEMENT: Record<SourceEvenement, string> = {
  boitier: 'Boîtier embarqué', camera: 'Caméra embarquée', obd: 'Diagnostic moteur (OBD)', gps: 'Position GPS',
}

export interface TypeEvenementDef {
  code: string
  libelle: string
  famille: FamilleEvenement
  gravite: GraviteEcart
  seuil?: number
  unite?: string
  /** L'événement ouvre une alerte. */
  alerte: boolean
  /** L'événement pèse sur le score du conducteur (famille Sécurité routière). */
  score: boolean
  /** Type d'infraction proposé quand on donne une suite disciplinaire. */
  typeInfraction?: string
  actif: boolean
}

export interface EvenementTelematique {
  id: string
  vehiculeId: string
  plaque: string
  conducteurId?: string
  conducteurNom?: string
  voyageId?: string
  date: string
  code: string
  famille: FamilleEvenement
  source: SourceEvenement
  lat?: number
  lng?: number
  lieu?: string
  valeur?: number
  unite?: string
  detail?: string
  codeObd?: string
  siteId?: string
  /** Fin d'une situation qui dure (signal perdu, arrêt). */
  finLe?: string
  ordreTravailRef?: string
  infractionId?: string
  acquitte?: { par: string; le: string; commentaire: string }
  historique: { le: string; par: string; action: string }[]
}

export interface PointTrace { t: string; lat: number; lng: number; vitesse: number }

export interface ParametresTelematique {
  vitesseLimiteKmh: number
  typesSitesRepos: string[]
  typesSitesInterdits: string[]
  penaliteCritique: number
  penaliteMajeur: number
  penaliteMineur: number
  /** Ancienneté maximale d'un comportement à risque pour qu'il ouvre une alerte. */
  joursAlerteConduite: number
  /** Délai laissé au conducteur pour justifier un écart, en heures. */
  delaiJustificationH: number
  /** Un excès de vitesse qui reprend dans ce délai reste le même épisode, en minutes. */
  regroupementExcesMin: number
  /** Distance au tracé au-delà de laquelle un véhicule en mission est hors zone,
   *  quand la sortie du corridor n'a pas de seuil actif, en mètres. */
  seuilHorsZoneM: number
}

export const TYPES_EVENEMENT_DEFAUT: TypeEvenementDef[] = [
  { code: 'VITESSE', libelle: 'Excès de vitesse', famille: 'comportement', gravite: 'majeur', seuil: 10, unite: 'km/h au-delà de la limite', alerte: true, score: true, typeInfraction: 'vitesse', actif: true },
  { code: 'FREINAGE', libelle: 'Freinage brusque', famille: 'comportement', gravite: 'mineur', seuil: 0.45, unite: 'g', alerte: false, score: true, typeInfraction: 'freinage', actif: true },
  { code: 'ACCEL', libelle: 'Accélération brusque', famille: 'comportement', gravite: 'mineur', seuil: 0.35, unite: 'g', alerte: false, score: false, typeInfraction: 'acceleration', actif: true },
  { code: 'ACCOTEMENT', libelle: 'Roulage ou arrêt sur accotement', famille: 'comportement', gravite: 'majeur', alerte: false, score: true, actif: false },
  { code: 'SOMNOLENCE', libelle: 'Somnolence', famille: 'camera', gravite: 'critique', alerte: true, score: true, typeInfraction: 'somnolence', actif: true },
  { code: 'CEINTURE', libelle: 'Ceinture non attachée', famille: 'camera', gravite: 'majeur', alerte: false, score: true, typeInfraction: 'ceinture', actif: true },
  { code: 'TELEPHONE', libelle: 'Téléphone au volant', famille: 'camera', gravite: 'majeur', alerte: true, score: true, typeInfraction: 'telephone', actif: true },
  { code: 'MASQUAGE', libelle: 'Caméra masquée', famille: 'camera', gravite: 'critique', alerte: true, score: true, typeInfraction: 'camera_masquee', actif: true },
  { code: 'CLANDESTIN', libelle: 'Passager non autorisé', famille: 'camera', gravite: 'critique', alerte: true, score: true, actif: false },
  { code: 'OBD', libelle: 'Code défaut moteur', famille: 'defaut', gravite: 'majeur', alerte: true, score: false, actif: true },
  { code: 'BOITIER_COUPE', libelle: 'Coupure ou débranchement du boîtier', famille: 'signal', gravite: 'critique', alerte: true, score: false, actif: true },
  { code: 'CAMERA_COUPEE', libelle: 'Coupure de la caméra', famille: 'camera', gravite: 'critique', alerte: true, score: false, actif: true },
  { code: 'BOUTON_ALERTE', libelle: "Bouton d'alerte du conducteur", famille: 'signal', gravite: 'critique', alerte: true, score: false, actif: false },
  { code: 'SIGNAL', libelle: 'Signal perdu', famille: 'signal', gravite: 'majeur', seuil: 30, unite: 'min sans position', alerte: true, score: false, actif: true },
  { code: 'ENTREE_SITE', libelle: 'Entrée sur site', famille: 'site', gravite: 'mineur', alerte: false, score: false, actif: true },
  { code: 'SORTIE_SITE', libelle: 'Sortie de site', famille: 'site', gravite: 'mineur', alerte: false, score: false, actif: true },
  { code: 'ARRET', libelle: 'Arrêt', famille: 'arret', gravite: 'mineur', seuil: 10, unite: 'min', alerte: false, score: false, actif: true },
]
export const PARAMETRES_TELEMATIQUE_DEFAUT: ParametresTelematique = {
  vitesseLimiteKmh: 80, typesSitesRepos: ['Relais', 'Dépôt', 'Parking'], typesSitesInterdits: ['Zone à risque'],
  penaliteCritique: 15, penaliteMajeur: 8, penaliteMineur: 3, joursAlerteConduite: 7,
  delaiJustificationH: 24, regroupementExcesMin: 30, seuilHorsZoneM: 3000,
}

const CLE_EVENEMENTS = 'fms-ucodis-evenements-telematiques'
const CLE_TYPES = 'fms-ucodis-types-evenements'
const CLE_PARAMS = 'fms-ucodis-parametres-telematique'
const MAX_EVENEMENTS = 3000
const MAX_POINTS_DIRECT = 1500

/** Remontées de démonstration du boîtier, de la caméra et du diagnostic moteur. */
type Graine = [string, string, string, string, string, number | undefined, string | undefined, string | undefined]
const GRAINES: Graine[] = [
  // [vehiculeId, code, jour, heure, lieu, valeur, codeObd, detail]
  ['v-tr-2', 'VITESSE', '-9', '10:42', 'RN2, PK 63', 92, undefined, 'Vitesse limitée à 60 km/h sur cette section, pendant 4 min'],
  ['v-tr-2', 'VITESSE', '-3', '14:05', 'RN4, Ankazobe', 97, undefined, undefined],
  ['v-tr-4', 'FREINAGE', '-12', '15:10', 'RN7, Ambatolampy', 0.6, undefined, undefined],
  ['v-tr-1', 'FREINAGE', '-6', '08:20', 'RN2, Moramanga', 0.48, undefined, undefined],
  ['v-tr-1', 'ACCEL', decaler('2026-08-24'), '07:12', 'RN2, sortie de Tanjombato', 0.42, undefined, undefined],
  ['v-tr-2', 'ACCEL', decaler('2026-08-20'), '06:05', 'RN4, Ankazobe', 0.39, undefined, undefined],
  ['v-tr-2', 'ACCEL', decaler('2026-08-20'), '09:30', 'RN4, Maevatanana', 0.44, undefined, undefined],
  ['v-tr-4', 'ACCEL', decaler('2026-08-26'), '08:15', 'RN2, Brickaville', 0.37, undefined, undefined],
  ['v-tr-7', 'ACCEL', decaler('2026-09-03'), '07:45', 'RN4, Ankazobe', 0.4, undefined, undefined],
  ['v-tr-10', 'ACCEL', decaler('2026-08-22'), '10:20', 'RN4, Maevatanana', 0.38, undefined, undefined],
  ['v-tr-10', 'SOMNOLENCE', '-2', '02:40', 'RN4, Maevatanana', undefined, undefined, 'Paupières fermées plus de 2 s, à deux reprises'],
  ['v-tr-7', 'TELEPHONE', '-5', '09:12', 'RN4, Ankazobe', undefined, undefined, undefined],
  ['v-tr-4', 'CEINTURE', '-1', '07:05', 'RN7, Ambatolampy', undefined, undefined, undefined],
  ['v-tr-1', 'MASQUAGE', '-4', '22:30', 'Relais Moramanga', undefined, undefined, 'Objectif obstrué pendant 12 min'],
  ['v-tr-6', 'OBD', '-2', '11:18', 'RN2, Brickaville', undefined, 'P0420', 'Rendement du catalyseur sous le seuil'],
  ['v-tr-10', 'OBD', '-1', '16:02', 'RN4, Maevatanana', undefined, 'P0299', 'Sous-alimentation du turbocompresseur'],
  ['v-tr-2', 'OBD', '-20', '09:40', 'Dépôt', undefined, 'P0128', 'Température du liquide de refroidissement sous le seuil'],
]

export const useTelematiqueStore = defineStore('telematique', () => {
  const vehicules = useVehiculeStore()
  const voyagesStore = useVoyagesStore()
  const trajets = useTrajetsStore()
  const sitesStore = useSitesStore()
  const personnel = usePersonnelStore()
  const configuration = useConfigurationStore()
  const ecarts = useEcartsStore()
  const typesEcart = useConfigTypesEcartStore()

  const types = ref<TypeEvenementDef[]>(TYPES_EVENEMENT_DEFAUT.map(t => ({ ...t })))
  const parametres = ref<ParametresTelematique>({ ...PARAMETRES_TELEMATIQUE_DEFAUT, typesSitesRepos: [...PARAMETRES_TELEMATIQUE_DEFAUT.typesSitesRepos], typesSitesInterdits: [...PARAMETRES_TELEMATIQUE_DEFAUT.typesSitesInterdits] })
  try {
    const b = localStorage.getItem(CLE_TYPES)
    if (b) {
      const lus = JSON.parse(b) as TypeEvenementDef[]
      /* Type d'infraction par défaut repris s'il manquait : sans lui, le comportement ne compte jamais au score. */
      lus.forEach(t => { const d = TYPES_EVENEMENT_DEFAUT.find(x => x.code === t.code); if (!t.typeInfraction && d?.typeInfraction) t.typeInfraction = d.typeInfraction })
      types.value = [...lus, ...TYPES_EVENEMENT_DEFAUT.filter(d => !lus.some(t => t.code === d.code)).map(t => ({ ...t }))]
    }
  } catch { /* défaut */ }
  try { const b = localStorage.getItem(CLE_PARAMS); if (b) Object.assign(parametres.value, JSON.parse(b)) } catch { /* défaut */ }
  watch(types, v => { try { localStorage.setItem(CLE_TYPES, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  watch(parametres, v => { try { localStorage.setItem(CLE_PARAMS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  const typeDe = (code: string) => types.value.find(t => t.code === code)
  const libelleType = (code: string) => typeDe(code)?.libelle ?? code
  const rayonDefaut = () => configuration.parametres.rayonValidationPassageM

  function conducteurDe(vehiculeId: string, date: string, voyage?: Voyage | null) {
    const id = voyage?.chauffeurId ?? vehicules.conducteurAffecteLe(vehiculeId, date) ?? vehicules.affectationActive(vehiculeId)?.conducteurId ?? undefined
    return id ? { conducteurId: id, conducteurNom: voyage?.chauffeurId === id && voyage.chauffeurNom ? voyage.chauffeurNom : personnel.parId(id)?.nomComplet } : {}
  }

  /* ── Traces passées : reconstituées à partir des voyages réalisés ─────── */
  function dureePrevue(v: Voyage) {
    return (v.trajetId ? trajets.getById(v.trajetId)?.dureeEstimeeMin : undefined) ?? Math.round((v.kmReference || 50) / 45 * 60)
  }
  function traceDuVoyage(v: Voyage): PointTrace[] {
    const etapes = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    if (!v.dateDepartReel || etapes.length < 2) return []
    const debut = new Date(v.dateDepartReel).getTime()
    const fin = v.dateArriveeReelle ? new Date(v.dateArriveeReelle).getTime() : debut + dureePrevue(v) * 60_000
    const segments = etapes.slice(1).map((e, i) => ({ de: etapes[i]!, vers: e, km: distanceM(etapes[i]!, e) / 1000 }))
    const totalKm = segments.reduce((s, x) => s + x.km, 0) || 1
    const pauses = segments.slice(0, -1).map(s => (s.vers.pausePrevueMin ?? 10) * 60_000)
    const roulage = Math.max(60_000, fin - debut - pauses.reduce((s, x) => s + x, 0))
    const points: PointTrace[] = []
    let t = debut
    /* Un voyage encore en cours n'a parcouru qu'une partie de son tracé. */
    const limiteKm = v.statut === 'en_cours' ? totalKm * 0.6 : totalKm
    let parcouru = 0
    for (let k = 0; k < segments.length && parcouru < limiteKm; k++) {
      const s = segments[k]!
      const duree = roulage * (s.km / totalKm)
      const vitesse = Math.round(s.km / (duree / 3_600_000))
      const n = Math.max(1, Math.round(duree / 600_000))
      for (let i = 0; i < n; i++) {
        const f = i / n
        if (parcouru + s.km * f > limiteKm) break
        points.push({ t: new Date(t + duree * f).toISOString(), lat: s.de.lat + (s.vers.lat - s.de.lat) * f, lng: s.de.lng + (s.vers.lng - s.de.lng) * f, vitesse: i === 0 && k === 0 ? 0 : vitesse })
      }
      parcouru += s.km
      t += duree
      if (parcouru <= limiteKm) {
        points.push({ t: new Date(t).toISOString(), lat: s.vers.lat, lng: s.vers.lng, vitesse: 0 })
        if (k < pauses.length) { t += pauses[k]!; points.push({ t: new Date(t).toISOString(), lat: s.vers.lat, lng: s.vers.lng, vitesse: 0 }) }
      }
    }
    return points
  }
  const tracesPassees = computed(() => {
    const acc: Record<string, PointTrace[]> = {}
    voyagesStore.voyages.forEach(v => {
      if (!v.vehiculeId || !['en_cours', 'livre', 'cloture'].includes(v.statut)) return
      ;(acc[v.vehiculeId] ??= []).push(...traceDuVoyage(v))
    })
    Object.values(acc).forEach(l => l.sort((a, b) => a.t.localeCompare(b.t)))
    return acc
  })
  /** Positions reçues en direct depuis le chargement de l'application. */
  const pointsDirect = ref<Record<string, PointTrace[]>>({})

  /** Historique des positions d'un véhicule sur une période (FMS-GP-01). */
  function trace(vehiculeId: string, du: string, au: string): PointTrace[] {
    return [...(tracesPassees.value[vehiculeId] ?? []), ...(pointsDirect.value[vehiculeId] ?? [])]
      .filter(p => p.t >= du && p.t <= au)
      .sort((a, b) => a.t.localeCompare(b.t))
  }

  /* ── Événements ─────────────────────────────────────────────────────── */
  function nouvelId(liste: EvenementTelematique[]) {
    let n = liste.length + 1
    while (liste.some(e => e.id === `TEL-${String(n).padStart(4, '0')}`)) n++
    return `TEL-${String(n).padStart(4, '0')}`
  }

  function graines(): EvenementTelematique[] {
    const out: EvenementTelematique[] = []
    GRAINES.forEach(([vehiculeId, code, jour, heure, lieu, valeur, codeObd, detail]) => {
      const v = vehicules.parId(vehiculeId); const def = typeDe(code)
      if (!v || !def) return
      const date = `${jour.startsWith('-') ? dansNJours(Number(jour)) : jour}T${heure}:00`
      const e: EvenementTelematique = {
        id: nouvelId(out), vehiculeId, plaque: v.immatriculation, ...conducteurDe(vehiculeId, date), date, code, famille: def.famille,
        source: def.famille === 'camera' ? 'camera' : def.famille === 'defaut' ? 'obd' : 'boitier',
        lieu, valeur, unite: def.famille === 'comportement' ? (code === 'VITESSE' ? 'km/h' : 'g') : undefined, codeObd, detail,
        historique: [{ le: date, par: 'Télématique', action: 'Remonté par le véhicule' }],
      }
      const inf = def.typeInfraction ? useInfractionsStore().infractions.find(i => i.vehiculeId === vehiculeId && i.type === def.typeInfraction && Math.abs(new Date(i.date).getTime() - new Date(date).getTime()) < 10 * 60_000) : undefined
      if (inf) e.infractionId = inf.id
      if (code === 'OBD' && codeObd === 'P0128') e.acquitte = { par: 'Tojo Rasoanaivo', le: `${dansNJours(-19)}T08:30:00`, commentaire: 'Thermostat contrôlé à l’atelier : défaut fugitif, sans suite.' }
      out.push(e)
    })
    /* Entrées et sorties de site déduites des traces passées, par la même règle qu'en direct. */
    Object.entries(tracesPassees.value).forEach(([vehiculeId, pts]) => {
      const v = vehicules.parId(vehiculeId); if (!v) return
      let courant: string | null | undefined
      pts.forEach(p => {
        const s = siteContenant(p, sitesStore.sites, rayonDefaut())
        const id = s?.id ?? null
        if (courant !== undefined && id !== courant) {
          const ancien = courant ? sitesStore.getById(courant) : null
          if (ancien) out.push({ id: nouvelId(out), vehiculeId, plaque: v.immatriculation, ...conducteurDe(vehiculeId, p.t), date: p.t, code: 'SORTIE_SITE', famille: 'site', source: 'gps', lat: p.lat, lng: p.lng, lieu: ancien.nom, siteId: ancien.id, historique: [] })
          if (s) out.push({ id: nouvelId(out), vehiculeId, plaque: v.immatriculation, ...conducteurDe(vehiculeId, p.t), date: p.t, code: 'ENTREE_SITE', famille: 'site', source: 'gps', lat: p.lat, lng: p.lng, lieu: s.nom, siteId: s.id, historique: [] })
        }
        courant = id
      })
    })
    return out.sort((a, b) => b.date.localeCompare(a.date))
  }

  const evenements = ref<EvenementTelematique[]>([])
  try { const b = localStorage.getItem(CLE_EVENEMENTS); if (b) evenements.value = JSON.parse(b) as EvenementTelematique[] } catch { /* défaut */ }
  if (!evenements.value.length) evenements.value = graines()
  watch(evenements, v => { try { localStorage.setItem(CLE_EVENEMENTS, JSON.stringify(v.slice(0, MAX_EVENEMENTS))) } catch { /* ignoré */ } }, { deep: true })

  const getById = (id: string) => evenements.value.find(e => e.id === id)
  const actifs = computed(() => evenements.value.filter(e => typeDe(e.code)?.actif !== false))
  const duVehicule = (vehiculeId: string) => actifs.value.filter(e => e.vehiculeId === vehiculeId)
  const duConducteur = (conducteurId: string) => actifs.value.filter(e => e.conducteurId === conducteurId)
  const defautsOuverts = computed(() => actifs.value.filter(e => e.famille === 'defaut' && !e.ordreTravailRef && !e.acquitte))
  const signauxPerdus = computed(() => actifs.value.filter(e => e.famille === 'signal' && !e.finLe && !e.acquitte))
  const defautOuvertDe = (vehiculeId: string) => defautsOuverts.value.filter(e => e.vehiculeId === vehiculeId)
  const trace_ = (e: EvenementTelematique, par: string, action: string) => e.historique.push({ le: maintenant().toISOString(), par, action })

  function enregistrer(d: Omit<EvenementTelematique, 'id' | 'historique' | 'famille' | 'plaque'> & { historique?: EvenementTelematique['historique'] }): EvenementTelematique | null {
    const def = typeDe(d.code)
    const v = vehicules.parId(d.vehiculeId)
    if (!def || !def.actif || !v) return null
    const e: EvenementTelematique = { ...d, id: nouvelId(evenements.value), plaque: v.immatriculation, famille: def.famille, historique: d.historique ?? [{ le: d.date, par: 'Télématique', action: 'Remonté par le véhicule' }] }
    evenements.value.unshift(e)
    if (evenements.value.length > MAX_EVENEMENTS) evenements.value.splice(MAX_EVENEMENTS)
    return e
  }

  /** Un défaut moteur peut ouvrir un ordre de travail (FMS-GP-04). */
  function ouvrirOrdreTravail(id: string, par: string): { ok: boolean; ref?: string; motif?: string } {
    const e = getById(id); if (!e) return { ok: false, motif: 'Événement introuvable.' }
    if (e.famille !== 'defaut') return { ok: false, motif: "Seul un défaut moteur ouvre un ordre de travail." }
    if (e.ordreTravailRef) return { ok: false, motif: `Un ordre de travail est déjà ouvert (${e.ordreTravailRef}).` }
    if (e.acquitte) return { ok: false, motif: 'Ce défaut a été classé sans suite.' }
    const v = vehicules.parId(e.vehiculeId); if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
    if (v.statut === 'sorti') return { ok: false, motif: 'Ce véhicule est sorti du parc.' }
    const gravite = typeDe(e.code)?.gravite
    const ref = useMaintenanceStore().creerOT({
      vehiculeId: v.id, vehiculePlaque: v.immatriculation, origine: 'telematique', declarePar: par, declareLe: maintenant().toISOString(),
      symptome: `Code défaut ${e.codeObd ?? ''} : ${e.detail ?? libelleType(e.code)}`.trim(), gravite: gravite === 'critique' ? 'critique' : gravite === 'majeur' ? 'majeure' : 'mineure',
      typeMaintenance: 'correctif', kilometrage: v.kilometrage,
    })
    e.ordreTravailRef = ref
    trace_(e, par, `Ordre de travail ouvert : ${ref}`)
    return { ok: true, ref }
  }
  /** Classement sans suite d'un défaut ou d'une perte de signal, avec la raison. */
  function acquitter(id: string, par: string, commentaire: string): { ok: boolean; motif?: string } {
    const e = getById(id); if (!e) return { ok: false, motif: 'Événement introuvable.' }
    if (e.famille !== 'defaut' && e.famille !== 'signal') return { ok: false, motif: 'Cet événement ne se classe pas.' }
    if (e.acquitte || e.ordreTravailRef) return { ok: false, motif: 'Cet événement est déjà traité.' }
    if (!commentaire.trim()) return { ok: false, motif: 'Indiquez pourquoi il est classé sans suite.' }
    e.acquitte = { par, le: maintenant().toISOString(), commentaire: commentaire.trim() }
    trace_(e, par, 'Classé sans suite')
    return { ok: true }
  }
  /** Suite disciplinaire d'un comportement : ouvre une infraction rattachée à l'événement. */
  function creerInfraction(id: string, par: string): { ok: boolean; id?: string; motif?: string } {
    const e = getById(id); if (!e) return { ok: false, motif: 'Événement introuvable.' }
    if (e.infractionId) return { ok: false, motif: 'Une infraction est déjà rattachée à cet événement.' }
    const def = typeDe(e.code)
    const infractions = useInfractionsStore()
    const typeInf = def?.typeInfraction && infractions.types.some(t => t.code === def.typeInfraction && t.actif) ? def.typeInfraction : null
    if (!typeInf) return { ok: false, motif: "Aucun type d'infraction actif n'est associé à ce type d'événement." }
    const existante = infractions.infractions.find(i => i.vehiculeId === e.vehiculeId && i.type === typeInf && Math.abs(new Date(i.date).getTime() - new Date(e.date).getTime()) < 10 * 60_000)
    if (existante) { e.infractionId = existante.id; trace_(e, par, `Rattaché à l'infraction ${existante.reference}`); return { ok: true, id: existante.id } }
    const r = infractions.enregistrer({
      type: typeInf, date: e.date, lieu: e.lieu ?? 'Non précisé', vehiculeId: e.vehiculeId, vehiculePlaque: e.plaque,
      conducteurId: e.conducteurId, conducteurNom: e.conducteurNom, source: 'telematique',
      detail: [e.valeur != null ? `${e.valeur} ${e.unite ?? ''}`.trim() : '', e.detail ?? ''].filter(Boolean).join(' · ') || libelleType(e.code),
      gravite: def?.gravite === 'critique' ? 'grave' : def?.gravite === 'majeur' ? 'majeure' : 'mineure',
    }, par)
    if (!r.ok) return r
    e.infractionId = r.id
    trace_(e, par, `Infraction ouverte : ${infractions.getById(r.id!)?.reference ?? r.id}`)
    return { ok: true, id: r.id }
  }

  /* ── Score : les comportements à risque pèsent sur la sécurité routière ─ */
  function penalitesConducteur(conducteurId: string) {
    const p = parametres.value
    const ev = duConducteur(conducteurId).filter(e => typeDe(e.code)?.score)
    const n = { critique: 0, majeur: 0, mineur: 0 }
    ev.forEach(e => { n[typeDe(e.code)!.gravite]++ })
    const pen = (x: number) => Number.isFinite(x) ? Math.max(0, x) : 0
    return { ...n, total: ev.length, points: n.critique * pen(p.penaliteCritique) + n.majeur * pen(p.penaliteMajeur) + n.mineur * pen(p.penaliteMineur) }
  }

  /* ── Lien voyage ────────────────────────────────────────────────────── */
  const voyageEnCoursDe = (vehiculeId: string) => voyagesStore.voyages.find(v => v.vehiculeId === vehiculeId && v.statut === 'en_cours') ?? null
  /** Corridor contrôlé : le plan de trajet de l'ordre quand il en a un, sinon ses étapes. */
  const traceVoyage = (v: Voyage): PointGeo[] => (v.planTrajet && v.planTrajet.length >= 2 ? [...v.planTrajet] : [...v.etapes]).sort((a, b) => a.ordre - b.ordre).map(e => ({ lat: e.lat, lng: e.lng }))
  /** Étapes à desservir : une ligne annulée ou sortie de la tournée ne se contrôle plus. */
  function etapesControlees(v: Voyage): EtapeControlee[] {
    return v.etapes.filter(e => !e.ligneAnnuleeLe && !horsTournee(e)).map(e => ({ id: e.id, ordre: e.ordre, siteNom: e.siteNom, siteId: e.siteId, lat: e.lat, lng: e.lng, franchi: e.franchi }))
  }
  /** Seuil de sortie du corridor, à défaut le seuil « hors zone » des paramètres. */
  const seuilCorridorM = () => typesEcart.reglage('sortie_trajet')?.seuilValeur ?? parametres.value.seuilHorsZoneM
  /** Distance au tracé prévu du voyage en cours, en mètres ; null sans voyage. */
  function distanceAuTrace(vehiculeId: string): number | null {
    const v = voyageEnCoursDe(vehiculeId); const pos = vehicules.positions[vehiculeId]
    const trace = v ? traceVoyage(v) : []
    if (!v || !pos || trace.length < 2) return null
    return distanceTraceM(pos, trace)
  }
  /** Hors zone : en mission, hors du corridor ; sans mission, hors de tout site. */
  function horsZone(vehiculeId: string): boolean {
    const pos = vehicules.positions[vehiculeId]; if (!pos) return false
    const d = distanceAuTrace(vehiculeId)
    if (d != null) return d > seuilCorridorM()
    return !siteContenant(pos, sitesStore.sites, rayonDefaut())
  }
  const lieuDe = (p: PointGeo) => lieuLisible(p, sitesStore.sites, rayonDefaut())

  /* ── Traitement en direct de chaque remontée ────────────────────────── */
  interface EtatDirect {
    siteId?: string | null
    arretPas: number; arretDebut?: string; arretPoint?: PointGeo; arretEcartId?: string; reposEcartId?: string
    sortieEcartId?: string; sortieMaxM: number; sortieKm: number; sortiePas: number; dernierPoint?: PointGeo
    enExces: boolean; dernierExcesPas?: number; signalPas: number; signalEvtId?: string
    nuitEcartId?: string; nuitMin: number
  }
  const etats: Record<string, EtatDirect> = {}

  function signalerEcart(voyage: Voyage, vehiculeId: string, type: TypeEcart, p: PointGeo, mesures: Partial<Pick<EcartItineraire, 'dureeMin' | 'distanceKm' | 'ecartLateralMaxM' | 'etapeIds'>> = {}, unique = false, lieu?: string) {
    const reglage = typesEcart.reglage(type); if (!reglage) return null
    return ecarts.signaler({
      voyageId: voyage.id, voyageRef: voyage.reference, vehiculeId, vehiculePlaque: voyage.vehiculePlaque ?? vehicules.parId(vehiculeId)?.immatriculation ?? '',
      chauffeurId: voyage.chauffeurId, chauffeurNom: voyage.chauffeurNom, trajetLibelle: voyage.trajetLibelle,
      type, gravite: reglage.gravite, detecteLe: maintenant().toISOString(), lat: p.lat, lng: p.lng, lieu: lieu ?? lieuDe(p), ...mesures,
    }, unique)
  }

  /** Étapes déjà déclarées manquées sur ce voyage. */
  const etapesManqueesDe = (voyageId: string) => ecarts.ecartsDuVoyage(voyageId).filter(x => x.type === 'point_passage_manque').flatMap(x => x.etapeIds ?? [])
  /** Point manqué : un seul écart par voyage, complété si d'autres étapes restent sans passage. */
  function signalerPointsManques(voyage: Voyage, manquees: EtapeControlee[], p: PointGeo) {
    const deja = etapesManqueesDe(voyage.id)
    const nouvelles = manquees.filter(e => !deja.includes(e.id))
    if (!nouvelles.length) return
    const existant = ecarts.ecartsDuVoyage(voyage.id).find(x => x.type === 'point_passage_manque' && x.source === 'telematique')
    const ids = [...deja, ...nouvelles.map(e => e.id)]
    const lieu = `Non atteint : ${voyage.etapes.filter(e => ids.includes(e.id)).sort((a, b) => a.ordre - b.ordre).map(e => e.siteNom).join(', ')}`
    if (existant) { if (existant.nature === 'a_qualifier') ecarts.mettreAJour(existant.id, { etapeIds: ids, lieu }) ; return }
    signalerEcart(voyage, voyage.vehiculeId ?? '', 'point_passage_manque', p, { etapeIds: ids }, true, lieu)
  }

  /** Fin du voyage (livraison ou clôture) : étapes restées sans passage et
   *  kilométrage relevé au retour face au kilométrage de référence. */
  function controlerFinVoyage(voyage: Voyage) {
    const manquees = pointsManques(etapesControlees(voyage))
    if (manquees.length) signalerPointsManques(voyage, manquees, manquees[0]!)
    const reglageKm = typesEcart.reglage('ecart_kilometrique')
    if (voyage.statut === 'cloture' && reglageKm?.seuilValeur != null) {
      const km = calculerEcartKm(voyage, reglageKm.seuilValeur)
      const fin = [...voyage.etapes].sort((a, b) => a.ordre - b.ordre).at(-1)
      if (km.horsTolerance && km.ecartKm != null && fin)
        signalerEcart(voyage, voyage.vehiculeId ?? '', 'ecart_kilometrique', fin, { distanceKm: Math.abs(km.ecartKm) }, true,
          `${(voyage.kmArrivee ?? 0) - (voyage.kmDepart ?? 0)} km relevés pour ${voyage.kmReference} km prévus`)
    }
  }
  /* Temps de conduite et de repos (FMS-PA-04) : le dépassement déjà constaté sur
     le voyage produit un écart du type correspondant, à qualifier. */
  const TYPE_ECART_TEMPS: Partial<Record<RegleTemps, TypeEcart>> = {
    tcc: 'conduite_continue', pause: 'conduite_continue', tcj: 'conduite_journaliere', ttj: 'travail_journalier', trh: 'repos_hebdomadaire',
  }
  function controlerTemps(voyage: Voyage) {
    if (!voyage.chauffeurId || !voyage.dateArriveeReelle) return
    const fin = [...voyage.etapes].sort((a, b) => a.ordre - b.ordre).at(-1)
    useDisponibilitesStore().depassementsTemps(voyage.chauffeurId).filter(d => d.voyageId === voyage.id).forEach(d => {
      const type = TYPE_ECART_TEMPS[d.regle]; const reglage = type ? typesEcart.reglage(type) : null
      if (!type || !reglage) return
      ecarts.signaler({
        voyageId: voyage.id, voyageRef: voyage.reference, vehiculeId: voyage.vehiculeId, vehiculePlaque: voyage.vehiculePlaque ?? '',
        chauffeurId: voyage.chauffeurId, chauffeurNom: voyage.chauffeurNom, trajetLibelle: voyage.trajetLibelle,
        type, gravite: reglage.gravite, detecteLe: voyage.dateArriveeReelle!, lat: fin?.lat ?? 0, lng: fin?.lng ?? 0, lieu: d.motif,
      }, true)
    })
  }
  /* Conduite de nuit non autorisée : le véhicule roule pendant le voyage dans la plage de nuit des paramètres. */
  function controlerNuit(voyage: Voyage) {
    const reglage = typesEcart.reglage('conduite_nuit')
    if (!reglage || !voyage.vehiculeId || !configuration.plageNuit()) return
    const pts = traceDuVoyage(voyage)
    let minutes = 0; let premier: PointTrace | undefined
    pts.forEach((p, i) => {
      if (p.vitesse <= 0 || !configuration.dansPlageNuit(new Date(p.t))) return
      premier ??= p
      const suivant = pts[i + 1]
      if (suivant) minutes += Math.round((new Date(suivant.t).getTime() - new Date(p.t).getTime()) / 60_000)
    })
    if (!premier) return
    ecarts.signaler({
      voyageId: voyage.id, voyageRef: voyage.reference, vehiculeId: voyage.vehiculeId, vehiculePlaque: voyage.vehiculePlaque ?? '',
      chauffeurId: voyage.chauffeurId, chauffeurNom: voyage.chauffeurNom, trajetLibelle: voyage.trajetLibelle,
      type: 'conduite_nuit', gravite: reglage.gravite, detecteLe: premier.t, lat: premier.lat, lng: premier.lng, lieu: lieuDe(premier), dureeMin: minutes,
    }, true)
  }
  /* Voyages terminés : contrôlés à leur arrivée, et de nouveau quand les réglages changent. */
  watch(() => [
    voyagesStore.voyages.filter(v => v.dateArriveeReelle).map(v => `${v.id}:${v.dateArriveeReelle}`).join(','),
    typesEcart.types.filter(t => t.actif).map(t => `${t.detecte}:${t.gravite}`).join(','),
    JSON.stringify([configuration.parametres.nuitInterditeDebut, configuration.parametres.nuitInterditeFin, configuration.parametres.tccMaxMin, configuration.parametres.pauseApresTccMin,
      configuration.parametres.tcjMaxMin, configuration.parametres.ttjMaxMin, configuration.parametres.trhMinH]),
  ].join('|'), () => {
    voyagesStore.voyages.filter(v => v.dateArriveeReelle).forEach(v => { controlerTemps(v); controlerNuit(v) })
  }, { immediate: true })

  watch(() => voyagesStore.voyages.filter(v => v.statut === 'livre' || v.statut === 'cloture').map(v => `${v.id}:${v.statut}`), (cles, anciennes) => {
    cles.filter(c => !anciennes?.includes(c)).forEach(c => { const v = voyagesStore.getById(c.split(':')[0]!); if (v) controlerFinVoyage(v) })
  }, { immediate: true })

  function traiterRemontee(vehiculeId: string) {
    const v = vehicules.parId(vehiculeId); const pos = vehicules.positions[vehiculeId]
    if (!v || !pos) return
    const e = (etats[vehiculeId] ??= { arretPas: 0, sortieMaxM: 0, sortieKm: 0, sortiePas: 0, enExces: false, signalPas: 0, nuitMin: 0 })
    const minutes = vehicules.MINUTES_PAR_PAS
    const instant = maintenant().toISOString()
    const voyage = voyageEnCoursDe(vehiculeId)
    const conducteur = conducteurDe(vehiculeId, instant, voyage)

    /* Signal perdu : aucune position fiable tant que dure la perte. */
    if (vehicules.statutsOp[vehiculeId] === 'signal_perdu') {
      e.signalPas++
      const def = typeDe('SIGNAL')
      if (def?.actif && !e.signalEvtId && e.signalPas * minutes >= (def.seuil ?? 30)) {
        e.signalEvtId = enregistrer({ vehiculeId, ...conducteur, voyageId: voyage?.id, date: instant, code: 'SIGNAL', source: 'gps', lat: pos.lat, lng: pos.lng, lieu: `Dernière position : ${lieuDe(pos)}`, valeur: e.signalPas * minutes, unite: 'min' })?.id
      }
      return
    }
    if (e.signalEvtId) { const ev = getById(e.signalEvtId); if (ev && !ev.finLe) { ev.finLe = instant; trace_(ev, 'Télématique', 'Signal rétabli') } e.signalEvtId = undefined }
    e.signalPas = 0

    const point: PointTrace = { t: instant, lat: pos.lat, lng: pos.lng, vitesse: pos.vitesse }
    const liste = (pointsDirect.value[vehiculeId] ??= [])
    liste.push(point)
    if (liste.length > MAX_POINTS_DIRECT) liste.splice(0, liste.length - MAX_POINTS_DIRECT)

    /* Géorepérage : entrée et sortie horodatées automatiquement. */
    const site = siteContenant(pos, sitesStore.sites, rayonDefaut())
    const siteId = site?.id ?? null
    const premiere = e.siteId === undefined
    if (!premiere && siteId !== e.siteId) {
      const ancien = e.siteId ? sitesStore.getById(e.siteId) : null
      if (ancien) enregistrer({ vehiculeId, ...conducteur, voyageId: voyage?.id, date: instant, code: 'SORTIE_SITE', source: 'gps', lat: pos.lat, lng: pos.lng, lieu: ancien.nom, siteId: ancien.id })
      if (site) enregistrer({ vehiculeId, ...conducteur, voyageId: voyage?.id, date: instant, code: 'ENTREE_SITE', source: 'gps', lat: pos.lat, lng: pos.lng, lieu: site.nom, siteId: site.id })
    }
    if (site && voyage && (premiere || siteId !== e.siteId)) {
      const etapes = etapesControlees(voyage)
      const atteinte = etapeDuSite(site, etapes, rayonDefaut())
      const reelle = atteinte ? voyage.etapes.find(x => x.id === atteinte.id) : null
      if (atteinte && reelle && !reelle.franchi) {
        if (!premiere) {
          const { horsOrdre, devancees, manquees } = controlerPassage(etapes, atteinte, etapesManqueesDe(voyage.id))
          if (horsOrdre.length) signalerEcart(voyage, vehiculeId, 'ordre_passage', pos, { etapeIds: horsOrdre.map(x => x.id) }, true, `${site.nom} atteint après ${devancees.map(x => x.siteNom).join(', ')}`)
          if (manquees.length) signalerPointsManques(voyage, manquees, pos)
          /* Hors fenêtre horaire : passage trop loin de l'heure prévue sur ce site. */
          const reglageFenetre = typesEcart.reglage('fenetre_horaire')
          if (reglageFenetre && voyage.dateDepartReel) {
            const decalage = decalageFenetre(voyage.dateDepartReel, maintenant(), voyage.etapes, atteinte.id, reglageFenetre.seuilValeur ?? 0)
            if (decalage) signalerEcart(voyage, vehiculeId, 'fenetre_horaire', pos, { dureeMin: decalage }, true, site.nom)
          }
        }
        reelle.franchi = true
      }
    }
    e.siteId = siteId

    if (voyage && traceVoyage(voyage).length >= 2) {
      /* Sortie du corridor. */
      const reglageSortie = typesEcart.reglage('sortie_trajet')
      const d = distanceTraceM(pos, traceVoyage(voyage))
      if (reglageSortie && d > seuilCorridorM()) {
        if (e.dernierPoint && e.sortieEcartId) e.sortieKm += distanceM(e.dernierPoint, pos) / 1000
        e.sortiePas++
        e.sortieMaxM = Math.max(e.sortieMaxM, d)
        if (!e.sortieEcartId) { e.sortieEcartId = signalerEcart(voyage, vehiculeId, 'sortie_trajet', pos, { ecartLateralMaxM: Math.round(d), dureeMin: 0, distanceKm: 0 })?.id; e.sortieMaxM = d; e.sortieKm = 0; e.sortiePas = 0 }
        else ecarts.mettreAJour(e.sortieEcartId, { ecartLateralMaxM: Math.round(e.sortieMaxM), dureeMin: e.sortiePas * minutes, distanceKm: Math.round(e.sortieKm) })
      } else if (e.sortieEcartId) {
        ecarts.terminer(e.sortieEcartId, { ecartLateralMaxM: Math.round(e.sortieMaxM), dureeMin: e.sortiePas * minutes, distanceKm: Math.round(e.sortieKm) })
        e.sortieEcartId = undefined; e.sortieMaxM = 0; e.sortieKm = 0; e.sortiePas = 0
      }
      /* Dépassement du temps de trajet. */
      const reglageTemps = typesEcart.reglage('temps_trajet')
      if (reglageTemps && voyage.dateDepartReel) {
        const retard = depassementTemps(voyage.dateDepartReel, maintenant(), dureePrevue(voyage), reglageTemps.seuilValeur ?? 0)
        if (retard) signalerEcart(voyage, vehiculeId, 'temps_trajet', pos, { dureeMin: retard }, true)
      }
    }
    e.dernierPoint = { lat: pos.lat, lng: pos.lng }

    /* Conduite de nuit non autorisée : véhicule en mouvement pendant le voyage, dans la plage de nuit. */
    const nuit = configuration.dansPlageNuit(maintenant())
    if (voyage && pos.vitesse > 0 && nuit && typesEcart.reglage('conduite_nuit')) {
      if (!e.nuitEcartId) { e.nuitEcartId = signalerEcart(voyage, vehiculeId, 'conduite_nuit', pos, { dureeMin: minutes }, true)?.id; e.nuitMin = minutes }
      else { e.nuitMin += minutes; ecarts.mettreAJour(e.nuitEcartId, { dureeMin: e.nuitMin }) }
    } else if (e.nuitEcartId && (!nuit || !voyage)) {
      ecarts.terminer(e.nuitEcartId, { dureeMin: e.nuitMin }); e.nuitEcartId = undefined; e.nuitMin = 0
    }

    /* Arrêts : durée mesurée, qualifiée selon le lieu. */
    if (pos.vitesse === 0) {
      if (!e.arretPas) { e.arretDebut = instant; e.arretPoint = { lat: pos.lat, lng: pos.lng } }
      e.arretPas++
      if (voyage) {
        const duree = e.arretPas * minutes
        const surEtape = !!site && !!etapeDuSite(site, etapesControlees(voyage), rayonDefaut())
        const verdict = qualifierArret({
          dureeMin: duree, site, surEtapeDuVoyage: surEtape,
          seuilArretMin: typesEcart.reglage('arret_non_planifie')?.seuilValeur ?? null,
          seuilReposMin: typesEcart.reglage('repos_hors_parking')?.seuilValeur ?? null,
          typesSitesRepos: parametres.value.typesSitesRepos, typesSitesInterdits: parametres.value.typesSitesInterdits,
        })
        if (verdict.arretNonPlanifie) {
          if (!e.arretEcartId) e.arretEcartId = signalerEcart(voyage, vehiculeId, 'arret_non_planifie', pos, { dureeMin: duree })?.id
          else ecarts.mettreAJour(e.arretEcartId, { dureeMin: duree })
        }
        if (verdict.reposHorsParking) {
          if (!e.reposEcartId) e.reposEcartId = signalerEcart(voyage, vehiculeId, 'repos_hors_parking', pos, { dureeMin: duree })?.id
          else ecarts.mettreAJour(e.reposEcartId, { dureeMin: duree })
        }
      }
    } else if (e.arretPas) {
      const duree = e.arretPas * minutes
      const def = typeDe('ARRET')
      if (def?.actif && duree >= (def.seuil ?? 0) && e.arretPoint)
        enregistrer({ vehiculeId, ...conducteur, voyageId: voyage?.id, date: e.arretDebut ?? instant, finLe: instant, code: 'ARRET', source: 'gps', lat: e.arretPoint.lat, lng: e.arretPoint.lng, lieu: lieuDe(e.arretPoint), valeur: duree, unite: 'min' })
      if (e.arretEcartId) ecarts.terminer(e.arretEcartId, { dureeMin: duree })
      if (e.reposEcartId) ecarts.terminer(e.reposEcartId, { dureeMin: duree })
      e.arretPas = 0; e.arretEcartId = undefined; e.reposEcartId = undefined; e.arretDebut = undefined; e.arretPoint = undefined
    }

    /* Excès de vitesse : un événement par épisode. */
    const vitesse = typeDe('VITESSE')
    const limite = parametres.value.vitesseLimiteKmh
    if (vitesse?.actif && limite > 0 && pos.vitesse > limite + (vitesse.seuil ?? 0)) {
      /* Un épisode qui reprend dans le délai de regroupement reste le même excès. */
      if (!e.enExces && (e.dernierExcesPas == null || vehicules.pas - e.dernierExcesPas >= Math.max(0, parametres.value.regroupementExcesMin) / minutes)) { e.dernierExcesPas = vehicules.pas; enregistrer({ vehiculeId, ...conducteur, voyageId: voyage?.id, date: instant, code: 'VITESSE', source: 'boitier', lat: pos.lat, lng: pos.lng, lieu: lieuDe(pos), valeur: pos.vitesse, unite: 'km/h', detail: `Limite retenue : ${limite} km/h` }) }
      e.enExces = true
    } else if (pos.vitesse <= limite) e.enExces = false
  }

  /** Signaux ponctuels du boîtier et de la caméra : retenus au-delà du seuil de leur type. */
  function traiterSignal(s: { vehiculeId: string; code: string; valeur?: number }) {
    const def = typeDe(s.code); const pos = vehicules.positions[s.vehiculeId]
    if (!def?.actif || !pos) return
    if (def.seuil != null && s.valeur != null && s.valeur < def.seuil) return
    const voyage = voyageEnCoursDe(s.vehiculeId)
    const instant = maintenant().toISOString()
    enregistrer({ vehiculeId: s.vehiculeId, ...conducteurDe(s.vehiculeId, instant, voyage), voyageId: voyage?.id, date: instant, code: s.code,
      source: def.famille === 'camera' ? 'camera' : def.famille === 'defaut' ? 'obd' : 'boitier', lat: pos.lat, lng: pos.lng, lieu: lieuDe(pos),
      valeur: s.valeur, unite: def.famille === 'comportement' && s.valeur != null ? def.unite?.split(' ')[0] : undefined })
  }

  watch(() => vehicules.pas, () => {
    vehicules.tracteurs.forEach(t => traiterRemontee(t.id))
    vehicules.signauxBoitier.forEach(traiterSignal)
  })

  /** Journal d'un véhicule : événements télématiques et écarts de trajet, datés, sur une période. */
  interface LigneJournal { id: string; date: string; famille: FamilleEvenement | 'ecart'; libelle: string; detail: string; lieu?: string; conducteurNom?: string; gravite: GraviteEcart; nature?: NatureEcart; route: string; query: Record<string, string> }
  function journal(vehiculeId: string, du: string, au: string): LigneJournal[] {
    const v = vehicules.parId(vehiculeId); if (!v) return []
    /* Le journal garde tout ce qui a été remonté, même d'un type désactivé depuis. */
    const lignes: LigneJournal[] = evenements.value.filter(e => e.vehiculeId === vehiculeId && e.date >= du && e.date <= au).map(e => ({
      id: e.id, date: e.date, famille: e.famille, libelle: e.codeObd ? `${libelleType(e.code)} ${e.codeObd}` : libelleType(e.code),
      detail: [e.valeur != null ? `${e.valeur} ${e.unite ?? ''}`.trim() : '', e.detail ?? ''].filter(Boolean).join(' · '),
      lieu: e.lieu, conducteurNom: e.conducteurNom, gravite: typeDe(e.code)?.gravite ?? 'mineur', route: 'flotte-telemetrie', query: { evenement: e.id },
    }))
    ecarts.ecarts.filter(x => (x.vehiculeId === vehiculeId || x.vehiculePlaque === v.immatriculation) && x.detecteLe >= du && x.detecteLe <= au).forEach(x => lignes.push({
      id: x.id, date: x.detecteLe, famille: 'ecart', libelle: LIB_TYPE_ECART[x.type], detail: [x.voyageRef, x.dureeMin ? `${x.dureeMin} min` : '', x.distanceKm ? `${x.distanceKm} km` : ''].filter(Boolean).join(' · '),
      lieu: x.lieu, conducteurNom: x.chauffeurNom, gravite: x.gravite, nature: x.nature, route: 'flotte-conformite', query: { ecart: x.id },
    }))
    return lignes.sort((a, b) => b.date.localeCompare(a.date))
  }

  function ajouterType(d: { libelle: string; famille: FamilleEvenement; gravite: GraviteEcart }): { ok: boolean; motif?: string } {
    const l = d.libelle.trim()
    if (!l) return { ok: false, motif: 'Indiquez le libellé.' }
    if (types.value.some(t => t.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Ce type existe déjà.' }
    const base = l.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    let code = base; let n = 2
    while (types.value.some(t => t.code === code)) code = `${base}_${n++}`
    types.value.push({ code, libelle: l, famille: d.famille, gravite: d.gravite, alerte: false, score: d.famille === 'comportement' || d.famille === 'camera', actif: true })
    return { ok: true }
  }
  function majType(code: string, d: Partial<Omit<TypeEvenementDef, 'code' | 'famille'>>): { ok: boolean; motif?: string } {
    const t = typeDe(code); if (!t) return { ok: false, motif: 'Type introuvable.' }
    if (d.seuil != null && (!Number.isFinite(d.seuil) || d.seuil < 0)) return { ok: false, motif: 'Le seuil doit être un nombre positif.' }
    if (d.libelle != null && !d.libelle.trim()) return { ok: false, motif: 'Le libellé est obligatoire.' }
    Object.assign(t, d)
    return { ok: true }
  }
  function reinitialiser() {
    types.value = TYPES_EVENEMENT_DEFAUT.map(t => ({ ...t }))
    parametres.value = { ...PARAMETRES_TELEMATIQUE_DEFAUT, typesSitesRepos: [...PARAMETRES_TELEMATIQUE_DEFAUT.typesSitesRepos], typesSitesInterdits: [...PARAMETRES_TELEMATIQUE_DEFAUT.typesSitesInterdits] }
  }

  return {
    types, parametres, traceVoyage, typeDe, libelleType, evenements, actifs, getById, duVehicule, duConducteur, defautsOuverts, signauxPerdus, defautOuvertDe,
    enregistrer, ouvrirOrdreTravail, acquitter, creerInfraction, penalitesConducteur, trace, voyageEnCoursDe, distanceAuTrace, horsZone, lieuDe,
    journal, ajouterType, majType, reinitialiser, traiterRemontee, traiterSignal,
  }
})
