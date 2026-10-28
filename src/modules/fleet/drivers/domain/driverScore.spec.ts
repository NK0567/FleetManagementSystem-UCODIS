import { describe, expect, it } from 'vitest'
import {
  familyScores,
  overallScore,
  type DriverScoreSettings,
  type ScoreFacts
} from './driverScore'

const settings: DriverScoreSettings = {
  periodDays: 90,
  weightSafety: 30,
  weightRoute: 25,
  weightRegulatory: 20,
  weightDiscipline: 15,
  weightEcoDriving: 10,
  weightDeliveryQuality: 10,
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
      { ...settings, weightRegulatory: 0 }
    )
    expect(families.map((family) => family.family)).not.toContain('regulatory')
    expect(families.reduce((sum, family) => sum + family.weightPct, 0)).toBeCloseTo(100)
    expect(overallScore(families)).toBe(100)
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
