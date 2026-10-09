import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { RoleUtilisateur } from '../types'

/**
 * Réglages du circuit des commandes, propres à chaque entreprise : le module
 * n'est pas figé pour un client. Une entreprise dont l'équipe commerciale
 * émet les demandes dans l'application, une autre dont les commandes
 * arrivent de son ERP, une troisième où le planificateur saisit lui-même :
 * toutes se règlent ici, sans changer le code.
 */
export interface ParametresPlanification {
  /** Rôles autorisés à émettre des demandes de livraison. */
  rolesEmetteurs: RoleUtilisateur[]
  /** Le planificateur peut-il saisir lui-même une commande dans un ordre ? */
  saisieParPlanificateur: boolean
  /** Libellé de la référence de la commande dans le système de l'entreprise. */
  libelleReferenceExterne: string
  referenceExterneObligatoire: boolean
  /** Unité de comptage des marchandises (cartons, colis, palettes...). */
  uniteComptage: string
}

const DEFAUT: ParametresPlanification = {
  rolesEmetteurs: ['commercial'],
  saisieParPlanificateur: false,
  libelleReferenceExterne: 'N° de bon de livraison (NAV)',
  referenceExterneObligatoire: true,
  uniteComptage: 'cartons',
}
const CLE = 'fms-ucodis-parametres-planification'

export const useParametresPlanificationStore = defineStore('parametresPlanification', () => {
  let initial = DEFAUT
  try { const b = localStorage.getItem(CLE); if (b) initial = { ...DEFAUT, ...JSON.parse(b) } } catch { /* défaut */ }
  const parametres = ref<ParametresPlanification>(initial)
  watch(parametres, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })
  const peutEmettre = (role?: string | null) => !!role && parametres.value.rolesEmetteurs.includes(role as RoleUtilisateur)
  function reinitialiser() { parametres.value = { ...DEFAUT } }
  return { parametres, peutEmettre, reinitialiser }
})
