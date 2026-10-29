import {
  closureBlocks,
  indemnityIssues,
  INSURANCE_STATUSES,
  nextInsuranceStatuses,
  residualCost,
  type ClosureBlock,
  type IndemnityIssue
} from '@/modules/fleet/claims/domain/claim'
import {
  CLAIM_LIABILITIES,
  CLAIM_NATURES,
  CLAIM_SEVERITIES,
  type ClaimApi,
  type ClaimEvent
} from '@/modules/fleet/claims/types/claim.types'
import { coversDay } from '@/modules/fleet/insurance-policies/domain/insurancePolicy'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIsoDateTime } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { ClaimRow } from '../../fixtures/fleet/claims'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
  readDateTime,
  readEnum,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { localize } from '../../i18n'
import { filesMetaOf } from '../files'
import { FLEET_MESSAGES } from './messages'
import { workOrdersBySource } from '../maintenance/workOrderSources'
import { createTraining } from './trainings'

type EditableFields = Pick<
  ClaimRow,
  | 'occurredAt'
  | 'vehicleNo'
  | 'driverNo'
  | 'location'
  | 'severity'
  | 'odometerKm'
  | 'circumstances'
  | 'thirdParties'
  | 'damageAmount'
  | 'liability'
  | 'analysis'
  | 'sanction'
  | 'photoFileNos'
>

const INDEMNITY_MESSAGES: Record<IndemnityIssue, (typeof FLEET_MESSAGES)['claimClosed']> = {
  indemnityRequired: FLEET_MESSAGES.claimIndemnityRequired,
  indemnityAboveDamage: FLEET_MESSAGES.claimIndemnityAboveDamage
}

const BLOCK_MESSAGES: Record<
  Exclude<ClosureBlock, 'alreadyClosed'>,
  (typeof FLEET_MESSAGES)['claimClosed']
> = {
  analysisRequired: FLEET_MESSAGES.claimBlockAnalysis,
  liabilityUndetermined: FLEET_MESSAGES.claimBlockLiability,
  insurancePending: FLEET_MESSAGES.claimBlockInsurance,
  repairOpen: FLEET_MESSAGES.claimBlockRepair
}

export function claimsApi(db: MockDatabase): ClaimApi[] {
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const policies = new Map(db.insurancePolicies.all().map((policy) => [policy.no, policy]))
  const insurers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const repairs = workOrdersBySource(db)
  const downtimeNames = new Map(db.downtimeCodes.all().map((code) => [code.no, code.name]))
  return db.claims.all().map((claim) => {
    const policy = claim.policyNo ? policies.get(claim.policyNo) : undefined
    const repair = repairs.get(`claim ${claim.no}`)
    const order = repair ? db.workOrders.find(repair.no) : undefined
    const downtime = order?.downtimeNo ? db.downtimes.find(order.downtimeNo) : undefined
    return {
      ...claim,
      workOrderNo: repair?.no ?? null,
      repairOpen: repair?.open ?? false,
      downtimeCode: downtime?.downtimeCodeNo ?? null,
      downtimeCodeName: downtime ? (downtimeNames.get(downtime.downtimeCodeNo) ?? '') : '',
      downtimeOpen: !!downtime && !downtime.endedAt,
      vehiclePlate: plates.get(claim.vehicleNo) ?? claim.vehicleNo,
      driverName: claim.driverNo ? (names.get(claim.driverNo) ?? claim.driverNo) : '',
      policyNumber: policy?.policyNumber ?? '',
      insurerName: policy ? (insurers.get(policy.insurerNo) ?? '') : '',
      residualCost: residualCost(claim.damageAmount, claim.indemnityAmount),
      photos: filesMetaOf(db, claim.photoFileNos)
    }
  })
}

function claimApiOf(db: MockDatabase, no: string): ClaimApi | undefined {
  return claimsApi(db).find((row) => row.no === no)
}

function historyEvent(
  request: MockRequest,
  kind: ClaimEvent['kind'],
  insuranceStatus: ClaimEvent['insuranceStatus'] = null,
  comment = ''
): ClaimEvent {
  return { at: nowIso(), by: sessionUser(request).code, kind, insuranceStatus, comment }
}

