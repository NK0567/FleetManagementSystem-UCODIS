import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const grid = async (vehicleNo: string) =>
  (
    (await call(server, 'get', '/fleet/inspections/grid', { as: 'FLT001', query: { vehicleNo } }))
      .data.data as { itemNo: string }[]
  ).map((item) => item.itemNo)

describe('inspection grid', () => {
  it('is set by the fleet manager and drives the next inspections', async () => {
    const item = { no: 'VH-08', label: 'Tachygraphe', part: 'vehicle', sortOrder: 80 }
    expect(
      (await call(server, 'post', '/fleet/inspection-items', { as: 'MNT001', body: item })).status
    ).toBe(403)
    expect(
      (
        await call(server, 'post', '/fleet/inspection-items', {
          as: 'FLT001',
          body: { ...item, part: 'cabin' }
        })
      ).status
    ).toBe(400)
    expect(
      (await call(server, 'post', '/fleet/inspection-items', { as: 'FLT001', body: item })).status
    ).toBe(201)
    expect(await grid('VEH-001')).toContain('VH-08')
    await call(server, 'patch', '/fleet/inspection-items/VH-08', {
      as: 'FLT001',
      body: { active: false }
    })
    expect(await grid('VEH-001')).not.toContain('VH-08')
    expect((await grid('VEH-001')).some((no) => no.startsWith('CT-'))).toBe(false)
    expect((await grid('VEH-021')).some((no) => no.startsWith('CT-'))).toBe(true)
  })

  it('keeps the signed report as it was when the grid changes', async () => {
    await call(server, 'patch', '/fleet/inspection-items/VH-02', {
      as: 'FLT001',
      body: { label: 'Direction' }
    })
    const report = (await call(server, 'get', '/fleet/inspections/INS-00004', { as: 'FLT001' }))
      .data.data as { items: { itemNo: string; label: string }[]; recheckItemNos: string[] }
    expect(report.items.find((item) => item.itemNo === 'VH-02')?.label).toBe(
      'Direction et timonerie'
    )
    expect(report.recheckItemNos).toEqual(['VH-02', 'CT-02'])
  })
})
