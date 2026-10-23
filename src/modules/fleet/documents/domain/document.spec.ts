import { describe, expect, it } from 'vitest'
import {
  appliesToPerson,
  appliesToVehicle
} from '@/modules/fleet/document-types/domain/documentType'
import {
  complianceGaps,
  documentIssues,
  documentState,
  noticeDaysOf,
  suggestedExpiry
} from './document'

const today = '2026-09-04'

describe('documentState', () => {
  const doc = (expiryDate: string | null) => ({ expiryDate, declaredStatus: null })

  it('is valid until the notice starts, then expiring, then expired', () => {
    expect(documentState(doc('2026-12-31'), 'limited', 30, today)).toBe('valid')
    expect(documentState(doc('2026-09-30'), 'limited', 30, today)).toBe('expiring')
    expect(documentState(doc('2026-09-04'), 'limited', 30, today)).toBe('expiring')
    expect(documentState(doc('2026-09-03'), 'limited', 30, today)).toBe('expired')
  })

  it('lets a declared loss win, and never expires an unlimited document', () => {
    expect(
      documentState({ expiryDate: '2030-01-01', declaredStatus: 'lost' }, 'limited', 30, today)
    ).toBe('lost')
    expect(documentState(doc(null), 'unlimited', 30, today)).toBe('valid')
  })
})

describe('noticeDaysOf', () => {
  it('takes the document notice, else the type notice, else the fleet default', () => {
    expect(noticeDaysOf(10, 60, 30)).toBe(10)
    expect(noticeDaysOf(null, 60, 30)).toBe(60)
    expect(noticeDaysOf(null, null, 30)).toBe(30)
  })
})

describe('documentIssues', () => {
  it('needs an end date on a limited document, after its issue, issued in the past', () => {
    expect(documentIssues({ issueDate: '2026-01-01', expiryDate: null }, 'limited', today)).toEqual(
      ['expiryRequired']
    )
    expect(
      documentIssues({ issueDate: '2026-10-01', expiryDate: '2026-06-01' }, 'limited', today)
    ).toEqual(['issueInFuture', 'expiryBeforeIssue'])
    expect(documentIssues({ issueDate: null, expiryDate: null }, 'unlimited', today)).toEqual([])
  })

  it('suggests the end date from the usual duration', () => {
    expect(suggestedExpiry('2026-03-31', 6)).toBe('2026-09-30')
    expect(suggestedExpiry(null, 6)).toBeNull()
  })
})

describe('complianceGaps', () => {
  it('lists the mandatory documents missing or past their validity', () => {
    expect(
      complianceGaps(
        ['VEH-REG', 'VEH-INS', 'VEH-INSP'],
        [
          { documentTypeNo: 'VEH-INS', state: 'expiring' },
          { documentTypeNo: 'VEH-INSP', state: 'expired' }
        ]
      )
    ).toEqual([
      { documentTypeNo: 'VEH-REG', reason: 'missing' },
      { documentTypeNo: 'VEH-INSP', reason: 'expired' }
    ])
  })
})

describe('document type scope', () => {
  const type = {
    target: 'vehicle' as const,
    active: true,
    vehicleTypeNos: ['TRACTOR'],
    personScope: 'all' as const
  }

  it('applies a vehicle type list, and a person scope by driving position', () => {
    expect(appliesToVehicle(type, 'TRACTOR')).toBe(true)
    expect(appliesToVehicle(type, 'TANKER')).toBe(false)
    expect(appliesToVehicle({ ...type, vehicleTypeNos: [] }, 'TANKER')).toBe(true)
    const licence = { ...type, target: 'person' as const, personScope: 'drivers' as const }
    expect(appliesToPerson(licence, true)).toBe(true)
    expect(appliesToPerson(licence, false)).toBe(false)
  })
})
