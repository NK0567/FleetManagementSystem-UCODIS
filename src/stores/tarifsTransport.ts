import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useClientsStore } from './clients'
import { usePrestatairesStore } from './prestataires'
import { useTrajetsStore } from './trajets'
import { useProduitsStore } from './produits'

/**
 * Grilles tarifaires du transport : celles des clients pour lesquels
 * l'entreprise transporte (valorisation des prestations) et celles des
 * transporteurs externes (contrôle de leurs factures). Une grille dépend de
 * la distance, du trajet, de la quantité ou du poids, et du type de
 * marchandise. Montants dans la monnaie de l'entreprise.
 */
export type CibleTarif = 'client' | 'transporteur'
export const LIB_CIBLE_TARIF: Record<CibleTarif, string> = { client: 'Client', transporteur: 'Transporteur externe' }

/** Base de calcul : par kilomètre, forfait par trajet de référence, par unité de produit, par tonne. */
export type BaseTarif = 'distance' | 'trajet' | 'quantite' | 'poids'
export const LIB_BASE_TARIF: Record<BaseTarif, string> = { distance: 'Par kilomètre', trajet: 'Forfait par trajet', quantite: 'Par unité de produit', poids: 'Par tonne' }

export interface TarifTransport {
  id: string
  cible: CibleTarif
  /** Identifiant du client (référentiel des clients) ou du transporteur (référentiel des prestataires). */
  tiersId: string
  base: BaseTarif
  /** Prix unitaire selon la base (par km, par trajet, par unité, par tonne). */
  prix: number
  /** Base « trajet » : le trajet de référence concerné. */
  trajetId?: string
  /** Type de marchandise : une famille de produits ; vide = toutes. */
  famille?: string
  /** Produit précis ; vide = tous les produits de la famille. */
  produitId?: string
  actif: boolean
}
export type SaisieTarif = Omit<TarifTransport, 'id' | 'actif'> & { actif?: boolean }
export interface Resultat { ok: boolean; motif?: string }

/** Prestation à valoriser : qui, quel trajet ou quelle distance, quelle quantité, quel poids, quel produit. */
export interface PrestationTarifee {
  cible: CibleTarif
  tiersId: string
  trajetId?: string
  distanceKm?: number
  quantite?: number
  poidsKg?: number
  /** Identifiant ou nom du produit transporté. */
  produit?: string
}
export interface ResultatTarif {
  montant: number
  tarif: TarifTransport
  /** Explication lisible du calcul, par exemple « 412 km x 3 500 ». */
  detail: string
}

const DEFAUT: TarifTransport[] = [
  { id: 'TRF-001', cible: 'client', tiersId: 'cli-002', base: 'trajet', trajetId: 'TRJ-002', prix: 1_800_000, actif: true },
  { id: 'TRF-002', cible: 'client', tiersId: 'cli-001', base: 'poids', prix: 95_000, actif: true },
  { id: 'TRF-003', cible: 'client', tiersId: 'cli-003', base: 'distance', prix: 4_200, actif: true },
  { id: 'TRF-004', cible: 'transporteur', tiersId: 'PRS-016', base: 'distance', prix: 3_600, actif: true },
  { id: 'TRF-005', cible: 'transporteur', tiersId: 'PRS-017', base: 'trajet', trajetId: 'TRJ-001', prix: 2_400_000, actif: true },
  { id: 'TRF-006', cible: 'transporteur', tiersId: 'PRS-017', base: 'quantite', famille: 'Carburant', prix: 45, actif: true },
]
const CLE = 'fms-ucodis-tarifs-transport'
const norm = (s?: string) => (s ?? '').trim().toLowerCase()

