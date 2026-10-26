import { INFRACTION_SEVERITIES } from '@/modules/fleet/infraction-types/types/infractionType.types'
import {
  INFRACTION_OUTCOMES,
  infractionStatus,
  isDuplicate,
  isUpheld,
  triggersTraining
} from '@/modules/fleet/infractions/domain/infraction'
import type {
  InfractionApi,
  InfractionEvent
} from '@/modules/fleet/infractions/types/infraction.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIsoDateTime } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { InfractionRow } from '../../fixtures/fleet/infractions'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
  readDateTime,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { optionLabel } from '../../fixtures/options'
import { FLEET_MESSAGES } from './messages'
import { createTraining } from './trainings'

type EditableFields = Pick<
  InfractionRow,
  'occurredAt' | 'location' | 'vehicleNo' | 'driverNo' | 'severity' | 'fineAmount' | 'detail'
>

export function infractionsApi(db: MockDatabase): InfractionApi[] {
  const types = new Map(db.infractionTypes.all().map((type) => [type.no, type.name]))
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const trainings = db.trainings.all()
  return db.infractions.all().map((infraction) => ({
    ...infraction,
    infractionTypeName: types.get(infraction.infractionTypeNo) ?? infraction.infractionTypeNo,
    vehiclePlate: plates.get(infraction.vehicleNo) ?? infraction.vehicleNo,
    driverName: infraction.driverNo ? (names.get(infraction.driverNo) ?? infraction.driverNo) : '',
    status: infractionStatus(infraction),
    upheld: isUpheld(infraction.outcome),
    trainingNo:
      trainings.find(
        (training) =>
          training.originNo === infraction.no && training.employeeNo === infraction.driverNo
      )?.no ?? null
  }))
}

function infractionApiOf(db: MockDatabase, no: string): InfractionApi | undefined {
  return infractionsApi(db).find((row) => row.no === no)
}

function historyEvent(
  request: MockRequest,
  kind: InfractionEvent['kind'],
  comment = ''
): InfractionEvent {
  return { at: nowIso(), by: sessionUser(request).code, kind, comment }
}

/** An offence seen by the on-board units; seen twice within minutes, it stays one infraction. */
export function infractionFromTelematics(
  db: MockDatabase,
  fields: Pick<
    InfractionRow,
    'infractionTypeNo' | 'occurredAt' | 'location' | 'vehicleNo' | 'driverNo' | 'detail'
  >,
  request: MockRequest
): string {
  const twin = db.infractions.all().find((row) => isDuplicate(row, fields))
  if (twin) return twin.no
  const type = db.infractionTypes.findOrFail(fields.infractionTypeNo)
  const infraction = {
    no: nextNo(
      db.infractions.all().map((row) => row.no),
      `INF-${fields.occurredAt.slice(0, 4)}-`,
      3
    ),
    ...fields,
    severity: type.defaultSeverity,
    fineAmount: null,
    source: 'telematics' as const,
    handlerCode: null,
    outcome: null,
    outcomeComment: '',
    closedAt: null,
    history: [historyEvent(request, 'recorded')]
  }
  db.infractions.insert(stampCreated(infraction, request))
  return infraction.no
}

