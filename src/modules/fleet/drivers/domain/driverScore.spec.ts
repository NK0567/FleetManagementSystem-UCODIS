import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORE_FAMILIES,
  familyScores,
  overallScore,
  scoreFamiliesIssues,
  type DriverScoreSettings,
  type ScoreFacts
} from './driverScore'

const settings: DriverScoreSettings = {
  periodDays: 90,
  deliveryDisputePoints: 20,
  criticalPoints: 15,
  majorPoints: 8,
  minorPoints: 3,
  stopCriticalPoints: 25,
  stopOtherPoints: 10,
  routeDeviationPoints: 20,
  ecoEventPoints: 5,
  missingDocumentCap: 60,
  trainingThreshold: 70
}

const clean: ScoreFacts = {
  deviations: [],
  confirmedBehaviours: [],
  manualInfractions: [],
  ecoEvents: 0,
  documentsCompliant: true,
  openDisputes: 0
}

const markOf = (facts: ScoreFacts, family: string) =>
  familyScores(facts, settings).find((item) => item.family === family)?.mark

describe('familyScores', () => {
  it('gives a clean driver 100 everywhere', () => {
    expect(overallScore(familyScores(clean, settings))).toBe(100)
  })

  it('takes route deviations from the route family, and stops from safety', () => {
    const facts = {
      ...clean,
      deviations: [
        { category: 'route' as const, severity: 'major' as const },
        { category: 'stop' as const, severity: 'critical' as const },
        { category: 'time' as const, severity: 'major' as const }
      ],
      confirmedBehaviours: ['minor' as const]
    }
    expect(markOf(facts, 'route')).toBe(80)
    expect(markOf(facts, 'safety')).toBe(100 - 25 - 10 - 3)
  })

  it('caps the regulatory mark while a document is missing, and never goes below 0', () => {
    expect(markOf({ ...clean, documentsCompliant: false }, 'regulatory')).toBe(60)
    expect(markOf({ ...clean, ecoEvents: 30 }, 'ecoDriving')).toBe(0)
    expect(markOf({ ...clean, openDisputes: 2 }, 'deliveryQuality')).toBe(60)
  })

  it('leaves out a family weighted 0 and shares its weight among the others', () => {
    const families = familyScores(
      { ...clean, documentsCompliant: false },
      settings,
      DEFAULT_SCORE_FAMILIES.map((family) =>
        family.code === 'regulatory' ? { ...family, weight: 0 } : family
      )
    )
    expect(families.map((family) => family.family)).not.toContain('regulatory')
    expect(families.reduce((sum, family) => sum + family.weightPct, 0)).toBeCloseTo(100)
    expect(overallScore(families)).toBe(100)
  })
})

describe('configured families', () => {
  it('add up the sources they are given, and show the terms of their formula', () => {
    const facts = {
      ...clean,
      deviations: [{ category: 'route' as const, severity: 'minor' as const }],
      openDisputes: 1
    }
    const [family] = familyScores(facts, settings, [
      {
        code: 'road',
        label: 'Route et livraison',
        weight: 1,
        sources: ['routeDeviation', 'deliveryDispute']
      }
    ])
    expect(family).toMatchObject({
      family: 'road',
      label: 'Route et livraison',
      mark: 60,
      weightPct: 100
    })
    expect(family!.terms).toEqual([
      { source: 'routeDeviation', severity: null, count: 1, points: 20 },
      { source: 'deliveryDispute', severity: null, count: 1, points: 20 }
    ])
  })

  it('refuse a source used twice, a duplicate code or no weight at all', () => {
    expect(scoreFamiliesIssues(DEFAULT_SCORE_FAMILIES)).toEqual([])
    expect(scoreFamiliesIssues([])).toEqual([{ code: 'noFamily' }])
    const codes = scoreFamiliesIssues([
      { code: 'a', label: 'A', weight: 0, sources: ['ecoEvent'] },
      { code: 'A', label: '', weight: 0, sources: ['ecoEvent'] }
    ]).map((issue) => issue.code)
    expect(codes).toEqual(['duplicateCode', 'labelRequired', 'sourceTwice', 'noWeight'])
  })
})

describe('overallScore', () => {
  it('weighs each family', () => {
    const facts = {
      ...clean,
      deviations: [{ category: 'route' as const, severity: 'minor' as const }]
    }
    expect(overallScore(familyScores(facts, settings))).toBe(95)
  })
})
