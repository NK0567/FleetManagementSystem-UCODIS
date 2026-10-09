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

/** Une ligne est « hors tournée » quand elle n'en fait plus partie et doit
 *  être replanifiée : son destinataire s'est déclaré indisponible avant
 *  chargement, le chauffeur a jugé non conforme ce que l'entrepôt a chargé
 *  pour lui, ou le client a demandé sur place de reporter à une autre date
 *  (la marchandise retourne alors à l'entrepôt). Elle ne compte plus pour la
 *  confirmation, le chargement ni l'exécution, et n'affecte jamais les
 *  autres lignes. */
export function horsTournee(e: { indisponibleLe?: string; chargementNonConformeLe?: string; retourEntrepotLe?: string }) {
  return !!e.indisponibleLe || !!e.chargementNonConformeLe || !!e.retourEntrepotLe
}

/** Libellé et couleur de chaque statut de tournée, partagés entre les vues. */
export const STATUTS_VOYAGE: Record<string, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-warning-bg text-warning' },
  planifie: { label: 'Planifié', cls: 'bg-info-bg text-info' },
  confirme: { label: 'Confirmé', cls: 'bg-info-bg text-info' },
  pret: { label: 'Prêt pour exécution', cls: 'bg-info-bg text-info' },
  affecte: { label: 'Affecté', cls: 'bg-primary/10 text-primary' },
  en_cours: { label: 'En cours', cls: 'bg-primary/10 text-primary' },
  livre: { label: 'En attente de clôture', cls: 'bg-success-bg text-success' },
  cloture: { label: 'Clôturé', cls: 'bg-neutral-bg text-neutral' },
  litige: { label: 'En litige', cls: 'bg-danger-bg text-danger' },
  annule: { label: 'Annulé', cls: 'bg-danger-bg text-danger' },
}

/** Poids et volume réellement transportés par un ordre : la somme de ses
 *  lignes encore dans la tournée. Pour une ligne ancienne sans poids connu,
 *  on retombe sur le poids saisi pour l'ordre entier. */
export function chargeOrdre(v: { etapes: { poidsKg?: number; volumeM3?: number; indisponibleLe?: string; chargementNonConformeLe?: string; retourEntrepotLe?: string; ligneAnnuleeLe?: string }[]; marchandise: { poidsChargeKg: number } }) {
  const lignes = v.etapes.filter(e => !horsTournee(e) && !e.ligneAnnuleeLe)
  const avecPoids = lignes.filter(e => e.poidsKg != null)
  const poidsKg = avecPoids.length ? avecPoids.reduce((s, e) => s + (e.poidsKg ?? 0), 0) : v.marchandise.poidsChargeKg
  const volumeM3 = lignes.reduce((s, e) => s + (e.volumeM3 ?? 0), 0)
  return { poidsKg, volumeM3, calculeDesLignes: avecPoids.length > 0 }
}
