import {
  isPending,
  isSameTraining,
  trainingStatus
} from '@/modules/fleet/trainings/domain/training'
import {
  TRAINING_REASONS,
  type TrainingApi,
  type TrainingReason
} from '@/modules/fleet/trainings/types/training.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TrainingRow } from '../../fixtures/fleet/trainings'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate, readEnum, readPatch, readString, type FieldReaders } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import type { MockRequest } from '../../http/types'
import { FLEET_MESSAGES } from './messages'

type EditableFields = Pick<TrainingRow, 'topic' | 'plannedOn' | 'trainer'>

export function trainingsApi(db: MockDatabase): TrainingApi[] {
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  return db.trainings.all().map((training) => ({
    ...training,
    employeeName: names.get(training.employeeNo) ?? training.employeeNo,
    status: trainingStatus(training)
  }))
}

function trainingApiOf(db: MockDatabase, no: string): TrainingApi | undefined {
  return trainingsApi(db).find((row) => row.no === no)
}

function readPlannedOn(input: Record<string, unknown>): string | null {
  const plannedOn = readDate(input, 'plannedOn')
  if (plannedOn && plannedOn < todayIso()) throw unprocessable(FLEET_MESSAGES.trainingPlannedInPast)
  return plannedOn
}

export interface TrainingRequest {
  employeeNo: string
  topic: string
  reason: TrainingReason
  originNo: string
  plannedOn?: string | null
  trainer?: string
}

/** One training per origin and driver: a second request for the same origin is refused. */
function trainingDraft(db: MockDatabase, request: TrainingRequest) {
  const employee = db.employees.findOrFail(request.employeeNo)
  if (!isOnStaff(employee.status)) throw unprocessable(FLEET_MESSAGES.notOnStaff)
  const existing = trainingsApi(db).find((row) => isSameTraining(request, row))
  if (existing) {
    throw conflict(FLEET_MESSAGES.trainingDuplicate, { origin: request.originNo, no: existing.no })
  }
  return {
    no: nextNo(
      db.trainings.all().map((row) => row.no),
      'FOR-',
      5
    ),
    employeeNo: request.employeeNo,
    topic: request.topic,
    reason: request.reason,
    originNo: request.originNo,
    plannedOn: request.plannedOn ?? null,
    trainer: request.trainer ?? '',
    attendedOn: null,
    result: '',
    cancelledAt: null,
    cancelReason: ''
  }
}

/** Sends a driver to a training; infractions and claims trigger it this way. */
export function createTraining(
  db: MockDatabase,
  training: TrainingRequest,
  request: MockRequest
): TrainingRow {
  return db.trainings.insert(stampCreated(trainingDraft(db, training), request))
}

export function registerTrainingsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    topic: (input) => readString(input, 'topic', { required: true }),
    plannedOn: readPlannedOn,
    trainer: (input) => readString(input, 'trainer')
  }

  function pending(no: string) {
    const training = db.trainings.findOrFail(no)
    if (!isPending(trainingStatus(training))) throw conflict(FLEET_MESSAGES.trainingNotPending)
    return training
  }

  registerCrudResource(router, {
    basePath: '/fleet/trainings',
    feature: 'TRAINING',
    collection: db.trainings,
    list: () => trainingsApi(db),
    searchColumns: ['no', 'employeeName', 'topic', 'originNo'],
    optionFields: { reason: 'trainingReason', status: 'trainingStatus' },
    create: (input) =>
      trainingDraft(db, {
        employeeNo: requireReference(db.employees, input, 'employeeNo'),
        topic: readString(input, 'topic', { required: true }),
        reason: readEnum(input, 'reason', TRAINING_REASONS, { required: true }) ?? 'other',
        originNo: readString(input, 'originNo'),
        plannedOn: readPlannedOn(input),
        trainer: readString(input, 'trainer')
      }),
    update: (existing, input) => {
      pending(existing.no)
      return readPatch(input, readers)
    }
  })

  router.post(
    '/fleet/trainings/:no/attend',
    { feature: 'TRAINING', action: 'update' },
    (request) => {
      const training = pending(routeParam(request, 'no'))
      if (!training.plannedOn) throw conflict(FLEET_MESSAGES.trainingNotPlanned)
      const body = readBody(request)
      const attendedOn = readDate(body, 'attendedOn', { required: true }) ?? ''
      if (attendedOn > todayIso()) throw unprocessable(FLEET_MESSAGES.trainingAttendedInFuture)
      db.trainings.update(training.no, {
        attendedOn,
        result: readString(body, 'result'),
        ...stampModified(request)
      })
      return ok(trainingApiOf(db, training.no))
    }
  )

  router.post(
    '/fleet/trainings/:no/cancel',
    { feature: 'TRAINING', action: 'update' },
    (request) => {
      const training = pending(routeParam(request, 'no'))
      const reason = readString(readBody(request), 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.trainings.update(training.no, {
        cancelledAt: nowIso(),
        cancelReason: reason,
        ...stampModified(request)
      })
      return ok(trainingApiOf(db, training.no))
    }
  )
}