export function registerInfractionsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    occurredAt: (input) => {
      const value = readDateTime(input, 'occurredAt', { required: true }) ?? ''
      if (value > nowIsoDateTime()) throw unprocessable(FLEET_MESSAGES.infractionInFuture)
      return value
    },
    location: (input) => readString(input, 'location', { required: true }),
    vehicleNo: (input) => requireReference(db.vehicles, input, 'vehicleNo'),
    driverNo: (input) => optionalReference(db.employees, input, 'driverNo'),
    severity: (input) => readEnum(input, 'severity', INFRACTION_SEVERITIES) ?? 'major',
    fineAmount: (input) => readNumber(input, 'fineAmount', { min: 0 }),
    detail: (input) => readString(input, 'detail')
  }

  function assertNotDuplicate(
    infraction: Pick<InfractionRow, 'no' | 'vehicleNo' | 'infractionTypeNo' | 'occurredAt'>
  ) {
    const twin = db.infractions
      .all()
      .find((row) => row.no !== infraction.no && isDuplicate(row, infraction))
    if (twin) throw conflict(FLEET_MESSAGES.infractionDuplicate, { no: twin.no })
  }

  function open(no: string) {
    const infraction = db.infractions.findOrFail(no)
    if (infraction.outcome) throw conflict(FLEET_MESSAGES.infractionClosed)
    return infraction
  }

  registerCrudResource(router, {
    basePath: '/fleet/infractions',
    feature: 'INFRACTION',
    collection: db.infractions,
    list: () => infractionsApi(db),
    searchColumns: ['no', 'vehiclePlate', 'driverName', 'location'],
    optionFields: {
      severity: 'infractionSeverity',
      source: 'infractionSource',
      status: 'infractionStatus',
      outcome: 'infractionOutcome'
    },
    create: (input, request) => {
      const infractionTypeNo = requireReference(db.infractionTypes, input, 'infractionTypeNo')
      const type = db.infractionTypes.findOrFail(infractionTypeNo)
      if (!type.active) throw unprocessable(FLEET_MESSAGES.infractionTypeInactive)
      const fields = readAll(input, readers)
      const year = fields.occurredAt.slice(0, 4)
      const infraction = {
        no: nextNo(
          db.infractions.all().map((row) => row.no),
          `INF-${year}-`,
          3
        ),
        infractionTypeNo,
        ...fields,
        // Without a choice, the infraction takes the usual severity of its type.
        severity: readEnum(input, 'severity', INFRACTION_SEVERITIES) ?? type.defaultSeverity,
        source: 'manual' as const,
        handlerCode: null,
        outcome: null,
        outcomeComment: '',
        closedAt: null,
        history: [historyEvent(request, 'recorded')]
      }
      assertNotDuplicate(infraction)
      return infraction
    },
    update: (existing, input) => {
      open(existing.no)
      const patch = readPatch(input, readers)
      assertNotDuplicate({ ...existing, ...patch })
      return patch
    }
  })

  router.post(
    '/fleet/infractions/:no/take',
    { feature: 'INFRACTION', action: 'update' },
    (request) => {
      const infraction = open(routeParam(request, 'no'))
      if (infraction.handlerCode) throw conflict(FLEET_MESSAGES.infractionAlreadyTaken)
      db.infractions.update(infraction.no, {
        handlerCode: sessionUser(request).code,
        history: [...infraction.history, historyEvent(request, 'taken')],
        ...stampModified(request)
      })
      return ok(infractionApiOf(db, infraction.no))
    }
  )

  router.post(
    '/fleet/infractions/:no/close',
    { feature: 'INFRACTION', action: 'update' },
    (request) => {
      const infraction = open(routeParam(request, 'no'))
      const body = readBody(request)
      const outcome = readEnum(body, 'outcome', INFRACTION_OUTCOMES)
      const comment = readString(body, 'comment')
      if (!outcome || !comment) throw unprocessable(FLEET_MESSAGES.infractionOutcomeRequired)
      if (triggersTraining(outcome)) {
        // The outcome itself sends the driver to the training: nobody has to remember a second click.
        if (!infraction.driverNo) throw unprocessable(FLEET_MESSAGES.trainingNeedsDriver)
        createTraining(
          db,
          {
            employeeNo: infraction.driverNo,
            topic:
              db.infractionTypes.find(infraction.infractionTypeNo)?.name ??
              infraction.infractionTypeNo,
            reason: 'infraction',
            originNo: infraction.no
          },
          request
        )
      }
      db.infractions.update(infraction.no, {
        outcome,
        outcomeComment: comment,
        handlerCode: infraction.handlerCode ?? sessionUser(request).code,
        closedAt: nowIso(),
        history: [
          ...infraction.history,
          historyEvent(
            request,
            'closed',
            optionLabel(request.language, 'infractionOutcome', outcome)
          )
        ],
        ...stampModified(request)
      })
      return ok(infractionApiOf(db, infraction.no))
    }
  )
}
