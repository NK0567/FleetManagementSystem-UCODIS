import { describe, expect, it } from 'vitest'
import { plannedDurationMin, plannedSchedule, routeIssues, type RouteStop } from './routeTemplate'

const toamasina: RouteStop[] = [
  { siteNo: 'DEP-TNJ', role: 'departure', plannedIntervalMin: 0, breakMin: 0 },
  { siteNo: 'ENT-TNJ', role: 'loading', plannedIntervalMin: 25, breakMin: 0 },
  { siteNo: 'REL-MOR', role: 'rest', plannedIntervalMin: 140, breakMin: 45 },
  { siteNo: 'PTC-BRK', role: 'check', plannedIntervalMin: 85, breakMin: 0 },
  { siteNo: 'ENT-TOA', role: 'delivery', plannedIntervalMin: 155, breakMin: 0 }
]

describe('routeIssues', () => {
  it('accepts a route starting with a departure', () => {
    expect(routeIssues(toamasina)).toEqual([])
  })

  it('needs two stops, a departure first and a site on each stop', () => {
    expect(routeIssues(toamasina.slice(0, 1))).toEqual(['tooFewStops'])
    expect(routeIssues(toamasina.slice(1))).toEqual(['firstMustBeDeparture'])
    expect(routeIssues([...toamasina, { ...toamasina[4]!, siteNo: '' }])).toContain('missingSite')
  })

  it('refuses the same site twice in a row', () => {
    expect(routeIssues([...toamasina, { ...toamasina[4]!, role: 'arrival' }])).toEqual([
      'sameSiteTwiceInARow'
    ])
  })
})

describe('plannedSchedule', () => {
  it('adds the driving times and the breaks of the stops already passed', () => {
    expect(plannedSchedule('2026-09-04T06:00:00', toamasina)).toEqual([
      '2026-09-04T06:00:00',
      '2026-09-04T06:25:00',
      '2026-09-04T08:45:00',
      '2026-09-04T10:55:00',
      '2026-09-04T13:30:00'
    ])
    expect(plannedDurationMin(toamasina)).toBe(450)
  })
})
