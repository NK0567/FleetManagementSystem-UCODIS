import { describe, expect, it } from 'vitest'
import { daysToAbsorb, occupancyRate, remainingHours, technicianIssue } from './workshopLoad'

const capacity = { stations: 2, hoursPerDay: 8, workingDaysPerWeek: 6 }

describe('workshop load', () => {
  it('counts what is left of each estimate', () => {
    expect(remainingHours(6, 2.5)).toBe(3.5)
    expect(remainingHours(4, 5)).toBe(0)
  })

  it('compares the load with a working week', () => {
    expect(occupancyRate(48, capacity)).toBe(50)
    expect(occupancyRate(120, capacity)).toBe(125)
    expect(occupancyRate(10, { ...capacity, stations: 0 })).toBeNull()
    expect(daysToAbsorb(17, capacity)).toBe(2)
  })

  it('plans only active technicians who hold the competence', () => {
    const technician = { active: true, competences: ['MECHANICAL'] }
    expect(technicianIssue(technician, 'MECHANICAL')).toBeNull()
    expect(technicianIssue(technician, null)).toBeNull()
    expect(technicianIssue(technician, 'ELECTRICAL')).toBe('competence')
    expect(technicianIssue({ ...technician, active: false }, 'MECHANICAL')).toBe('inactive')
  })
})
