import {
  familyScores,
  overallScore,
  type ScoreFacts,
  type ScoreSeverity
} from '@/modules/fleet/drivers/domain/driverScore'
import type { DriverScoreApi } from '@/modules/fleet/drivers/types/driver.types'
import { isUpheld } from '@/modules/fleet/infractions/domain/infraction'
import { isPending, trainingStatus } from '@/modules/fleet/trainings/domain/training'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { addDays, todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { routeParam } from '../../http/crudResource'
import { conflict, notFound } from '../../http/errors'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { localize } from '../../i18n'
import { documentCompliance } from './documentCompliance'
import { driverEmployees } from './drivers'
import { FLEET_MESSAGES } from './messages'
import { routeDeviationsApi } from './routeDeviations'
import { fleetSettings } from './settings'
import { scoreFamiliesOf } from './settingsLists'
import { createTraining } from './trainings'

const SEVERITY_OF_INFRACTION: Record<string, ScoreSeverity> = {
  minor: 'minor',
  major: 'major',
  serious: 'critical'
}

/** Families whose events count against safety once an infraction confirms them. */
const BEHAVIOUR_FAMILIES = new Set(['behavior', 'camera'])

/**
 * The facts of every driver over the score period ending on a day. Document compliance is today's: past compliance is not
 * kept, so the score of an earlier day differs only by the events dated after it.
 */
function scoreFacts(db: MockDatabase, asOf: string): Map<string, ScoreFacts> {
  const facts = new Map<string, ScoreFacts>()
  const compliance = documentCompliance(db).persons
  for (const employee of driverEmployees(db)) {
    facts.set(employee.no, {
      deviations: [],
      confirmedBehaviours: [],
      manualInfractions: [],
      ecoEvents: 0,
      documentsCompliant: (compliance.get(employee.no) ?? []).length === 0,
      openDisputes: 0
    })
  }
  const since = addDays(asOf, -fleetSettings(db).driverScore.periodDays)
  const inPeriod = (at: string) => at.slice(0, 10) > since && at.slice(0, 10) <= asOf

  const tripDrivers = new Map(db.trips.all().map((trip) => [trip.no, trip.driverNo]))
  for (const order of db.transportOrders.all()) {
    if (!order.tripNo) continue
    const driverNo = tripDrivers.get(order.tripNo)
    const own = driverNo ? facts.get(driverNo) : undefined
    if (!own) continue
    own.openDisputes += order.lines.filter(
      (line) =>
        line.receptionContestedAt && !line.contestHandledAt && inPeriod(line.receptionContestedAt)
    ).length
  }
  const deviationTypes = new Map(db.deviationTypes.all().map((type) => [type.no, type]))
  for (const deviation of routeDeviationsApi(db)) {
    const own = facts.get(tripDrivers.get(deviation.tripNo) ?? '')
    const type = deviationTypes.get(deviation.deviationTypeNo)
    if (!own || !type || deviation.nature !== 'unjustified' || !inPeriod(deviation.detectedAt))
      continue
    own.deviations.push({ category: type.category, severity: deviation.severity })
  }

  const infractions = new Map(db.infractions.all().map((row) => [row.no, row]))
  for (const infraction of infractions.values()) {
    const own = facts.get(infraction.driverNo ?? '')
    if (!own || infraction.source !== 'manual' || !inPeriod(infraction.occurredAt)) continue
    if (isUpheld(infraction.outcome)) {
      own.manualInfractions.push(SEVERITY_OF_INFRACTION[infraction.severity] ?? 'major')
    }
  }

  const eventTypes = new Map(db.telematicsEventTypes.all().map((type) => [type.no, type]))
  for (const event of db.telematicsEvents.all()) {
    const own = facts.get(event.driverNo ?? '')
    const type = eventTypes.get(event.eventTypeNo)
    if (!own || !type?.affectsScore || !inPeriod(event.occurredAt)) continue
    const infraction = event.infractionNo ? infractions.get(event.infractionNo) : undefined
    if (infraction) {
      // Judged: counted against safety when upheld, not at all when lifted.
      if (BEHAVIOUR_FAMILIES.has(type.family) && isUpheld(infraction.outcome)) {
        own.confirmedBehaviours.push(type.severity)
      }
    } else if (type.family === 'behavior' || type.family === 'stop') {
      own.ecoEvents++
    }
  }
  return facts
}

function scoresAsOf(db: MockDatabase, asOf: string) {
  const settings = fleetSettings(db).driverScore
  const families = scoreFamiliesOf(db)
  const scores = new Map<string, ReturnType<typeof familyScores>>()
  for (const [no, facts] of scoreFacts(db, asOf)) {
    scores.set(no, familyScores(facts, settings, families))
  }
  return scores
}

/** Every driver's score today and at the end of last month, with the training it may call for. */
export function driverScoresApi(db: MockDatabase): DriverScoreApi[] {
  const today = todayIso()
  const threshold = fleetSettings(db).driverScore.trainingThreshold
  const current = scoresAsOf(db, today)
  const previous = scoresAsOf(db, addDays(`${today.slice(0, 7)}-01`, -1))
  const trainings = db.trainings.all()
  const rows = driverEmployees(db).map((employee) => {
    const families = current.get(employee.no) ?? []
    const score = overallScore(families)
    const previousScore = overallScore(previous.get(employee.no) ?? [])
    const pending = trainings.find(
      (training) =>
        training.employeeNo === employee.no &&
        training.reason === 'score' &&
        isPending(trainingStatus(training))
    )
    return {
      driverNo: employee.no,
      fullName: employeeFullName(employee),
      score,
      previousScore,
      delta: score - previousScore,
      rank: 0,
      driverCount: 0,
      threshold,
      belowThreshold: score < threshold,
      families,
      trainingNo: pending?.no ?? null
    }
  })
  const ranked = [...rows].sort((a, b) => b.score - a.score)
  return rows.map((row) => ({
    ...row,
    rank: ranked.findIndex((other) => other.score === row.score) + 1,
    driverCount: rows.length
  }))
}

export function registerDriverScoresHandlers(router: MockRouter, db: MockDatabase): void {
  const scoreOf = (no: string) => {
    const score = driverScoresApi(db).find((row) => row.driverNo === no)
    if (!score) throw notFound()
    return score
  }

  router.get('/fleet/drivers/:no/score', { feature: 'DRIVER', action: 'read' }, (request) =>
    ok(scoreOf(routeParam(request, 'no')))
  )

  // A training is proposed by someone looking at the score, never created behind their back.
  router.post(
    '/fleet/drivers/:no/score-training',
    { feature: 'TRAINING', action: 'insert' },
    (request) => {
      const score = scoreOf(routeParam(request, 'no'))
      const values = { score: score.score, threshold: score.threshold }
      if (!score.belowThreshold) throw conflict(FLEET_MESSAGES.scoreAboveThreshold, values)
      if (score.trainingNo) {
        throw conflict(FLEET_MESSAGES.scoreTrainingPending, { no: score.trainingNo })
      }
      createTraining(
        db,
        {
          employeeNo: score.driverNo,
          topic: localize(request.language, FLEET_MESSAGES.scoreTrainingTopic, values),
          reason: 'score',
          originNo: `SCORE-${todayIso().slice(0, 7)}`
        },
        request
      )
      return ok(scoreOf(score.driverNo))
    }
  )
}
