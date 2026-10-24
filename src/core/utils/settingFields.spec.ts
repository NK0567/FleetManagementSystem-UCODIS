import { describe, expect, it } from 'vitest'
import { settingFieldIssues, timeToMinutes, type SettingField } from './settingFields'

const fields: SettingField[] = [
  { key: 'stations', kind: 'number', unit: 'count', min: 1, max: 20 },
  { key: 'cap', kind: 'optionalNumber', unit: 'amount', min: 0, max: 100 },
  { key: 'opensAt', kind: 'time' }
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
})

describe('timeToMinutes', () => {
  it('reads HH:MM', () => {
    expect(timeToMinutes('05:00')).toBe(300)
    expect(timeToMinutes('24:00')).toBeNull()
  })
})
