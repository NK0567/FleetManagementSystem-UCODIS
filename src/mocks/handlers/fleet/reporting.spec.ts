import { beforeEach, describe, expect, it } from 'vitest'
import type {
  FleetStatusApi,
  FleetStatusDay,
  FleetStatusDispatchApi
} from '@/modules/fleet/fleet-status/types/fleetStatus.types'
import type { FleetReportApi, ReportSection } from '@/modules/fleet/reports/types/fleetReport.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = (path: string, query: Record<string, unknown> = {}, as = 'FLT001') =>
  call(server, 'get', path, { as, query, language: 'fr' })

const PERIOD = { from: '2026-08-01', to: '2026-09-04' }

async function report(kind: string, query: Record<string, unknown> = PERIOD, as = 'FLT001') {
  return (await get(`/fleet/reports/${kind}`, query, as)).data.data as FleetReportApi
}

const section = (data: FleetReportApi, key: string) =>
  data.sections.find((item) => item.key === key) as ReportSection

describe('summary compared between periods and sites', () => {
  it('sets the indicators of the previous period beside those of the period', async () => {
    const data = await report('summary', {
      from: '2026-08-16',
      to: '2026-08-31',
      compare: 'previous'
    })
    expect(data.comparison).toMatchObject({ from: '2026-07-31', to: '2026-08-15' })
    const indicators = section(data, 'indicators')
    expect(indicators.columns.map((column) => column.key)).toEqual([
      'indicator',
      'value',
      'compareValue',
      'gap'
    ])
    const trips = indicators.rows.find((row) => row.indicator === 'tripsFinished')
    expect(trips).toMatchObject({ value: 4, compareValue: 1, gap: 3 })
  })

  it('compares two sites over the same period', async () => {
    const data = await report('summary', { ...PERIOD, compare: 'site', compareSiteNo: 'ENT-TOA' })
    expect(data.comparison).toMatchObject({ siteNo: 'ENT-TOA', siteName: 'Entrepôt Toamasina' })
    const trips = section(data, 'indicators').rows.find((row) => row.indicator === 'tripsFinished')
    expect(trips).toMatchObject({ value: 5, compareValue: 0, gap: 5 })
  })

  it('compares with another period given by its two dates', async () => {
    const data = await report('summary', {
      ...PERIOD,
      compare: 'period',
      compareFrom: '2026-08-20',
      compareTo: '2026-08-22'
    })
    const trips = section(data, 'indicators').rows.find((row) => row.indicator === 'tripsFinished')
    expect(trips?.compareValue).toBe(2)
  })

  it('refuses a comparison left incomplete or unknown', async () => {
    expect((await get('/fleet/reports/summary', { ...PERIOD, compare: 'period' })).status).toBe(422)
    expect(
      (
        await get('/fleet/reports/summary', {
          ...PERIOD,
          compare: 'period',
          compareFrom: '2026-08-22',
          compareTo: '2026-08-20'
        })
      ).status
    ).toBe(422)
    expect((await get('/fleet/reports/summary', { ...PERIOD, compare: 'weather' })).status).toBe(
      422
    )
  })

  it('gives the average age of the fleet and stays without comparison by default', async () => {
    const data = await report('summary')
    expect(data.comparison).toBeNull()
    const age = section(data, 'indicators').rows.find((row) => row.indicator === 'averageFleetAge')
    expect(age).toMatchObject({ unit: 'years' })
    expect(Number(age?.value)).toBeGreaterThan(0)
  })

  it('is read by the director and not by a planner', async () => {
    expect((await get('/fleet/reports/summary', PERIOD, 'DIR001')).status).toBe(200)
    expect((await get('/fleet/reports/summary', PERIOD, 'PLN001')).status).toBe(403)
  })
})

