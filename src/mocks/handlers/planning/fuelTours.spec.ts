import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (url: string, body: Record<string, unknown> = {}) =>
  call(server, 'post', url, { as: 'FLT001', body, language: 'en' })

describe('fuel tours', () => {
  it('validates a full compartment plan, confirms the BSL at 15 °C and can cancel the delivery note', async () => {
    const request = await post('/planning/delivery-requests', {
      ordererNo: 'CLI-002',
      deliveryPointNo: 'DP-009',
      desiredDate: '2026-09-10',
      productNo: 'PRD-006',
      quantity: 10000,
      freightPayer: 'orderer'
    })
    const requestNo = (request.data.data as { no: string }).no
    const tour = await post('/planning/fuel-tours', {
      depotNo: 'DEP-TNJ',
      date: '2026-09-10',
      validUntil: '2026-09-10',
      requestNos: [requestNo]
    })
    const no = (tour.data.data as { no: string }).no
    expect(no).toBe('FT-2026-0001')
    expect(
      (
        await call(server, 'put', `/planning/fuel-tours/${no}/plan`, {
          as: 'FLT001',
          body: {
            compartments: [
              {
                vehicleNo: 'VEH-021',
                compartmentNo: 1,
                productNo: 'PRD-006',
                volumeL: 13000,
                deliveryRequestNo: requestNo
              }
            ]
          }
        })
      ).status
    ).toBe(422)
    await call(server, 'put', `/planning/fuel-tours/${no}/plan`, {
      as: 'FLT001',
      body: {
        compartments: [
          {
            vehicleNo: 'VEH-021',
            compartmentNo: 1,
            productNo: 'PRD-006',
            volumeL: 10000,
            deliveryRequestNo: requestNo
          }
        ]
      }
    })
    const validated = await post(`/planning/fuel-tours/${no}/validate`)
    expect(validated.status).toBe(200)
    const blNo = (validated.data.data as { bls: { no: string }[] }).bls[0].no
    expect(blNo).toBe('BL-2026-0001')
    const confirmed = await post(`/planning/fuel-tours/${no}/confirm-pickup`, {
      bslNo: 'BSL-1',
      measures: [{ vehicleNo: 'VEH-021', compartmentNo: 1, volumeL: 10000, temperature: 25 }]
    })
    expect(confirmed.data.data.voucher.measures[0].volume15).toBe(9920)
    expect((await post(`/planning/fuel-tours/${no}/bls/${blNo}/cancel`, { reason: 'Citerne indisponible' })).status).toBe(
      200
    )
    expect(server.db.deliveryRequests.findOrFail(requestNo).transportOrderNo).toBeNull()
  })
})
