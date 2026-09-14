import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoleUtilisateur, Utilisateur } from '../types'

/**
 * Libellés des rôles · repris du tableau des responsabilités de la SOP.
 * « Direction » est le seul rôle ajouté : il n'apparaît pas dans la SOP
 * mais le cahier des charges demande des rapports de pilotage.
 */
export const LIBELLE_ROLE: Record<RoleUtilisateur, string> = {
  admin: 'Administrateur',
  responsable_flotte: 'Responsable flotte',
  maintenancier: 'Maintenancier',
  charge_clientele: 'Chargé de clientèle',
  commercial: 'Équipe commerciale',
  depot: 'Équipe dépôt',
  direction: 'Direction',
  conducteur: 'Conducteur',
  aide_conducteur: 'Aide conducteur',
}

const COMPTES: Record<RoleUtilisateur, Utilisateur> = {
  admin: {
    id: 'u-001', nom: 'Faniry Rakotoarisoa', role: 'admin', identifiant: 'ADM001',
    personnelId: 'p-001', entiteId: 'e1', entiteNom: 'UCODIS Transport', actif: true,
  },
  responsable_flotte: {
    id: 'u-002', nom: 'Hery Andriamalala', role: 'responsable_flotte', identifiant: 'FLT001',
    personnelId: 'p-002', entiteId: 'e2', entiteNom: 'Service Flotte', actif: true,
  },
  maintenancier: {
    id: 'u-003', nom: 'Tojo Rasoanaivo', role: 'maintenancier', identifiant: 'MNT001',
    personnelId: 'p-003', entiteId: 'e3', entiteNom: 'Service Maintenance', actif: true,
  },
  charge_clientele: {
    id: 'u-004', nom: 'Miora Randrianasolo', role: 'charge_clientele', identifiant: 'CLI001',
    personnelId: 'p-004', entiteId: 'e5', entiteNom: 'Service Clientèle', actif: true,
  },
  commercial: {
    id: 'u-005', nom: 'Lova Rabemananjara', role: 'commercial', identifiant: 'COM001',
    personnelId: 'p-005', entiteId: 'e6', entiteNom: 'Équipe commerciale UCODIS', actif: true,
  },
  depot: {
    id: 'u-006', nom: 'Naina Rakotobe', role: 'depot', identifiant: 'DEP001',
    personnelId: 'p-006', entiteId: 'e7', entiteNom: 'Équipe dépôt', actif: true,
  },
  direction: {
    id: 'u-007', nom: 'Rivo Andrianjafy', role: 'direction', identifiant: 'DIR001',
    personnelId: 'p-007', entiteId: 'e1', entiteNom: 'UCODIS Transport', actif: true,
  },
  conducteur: {
    id: 'u-008', nom: 'Solofo Rakotomanga', role: 'conducteur', identifiant: 'CND001',
    personnelId: 'p-010', entiteId: 'e4', entiteNom: 'Équipe conduite', actif: true,
  },
  aide_conducteur: {
    id: 'u-009', nom: 'Fidy Ramanantsoa', role: 'aide_conducteur', identifiant: 'AID001',
    personnelId: 'p-020', entiteId: 'e4', entiteNom: 'Équipe conduite', actif: true,
  },
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Utilisateur | null>(null)
  const connecte = ref(false)

  const role = computed<RoleUtilisateur | null>(() => user.value?.role ?? null)
  const libelleRole = computed(() => (role.value ? LIBELLE_ROLE[role.value] : ''))

  /**
   * Deux espaces distincts.
   * Côté gestion : accès à l'administration et, plus tard, aux modules flotte.
   * Côté terrain : conducteur et aide conducteur ne voient que leur espace.
   */
  const cotéGestion = computed(
    () => !!role.value && role.value !== 'conducteur' && role.value !== 'aide_conducteur',
  )
  const cotéTerrain = computed(() => !cotéGestion.value && connecte.value)

  const estAdmin = computed(() => role.value === 'admin')
  /** Seuls l'administrateur et le responsable flotte gèrent le personnel. */
  const gerePersonnel = computed(() => role.value === 'admin' || role.value === 'responsable_flotte')
  /** La direction consulte : elle ne saisit rien, elle ne modifie rien. */
  const lectureSeule = computed(() => role.value === 'direction')

  function login(roleChoisi: RoleUtilisateur) {
    user.value = COMPTES[roleChoisi]
    connecte.value = true
  }

  function logout() {
    user.value = null
    connecte.value = false
  }

  return {
    user, connecte, role, libelleRole,
    cotéGestion, cotéTerrain, estAdmin, gerePersonnel, lectureSeule,
    login, logout,
  }
})
