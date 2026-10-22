import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useProduitsStore } from './produits'
import { useClientsStore } from './clients'
import { useSitesStore } from './sites'
import { useVehiculeStore } from './vehicules'
import { usePrestatairesStore } from './prestataires'
import { useTypesVehiculesStore } from './typesVehicules'

/**
 * Contraintes de livraison et compatibilité des produits. Elles
 * s'appliquent à la proposition automatique de chargement comme aux
 * corrections manuelles : respecteContraintes() est le seul contrôle.
 */
/** ensemble : les deux produits ne voyagent pas dans le même véhicule.
 *  succession : le produit B ne peut pas suivre le produit A dans un même compartiment sans nettoyage. */
export type TypeCompatibilite = 'ensemble' | 'succession'
export const LIB_TYPE_COMPATIBILITE: Record<TypeCompatibilite, string> = {
  ensemble: 'Ne voyagent pas ensemble',
  succession: 'Ne succède pas sans nettoyage',
}
export interface RegleCompatibilite {
  id: string
  type: TypeCompatibilite
  /** Pour une succession : le produit précédent dans le compartiment. */
  produitA: string
  /** Pour une succession : le produit qui ne peut pas suivre sans nettoyage. */
  produitB: string
}

/** Exigences d'un lieu de livraison (site) ou d'un client sur le véhicule. */
export interface ContrainteLivraison {
  id: string
  clientId?: string
  siteId?: string
  /** Un camion équipé d'une pompe opérationnelle est exigé. */
  pompeExigee: boolean
  /** Types de véhicule acceptés (libellés libres, par exemple Citerne, Porteur) ; vide = tous. */
  typesVehicule: string[]
}
export interface Resultat { ok: boolean; motif?: string }

/** Ce que l'on veut charger et livrer, et avec quels moyens. */
export interface PlanAControler {
  /** Véhicules de l'entreprise (tracteur, semi-remorque attelée...). */
  vehiculeIds?: string[]
  /** Ou véhicules d'un transporteur externe. */
  transporteurId?: string
  vehiculesTransporteurIds?: string[]
  /** Produits transportés ensemble (identifiants ou noms). */
  produits?: string[]
  /** Pour la succession dans un compartiment : produit précédent, produit chargé, nettoyage fait. */
  compartiments?: { precedent?: string; produit: string; nettoye?: boolean }[]
  /** Lieux de livraison : client (identifiant ou nom) et site éventuel ; pompe exigée par la commande. */
  livraisons?: { client?: string; siteId?: string; pompeExigee?: boolean }[]
}

const DEFAUT = (): { compatibilites: RegleCompatibilite[]; contraintes: ContrainteLivraison[] } => ({
  compatibilites: [
    { id: 'CPT-001', type: 'ensemble', produitA: 'PRD-008', produitB: 'PRD-007' },
    { id: 'CPT-002', type: 'succession', produitA: 'PRD-007', produitB: 'PRD-006' },
  ],
  contraintes: [
    { id: 'CTL-001', clientId: 'cli-003', pompeExigee: false, typesVehicule: ['Semi-remorque'] },
  ],
})
const CLE = 'fms-ucodis-contraintes-livraison'

