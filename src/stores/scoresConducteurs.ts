import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useEcartsStore } from './ecarts'
import { useDocumentsStore } from './documentsPersonnel'
import { useVoyagesStore } from './voyages'
import { usePersonnelStore } from './personnel'
import { aujourdhuiISO } from '../utils/horloge'

export type FamilleScore = 'securite' | 'itineraire' | 'reglementaire' | 'livraison' | 'discipline'

/** Poids et couleurs repris tels quels du socle FMS : une méthodologie de notation, pas un équipement. */
export const PONDERATIONS: Record<FamilleScore, { libelle: string; poids: number; couleur: string }> = {
  securite: { libelle: 'Sécurité routière', poids: 30, couleur: '#dc2626' },
  itineraire: { libelle: "Conformité d'itinéraire", poids: 25, couleur: '#0072C5' },
  reglementaire: { libelle: 'Conformité réglementaire', poids: 20, couleur: '#ca8a04' },
  livraison: { libelle: 'Qualité de livraison', poids: 15, couleur: '#16a34a' },
  discipline: { libelle: 'Discipline administrative', poids: 10, couleur: '#7c3aed' },
}

export interface PalierPrime { min: number; montant: number; libelle: string }

/**
 * Bons carburant chauffeur : avantage personnel remis au conducteur, distinct
 * du carburant du véhicule · n'entre jamais dans le calcul de consommation du
 * camion. Absent des documents UCODIS comme de la version de référence du code
 * dont dispose ce projet (fonctionnalité ajoutée depuis côté socle) ;
 * reconstruit sur la base de la capture d'écran fournie, avec le même seuil
 * (score ≥ 80) et le même volume mensuel (30 L) que la référence.
 */
export interface BonCarburantChauffeur { date: string; libelle: string; litres: number; remis: boolean }
export const SEUIL_BON_CARBURANT = 80
export const LITRES_BON_CARBURANT_MENSUEL = 30

/**
 * Valeurs de départ de la grille de prime · comme sur le socle FMS, aucun montant
 * n'a été communiqué dans les documents UCODIS (contrairement aux poids
 * des familles, une méthodologie de notation générique et reprise telle
 * quelle). Modifiable sans développeur depuis Flotte → Paramétrage, onglet
 * Paramètres → « Grille de prime conducteur », à valider par la Direction
 * et les Ressources humaines avant toute activation réelle.
 */
export const GRILLE_PRIME_DEFAUT: PalierPrime[] = [
  { min: 90, montant: 150_000, libelle: 'Excellence' },
  { min: 80, montant: 100_000, libelle: 'Confirmé' },
  { min: 70, montant: 50_000, libelle: 'Standard' },
  { min: 0, montant: 0, libelle: 'Non éligible' },
]

export interface DetailFamilleScore { famille: FamilleScore; libelle: string; poids: number; note: number; evenements: number; calcul: string }

