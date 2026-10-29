import type {
  MaintenanceOperation,
  OperationNature
} from '@/modules/maintenance/maintenance-plans/domain/maintenancePlan'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface MaintenancePlanRow extends MockRow {
  name: string
  provisional: boolean
  active: boolean
  source: string
  /**
   * The vehicle models the plan applies to (make and model, see `modelCode`): every vehicle of a
   * model inherits its plan, and a model follows one active plan at most.
   */
  modelCodes: string[]
  operations: MaintenanceOperation[]
}

const op = (
  no: string,
  label: string,
  subsystemNo: string,
  nature: OperationNature,
  intervalKm: number | null,
  intervalDays: number | null = null,
  intervalHours: number | null = null
): MaintenanceOperation => ({
  no,
  label,
  subsystemNo,
  nature,
  intervalKm,
  intervalHours,
  intervalDays
})

const SEED: Omit<MaintenancePlanRow, keyof typeof seedAudit>[] = [
  {
    no: 'PE-001',
    name: 'Sinotruk Howo A7',
    provisional: true,
    active: true,
    source: 'Plan constructeur Sinotruk Howo-NX 400.',
    modelCodes: ['Sinotruk|Howo A7'],
    operations: [
      op(
        'OP-001',
        'Vidanger le moteur et remplacer le filtre à huile',
        'ENGINE',
        'replace',
        10_000,
        365,
        500
      ),
      op('OP-002', 'Échanger le filtre et le préfiltre gazole', 'FUEL-SYSTEM', 'replace', 10_000),
      op(
        'OP-003',
        'Vidanger le circuit de refroidissement et échanger le bouchon',
        'COOLING',
        'replace',
        40_000
      ),
      op('OP-004', 'Échanger le filtre à air et nettoyer la cuve', 'AIR', 'replace', 30_000),
      op('OP-005', 'Échanger les courroies', 'ENGINE', 'replace', 60_000),
      op('OP-006', 'Échanger la chaîne de distribution', 'ENGINE', 'replace', 200_000),
      op(
        'OP-007',
        "Vidanger le circuit d'assistance d'embrayage",
        'TRANSMISSION',
        'replace',
        80_000
      ),
      op('OP-008', 'Vidanger la boîte de vitesses', 'TRANSMISSION', 'replace', 50_000),
      op('OP-009', 'Vidanger le pont', 'TRANSMISSION', 'replace', 50_000),
      op('OP-010', 'Graisser les moyeux de roues', 'WHEELS', 'lubricate', 10_000),
      op('OP-011', 'Vérifier le niveau de liquide de direction', 'STEERING', 'check', 10_000),
      op('OP-012', 'Vérifier la garniture de frein', 'BRAKES', 'check', 10_000)
    ]
  },
  {
    no: 'PE-002',
    name: 'Dongfeng KL',
    provisional: true,
    active: true,
    source: 'Aucun plan constructeur reçu : intervalles calqués sur le plan Sinotruk Howo A7.',
    modelCodes: ['Dongfeng|KL'],
    operations: [
      op(
        'OP-013',
        'Vidanger le moteur et remplacer le filtre à huile',
        'ENGINE',
        'replace',
        10_000
      ),
      op('OP-014', 'Vérifier la garniture de frein', 'BRAKES', 'check', 10_000)
    ]
  }
]

export const maintenancePlansCollection: CollectionDefinition<MaintenancePlanRow> = {
  name: 'maintenance-plans',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit }))
}
