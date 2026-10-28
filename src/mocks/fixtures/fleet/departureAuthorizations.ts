import type { CheckResult } from '@/modules/fleet/check-points/domain/checkResult'
import {
  DEPARTURE_CHECK_CODES,
  type DepartureCheck,
  type DepartureDecision
} from '@/modules/fleet/departure-authorizations/domain/departure'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'
import { checkPointsCollection } from './checkPoints'

export interface DepartureAuthorizationRow extends MockRow {
  tripNo: string
  driverChecks: CheckResult[]
  decision: DepartureDecision
  decidedBy: string | null
  decidedAt: string | null
  refusalReason: string
  checksSnapshot: DepartureCheck[] | null
}

function driverChecks(): CheckResult[] {
  return checkPointsCollection
    .seed()
    .filter((point) => point.scope === 'driver' && point.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((point) => ({
      pointNo: point.no,
      label: point.label,
      blocking: point.blocking,
      result: 'ok',
      comment: ''
    }))
}

const passed: DepartureCheck[] = DEPARTURE_CHECK_CODES.map((code) => ({
  code,
  ok: true,
  detail: ''
}))

/** Every trip that left had its departure granted; TRP-00007 still waits for the decision. */
const granted = (no: string, tripNo: string, decidedAt: string) => ({
  no,
  tripNo,
  driverChecks: driverChecks(),
  decision: 'granted' as const,
  decidedBy: 'FLT001',
  decidedAt,
  refusalReason: '',
  checksSnapshot: passed
})

const SEED: Omit<DepartureAuthorizationRow, keyof typeof seedAudit>[] = [
  granted('AUT-2026-0001', 'TRP-00004', '2026-08-10T02:45:00.000Z'),
  granted('AUT-2026-0002', 'TRP-00002', '2026-08-20T01:50:00.000Z'),
  granted('AUT-2026-0003', 'TRP-00005', '2026-08-22T02:20:00.000Z'),
  granted('AUT-2026-0004', 'TRP-00001', '2026-08-24T02:20:00.000Z'),
  granted('AUT-2026-0005', 'TRP-00003', '2026-08-26T02:50:00.000Z'),
  granted('AUT-2026-0006', 'TRP-00006', '2026-09-04T02:50:00.000Z'),
  {
    no: 'AUT-2026-0007',
    tripNo: 'TRP-00007',
    driverChecks: driverChecks(),
    decision: 'pending',
    decidedBy: null,
    decidedAt: null,
    refusalReason: '',
    checksSnapshot: null
  }
]

export const departureAuthorizationsCollection: CollectionDefinition<DepartureAuthorizationRow> = {
  name: 'departure-authorizations',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'FLT001', modifiedBy: 'FLT001' })),
  dateFields: ['decidedAt']
}
