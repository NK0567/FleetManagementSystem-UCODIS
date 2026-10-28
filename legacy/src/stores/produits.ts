import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useCommandesStore } from './commandes'
import { useVoyagesStore } from './voyages'
import { useTarifsTransportStore } from './tarifsTransport'
import { useContraintesLivraisonStore } from './contraintesLivraison'
import { useControlesTransportStore } from './controlesTransport'
import { COEFFICIENT_MAX, COEFFICIENT_MIN } from '../lib/volume15'

/**
 * Produits transportés : nom, famille, unité et, pour le carburant, densité
 * de référence. Leurs règles de compatibilité et leurs contraintes de
 * livraison se règlent dans les paramètres de la planification.
 */
export interface Produit {
  id: string
  nom: string
  famille: string
  /** Unité de comptage du produit (kilogramme, litre, colis...). */
  unite: string
  /** Carburant : mesuré à 15 °C, densité de référence exigée. */
  carburant: boolean
  /** Densité de référence à 15 °C, en kg par litre. */
  densiteReference?: number
  /** Carburant : coefficient de dilatation par degré, pour calculer le volume à 15 °C ; vide, aucun calcul. */
  coefficientDilatation?: number
  actif: boolean
}
export type SaisieProduit = Omit<Produit, 'id' | 'actif'> & { actif?: boolean }
export interface Resultat { ok: boolean; motif?: string }

/** Unités proposées à la saisie ; une autre unité peut être tapée. */
export const UNITES_PRODUIT = ['Kilogramme', 'Tonne', 'Litre', 'Mètre cube', 'Colis', 'Carton', 'Palette', 'Sac']

/** Valeurs de départ génériques, reprises des marchandises déjà utilisées dans les ordres de transport. */
const DEFAUT: Produit[] = [
  { id: 'PRD-001', nom: 'Produits alimentaires secs', famille: 'Alimentaire', unite: 'Carton', carburant: false, actif: true },
  { id: 'PRD-002', nom: 'Produits ménagers', famille: 'Entretien', unite: 'Carton', carburant: false, actif: true },
  { id: 'PRD-003', nom: 'Boissons', famille: 'Alimentaire', unite: 'Carton', carburant: false, actif: true },
  { id: 'PRD-004', nom: 'Textile', famille: 'Textile', unite: 'Colis', carburant: false, actif: true },
  { id: 'PRD-005', nom: 'Matériaux de construction', famille: 'Construction', unite: 'Kilogramme', carburant: false, actif: true },
  { id: 'PRD-006', nom: 'Gazole', famille: 'Carburant', unite: 'Litre', carburant: true, densiteReference: 0.845, coefficientDilatation: 0.0008, actif: true },
  { id: 'PRD-007', nom: 'Essence sans plomb', famille: 'Carburant', unite: 'Litre', carburant: true, densiteReference: 0.745, coefficientDilatation: 0.0012, actif: true },
  { id: 'PRD-008', nom: 'Pétrole lampant', famille: 'Carburant', unite: 'Litre', carburant: true, densiteReference: 0.79, coefficientDilatation: 0.0009, actif: true },
]
const CLE = 'fms-ucodis-produits'
const CLE_COEF = 'fms-ucodis-produits-coefficient'
const norm = (s?: string) => (s ?? '').trim().toLowerCase()

