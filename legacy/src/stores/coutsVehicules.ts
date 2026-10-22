import { defineStore } from 'pinia'
import { useVehiculeStore } from './vehicules'
import { useMaintenanceStore } from './maintenance'
import { useCarburantStore } from './carburant'
import { usePneusStore } from './pneus'
import { useAssurancesStore } from './assurances'

/**
 * Coût total de possession d'un véhicule (FMS-DB-06) : acquisition,
 * maintenance, carburant, pneus et assurances. Chaque poste se cumule
 * automatiquement depuis le sous-module qui l'enregistre, sans ressaisie.
 */
export interface CoutPossession { acquisition: number; maintenance: number; carburant: number; pneus: number; assurances: number; total: number }

export const useCoutsVehiculesStore = defineStore('coutsVehicules', () => {
  function coutDePossession(vehiculeId: string): CoutPossession {
    const v = useVehiculeStore().parId(vehiculeId)
    const maintenance = useMaintenanceStore()
    const acquisition = v?.coutAcquisitionAr ?? 0
    const mt = maintenance.ordresDuVehicule(vehiculeId).filter(o => o.statut !== 'annule').reduce((s, o) => s + maintenance.coutOT(o), 0)
    const carburant = useCarburantStore().recharges.filter(r => r.vehiculeId === vehiculeId).reduce((s, r) => s + (r.montant || 0), 0)
    const pn = usePneusStore()
    /* Pneus portés par le véhicule, montés ou retirés depuis, au prorata des kilomètres faits dessus. */
    const pneus = pn.coutPneusDuVehicule(vehiculeId)
    const as = useAssurancesStore()
    const assurances = as.polices.filter(p => p.vehiculeId === vehiculeId).reduce((s, p) => s + (p.primeAnnuelleAr ?? 0), 0)
      + as.sinistres.filter(x => x.vehiculeId === vehiculeId).reduce((s, x) => s + Math.max(0, (x.montantDommagesAr ?? 0) - (x.montantIndemniseAr ?? 0)), 0)
    return { acquisition, maintenance: mt, carburant, pneus, assurances, total: acquisition + mt + carburant + pneus + assurances }
  }
  return { coutDePossession }
})
