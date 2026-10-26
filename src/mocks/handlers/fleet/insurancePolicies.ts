import {
  periodsOverlap,
  policyIssues,
  policyState,
  type PolicyIssue
} from '@/modules/fleet/insurance-policies/domain/insurancePolicy'
import {
  INSURANCE_COVERAGES,
  type InsurancePolicyApi
} from '@/modules/fleet/insurance-policies/types/insurancePolicy.types'
import { addDays, todayIso } from '@/utils/date'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { InsurancePolicyRow } from '../../fixtures/fleet/insurancePolicies'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

type Policy = Omit<InsurancePolicyRow, keyof AuditFields>
type EditableFields = Omit<Policy, 'no' | 'terminatedOn' | 'terminationReason'>

const ISSUE_MESSAGES: Record<PolicyIssue, (typeof FLEET_MESSAGES)['policyEndBeforeStart']> = {
  endBeforeStart: FLEET_MESSAGES.policyEndBeforeStart,
  terminationOutsidePeriod: FLEET_MESSAGES.policyTerminationOutsidePeriod
}

export function insurancePoliciesApi(db: MockDatabase): InsurancePolicyApi[] {
  const today = todayIso()
  const noticeDays = fleetSettings(db).documents.defaultNoticeDays
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const insurers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const claims = db.claims.all()
  return db.insurancePolicies.all().map((policy) => ({
    ...policy,
    vehiclePlate: plates.get(policy.vehicleNo) ?? policy.vehicleNo,
    insurerName: insurers.get(policy.insurerNo) ?? policy.insurerNo,
    state: policyState(policy, noticeDays, today),
    notifyOn: policy.terminatedOn ? null : addDays(policy.endDate, -noticeDays),
    claimCount: claims.filter((claim) => claim.policyNo === policy.no).length
  }))
}

function policyApiOf(db: MockDatabase, no: string): InsurancePolicyApi | undefined {
  return insurancePoliciesApi(db).find((row) => row.no === no)
}

export function registerInsurancePoliciesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    vehicleNo: (input) => {
      const no = requireReference(db.vehicles, input, 'vehicleNo')
      if (db.vehicles.findOrFail(no).removal) throw unknownReference('vehicleNo')
      return no
    },
    insurerNo: (input) => {
      const no = requireReference(db.providers, input, 'insurerNo')
      const insurer = db.providers.findOrFail(no)
      if (insurer.providerType !== 'insurer' || !insurer.authorized) {
        throw unprocessable(FLEET_MESSAGES.insurerNotAuthorized)
      }
      return no
    },
    policyNumber: (input) => readString(input, 'policyNumber', { required: true }),
    coverage: (input) =>
      readEnum(input, 'coverage', INSURANCE_COVERAGES, { required: true }) ?? 'third_party',
    startDate: (input) => readDate(input, 'startDate', { required: true }) ?? '',
    endDate: (input) => readDate(input, 'endDate', { required: true }) ?? '',
    annualPremium: (input) => readNumber(input, 'annualPremium', { min: 0 }),
    deductible: (input) => readNumber(input, 'deductible', { min: 0 })
  }

  /** Dates in order, one policy number per insurer, one policy at a time per vehicle. */
  function assertConsistent(policy: Policy) {
    const [issue] = policyIssues(policy)
    if (issue) throw unprocessable(ISSUE_MESSAGES[issue])
    const others = db.insurancePolicies.all().filter((row) => row.no !== policy.no)
    if (
      others.some(
        (row) => row.insurerNo === policy.insurerNo && row.policyNumber === policy.policyNumber
      )
    ) {
      throw conflict(FLEET_MESSAGES.policyNumberTaken)
    }
    const overlapping = others.find(
      (row) => row.vehicleNo === policy.vehicleNo && periodsOverlap(row, policy)
    )
    if (overlapping) throw conflict(FLEET_MESSAGES.policyOverlap, { no: overlapping.no })
  }

  registerCrudResource(router, {
    basePath: '/fleet/insurance-policies',
    feature: 'INSURANCEPOLICY',
    collection: db.insurancePolicies,
    list: () => insurancePoliciesApi(db),
    searchColumns: ['no', 'policyNumber', 'vehiclePlate', 'insurerName'],
    optionFields: { coverage: 'insuranceCoverage', state: 'policyState' },
    create: (input) => {
      const policy: Policy = {
        no: nextNo(
          db.insurancePolicies.all().map((row) => row.no),
          'POL-',
          3
        ),
        ...readAll(input, readers),
        terminatedOn: null,
        terminationReason: ''
      }
      assertConsistent(policy)
      return policy
    },
    update: (existing, input) => {
      if (existing.terminatedOn) throw conflict(FLEET_MESSAGES.policyTerminated)
      const patch = readPatch(input, readers)
      assertConsistent({ ...existing, ...patch })
      return patch
    },
    remove: (existing) => {
      if (db.claims.all().some((claim) => claim.policyNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.policyHasClaims)
      }
    }
  })

  router.post(
    '/fleet/insurance-policies/:no/terminate',
    { feature: 'INSURANCEPOLICY', action: 'update' },
    (request) => {
      const policy = db.insurancePolicies.findOrFail(routeParam(request, 'no'))
      if (policy.terminatedOn) throw conflict(FLEET_MESSAGES.policyTerminated)
      const body = readBody(request)
      const terminatedOn = readDate(body, 'terminatedOn', { required: true }) ?? ''
      const reason = readString(body, 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      const [issue] = policyIssues({ ...policy, terminatedOn })
      if (issue) throw unprocessable(ISSUE_MESSAGES[issue])
      db.insurancePolicies.update(policy.no, {
        terminatedOn,
        terminationReason: reason,
        ...stampModified(request)
      })
      return ok(policyApiOf(db, policy.no))
    }
  )
}
