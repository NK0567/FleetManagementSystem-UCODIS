import { maintenantMs, maintenant } from '../utils/horloge'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Fournisseur, ProduitStock, MouvementStock } from '../types/maintenance'
import { usePrestatairesStore } from './prestataires'

/**
 * Achats & stock de pièces.
 *
 * Complète `DemandeAchat` (maintenance.ts, une demande par intervention)
 * avec un catalogue partagé : les mêmes pièces reviennent d'un ordre de
 * travail à l'autre. Un produit a un stock réel, un fournisseur
 * principal, et chaque sortie de stock trace l'intervention, le
 * véhicule et le kilométrage qui l'ont consommée - la chaîne complète
 * Fournisseur ↔ Produit ↔ Stock ↔ Intervention ↔ Kilométrage.
 */
export const useAchatsStore = defineStore('achats', () => {

  /* Fournisseurs de pièces : les prestataires autorisés de ce type, tenus
     dans le référentiel des prestataires. Un prestataire non autorisé
     n'est plus proposé. Seul le délai moyen de livraison est propre aux achats. */
  const prestataires = usePrestatairesStore()
  const delaisLivraison = ref<Record<string, number>>({ 'PRS-006': 5, 'PRS-013': 3, 'PRS-014': 7, 'PRS-015': 6 })
  const fournisseurs = computed<Fournisseur[]>(() => prestataires.autorisesDeType('fournisseur_pieces').map(p => ({
    id: p.id, nom: p.nom, contact: p.contact, telephone: p.telephone, delaiLivraisonJoursMoyen: delaisLivraison.value[p.id], actif: true })))

  const produits = ref<ProduitStock[]>([
    { id: 'PRD-001', reference: 'FLT-HUI-HW', designation: 'Filtre à huile Howo', sousSysteme: 'moteur', fournisseurPrincipalId: 'PRS-013', prixUnitaireAr: 45_000, stockActuel: 14, seuilAlerte: 6 },
    { id: 'PRD-002', reference: 'FLT-AIR-HW', designation: 'Filtre à air Howo', sousSysteme: 'circuit_air', fournisseurPrincipalId: 'PRS-013', prixUnitaireAr: 68_000, stockActuel: 9, seuilAlerte: 6 },
    { id: 'PRD-003', reference: 'FLT-GAZ-HW', designation: 'Filtre à gazole Howo', sousSysteme: 'circuit_carburant', fournisseurPrincipalId: 'PRS-013', prixUnitaireAr: 52_000, stockActuel: 4, seuilAlerte: 6 },
    { id: 'PRD-004', reference: 'CYL-FRN-STD', designation: 'Cylindre de frein avant', sousSysteme: 'freinage', fournisseurPrincipalId: 'PRS-014', prixUnitaireAr: 340_000, stockActuel: 2, seuilAlerte: 2 },
    { id: 'PRD-005', reference: 'GRN-STD', designation: 'Jeu de garnitures de frein', sousSysteme: 'freinage', fournisseurPrincipalId: 'PRS-014', prixUnitaireAr: 65_000, stockActuel: 8, seuilAlerte: 4 },
    { id: 'PRD-006', reference: 'BAT-12V-140', designation: 'Batterie 12V 140Ah', sousSysteme: 'electricite', fournisseurPrincipalId: 'PRS-015', prixUnitaireAr: 480_000, stockActuel: 3, seuilAlerte: 3 },
    { id: 'PRD-007', reference: 'HUI-15W40', designation: 'Huile moteur 15W40 (bidon 20 L)', sousSysteme: 'moteur', fournisseurPrincipalId: 'PRS-013', prixUnitaireAr: 28_000, stockActuel: 22, seuilAlerte: 8 },
    { id: 'PRD-008', reference: 'BV-FOT-EST', designation: 'Boîte de vitesses complète Foton Auman', sousSysteme: 'transmission', fournisseurPrincipalId: 'PRS-006', prixUnitaireAr: 3_200_000, stockActuel: 0, seuilAlerte: 1 },
  ])

  /* Historique des mouvements - entrées (réceptions de commande) et
     sorties (bons de sortie magasin), certaines déjà liées à un ordre de travail.
     La boîte de vitesses commandée pour OT-2026-0029 n'est pas encore reçue :
     aucune sortie n'est donc tracée pour elle. */
  const mouvements = ref<MouvementStock[]>([
    { id: 'MVT-001', produitId: 'PRD-001', type: 'entree', quantite: 20, date: '2026-07-01', motif: 'Réception commande initiale',
      fournisseurId: 'PRS-013', numeroBonCommande: 'BC-2026-014', stockApres: 20 },
    { id: 'MVT-002', produitId: 'PRD-001', type: 'sortie', quantite: 1, date: '2026-08-28', motif: 'Vidange moteur',
      ordreTravailId: 'OT-2026-0031', vehiculePlaque: '4022 TBA', kilometrage: 165_900, stockApres: 19 },
    { id: 'MVT-003', produitId: 'PRD-007', type: 'sortie', quantite: 20, date: '2026-08-28', motif: 'Vidange moteur',
      ordreTravailId: 'OT-2026-0031', vehiculePlaque: '4022 TBA', kilometrage: 165_900, stockApres: 22 },
    { id: 'MVT-004', produitId: 'PRD-005', type: 'sortie', quantite: 4, date: '2026-08-24', motif: 'Garnitures usées, remplacement',
      ordreTravailId: 'OT-2026-0032', vehiculePlaque: 'RM 4109', kilometrage: 0, stockApres: 8 },
  ])

  const getProduit = (id: string) => produits.value.find(p => p.id === id)
  const getProduitParReference = (reference: string) => produits.value.find(p => p.reference === reference)
  const getFournisseur = (id: string) => fournisseurs.value.find(f => f.id === id)
  /** Fournisseur principal d'un produit : un prestataire devenu non autorisé reste lisible, signalé comme tel. */
  function fournisseurPrincipal(p: Pick<ProduitStock, 'fournisseurPrincipalId'>): string {
    if (!p.fournisseurPrincipalId) return '-'
    const f = getFournisseur(p.fournisseurPrincipalId); if (f) return f.nom
    const prs = prestataires.getById(p.fournisseurPrincipalId)
    return prs ? `${prs.nom} (non autorisé)` : '-'
  }

  const produitsSousSeuil = computed(() => produits.value.filter(p => p.stockActuel <= p.seuilAlerte))

  const mouvementsDuProduit = (produitId: string) =>
    [...mouvements.value].filter(m => m.produitId === produitId).sort((a, b) => +new Date(b.date) - +new Date(a.date))

  const valeurStock = computed(() => produits.value.reduce((s, p) => s + p.stockActuel * p.prixUnitaireAr, 0))

  /**
   * Sortie de stock consommée par une intervention (pièce d'origine
   * « stock »). Crée le mouvement et décrémente le produit ; si la
   * référence n'existe pas encore au catalogue, ne bloque pas la pièce
   * sur l'ordre de travail - elle reste seulement hors stock suivi.
   */
  function sortirDuStock(reference: string, quantite: number, ordreTravailId: string, vehiculePlaque?: string, kilometrage?: number, motif = 'Consommée sur intervention') {
    const produit = getProduitParReference(reference)
    if (!produit) return null
    produit.stockActuel = Math.max(0, produit.stockActuel - quantite)
    const m: MouvementStock = {
      id: `MVT-${maintenantMs()}`, produitId: produit.id, type: 'sortie', quantite, date: maintenant().toISOString().slice(0, 10),
      motif, ordreTravailId, vehiculePlaque, kilometrage, stockApres: produit.stockActuel,
    }
    mouvements.value.push(m)
    return m
  }

  /** Réception d'un bon de commande : incrémente le stock du produit reçu. */
  function receptionnerCommande(produitId: string, quantite: number, fournisseurId: string, numeroBonCommande: string) {
    const produit = getProduit(produitId)
    if (!produit) return null
    produit.stockActuel += quantite
    const m: MouvementStock = {
      id: `MVT-${maintenantMs()}`, produitId, type: 'entree', quantite, date: maintenant().toISOString().slice(0, 10),
      motif: 'Réception commande', fournisseurId, numeroBonCommande, stockApres: produit.stockActuel,
    }
    mouvements.value.push(m)
    return m
  }

  return {
    fournisseurs, produits, mouvements,
    getProduit, getProduitParReference, getFournisseur, fournisseurPrincipal,
    produitsSousSeuil, mouvementsDuProduit, valeurStock,
    sortirDuStock, receptionnerCommande,
  }
})
