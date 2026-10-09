import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useVehiculeStore } from './vehicules'

/**
 * Écoconduite (FMS-CA-06) : les comportements qui augmentent la
 * consommation, remontés par le boîtier embarqué (accélérations brusques,
 * ralenti prolongé), alimentent une famille « Écoconduite » du score de
 * conduite. Les événements de démonstration sont simulés ; avec un boîtier
 * réel, ils proviendraient de son flux.
 */
export type TypeEvenementEco = 'acceleration_brusque' | 'ralenti_prolonge'
export const LIB_EVENEMENT_ECO: Record<TypeEvenementEco, string> = {
  acceleration_brusque: 'Accélération brusque', ralenti_prolonge: 'Ralenti prolongé',
}
export interface EvenementEco {
  id: string
  date: string
  vehiculeId: string
  conducteurId: string
  type: TypeEvenementEco
  /** Durée du ralenti, en minutes. */
  dureeMin?: number
  lieu?: string
}
export interface ParametresEco {
  ralentiMinMinutes: number
  penaliteAcceleration: number
  penaliteRalenti: number
  poidsScore: number
  energiesFaiblesEmissions: string[]
}
export const PARAMETRES_ECO_DEFAUT: ParametresEco = {
  ralentiMinMinutes: 10, penaliteAcceleration: 5, penaliteRalenti: 8, poidsScore: 10,
  energiesFaiblesEmissions: ['Électrique', 'Hybride', 'GNV'],
}
const CLE = 'fms-ucodis-parametres-ecoconduite'

/** Répartition de démonstration : quelques événements par conducteur, sur août 2026. */
const SEED: EvenementEco[] = [
  ['p-010', 'v-tr-1', 'acceleration_brusque', '2026-08-24T07:12:00', undefined, 'RN2, sortie de Tanjombato'],
  ['p-010', 'v-tr-1', 'ralenti_prolonge', '2026-08-24T11:40:00', 22, 'Relais Moramanga'],
  ['p-011', 'v-tr-2', 'acceleration_brusque', '2026-08-20T06:05:00', undefined, 'RN4, Ankazobe'],
  ['p-011', 'v-tr-2', 'acceleration_brusque', '2026-08-20T09:30:00', undefined, 'RN4, Maevatanana'],
  ['p-011', 'v-tr-2', 'ralenti_prolonge', '2026-08-20T13:10:00', 35, 'Contrôle Maevatanana'],
  ['p-012', 'v-tr-3', 'ralenti_prolonge', '2026-09-03T03:00:00', 6, 'Dépôt UCODIS Tanjombato'],
  ['p-013', 'v-tr-4', 'acceleration_brusque', '2026-08-26T08:15:00', undefined, 'RN2, Brickaville'],
  ['p-015', 'v-tr-6', 'ralenti_prolonge', '2026-08-18T12:00:00', 18, 'Relais Moramanga'],
  ['p-016', 'v-tr-7', 'acceleration_brusque', '2026-09-08T07:45:00', undefined, 'RN4, Ankazobe'],
  ['p-019', 'v-tr-10', 'acceleration_brusque', '2026-08-22T10:20:00', undefined, 'RN4, Maevatanana'],
  ['p-019', 'v-tr-10', 'ralenti_prolonge', '2026-08-22T14:05:00', 14, 'Entrepôt Mahajanga'],
].map(([conducteurId, vehiculeId, type, date, dureeMin, lieu], i) => ({
  id: `ECO-${String(i + 1).padStart(3, '0')}`, conducteurId: conducteurId as string, vehiculeId: vehiculeId as string,
  type: type as TypeEvenementEco, date: date as string, dureeMin: dureeMin as number | undefined, lieu: lieu as string,
}))

export const useEcoconduiteStore = defineStore('ecoconduite', () => {
  const vehicules = useVehiculeStore()
  const evenements = ref<EvenementEco[]>(SEED)
  const parametres = ref<ParametresEco>({ ...PARAMETRES_ECO_DEFAUT, energiesFaiblesEmissions: [...PARAMETRES_ECO_DEFAUT.energiesFaiblesEmissions] })
  try { const b = localStorage.getItem(CLE); if (b) Object.assign(parametres.value, JSON.parse(b)) } catch { /* défaut */ }
  watch(parametres, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  /** Un ralenti plus court que le seuil n'est pas retenu. */
  const retenu = (e: EvenementEco) => e.type !== 'ralenti_prolonge' || (e.dureeMin ?? 0) >= parametres.value.ralentiMinMinutes
  const evenementsDuConducteur = (id: string) => evenements.value.filter(e => e.conducteurId === id && retenu(e))
  const evenementsDuVehicule = (id: string) => evenements.value.filter(e => e.vehiculeId === id && retenu(e))

  function noteConducteur(id: string) {
    const ev = evenementsDuConducteur(id)
    const acc = ev.filter(e => e.type === 'acceleration_brusque').length
    const ral = ev.filter(e => e.type === 'ralenti_prolonge').length
    const p = parametres.value
    return {
      acc, ral, note: Math.max(0, 100 - acc * p.penaliteAcceleration - ral * p.penaliteRalenti),
      calcul: acc || ral
        ? `100, moins ${p.penaliteAcceleration} par accélération brusque (${acc}) et ${p.penaliteRalenti} par ralenti de plus de ${p.ralentiMinMinutes} min (${ral}).`
        : 'Aucune accélération brusque ni ralenti prolongé sur la période.',
    }
  }

  /** Part des véhicules motorisés du parc qui roulent à une énergie à faibles émissions. */
  const partFaiblesEmissions = computed(() => {
    const motorises = vehicules.auParc.filter(v => v.type === 'tracteur')
    const faibles = motorises.filter(v => parametres.value.energiesFaiblesEmissions.some(e => e.toLowerCase() === v.carburant.trim().toLowerCase()))
    return { total: motorises.length, faibles: faibles.length, pct: motorises.length ? Math.round((faibles.length / motorises.length) * 100) : 0 }
  })

  function reinitialiserParametres() {
    Object.assign(parametres.value, { ...PARAMETRES_ECO_DEFAUT, energiesFaiblesEmissions: [...PARAMETRES_ECO_DEFAUT.energiesFaiblesEmissions] })
  }

  return { evenements, parametres, evenementsDuConducteur, evenementsDuVehicule, noteConducteur, partFaiblesEmissions, reinitialiserParametres }
})
