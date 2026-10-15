import { maintenantMs } from '../utils/horloge'
import { useVehiculeStore } from './vehicules'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useMaintenanceStore } from './maintenance'

/**
 * Contrôles du véhicule par le maintenancier, à trois moments : avant le
 * chargement, au retour de voyage et à la réception d'un camion neuf.
 * Les points de chaque contrôle sont paramétrables par entreprise. Une
 * anomalie sur un point bloquant ouvre un ordre de travail, ce qui rend
 * le véhicule indisponible jusqu'à sa clôture.
 */
export type MomentControle = 'avant_chargement' | 'retour_voyage' | 'reception_neuf'
export const LIB_MOMENT_CONTROLE: Record<MomentControle, string> = {
  avant_chargement: 'Avant le chargement', retour_voyage: 'Au retour de voyage', reception_neuf: "À la réception d'un camion neuf",
}
export interface PointControle { code: string; libelle: string; bloquant: boolean }
export type ResultatPoint = 'conforme' | 'anomalie'
export interface ControleVehicule {
  id: string
  moment: MomentControle
  vehiculeId: string
  vehiculePlaque: string
  date: string
  controlePar: string
  kilometrage?: number
  resultats: Record<string, ResultatPoint>
  /** Libellés des points au moment du contrôle : l'historique reste
   *  lisible si la liste des points change ensuite. */
  libelles?: Record<string, string>
  /** Caractère bloquant de chaque point, figé au moment du contrôle. */
  bloquants?: Record<string, boolean>
  commentaire?: string
  /** Ordre de travail ouvert sur anomalie bloquante. */
  ordreTravailId?: string
}

const POINTS_DEFAUT: Record<MomentControle, PointControle[]> = {
  avant_chargement: [
    { code: 'FRN', libelle: 'Freinage', bloquant: true }, { code: 'PNE', libelle: 'Pneumatiques', bloquant: true },
    { code: 'ECL', libelle: 'Éclairage et signalisation', bloquant: true }, { code: 'ATT', libelle: "Dispositif d'attelage", bloquant: true },
    { code: 'NIV', libelle: 'Niveaux (huile, liquide de refroidissement)', bloquant: false }, { code: 'PLA', libelle: 'Plateau et ridelles propres', bloquant: false },
  ],
  retour_voyage: [
    { code: 'CAR', libelle: 'Carrosserie (chocs, rayures)', bloquant: false }, { code: 'PNE', libelle: 'Pneumatiques', bloquant: true },
    { code: 'FRN', libelle: 'Freinage', bloquant: true }, { code: 'FUI', libelle: 'Fuites sous le véhicule', bloquant: true },
    { code: 'TAB', libelle: 'Voyants du tableau de bord', bloquant: false }, { code: 'EQP', libelle: 'Équipements embarqués présents', bloquant: false },
  ],
  reception_neuf: [
    { code: 'DOC', libelle: 'Documents remis (carte grise, garantie)', bloquant: true }, { code: 'VIN', libelle: 'VIN conforme aux documents', bloquant: true },
    { code: 'EQP', libelle: 'Équipements livrés', bloquant: false }, { code: 'ESS', libelle: 'Essai routier', bloquant: true },
    { code: 'CAR', libelle: 'Aspect de la carrosserie', bloquant: false },
  ],
}
const CLE_POINTS = 'fms-ucodis-points-controle'

