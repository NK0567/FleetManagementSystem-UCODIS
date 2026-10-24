import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAINTENANCE_SETTINGS,
  MAINTENANCE_SETTINGS_SECTIONS,
  maintenanceSettingsIssues
} from './maintenanceSettings'

describe('maintenance settings', () => {
  it('ship valid defaults', () => {
    for (const section of MAINTENANCE_SETTINGS_SECTIONS) {
      const values = { ...DEFAULT_MAINTENANCE_SETTINGS[section] }
      expect(maintenanceSettingsIssues(section, values)).toEqual([])
    }
  })

  it('keep the optional day costs optional and bound the others', () => {
    expect(maintenanceSettingsIssues('downtimeCost', { dayCost: null })).toEqual([
      { field: 'dayCost', code: 'required' }
    ])
    const workshop = { stations: 2, hoursPerDay: 30, workingDaysPerWeek: 6 }
    expect(maintenanceSettingsIssues('workshop', workshop)).toEqual([
      { field: 'hoursPerDay', code: 'outOfRange', min: 1, max: 24 }
    ])
  })
})
