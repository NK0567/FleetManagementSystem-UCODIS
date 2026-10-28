import { describe, expect, it } from 'vitest'
import { blockingAnomalies, vehicleCheckOutcome } from './vehicleCheck'

const point = (pointNo: string, blocking: boolean, result: 'ok' | 'anomaly') => ({
  pointNo,
  label: pointNo,
  blocking,
  result
})

describe('vehicle check outcome', () => {
  it('blocks on a blocking anomaly and only flags the others', () => {
    expect(vehicleCheckOutcome([point('FRN', true, 'ok'), point('TAB', false, 'ok')])).toBe('ok')
    expect(vehicleCheckOutcome([point('FRN', true, 'ok'), point('TAB', false, 'anomaly')])).toBe(
      'anomaly'
    )
    const results = [point('FRN', true, 'anomaly'), point('TAB', false, 'anomaly')]
    expect(vehicleCheckOutcome(results)).toBe('blocking')
    expect(blockingAnomalies(results).map((item) => item.pointNo)).toEqual(['FRN'])
  })
})
