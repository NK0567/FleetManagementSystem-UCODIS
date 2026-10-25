import { describe, expect, it } from 'vitest'
import {
  diagnosisGaps,
  downtimeRoleOf,
  fourEyesBlock,
  immobilizesOnDeclaration,
  isAtExternalWorkshop,
  labourHours,
  subcontractingCost,
  workOrderStatus
} from './workOrder'

const blank = {
  diagnosedAt: null,
  startedAt: null,
  completedAt: null,
  validatedAt: null,
  cancelledAt: null
}

describe('workOrderStatus', () => {
  it('follows the life of the order', () => {
    expect(workOrderStatus(blank)).toBe('open')
    expect(workOrderStatus({ ...blank, diagnosedAt: 'd' })).toBe('diagnosed')
    expect(workOrderStatus({ ...blank, diagnosedAt: 'd', startedAt: 's' })).toBe('in_progress')
    expect(workOrderStatus({ ...blank, startedAt: 's', completedAt: 'c' })).toBe(
      'awaiting_validation'
    )
    expect(workOrderStatus({ ...blank, completedAt: 'c', validatedAt: 'v' })).toBe('closed')
    expect(workOrderStatus({ ...blank, startedAt: 's', cancelledAt: 'x' })).toBe('cancelled')
  })
})

describe('immobilization', () => {
  it('stops the vehicle at once only for a serious breakdown', () => {
    expect(immobilizesOnDeclaration({ maintenanceType: 'corrective', severity: 'critical' })).toBe(
      true
    )
    expect(immobilizesOnDeclaration({ maintenanceType: 'corrective', severity: 'minor' })).toBe(
      false
    )
    expect(immobilizesOnDeclaration({ maintenanceType: 'preventive', severity: 'major' })).toBe(
      false
    )
  })

  it('names the downtime after what happened', () => {
    expect(downtimeRoleOf({ maintenanceType: 'corrective', origin: 'claim' })).toBe('accident')
    expect(downtimeRoleOf({ maintenanceType: 'preventive', origin: 'preventive' })).toBe(
      'preventive'
    )
    expect(downtimeRoleOf({ maintenanceType: 'corrective', origin: 'driver_report' })).toBe(
      'breakdown'
    )
  })
})

describe('diagnosisGaps', () => {
  it('asks a breakdown for how and why it failed, a service only for what was serviced', () => {
    const empty = { subsystemNo: null, modeNo: null, causeNo: null }
    expect(diagnosisGaps('corrective', empty)).toEqual(['subsystem', 'mode', 'cause'])
    expect(diagnosisGaps('preventive', { ...empty, subsystemNo: 'ENGINE' })).toEqual([])
  })
})

describe('fourEyesBlock', () => {
  const order = {
    completedBy: 'MNT001',
    labour: [{ technicianNo: 'UCT-008', loggedBy: 'MNT001' }]
  }

  it('keeps the validation away from whoever finished or did the work', () => {
    expect(fourEyesBlock({ code: 'MNT001', employeeNo: 'UCT-003' }, order)).toBe('completedBy')
    expect(fourEyesBlock({ code: 'TEC002', employeeNo: 'UCT-008' }, order)).toBe('technician')
    expect(fourEyesBlock({ code: 'FLT001', employeeNo: null }, order)).toBeNull()
  })
})

describe('labourHours', () => {
  it('adds the logged hours', () => {
    expect(labourHours([{ hours: 2.5 }, { hours: 1.25 }])).toBe(3.75)
  })
})

describe('external workshop', () => {
  const external = { quoteAmount: 400, finalAmount: null, returnedAt: null }

  it('is at the garage until the vehicle is back', () => {
    expect(isAtExternalWorkshop({ external: null })).toBe(false)
    expect(isAtExternalWorkshop({ external })).toBe(true)
    expect(isAtExternalWorkshop({ external: { returnedAt: '2026-09-01T10:00' } })).toBe(false)
  })

  it('costs the final invoice once known, else the quote', () => {
    expect(subcontractingCost(null)).toBe(0)
    expect(subcontractingCost(external)).toBe(400)
    expect(subcontractingCost({ ...external, finalAmount: 450 })).toBe(450)
    expect(subcontractingCost({ quoteAmount: null, finalAmount: null })).toBe(0)
  })
})
