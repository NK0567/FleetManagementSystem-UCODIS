/** The families of the default setup; the administrator may rename, reweight, regroup or add families. */
export const SCORE_FAMILIES = [
  'safety',
  'route',
  'regulatory',
  'discipline',
  'ecoDriving',
  'deliveryQuality'
] as const
export type ScoreFamily = (typeof SCORE_FAMILIES)[number]

/**
 * What the application can count for a driver. A family adds up the sources it is given; each
 * source feeds one family at most, so that a fact never counts twice.
 */
export const SCORE_SOURCES = [
  'stopDeviation',
  'confirmedBehaviour',
  'routeDeviation',
  'documents',
  'manualInfraction',
  'ecoEvent',
  'deliveryDispute'
] as const
export type ScoreSource = (typeof SCORE_SOURCES)[number]

export type ScoreSeverity = 'minor' | 'major' | 'critical'

/** A family of the score as the administrator set it up. */
export interface ScoreFamilyRule {
  code: string
  label: string
  /** Relative weight; a family weighted 0 is left out of the score. */
  weight: number
  sources: ScoreSource[]
}

export interface DriverScoreSettings {
  /** Only the facts of these last days count: an old mistake stops weighing on the driver. */
  periodDays: number
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
  /** Highest mark of the family while a mandatory document is missing or out of date. */
  missingDocumentCap: number
  /** Below this score, a training is called for. */
  trainingThreshold: number
}

export const DEFAULT_SCORE_FAMILIES: ScoreFamilyRule[] = [
  {
    code: 'safety',
    label: 'Sécurité',
    weight: 30,
    sources: ['stopDeviation', 'confirmedBehaviour']
  },
  { code: 'route', label: 'Itinéraire', weight: 25, sources: ['routeDeviation'] },
  { code: 'regulatory', label: 'Réglementaire', weight: 20, sources: ['documents'] },
  { code: 'discipline', label: 'Discipline', weight: 15, sources: ['manualInfraction'] },
  { code: 'ecoDriving', label: 'Écoconduite', weight: 10, sources: ['ecoEvent'] },
  { code: 'deliveryQuality', label: 'Livraison', weight: 10, sources: ['deliveryDispute'] }
]

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

/** One term of the formula of a family: so many facts, so many points each. */
export interface ScoreTerm {
  source: ScoreSource
  /** Set for the sources counted by severity. */
  severity: ScoreSeverity | null
  count: number
  points: number
}

export interface FamilyScore {
  family: string
  label: string
  /** Share of the overall score, in percent, once the families weighted 0 are left out. */
  weightPct: number
  mark: number
  events: number
  sources: ScoreSource[]
  /** The terms of mark = 100 - sum(count x points), floored at 0 and capped by `cap`. */
  terms: ScoreTerm[]
  /** Highest mark allowed while a mandatory document is missing; null when no cap applies. */
  cap: number | null
}

const SEVERITIES: readonly ScoreSeverity[] = ['critical', 'major', 'minor']

function severityTerms(
  source: ScoreSource,
  severities: readonly ScoreSeverity[],
  settings: DriverScoreSettings
): ScoreTerm[] {
  const points: Record<ScoreSeverity, number> = {
    critical: settings.criticalPoints,
    major: settings.majorPoints,
    minor: settings.minorPoints
  }
  return SEVERITIES.map((severity) => ({
    source,
    severity,
    count: severities.filter((item) => item === severity).length,
    points: points[severity]
  }))
}

