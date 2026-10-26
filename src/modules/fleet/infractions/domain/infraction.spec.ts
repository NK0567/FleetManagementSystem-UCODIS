import { describe, expect, it } from 'vitest'
import { infractionStatus, isDuplicate, isUpheld, triggersTraining } from './infraction'

describe('infractionStatus', () => {
  it('follows the handling', () => {
    expect(infractionStatus({ handlerCode: null, outcome: null })).toBe('new')
    expect(infractionStatus({ handlerCode: 'FLT001', outcome: null })).toBe('in_progress')
    expect(infractionStatus({ handlerCode: 'FLT001', outcome: 'warning' })).toBe('closed')
  })
})

describe('outcomes', () => {
  it('hold the infraction against the driver unless dismissed', () => {
    expect(isUpheld('warning')).toBe(true)
    expect(isUpheld('dismissed')).toBe(false)
    expect(isUpheld(null)).toBe(false)
  })

  it('send the driver to a training only for the training outcome', () => {
    expect(triggersTraining('training')).toBe(true)
    expect(triggersTraining('sanction')).toBe(false)
  })
})

describe('isDuplicate', () => {
  const speeding = {
    vehicleNo: 'VEH-001',
    infractionTypeNo: 'SPEED',
    occurredAt: '2026-09-01T10:00:00'
  }

  it('treats the same type on the same vehicle within ten minutes as one infraction', () => {
    expect(isDuplicate(speeding, { ...speeding, occurredAt: '2026-09-01T10:09:00' })).toBe(true)
    expect(isDuplicate(speeding, { ...speeding, occurredAt: '2026-09-01T10:10:00' })).toBe(false)
    expect(isDuplicate(speeding, { ...speeding, vehicleNo: 'VEH-002' })).toBe(false)
    expect(isDuplicate(speeding, { ...speeding, infractionTypeNo: 'PHONE' })).toBe(false)
  })
})
