import { beforeEach, describe, expect, it } from 'vitest'
import type { FleetDashboardApi } from '@/modules/fleet/dashboard/types/fleetDashboard.types'
import type { FleetReportApi } from '@/modules/fleet/reports/types/fleetReport.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const get = (path: string, query?: Record<string, string>, as = 'FLT001') =>
  call(server, 'get', path, { as, query, language: 'en' })

const PERIOD = { from: '2026-08-01', to: '2026-09-04' }

async function report(kind: string, query: Record<string, string> = PERIOD) {
  return (await get(`/fleet/reports/${kind}`, query)).data.data as FleetReportApi
}

const indicator = (summary: FleetReportApi, key: string) =>
  summary.sections[0]?.rows.find((row) => row.indicator === key)?.value

describe('fleet dashboard', () => {
  it('counts what is ready, what is moving and what is stuck', async () => {
    const dashboard = (await get('/fleet/dashboard')).data.data as FleetDashboardApi
    expect(dashboard.availability.tractors).toEqual({ available: 7, total: 10 })
    expect(dashboard.movement).toMatchObject({ moving: 1, immobilized: 1, signal_lost: 0 })
    expect(dashboard.immobilized.map((vehicle) => vehicle.vehicleNo)).toEqual([
      'VEH-005',
      'VEH-009',
      'VEH-022',
      'VEH-024'
    ])
    expect(dashboard.latestAlerts).toHaveLength(8)
    expect(dashboard.latestAlerts.every((alert) => alert.severity === 'critical')).toBe(true)
    expect(dashboard.compliance).toEqual({
      tripComplianceRate: 80,
      openInfractions: 3,
      driversBelowScore: 0
    })
  })
})

describe('fleet reports', () => {
  it('sum the period with the same formulas as the screens', async () => {
    const summary = await report('summary')
    expect(indicator(summary, 'tripsFinished')).toBe(5)
    expect(indicator(summary, 'kmDriven')).toBe(2049)
    expect(indicator(summary, 'tripComplianceRate')).toBe(80)
    expect(indicator(summary, 'averageL100')).toBe(35.7)
    const fuel = await report('fuel')
    const months = fuel.sections.find((section) => section.key === 'byMonth')?.rows ?? []
    expect(months.reduce((total, row) => total + Number(row.liters), 0)).toBe(
      indicator(summary, 'fuelLiters')
    )
  })

  it('narrow to the vehicles and staff of a site', async () => {
    const summary = await report('summary', { ...PERIOD, siteNo: 'ENT-TOA' })
    expect(summary.siteName).toBe('Entrepôt Toamasina')
    expect(indicator(summary, 'tripsFinished')).toBe(0)
    expect(indicator(summary, 'fuelLiters')).toBe(0)
  })

  it('default to the current month and refuse a period upside down', async () => {
    const defaults = await report('drivers', {})
    expect(defaults).toMatchObject({ from: '2026-09-01', to: '2026-09-04' })
    expect(
      (await get('/fleet/reports/audit', { from: '2026-09-04', to: '2026-09-01' })).status
    ).toBe(422)
    expect((await get('/fleet/reports/weather')).status).toBe(404)
  })

  it('list what an audit must look at', async () => {
    const audit = await report('audit')
    const rows = (key: string) => audit.sections.find((section) => section.key === key)?.rows ?? []
    expect(rows('documents').some((row) => row.state === 'missing')).toBe(true)
    expect(rows('deviations')).toEqual([
      expect.objectContaining({ tripNo: 'TRP-00003', deviationTypeName: expect.any(String) })
    ])
  })

  it('stay closed to profiles without the report right', async () => {
    expect((await get('/fleet/reports/summary', PERIOD, 'CND001')).status).toBe(403)
  })
})