/** The terms a source brings to the formula of its family. */
export function sourceTerms(
  source: ScoreSource,
  facts: ScoreFacts,
  settings: DriverScoreSettings
): ScoreTerm[] {
  const stops = facts.deviations.filter((deviation) => deviation.category !== 'route')
  const criticalStops = stops.filter((deviation) => deviation.severity === 'critical').length
  switch (source) {
    case 'stopDeviation':
      return [
        { source, severity: 'critical', count: criticalStops, points: settings.stopCriticalPoints },
        {
          source,
          severity: null,
          count: stops.length - criticalStops,
          points: settings.stopOtherPoints
        }
      ]
    case 'confirmedBehaviour':
      return severityTerms(source, facts.confirmedBehaviours, settings)
    case 'manualInfraction':
      return severityTerms(source, facts.manualInfractions, settings)
    case 'routeDeviation':
      return [
        {
          source,
          severity: null,
          count: facts.deviations.filter((deviation) => deviation.category === 'route').length,
          points: settings.routeDeviationPoints
        }
      ]
    case 'ecoEvent':
      return [{ source, severity: null, count: facts.ecoEvents, points: settings.ecoEventPoints }]
    case 'deliveryDispute':
      return [
        {
          source,
          severity: null,
          count: facts.openDisputes,
          points: settings.deliveryDisputePoints
        }
      ]
    case 'documents':
      // Documents take no points away: they cap the mark of their family.
      return []
  }
}

/** Each family starts at 100 and loses points; a family weighted 0 is left out. */
export function familyScores(
  facts: ScoreFacts,
  settings: DriverScoreSettings,
  families: readonly ScoreFamilyRule[] = DEFAULT_SCORE_FAMILIES
): FamilyScore[] {
  const active = families.filter((family) => family.weight > 0)
  const total = active.reduce((sum, family) => sum + family.weight, 0)
  return active.map((family) => {
    const terms = family.sources.flatMap((source) => sourceTerms(source, facts, settings))
    const lost = terms.reduce((sum, term) => sum + term.count * term.points, 0)
    const capped = family.sources.includes('documents') && !facts.documentsCompliant
    const cap = capped ? Math.min(100, settings.missingDocumentCap) : null
    return {
      family: family.code,
      label: family.label,
      weightPct: (family.weight * 100) / total,
      mark: Math.min(cap ?? 100, Math.max(0, 100 - lost)),
      events: terms.reduce((sum, term) => sum + term.count, 0) + (capped ? 1 : 0),
      sources: [...family.sources],
      terms: terms.filter((term) => term.count > 0),
      cap
    }
  })
}

export function overallScore(families: readonly FamilyScore[]): number {
  if (!families.length) return 100
  return Math.round(
    families.reduce((sum, family) => sum + (family.mark * family.weightPct) / 100, 0)
  )
}

export type ScoreFamiliesIssue =
  | { code: 'noFamily' }
  | { code: 'noWeight' }
  | { code: 'codeRequired'; index: number }
  | { code: 'codeInvalid'; index: number }
  | { code: 'labelRequired'; index: number }
  | { code: 'weightOutOfRange'; index: number }
  | { code: 'duplicateCode'; index: number }
  | { code: 'noSource'; index: number }
  | { code: 'sourceTwice'; index: number; source: ScoreSource }

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,19}$/

/** What prevents a set of families from being saved; empty when it is valid. */
export function scoreFamiliesIssues(families: readonly ScoreFamilyRule[]): ScoreFamiliesIssue[] {
  if (!families.length) return [{ code: 'noFamily' }]
  const issues: ScoreFamiliesIssue[] = []
  const codes = new Set<string>()
  const used = new Set<ScoreSource>()
  families.forEach((family, index) => {
    const code = family.code.trim()
    if (!code) issues.push({ code: 'codeRequired', index })
    else if (!CODE_PATTERN.test(code)) issues.push({ code: 'codeInvalid', index })
    else if (codes.has(code.toLowerCase())) issues.push({ code: 'duplicateCode', index })
    codes.add(code.toLowerCase())
    if (!family.label.trim()) issues.push({ code: 'labelRequired', index })
    if (!Number.isFinite(family.weight) || family.weight < 0 || family.weight > 100) {
      issues.push({ code: 'weightOutOfRange', index })
    }
    if (!family.sources.length) issues.push({ code: 'noSource', index })
    for (const source of family.sources) {
      if (used.has(source)) issues.push({ code: 'sourceTwice', index, source })
      used.add(source)
    }
  })
  if (!families.some((family) => family.weight > 0)) issues.push({ code: 'noWeight' })
  return issues
}
