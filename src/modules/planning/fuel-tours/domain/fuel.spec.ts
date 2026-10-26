import { describe, expect, it } from 'vitest'
import {
  emptyMeasureIssue,
  fuelTourState,
  planCovers,
  planIssue,
  receivedLitres,
  volumeAt15,
  type PlanSlot
} from './fuel'

const slot = (values: Partial<PlanSlot>): PlanSlot => ({
  vehicleNo: 'VEH-021',
  compartmentNo: 1,
  capacityL: 12000,
  productNo: 'PRD-006',
  volumeL: 10000,
  deliveryRequestNo: 'DL-1',
  requestProductNo: 'PRD-006',
  requestQuantity: 10000,
  ...values
})

describe('fuel distribution', () => {
  it('keeps a typed volume at 15 °C and otherwise applies the expansion coefficient', () => {
    const measured = { volumeL: 10000, temperature: 25, volume15: null, emptyReason: '' }
    expect(volumeAt15(measured, 'coefficient', 0.0008)).toBe(9920)
    expect(volumeAt15({ ...measured, volume15: 9900 }, 'coefficient', 0.0008)).toBe(9900)
    expect(volumeAt15(measured, 'typed', 0.0008)).toBeNull()
    expect(volumeAt15(measured, 'coefficient', null)).toBeNull()
    expect(receivedLitres([measured], 'coefficient', 0.0008)).toBe(9920)
    expect(receivedLitres([measured], 'typed', 0.0008)).toBe(10000)
    expect(
      emptyMeasureIssue({ volumeL: 0, temperature: null, volume15: null, emptyReason: '' })
    ).toBe(true)
  })

  it('keeps a compartment within its capacity and the request within its quantity', () => {
    expect(planIssue([slot({})])).toBeNull()
    expect(planIssue([slot({ productNo: 'PRD-007' })])).toBe('product')
    expect(planIssue([slot({ volumeL: 13000 })])).toBe('capacity')
    expect(planIssue([slot({ volumeL: 6000 }), slot({ compartmentNo: 2, volumeL: 5000 })])).toBe(
      'over_order'
    )
    expect(planIssue([slot({}), slot({})])).toBe('duplicate')
    expect(planCovers([slot({})], [{ no: 'DL-1', quantity: 10000 }])).toBe(true)
    expect(planCovers([slot({ volumeL: 9000 })], [{ no: 'DL-1', quantity: 10000 }])).toBe(false)
  })
})

describe('fuel tour state', () => {
  it('reads cancelled before validated', () => {
    expect(fuelTourState({ validatedAt: null, cancelledAt: null })).toBe('draft')
    expect(fuelTourState({ validatedAt: '2026-09-04T10:00:00', cancelledAt: null })).toBe(
      'validated'
    )
    expect(fuelTourState({ validatedAt: '2026-09-04T10:00:00', cancelledAt: '2026-09-05' })).toBe(
      'cancelled'
    )
  })
})
