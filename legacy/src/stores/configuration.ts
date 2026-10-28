import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

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
  /** Repos minimal entre l'arrivée du dernier voyage et un nouveau départ. */
  reposMinAvantDepartH: number
  plafondHebdoH: number
  /** Plafond de conduite sur deux semaines glissantes ; vide, il n'est pas contrôlé. */
  plafondBihebdoH: number | null
  /** Conduite de nuit non autorisée, de cette heure (HH:MM) à celle de fin ; vides, elle n'est pas contrôlée. */
  nuitInterditeDebut: string
  nuitInterditeFin: string
  // Seuils d'exploitation
  toleranceKmPct: number
  seuilArretMin: number
  // Seuils d'alerte
  preavisEntretienKm: number
  preavisEntretienJours: number
  rayonValidationPassageM: number
  /** Délai de notification proposé à la création d'un type de document ;
   *  le délai propre à chaque type reste modifiable et fait foi. */
  preavisDocumentaireJours: number
  // Entreprise
  /** Monnaie dans laquelle s'affichent tous les montants. */
  devise: string
  /** Fonctions du personnel qui conduisent, et fonctions d'aide conducteur. */
  fonctionsConducteur: string[]
  fonctionsAide: string[]
  /** Gestion du personnel raccordée : la fiche conducteur renvoie vers la
   *  fiche de l'employé ; décochée, le FMS se suffit à lui-même. */
  gestionPersonnelRaccordee: boolean
  /** Types de contrat proposés à la saisie d'une personne. */
  typesContrat: string[]
}

const CLE = 'fms-ucodis-configuration'

