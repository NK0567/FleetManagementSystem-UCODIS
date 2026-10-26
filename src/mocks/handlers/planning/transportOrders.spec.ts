import { beforeEach, describe, expect, it } from 'vitest'
import type { DeliveryRequestApi } from '@/modules/planning/delivery-requests/types/deliveryRequest.types'
import type { TransportOrderApi } from '@/modules/planning/transport-orders/types/transportOrder.types'
import type { TripApi } from '@/modules/fleet/trips/types/trip.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const path = '/planning/transport-orders'
const send = (
  method: 'post' | 'patch' | 'put',
  url: string,
  body: Record<string, unknown> = {},
  as = 'FLT001'
) => call(server, method, url, { as, body, language: 'en' })

const getOrder = async (no: string) =>
  (await call(server, 'get', `${path}/${no}`, { as: 'FLT001' })).data.data as TransportOrderApi

const getRequest = async (no: string) =>
  (await call(server, 'get', `/planning/delivery-requests/${no}`, { as: 'FLT001' })).data
    .data as DeliveryRequestApi

const fleet = {
  means: 'fleet',
  vehicleNo: 'VEH-001',
  trailerNo: 'VEH-011',
  driverNo: 'UCT-010'
}

async function draft(extra: Record<string, unknown> = {}, as = 'FLT001') {
  return send(
    'post',
    path,
    {
      routeTemplateNo: 'TNR-ATS',
      plannedDeparture: '2026-09-12T06:00',
      ...extra
    },
    as
  )
}