export const useTarifsTransportStore = defineStore('tarifsTransport', () => {
  let initial = DEFAUT.map(t => ({ ...t }))
  try { const b = localStorage.getItem(CLE); if (b) { const lus = JSON.parse(b); if (Array.isArray(lus)) initial = lus } } catch { /* défaut */ }
  const tarifs = ref<TarifTransport[]>(initial)
  watch(tarifs, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const getById = (id: string) => tarifs.value.find(t => t.id === id)
  const nomTiers = (cible: CibleTarif, id: string) => cible === 'client' ? useClientsStore().getById(id)?.nom ?? id : usePrestatairesStore().getById(id)?.nom ?? id
  /** Grilles d'un client ou d'un transporteur. */
  const tarifsDe = (cible: CibleTarif, tiersId: string) => tarifs.value.filter(t => t.cible === cible && t.tiersId === tiersId)

  function controler(s: SaisieTarif, ignorerId?: string): string | null {
    if (!s.tiersId) return s.cible === 'client' ? 'Choisissez le client.' : 'Choisissez le transporteur.'
    if (s.cible === 'client') {
      const c = useClientsStore().getById(s.tiersId)
      if (!c) return 'Client introuvable.'
      /* Les prestations se valorisent pour les clients externes, pas pour les services de l'entreprise. */
      if (c.nature === 'interne') return `${c.nom} est un service de l'entreprise : les tarifs clients concernent les clients externes.`
    }
    if (s.cible === 'transporteur') {
      const p = usePrestatairesStore().getById(s.tiersId)
      if (!p || p.type !== 'transporteur') return 'Choisissez un transporteur du référentiel des prestataires.'
    }
    if (!LIB_BASE_TARIF[s.base]) return 'Choisissez la base de calcul.'
    if (s.base === 'trajet' && !s.trajetId) return 'Choisissez le trajet de référence.'
    if (s.base === 'trajet' && !useTrajetsStore().getById(s.trajetId!)) return 'Trajet de référence introuvable.'
    if (s.prix == null || !Number.isFinite(s.prix)) return 'Indiquez le prix.'
    if (s.prix <= 0) return 'Le prix doit être positif.'
    if (s.produitId && !useProduitsStore().getById(s.produitId)) return 'Produit introuvable.'
    const doublon = tarifs.value.some(t => t.id !== ignorerId && t.cible === s.cible && t.tiersId === s.tiersId && t.base === s.base
      && (t.trajetId ?? '') === (s.base === 'trajet' ? s.trajetId ?? '' : '') && norm(t.famille) === norm(s.famille) && (t.produitId ?? '') === (s.produitId ?? ''))
    if (doublon) return 'Une grille identique existe déjà pour ce tiers : modifiez-la plutôt.'
    return null
  }
  const nettoyer = (s: SaisieTarif) => ({ cible: s.cible, tiersId: s.tiersId, base: s.base, prix: s.prix,
    trajetId: s.base === 'trajet' ? s.trajetId : undefined, famille: s.famille?.trim() || undefined, produitId: s.produitId || undefined })

  function creer(s: SaisieTarif): Resultat & { id?: string } {
    const motif = controler(s); if (motif) return { ok: false, motif }
    if (s.cible === 'transporteur') {
      const p = usePrestatairesStore().getById(s.tiersId)
      if (p && !p.autorise) return { ok: false, motif: `${p.nom} n'est pas autorisé à travailler avec l'entreprise : aucun nouveau tarif pour lui.` }
    }
    if (s.base === 'trajet' && useTrajetsStore().getById(s.trajetId!)?.statut !== 'actif') return { ok: false, motif: 'Ce trajet de référence est archivé : choisissez un trajet actif.' }
    const max = tarifs.value.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, '')) || 0), 0)
    const id = `TRF-${String(max + 1).padStart(3, '0')}`
    tarifs.value.push({ id, ...nettoyer(s), actif: s.actif ?? true })
    return { ok: true, id }
  }
  function modifier(id: string, s: Partial<SaisieTarif>): Resultat {
    const t = getById(id); if (!t) return { ok: false, motif: 'Grille introuvable.' }
    const fusion: SaisieTarif = { ...t, ...s }
    const motif = controler(fusion, id); if (motif) return { ok: false, motif }
    if (s.actif && !t.actif && t.cible === 'transporteur') {
      const p = usePrestatairesStore().getById(t.tiersId)
      if (p && !p.autorise) return { ok: false, motif: `${p.nom} n'est pas autorisé à travailler avec l'entreprise : son tarif ne peut pas être réactivé.` }
    }
    Object.assign(t, nettoyer(fusion)); if (s.actif !== undefined) t.actif = s.actif
    return { ok: true }
  }
  function supprimer(id: string): Resultat {
    if (!getById(id)) return { ok: false, motif: 'Grille introuvable.' }
    tarifs.value = tarifs.value.filter(t => t.id !== id)
    return { ok: true }
  }
  function reinitialiser() { tarifs.value = DEFAUT.map(t => ({ ...t })) }

  /**
   * Montant attendu d'une prestation selon la grille du client ou du
   * transporteur, avec la grille appliquée ; null si aucune grille active ne
   * s'applique ou si la donnée de base manque (distance, quantité, poids).
   * La grille la plus précise l'emporte : produit, puis famille, puis toutes
   * marchandises ; à précision égale, un forfait du trajet passe avant les
   * autres bases.
   */
  function tarifPour(p: PrestationTarifee): ResultatTarif | null {
    const produit = p.produit ? useProduitsStore().resoudre(p.produit) : undefined
    const famille = produit?.famille
    const candidats = tarifs.value.filter(t => t.actif && t.cible === p.cible && t.tiersId === p.tiersId)
      .filter(t => !t.produitId || t.produitId === produit?.id)
      .filter(t => !t.famille || norm(t.famille) === norm(famille))
      .map(t => calculer(t, p, produit?.unite))
      .filter((r): r is ResultatTarif => r !== null)
    if (!candidats.length) return null
    const precision = (t: TarifTransport) => (t.produitId ? 4 : t.famille ? 2 : 0) + (t.base === 'trajet' ? 1 : 0)
    candidats.sort((a, b) => precision(b.tarif) - precision(a.tarif))
    return candidats[0]!
  }
  function calculer(t: TarifTransport, p: PrestationTarifee, unite?: string): ResultatTarif | null {
    const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    switch (t.base) {
      case 'trajet':
        return p.trajetId && t.trajetId === p.trajetId ? { montant: t.prix, tarif: t, detail: `Forfait ${useTrajetsStore().getById(t.trajetId)?.libelle ?? t.trajetId}` } : null
      case 'distance':
        return p.distanceKm != null && p.distanceKm > 0 ? { montant: Math.round(p.distanceKm * t.prix), tarif: t, detail: `${fmt(p.distanceKm)} km x ${fmt(t.prix)}` } : null
      case 'quantite':
        return p.quantite != null && p.quantite > 0 ? { montant: Math.round(p.quantite * t.prix), tarif: t, detail: `${fmt(p.quantite)} ${unite ?? 'unités'} x ${fmt(t.prix)}` } : null
      case 'poids':
        return p.poidsKg != null && p.poidsKg > 0 ? { montant: Math.round((p.poidsKg / 1000) * t.prix), tarif: t, detail: `${fmt(p.poidsKg / 1000)} t x ${fmt(t.prix)}` } : null
    }
  }

  return { tarifs, getById, tarifsDe, nomTiers, creer, modifier, supprimer, reinitialiser, tarifPour }
})