export const useContraintesLivraisonStore = defineStore('contraintesLivraison', () => {
  let initial = DEFAUT()
  try { const b = localStorage.getItem(CLE); if (b) { const lu = JSON.parse(b); if (Array.isArray(lu.compatibilites) && Array.isArray(lu.contraintes)) initial = lu } } catch { /* défaut */ }
  const compatibilites = ref<RegleCompatibilite[]>(initial.compatibilites)
  const contraintes = ref<ContrainteLivraison[]>(initial.contraintes)
  watch([compatibilites, contraintes], () => {
    try { localStorage.setItem(CLE, JSON.stringify({ compatibilites: compatibilites.value, contraintes: contraintes.value })) } catch { /* tant pis */ }
  }, { deep: true })

  const produits = () => useProduitsStore()
  const nomProduit = (id: string) => produits().getById(id)?.nom ?? id
  const idSuivant = (prefixe: string, ids: string[]) => { const max = ids.reduce((m, i) => Math.max(m, Number(i.replace(/\D/g, '')) || 0), 0); return `${prefixe}-${String(max + 1).padStart(3, '0')}` }

  /* ── Compatibilité des produits ── */
  function ajouterCompatibilite(r: Omit<RegleCompatibilite, 'id'>): Resultat {
    if (!r.produitA || !r.produitB) return { ok: false, motif: 'Choisissez les deux produits.' }
    if (!produits().getById(r.produitA) || !produits().getById(r.produitB)) return { ok: false, motif: 'Produit introuvable.' }
    const inactif = [produits().getById(r.produitA), produits().getById(r.produitB)].find(p => p && !p.actif)
    if (inactif) return { ok: false, motif: `${inactif.nom} est désactivé : choisissez un produit actif.` }
    if (r.produitA === r.produitB && r.type === 'ensemble') return { ok: false, motif: 'Un produit voyage toujours avec lui-même : choisissez deux produits différents.' }
    if (r.produitA === r.produitB) return { ok: false, motif: 'Choisissez deux produits différents.' }
    const existe = compatibilites.value.some(x => x.type === r.type && (r.type === 'ensemble'
      ? (x.produitA === r.produitA && x.produitB === r.produitB) || (x.produitA === r.produitB && x.produitB === r.produitA)
      : x.produitA === r.produitA && x.produitB === r.produitB))
    if (existe) return { ok: false, motif: 'Cette règle existe déjà.' }
    compatibilites.value.push({ ...r, id: idSuivant('CPT', compatibilites.value.map(x => x.id)) })
    return { ok: true }
  }
  function retirerCompatibilite(id: string): Resultat {
    if (!compatibilites.value.some(x => x.id === id)) return { ok: false, motif: 'Règle introuvable.' }
    compatibilites.value = compatibilites.value.filter(x => x.id !== id)
    return { ok: true }
  }
  /** Deux produits peuvent-ils voyager dans le même véhicule ? */
  function compatibles(a: string, b: string): Resultat {
    const pa = produits().resoudre(a)?.id ?? a, pb = produits().resoudre(b)?.id ?? b
    const r = compatibilites.value.find(x => x.type === 'ensemble' && ((x.produitA === pa && x.produitB === pb) || (x.produitA === pb && x.produitB === pa)))
    return r ? { ok: false, motif: `${nomProduit(pa)} et ${nomProduit(pb)} ne peuvent pas voyager ensemble.` } : { ok: true }
  }
  /** Le produit suivant peut-il être chargé dans un compartiment qui contenait le précédent ? */
  function successionAutorisee(precedent: string | undefined, suivant: string, nettoye = false): Resultat {
    if (!precedent || nettoye) return { ok: true }
    const pa = produits().resoudre(precedent)?.id ?? precedent, pb = produits().resoudre(suivant)?.id ?? suivant
    const r = compatibilites.value.find(x => x.type === 'succession' && x.produitA === pa && x.produitB === pb)
    return r ? { ok: false, motif: `${nomProduit(pb)} ne peut pas être chargé après ${nomProduit(pa)} dans un même compartiment sans nettoyage.` } : { ok: true }
  }

  /* ── Contraintes par client ou par site ── */
  function controlerContrainte(c: Omit<ContrainteLivraison, 'id'>, ignorerId?: string): string | null {
    if (!c.clientId && !c.siteId) return 'Choisissez le client ou le site concerné.'
    if (c.clientId && !useClientsStore().getById(c.clientId)) return 'Client introuvable.'
    if (c.siteId && !useSitesStore().getById(c.siteId)) return 'Site introuvable.'
    if (!c.pompeExigee && !c.typesVehicule.some(t => t.trim())) return 'Indiquez au moins une exigence : pompe, ou type de véhicule.'
    if (contraintes.value.some(x => x.id !== ignorerId && (x.clientId ?? '') === (c.clientId ?? '') && (x.siteId ?? '') === (c.siteId ?? ''))) return 'Une contrainte existe déjà pour ce lieu : modifiez-la plutôt.'
    return null
  }
  const nettoyerTypes = (t: string[]) => [...new Set(t.map(x => x.trim()).filter(Boolean))]
  function ajouterContrainte(c: Omit<ContrainteLivraison, 'id'>): Resultat {
    const motif = controlerContrainte(c); if (motif) return { ok: false, motif }
    contraintes.value.push({ ...c, clientId: c.clientId || undefined, siteId: c.siteId || undefined, typesVehicule: nettoyerTypes(c.typesVehicule), id: idSuivant('CTL', contraintes.value.map(x => x.id)) })
    return { ok: true }
  }
  function modifierContrainte(id: string, c: Partial<Omit<ContrainteLivraison, 'id'>>): Resultat {
    const x = contraintes.value.find(y => y.id === id); if (!x) return { ok: false, motif: 'Contrainte introuvable.' }
    const fusion = { ...x, ...c }
    const motif = controlerContrainte(fusion, id); if (motif) return { ok: false, motif }
    Object.assign(x, fusion, { typesVehicule: nettoyerTypes(fusion.typesVehicule) })
    return { ok: true }
  }
  function retirerContrainte(id: string): Resultat {
    if (!contraintes.value.some(x => x.id === id)) return { ok: false, motif: 'Contrainte introuvable.' }
    contraintes.value = contraintes.value.filter(x => x.id !== id)
    return { ok: true }
  }
  /** Exigences qui s'appliquent à une livraison : celles du client et celles du site. */
  function contraintesPour(client?: string, siteId?: string): ContrainteLivraison[] {
    const cli = client ? useClientsStore().getById(client) ?? useClientsStore().parNom(client) : undefined
    return contraintes.value.filter(x => (x.clientId && x.clientId === cli?.id) || (x.siteId && x.siteId === siteId))
  }

  /**
   * Contrôle d'un plan de chargement : compatibilité des produits, succession
   * dans les compartiments, pompe et type de véhicule exigés. Renvoie le
   * premier manquement, avec la règle en cause.
   */
  function respecteContraintes(plan: PlanAControler): Resultat {
    const prods = [...new Set(plan.produits ?? [])]
    for (let i = 0; i < prods.length; i++) for (let j = i + 1; j < prods.length; j++) {
      const r = compatibles(prods[i]!, prods[j]!); if (!r.ok) return r
    }
    for (const c of plan.compartiments ?? []) { const r = successionAutorisee(c.precedent, c.produit, c.nettoye); if (!r.ok) return r }

    /* Moyens retenus : pompe disponible et types de véhicule. */
    const parc = useVehiculeStore()
    /* La semi-remorque attelée au tracteur retenu compte avec lui. */
    const ids = [...new Set((plan.vehiculeIds?.filter(Boolean) ?? []).flatMap(id => [id, parc.attelageActif(id)?.semiRemorqueId]).filter((x): x is string => !!x))]
    let aPompe = ids.some(id => parc.aPompe(id))
    const types = ids.map(id => parc.parId(id)?.type).filter((t): t is string => !!t)
    if (plan.transporteurId) {
      const t = usePrestatairesStore().getById(plan.transporteurId)
      const vs = (t?.vehicules ?? []).filter(v => !plan.vehiculesTransporteurIds?.length || plan.vehiculesTransporteurIds.includes(v.id))
      aPompe = aPompe || vs.some(v => v.pompe)
      vs.forEach(v => { if (v.typeVehicule) types.push(v.typeVehicule) })
    }
    const typesVeh = useTypesVehiculesStore()
    const typesNorm = types.flatMap(t => [typesVeh.libelle(t), t]).map(t => t.trim().toLowerCase())
    const aucunMoyen = !ids.length && !plan.transporteurId

    for (const l of plan.livraisons ?? []) {
      const lieu = l.siteId ? useSitesStore().getById(l.siteId)?.nom : undefined
      const nomLieu = lieu ?? (l.client ? useClientsStore().getById(l.client)?.nom ?? l.client : 'cette livraison')
      const exigences = contraintesPour(l.client, l.siteId)
      const pompe = l.pompeExigee || exigences.some(x => x.pompeExigee)
      if (pompe && !aucunMoyen && !aPompe) return { ok: false, motif: `La livraison à ${nomLieu} exige un camion équipé d'une pompe.` }
      for (const x of exigences) {
        if (!x.typesVehicule.length || aucunMoyen) continue
        if (!x.typesVehicule.some(t => typesNorm.includes(t.trim().toLowerCase())))
          return { ok: false, motif: `La livraison à ${nomLieu} exige un véhicule de type ${x.typesVehicule.join(' ou ')}.` }
      }
    }
    return { ok: true }
  }

  function reinitialiser() { const d = DEFAUT(); compatibilites.value = d.compatibilites; contraintes.value = d.contraintes }

  return { compatibilites, contraintes, ajouterCompatibilite, retirerCompatibilite, compatibles, successionAutorisee,
    ajouterContrainte, modifierContrainte, retirerContrainte, contraintesPour, respecteContraintes, reinitialiser }
})
