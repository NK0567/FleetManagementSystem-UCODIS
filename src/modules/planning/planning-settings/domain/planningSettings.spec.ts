import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLANNING_SETTINGS,
  PLANNING_SETTINGS_SECTIONS,
  planningSettingsIssues
} from './planningSettings'

describe('planning settings', () => {
  it('ship valid defaults', () => {
    for (const section of PLANNING_SETTINGS_SECTIONS) {
      const values = { ...DEFAULT_PLANNING_SETTINGS[section] }
      expect(planningSettingsIssues(section, values)).toEqual([])
    }
  })

  it('cap the average speed and keep the tacit delay optional', () => {
    const schedule = { defaultDepartureTime: '07:00', averageSpeedKmh: 150, lateMarginMin: 30 }
    expect(planningSettingsIssues('schedule', schedule)).toEqual([
      { field: 'averageSpeedKmh', code: 'outOfRange', min: 1, max: 130 }
    ])
    expect(planningSettingsIssues('confirmation', { tacitConfirmationDays: null })).toEqual([])
  })

  it('refuse an empty counting unit and an unknown freight payer', () => {
    expect(planningSettingsIssues('goods', { countingUnit: '', prefillQuantities: true })).toEqual([
      { field: 'countingUnit', code: 'required' }
    ])
    const billing = { defaultFreightPayer: 'carrier', carrierInvoiceToleranceAmount: 0 }
    expect(planningSettingsIssues('billing', billing)).toEqual([
      { field: 'defaultFreightPayer', code: 'invalidChoice' }
    ])
  })
})
