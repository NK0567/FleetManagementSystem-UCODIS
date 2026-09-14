import type { EtapeVoyage, Voyage } from '../types'

/**
 * Écart de poids entre le chargement et la livraison, repris du calcul de
 * coulage du socle FMS mais appliqué au fret général : un fret sec perd rarement
 * du poids en transit, mais un écart signale une marchandise manquante ou
 * endommagée, tout aussi digne d'attention qu'un coulage de carburant.
 */
export type VerdictEcart = 'incomplet' | 'dans_tolerance' | 'hors_mineur' | 'hors_majeur'

export function calculerEcartPoids(voyage: Voyage): {
  chargeKg: number | null; livreKg: number | null; ecartPourcent: number | null; verdict: VerdictEcart
} {
  const chargeKg = voyage.marchandise.poidsChargeKg ?? null
  const livreKg = voyage.marchandise.poidsDechargeKg ?? null
  if (chargeKg == null || livreKg == null) {
    return { chargeKg, livreKg, ecartPourcent: null, verdict: 'incomplet' }
  }
  const ecartPourcent = Math.round(((chargeKg - livreKg) / chargeKg) * 1000) / 10
  const seuil = voyage.toleranceEcartPoidsPourcent
  let verdict: VerdictEcart = 'dans_tolerance'
  if (ecartPourcent > seuil * 2) verdict = 'hors_majeur'
  else if (ecartPourcent > seuil) verdict = 'hors_mineur'
  return { chargeKg, livreKg, ecartPourcent, verdict }
}

/** Écart entre le kilométrage de référence du trajet et le kilométrage réellement parcouru. */
export function calculerEcartKm(voyage: Voyage, seuilPourcent = 5): { ecartKm: number | null; ecartPourcent: number | null; horsTolerance: boolean } {
  if (voyage.kmDepart == null || voyage.kmArrivee == null) return { ecartKm: null, ecartPourcent: null, horsTolerance: false }
  const reel = voyage.kmArrivee - voyage.kmDepart
  const ecartKm = reel - voyage.kmReference
  const ecartPourcent = voyage.kmReference > 0 ? Math.round((Math.abs(ecartKm) / voyage.kmReference) * 1000) / 10 : 0
  return { ecartKm, ecartPourcent, horsTolerance: ecartPourcent > seuilPourcent }
}

export function fmtKg(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} t` : `${kg} kg`
}

export function fmtDateHeure(iso?: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function avancementEtapes(etapes: EtapeVoyage[]) {
  const total = etapes.length
  const faits = etapes.filter(e => e.franchi).length
  return { faits, total, pct: total ? Math.round((faits / total) * 100) : 0 }
}

export const LIB_ROLE_ETAPE: Record<string, string> = {
  depart: 'Départ', chargement: 'Chargement', repos: 'Repos autorisé',
  controle: 'Point de contrôle', livraison: 'Livraison', arrivee: 'Arrivée',
}
