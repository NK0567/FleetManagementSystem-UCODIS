import { beforeEach, describe, expect, it } from 'vitest'
import type { ClaimApi } from '@/modules/fleet/claims/types/claim.types'
import type { InsurancePolicyApi } from '@/modules/fleet/insurance-policies/types/insurancePolicy.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function list<T>(path: string, query: Record<string, unknown> = {}) {
  return (
    (await call(server, 'get', path, { as: 'FLT001', query: { pageSize: 100, ...query } })).data
      .data as { items: T[] }
  ).items
}

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001' })).data.data as T
}

const policyOf = async (vehicleNo: string) =>
  (await list<InsurancePolicyApi>('/fleet/insurance-policies')).filter(
    (policy) => policy.vehicleNo === vehicleNo
  )

describe('insurance policies', () => {
  it('match the insurance certificates and derive their state', async () => {
    const [policy] = await policyOf('VEH-008')
    expect(policy).toMatchObject({ insurerName: 'ARO Madagascar', state: 'expiring' })
    const certificates = await list<{ number: string; expiryDate: string; current: boolean }>(
      '/fleet/documents',
      {
        filters: JSON.stringify([
          { field: 'subjectNo', valueType: 'string', value: 'VEH-008' },
          { field: 'documentTypeNo', valueType: 'string', value: 'VEH-INS' }
        ])
      }
    )
    expect(certificates[0]).toMatchObject({
      number: policy?.policyNumber,
      expiryDate: policy?.endDate
    })
  })

  it('keep one policy at a time per vehicle', async () => {
    const [current] = await policyOf('VEH-002')
    const response = await call(server, 'post', '/fleet/insurance-policies', {
      as: 'FLT001',
      body: {
        vehicleNo: 'VEH-002',
        insurerNo: 'PRS-011',
        policyNumber: 'NYH-2026-9999',
        coverage: 'comprehensive',
        startDate: current?.endDate,
        endDate: '2030-01-01'
      }
    })
    expect(response.status).toBe(409)
    expect(response.data.message).toContain(current?.no ?? '')
  })

  it('only accept an authorized insurer', async () => {
    const response = await call(server, 'post', '/fleet/insurance-policies', {
      as: 'FLT001',
      body: {
        vehicleNo: 'VEH-002',
        insurerNo: 'PRS-001',
        policyNumber: 'X-1',
        coverage: 'third_party',
        startDate: '2031-01-01',
        endDate: '2031-12-31'
      }
    })
    expect(response.status).toBe(422)
  })

  it('show a change of insurer as a terminated policy, frozen afterwards', async () => {
    const policies = await policyOf('VEH-015')
    const former = policies.find((policy) => policy.terminatedOn)
    expect(former).toMatchObject({ state: 'terminated', insurerName: 'ARO Madagascar' })
    expect(policies.find((policy) => !policy.terminatedOn)?.insurerName).toBe(
      'NY HAVANA Assurances'
    )
    const edit = await call(server, 'patch', `/fleet/insurance-policies/${former?.no}`, {
      as: 'FLT001',
      body: { deductible: 0 }
    })
    expect(edit.status).toBe(409)
  })

  it('terminate with a reason, within the period', async () => {
    const [policy] = await policyOf('VEH-002')
    const terminate = (body: Record<string, unknown>) =>
      call(server, 'post', `/fleet/insurance-policies/${policy?.no}/terminate`, {
        as: 'FLT001',
        body
      })
    expect((await terminate({ terminatedOn: '2026-09-04' })).status).toBe(422)
    expect((await terminate({ terminatedOn: '2040-01-01', reason: 'Vente' })).status).toBe(422)
    expect(
      (await terminate({ terminatedOn: '2026-09-04', reason: 'Véhicule vendu' })).data.data
    ).toMatchObject({ terminatedOn: '2026-09-04', state: 'active' })
  })

  it('cannot be deleted while a claim refers to them', async () => {
    const claim = await get<ClaimApi>('/fleet/claims/SIN-2026-002')
    const response = await call(server, 'delete', `/fleet/insurance-policies/${claim.policyNo}`, {
      as: 'FLT001'
    })
    expect(response.status).toBe(409)
  })
})

const report = (body: Record<string, unknown>) =>
  call(server, 'post', '/fleet/claims', {
    as: 'FLT001',
    body: {
      nature: 'accident',
      occurredAt: '2026-09-03T08:30',
      vehicleNo: 'VEH-002',
      driverNo: 'UCT-011',
      location: 'RN2, Moramanga',
      severity: 'minor_damage',
      circumstances: 'Choc arrière à faible vitesse.',
      damageAmount: 600000,
      liability: 'to_determine',
      ...body
    }
  })

const insurance = (no: string, body: Record<string, unknown>) =>
  call(server, 'post', `/fleet/claims/${no}/insurance`, { as: 'FLT001', body })

describe('claims', () => {
  it('are numbered by year and attached to the policy covering that day', async () => {
    const response = await report({})
    expect(response.status).toBe(201)
    const [policy] = await policyOf('VEH-002')
    expect(response.data.data).toMatchObject({
      no: 'SIN-2026-004',
      occurredAt: '2026-09-03T08:30:00',
      policyNo: policy?.no,
      insuranceStatus: 'not_declared',
      status: 'open'
    })
    expect((await report({ occurredAt: '2027-01-01T08:00' })).status).toBe(422)
  })

  it('follow the insurer one step at a time, with an indemnity within the damage', async () => {
    const no = ((await report({})).data.data as ClaimApi).no
    expect((await insurance(no, { status: 'accepted', indemnityAmount: 1 })).status).toBe(409)
    expect((await insurance(no, { status: 'declared' })).status).toBe(200)
    expect((await insurance(no, { status: 'assessment' })).status).toBe(200)
    expect((await insurance(no, { status: 'accepted' })).status).toBe(422)
    expect((await insurance(no, { status: 'accepted', indemnityAmount: 700000 })).status).toBe(422)
    const accepted = await insurance(no, { status: 'accepted', indemnityAmount: 450000 })
    expect(accepted.data.data).toMatchObject({ residualCost: 150000 })
    const claim = await get<ClaimApi>(`/fleet/claims/${no}`)
    expect(claim.history.map((event) => event.insuranceStatus ?? event.kind)).toEqual([
      'reported',
      'declared',
      'assessment',
      'accepted'
    ])
  })

  it('close only once analysed, with a liability and no insurer decision pending', async () => {
    const close = (no: string) =>
      call(server, 'post', `/fleet/claims/${no}/close`, { as: 'FLT001', language: 'fr' })
    const blocked = await close('SIN-2026-002')
    expect(blocked.status).toBe(422)
    expect(blocked.data.message).toContain("l'analyse des causes manque")
    expect(blocked.data.message).toContain("l'assureur n'a pas encore rendu sa décision")

    await call(server, 'patch', '/fleet/claims/SIN-2026-003', {
      as: 'FLT001',
      body: { analysis: 'Joint de vidange usé.', liability: 'company' }
    })
    expect((await close('SIN-2026-003')).data.data).toMatchObject({ status: 'closed' })
    expect((await close('SIN-2026-003')).status).toBe(409)
    const edit = await call(server, 'patch', '/fleet/claims/SIN-2026-003', {
      as: 'FLT001',
      body: { sanction: 'Rappel' }
    })
    expect(edit.status).toBe(409)
  })
})
