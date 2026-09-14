import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Entite } from '../types'

/**
 * Structure d'UCODIS Transport.
 *
 * Les services correspondent aux postes du tableau des responsabilités
 * de la SOP UCD-TRUCK-FLOT-001 : responsable flotte, technicien de
 * maintenance, équipe conducteur, chargé de clientèle, équipe commerciale
 * UCODIS et équipe dépôt.
 */
const SEED: Entite[] = [
  {
    id: 'e1', code: 'UCT', nom: 'UCODIS Transport', type: 'direction', parentId: null,
    responsableNom: 'Rivo Andrianjafy', responsableId: 'p-007',
    effectif: 24, site: 'Siège Antananarivo', statut: 'validee',
    description: "Entité créée par UCODIS pour assurer le transport de ses marchandises sur longue distance.",
  },
  {
    id: 'e2', code: 'FLT', nom: 'Service Flotte', type: 'service', parentId: 'e1',
    responsableNom: 'Hery Andriamalala', responsableId: 'p-002',
    effectif: 1, site: 'Siège Antananarivo', statut: 'validee',
    description: "Dossiers administratifs des camions, suivi du parc, affectation aux conducteurs, planning et fiches de voyage.",
  },
  {
    id: 'e3', code: 'MNT', nom: 'Service Maintenance', type: 'service', parentId: 'e1',
    responsableNom: 'Tojo Rasoanaivo', responsableId: 'p-003',
    effectif: 2, site: 'Garage Antananarivo', statut: 'validee',
    description: "Contrôle des camions à la réception, puis avant et après chaque utilisation, avec le conducteur.",
  },
  {
    id: 'e4', code: 'CND', nom: 'Équipe conduite', type: 'equipe', parentId: 'e2',
    responsableNom: 'Hery Andriamalala', responsableId: 'p-002',
    effectif: 15, site: 'Dépôt UCODIS Tanjombato', statut: 'validee',
    description: "Dix conducteurs et cinq aides conducteurs, un conducteur par tracteur du parc.",
  },
  {
    id: 'e5', code: 'CLI', nom: 'Service Clientèle', type: 'service', parentId: 'e1',
    responsableNom: 'Miora Randrianasolo', responsableId: 'p-004',
    effectif: 1, site: 'Siège Antananarivo', statut: 'validee',
    description: "Affectation du bon de livraison à un camion.",
  },
  {
    id: 'e6', code: 'COM', nom: 'Équipe commerciale UCODIS', type: 'service', parentId: 'e1',
    responsableNom: 'Lova Rabemananjara', responsableId: 'p-005',
    effectif: 1, site: 'Siège Antananarivo', statut: 'validee',
    description: "Calcul du poids et du nombre de cartons à livrer, demande de disponibilité de camion.",
  },
  {
    id: 'e7', code: 'DEP', nom: 'Équipe dépôt', type: 'service', parentId: 'e1',
    responsableNom: 'Naina Rakotobe', responsableId: 'p-006',
    effectif: 2, site: 'Dépôt UCODIS Tanjombato', statut: 'validee',
    description: "Comptage et vérification des marchandises chargées, contrôle du poids par rapport à la charge maximale autorisée.",
  },
  {
    // Proposée dans le document de user stories, point à trancher n°4 :
    // la SOP est bâtie autour du voyage sans qu'aucun des dix modules ne
    // s'appelle « voyages ». Une entité dédiée est soumise à UCODIS,
    // en attente de validation · elle ne compte pas dans l'effectif tant
    // qu'elle n'est pas confirmée.
    id: 'e8', code: 'OPV', nom: 'Opérations et voyages', type: 'service', parentId: 'e1',
    responsableNom: undefined, responsableId: undefined,
    effectif: 0, site: 'Siège Antananarivo', statut: 'a_valider', soumiseLe: '2026-09-02',
    description: "Entité proposée pour porter le planning de voyage, la fiche de voyage et le carnet de bord, aujourd'hui rattachés provisoirement aux modules 1 et 2. Statut à confirmer avec UCODIS.",
  },
]

export const useEntiteStore = defineStore('entites', () => {
  const liste = ref<Entite[]>(SEED)

  const racine = computed(() => liste.value.find(e => e.parentId === null) ?? null)
  const effectifTotal = computed(() => racine.value?.effectif ?? 0)

  function parId(id: string) {
    return liste.value.find(e => e.id === id) ?? null
  }

  function enfants(id: string | null) {
    return liste.value.filter(e => e.parentId === id)
  }

  const enAttente = computed(() => liste.value.filter(e => e.statut === 'a_valider'))
  const validees = computed(() => liste.value.filter(e => e.statut === 'validee'))

  function valider(id: string) {
    const e = liste.value.find(x => x.id === id)
    if (e) e.statut = 'validee'
  }

  let prochainId = liste.value.length + 1
  function creer(e: Omit<Entite, 'id'>) {
    const id = `e-perso-${prochainId++}`
    liste.value.push({ ...e, id })
    return id
  }
  function mettreAJour(id: string, patch: Partial<Omit<Entite, 'id'>>) {
    const e = parId(id)
    if (e) Object.assign(e, patch)
  }
  function supprimer(id: string) {
    liste.value = liste.value.filter(e => e.id !== id)
  }

  return { liste, racine, effectifTotal, enAttente, validees, parId, enfants, valider, creer, mettreAJour, supprimer }
})
