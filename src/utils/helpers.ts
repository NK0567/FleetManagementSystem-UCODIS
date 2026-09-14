import { aujourdhuiDate } from './horloge'

/** Initiales calculées depuis le nom complet · jamais saisies à la main. */
export function initiales(nom: string): string {
  return nom
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0]!.toUpperCase())
    .slice(0, 2)
    .join('')
}

/** Affiche une date ISO au format jj/mm/aaaa. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '-'
  const [a, m, j] = iso.split('-')
  if (!a || !m || !j) return iso
  return `${j}/${m}/${a}`
}

/** Nombre de jours entre aujourd'hui et une date ISO (négatif = dépassé). */
export function joursRestants(iso?: string | null): number | null {
  if (!iso) return null
  const cible = new Date(iso + 'T00:00:00')
  const today = aujourdhuiDate()
  return Math.round((cible.getTime() - today.getTime()) / 86400000)
}

/**
 * État d'une échéance selon le seuil d'alerte paramétré.
 * Règle UCODIS : alerte à J-30 par défaut (cahier des charges, module 9).
 */
export function etatEcheance(iso?: string | null, seuil = 30): 'valide' | 'proche' | 'expire' | 'absent' {
  if (!iso) return 'absent'
  const j = joursRestants(iso)
  if (j === null) return 'absent'
  if (j < 0) return 'expire'
  if (j <= seuil) return 'proche'
  return 'valide'
}
