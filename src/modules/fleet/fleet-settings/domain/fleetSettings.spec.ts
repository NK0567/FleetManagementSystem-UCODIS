import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FLEET_SETTINGS,
  isFleetSettingsSection,
  settingsSectionIssues,
  timeToMinutes
} from './fleetSettings'

const drivingTime = DEFAULT_FLEET_SETTINGS.drivingTime

describe('timeToMinutes', () => {
  it('reads HH:MM times', () => {
    expect(timeToMinutes('05:00')).toBe(300)
    expect(timeToMinutes('7:30')).toBe(450)
  })

  it('rejects impossible times', () => {
    expect(timeToMinutes('24:00')).toBeNull()
    expect(timeToMinutes('12:60')).toBeNull()
    expect(timeToMinutes('noon')).toBeNull()
  })
})

describe('settingsSectionIssues', () => {
  it('accepts the default settings', () => {
    expect(settingsSectionIssues('drivingTime', drivingTime)).toEqual([])
    expect(settingsSectionIssues('geofencing', DEFAULT_FLEET_SETTINGS.geofencing)).toEqual([])
    expect(settingsSectionIssues('documents', DEFAULT_FLEET_SETTINGS.documents)).toEqual([])
  })

  it('rejects a value outside its bounds instead of keeping it', () => {
    expect(settingsSectionIssues('geofencing', { defaultSiteRadiusM: 50 })).toEqual([
      { field: 'defaultSiteRadiusM', code: 'outOfRange', min: 200, max: 20_000 }
    ])
  })

  it('requires the mandatory thresholds but not the optional fortnight cap', () => {
    const issues = settingsSectionIssues('drivingTime', {
      ...drivingTime,
      dailyDrivingMaxMin: null as unknown as number,
      fortnightDrivingMaxH: null
    })
    expect(issues).toEqual([{ field: 'dailyDrivingMaxMin', code: 'required' }])
  })

  it('allows night driving when both bounds are empty', () => {
    expect(
      settingsSectionIssues('drivingTime', { ...drivingTime, nightBanStart: '', nightBanEnd: '' })
    ).toEqual([])
  })

  it('refuses a night window with a single bound or no duration', () => {
    expect(settingsSectionIssues('drivingTime', { ...drivingTime, nightBanEnd: '' })).toEqual([
      { field: 'nightBanEnd', code: 'nightWindowIncomplete' }
    ])
    expect(
      settingsSectionIssues('drivingTime', {
        ...drivingTime,
        nightBanStart: '22:00',
        nightBanEnd: '22:00'
      })
    ).toEqual([{ field: 'nightBanEnd', code: 'nightWindowEmpty' }])
  })

  it('knows the sections it can validate', () => {
    expect(isFleetSettingsSection('documents')).toBe(true)
    expect(isFleetSettingsSection('fuel')).toBe(false)
  })
})
