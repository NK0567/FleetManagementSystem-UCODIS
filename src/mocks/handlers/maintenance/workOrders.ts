import {
  diagnosisGaps,
  downtimeRoleOf,
  fourEyesBlock,
  immobilizesOnDeclaration,
  isAtExternalWorkshop,
  isWorkable,
  labourHours,
  MAINTENANCE_TYPES,
  MANUAL_ORIGINS,
  MAX_HOURS_PER_DAY,
  subcontractingCost,
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
import {
  readDate,
  readDateTime,
  readEnum,
  readNumber,
  readString,
  readStringList
} from '../../http/input'
import { optionalReference, requireReference } from '../../http/references'
import { created, ok } from '../../http/responses'
import { importRows, vehicleByPlate } from '../../http/importRows'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { MAINTENANCE_MESSAGES } from './messages'
import { recordPassages } from './serviceRecords'
import { engineHoursByVehicle } from './engineHours'
import { driverVehicle } from '../fleet/driverVehicle'
import { SOURCED_ORIGINS, sourceRequest } from './workOrderSources'
import { addMovement } from './stockLedger'
import { technicianIssue } from '@/modules/maintenance/workshop-load/domain/workshopLoad'
import { maintenanceSettings } from './settings'
import { leadTimeDays } from '@/modules/maintenance/purchase-requests/domain/purchaseRequest'
import {
  proposeSubsystem,
  type SubsystemKeywords
} from '@/modules/maintenance/work-orders/domain/historyImport'

/** How the workshop names the work on each subsystem, to read the former books. */
const SUBSYSTEM_KEYWORDS: SubsystemKeywords = {
  ENGINE: ['vidange', 'huile', 'courroie', 'injecteur', 'culasse', 'distribution'],
  TRANSMISSION: ['embrayage', 'boite', 'pont', 'cardan'],
  AIR: ['compresseur', 'dessiccateur'],
  'FUEL-SYSTEM': ['gazole', 'gasoil', 'carburant', 'injection'],
  COOLING: ['radiateur', 'thermostat', 'durite'],
  BRAKES: ['frein', 'plaquette', 'garniture', 'disque', 'tambour'],
  STEERING: ['amortisseur', 'rotule', 'ressort', 'lame', 'suspension'],
  WHEELS: ['roue', 'roulement', 'moyeu', 'pneu'],
  ELECTRONICS: ['batterie', 'alternateur', 'demarreur', 'eclairage', 'feux'],
  CHASSIS: ['chassis', 'tole', 'carrosserie', 'sellette', 'attelage'],
  TANK: ['citerne', 'vanne', 'compartiment', 'clapet', 'soupape']
}

/** Shortest account of what was done that the workshop accepts. */
const MIN_TEXT = 10

export function workOrdersApi(db: MockDatabase): WorkOrderApi[] {
  const rate = maintenanceSettings(db).labour.hourlyRate
  const plates = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
  const codes = new Map(db.failureCodes.all().map((code) => [code.no, code.name]))
  const providers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const now = nowIso()
  const waits = new Map<string, number>()
  for (const purchase of db.purchaseRequests.all()) {
    if (!purchase.workOrderNo || !purchase.orderedAt || purchase.cancelledAt) continue
    const days = leadTimeDays(purchase.orderedAt, purchase.receivedAt ?? now) ?? 0
    waits.set(purchase.workOrderNo, (waits.get(purchase.workOrderNo) ?? 0) + days)
  }
  return db.workOrders.all().map((row) => {
    const hours = labourHours(row.labour)
    const labourCost = Math.round(hours * rate)
    const subcontracting = subcontractingCost(row.external)
    const received = row.parts.filter((part) => part.receivedAt)
    const partsCost = received.reduce((total, part) => total + part.quantity * part.unitPrice, 0)
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
      providerName: row.external ? (providers.get(row.external.providerNo) ?? '') : '',
      subcontractingCost: subcontracting,
      partsCost,
      pendingPartCount: row.parts.length - received.length,
      partsWaitDays: Math.round((waits.get(row.no) ?? 0) * 10) / 10,
      nomenclature: row.nomenclature ?? null,
      nomenclatureState: row.nomenclature
        ? row.nomenclature.confirmedAt
          ? ('confirmed' as const)
          : ('to_confirm' as const)
        : null,
      proposedSubsystemName: row.nomenclature?.proposedSubsystemNo
        ? (codes.get(row.nomenclature.proposedSubsystemNo) ?? '')
        : '',
      totalCost: labourCost + partsCost + subcontracting + (row.historicalCost ?? 0),
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
export function openDowntime(
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
  serviceOperationNos?: string[]
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
    parts: [],
    planning: null,
    external: null,
    historicalCost: null,
    serviceOperationNos: order.serviceOperationNos ?? [],
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
  function start(order: WorkOrderRow, request: MockRequest, at = nowIsoDateTime()) {
    if (order.startedAt) return {}
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

  /** What an inside and an outside finish both require: a diagnosis, the work done, the odometer. */
  function readCompletion(order: WorkOrderRow, body: Record<string, unknown>) {
    if (!order.diagnosis) throw unprocessable(MAINTENANCE_MESSAGES.diagnosisMissing)
    if (order.parts.some((part) => !part.receivedAt)) {
      throw unprocessable(MAINTENANCE_MESSAGES.partsPending)
    }
    const workDone = readString(body, 'workDone', { required: true })
    if (workDone.length < MIN_TEXT) {
      throw unprocessable(MAINTENANCE_MESSAGES.workDoneTooShort, { min: MIN_TEXT })
    }
    const odometerKm = readNumber(body, 'odometerKm', { required: true, min: 0 }) ?? 0
    if (odometerKm < (order.odometerKmAtOpening ?? 0)) {
      throw unprocessable(MAINTENANCE_MESSAGES.odometerBackwards, {
        km: order.odometerKmAtOpening ?? 0
      })
    }
    return { workDone, odometerKm }
  }

  function recordOdometer(vehicleNo: string, odometerKm: number, by: string) {
    const vehicle = db.vehicles.findOrFail(vehicleNo)
    if (odometerKm <= vehicle.odometerKm) return
    db.vehicles.update(vehicle.no, {
      odometerKm,
      odometerReadings: [
        ...vehicle.odometerReadings,
        { readAt: nowIso(), km: odometerKm, source: 'work_order' as const, recordedBy: by }
      ]
    })
  }

  function atExternalWorkshop(no: string) {
    const order = workable(no)
    if (!order.external || !isAtExternalWorkshop(order)) {
      throw conflict(MAINTENANCE_MESSAGES.workOrderNotAtWorkshop)
    }
    return { ...order, external: order.external }
  }

  function readAmount(body: Record<string, unknown>, field: string): number | null {
    const value = body[field]
    if (value === null || value === undefined || value === '') return null
    return readNumber(body, field, { min: 0 }) ?? null
  }

  function readExpectedReturn(body: Record<string, unknown>, handedOverAt: string) {
    const expectedReturnOn = readDate(body, 'expectedReturnOn') ?? null
    if (expectedReturnOn && expectedReturnOn < handedOverAt.slice(0, 10)) {
      throw unprocessable(MAINTENANCE_MESSAGES.expectedReturnBeforeHandOver)
    }
    return expectedReturnOn
  }

  // Planning is for the inside workshop: whoever is put on the job must be active and competent for it.
  router.post(
    '/maintenance/work-orders/:no/plan',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      if (order.external) throw conflict(MAINTENANCE_MESSAGES.workOrderExternal)
      const body = readBody(request)
      const date = readDate(body, 'date', { required: true }) ?? todayIso()
      if (date < todayIso()) throw unprocessable(MAINTENANCE_MESSAGES.planDateInPast)
      const estimatedHours =
        readNumber(body, 'estimatedHours', { required: true, min: 0.25, max: 500 }) ?? 0
      const technicianNos = [...new Set(readStringList(body, 'technicianNos'))]
      if (!technicianNos.length) throw unprocessable(MAINTENANCE_MESSAGES.planTechnicianMissing)
      const competenceNo = order.diagnosis
        ? (db.failureCodes.find(order.diagnosis.subsystemNo)?.competenceNo ?? null)
        : null
      for (const no of technicianNos) {
        const technician = db.technicians.findOrFail(no)
        const issue = technicianIssue(technician, competenceNo)
        if (issue === 'inactive') throw unprocessable(MAINTENANCE_MESSAGES.technicianInactive)
        if (issue === 'competence') {
          throw unprocessable(MAINTENANCE_MESSAGES.technicianNotCompetent, {
            competence: db.competences.find(competenceNo ?? '')?.name ?? competenceNo ?? ''
          })
        }
      }
      db.workOrders.update(order.no, {
        planning: { date, estimatedHours, technicianNos },
        history: [...order.history, event(request, 'planned', `${date} · ${estimatedHours} h`)],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/take-part',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      const body = readBody(request)
      const item = db.stockItems.findOrFail(requireReference(db.stockItems, body, 'itemNo'))
      if (!item.active) throw unprocessable(MAINTENANCE_MESSAGES.stockItemInactive)
      const quantity = readNumber(body, 'quantity', { required: true, min: 1 }) ?? 0
      if (!Number.isInteger(quantity)) throw unprocessable(MAINTENANCE_MESSAGES.adjustmentInvalid)
      const movement = addMovement(
        db,
        {
          itemNo: item.no,
          kind: 'out',
          delta: -quantity,
          unitPrice: item.unitPrice,
          reason: order.symptom,
          workOrderNo: order.no,
          purchaseRequestNo: null
        },
        request
      )
      db.workOrders.update(order.no, {
        parts: [
          ...order.parts,
          {
            itemNo: item.no,
            label: item.name,
            quantity,
            unitPrice: item.unitPrice,
            purchaseRequestNo: null,
            receivedAt: movement.at
          }
        ],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/hand-over',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = workable(routeParam(request, 'no'))
      if (order.external) throw conflict(MAINTENANCE_MESSAGES.workOrderAlreadyExternal)
      const body = readBody(request)
      const provider = db.providers.findOrFail(requireReference(db.providers, body, 'providerNo'))
      if (provider.providerType !== 'garage' || !provider.authorized) {
        throw unprocessable(MAINTENANCE_MESSAGES.garageNotAuthorized, { name: provider.name })
      }
      const handedOverAt = readDateTime(body, 'handedOverAt') ?? nowIsoDateTime()
      if (handedOverAt > nowIsoDateTime() || handedOverAt < order.declaredAt) {
        throw unprocessable(MAINTENANCE_MESSAGES.handOverDateInvalid)
      }
      const started = start(order, request, handedOverAt)
      db.workOrders.update(order.no, {
        ...started,
        external: {
          providerNo: provider.no,
          handedOverAt,
          expectedReturnOn: readExpectedReturn(body, handedOverAt),
          quoteAmount: readAmount(body, 'quoteAmount'),
          progress: '',
          returnedAt: null,
          finalAmount: null
        },
        history: [
          ...(started.history ?? order.history),
          event(request, 'handed_over', provider.name)
        ],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  router.post(
    '/maintenance/work-orders/:no/external-progress',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = atExternalWorkshop(routeParam(request, 'no'))
      const body = readBody(request)
      const external = {
        ...order.external,
        progress: 'progress' in body ? readString(body, 'progress') : order.external.progress,
        expectedReturnOn:
          'expectedReturnOn' in body
            ? readExpectedReturn(body, order.external.handedOverAt)
            : order.external.expectedReturnOn,
        quoteAmount:
          'quoteAmount' in body ? readAmount(body, 'quoteAmount') : order.external.quoteAmount
      }
      db.workOrders.update(order.no, {
        external,
        history: [...order.history, event(request, 'external_update', external.progress)],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  // The garage's account of the work is the declared finish; the vehicle stays unavailable until the closing is validated.
  router.post(
    '/maintenance/work-orders/:no/return',
    { feature: 'WORKORDER', action: 'update' },
    (request) => {
      const order = atExternalWorkshop(routeParam(request, 'no'))
      const body = readBody(request)
      const { workDone, odometerKm } = readCompletion(order, body)
      const returnedAt = readDateTime(body, 'returnedAt') ?? nowIsoDateTime()
      if (returnedAt > nowIsoDateTime() || returnedAt < order.external.handedOverAt) {
        throw unprocessable(MAINTENANCE_MESSAGES.returnDateInvalid)
      }
      const code = sessionUser(request).code
      recordOdometer(order.vehicleNo, odometerKm, code)
      db.workOrders.update(order.no, {
        external: { ...order.external, returnedAt, finalAmount: readAmount(body, 'finalAmount') },
        completedAt: returnedAt,
        completedBy: code,
        workDone,
        odometerKmAtCompletion: odometerKm,
        history: [...order.history, event(request, 'returned')],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  // History from former books goes through the same door as a new order, then is closed as it was.
  router.post(
    '/maintenance/work-orders/import',
    { feature: 'WORKORDER', action: 'execute' },
    (request) => {
      const vehicleOf = vehicleByPlate(db)
      const code = sessionUser(request).code
      const subsystems = db.failureCodes
        .all()
        .filter((item) => item.kind === 'subsystem' && item.active)
      return ok(
        importRows(readBody(request).rows, request, (input) => {
          const vehicleNo = vehicleOf(readString(input, 'plate'))
          const doneOn = readDate(input, 'doneOn', { required: true }) ?? todayIso()
          const maintenanceType =
            readEnum(input, 'maintenanceType', ['corrective', 'preventive'] as const, {
              required: true
            }) ?? 'corrective'
          const workDone = readString(input, 'workDone', { required: true })
          const cost = readNumber(input, 'cost', { required: true, min: 0 }) ?? 0
          const km = readNumber(input, 'odometerKm', { min: 0 }) ?? null
          const category = readString(input, 'category')
          const at = `${doneOn}T08:00:00`
          const order = createWorkOrder(
            db,
            {
              vehicleNo,
              maintenanceType,
              severity: 'minor',
              origin: 'history',
              originNo: null,
              symptom: workDone,
              declaredAt: at
            },
            request
          )
          db.workOrders.update(order.no, {
            odometerKmAtOpening: km,
            odometerKmAtCompletion: km,
            startedAt: at,
            completedAt: at,
            completedBy: code,
            workDone,
            validatedAt: at,
            validatedBy: code,
            historicalCost: cost,
            // A person confirms the proposed subsystem before the order counts by subsystem.
            nomenclature: {
              sourceText: category || workDone,
              proposedSubsystemNo: proposeSubsystem(
                [category, workDone],
                subsystems,
                SUBSYSTEM_KEYWORDS
              ),
              confirmedBy: null,
              confirmedAt: null
            }
          })
          return order.no
        })
      )
    }
  )

  // The person who imports the history confirms or corrects the proposed subsystem, one order at a time.
  router.post(
    '/maintenance/work-orders/:no/confirm-nomenclature',
    { feature: 'WORKORDER', action: 'execute' },
    (request) => {
      const order = db.workOrders.findOrFail(routeParam(request, 'no'))
      if (!order.nomenclature || order.nomenclature.confirmedAt) {
        throw conflict(MAINTENANCE_MESSAGES.nomenclatureNotPending)
      }
      const subsystemNo = readDiagnosisCode(readBody(request), 'subsystemNo', 'subsystem')
      if (!subsystemNo) throw unprocessable(MAINTENANCE_MESSAGES.nomenclatureSubsystemMissing)
      const user = sessionUser(request).code
      const at = nowIsoDateTime()
      db.workOrders.update(order.no, {
        nomenclature: { ...order.nomenclature, confirmedBy: user, confirmedAt: at },
        diagnosis: { subsystemNo, modeNo: null, causeNo: null, by: user, at },
        history: [
          ...order.history,
          event(request, 'nomenclature', db.failureCodes.find(subsystemNo)?.name ?? subsystemNo)
        ],
        ...stampModified(request)
      })
      return respond(order.no)
    }
  )

  // The driver reports a breakdown of his own vehicle from his phone: it opens a repair order at once.
  router.post('/me/breakdowns', { feature: 'MYSPACE', action: 'execute' }, (request) => {
    const { vehicleNo } = driverVehicle(db, request)
    const body = readBody(request)
    const order = createWorkOrder(
      db,
      {
        vehicleNo,
        maintenanceType: 'corrective',
        severity: readEnum(body, 'severity', WORK_ORDER_SEVERITIES, { required: true }) ?? 'major',
        origin: 'driver_report',
        originNo: null,
        symptom: readString(body, 'symptom', { required: true }),
        declaredAt: nowIsoDateTime()
      },
      request
    )
    return created(myBreakdown(order.no))
  })

  router.get('/me/breakdowns', { feature: 'MYSPACE', action: 'read' }, (request) => {
    const code = sessionUser(request).code
    return ok(
      workOrdersApi(db)
        .filter((order) => order.declaredBy === code)
        .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt))
        .slice(0, 5)
        .map((order) => myBreakdown(order.no))
    )
  })

  /** What the driver sees of an order he reported: no cost, no workshop detail. */
  function myBreakdown(no: string) {
    const order = workOrderApiOf(db, no)!
    return {
      no: order.no,
      vehiclePlate: order.vehiclePlate,
      symptom: order.symptom,
      severity: order.severity,
      declaredAt: order.declaredAt,
      status: order.status
    }
  }

  // An order opened from a fleet record takes its vehicle, severity and symptom from it.
  router.post(
    '/maintenance/work-orders/from-source',
    { feature: 'WORKORDER', action: 'insert' },
    (request) => {
      const body = readBody(request)
      const origin = readEnum(body, 'origin', SOURCED_ORIGINS, { required: true }) ?? 'claim'
      const originNo = readString(body, 'originNo', { required: true })
      const order = createWorkOrder(
        db,
        sourceRequest(db, origin, originNo, request.language),
        request
      )
      return created(workOrderApiOf(db, order.no))
    }
  )

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
      status: 'workOrderStatus',
      nomenclatureState: 'nomenclatureState'
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
      if (order.external) throw conflict(MAINTENANCE_MESSAGES.workOrderExternal)
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
      if (order.external) throw conflict(MAINTENANCE_MESSAGES.workOrderExternal)
      if (order.diagnosis && !order.labour.length) {
        throw unprocessable(MAINTENANCE_MESSAGES.labourMissing)
      }
      const { workDone, odometerKm } = readCompletion(order, readBody(request))
      const code = sessionUser(request).code
      recordOdometer(order.vehicleNo, odometerKm, code)
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
      recordPassages(
        db,
        order.serviceOperationNos.map((operationNo) => ({
          vehicleNo: order.vehicleNo,
          operationNo,
          km: order.odometerKmAtCompletion,
          hours: engineHoursByVehicle(db).get(order.vehicleNo) ?? null,
          date: (order.completedAt ?? at).slice(0, 10),
          workOrderNo: order.no
        })),
        request
      )
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
      // A refused outside job goes back to the garage; the vehicle never stopped being unavailable.
      const backToGarage = order.external
        ? { external: { ...order.external, returnedAt: null, finalAmount: null } }
        : {}
      db.workOrders.update(order.no, {
        ...backToGarage,
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
