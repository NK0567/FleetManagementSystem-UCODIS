import { describe, expect, it } from 'vitest'
import { modelCode, modelLabel, operationIssues } from './maintenancePlan'

describe('operationIssues', () => {
  const operation = {
    label: 'Vidange',
    subsystemNo: 'ENGINE',
    intervalKm: 10_000,
    intervalHours: null,
    intervalDays: null
  }

  it('accepts an operation with a label, a subsystem and one interval', () => {
    expect(operationIssues(operation)).toEqual([])
    expect(operationIssues({ ...operation, intervalKm: null, intervalDays: 180 })).toEqual([])
    expect(operationIssues({ ...operation, intervalKm: null, intervalHours: 500 })).toEqual([])
  })

  it('asks for at least one positive interval', () => {
    expect(operationIssues({ ...operation, intervalKm: null })).toEqual(['interval'])
    expect(operationIssues({ ...operation, intervalKm: 0 })).toEqual(['intervalPositive'])
    expect(operationIssues({ ...operation, intervalHours: -2 })).toEqual(['intervalPositive'])
    expect(operationIssues({ ...operation, label: ' ', subsystemNo: '' })).toEqual([
      'label',
      'subsystem'
    ])
  })
})

describe('modelCode', () => {
  it('joins the make and the model, and reads back as a name', () => {
    const code = modelCode({ make: 'Sinotruk', model: 'Howo A7' })
    expect(code).toBe('Sinotruk|Howo A7')
    expect(modelLabel(code)).toBe('Sinotruk Howo A7')
  })
})