describe('fuel and tyres', () => {
  it('spend the fuel by vehicle, by driver and by month, with the anomalies', async () => {
    const data = await report('fuel')
    const byVehicle = section(data, 'byVehicle')
    const byDriver = section(data, 'byDriver')
    const total = (rows: ReportSection['rows'], key: string) =>
      rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)
    expect(byDriver.rows.length).toBeGreaterThan(0)
    expect(total(byDriver.rows, 'amount')).toBe(total(byVehicle.rows, 'amount'))
    expect(total(byDriver.rows, 'anomalies')).toBe(total(byVehicle.rows, 'anomalies'))
  })

  it('compare the tyres by make and by supplier on cost per km and life', async () => {
    const data = await report('fuel')
    const byMake = section(data, 'tyresByMake')
    const bySupplier = section(data, 'tyresBySupplier')
    expect(byMake.columns.map((column) => column.key)).toEqual([
      'make',
      'tyres',
      'tyreCost',
      'tyreKm',
      'costPerKm',
      'scrapped',
      'averageLifeKm'
    ])
    expect(byMake.rows.length).toBeGreaterThan(0)
    const count = (rows: ReportSection['rows']) =>
      rows.reduce((sum, row) => sum + Number(row.tyres), 0)
    expect(count(byMake.rows)).toBe(count(bySupplier.rows))
    for (const row of byMake.rows) {
      if (row.tyreKm) {
        expect(row.costPerKm).toBeCloseTo(Number(row.tyreCost) / Number(row.tyreKm), 1)
      }
    }
  })
})

describe('drivers dashboard', () => {
  it('groups the performance by week or by day', async () => {
    const weekly = await report('drivers', { ...PERIOD, groupBy: 'week' })
    const byWeek = section(weekly, 'performanceByWeek')
    expect(byWeek.rows.length).toBeGreaterThan(0)
    // Every week starts on a Monday.
    expect(
      byWeek.rows.every((row) => new Date(`${String(row.weekOf)}T12:00:00`).getDay() === 1)
    ).toBe(true)
    const daily = await report('drivers', { ...PERIOD, groupBy: 'day' })
    const byDay = section(daily, 'performanceByDay')
    const trips = (rows: ReportSection['rows']) =>
      rows.reduce((sum, row) => sum + Number(row.trips), 0)
    expect(trips(byDay.rows)).toBe(trips(byWeek.rows))
  })

  it('lists the documents coming due, the current assignments and the alerts', async () => {
    const data = await report('drivers')
    expect(section(data, 'assignments').rows.length).toBeGreaterThan(0)
    expect(section(data, 'documentsDue').columns.map((column) => column.key)).toEqual([
      'driverName',
      'documentTypeName',
      'expiryDate',
      'state'
    ])
    expect(section(data, 'alerts')).toBeDefined()
  })
})

describe('fleet status sent by e-mail', () => {
  const send = (body: unknown, as = 'FLT001') =>
    call(server, 'post', '/fleet/fleet-status/send', { as, body, language: 'fr' })

  it('records the sending, archives the day and lists it', async () => {
    const sent = await send({ recipients: 'direction@ucodis.mg; Client@Exemple.com' })
    expect(sent.status).toBe(200)
    expect(sent.data.data).toMatchObject({
      date: '2026-09-04',
      recipients: ['direction@ucodis.mg', 'client@exemple.com'],
      subject: 'État de flotte du 04/09/2026',
      sentBy: 'FLT001'
    })
    const days = (await get('/fleet/fleet-status/days')).data.data as FleetStatusDay[]
    expect(days[0]?.archivedAt).not.toBeNull()
    const list = (await get('/fleet/fleet-status/dispatches')).data.data as FleetStatusDispatchApi[]
    expect(list).toHaveLength(1)
    expect(list[0]?.lineCount).toBeGreaterThan(0)
  })

  it('refuses no recipient, a wrong address and an unknown day', async () => {
    expect((await send({ recipients: '' })).status).toBe(422)
    expect((await send({ recipients: ['direction'] })).status).toBe(422)
    expect((await send({ recipients: ['a@b.mg'], date: '2026-08-01' })).status).toBe(404)
    expect(((await get('/fleet/fleet-status/dispatches')).data.data as unknown[]).length).toBe(0)
  })

  it('is sent by the fleet managers only', async () => {
    expect((await send({ recipients: ['a@b.mg'] }, 'DIR001')).status).toBe(403)
    expect((await send({ recipients: ['a@b.mg'] }, 'MNT001')).status).toBe(403)
    expect((await get('/fleet/fleet-status/dispatches', {}, 'DIR001')).status).toBe(200)
  })

  it('gives each line its position, status and mission', async () => {
    const response = await get('/fleet/fleet-status', { pageSize: 100 })
    const lines = (response.data.data as { items: FleetStatusApi[] }).items
    const onRoad = lines.find((line) => line.no === 'VEH-003')
    expect(onRoad?.position).toMatch(/^-?\d+\.\d{4}, -?\d+\.\d{4}$|\w/)
    expect(onRoad?.mission).not.toBe('')
    expect(lines.find((line) => line.no === 'VEH-001')?.position).toBe('Dépôt Tanjombato')
  })
})