export const useProduitsStore = defineStore('produits', () => {
  let initial = DEFAUT.map(p => ({ ...p }))
  try { const b = localStorage.getItem(CLE); if (b) { const lus = JSON.parse(b); if (Array.isArray(lus)) initial = lus } } catch { /* défaut */ }
  /* Produits enregistrés avant l'arrivée du coefficient de dilatation : les carburants de départ reçoivent leur valeur de départ, une seule fois. */
  try {
    if (!localStorage.getItem(CLE_COEF)) {
      initial.forEach(p => { const d = DEFAUT.find(x => x.id === p.id); if (p.carburant && d?.coefficientDilatation != null && p.coefficientDilatation == null) p.coefficientDilatation = d.coefficientDilatation })
      localStorage.setItem(CLE_COEF, '1')
    }
  } catch { /* tant pis */ }
  const produits = ref<Produit[]>(initial)
  watch(produits, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const getById = (id?: string) => produits.value.find(p => p.id === id)
  const parNom = (nom?: string) => produits.value.find(p => norm(p.nom) === norm(nom))
  /** Retrouve un produit par son identifiant ou par son nom. */
  const resoudre = (idOuNom?: string) => getById(idOuNom) ?? parNom(idOuNom)
  /** Seuls les produits actifs sont proposés aux commandes et aux ordres. */
  const produitsActifs = () => produits.value.filter(p => p.actif)
  const actifs = computed(() => produitsActifs())
  /** Familles connues (type de marchandise), sans doublon. */
  const familles = computed(() => [...new Set(produits.value.map(p => p.famille.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')))

  /** Coefficient vide : aucun calcul du volume à 15 °C pour ce produit. */
  const coef = (a: unknown) => typeof a === 'number' && Number.isFinite(a) ? a : undefined
  function controler(s: SaisieProduit, ignorerId?: string): string | null {
    if (!s.nom?.trim()) return 'Indiquez le nom du produit.'
    if (!s.famille?.trim()) return 'Indiquez la famille du produit.'
    if (!s.unite?.trim()) return "Indiquez l'unité du produit."
    if (produits.value.some(p => p.id !== ignorerId && norm(p.nom) === norm(s.nom))) return 'Un produit porte déjà ce nom.'
    if (s.carburant) {
      if (typeof s.densiteReference !== 'number' || !Number.isFinite(s.densiteReference)) return 'Indiquez la densité de référence du carburant, en kg par litre.'
      if (s.densiteReference <= 0) return 'La densité de référence doit être positive.'
      if (s.densiteReference >= 2) return 'La densité de référence s’exprime en kg par litre (par exemple 0,845 pour le gazole).'
      const a = s.coefficientDilatation as unknown
      if (a != null && a !== '') {
        if (typeof a !== 'number' || !Number.isFinite(a)) return 'Le coefficient de dilatation s’écrit en chiffres.'
        if (a < COEFFICIENT_MIN || a > COEFFICIENT_MAX) return `Le coefficient de dilatation va de ${COEFFICIENT_MIN.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} à ${COEFFICIENT_MAX.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} par degré (par exemple 0,0008 pour le gazole).`
      }
    }
    return null
  }

  function creer(s: SaisieProduit): Resultat & { id?: string } {
    const motif = controler(s); if (motif) return { ok: false, motif }
    const max = produits.value.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D/g, '')) || 0), 0)
    const id = `PRD-${String(max + 1).padStart(3, '0')}`
    produits.value.push({ id, nom: s.nom.trim(), famille: s.famille.trim(), unite: s.unite.trim(), carburant: !!s.carburant,
      densiteReference: s.carburant ? s.densiteReference : undefined, coefficientDilatation: s.carburant ? coef(s.coefficientDilatation) : undefined, actif: s.actif ?? true })
    return { ok: true, id }
  }

  /** Où le produit est cité : commandes, ordres de transport, tarifs, règles. */
  function utilisations(id: string): string[] {
    const p = getById(id); if (!p) return []
    const n = norm(p.nom)
    const out: string[] = []
    if (useCommandesStore().commandes.some(c => norm(c.contenu) === n)) out.push('demandes de livraison')
    if (useVoyagesStore().voyages.some(v => norm(v.marchandise?.typeProduit) === n)) out.push('ordres de transport')
    if (useTarifsTransportStore().tarifs.some(t => t.produitId === id)) out.push('tarifs de transport')
    const c = useContraintesLivraisonStore()
    if (c.compatibilites.some(r => r.produitA === id || r.produitB === id)) out.push('règles de compatibilité')
    if (useControlesTransportStore().reglages.tolerances.some(t => t.produitId === id)) out.push('écarts autorisés')
    return out
  }
  const estUtilise = (id: string) => utilisations(id).length > 0

  function modifier(id: string, s: Partial<SaisieProduit>): Resultat {
    const p = getById(id); if (!p) return { ok: false, motif: 'Produit introuvable.' }
    const fusion: SaisieProduit = { ...p, ...s }
    const motif = controler(fusion, id); if (motif) return { ok: false, motif }
    /* Les commandes et les ordres citent le produit par son nom. */
    if (norm(fusion.nom) !== norm(p.nom) && estUtilise(id)) return { ok: false, motif: `${p.nom} est déjà utilisé (${utilisations(id).join(', ')}) : son nom ne peut plus changer. Désactivez-le et créez-en un autre.` }
    Object.assign(p, { nom: fusion.nom.trim(), famille: fusion.famille.trim(), unite: fusion.unite.trim(), carburant: !!fusion.carburant,
      densiteReference: fusion.carburant ? fusion.densiteReference : undefined, coefficientDilatation: fusion.carburant ? coef(fusion.coefficientDilatation) : undefined })
    if (s.actif !== undefined) p.actif = s.actif
    return { ok: true }
  }
  function changerActif(id: string, actif: boolean): Resultat {
    const p = getById(id); if (!p) return { ok: false, motif: 'Produit introuvable.' }
    if (!actif && produitsActifs().length === 1 && p.actif) return { ok: false, motif: 'Au moins un produit doit rester actif.' }
    p.actif = actif
    return { ok: true }
  }
  /** Un produit utilisé ne se supprime pas : il se désactive. */
  function supprimer(id: string): Resultat {
    const p = getById(id); if (!p) return { ok: false, motif: 'Produit introuvable.' }
    if (p.actif && produitsActifs().length === 1) return { ok: false, motif: `${p.nom} est le dernier produit actif : au moins un produit doit rester actif.` }
    const u = utilisations(id)
    if (u.length) return { ok: false, motif: `${p.nom} est utilisé (${u.join(', ')}) : désactivez-le plutôt que de le supprimer.` }
    produits.value = produits.value.filter(x => x.id !== id)
    return { ok: true }
  }
  function reinitialiser() { produits.value = DEFAUT.map(p => ({ ...p })) }

  return { produits, actifs, familles, getById, parNom, resoudre, produitsActifs, creer, modifier, changerActif, supprimer, utilisations, estUtilise, reinitialiser }
})