export function registerClaimsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    occurredAt: (input) => {
      const value = readDateTime(input, 'occurredAt', { required: true }) ?? ''
      if (value > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.claimInFuture)
      return value
    },
    vehicleNo: (input) => requireReference(db.vehicles, input, 'vehicleNo'),
    driverNo: (input) => optionalReference(db.employees, input, 'driverNo'),
    location: (input) => readString(input, 'location', { required: true }),
    severity: (input) =>
      readEnum(input, 'severity', CLAIM_SEVERITIES, { required: true }) ?? 'minor_damage',
    odometerKm: (input) => readNumber(input, 'odometerKm', { min: 0 }),
    circumstances: (input) => readString(input, 'circumstances', { required: true }),
    thirdParties: (input) => readString(input, 'thirdParties'),
    damageAmount: (input) => readNumber(input, 'damageAmount', { min: 0 }),
    liability: (input) =>
      readEnum(input, 'liability', CLAIM_LIABILITIES, { required: true }) ?? 'to_determine',
    analysis: (input) => readString(input, 'analysis'),
    sanction: (input) => readString(input, 'sanction'),
    photoFileNos: (input) => {
      const nos = readStringList(input, 'photoFileNos')
      if (nos.some((no) => !db.files.exists(no))) throw unknownReference('photoFileNos')
      return nos
    }
  }

  /** The policy is the one covering the vehicle on the day of the claim, not a choice. */
  function policyOn(vehicleNo: string, occurredAt: string): string | null {
    const day = occurredAt.slice(0, 10)
    return (
      db.insurancePolicies
        .all()
        .find((policy) => policy.vehicleNo === vehicleNo && coversDay(policy, day))?.no ?? null
    )
  }

  function assertOpen(claim: ClaimRow) {
    if (claim.status === 'closed') throw conflict(FLEET_MESSAGES.claimClosed)
  }

  registerCrudResource(router, {
    basePath: '/fleet/claims',
    feature: 'CLAIM',
    collection: db.claims,
    list: () => claimsApi(db),
    searchColumns: ['no', 'vehiclePlate', 'driverName', 'location'],
    optionFields: {
      nature: 'claimNature',
      severity: 'claimSeverity',
      liability: 'claimLiability',
      insuranceStatus: 'claimInsuranceStatus',
      status: 'claimStatus'
    },
    create: (input, request) => {
      const nature = readEnum(input, 'nature', CLAIM_NATURES, { required: true }) ?? 'accident'
      const fields = readAll(input, readers)
      const year = fields.occurredAt.slice(0, 4)
      return {
        no: nextNo(
          db.claims.all().map((row) => row.no),
          `SIN-${year}-`,
          3
        ),
        nature,
        ...fields,
        policyNo: policyOn(fields.vehicleNo, fields.occurredAt),
        insuranceStatus: 'not_declared' as const,
        indemnityAmount: null,
        status: 'open' as const,
        closedAt: null,
        closedBy: null,
        history: [historyEvent(request, 'reported')]
      }
    },
    update: (existing, input) => {
      assertOpen(existing)
      const patch = readPatch(input, readers)
      const next = { ...existing, ...patch }
      const [issue] = indemnityIssues(next.insuranceStatus, next.indemnityAmount, next.damageAmount)
      if (issue) throw unprocessable(INDEMNITY_MESSAGES[issue])
      // Once declared, the insurer handles the claim under the policy it was declared on.
      return existing.insuranceStatus === 'not_declared'
        ? { ...patch, policyNo: policyOn(next.vehicleNo, next.occurredAt) }
        : patch
    }
  })

  router.post('/fleet/claims/:no/insurance', { feature: 'CLAIM', action: 'update' }, (request) => {
    const claim = db.claims.findOrFail(routeParam(request, 'no'))
    assertOpen(claim)
    const body = readBody(request)
    const status = readEnum(body, 'status', INSURANCE_STATUSES, { required: true }) ?? 'declared'
    if (!nextInsuranceStatuses(claim.insuranceStatus).includes(status)) {
      throw conflict(FLEET_MESSAGES.claimInsuranceStep)
    }
    if (status === 'declared' && !claim.policyNo) throw unprocessable(FLEET_MESSAGES.claimNoPolicy)
    const indemnityAmount =
      status === 'refused'
        ? 0
        : (readNumber(body, 'indemnityAmount', { min: 0 }) ?? claim.indemnityAmount)
    const [issue] = indemnityIssues(status, indemnityAmount, claim.damageAmount)
    if (issue) throw unprocessable(INDEMNITY_MESSAGES[issue])
    db.claims.update(claim.no, {
      insuranceStatus: status,
      indemnityAmount,
      history: [
        ...claim.history,
        historyEvent(request, 'insurance', status, readString(body, 'comment'))
      ],
      ...stampModified(request)
    })
    return ok(claimApiOf(db, claim.no))
  })

  router.post('/fleet/claims/:no/training', { feature: 'CLAIM', action: 'update' }, (request) => {
    const claim = db.claims.findOrFail(routeParam(request, 'no'))
    assertOpen(claim)
    if (!claim.driverNo) throw unprocessable(FLEET_MESSAGES.trainingNeedsDriver)
    const training = createTraining(
      db,
      {
        employeeNo: claim.driverNo,
        topic: readString(readBody(request), 'topic', { required: true }),
        reason: claim.nature,
        originNo: claim.no
      },
      request
    )
    return ok(training)
  })

  router.post('/fleet/claims/:no/close', { feature: 'CLAIM', action: 'execute' }, (request) => {
    const claim = db.claims.findOrFail(routeParam(request, 'no'))
    const blocks = closureBlocks(claimApiOf(db, claim.no) ?? claim)
    if (blocks.includes('alreadyClosed')) throw conflict(FLEET_MESSAGES.claimClosed)
    if (blocks.length) {
      const reasons = blocks
        .map((block) =>
          localize(
            request.language,
            BLOCK_MESSAGES[block as Exclude<ClosureBlock, 'alreadyClosed'>]
          )
        )
        .join(', ')
      throw unprocessable(FLEET_MESSAGES.claimClosureBlocked, { reasons })
    }
    db.claims.update(claim.no, {
      status: 'closed',
      closedAt: nowIso(),
      closedBy: sessionUser(request).code,
      history: [...claim.history, historyEvent(request, 'closed')],
      ...stampModified(request)
    })
    return ok(claimApiOf(db, claim.no))
  })
}
