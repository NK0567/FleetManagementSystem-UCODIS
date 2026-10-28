import { describe, expect, it } from 'vitest'
import { anchoredDropdownStyle, computeAnchoredDropdownPosition } from './anchoredDropdownPosition'

describe('computeAnchoredDropdownPosition', () => {
  it('opens below when there is enough space under the trigger', () => {
    const pos = computeAnchoredDropdownPosition({
      triggerRect: { top: 100, bottom: 130, left: 40, width: 200 },
      estimatedHeight: 260,
      viewportWidth: 1000,
      viewportHeight: 800
    })
    expect(pos.placement).toBe('below')
    expect(pos.top).toBe(134)
    expect(pos.bottom).toBeUndefined()
    expect(pos.width).toBe(280)
    expect(pos.left).toBe(40)
  })

  it('opens above when space below is tight and space above is larger', () => {
    const pos = computeAnchoredDropdownPosition({
      triggerRect: { top: 700, bottom: 730, left: 40, width: 200 },
      estimatedHeight: 260,
      viewportWidth: 1000,
      viewportHeight: 800
    })
    expect(pos.placement).toBe('above')
    expect(pos.bottom).toBe(800 - 700 + 4)
    expect(pos.top).toBeUndefined()
    expect(pos.maxHeight).toBeLessThanOrEqual(700 - 4 - 8)
  })

  it('clamps left so the panel stays in the viewport', () => {
    const pos = computeAnchoredDropdownPosition({
      triggerRect: { top: 100, bottom: 130, left: 900, width: 200 },
      estimatedHeight: 200,
      minWidth: 280,
      viewportWidth: 1000,
      viewportHeight: 800
    })
    expect(pos.left).toBe(1000 - 280 - 8)
  })
})

describe('anchoredDropdownStyle', () => {
  it('sets top for below and bottom for above', () => {
    expect(
      anchoredDropdownStyle({
        top: 140,
        left: 10,
        width: 280,
        maxHeight: 220,
        placement: 'below'
      })
    ).toMatchObject({ top: '140px', bottom: 'auto' })

    expect(
      anchoredDropdownStyle({
        bottom: 120,
        left: 10,
        width: 280,
        maxHeight: 220,
        placement: 'above'
      })
    ).toMatchObject({ top: 'auto', bottom: '120px' })
  })
})
