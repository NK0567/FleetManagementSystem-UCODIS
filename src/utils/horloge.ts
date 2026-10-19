/**
 * Horloge de la maquette.
 *
 * La maquette suit la date réelle du poste. Les données de démonstration
 * ont été écrites autour d'une date de référence (vendredi 4 septembre
 * 2026) : `decaler()` les ramène autour d'aujourd'hui, en gardant les mêmes
 * écarts (« il y a 3 jours », « dans 15 jours »), pour que l'histoire
 * racontée reste cohérente quel que soit le jour où l'on ouvre l'application.
 *
 * Toute partie du code qui a besoin de savoir « quel jour sommes-nous »
 * passe par ce module.
 */

/** Date autour de laquelle les données de démonstration ont été écrites. */
export const DATE_REFERENCE = '2026-09-04'

/** Date au format AAAA-MM-JJ selon le calendrier local (pas en UTC : à
 *  Douala, minuit local tombe la veille en UTC et décalerait d'un jour). */
export function isoJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const jourLocal = (iso: string) => { const [a, m, j] = iso.slice(0, 10).split('-').map(Number); return new Date(a!, m! - 1, j!) }

export const AUJOURDHUI_ISO = isoJour(new Date())

/** Nombre de jours entre la date de référence des données et aujourd'hui. */
export const DECALAGE_JOURS = Math.round((+jourLocal(AUJOURDHUI_ISO) - +jourLocal(DATE_REFERENCE)) / 86_400_000)

/** Décale une date de démonstration (AAAA-MM-JJ, avec ou sans heure) pour
 *  qu'elle garde le même écart à aujourd'hui qu'à la date de référence. */
export function decaler(iso: string, jours = DECALAGE_JOURS): string {
  if (!jours || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso
  const d = jourLocal(iso)
  d.setDate(d.getDate() + jours)
  return isoJour(d) + iso.slice(10)
}

export function aujourdhuiDate(): Date {
  return jourLocal(AUJOURDHUI_ISO)
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

/** Instant présent : la date et l'heure réelles du poste. */
export function maintenant(): Date {
  return new Date()
}
export const maintenantMs = (): number => maintenant().getTime()

/* Les données déjà enregistrées dans le navigateur un autre jour gardent
 * leurs dates d'alors : on les avance du nombre de jours écoulés, pour que
 * tout reste cohérent avec les données de démonstration du jour. */
;(function recalerDonneesEnregistrees() {
  try {
    const CLE = 'fms-ucodis-decalage-jours'
    const lu = localStorage.getItem(CLE)
    /* Sans marque, des données déjà enregistrées l'ont été quand la
     * maquette vivait encore à la date de référence (décalage nul). */
    let dejaEnregistre = false
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith('fms-ucodis-')) { dejaEnregistre = true; break }
    let avant = lu != null ? Number(lu) : dejaEnregistre ? 0 : NaN
    /* Repère sûr : la date prévue enregistrée du premier ordre de
     * démonstration dit de combien les données stockées sont déjà décalées. */
    try {
      const v = (JSON.parse(localStorage.getItem('fms-ucodis-voyages') ?? '[]') as { id?: string; datePlanifiee?: string }[]).find(x => x?.id === 'VOY-001')
      if (v?.datePlanifiee && /^\d{4}-\d{2}-\d{2}/.test(v.datePlanifiee))
        avant = Math.round((+jourLocal(v.datePlanifiee) - +jourLocal('2026-08-24')) / 86_400_000)
    } catch { /* repère illisible : on garde la marque */ }
    if (!Number.isNaN(avant) && avant !== DECALAGE_JOURS) {
      const delta = DECALAGE_JOURS - avant
      const date = /"(\d{4}-\d{2}-\d{2})((?:T[^"]*)?)"/g
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || !k.startsWith('fms-ucodis-') || k === CLE) continue
        const v = localStorage.getItem(k)
        if (v && date.test(v)) { date.lastIndex = 0; localStorage.setItem(k, v.replace(date, (_m, j: string, h: string) => `"${decaler(j, delta)}${h}"`)) }
        date.lastIndex = 0
      }
    }
    localStorage.setItem(CLE, String(DECALAGE_JOURS))
  } catch { /* stockage indisponible : rien à recaler */ }
})()
