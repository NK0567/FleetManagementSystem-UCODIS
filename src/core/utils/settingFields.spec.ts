import { describe, expect, it } from 'vitest'
import { settingFieldIssues, timeToMinutes, type SettingField } from './settingFields'

const fields: SettingField[] = [
  { key: 'stations', kind: 'number', unit: 'count', min: 1, max: 20 },
  { key: 'cap', kind: 'optionalNumber', unit: 'amount', min: 0, max: 100 },
  { key: 'opensAt', kind: 'time' }
]

const otherFields: SettingField[] = [
  { key: 'unit', kind: 'text', maxLength: 5 },
  { key: 'strict', kind: 'boolean' },
  { key: 'payer', kind: 'choice', optionsKey: 'payer', values: ['orderer', 'recipient'] }
]

describe('settingFieldIssues', () => {
  it('requires numbers, bounds them, leaves optional ones empty and checks times', () => {
    expect(settingFieldIssues(fields, { stations: 2, cap: null, opensAt: '07:30' })).toEqual([])
    expect(settingFieldIssues(fields, { stations: '', cap: 150, opensAt: '25:00' })).toEqual([
      { field: 'stations', code: 'required' },
      { field: 'cap', code: 'outOfRange', min: 0, max: 100 },
      { field: 'opensAt', code: 'invalidTime' }
    ])
  })

  it('requires texts within their length and choices among their values', () => {
    expect(
      settingFieldIssues(otherFields, { unit: 'box', strict: true, payer: 'orderer' })
    ).toEqual([])
    expect(settingFieldIssues(otherFields, { unit: ' ', strict: false, payer: 'x' })).toEqual([
      { field: 'unit', code: 'required' },
      { field: 'payer', code: 'invalidChoice' }
    ])
    expect(settingFieldIssues(otherFields, { unit: 'pallets', payer: 'recipient' })).toEqual([
      { field: 'unit', code: 'tooLong', max: 5 }
    ])
  })
})

describe('timeToMinutes', () => {
  it('reads HH:MM', () => {
    expect(timeToMinutes('05:00')).toBe(300)
    expect(timeToMinutes('24:00')).toBeNull()
  })
})
