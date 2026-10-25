import { beforeEach, describe, expect, it } from 'vitest'
import type { AlertApi } from '@/modules/fleet/alerts/types/alert.types'
import type { TyreApi } from '@/modules/maintenance/tyres/types/tyre.types'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const post = (path: string, body: Record<string, unknown> = {}, as = 'MNT001') =>
  call(server, 'post', `/maintenance${path}`, { as, body, language: 'en' })

async function get<T>(path: string) {
  return (await call(server, 'get', path, { as: 'FLT001', language: 'en' })).data.data as T
}

const tyre = (no: string) => get<TyreApi>(`/maintenance/tyres/${no}`)

describe('tyres', () => {
  it('derive the state, the km run and the alerts', async () => {
    expect(await tyre('PN-0001')).toMatchObject({
      status: 'mounted',
      vehiclePlate: '4021 TBA',
      kmRun: 32_400,
      alert: 'none'
    })
    expect(await tyre('PN-0004')).toMatchObject({ alert: 'safety', safetyIssues: ['tread'] })
    expect((await tyre('PN-0003')).alert).toBe('rotation')
    expect((await tyre('PN-0007')).alert).toBe('none')
    expect(await tyre('PN-0011')).toMatchObject({
      status: 'scrapped',
      kmRun: 90_000,
      totalCost: 1_830_000,
      costPerKm: 20.33
    })
    const alerts = (
      await call(server, 'get', '/fleet/alerts', {
        as: 'FLT001',
        query: { pageSize: 200 }
      })
    ).data.data as { items: AlertApi[] }
    expect(
      alerts.items
        .filter((alert) => alert.category === 'tyre')
        .map((alert) => alert.severity)
        .sort()
    ).toEqual(['critical', 'critical', 'info'])
  })

  it('buy with a unique serial and a valid DOT', async () => {
    const buy = (body: Record<string, unknown>) =>
      post(
        '/tyres',
        {
          serialNumber: 'MX9990001',
          make: 'Michelin',
          size: '315/80 R22.5',
          price: 1_400_000,
          purchaseDate: DEMO_REFERENCE_DATE,
          ...body
        },
        'FLT001'
      )
    expect((await buy({ serialNumber: 'mx4521887' })).status).toBe(409)
    expect((await buy({ dotCode: '6024' })).status).toBe(422)
    expect((await buy({ supplierNo: 'PRS-006' })).status).toBe(422)
    expect((await buy({ dotCode: '3626', supplierNo: 'PRS-004' })).data.data).toMatchObject({
      no: 'PN-0012',
      status: 'stock'
    })
  })

  it('mount from stock on a free position of the layout', async () => {
    expect(
      (await post('/tyres/PN-0008/mount', { vehicleNo: 'VEH-001', positionCode: '1' })).status
    ).toBe(409)
    expect(
      (await post('/tyres/PN-0008/mount', { vehicleNo: 'VEH-002', positionCode: '9' })).status
    ).toBe(422)
    expect(
      (await post('/tyres/PN-0001/mount', { vehicleNo: 'VEH-002', positionCode: '1' })).status
    ).toBe(409)
    expect(
      (await post('/tyres/PN-0008/mount', { vehicleNo: 'VEH-002', positionCode: '1' })).data.data
    ).toMatchObject({ status: 'mounted', vehiclePlate: '4022 TBA', positionCode: '1', kmRun: 0 })
  })

  it('rotate by swapping, with an active technician', async () => {
    expect(
      (await post('/tyres/PN-0003/rotate', { positionCode: '3', technicianNo: 'UCT-003' })).status
    ).toBe(422)
    const rotated = (
      await post('/tyres/PN-0003/rotate', { positionCode: '6', technicianNo: 'UCT-003' })
    ).data.data as TyreApi
    expect(rotated).toMatchObject({ positionCode: '6', alert: 'none', kmRun: 32_400 })
    expect((await tyre('PN-0006')).positionCode).toBe('3')
  })

  it('take readings within bounds, and clear a pressure alert', async () => {
    expect((await post('/tyres/PN-0005/reading', { pressureBar: 20, treadMm: 7 })).status).toBe(400)
    expect((await post('/tyres/PN-0008/reading', { pressureBar: 8, treadMm: 7 })).status).toBe(409)
    expect(
      (await post('/tyres/PN-0005/reading', { pressureBar: 8.5, treadMm: 7.4 })).data.data
    ).toMatchObject({ alert: 'none' })
  })

  it('retread from stock, then scrap with a reason and the right', async () => {
    await post('/tyres/PN-0004/dismount', { reason: 'Usure' })
    await post('/tyres/PN-0004/retread')
    expect(
      (await post('/tyres/PN-0004/back-from-retread', { cost: 400_000 })).data.data
    ).toMatchObject({
      status: 'stock',
      retreadCount: 1,
      totalCost: 1_850_000
    })
    expect(
      (await post('/tyres/PN-0004/scrap', { reason: 'Flanc coupé, irréparable.' })).status
    ).toBe(403)
    expect((await post('/tyres/PN-0004/scrap', { reason: 'Court' }, 'FLT001')).status).toBe(422)
    expect(
      (await post('/tyres/PN-0004/scrap', { reason: 'Flanc coupé, irréparable.' }, 'FLT001')).data
        .data
    ).toMatchObject({ status: 'scrapped' })
  })
})

describe('tyre layouts', () => {
  it('keep the positions that carry a mounted tyre', async () => {
    const patch = (body: Record<string, unknown>) =>
      call(server, 'patch', '/maintenance/tyre-layouts/TRACTOR', {
        as: 'FLT001',
        body,
        language: 'en'
      })
    expect((await patch({ spares: 0 })).status).toBe(409)
    expect(
      (
        await patch({
          axles: [
            { label: 'Essieu avant', twin: false },
            { label: 'Essieu arrière', twin: false }
          ]
        })
      ).status
    ).toBe(409)
    expect((await patch({ spares: 2 })).data.data).toMatchObject({ positionCount: 8 })
    expect((await patch({ axles: [] })).status).toBe(422)
  })
})
