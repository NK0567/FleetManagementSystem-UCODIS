import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

describe('my tour', () => {
  it('shows the driver the tour on the road, in stop order, with the departure decision', async () => {
    const response = await call(server, 'get', '/me/tour', { as: 'CND001' })
    expect(response.status).toBe(200)
    const tour = response.data.data as {
      tripNo: string
      departureDecision: string
      stops: { siteNo: string }[]
      lines: { deliveryPointNo: string }[]
      checkPoints: { no: string }[]
    }
    expect(tour.tripNo).toBe('TRP-00006')
    expect(tour.departureDecision).toBe('granted')
    expect(tour.stops[0]?.siteNo).toBe('DEP-TNJ')
    expect(tour.stops.at(-1)?.siteNo).toBe('ENT-TOA')
    expect(tour.lines.map((line) => line.deliveryPointNo)).toEqual(['DP-006'])
    expect(tour.checkPoints.length).toBeGreaterThan(0)

    const assistant = await call(server, 'get', '/me/tour', { as: 'AID001' })
    expect(assistant.status).toBe(200)
    expect(assistant.data.data).toBeNull()

    expect((await call(server, 'get', '/me/tour', { as: 'FLT001' })).status).toBe(403)
  })

  it('records a checklist on the driver tour and refuses the assistant', async () => {
    const tour = (await call(server, 'get', '/me/tour', { as: 'CND001' })).data.data as {
      checkPoints: { no: string }[]
    }
    const results = tour.checkPoints.map((point) => ({
      pointNo: point.no,
      result: 'ok',
      comment: ''
    }))
    const saved = await call(server, 'post', '/me/checklist', {
      as: 'CND001',
      body: { stage: 'departure', takenAt: '2026-09-04T05:40', results }
    })
    expect(saved.status).toBe(201)
    expect(saved.data.data).toEqual(
      expect.objectContaining({ tripNo: 'TRP-00006', stage: 'departure' })
    )

    const assistant = await call(server, 'post', '/me/checklist', {
      as: 'AID001',
      body: { stage: 'departure', takenAt: '2026-09-04T05:40', results }
    })
    expect(assistant.status).toBe(403)
  })
})
