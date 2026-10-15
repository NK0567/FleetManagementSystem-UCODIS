import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/**
 * Indicateurs de la flotte (FMS-PA-07) : code, libellé, unité, sens et cible
 * de chaque indicateur se règlent pour coller au vocabulaire et aux objectifs
 * de l'entreprise. Les tableaux de bord lisent libellé, code et cible ici,
 * jamais en dur.
 */
export type CleIndicateur =
  | 'disponibilite' | 'preventif' | 'realisationPreventif' | 'mttr' | 'mtbf'
  | 'consommation' | 'coutKm' | 'score' | 'ageMoyen'

export interface Indicateur {
  cle: CleIndicateur
  code: string
  libelle: string
  unite: string
  /** « haut » : plus la valeur est haute, mieux c'est. */
  sens: 'haut' | 'bas'
  cible: number | null
  definition: string
}

const DEPART: Indicateur[] = [
  { cle: 'disponibilite', code: 'TD', libelle: 'Taux de disponibilité', unite: '%', sens: 'haut', cible: 80,
    definition: 'Jours théoriques moins jours d\'immobilisation, divisés par les jours théoriques de la période.' },
  { cle: 'preventif', code: 'PMP', libelle: 'Part de maintenance préventive', unite: '%', sens: 'haut', cible: 60,
    definition: 'Ordres de travail préventifs divisés par l\'ensemble des ordres de travail, reprise d\'historique exclue.' },
  { cle: 'realisationPreventif', code: 'TRP', libelle: 'Préventif réalisé dans les délais', unite: '%', sens: 'haut', cible: null,
    definition: 'Ordres préventifs clôturés au plus tard à leur date planifiée, divisés par les ordres préventifs dus à ce jour.' },
  { cle: 'mttr', code: 'MTTR', libelle: 'Temps moyen de réparation', unite: 'h', sens: 'bas', cible: null,
    definition: 'Durée moyenne entre l\'ouverture et la clôture d\'un ordre de travail correctif.' },
  { cle: 'mtbf', code: 'MTBF', libelle: 'Kilométrage moyen entre deux pannes', unite: 'km', sens: 'haut', cible: null,
    definition: 'Kilomètres parcourus divisés par le nombre de pannes, par véhicule puis en moyenne.' },
  { cle: 'consommation', code: 'CONSO', libelle: 'Consommation moyenne', unite: 'L/100 km', sens: 'bas', cible: null,
    definition: 'Litres consommés rapportés aux kilomètres parcourus entre deux pleins complets.' },
  { cle: 'coutKm', code: 'CKM', libelle: 'Coût de maintenance au kilomètre', unite: 'par km', sens: 'bas', cible: null,
    definition: 'Coût des interventions de la période divisé par les kilomètres parcourus.' },
  { cle: 'score', code: 'SCORE', libelle: 'Score de conduite', unite: 'points', sens: 'haut', cible: 80,
    definition: 'Note sur 100 calculée à partir des familles du score de conduite et de leurs poids.' },
  { cle: 'ageMoyen', code: 'AGE', libelle: 'Âge moyen de la flotte', unite: 'ans', sens: 'bas', cible: null,
    definition: 'Moyenne des âges des véhicules en service, depuis leur mise en circulation.' },
]
const CLE = 'fms-ucodis-indicateurs'

export const useIndicateursStore = defineStore('indicateurs', () => {
  const liste = ref<Indicateur[]>(JSON.parse(JSON.stringify(DEPART)))
  try {
    const b = localStorage.getItem(CLE)
    if (b) { const lu = JSON.parse(b) as Partial<Indicateur>[]; liste.value.forEach(i => { const x = lu.find(y => y.cle === i.cle); if (x) Object.assign(i, { code: x.code ?? i.code, libelle: x.libelle ?? i.libelle, cible: x.cible ?? null }) }) }
  } catch { /* départ */ }
  watch(liste, v => { try { localStorage.setItem(CLE, JSON.stringify(v.map(i => ({ cle: i.cle, code: i.code, libelle: i.libelle, cible: i.cible })))) } catch { /* ignoré */ } }, { deep: true })

  const get = (cle: CleIndicateur) => liste.value.find(i => i.cle === cle)!
  const libelle = (cle: CleIndicateur) => get(cle).libelle
  const code = (cle: CleIndicateur) => get(cle).code
  const cible = (cle: CleIndicateur) => get(cle).cible

  /** Vrai ou faux face à la cible ; nul quand la valeur ou la cible manque. */
  function atteint(cle: CleIndicateur, valeur: number | null | undefined): boolean | null {
    const i = get(cle)
    if (valeur == null || i.cible == null) return null
    return i.sens === 'haut' ? valeur >= i.cible : valeur <= i.cible
  }
  /** Classe de couleur : vert atteint, rouge manqué, neutre sans cible. */
  const couleur = (cle: CleIndicateur, valeur: number | null | undefined) => {
    const a = atteint(cle, valeur)
    return a == null ? 'text-foreground' : a ? 'text-success' : 'text-danger'
  }
  function texteCible(cle: CleIndicateur): string {
    const i = get(cle)
    if (i.cible == null) return ''
    return `cible ${i.sens === 'haut' ? '≥' : '≤'} ${i.cible.toLocaleString('fr-FR')}${i.unite === '%' ? ' %' : ` ${i.unite}`}`
  }

  function modifier(cle: CleIndicateur, data: { code?: string; libelle?: string; cible?: number | null }): { ok: boolean; motif?: string } {
    const i = get(cle)
    if (data.code !== undefined) {
      const c = data.code.trim().toUpperCase()
      if (!c) return { ok: false, motif: 'Le code ne peut pas être vide.' }
      if (liste.value.some(x => x.cle !== cle && x.code.toUpperCase() === c)) return { ok: false, motif: `Le code ${c} est déjà celui d'un autre indicateur.` }
      i.code = c
    }
    if (data.libelle !== undefined) {
      if (!data.libelle.trim()) return { ok: false, motif: 'Le libellé ne peut pas être vide.' }
      i.libelle = data.libelle.trim()
    }
    if (data.cible !== undefined) {
      if (data.cible != null && (Number.isNaN(data.cible) || data.cible < 0)) return { ok: false, motif: 'La cible doit être un nombre positif.' }
      if (data.cible != null && i.unite === '%' && data.cible > 100) return { ok: false, motif: 'Une cible en pourcentage ne dépasse pas 100.' }
      i.cible = data.cible
    }
    return { ok: true }
  }

  function reinitialiser() { liste.value = JSON.parse(JSON.stringify(DEPART)) }

  return { liste, get, libelle, code, cible, atteint, couleur, texteCible, modifier, reinitialiser }
})
