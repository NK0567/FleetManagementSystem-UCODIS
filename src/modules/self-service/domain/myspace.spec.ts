import { describe, expect, it } from 'vitest'
import { dayPluralChoice, mayDeclare, pickTour, stopRank } from './myspace'

describe('mayDeclare', () => {
  it('lets the driver declare and keeps the assistant read-only', () => {
    expect(mayDeclare('driver')).toBe(true)
    expect(mayDeclare('assistant')).toBe(false)
  })
})

describe('pickTour', () => {
  const trips = [
    { no: 'past', status: 'closed', plannedDeparture: '2026-08-01T06:00:00' },
    { no: 'road', status: 'in_progress', plannedDeparture: '2026-09-04T06:00:00' },
    { no: 'next', status: 'planned', plannedDeparture: '2026-09-05T06:00:00' },
    { no: 'dropped', status: 'cancelled', plannedDeparture: '2026-09-04T08:00:00' }
  ]

  it('prefers the tour on the road, then the next one, then the latest finished one', () => {
    expect(pickTour(trips)?.no).toBe('road')
    expect(pickTour(trips.filter((trip) => trip.no !== 'road'))?.no).toBe('next')
    expect(
      pickTour(trips.filter((trip) => trip.status === 'closed' || trip.status === 'cancelled'))?.no
    ).toBe('past')
    expect(pickTour([])).toBeNull()
  })
})

describe('stopRank', () => {
  it('places a delivery on the stop of its city', () => {
    const cities = ['Antananarivo', 'Moramanga', 'Toamasina']
    expect(stopRank('Toamasina', cities)).toBe(2)
    expect(stopRank('Fianarantsoa', cities)).toBe(3)
  })
})

describe('dayPluralChoice', () => {
  it('reads half days as plural', () => {
    expect([0, 1, 0.5, 1.5, 12].map(dayPluralChoice)).toEqual([0, 1, 2, 2, 2])
  })
})
