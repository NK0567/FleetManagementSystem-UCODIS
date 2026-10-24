import {
  diagnosisGaps,
  downtimeRoleOf,
  fourEyesBlock,
  immobilizesOnDeclaration,
  isWorkable,
  labourHours,
  MAINTENANCE_TYPES,
  MANUAL_ORIGINS,
  MAX_HOURS_PER_DAY,
  WORK_ORDER_ORIGINS,
  WORK_ORDER_SEVERITIES,
  workOrderStatus,
  type MaintenanceType,
  type WorkOrderOrigin,
  type WorkOrderSeverity
} from '@/modules/maintenance/work-orders/domain/workOrder'
import type {
  WorkOrderApi,
  WorkOrderEvent
} from '@/modules/maintenance/work-orders/types/workOrder.types'
import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIsoDateTime, todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { WorkOrderRow } from '../../fixtures/maintenance/workOrders'
import {
  readBody,
  registerCrudResource,
  routeParam,
  stampCreated,
  stampModified
} from '../../http/crudResource'
import { conflict, forbidden, unprocessable } from '../../http/errors'
import { readDate, readDateTime, readEnum, readNumber, readString } from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'
import { maintenanceSettings } from './settings'

/** Shortest account of what was done that the workshop accepts. */
const MIN_TEXT = 10

