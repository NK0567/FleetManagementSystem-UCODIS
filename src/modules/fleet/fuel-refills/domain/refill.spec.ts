import { describe, expect, it } from 'vitest'
import { hourInWindow, isDuplicateRefill, refillChecks, refillStatus } from './refill'

const facts = {
  liters: 320,
  tankCapacityL: 500,
  odometerKm: 181_000,
  previousOdometerKm: 180_100,
  driverNo: 'UCT-010',
  expectedDriverNos: ['UCT-010'],
  hour: 9,
  startHour: 4,
  endHour: 20,
  gpsGapKm: 0.4,
  gpsGapMaxKm: 2
}

describe('refillChecks', () => {
  it('passes a refill that fits the tank, the odometer, the driver, the hours and the place', () => {
    expect(Object.values(refillChecks(facts)).every(Boolean)).toBe(true)
  })

  it('flags each failed check', () => {
    expect(refillChecks({ ...facts, liters: 545 }).tank).toBe(false)
    expect(refillChecks({ ...facts, odometerKm: 180_000 }).odometer).toBe(false)
    expect(refillChecks({ ...facts, driverNo: 'UCT-099' }).driver).toBe(false)
    expect(refillChecks({ ...facts, driverNo: null }).driver).toBe(false)
    expect(refillChecks({ ...facts, hour: 2 }).hours).toBe(false)
    expect(refillChecks({ ...facts, gpsGapKm: 4.2 }).gps).toBe(false)
  })

  it('skips what cannot be checked', () => {
    const unknown = { ...facts, tankCapacityL: null, previousOdometerKm: null, gpsGapKm: null }
    expect(refillChecks({ ...unknown, liters: 900, odometerKm: 1 })).toMatchObject({
      tank: true,
      odometer: true,
      gps: true
    })
  })
})

describe('hourInWindow', () => {
  it('handles a window running past midnight', () => {
    expect(hourInWindow(23, 20, 4)).toBe(true)
    expect(hourInWindow(3, 20, 4)).toBe(true)
    expect(hourInWindow(12, 20, 4)).toBe(false)
  })
})

describe('refillStatus', () => {
  it('keeps an anomaly until it is qualified', () => {
    const failed = refillChecks({ ...facts, hour: 2 })
    expect(refillStatus(failed, false)).toBe('anomaly')
    expect(refillStatus(failed, true)).toBe('qualified')
    expect(refillStatus(refillChecks(facts), false)).toBe('valid')
  })
})

describe('isDuplicateRefill', () => {
  it('treats the same volume in the same vehicle within ten minutes as one refill', () => {
    const refill = { vehicleNo: 'VEH-001', liters: 320, refueledAt: '2026-09-01T08:00:00' }
    expect(isDuplicateRefill(refill, { ...refill, refueledAt: '2026-09-01T08:09:00' })).toBe(true)
    expect(isDuplicateRefill(refill, { ...refill, liters: 321 })).toBe(false)
  })
})
