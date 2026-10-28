/**
 * Règles de détection des écarts de trajet (FMS-GP-02), sous forme de
 * fonctions pures : elles ne font que constater à partir des positions et du
 * voyage prévu, sans présumer d'aucune intention. Le store télématique les
 * applique à chaque remontée ; elles se testent seules.
 */
import { distanceM, type PointGeo, type ZoneSite } from './geo'

export interface EtapeControlee extends PointGeo { id: string; ordre: number; siteNom: string; siteId?: string; franchi: boolean }

/** Une étape est atteinte quand le véhicule est dans la zone du site de cette étape. */
export function etapeDuSite(site: ZoneSite, etapes: EtapeControlee[], rayonDefautM: number): EtapeControlee | null {
  const rayon = site.rayonM ?? rayonDefautM
  return etapes.find(e => e.siteId === site.id) ?? etapes.find(e => distanceM(e, site) <= rayon) ?? null
}

/**
 * Contrôle d'un passage sur une étape. L'ordre de passage n'est pas respecté
 * quand l'étape est atteinte alors qu'une étape prévue plus loin est déjà
 * franchie. Si l'étape atteinte est la dernière, les étapes restées sans
 * passage sont des points manqués. Une étape déjà déclarée manquée n'est pas
 * signalée une seconde fois comme hors ordre : jamais deux écarts pour la même
 * étape.
 */
export function controlerPassage(etapes: EtapeControlee[], atteinte: EtapeControlee, dejaManquees: string[] = []): { horsOrdre: EtapeControlee[]; devancees: EtapeControlee[]; manquees: EtapeControlee[] } {
  const triees = [...etapes].sort((a, b) => a.ordre - b.ordre)
  const devancees = triees.filter(e => e.ordre > atteinte.ordre && e.franchi)
  const horsOrdre = devancees.length && !dejaManquees.includes(atteinte.id) ? [atteinte] : []
  const derniere = triees[triees.length - 1]
  const manquees = derniere && derniere.id === atteinte.id ? pointsManques(triees.filter(e => e.id !== atteinte.id)) : []
  return { horsOrdre, devancees, manquees }
}

/** Étapes restées sans passage : à l'arrivée sur la dernière étape, à la livraison ou à la clôture. */
export function pointsManques(etapes: EtapeControlee[]): EtapeControlee[] {
  return [...etapes].sort((a, b) => a.ordre - b.ordre).filter(e => !e.franchi)
}

/**
 * Heure de passage prévue sur une étape : départ réel, plus les temps de
 * trajet et d'arrêt prévus des étapes précédentes, plus le temps de trajet
 * jusqu'à l'étape. Renvoie le décalage en minutes au-delà du seuil, sinon 0.
 */
export interface EtapePlanifiee { id: string; ordre: number; intervalleMin: number; pausePrevueMin?: number }
export function decalageFenetre(departISO: string, passage: Date, etapes: EtapePlanifiee[], atteinteId: string, seuilMin: number): number {
  const triees = [...etapes].sort((a, b) => a.ordre - b.ordre)
  const i = triees.findIndex(e => e.id === atteinteId)
  if (i <= 0) return 0
  const prevuMin = triees.slice(0, i + 1).reduce((s, e, k) => s + (e.intervalleMin ?? 0) + (k < i ? (e.pausePrevueMin ?? 0) : 0), 0)
  if (!prevuMin) return 0
  const reelMin = (passage.getTime() - new Date(departISO).getTime()) / 60_000
  const decalage = Math.abs(reelMin - prevuMin)
  return decalage > seuilMin ? Math.round(decalage) : 0
}

export type VerdictArret = { arretNonPlanifie: boolean; reposHorsParking: boolean }

/**
 * Qualification d'un arrêt en cours. Un arrêt sur une étape du voyage
 * (chargement, livraison, repos prévu) est toujours autorisé. Ailleurs, il
 * l'est dans tout site actif dont le type n'est pas interdit ; au-delà du
 * seuil de repos, il doit se tenir dans un site d'un type désigné pour le
 * repos.
 */
export function qualifierArret(opts: {
  dureeMin: number
  site: ZoneSite | null
  surEtapeDuVoyage: boolean
  seuilArretMin: number | null
  seuilReposMin: number | null
  typesSitesRepos: string[]
  typesSitesInterdits: string[]
}): VerdictArret {
  if (opts.surEtapeDuVoyage) return { arretNonPlanifie: false, reposHorsParking: false }
  const autorise = !!opts.site && !opts.typesSitesInterdits.includes(opts.site.type)
  const parking = !!opts.site && opts.typesSitesRepos.includes(opts.site.type)
  return {
    arretNonPlanifie: opts.seuilArretMin != null && !autorise && opts.dureeMin >= opts.seuilArretMin,
    reposHorsParking: opts.seuilReposMin != null && !parking && opts.dureeMin >= opts.seuilReposMin,
  }
}

/** Dépassement du temps de trajet : durée écoulée au-delà de la durée prévue augmentée du seuil. */
export function depassementTemps(departISO: string, maintenant: Date, dureePrevueMin: number, seuilMin: number): number {
  const ecoule = (maintenant.getTime() - new Date(departISO).getTime()) / 60_000
  const depassement = ecoule - dureePrevueMin
  return depassement > seuilMin ? Math.round(depassement) : 0
}
