import { describe, expect, it } from 'vitest'
import { equipmentDueState } from './equipment'

describe('equipmentDueState', () => {
  it('uses the notice of the equipment type', () => {
    expect(equipmentDueState('2026-09-20', 30, '2026-09-04')).toBe('due_soon')
    expect(equipmentDueState('2026-09-20', 10, '2026-09-04')).toBe('ok')
  })

  it('is overdue the day after the due date', () => {
    expect(equipmentDueState('2026-09-04', 30, '2026-09-04')).toBe('due_soon')
    expect(equipmentDueState('2026-09-03', 30, '2026-09-04')).toBe('overdue')
  })

  it('has no state without a due date', () => {
    expect(equipmentDueState(null, 30, '2026-09-04')).toBeNull()
  })
})