export const useControlesVehiculeStore = defineStore('controlesVehicule', () => {
  let initial = structuredClone(POINTS_DEFAUT)
  try { const b = localStorage.getItem(CLE_POINTS); if (b) initial = JSON.parse(b) } catch { /* défaut */ }
  const points = ref<Record<MomentControle, PointControle[]>>(initial)
  watch(points, v => { try { localStorage.setItem(CLE_POINTS, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const controles = ref<ControleVehicule[]>([
    { id: 'CVH-001', moment: 'retour_voyage', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', date: '2026-08-26T17:10:00', controlePar: 'Rakoto Andrianina', kilometrage: 182_350,
      resultats: { CAR: 'conforme', PNE: 'conforme', FRN: 'conforme', FUI: 'conforme', TAB: 'anomalie', EQP: 'conforme' },
      bloquants: { CAR: false, PNE: true, FRN: true, FUI: true, TAB: false, EQP: false }, commentaire: 'Voyant ABS allumé par intermittence, à surveiller.' },
    { id: 'CVH-002', moment: 'reception_neuf', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA', date: '2026-02-10T09:00:00', controlePar: 'Rakoto Andrianina', kilometrage: 12,
      resultats: { DOC: 'conforme', VIN: 'conforme', EQP: 'conforme', ESS: 'conforme', CAR: 'conforme' },
      bloquants: { DOC: true, VIN: true, EQP: false, ESS: true, CAR: false } },
  ])

  /** Un point était-il bloquant au moment du contrôle ? (À défaut, la liste actuelle.) */
  function estBloquant(c: ControleVehicule, code: string): boolean {
    return c.bloquants?.[code] ?? (points.value[c.moment] ?? []).some(p => p.code === code && p.bloquant)
  }
  /** Points bloquants en anomalie d'un contrôle, tels qu'ils étaient au moment du contrôle. */
  function anomaliesBloquantes(c: ControleVehicule): PointControle[] {
    return Object.entries(c.resultats).filter(([code, r]) => r === 'anomalie' && estBloquant(c, code))
      .map(([code]) => ({ code, libelle: c.libelles?.[code] ?? points.value[c.moment]?.find(p => p.code === code)?.libelle ?? code, bloquant: true }))
  }

  /** Enregistre un contrôle ; une anomalie bloquante ouvre un ordre de
   *  travail et rend le véhicule indisponible dès la date du contrôle. */
  function enregistrer(c: Omit<ControleVehicule, 'id' | 'ordreTravailId' | 'libelles' | 'bloquants'>): { ok: boolean; motif?: string; id?: string } {
    const v = useVehiculeStore().parId(c.vehiculeId)
    if (!v || !c.date) return { ok: false, motif: 'Indiquez le véhicule et la date du contrôle.' }
    if (v.statut === 'sorti') return { ok: false, motif: 'Ce véhicule est sorti du parc.' }
    if (isNaN(new Date(c.date).getTime())) return { ok: false, motif: 'Indiquez la date du contrôle.' }
    if (new Date(c.date).getTime() > maintenantMs() + 60_000) return { ok: false, motif: 'La date du contrôle ne peut pas être dans le futur.' }
    const liste = points.value[c.moment] ?? []
    if (!liste.length) return { ok: false, motif: "Aucun point de contrôle n'est défini pour ce moment." }
    const manquants = liste.filter(p => !c.resultats[p.code])
    if (manquants.length) return { ok: false, motif: `Renseignez tous les points : ${manquants.map(p => p.libelle).join(', ')}.` }
    if (c.kilometrage != null && c.kilometrage < 0) return { ok: false, motif: 'Le kilométrage ne peut pas être négatif.' }
    const libelles = Object.fromEntries(liste.map(p => [p.code, p.libelle]))
    const bloquants = Object.fromEntries(liste.map(p => [p.code, p.bloquant]))
    const ctrl: ControleVehicule = { ...c, libelles, bloquants, id: `CVH-${maintenantMs()}` }
    const enAnomalie = anomaliesBloquantes(ctrl)
    if (enAnomalie.length) {
      ctrl.ordreTravailId = useMaintenanceStore().creerOT({
        vehiculeId: c.vehiculeId, vehiculePlaque: c.vehiculePlaque, origine: 'constat_garage',
        declarePar: c.controlePar, declareLe: new Date(c.date).toISOString(), kilometrage: c.kilometrage,
        symptome: `Contrôle ${LIB_MOMENT_CONTROLE[c.moment].toLowerCase()} : ${enAnomalie.map(p => p.libelle).join(', ')} en anomalie.${c.commentaire ? ' ' + c.commentaire : ''}`,
        gravite: 'majeure', typeMaintenance: 'correctif',
      }, { debut: new Date(c.date).toISOString() })
    }
    controles.value.unshift(ctrl)
    return { ok: true, id: ctrl.id }
  }

  function ajouterPoint(moment: MomentControle, p: PointControle): { ok: boolean; motif?: string } {
    const code = p.code.trim().toUpperCase()
    if (!code || !p.libelle.trim()) return { ok: false, motif: 'Indiquez le code et le libellé du point.' }
    if (points.value[moment].some(x => x.code === code)) return { ok: false, motif: 'Ce code existe déjà pour ce moment.' }
    points.value[moment].push({ code, libelle: p.libelle.trim(), bloquant: p.bloquant })
    return { ok: true }
  }
  function modifierPoint(moment: MomentControle, code: string, data: Partial<Omit<PointControle, 'code'>>): { ok: boolean; motif?: string } {
    const p = points.value[moment].find(x => x.code === code); if (!p) return { ok: false, motif: 'Point introuvable.' }
    if (data.libelle !== undefined && !data.libelle.trim()) return { ok: false, motif: 'Le libellé ne peut pas être vide.' }
    Object.assign(p, data.libelle !== undefined ? { ...data, libelle: data.libelle.trim() } : data)
    return { ok: true }
  }
  function supprimerPoint(moment: MomentControle, code: string): { ok: boolean; motif?: string } {
    if (points.value[moment].length <= 1) return { ok: false, motif: 'Gardez au moins un point pour ce moment.' }
    points.value[moment] = points.value[moment].filter(x => x.code !== code)
    return { ok: true }
  }
  return { points, controles, estBloquant, anomaliesBloquantes, enregistrer, ajouterPoint, modifierPoint, supprimerPoint }
})
