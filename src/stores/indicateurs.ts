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
  /* Transport (rapports du transport, onglets de Flotte > Rapports). */
  | 'alHeure' | 'coutOrdre' | 'confirmees' | 'partielles' | 'refusees' | 'reportees' | 'contestees' | 'retoursDepot'
  | 'satisfactionDestinataire' | 'satisfactionOrdonnateur' | 'remplissagePoids' | 'remplissageVolume'
  | 'livraisonsParOrdre' | 'distance' | 'ecartFactureTarif'

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
  /* Transport */
  { cle: 'alHeure', code: 'PONCT', libelle: "Taux de livraisons à l'heure", unite: '%', sens: 'haut', cible: null,
    definition: "Livraisons arrivées au plus tard à l'heure prévue plus la marge de retard réglée, divisées par les livraisons arrivées dont l'heure prévue est connue." },
  { cle: 'coutOrdre', code: 'CORD', libelle: 'Coût moyen par ordre de transport', unite: 'par ordre', sens: 'bas', cible: null,
    definition: "Nos moyens : carburant des pleins rattachés à l'ordre plus coût de maintenance au kilomètre du véhicule multiplié par la distance. Transporteur externe : montant de sa facture. Moyenne des ordres dont le coût est complet." },
  { cle: 'confirmees', code: 'CONF', libelle: 'Livraisons confirmées par le client', unite: '%', sens: 'haut', cible: null,
    definition: 'Livraisons dont le destinataire a confirmé la réception, divisées par les livraisons déclarées par le conducteur.' },
  { cle: 'partielles', code: 'PART', libelle: 'Livraisons partielles', unite: '%', sens: 'bas', cible: null,
    definition: 'Livraisons déclarées avec au moins un article non livré, divisées par les livraisons déclarées.' },
  { cle: 'refusees', code: 'REFUS', libelle: 'Livraisons refusées', unite: '%', sens: 'bas', cible: null,
    definition: 'Livraisons refusées sur place par le destinataire, divisées par les livraisons présentées (conducteur arrivé, livraison déclarée, refusée ou reportée).' },
  { cle: 'reportees', code: 'REPORT', libelle: 'Livraisons reportées', unite: '%', sens: 'bas', cible: null,
    definition: 'Livraisons reportées en cours de tournée ou à la demande du client sur place, divisées par les livraisons présentées.' },
  { cle: 'contestees', code: 'CONTEST', libelle: 'Livraisons contestées', unite: '%', sens: 'bas', cible: null,
    definition: 'Livraisons dont le destinataire a contesté la réception, divisées par les livraisons déclarées.' },
  { cle: 'retoursDepot', code: 'RETOUR', libelle: 'Retours au dépôt', unite: '%', sens: 'bas', cible: null,
    definition: 'Livraisons dont tout ou partie de la marchandise revient au dépôt (report sur place, refus, articles non livrés), divisées par les livraisons présentées.' },
  { cle: 'satisfactionDestinataire', code: 'SATD', libelle: 'Note de satisfaction des destinataires', unite: 'sur 5', sens: 'haut', cible: null,
    definition: "Moyenne des notes données par les destinataires à l'enquête de satisfaction." },
  { cle: 'satisfactionOrdonnateur', code: 'SATO', libelle: 'Note de satisfaction des ordonnateurs', unite: 'sur 5', sens: 'haut', cible: null,
    definition: "Moyenne des trois notes de l'enquête des ordonnateurs (respect de l'ordre, délais, qualité)." },
  { cle: 'remplissagePoids', code: 'REMPP', libelle: 'Taux de remplissage en poids', unite: '%', sens: 'haut', cible: null,
    definition: "Poids des livraisons de l'ordre divisé par la charge maximale du véhicule (semi-remorque attelée ou véhicule du transporteur), en moyenne sur les ordres dont la capacité est connue." },
  { cle: 'remplissageVolume', code: 'REMPV', libelle: 'Taux de remplissage en volume', unite: '%', sens: 'haut', cible: null,
    definition: "Volume des livraisons de l'ordre divisé par le volume utile du véhicule, en moyenne sur les ordres dont le volume utile et le volume chargé sont connus." },
  { cle: 'livraisonsParOrdre', code: 'LIVORD', libelle: 'Livraisons par ordre de transport', unite: 'livraisons', sens: 'haut', cible: null,
    definition: 'Nombre moyen de livraisons portées par un ordre de transport exécuté.' },
  { cle: 'distance', code: 'DIST', libelle: 'Distance parcourue', unite: 'km', sens: 'bas', cible: null,
    definition: "Kilomètres relevés au compteur entre le départ et l'arrivée, à défaut distance de référence du trajet, cumulés sur les ordres exécutés." },
  { cle: 'ecartFactureTarif', code: 'ECFAC', libelle: 'Écart moyen entre facture et tarif', unite: 'par ordre', sens: 'bas', cible: null,
    definition: 'Montant facturé par le transporteur externe moins le montant convenu selon sa grille tarifaire (retenues déduites), en moyenne sur les ordres facturés dont le tarif est connu.' },
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
