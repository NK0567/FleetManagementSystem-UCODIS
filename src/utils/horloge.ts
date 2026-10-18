/**
 * Horloge de la maquette.
 *
 * La maquette raconte une histoire à une date fixe : vendredi 4 septembre
 * 2026. L'horloge système du navigateur ou du poste qui exécute
 * l'application n'a aucune raison d'être réglée sur cette date · et ne
 * l'est en général pas. Utiliser `new Date()` pour « aujourd'hui » ferait
 * donc dériver le tableau de bord, le planning et les échéances au fil du
 * temps réel, sans rapport avec la date racontée.
 *
 * Toute partie du code qui a besoin de savoir « quel jour sommes-nous »
 * doit passer par ce module plutôt que par `new Date()` directement.
 */

export const AUJOURDHUI_ISO = '2026-09-04'

export function aujourdhuiDate(): Date {
  return new Date(AUJOURDHUI_ISO + 'T00:00:00')
}

export function aujourdhuiISO(): string {
  return AUJOURDHUI_ISO
}

/** Décalage en jours par rapport à aujourd'hui · pour générer des données de démonstration cohérentes. */
export function dansNJours(jours: number): string {
  const d = aujourdhuiDate()
  d.setDate(d.getDate() + jours)
  return isoJour(d)
}

/** Date au format AAAA-MM-JJ selon le calendrier local (pas en UTC : à
 *  Douala, minuit local tombe la veille en UTC et décalerait d'un jour). */
export function isoJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Instant présent de la maquette : le jour raconté, à l'heure réelle du
 * poste. Toute date posée par une action (création, clôture, relevé) et
 * tout calcul de durée « jusqu'à maintenant » passent par ici, pour rester
 * cohérents avec les données de démonstration.
 */
export function maintenant(): Date {
  const r = new Date()
  const [a, m, j] = AUJOURDHUI_ISO.split('-').map(Number)
  return new Date(a!, m! - 1, j!, r.getHours(), r.getMinutes(), r.getSeconds(), r.getMilliseconds())
}
export const maintenantMs = (): number => maintenant().getTime()
