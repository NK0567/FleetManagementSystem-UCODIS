import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Paramètres d'exploitation ajustables depuis Flotte → Configuration →
 * Paramètres, repris à la lettre de la structure du socle FMS (noms de champs
 * et bornes de saisie compris) : l'exploitation ajuste un seuil ou un
 * préavis sans passer par un développeur.
 */
export interface ParametresExploitation {
  // Temps réglementaires
  tccMaxMin: number
  pauseApresTccMin: number
  tcjMaxMin: number
  ttjMaxMin: number
  trhMinH: number
  plafondHebdoH: number
  // Seuils d'exploitation
  litresParBonDefaut: number
  toleranceKmPct: number
  seuilArretMin: number
  plafondBihebdoH: number
  // Seuils d'alerte
  preavisEntretienKm: number
  preavisEntretienJours: number
  rayonValidationPassageM: number
  preavisDocumentaireJours: number
}

export const useConfigurationStore = defineStore('configuration', () => {
  const parametres = ref<ParametresExploitation>({
    tccMaxMin: 270,
    pauseApresTccMin: 45,
    tcjMaxMin: 600,
    ttjMaxMin: 720,
    trhMinH: 24,
    plafondHebdoH: 56,

    litresParBonDefaut: 500,
    toleranceKmPct: 5,
    seuilArretMin: 20,
    plafondBihebdoH: 90,

    preavisEntretienKm: 1_000,
    preavisEntretienJours: 15,
    rayonValidationPassageM: 5_000,
    preavisDocumentaireJours: 30,
  })

  function majParametres(data: Partial<ParametresExploitation>) {
    Object.assign(parametres.value, data)
  }

  /**
   * Bornes de saisie des seuils d'alerte, reprises du socle FMS. Un rayon de
   * validation trop court manque des passages réels ; trop long, il
   * valide un site que le camion n'a fait que longer. Un préavis nul
   * revient à supprimer l'alerte.
   */
  const BORNES_SEUILS = {
    preavisEntretienKm: { min: 100, max: 10_000, unite: 'km' },
    preavisEntretienJours: { min: 1, max: 90, unite: 'jours' },
    rayonValidationPassageM: { min: 200, max: 20_000, unite: 'm' },
    preavisDocumentaireJours: { min: 1, max: 180, unite: 'jours' },
  } as const

  /** Un seuil hors bornes est signalé plutôt que refusé en silence. */
  function seuilHorsBornes(cle: keyof typeof BORNES_SEUILS): boolean {
    const v = parametres.value[cle]
    const b = BORNES_SEUILS[cle]
    return v == null || v < b.min || v > b.max
  }

  return { parametres, majParametres, BORNES_SEUILS, seuilHorsBornes }
})
