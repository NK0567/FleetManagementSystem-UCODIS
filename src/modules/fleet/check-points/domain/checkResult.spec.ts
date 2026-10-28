import { describe, expect, it } from 'vitest'
import { blockingAnomalies, checkIssues, type CheckResult } from './checkResult'

const point = (pointNo: string, result: CheckResult['result'], comment = '', blocking = false) => ({
  pointNo,
  label: pointNo,
  blocking,
  result,
  comment
})

describe('checkIssues', () => {
  it('needs every point answered and every anomaly explained', () => {
    expect(checkIssues([point('FRS', 'ok'), point('KLX', 'na')])).toEqual([])
    expect(checkIssues([point('FRS', null)])).toEqual(['incomplete'])
    expect(checkIssues([point('FRS', 'anomaly', '  ')])).toEqual(['commentRequired'])
  })
})

describe('blockingAnomalies', () => {
  it('keeps only anomalies on blocking points', () => {
    const results = [
      point('FRS', 'anomaly', 'Usure', true),
      point('KLX', 'anomaly', 'Faible'),
      point('DIR', 'ok', '', true)
    ]
    expect(blockingAnomalies(results).map((item) => item.pointNo)).toEqual(['FRS'])
  })
})