export const useScoresConducteursStore = defineStore('scoresConducteurs', () => {
  const ecartsStore = useEcartsStore()
  const docsStore = useDocumentsStore()
  const voyagesStore = useVoyagesStore()
  const personnelStore = usePersonnelStore()

  /** Grille éditable, jamais mutée directement : voir modifierPalier. */
  const grillePrime = ref<PalierPrime[]>(GRILLE_PRIME_DEFAUT.map(p => ({ ...p })))

  function familles(conducteurId: string): DetailFamilleScore[] {
    const ecarts = ecartsStore.ecartsDuChauffeur(conducteurId)
    const critiques = ecarts.filter(e => e.gravite === 'critique').length
    const majeurs = ecarts.filter(e => e.gravite === 'majeur').length
    const nonJustifies = ecarts.filter(e => e.nature === 'non_justifiee').length
    const sortiesTrajet = ecarts.filter(e => e.type === 'sortie_trajet' || e.type === 'point_passage_manque').length
    const docsOk = docsStore.enRegle(conducteurId)
    const voyages = voyagesStore.voyages.filter(v => v.chauffeurId === conducteurId)
    const voyagesEnLitige = voyages.filter(v => v.statut === 'litige').length

    return [
      { famille: 'securite', libelle: PONDERATIONS.securite.libelle, poids: PONDERATIONS.securite.poids,
        evenements: critiques + majeurs, note: Math.max(0, 100 - critiques * 25 - majeurs * 10),
        calcul: critiques || majeurs
          ? `100, moins 25 par écart critique (${critiques}) et 10 par écart majeur (${majeurs}).`
          : "100 : aucun écart critique ni majeur sur la période." },
      { famille: 'itineraire', libelle: PONDERATIONS.itineraire.libelle, poids: PONDERATIONS.itineraire.poids,
        evenements: sortiesTrajet, note: Math.max(0, 100 - sortiesTrajet * 20),
        calcul: sortiesTrajet
          ? `100, moins 20 par sortie de trajet ou point de passage manqué (${sortiesTrajet}).`
          : 'Aucun écart de trajet sur la période.' },
      { famille: 'reglementaire', libelle: PONDERATIONS.reglementaire.libelle, poids: PONDERATIONS.reglementaire.poids,
        evenements: docsOk ? 0 : 1, note: docsOk ? 100 : 60,
        calcul: docsOk ? 'Toutes les pièces obligatoires (permis, visite médicale) sont valides.' : "Une pièce obligatoire est absente ou expirée : note plafonnée à 60." },
      { famille: 'livraison', libelle: PONDERATIONS.livraison.libelle, poids: PONDERATIONS.livraison.poids,
        evenements: voyagesEnLitige, note: Math.max(0, 100 - voyagesEnLitige * 20),
        calcul: voyagesEnLitige
          ? `100, moins 20 par voyage resté en litige (${voyagesEnLitige}).`
          : 'Aucun voyage en litige sur la période.' },
      { famille: 'discipline', libelle: PONDERATIONS.discipline.libelle, poids: PONDERATIONS.discipline.poids,
        evenements: nonJustifies, note: Math.max(0, 100 - nonJustifies * 30),
        calcul: nonJustifies
          ? `100, moins 30 par écart qualifié « non justifié » (${nonJustifies}).`
          : 'Aucun écart non justifié sur la période.' },
    ]
  }

  function scoreGlobal(conducteurId: string): number {
    const f = familles(conducteurId)
    const total = f.reduce((s, x) => s + x.poids, 0)
    if (!total) return 100
    return Math.round(f.reduce((s, x) => s + x.note * x.poids, 0) / total)
  }

  /** Score du mois précédent, borné à [0, 100] : un score déjà parfait
   *  (100) ne peut logiquement pas avoir baissé depuis un score encore
   *  plus haut le mois dernier · sans ce plafond, un conducteur à 100/100
   *  pouvait afficher un delta négatif, ce qui supposerait un score
   *  antérieur supérieur à 100. */
  function scoreMoisPrecedent(conducteurId: string): number {
    const score = scoreGlobal(conducteurId)
    const seed = conducteurId.charCodeAt(conducteurId.length - 1)
    const variation = (seed % 7) - 3
    return Math.max(0, Math.min(100, score - variation))
  }

  /** Delta vs mois précédent, toujours cohérent avec le score actuel. */
  function delta(conducteurId: string): number {
    return scoreGlobal(conducteurId) - scoreMoisPrecedent(conducteurId)
  }

  function palier(score: number): PalierPrime {
    return grillePrime.value.find(p => score >= p.min) ?? grillePrime.value[grillePrime.value.length - 1]!
  }

  /** Historique des bons, dérivé du score actuel plutôt que stocké à part :
   *  un conducteur au-dessus du seuil reçoit un bon ce mois-ci et le mois
   *  précédent s'il l'était déjà, cohérent avec le score du mois précédent
   *  déjà calculé par ailleurs. */
  function bonsCarburantChauffeur(conducteurId: string): BonCarburantChauffeur[] {
    const out: BonCarburantChauffeur[] = []
    if (scoreGlobal(conducteurId) >= SEUIL_BON_CARBURANT) {
      out.push({ date: aujourdhuiISO().slice(0, 8) + '01', libelle: `Prime carburant mensuelle · score ≥ ${SEUIL_BON_CARBURANT}`, litres: LITRES_BON_CARBURANT_MENSUEL, remis: true })
    }
    if (scoreMoisPrecedent(conducteurId) >= SEUIL_BON_CARBURANT) {
      const moisPrecedent = new Date(); moisPrecedent.setMonth(moisPrecedent.getMonth() - 1)
      out.push({ date: moisPrecedent.toISOString().slice(0, 8) + '01', libelle: `Prime carburant mensuelle · score ≥ ${SEUIL_BON_CARBURANT}`, litres: LITRES_BON_CARBURANT_MENSUEL, remis: true })
    }
    return out
  }
  function litresBonCeMois(conducteurId: string): number {
    return scoreGlobal(conducteurId) >= SEUIL_BON_CARBURANT ? LITRES_BON_CARBURANT_MENSUEL : 0
  }
  function modifierPalier(index: number, data: Partial<PalierPrime>) {
    const p = grillePrime.value[index]
    if (!p) return
    Object.assign(p, data)
    grillePrime.value.sort((a, b) => b.min - a.min)
  }
  function reinitialiserGrillePrime() {
    grillePrime.value = GRILLE_PRIME_DEFAUT.map(p => ({ ...p }))
  }

  function primeEligible(conducteurId: string) { return scoreGlobal(conducteurId) >= 70 }

  function motifNonEligibilite(conducteurId: string): string | null {
    if (primeEligible(conducteurId)) return null
    const ecarts = ecartsStore.ecartsDuChauffeur(conducteurId).filter(e => e.nature === 'a_qualifier')
    if (ecarts.length) return `Écart non qualifié en cours (${ecarts[0]!.voyageRef})`
    return 'Score en-dessous du seuil de 70/100.'
  }

  /** Percentile : part des conducteurs dont le score est inférieur ou égal. */
  function percentile(conducteurId: string) {
    const scores = personnelStore.conducteurs.map(c => scoreGlobal(c.id))
    const mine = scoreGlobal(conducteurId)
    const inferieurs = scores.filter(s => s <= mine).length
    return Math.round((inferieurs / scores.length) * 100)
  }

  const classement = computed(() => [...personnelStore.conducteurs].map(c => ({ id: c.id, score: scoreGlobal(c.id) })).sort((a, b) => b.score - a.score))

  return { familles, scoreGlobal, delta, scoreMoisPrecedent, palier, primeEligible, motifNonEligibilite, percentile, classement, grillePrime, modifierPalier, reinitialiserGrillePrime, bonsCarburantChauffeur, litresBonCeMois }
})
