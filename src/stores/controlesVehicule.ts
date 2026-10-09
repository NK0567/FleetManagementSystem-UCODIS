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
    { id: 'CTV-001', moment: 'retour_voyage', vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', date: '2026-08-26T17:10:00', controlePar: 'Rakoto Andrianina', kilometrage: 182_350,
      resultats: { CAR: 'conforme', PNE: 'conforme', FRN: 'conforme', FUI: 'conforme', TAB: 'anomalie', EQP: 'conforme' }, commentaire: 'Voyant ABS allumé par intermittence, à surveiller.' },
    { id: 'CTV-002', moment: 'reception_neuf', vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA', date: '2026-02-10T09:00:00', controlePar: 'Rakoto Andrianina', kilometrage: 12,
      resultats: { DOC: 'conforme', VIN: 'conforme', EQP: 'conforme', ESS: 'conforme', CAR: 'conforme' } },
  ])

  /** Points bloquants en anomalie d'un contrôle. */
  function anomaliesBloquantes(c: ControleVehicule): PointControle[] {
    return (points.value[c.moment] ?? []).filter(p => p.bloquant && c.resultats[p.code] === 'anomalie')
  }

  function enregistrer(c: Omit<ControleVehicule, 'id' | 'ordreTravailId'>): ControleVehicule {
    const libelles = Object.fromEntries(points.value[c.moment].map(p => [p.code, p.libelle]))
    const ctrl: ControleVehicule = { ...c, libelles, id: `CTV-${Date.now()}` }
    const bloquants = anomaliesBloquantes(ctrl)
    if (bloquants.length) {
      ctrl.ordreTravailId = useMaintenanceStore().creerOT({
        vehiculeId: c.vehiculeId, vehiculePlaque: c.vehiculePlaque, origine: 'constat_garage',
        declarePar: c.controlePar, declareLe: c.date, kilometrage: c.kilometrage,
        symptome: `Contrôle ${LIB_MOMENT_CONTROLE[c.moment].toLowerCase()} : ${bloquants.map(p => p.libelle).join(', ')} en anomalie.${c.commentaire ? ' ' + c.commentaire : ''}`,
        gravite: 'majeure', typeMaintenance: 'correctif',
      })
    }
    controles.value.unshift(ctrl)
    return ctrl
  }

  function ajouterPoint(moment: MomentControle, p: PointControle): boolean {
    const code = p.code.trim().toUpperCase()
    if (!code || !p.libelle.trim() || points.value[moment].some(x => x.code === code)) return false
    points.value[moment].push({ code, libelle: p.libelle.trim(), bloquant: p.bloquant })
    return true
  }
  function modifierPoint(moment: MomentControle, code: string, data: Partial<Omit<PointControle, 'code'>>) {
    const p = points.value[moment].find(x => x.code === code); if (p) Object.assign(p, data)
  }
  function supprimerPoint(moment: MomentControle, code: string) {
    points.value[moment] = points.value[moment].filter(x => x.code !== code)
  }
  return { points, controles, anomaliesBloquantes, enregistrer, ajouterPoint, modifierPoint, supprimerPoint }
})
