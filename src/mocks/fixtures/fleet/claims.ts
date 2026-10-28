import type { ClaimStatus, InsuranceStatus } from '@/modules/fleet/claims/domain/claim'
import type {
  ClaimEvent,
  ClaimLiability,
  ClaimNature,
  ClaimSeverity
} from '@/modules/fleet/claims/types/claim.types'
import { coversDay } from '@/modules/fleet/insurance-policies/domain/insurancePolicy'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'
import { insurancePoliciesCollection } from './insurancePolicies'

export interface ClaimRow extends MockRow {
  nature: ClaimNature
  occurredAt: string
  vehicleNo: string
  driverNo: string | null
  location: string
  severity: ClaimSeverity
  odometerKm: number | null
  circumstances: string
  thirdParties: string
  damageAmount: number | null
  liability: ClaimLiability
  policyNo: string | null
  insuranceStatus: InsuranceStatus
  indemnityAmount: number | null
  analysis: string
  sanction: string
  photoFileNos: string[]
  status: ClaimStatus
  closedAt: string | null
  closedBy: string | null
  history: ClaimEvent[]
}

const at = (days: number, time: string) => `${addDays(DEMO_REFERENCE_DATE, days)}T${time}:00`
const event = (
  when: string,
  kind: ClaimEvent['kind'],
  insuranceStatus: InsuranceStatus | null = null,
  comment = ''
): ClaimEvent => ({ at: `${when}.000Z`, by: 'FLT001', kind, insuranceStatus, comment })

function policyOn(vehicleNo: string, occurredAt: string): string | null {
  const day = occurredAt.slice(0, 10)
  return (
    insurancePoliciesCollection
      .seed()
      .find((policy) => policy.vehicleNo === vehicleNo && coversDay(policy, day))?.no ?? null
  )
}

function seed(): Omit<ClaimRow, keyof typeof seedAudit>[] {
  const settled = at(-40, '14:20')
  const assessed = at(-12, '07:45')
  const leak = at(-3, '16:10')
  return [
    {
      no: 'SIN-2026-001',
      nature: 'accident',
      occurredAt: settled,
      vehicleNo: 'VEH-003',
      driverNo: 'UCT-012',
      location: 'RN7, PK 112, sortie nord d’Ambatolampy',
      severity: 'major_damage',
      odometerKm: 181_240,
      circumstances:
        'Un véhicule léger a refusé la priorité en sortant d’une piste. Choc latéral sur le pare-chocs et le réservoir droit.',
      thirdParties: 'Toyota Hilux 2154 TAB, conducteur indemne.',
      damageAmount: 8_500_000,
      liability: 'third_party',
      policyNo: policyOn('VEH-003', settled),
      insuranceStatus: 'settled',
      indemnityAmount: 7_800_000,
      analysis:
        'Refus de priorité du tiers, constaté par la gendarmerie. Aucun manquement du conducteur.',
      sanction: '',
      photoFileNos: [],
      status: 'closed',
      closedAt: `${at(-5, '10:00')}.000Z`,
      closedBy: 'FLT001',
      history: [
        event(at(-40, '16:00'), 'reported'),
        event(at(-39, '09:00'), 'insurance', 'declared'),
        event(at(-33, '11:00'), 'insurance', 'assessment', 'Expert ARO passé au garage.'),
        event(at(-20, '15:00'), 'insurance', 'accepted', 'Prise en charge hors franchise.'),
        event(at(-8, '09:30'), 'insurance', 'settled', 'Virement reçu.'),
        event(at(-5, '10:00'), 'closed')
      ]
    },
    {
      no: 'SIN-2026-002',
      nature: 'accident',
      occurredAt: assessed,
      vehicleNo: 'VEH-006',
      driverNo: 'UCT-015',
      location: 'Rond-point d’Anosizato, Antananarivo',
      severity: 'minor_damage',
      odometerKm: 96_410,
      circumstances:
        'Accrochage à faible vitesse avec un taxi-be en s’engageant dans le rond-point.',
      thirdParties: 'Taxi-be ligne 133, rétroviseur et aile avant gauche.',
      damageAmount: 1_200_000,
      liability: 'company',
      policyNo: policyOn('VEH-006', assessed),
      insuranceStatus: 'assessment',
      indemnityAmount: null,
      analysis: '',
      sanction: '',
      photoFileNos: [],
      status: 'open',
      closedAt: null,
      closedBy: null,
      history: [
        event(at(-12, '10:30'), 'reported'),
        event(at(-11, '08:15'), 'insurance', 'declared'),
        event(at(-6, '14:00'), 'insurance', 'assessment', 'Rendez-vous expert fixé.')
      ]
    },
    {
      no: 'SIN-2026-003',
      nature: 'incident',
      occurredAt: leak,
      vehicleNo: 'VEH-011',
      driverNo: 'UCT-017',
      location: 'Dépôt de Tanjombato, quai 2',
      severity: 'environmental',
      odometerKm: null,
      circumstances:
        'Fuite de gasoil au raccord de vidange du compartiment 2 pendant le chargement. Environ 40 litres au sol, absorbant répandu.',
      thirdParties: '',
      damageAmount: 450_000,
      liability: 'to_determine',
      policyNo: policyOn('VEH-011', leak),
      insuranceStatus: 'not_declared',
      indemnityAmount: null,
      analysis: '',
      sanction: '',
      photoFileNos: [],
      status: 'open',
      closedAt: null,
      closedBy: null,
      history: [event(at(-3, '17:00'), 'reported')]
    }
  ]
}

export const claimsCollection: CollectionDefinition<ClaimRow> = {
  name: 'claims',
  seed: () => seed().map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['occurredAt', 'closedAt', 'history[].at']
}