export const useConfigurationStore = defineStore('configuration', () => {
  const parametres = ref<ParametresExploitation>({
    tccMaxMin: 270,
    pauseApresTccMin: 45,
    tcjMaxMin: 600,
    ttjMaxMin: 720,
    trhMinH: 24,
    reposMinAvantDepartH: 11,
    plafondHebdoH: 56,
    plafondBihebdoH: 90,
    /* Charte tracking et sécurité : travail de 5 h à 19 h, ou 22 h par dérogation. */
    nuitInterditeDebut: '22:00',
    nuitInterditeFin: '05:00',

    toleranceKmPct: 5,
    seuilArretMin: 20,

    preavisEntretienKm: 1_000,
    preavisEntretienJours: 15,
    rayonValidationPassageM: 5_000,
    preavisDocumentaireJours: 30,

    devise: 'Ar',
    fonctionsConducteur: ['f-cond'],
    fonctionsAide: ['f-aide'],
    gestionPersonnelRaccordee: true,
    typesContrat: ['CDI', 'CDD', 'Journalier', 'Stage'],
  })
  try {
    const b = localStorage.getItem(CLE)
    if (b) {
      const lu = JSON.parse(b) as Record<string, unknown>
      /* Réglages retirés : ils ne servaient à aucun calcul. */
      delete lu.litresParBonDefaut
      Object.assign(parametres.value, lu)
    }
  } catch { /* valeurs de départ */ }
  watch(parametres, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  /** Types de contrat : libellé non vide et sans doublon ; un type porté par une personne ne se retire pas. */
  function ajouterTypeContrat(libelle: string): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Indiquez le type de contrat.' }
    if (parametres.value.typesContrat.some(t => t.toLowerCase() === l.toLowerCase())) return { ok: false, motif: 'Ce type de contrat existe déjà.' }
    parametres.value.typesContrat.push(l)
    return { ok: true }
  }
  function retirerTypeContrat(libelle: string, utilisations: number): { ok: boolean; motif?: string } {
    const liste = parametres.value.typesContrat
    if (utilisations > 0) return { ok: false, motif: `Ce type de contrat est porté par ${utilisations} personne(s).` }
    if (liste.length === 1) return { ok: false, motif: 'Gardez au moins un type de contrat.' }
    const i = liste.indexOf(libelle)
    if (i >= 0) liste.splice(i, 1)
    return { ok: true }
  }

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
    tccMaxMin: { min: 120, max: 360, unite: 'min' },
    pauseApresTccMin: { min: 15, max: 90, unite: 'min' },
    tcjMaxMin: { min: 360, max: 720, unite: 'min' },
    ttjMaxMin: { min: 480, max: 900, unite: 'min' },
    trhMinH: { min: 24, max: 48, unite: 'h' },
    reposMinAvantDepartH: { min: 6, max: 24, unite: 'h' },
    plafondHebdoH: { min: 40, max: 72, unite: 'h' },
    plafondBihebdoH: { min: 60, max: 120, unite: 'h' },
    preavisEntretienKm: { min: 100, max: 10_000, unite: 'km' },
    preavisEntretienJours: { min: 1, max: 90, unite: 'jours' },
    rayonValidationPassageM: { min: 200, max: 20_000, unite: 'm' },
  } as const

  /** Un seuil hors bornes est signalé plutôt que refusé en silence. */
  function seuilHorsBornes(cle: keyof typeof BORNES_SEUILS): boolean {
    const v = parametres.value[cle]
    const b = BORNES_SEUILS[cle]
    /* Plafond facultatif : vide, il n'est pas contrôlé et ne se signale pas. */
    if (cle === 'plafondBihebdoH' && (v == null || (v as unknown) === '')) return false
    return v == null || v < b.min || v > b.max
  }

  /** Plage de conduite de nuit non autorisée, en minutes depuis minuit ; null si elle n'est pas réglée. */
  const enMinutes = (x: string | null | undefined) => { const r = /^(\d{1,2}):(\d{2})$/.exec((x ?? '').trim()); return r && Number(r[1]) < 24 && Number(r[2]) < 60 ? Number(r[1]) * 60 + Number(r[2]) : null }
  function plageNuit(): { debut: number; fin: number } | null {
    const debut = enMinutes(parametres.value.nuitInterditeDebut); const fin = enMinutes(parametres.value.nuitInterditeFin)
    return debut == null || fin == null || debut === fin ? null : { debut, fin }
  }
  /** L'instant tombe dans la plage de nuit non autorisée (qui peut passer minuit). */
  function dansPlageNuit(d: Date): boolean {
    const pl = plageNuit(); if (!pl) return false
    const m = d.getHours() * 60 + d.getMinutes()
    return pl.debut < pl.fin ? m >= pl.debut && m < pl.fin : m >= pl.debut || m < pl.fin
  }
  /** Les deux heures se règlent ensemble : toutes deux vides, la conduite de nuit n'est pas contrôlée. */
  function majPlageNuit(debut: string, fin: string): { ok: boolean; motif?: string } {
    const d = debut.trim(); const f = fin.trim()
    if (!d && !f) { parametres.value.nuitInterditeDebut = ''; parametres.value.nuitInterditeFin = ''; return { ok: true } }
    if (!d || !f) return { ok: false, motif: "Indiquez l'heure de début et l'heure de fin, ou laissez les deux vides." }
    if (enMinutes(d) == null || enMinutes(f) == null) return { ok: false, motif: 'Heure invalide.' }
    if (enMinutes(d) === enMinutes(f)) return { ok: false, motif: "L'heure de fin doit différer de l'heure de début." }
    parametres.value.nuitInterditeDebut = d; parametres.value.nuitInterditeFin = f
    return { ok: true }
  }

  /** Libellé de la monnaie ; vide, les montants s'affichent sans unité. */
  const devise = () => parametres.value.devise?.trim() ?? ''
  /** Montant formaté dans la monnaie de l'entreprise. */
  function montant(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '-'
    return `${Math.round(n).toLocaleString('fr-FR')} ${devise()}`.trim()
  }

  return { parametres, majParametres, ajouterTypeContrat, retirerTypeContrat, BORNES_SEUILS, seuilHorsBornes, devise, montant, plageNuit, dansPlageNuit, majPlageNuit }
})
