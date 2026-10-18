/**
 * Heures de livraison d'une expédition : heure prévue, heure d'arrivée
 * estimée, retard.
 *
 * L'heure prévue part de la date prévue de l'ordre et cumule les temps de
 * trajet entre les points, dans l'ordre de livraison : le temps du trajet de
 * référence quand il est connu, sinon la distance parcourue à la vitesse
 * moyenne. Elle est fixée à la planification.
 *
 * L'heure estimée suit la tournée : avant le départ, elle part de la date
 * prévue (ou de maintenant si cette date est dépassée) ; en cours, elle part
 * de la position du véhicule quand le suivi GPS du FMS la connaît (boîtier
 * opérationnel et signal reçu), le premier tronçon se calculant alors par la
 * distance ; sinon (pas de boîtier, signal perdu, transporteur externe) du
 * dernier point réglé, et la position est dite inconnue. Une livraison
 * arrivée a son heure réelle. La vitesse moyenne se règle dans les
 * paramètres de la planification.
 *
 * Le retard est signalé au-delà de la marge réglée dans les paramètres de la
 * planification.
 */
import type { EtapeVoyage, Voyage } from '../types'
import { dansLaTournee } from '../utils/voyageUtils'
import { distanceKm } from './propositionChargement'
import { maintenantMs } from '../utils/horloge'
import { useVehiculeStore } from '../stores/vehicules'
import { useSitesStore } from '../stores/sites'
import { useParametresPlanificationStore } from '../stores/parametresPlanification'

/** Vitesse moyenne retenue pour estimer un temps de trajet sans référence (km/h), réglée dans les paramètres. */
export function vitesseMoyenneKmh(): number {
  const v = useParametresPlanificationStore().parametres.vitesseMoyenneKmh
  return Number.isFinite(v) && v > 0 ? v : 45
}

type Point = { lat: number; lng: number }
const STATUTS_AVANT_DEPART: Voyage['statut'][] = ['en_attente', 'planifie', 'confirme', 'pret']

function tri(v: Voyage) { return [...v.etapes].sort((a, b) => a.ordre - b.ordre) }

/** Point de départ : étape de départ, sinon base du véhicule, sinon dépôt du référentiel. */
export function pointDepart(v: Voyage): Point | null {
  const depart = v.etapes.find(e => e.role === 'depart')
  if (depart) return { lat: depart.lat, lng: depart.lng }
  const plan = v.planTrajet?.find(p => p.role === 'depart')
  if (plan) return { lat: plan.lat, lng: plan.lng }
  const sites = useSitesStore()
  const base = v.vehiculeId ? useVehiculeStore().parId(v.vehiculeId)?.site : undefined
  const site = (base && sites.actifs.find(s => s.nom === base)) || sites.actifs.find(s => /d[ée]p[ôo]t|base/i.test(s.type)) || sites.actifs[0]
  if (site) return { lat: site.lat, lng: site.lng }
  const premier = tri(v)[0]
  return premier ? { lat: premier.lat, lng: premier.lng } : null
}

/** Temps de trajet jusqu'à un point, en minutes : le temps de référence du
 *  point, sauf depuis une position GPS (le véhicule est en route, seule la
 *  distance qui lui reste compte). */
function dureeVers(depuis: Point, e: EtapeVoyage, parDistance = false): number {
  if (e.intervalleMin > 0 && !parDistance) return e.intervalleMin
  return distanceKm(depuis, e) / vitesseMoyenneKmh() * 60
}

/** Cumule les temps de trajet le long d'une suite de points, jusqu'à la ligne voulue. */
function cumuler(depuis: Point, debutMs: number, suite: EtapeVoyage[], ligne: EtapeVoyage, premierParDistance = false): number | null {
  let t = debutMs, pos = depuis
  for (const [i, e] of suite.entries()) {
    t += dureeVers(pos, e, premierParDistance && i === 0) * 60_000
    if (e.id === ligne.id) return t
    t += (e.pausePrevueMin ?? 0) * 60_000
    pos = e
  }
  return null
}

/** Heure prévue d'arrivée à une livraison, calculée sans tenir compte de ce qui est déjà fixé. */
export function heurePrevueCalculee(v: Voyage, ligne: EtapeVoyage): Date | null {
  const depart = pointDepart(v)
  if (!depart || !v.datePlanifiee) return null
  const suite = tri(v).filter(e => dansLaTournee(e) || e.id === ligne.id)
  const t = cumuler(depart, new Date(v.datePlanifiee).getTime(), suite, ligne)
  return t == null ? null : new Date(t)
}

/** Heure prévue d'arrivée : celle fixée à la planification, sinon calculée. */
export function heurePrevue(v: Voyage, ligne: EtapeVoyage): Date | null {
  if (ligne.heurePrevue) return new Date(ligne.heurePrevue)
  return heurePrevueCalculee(v, ligne)
}

/** Position GPS du véhicule de l'entreprise quand le FMS la connaît : un
 *  boîtier opérationnel et un signal reçu. Sans boîtier, signal perdu ou
 *  transporteur externe, la position est inconnue. */
export function positionVehicule(v: Voyage): (Point & { vitesse: number }) | null {
  if (v.moyen === 'externe' || !v.vehiculeId) return null
  const vehicules = useVehiculeStore()
  if (!vehicules.aBoitier(v.vehiculeId) || vehicules.statutsOp[v.vehiculeId] === 'signal_perdu') return null
  const p = vehicules.positions[v.vehiculeId]
  return p ? { lat: p.lat, lng: p.lng, vitesse: p.vitesse } : null
}
/** Expédition en route dont la position n'est pas connue : l'heure estimée part du dernier point réglé. */
export function positionInconnue(v: Voyage): boolean {
  return v.statut === 'en_cours' && !positionVehicule(v)
}

