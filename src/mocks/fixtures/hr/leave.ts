import type { LeaveRequestStatus } from '@/modules/hr/leave-requests/domain/leaveRequestStatus'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface LeaveRequestRow extends MockRow {
  employeeNo: string
  leaveTypeNo: string
  startDate: string
  endDate: string
  status: LeaveRequestStatus
  reason: string
  submittedAt: string
  decisionComment: string
  decidedAt: string | null
  decidedBy: string | null
}

/** Opening balance taken over when the software went live, per employee and leave type. */
export interface LeaveBalanceAdjustmentRow extends MockRow {
  employeeNo: string
  leaveTypeNo: string
  carriedOverDays: number
  adjustmentDays: number
  reason: string
}

function request(
  no: string,
  employeeNo: string,
  leaveTypeNo: string,
  startDate: string,
  endDate: string,
  submittedAt: string,
  decision?: { status: LeaveRequestStatus; at: string; comment?: string }
): LeaveRequestRow {
  return {
    no,
    employeeNo,
    leaveTypeNo,
    startDate,
    endDate,
    status: decision?.status ?? 'pending',
    reason: '',
    submittedAt: `${submittedAt}T08:00:00.000Z`,
    decisionComment: decision?.comment ?? '',
    decidedAt: decision ? `${decision.at}T10:00:00.000Z` : null,
    decidedBy: decision ? 'FLT001' : null,
    ...seedAudit
  }
}

export const leaveRequestsCollection: CollectionDefinition<LeaveRequestRow> = {
  name: 'hr-leave-requests',
  dateFields: ['startDate', 'endDate', 'submittedAt', 'decidedAt'],
  seed: () => [
    request('LR-0001', 'UCT-010', 'CA', '2026-09-14', '2026-09-21', '2026-08-28'),
    request('LR-0002', 'UCT-017', 'CM', '2026-09-02', '2026-09-05', '2026-09-01'),
    request('LR-0003', 'UCT-008', 'REC', '2026-09-11', '2026-09-11', '2026-09-03'),
    request('LR-0004', 'UCT-012', 'CA', '2026-09-07', '2026-09-18', '2026-08-12', {
      status: 'approved',
      at: '2026-08-13'
    }),
    request('LR-0005', 'UCT-004', 'PE', '2026-09-04', '2026-09-04', '2026-08-30', {
      status: 'approved',
      at: '2026-08-31'
    }),
    request('LR-0006', 'UCT-021', 'CA', '2026-08-17', '2026-08-28', '2026-07-20', {
      status: 'approved',
      at: '2026-07-21'
    }),
    request('LR-0007', 'UCT-015', 'CM', '2026-08-03', '2026-08-04', '2026-08-03', {
      status: 'rejected',
      at: '2026-08-05',
      comment: 'Justificatif médical non fourni dans les délais.'
    }),
    request('LR-0008', 'UCT-011', 'REC', '2026-09-25', '2026-09-25', '2026-09-01', {
      status: 'sent_back',
      at: '2026-09-02',
      comment: 'Merci de préciser le voyage qui ouvre droit à cette récupération.'
    })
  ]
}

const BALANCE_TYPES = ['CA', 'REC', 'CM', 'PE'] as const
type BalanceType = (typeof BALANCE_TYPES)[number]

const OPENING_BALANCES: Record<string, Record<BalanceType, number>> = {
  'UCT-010': { CA: 18, REC: 3, CM: 8, PE: 2 },
  'UCT-011': { CA: 24, REC: 1, CM: 8, PE: 2 },
  'UCT-012': { CA: 8, REC: 0, CM: 8, PE: 1 },
  'UCT-013': { CA: 21, REC: 4, CM: 6, PE: 2 },
  'UCT-014': { CA: 15, REC: 2, CM: 8, PE: 2 },
  'UCT-015': { CA: 22, REC: 0, CM: 5, PE: 0 },
  'UCT-016': { CA: 19, REC: 2, CM: 8, PE: 2 },
  'UCT-017': { CA: 11, REC: 1, CM: 4, PE: 1 },
  'UCT-002': { CA: 25, REC: 0, CM: 8, PE: 2 },
  'UCT-003': { CA: 20, REC: 5, CM: 8, PE: 2 },
  'UCT-004': { CA: 17, REC: 0, CM: 8, PE: 1 },
  'UCT-008': { CA: 23, REC: 6, CM: 8, PE: 2 }
}

const STANDARD_ENTITLEMENT: Record<BalanceType, number> = { CA: 30, REC: 0, CM: 8, PE: 2 }

/** The opening balance is stored as an adjustment of the standard entitlement. */
export const leaveBalanceAdjustmentsCollection: CollectionDefinition<LeaveBalanceAdjustmentRow> = {
  name: 'hr-leave-balance-adjustments',
  seed: () =>
    Object.entries(OPENING_BALANCES).flatMap(([employeeNo, balances]) =>
      BALANCE_TYPES.map((leaveTypeNo) => ({
        no: `${employeeNo}-${leaveTypeNo}`,
        employeeNo,
        leaveTypeNo,
        carriedOverDays: 0,
        adjustmentDays: balances[leaveTypeNo] - STANDARD_ENTITLEMENT[leaveTypeNo],
        reason: 'Reprise du solde au démarrage du logiciel',
        ...seedAudit
      }))
    )
}