describe('transport orders', () => {
  it('reads a draft, a planned trip, a departed trip, a carrier and a cancellation', async () => {
    const draftOrder = await getOrder('TR-2026-0001')
    expect(draftOrder).toMatchObject({
      status: 'draft',
      means: null,
      routeName: 'Antananarivo → Antsirabe (RN7)',
      plannedDeparture: '2026-09-09T08:00:00',
      plannedArrival: '2026-09-09T11:30:00',
      recipientSummary: 'Leader Price Antsirabe, Jumbo Score Tanjombato',
      totalWeightKg: 4200,
      lineCount: 2
    })
    expect(await getRequest('DL-2026-0007')).toMatchObject({
      status: 'planned',
      transportOrderNo: 'TR-2026-0001'
    })
    expect(await getOrder('TR-2026-0002')).toMatchObject({
      status: 'planned',
      means: 'fleet',
      tripNo: 'TRP-00007',
      vehiclePlate: expect.any(String)
    })
    expect((await getOrder('TR-2026-0002')).vehiclePlate).not.toBe('')
    expect(await getOrder('TR-2026-0003')).toMatchObject({
      status: 'in_progress',
      tripNo: 'TRP-00006',
      plannedDeparture: '2026-09-04T06:00:00'
    })
    expect(await getOrder('TR-2026-0004')).toMatchObject({
      status: 'planned',
      means: 'carrier',
      tripNo: null,
      carrierName: 'Transports Rapides Analamanga',
      carrierDriverName: 'Hery Rakoto'
    })
    expect(await getOrder('TR-2026-0005')).toMatchObject({
      status: 'cancelled',
      cancellationReasonName: 'Demande du client'
    })
  })

  it('numbers the year and takes the requests it is built from', async () => {
    const created = await draft({ deliveryRequestNos: ['DL-2026-0003'] })
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({
      no: 'TR-2026-0006',
      status: 'draft',
      lines: [{ deliveryRequestNo: 'DL-2026-0003', quantity: 650, weightKg: 9750 }]
    })
    expect(await getRequest('DL-2026-0003')).toMatchObject({ status: 'planned' })
    expect((await draft({ plannedDeparture: '2026-09-01T08:00' })).status).toBe(422)
    server.db.routeTemplates.update('TNR-ATS', { active: false })
    expect((await draft()).status).toBe(422)
    expect((await draft({}, 'COM001')).status).toBe(403)
  })

  it('accepts an expired request, and blocks it when the setting says so', async () => {
    expect((await draft({ deliveryRequestNos: ['DL-2026-0005'] })).status).toBe(201)
    const blocked = createTestServer()
    const row = blocked.db.planningSettings.findOrFail('PLANNING')
    blocked.db.planningSettings.update('PLANNING', {
      requests: { ...row.requests, expiredDateMode: 'block' }
    })
    const refused = await call(blocked, 'post', path, {
      as: 'FLT001',
      language: 'en',
      body: { deliveryRequestNos: ['DL-2026-0005'] }
    })
    expect(refused.status).toBe(422)
    expect(refused.data.message).toContain('expired')
  })

  it('replaces the lines and frees the requests that leave', async () => {
    const created = (await draft({ deliveryRequestNos: ['DL-2026-0001', 'DL-2026-0002'] })).data
      .data as TransportOrderApi
    const replaced = await send('put', `${path}/${created.no}/lines`, {
      lines: [{ deliveryRequestNo: 'DL-2026-0001' }]
    })
    expect(replaced.data.data).toMatchObject({
      lineCount: 1,
      lines: [{ deliveryRequestNo: 'DL-2026-0001' }]
    })
    expect(await getRequest('DL-2026-0002')).toMatchObject({
      status: 'pending',
      transportOrderNo: null
    })
    expect(
      (
        await send('put', `${path}/${created.no}/lines`, {
          lines: [{ deliveryRequestNo: 'DL-2026-0001' }, { deliveryRequestNo: 'DL-2026-0001' }]
        })
      ).status
    ).toBe(422)
    expect((await send('put', `${path}/TR-2026-0003/lines`, { lines: [] })).status).toBe(409)
    expect((await send('patch', `${path}/TR-2026-0002`, { comment: 'Quai 2' })).status).toBe(200)
    expect(
      (await send('patch', `${path}/TR-2026-0002`, { routeTemplateNo: 'TNR-ATS' })).status
    ).toBe(409)
  })

  it('plans a fleet trip when the combination can carry the lines', async () => {
    const order = (
      await draft({ routeTemplateNo: 'TNR-MJN', deliveryRequestNos: ['DL-2026-0003'] })
    ).data.data as TransportOrderApi
    const planned = await send('post', `${path}/${order.no}/plan`, fleet)
    expect(planned.status).toBe(200)
    expect(planned.data.data).toMatchObject({
      status: 'planned',
      means: 'fleet',
      tripNo: 'TRP-00010'
    })
    const trip = (await call(server, 'get', '/fleet/trips/TRP-00010', { as: 'FLT001' })).data
      .data as TripApi
    expect(trip).toMatchObject({ status: 'planned', vehicleNo: 'VEH-001', trailerNo: 'VEH-011' })
    expect((await send('post', `${path}/${order.no}/plan`, fleet)).status).toBe(409)
  })

  it('refuses an overload and a tractor that carries nothing', async () => {
    const heavy = (await draft()).data.data as TransportOrderApi
    await send('put', `${path}/${heavy.no}/lines`, {
      lines: [{ deliveryPointNo: 'DP-001', productNo: 'PRD-001', quantity: 1, weightKg: 40_000 }]
    })
    const before = server.db.trips.all().length
    expect((await send('post', `${path}/${heavy.no}/plan`, fleet)).data.message).toContain(
      'exceeds the payload'
    )
    expect(server.db.trips.all()).toHaveLength(before)
    expect(
      (await send('post', `${path}/${heavy.no}/plan`, { ...fleet, trailerNo: null })).data.message
    ).toContain('carries nothing')
  })

  it('refuses a missing pump, a refused vehicle type and products that cannot travel together', async () => {
    const station = (await draft()).data.data as TransportOrderApi
    await send('put', `${path}/${station.no}/lines`, {
      lines: [{ deliveryPointNo: 'DP-009', productNo: 'PRD-006', quantity: 1000, weightKg: null }]
    })
    const pump = await send('post', `${path}/${station.no}/plan`, {
      ...fleet,
      trailerNo: 'VEH-021'
    })
    expect(pump.status).toBe(422)
    expect(pump.data.message).toContain('pump')

    const typed = (await draft({ plannedDeparture: '2026-09-22T06:00' })).data
      .data as TransportOrderApi
    await send('put', `${path}/${typed.no}/lines`, {
      lines: [{ deliveryPointNo: 'DP-003', productNo: 'PRD-001', quantity: 10, weightKg: 100 }]
    })
    expect(
      (await send('post', `${path}/${typed.no}/plan`, { ...fleet, trailerNo: 'VEH-021' })).data
        .message
    ).toContain('does not accept')

    const mixed = (await draft({ plannedDeparture: '2026-09-23T06:00' })).data
      .data as TransportOrderApi
    await send('put', `${path}/${mixed.no}/lines`, {
      lines: [
        { deliveryPointNo: 'DP-001', productNo: 'PRD-007', quantity: 10, weightKg: null },
        { deliveryPointNo: 'DP-001', productNo: 'PRD-008', quantity: 10, weightKg: null }
      ]
    })
    expect((await send('post', `${path}/${mixed.no}/plan`, fleet)).data.message).toContain(
      'do not travel together'
    )
  })

  it('refuses means already taken, and groups onto a trip that is still planned', async () => {
    const busy = (await draft({ deliveryRequestNos: ['DL-2026-0001'] })).data
      .data as TransportOrderApi
    expect(
      (await send('post', `${path}/${busy.no}/plan`, { ...fleet, vehicleNo: 'VEH-003' })).status
    ).toBe(409)

    const grouped = (await draft({ deliveryRequestNos: ['DL-2026-0002'] })).data
      .data as TransportOrderApi
    const onTrip = await send('post', `${path}/${grouped.no}/plan`, {
      means: 'fleet',
      tripNo: 'TRP-00007'
    })
    expect(onTrip.data.data).toMatchObject({
      status: 'planned',
      tripNo: 'TRP-00007',
      routeTemplateNo: 'TNR-MJN',
      plannedDeparture: '2026-09-04T14:00:00'
    })
    expect(
      (await send('post', `${path}/TR-2026-0001/plan`, { means: 'fleet', tripNo: 'TRP-00006' }))
        .status
    ).toBe(409)
    expect(
      (await send('post', `${path}/TR-2026-0001/plan`, { means: 'fleet', tripNo: 'TRP-00009' }))
        .status
    ).toBe(409)
    expect((await send('post', `${path}/TR-2026-0001/plan`, fleet, 'DIR001')).status).toBe(403)
  })

  it('hands the order to an authorized carrier', async () => {
    const order = (await draft({ deliveryRequestNos: ['DL-2026-0001'] })).data
      .data as TransportOrderApi
    expect(
      (await send('post', `${path}/${order.no}/plan`, { means: 'carrier', carrierNo: 'PRS-015' }))
        .status
    ).toBe(422)
    server.db.providers.update('PRS-017', { authorized: false })
    expect(
      (await send('post', `${path}/${order.no}/plan`, { means: 'carrier', carrierNo: 'PRS-017' }))
        .status
    ).toBe(422)
    const handed = await send('post', `${path}/${order.no}/plan`, {
      means: 'carrier',
      carrierNo: 'PRS-016',
      carrierVehiclePlate: '5678 TBA',
      carrierDriverName: 'Naina'
    })
    expect(handed.data.data).toMatchObject({
      status: 'planned',
      means: 'carrier',
      tripNo: null,
      carrierVehiclePlate: '5678 TBA'
    })
    expect(server.db.trips.all().some((trip) => trip.no === 'TRP-00010')).toBe(false)
  })

  it('cancels up to the road, frees undelivered requests and leaves the trip alone', async () => {
    const order = (await draft({ deliveryRequestNos: ['DL-2026-0001'] })).data
      .data as TransportOrderApi
    await send('post', `${path}/${order.no}/plan`, fleet)
    const tripNo = (await getOrder(order.no)).tripNo
    const cancelled = await send('post', `${path}/${order.no}/cancel`, { reasonNo: 'CXL-CUSTOMER' })
    expect(cancelled.data.data).toMatchObject({ status: 'cancelled', tripNo })
    expect(await getRequest('DL-2026-0001')).toMatchObject({
      status: 'pending',
      transportOrderNo: null
    })
    const trip = (await call(server, 'get', `/fleet/trips/${tripNo}`, { as: 'FLT001' })).data
      .data as TripApi
    expect(trip.status).toBe('planned')
    expect(
      (await send('post', `${path}/${order.no}/cancel`, { reasonNo: 'CXL-CUSTOMER' })).status
    ).toBe(409)

    const onRoad = await send('post', `${path}/TR-2026-0003/cancel`, {
      reasonNo: 'CXL-INCIDENT',
      comment: 'Panne'
    })
    expect(onRoad.data.data).toMatchObject({ status: 'cancelled' })
    expect(await getRequest('DL-2026-0010')).toMatchObject({ status: 'pending' })
    expect(
      ((await call(server, 'get', '/fleet/trips/TRP-00006', { as: 'FLT001' })).data.data as TripApi)
        .status
    ).toBe('in_progress')
  })
})
