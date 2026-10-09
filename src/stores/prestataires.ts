import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

/**
 * Référentiel des prestataires (tiers) de la flotte : ateliers externes,
 * fournisseurs de pièces, de pneus ou de carburant, assureurs,
 * constructeurs, banques. Un prestataire peut être marqué non autorisé à
 * travailler avec l'entreprise : il n'est alors plus proposé nulle part.
 * Le référentiel peut être repris du système de gestion de l'entreprise
 * quand il existe ; à défaut, il se tient ici.
 */
export type TypePrestataire = 'atelier' | 'fournisseur_pieces' | 'fournisseur_pneus' | 'fournisseur_carburant' | 'assureur' | 'constructeur' | 'banque'

export const LIB_TYPE_PRESTATAIRE: Record<TypePrestataire, string> = {
  atelier: 'Atelier', fournisseur_pieces: 'Fournisseur de pièces', fournisseur_pneus: 'Fournisseur de pneus',
  fournisseur_carburant: 'Fournisseur de carburant', assureur: 'Assureur', constructeur: 'Constructeur', banque: 'Banque',
}

export interface Prestataire {
  id: string
  nom: string
  type: TypePrestataire
  contact?: string
  telephone?: string
  email?: string
  /** Faux : le prestataire n'est plus autorisé à travailler avec l'entreprise. */
  autorise: boolean
}

const DEFAUT: Prestataire[] = [
  { id: 'PRS-001', nom: 'Garage Poids Lourds Ankorondrano', type: 'atelier', contact: 'Fidy Rakotondrabe', telephone: '034 20 111 22', autorise: true },
  { id: 'PRS-002', nom: 'Atelier Diesel Tanjombato', type: 'atelier', contact: 'Haja Randria', telephone: '033 41 555 18', autorise: true },
  { id: 'PRS-003', nom: 'Mécanique Générale Ivato', type: 'atelier', autorise: false },
  { id: 'PRS-004', nom: 'Pneus Océan Indien', type: 'fournisseur_pneus', contact: 'Lanto Rabe', telephone: '034 05 900 41', autorise: true },
  { id: 'PRS-005', nom: 'Rechapage Hautes Terres', type: 'fournisseur_pneus', telephone: '032 07 340 12', autorise: true },
  { id: 'PRS-006', nom: 'Somaco Antananarivo', type: 'fournisseur_pieces', contact: 'Rija Andriamampionona', autorise: true },
  { id: 'PRS-007', nom: 'Réseau Stations Hautes Terres', type: 'fournisseur_carburant', contact: 'Service cartes', telephone: '020 22 400 10', autorise: true },
  { id: 'PRS-008', nom: "Carburants de l'Île", type: 'fournisseur_carburant', telephone: '020 22 515 30', autorise: true },
]
const CLE = 'fms-ucodis-prestataires'

export const usePrestatairesStore = defineStore('prestataires', () => {
  let initial = DEFAUT
  try {
    const b = localStorage.getItem(CLE)
    if (b) {
      // Les prestataires de départ ajoutés depuis la dernière visite sont complétés.
      const enregistres = JSON.parse(b) as Prestataire[]
      initial = [...enregistres, ...DEFAUT.filter(d => !enregistres.some(e => e.id === d.id))]
    }
  } catch { /* défaut */ }
  const prestataires = ref<Prestataire[]>(initial)
  watch(prestataires, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const getById = (id?: string) => prestataires.value.find(p => p.id === id)
  /** Prestataires autorisés d'un type donné, seuls proposés aux choix. */
  const autorisesDeType = (type: TypePrestataire) => prestataires.value.filter(p => p.type === type && p.autorise)
  const ateliersAutorises = computed(() => autorisesDeType('atelier'))

  function creer(p: Omit<Prestataire, 'id'>) {
    const id = `PRS-${Date.now()}`
    prestataires.value.push({ ...p, id })
    return id
  }
  function modifier(id: string, data: Partial<Omit<Prestataire, 'id'>>) {
    const p = getById(id); if (p) Object.assign(p, data)
  }
  return { prestataires, getById, autorisesDeType, ateliersAutorises, creer, modifier }
})