export function workOrdersApi(db: MockDatabase): WorkOrderApi[] {
  const rate = maintenanceSettings(db).labour.hourlyRate
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const codes = new Map(db.failureCodes.all().map((code) => [code.no, code.name]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  return db.workOrders.all().map((row) => {
    const hours = labourHours(row.labour)
    const labourCost = Math.round(hours * rate)
    return {
      ...row,
      vehiclePlate: plates.get(row.vehicleNo) ?? row.vehicleNo,
      subsystemName: row.diagnosis ? (codes.get(row.diagnosis.subsystemNo) ?? '') : '',
      modeName: row.diagnosis?.modeNo ? (codes.get(row.diagnosis.modeNo) ?? '') : '',
      causeName: row.diagnosis?.causeNo ? (codes.get(row.diagnosis.causeNo) ?? '') : '',
      technicianNames: [...new Set(row.labour.map((line) => line.technicianNo))]
        .map((no) => names.get(no) ?? no)
        .join(', '),
      labourHours: hours,
      labourCost,
      totalCost: labourCost,
      diagnosedAt: row.diagnosis?.at ?? null,
      status: workOrderStatus({ ...row, diagnosedAt: row.diagnosis?.at ?? null })
    }
  })
}

function workOrderApiOf(db: MockDatabase, no: string) {
  return workOrdersApi(db).find((row) => row.no === no)
}

function event(request: MockRequest, kind: WorkOrderEvent['kind'], comment = ''): WorkOrderEvent {
  return { at: nowIso(), by: sessionUser(request).code, kind, comment }
}

/** Keeps the vehicle out from `at`, under the cause the application uses for this kind of order. */
function openDowntime(
  db: MockDatabase,
  order: Pick<WorkOrderRow, 'no' | 'vehicleNo' | 'maintenanceType' | 'origin' | 'symptom'>,
  at: string,
  request: MockRequest
): string {
  const role = downtimeRoleOf(order)
  const code = db.downtimeCodes.all().find((row) => row.systemRole === role)
  if (!code) throw unprocessable(MAINTENANCE_MESSAGES.downtimeRoleMissing)
  const no = nextNo(
    db.downtimes.all().map((row) => row.no),
    'IND-',
    5
  )
  db.downtimes.insert(
    stampCreated(
      {
        no,
        vehicleNo: order.vehicleNo,
        downtimeCodeNo: code.no,
        origin: 'work_order' as const,
        startedAt: at,
        comment: `${order.no} · ${order.symptom}`,
        endedAt: null,
        endedBy: null,
        endComment: ''
      },
      request
    )
  )
  return no
}

function endDowntime(db: MockDatabase, downtimeNo: string | null, at: string, by: string) {
  const downtime = downtimeNo ? db.downtimes.find(downtimeNo) : undefined
  if (!downtime || downtime.endedAt) return
  db.downtimes.update(downtime.no, { endedAt: at, endedBy: by, endComment: '' })
}

export interface WorkOrderRequest {
  vehicleNo: string
  maintenanceType: MaintenanceType
  severity: WorkOrderSeverity
  origin: WorkOrderOrigin
  originNo: string | null
  symptom: string
  declaredAt: string
}

/** The one way an order is built, by hand or from a check, a claim or a telematics event. */
function buildWorkOrder(db: MockDatabase, order: WorkOrderRequest, request: MockRequest) {
  const vehicle = db.vehicles.findOrFail(order.vehicleNo)
  if (vehicle.removal) throw unprocessable(MAINTENANCE_MESSAGES.vehicleRemoved)
  if (order.symptom.trim().length < MIN_TEXT) {
    throw unprocessable(MAINTENANCE_MESSAGES.symptomTooShort, { min: MIN_TEXT })
  }
  if (order.declaredAt > nowIsoDateTime()) throw unprocessable(MAINTENANCE_MESSAGES.dateInFuture)
  const year = order.declaredAt.slice(0, 4)
  const no = nextNo(
    db.workOrders.all().map((row) => row.no),
    `OT-${year}-`,
    4
  )
  const draft = { ...order, no, symptom: order.symptom.trim() }
  const row: Omit<WorkOrderRow, 'createdAt' | 'createdBy' | 'modifiedAt' | 'modifiedBy'> = {
    ...draft,
    declaredBy: sessionUser(request).code,
    odometerKmAtOpening: vehicle.odometerKm,
    diagnosis: null,
    labour: [],
    startedAt: null,
    completedAt: null,
    completedBy: null,
    workDone: '',
    odometerKmAtCompletion: null,
    validatedAt: null,
    validatedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: '',
    downtimeNo: immobilizesOnDeclaration(order)
      ? openDowntime(db, draft, order.declaredAt, request)
      : null,
    history: [event(request, 'declared')]
  }
  return row
}

export function createWorkOrder(
  db: MockDatabase,
  order: WorkOrderRequest,
  request: MockRequest
): WorkOrderRow {
  return db.workOrders.insert(stampCreated(buildWorkOrder(db, order, request), request))
}

export function registerWorkOrdersHandlers(router: MockRouter, db: MockDatabase): void {
  function workable(no: string) {
    const order = db.workOrders.findOrFail(no)
    const status = workOrderStatus({ ...order, diagnosedAt: order.diagnosis?.at ?? null })
    if (!isWorkable(status)) throw conflict(MAINTENANCE_MESSAGES.workOrderNotWorkable)
    return order
  }

  /** Starting the work stops the vehicle, if the declaration did not already. */
  function start(order: WorkOrderRow, request: MockRequest) {
    if (order.startedAt) return {}
    const at = nowIsoDateTime()
    return {
      startedAt: at,
      downtimeNo: order.downtimeNo ?? openDowntime(db, order, at, request),
      history: [...order.history, event(request, 'started')]
    }
  }

  function readDiagnosisCode(input: Record<string, unknown>, field: string, kind: string) {
    const no = optionalReference(db.failureCodes, input, field)
    if (no && db.failureCodes.findOrFail(no).kind !== kind) {
      throw unprocessable(MAINTENANCE_MESSAGES.diagnosisCodeKind, { field })
    }
    return no
  }

  const respond = (no: string) => ok(workOrderApiOf(db, no))

  registerCrudResource(router, {
    basePath: '/maintenance/work-orders',
    feature: 'WORKORDER',
    collection: db.workOrders,
    list: () => workOrdersApi(db),
    searchColumns: ['no', 'vehiclePlate', 'symptom'],
    optionFields: {
      maintenanceType: 'maintenanceType',
      severity: 'workOrderSeverity',
      origin: 'workOrderOrigin',
      status: 'workOrderStatus'
    },
    create: (input, request) => {
      const origin = readEnum(input, 'origin', WORK_ORDER_ORIGINS, { required: true })
      if (!origin || !MANUAL_ORIGINS.includes(origin)) {
        throw unprocessable(MAINTENANCE_MESSAGES.workOrderOriginNotManual)
      }
      return buildWorkOrder(
        db,
        {
          vehicleNo: requireReference(db.vehicles, input, 'vehicleNo'),
          maintenanceType:
            readEnum(input, 'maintenanceType', MAINTENANCE_TYPES, { required: true }) ??
            'corrective',
          severity:
            readEnum(input, 'severity', WORK_ORDER_SEVERITIES, { required: true }) ?? 'major',
          origin,
          originNo: null,
          symptom: readString(input, 'symptom', { required: true }),
          declaredAt: readDateTime(input, 'declaredAt') ?? nowIsoDateTime()
        },
        request
      )
    },
    // The symptom and the severity can be corrected until the work starts.
    update: (existing, input, request) => {
      if (existing.startedAt || !isWorkable(workOrderApiOf(db, existing.no)!.status)) {
        throw conflict(MAINTENANCE_MESSAGES.workOrderNotEditable)
      }
      const symptom = 'symptom' in input ? readString(input, 'symptom', { required: true }) : null
      if (symptom !== null && symptom.length < MIN_TEXT) {
        throw unprocessable(MAINTENANCE_MESSAGES.symptomTooShort, { min: MIN_TEXT })
      }
      const severity = readEnum(input, 'severity', WORK_ORDER_SEVERITIES) ?? existing.severity
      const next = { ...existing, severity }
      const downtimeNo =
        !existing.downtimeNo && immobilizesOnDeclaration(next)
          ? openDowntime(db, existing, nowIsoDateTime(), request)
          : existing.downtimeNo
      return { ...(symptom !== null ? { symptom } : {}), severity, downtimeNo }
    }
  })

  router.post(
    '/maintenance/work-orders/:no/diagnose',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      const body = readBody(request)
      const diagnosis = {
        subsystemNo: readDiagnosisCode(body, 'subsystemNo', 'subsystem'),
        modeNo: readDiagnosisCode(body, 'modeNo', 'mode'),
        causeNo: readDiagnosisCode(body, 'causeNo', 'cause')
      }
      const gaps = diagnosisGaps(order.maintenanceType, diagnosis)
      if (gaps.length) {
        throw unprocessable(MAINTENANCE_MESSAGES.diagnosisIncomplete, { fields: gaps.join(', ') })
      }
      db.workOrders.update(order.no, {
        diagnosis: {
          subsystemNo: diagnosis.subsystemNo ?? '',
          modeNo: diagnosis.modeNo,
          causeNo: diagnosis.causeNo,
          by: sessionUser(request).code,
          at: nowIsoDateTime()
        },
        history: [...order.history, event(request, 'diagnosed')],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/start',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      if (order.startedAt) throw conflict(MAINTENANCE_MESSAGES.workOrderAlreadyStarted)
      db.workOrders.update(order.no, { ...start(order, request), ...stampModified(request) })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/labour',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      const body = readBody(request)
      const technicianNo = requireReference(db.technicians, body, 'technicianNo')
      if (!db.technicians.findOrFail(technicianNo).active) {
        throw unprocessable(MAINTENANCE_MESSAGES.technicianInactive)
      }
      const date = readDate(body, 'date', { required: true }) ?? todayIso()
      if (date > todayIso() || date < order.declaredAt.slice(0, 10)) {
        throw unprocessable(MAINTENANCE_MESSAGES.labourDateInvalid)
      }
      const hours =
        readNumber(body, 'hours', { required: true, min: 0.25, max: MAX_HOURS_PER_DAY }) ?? 0
      const sameDay = db.workOrders
        .all()
        .flatMap((row) => row.labour)
        .filter((line) => line.technicianNo === technicianNo && line.date === date)
        .reduce((total, line) => total + line.hours, 0)
      if (sameDay + hours > MAX_HOURS_PER_DAY) {
        throw unprocessable(MAINTENANCE_MESSAGES.labourDayFull, {
          max: MAX_HOURS_PER_DAY,
          logged: sameDay
        })
      }
      const started = start(order, request)
      db.workOrders.update(order.no, {
        ...started,
        labour: [
          ...order.labour,
          { technicianNo, date, hours, loggedBy: sessionUser(request).code }
        ],
        history: [
          ...(started.history ?? order.history),
          event(request, 'labour', `${technicianNo} · ${hours} h`)
        ],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/complete',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      const body = readBody(request)
      if (!order.diagnosis) throw unprocessable(MAINTENANCE_MESSAGES.diagnosisMissing)
      if (!order.labour.length) throw unprocessable(MAINTENANCE_MESSAGES.labourMissing)
      const workDone = readString(body, 'workDone', { required: true })
      if (workDone.length < MIN_TEXT) {
        throw unprocessable(MAINTENANCE_MESSAGES.workDoneTooShort, { min: MIN_TEXT })
      }
      const vehicle = db.vehicles.findOrFail(order.vehicleNo)
      const odometerKm = readNumber(body, 'odometerKm', { required: true, min: 0 }) ?? 0
      if (odometerKm < (order.odometerKmAtOpening ?? 0)) {
        throw unprocessable(MAINTENANCE_MESSAGES.odometerBackwards, {
          km: order.odometerKmAtOpening ?? 0
        })
      }
      const code = sessionUser(request).code
      if (odometerKm > vehicle.odometerKm) {
        db.vehicles.update(vehicle.no, {
          odometerKm,
          odometerReadings: [
            ...vehicle.odometerReadings,
            { readAt: nowIso(), km: odometerKm, source: 'work_order' as const, recordedBy: code }
          ]
        })
      }
      db.workOrders.update(order.no, {
        completedAt: nowIsoDateTime(),
        completedBy: code,
        workDone,
        odometerKmAtCompletion: odometerKm,
        history: [...order.history, event(request, 'completed')],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  function awaitingValidation(no: string) {
    const order = db.workOrders.findOrFail(no)
    if (!order.completedAt || order.validatedAt || order.cancelledAt) {
      throw conflict(MAINTENANCE_MESSAGES.workOrderNotAwaitingValidation)
    }
    return order
  }

  router.post(
    '/maintenance/work-orders/:no/validate',
    { feature: 'WORKORDER', action: 'execute' },
    (request) => {
      const order = awaitingValidation(routeParam(request, 'no'))
      const user = sessionUser(request)
      const block = fourEyesBlock({ code: user.code, employeeNo: user.employeeNo ?? null }, order)
      if (block) throw forbidden(MAINTENANCE_MESSAGES.fourEyes)
      const at = nowIsoDateTime()
      endDowntime(db, order.downtimeNo, at, user.code)
      db.workOrders.update(order.no, {
        validatedAt: at,
        validatedBy: user.code,
        history: [...order.history, event(request, 'validated')],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/refuse',
    { feature: 'WORKORDER', action: 'execute' },
    (request) => {
      const order = awaitingValidation(routeParam(request, 'no'))
      const user = sessionUser(request)
      if (fourEyesBlock({ code: user.code, employeeNo: user.employeeNo ?? null }, order)) {
        throw forbidden(MAINTENANCE_MESSAGES.fourEyes)
      }
      const reason = readString(readBody(request), 'reason')
      if (reason.length < MIN_TEXT) {
        throw unprocessable(MAINTENANCE_MESSAGES.reasonTooShort, { min: MIN_TEXT })
      }
      db.workOrders.update(order.no, {
        completedAt: null,
        completedBy: null,
        history: [...order.history, event(request, 'refused', reason)],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/cancel',
    { feature: 'WORKORDER', action: 'execute' },
    (request) => {
      const order = db.workOrders.findOrFail(routeParam(request, 'no'))
      if (order.validatedAt || order.cancelledAt) {
        throw conflict(MAINTENANCE_MESSAGES.workOrderFinished)
      }
      const reason = readString(readBody(request), 'reason')
      if (reason.length < MIN_TEXT) {
        throw unprocessable(MAINTENANCE_MESSAGES.reasonTooShort, { min: MIN_TEXT })
      }
      const at = nowIsoDateTime()
      const by = sessionUser(request).code
      endDowntime(db, order.downtimeNo, at, by)
      db.workOrders.update(order.no, {
        cancelledAt: at,
        cancelledBy: by,
        cancelReason: reason,
        history: [...order.history, event(request, 'cancelled', reason)],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )
}