/** Instant où un point a été réglé (arrivée, déclaration, report, refus). */
function instantRegle(e: EtapeVoyage): string | undefined {
  return e.livreParChauffeurLe ?? e.ligneAnnuleeLe ?? e.retourEntrepotLe ?? e.reporteLe ?? e.arriveeLe
}
function regle(e: EtapeVoyage) {
  return e.franchi || !!e.arriveeLe || !!e.reporteLe || !!e.ligneAnnuleeLe || !dansLaTournee(e)
}

/** Heure d'arrivée estimée (ou réelle, une fois le conducteur arrivé). */
export function heureEstimee(v: Voyage, ligne: EtapeVoyage): Date | null {
  if (ligne.arriveeLe) return new Date(ligne.arriveeLe)
  if (ligne.franchi) return ligne.livreParChauffeurLe ? new Date(ligne.livreParChauffeurLe) : null
  if (!dansLaTournee(ligne) || ligne.reporteLe) return null
  if (v.statut === 'annule' || v.statut === 'livre' || v.statut === 'cloture') return null
  const maintenant = maintenantMs()
  const suite = tri(v)

  if (STATUTS_AVANT_DEPART.includes(v.statut)) {
    const depart = pointDepart(v)
    if (!depart || !v.datePlanifiee) return null
    const debut = Math.max(new Date(v.datePlanifiee).getTime(), maintenant)
    const t = cumuler(depart, debut, suite.filter(e => dansLaTournee(e)), ligne)
    return t == null ? null : new Date(t)
  }

  /* En cours : on repart du dernier point réglé avant cette ligne. */
  const index = suite.findIndex(e => e.id === ligne.id)
  let iRef = -1
  for (let i = index - 1; i >= 0; i--) if (regle(suite[i]!)) { iRef = i; break }
  const restantes = suite.slice(iRef + 1, index + 1).filter(e => e.id === ligne.id || !regle(e))
  const gps = positionVehicule(v)
  let pos: Point | null, debut: number
  if (gps) { pos = gps; debut = maintenant }
  else if (iRef >= 0) {
    const ref = suite[iRef]!
    pos = ref
    const instant = instantRegle(ref)
    const prevue = instant ? null : heurePrevue(v, ref)
    debut = instant ? new Date(instant).getTime() : prevue ? prevue.getTime() : maintenant
  } else {
    pos = pointDepart(v)
    debut = v.dateDepartReel ? new Date(v.dateDepartReel).getTime() : maintenant
  }
  if (!pos) return null
  const t = cumuler(pos, debut, restantes, ligne, !!gps)
  /* Une livraison qui n'a pas encore eu lieu ne peut pas être estimée dans le passé. */
  return t == null ? null : new Date(Math.max(t, maintenant))
}

/** Écart en minutes entre l'heure estimée (ou réelle) et l'heure prévue ; positif = en retard. */
export function retardMinutes(v: Voyage, ligne: EtapeVoyage): number | null {
  const prevue = heurePrevue(v, ligne)
  const estimee = heureEstimee(v, ligne)
  if (!prevue || !estimee) return null
  return Math.round((estimee.getTime() - prevue.getTime()) / 60_000)
}

/** Marge réglée dans les paramètres de la planification. */
export function margeRetardMin(): number {
  return useParametresPlanificationStore().parametres.margeRetardMin ?? 30
}

/** Livraison en retard : au-delà de la marge réglée. */
export function estEnRetard(v: Voyage, ligne: EtapeVoyage): boolean {
  const r = retardMinutes(v, ligne)
  return r != null && r > margeRetardMin()
}

/** Expédition dont une livraison encore à faire est en retard. */
export function voyageEnRetard(v: Voyage): boolean {
  if (v.statut === 'annule' || v.statut === 'livre' || v.statut === 'cloture') return false
  return v.etapes.some(e => e.role === 'livraison' && dansLaTournee(e) && !e.franchi && !e.arriveeLe && estEnRetard(v, e))
}

/** Heure lisible, par exemple « 10 h 15 ». */
export function fmtHeure(d: Date | null | undefined): string {
  if (!d) return '-'
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`
}
/** Jour et heure lisibles, par exemple « 10/09/2026 à 10 h 15 ». */
export function fmtJourHeure(d: Date | null | undefined): string {
  if (!d) return '-'
  return `${d.toLocaleDateString('fr-FR')} à ${fmtHeure(d)}`
}
/** Retard lisible : « 1 h 05 de retard », « 12 min d'avance », « à l'heure ». */
export function fmtRetard(min: number | null): string {
  if (min == null) return ''
  const abs = Math.abs(min)
  const duree = abs >= 60 ? `${Math.floor(abs / 60)} h ${String(abs % 60).padStart(2, '0')}` : `${abs} min`
  if (abs === 0) return "à l'heure"
  return min > 0 ? `${duree} de retard` : `${duree} d'avance`
}
/** Arrivée lisible : « vers 10 h 15 » le jour même, « le 10/09/2026 vers 10 h 15 » sinon. */
export function fmtArrivee(d: Date | null | undefined): string {
  if (!d) return ''
  const auj = new Date(maintenantMs())
  return d.toDateString() === auj.toDateString() ? `vers ${fmtHeure(d)}` : `le ${d.toLocaleDateString('fr-FR')} vers ${fmtHeure(d)}`
}
