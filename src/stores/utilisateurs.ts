import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoleUtilisateur, Utilisateur } from '../types'
import { usePersonnelStore } from './personnel'

/**
 * Droits par rôle.
 * Le principe est celui du document de user stories : la direction consulte
 * sans jamais saisir, et le personnel roulant n'accède qu'à son espace.
 */
export const DROITS: Record<RoleUtilisateur, string[]> = {
  admin: ['Personnel', 'Structure', 'Habilitations', 'Documents', 'Comptes et rôles', 'Paramétrage'],
  responsable_flotte: ['Personnel', 'Structure (lecture)', 'Habilitations', 'Documents'],
  maintenancier: ['Personnel (lecture)', 'Documents (lecture)'],
  charge_clientele: ['Personnel (lecture)'],
  commercial: ['Personnel (lecture)'],
  depot: ['Personnel (lecture)'],
  direction: ['Tout en lecture seule'],
  conducteur: ['Mon espace'],
  aide_conducteur: ['Mon espace'],
}

const SEED: Utilisateur[] = [
  { id: 'u-001', nom: 'Faniry Rakotoarisoa', role: 'admin', identifiant: 'ADM001', personnelId: 'p-001', entiteNom: 'UCODIS Transport', actif: true, dernierAcces: '2026-09-03 08:04' },
  { id: 'u-002', nom: 'Hery Andriamalala', role: 'responsable_flotte', identifiant: 'FLT001', personnelId: 'p-002', entiteNom: 'Service Flotte', actif: true, dernierAcces: '2026-09-03 07:41' },
  { id: 'u-003', nom: 'Tojo Rasoanaivo', role: 'maintenancier', identifiant: 'MNT001', personnelId: 'p-003', entiteNom: 'Service Maintenance', actif: true, dernierAcces: '2026-09-02 17:19' },
  { id: 'u-004', nom: 'Miora Randrianasolo', role: 'charge_clientele', identifiant: 'CLI001', personnelId: 'p-004', entiteNom: 'Service Clientèle', actif: true, dernierAcces: '2026-09-02 15:52' },
  { id: 'u-005', nom: 'Lova Rabemananjara', role: 'commercial', identifiant: 'COM001', personnelId: 'p-005', entiteNom: 'Équipe commerciale', actif: true, dernierAcces: '2026-09-01 10:08' },
  { id: 'u-006', nom: 'Naina Rakotobe', role: 'depot', identifiant: 'DEP001', personnelId: 'p-006', entiteNom: 'Équipe dépôt', actif: true, dernierAcces: '2026-08-30 06:55' },
  { id: 'u-007', nom: 'Rivo Andrianjafy', role: 'direction', identifiant: 'DIR001', personnelId: 'p-007', entiteNom: 'UCODIS Transport', actif: true, dernierAcces: '2026-09-02 09:30' },
  { id: 'u-008', nom: 'Solofo Rakotomanga', role: 'conducteur', identifiant: 'CND001', personnelId: 'p-010', entiteNom: 'Équipe conduite', actif: true, dernierAcces: '2026-09-03 05:20' },
  { id: 'u-009', nom: 'Mamy Andrianaivo', role: 'conducteur', identifiant: 'CND002', personnelId: 'p-011', entiteNom: 'Équipe conduite', actif: true, dernierAcces: '2026-09-02 05:14' },
  { id: 'u-010', nom: 'Tiana Rasolofoson', role: 'conducteur', identifiant: 'CND003', personnelId: 'p-012', entiteNom: 'Équipe conduite', actif: true, dernierAcces: '2026-09-01 05:41' },
  { id: 'u-011', nom: 'Jean-Luc Razanamalala', role: 'conducteur', identifiant: 'CND009', personnelId: 'p-018', entiteNom: 'Équipe conduite', actif: false, dernierAcces: '2026-08-21 06:02' },
  { id: 'u-012', nom: 'Fidy Ramanantsoa', role: 'aide_conducteur', identifiant: 'AID001', personnelId: 'p-020', entiteNom: 'Équipe conduite', actif: true, dernierAcces: '2026-09-02 05:33' },
]

export const useUtilisateurStore = defineStore('utilisateurs', () => {
  const liste = ref<Utilisateur[]>(SEED)
  const personnel = usePersonnelStore()

  const actifs = computed(() => liste.value.filter(u => u.actif))
  const suspendus = computed(() => liste.value.filter(u => !u.actif))

  /** Personnes sans compte alors que leur fonction en réclame un. */
  const sansCompte = computed(() => {
    const avec = new Set(liste.value.map(u => u.personnelId))
    return personnel.actifs.filter(p => p.compteSysteme && !avec.has(p.id))
  })

  function basculerActivation(id: string) {
    const u = liste.value.find(x => x.id === id)
    if (u) u.actif = !u.actif
  }

  return { liste, actifs, suspendus, sansCompte, basculerActivation }
})
