import { describe, expect, it } from 'vitest'
import { operationIssues } from './maintenancePlan'

describe('operationIssues', () => {
  const operation = {
    label: 'Vidange',
    subsystemNo: 'ENGINE',
    intervalKm: 10_000,
    intervalDays: null
  }

  it('accepts an operation with a label, a subsystem and one interval', () => {
    expect(operationIssues(operation)).toEqual([])
    expect(operationIssues({ ...operation, intervalKm: null, intervalDays: 180 })).toEqual([])
  })

  it('asks for at least one positive interval', () => {
    expect(operationIssues({ ...operation, intervalKm: null })).toEqual(['interval'])
    expect(operationIssues({ ...operation, intervalKm: 0 })).toEqual(['intervalPositive'])
    expect(operationIssues({ ...operation, label: ' ', subsystemNo: '' })).toEqual([
      'label',
      'subsystem'
    ])
  })
})
