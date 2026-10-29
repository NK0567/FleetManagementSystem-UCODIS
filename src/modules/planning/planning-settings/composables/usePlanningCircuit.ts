import { ref } from 'vue'
import { DEFAULT_PLANNING_SETTINGS, offeredChannels } from '../domain/planningSettings'
import { planningSettingsService } from '../services/planningSettingsService'
import type { PlanningCircuitApi } from '../types/planningSettings.types'

const fallback = (): PlanningCircuitApi => ({
  intake: { ...DEFAULT_PLANNING_SETTINGS.intake },
  channels: offeredChannels(DEFAULT_PLANNING_SETTINGS.channels),
  externalReferenceLabel: DEFAULT_PLANNING_SETTINGS.requests.externalReferenceLabel,
  externalReferenceRequired: DEFAULT_PLANNING_SETTINGS.requests.externalReferenceRequired,
  countingUnit: DEFAULT_PLANNING_SETTINGS.goods.countingUnit,
  expiredDateMode: DEFAULT_PLANNING_SETTINGS.requests.expiredDateMode
})

const circuit = ref<PlanningCircuitApi>(fallback())
const loaded = ref(false)

/**
 * The company's order circuit (TRS07-US05), read again each time a screen opens so that a change
 * of the settings shows at once. Until it is read, the defaults apply; the server checks anyway.
 */
export function usePlanningCircuit() {
  async function refresh() {
    try {
      circuit.value = await planningSettingsService.circuit()
      loaded.value = true
    } catch {
      /* the defaults stay; the server refuses what the company does not allow */
    }
  }
  void refresh()
  return { circuit, loaded, refresh }
}
