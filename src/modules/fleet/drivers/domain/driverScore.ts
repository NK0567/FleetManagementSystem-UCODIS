export const SCORE_FAMILIES = [
  'safety',
  'route',
  'regulatory',
  'discipline',
  'ecoDriving',
  'deliveryQuality'
] as const
export type ScoreFamily = (typeof SCORE_FAMILIES)[number]

export type ScoreSeverity = 'minor' | 'major' | 'critical'

export interface DriverScoreSettings {
  /** Only the facts of these last days count: an old mistake stops weighing on the driver. */
  periodDays: number
  weightSafety: number
  weightRoute: number
  weightRegulatory: number
  weightDiscipline: number
  weightEcoDriving: number
  weightDeliveryQuality: number
  /** Points lost per confirmed behaviour or upheld infraction, by severity. */
  criticalPoints: number
  majorPoints: number
  minorPoints: number
  /** Points lost per unjustified stop, rest or driving-time deviation. */
  stopCriticalPoints: number
  stopOtherPoints: number
  routeDeviationPoints: number
  ecoEventPoints: number
  /** Points lost per delivery whose contestation is still open. */
  deliveryDisputePoints: number
  /** Highest regulatory mark while a mandatory document is missing or out of date. */
  missingDocumentCap: number
  /** Below this score, a training is called for. */
  trainingThreshold: number
}

/** What the score is made of; only facts someone confirmed count against the driver. */
export interface ScoreFacts {
  /** Deviations qualified unjustified, by the category and severity of their type. */
  deviations: { category: 'route' | 'stop' | 'time'; severity: ScoreSeverity }[]
  /** Telematics behaviours an upheld infraction confirmed. */
  confirmedBehaviours: ScoreSeverity[]
  /** Upheld infractions typed in by hand; those from telematics count through their event. */
  manualInfractions: ScoreSeverity[]
  /** Habits the units measure (idling, harsh driving) that no infraction took up. */
  ecoEvents: number
  documentsCompliant: boolean
  /** Deliveries on the driver's trips whose contestation is still open. */
  openDisputes: number
}

export interface FamilyScore {
  family: ScoreFamily
  /** Share of the overall score, in percent, once inactive families are left out. */
  weightPct: number
  mark: number
  events: number
}

const WEIGHT_OF: Record<ScoreFamily, keyof DriverScoreSettings> = {
  safety: 'weightSafety',
  route: 'weightRoute',
  regulatory: 'weightRegulatory',
  discipline: 'weightDiscipline',
  ecoDriving: 'weightEcoDriving',
  deliveryQuality: 'weightDeliveryQuality'
}

function severityPoints(severities: ScoreSeverity[], settings: DriverScoreSettings): number {
  const points: Record<ScoreSeverity, number> = {
    critical: settings.criticalPoints,
    major: settings.majorPoints,
    minor: settings.minorPoints
  }
  return severities.reduce((total, severity) => total + points[severity], 0)
}

const mark = (lost: number) => Math.max(0, 100 - lost)

/** Each family starts at 100 and loses points; a family weighted 0 is left out. */
export function familyScores(facts: ScoreFacts, settings: DriverScoreSettings): FamilyScore[] {
  const route = facts.deviations.filter((deviation) => deviation.category === 'route')
  const stops = facts.deviations.filter((deviation) => deviation.category !== 'route')
  const criticalStops = stops.filter((deviation) => deviation.severity === 'critical').length
  const marks: Record<ScoreFamily, { mark: number; events: number }> = {
    safety: {
      mark: mark(
        criticalStops * settings.stopCriticalPoints +
          (stops.length - criticalStops) * settings.stopOtherPoints +
          severityPoints(facts.confirmedBehaviours, settings)
      ),
      events: stops.length + facts.confirmedBehaviours.length
    },
    route: {
      mark: mark(route.length * settings.routeDeviationPoints),
      events: route.length
    },
    regulatory: {
      mark: facts.documentsCompliant ? 100 : Math.min(100, settings.missingDocumentCap),
      events: facts.documentsCompliant ? 0 : 1
    },
    discipline: {
      mark: mark(severityPoints(facts.manualInfractions, settings)),
      events: facts.manualInfractions.length
    },
    ecoDriving: {
      mark: mark(facts.ecoEvents * settings.ecoEventPoints),
      events: facts.ecoEvents
    },
    deliveryQuality: {
      mark: mark(facts.openDisputes * settings.deliveryDisputePoints),
      events: facts.openDisputes
    }
  }
  const active = SCORE_FAMILIES.filter((family) => settings[WEIGHT_OF[family]] > 0)
  const total = active.reduce((sum, family) => sum + settings[WEIGHT_OF[family]], 0)
  return active.map((family) => ({
    family,
    weightPct: (settings[WEIGHT_OF[family]] * 100) / total,
    ...marks[family]
  }))
}

export function overallScore(families: readonly FamilyScore[]): number {
  if (!families.length) return 100
  return Math.round(
    families.reduce((sum, family) => sum + (family.mark * family.weightPct) / 100, 0)
  )
}
