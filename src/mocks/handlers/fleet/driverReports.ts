import {
  DRIVER_REPORT_ACTION_KINDS,
  DRIVER_REPORT_CHANNELS,
  DRIVER_REPORT_KINDS,
  DRIVER_REPORT_SEVERITIES,
  DRIVER_REPORT_STATUSES,
  DRIVER_REPORT_URGENCIES,
  isWithinDelay,
  reportDelayDays,
  type DriverReportActionKind,
  type DriverReportStatus
} from '@/modules/fleet/driver-reports/domain/driverReport'
import type { DriverReportApi } from '@/modules/fleet/driver-reports/types/driverReport.types'
import { DEFAULT_FLEET_SETTINGS } from '@/modules/fleet/fleet-settings/domain/fleetSettings'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DriverReportRow } from '../../fixtures/fleet/driverReports'
import { readBody, registerCrudResource, stampCreated } from '../../http/crudResource'
import { conflict, notFound, unprocessable } from '../../http/errors'
import { readDate, readEnum, readPatch, readString, type FieldReaders } from '../../http/input'
import { requireReference } from '../../http/references'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

export function driverReportsApi(db: MockDatabase): DriverReportApi[] {
  const names = new Map(
    db.employees.all().map((employee) => [employee.no, employeeFullName(employee)])
  )
  const today = todayIso()
  const maxDays =
    fleetSettings(db).safety.reportTargetDays ?? DEFAULT_FLEET_SETTINGS.safety.reportTargetDays
  return db.driverReports.all().map((report) => ({
    ...report,
    employeeName: names.get(report.employeeNo) ?? report.employeeNo,
    delayDays: reportDelayDays(report.occurredOn, report.reportedOn),
    within24h: isWithinDelay(report.occurredOn, report.reportedOn, maxDays),
    late: !!report.dueOn && report.dueOn < today && report.status !== 'closed'
  }))
}

interface Facts {
  occurredOn: string
  reportedOn: string
  dueOn: string | null
  status: DriverReportStatus
  actionText: string
}

/** The rules every report follows, whether it is created or changed. */
function checkFacts(facts: Facts): void {
  const today = todayIso()
  if (facts.occurredOn > today || facts.reportedOn > today) {
    throw unprocessable(FLEET_MESSAGES.driverReportInFuture)
  }
  if (facts.reportedOn < facts.occurredOn) throw unprocessable(FLEET_MESSAGES.driverReportDateOrder)
  if (facts.dueOn && facts.dueOn < facts.reportedOn) {
    throw unprocessable(FLEET_MESSAGES.driverReportDueBeforeReport)
  }
  if (facts.status === 'closed' && !facts.actionText.trim()) {
    throw unprocessable(FLEET_MESSAGES.driverReportCloseNeedsAction)
  }
}

type EditableFields = Pick<
  DriverReportRow,
  | 'subject'
  | 'kind'
  | 'severity'
  | 'urgency'
  | 'channel'
  | 'occurredOn'
  | 'reportedOn'
  | 'description'
  | 'ownerName'
  | 'actionKind'
  | 'actionText'
  | 'dueOn'
  | 'status'
>

const readers: FieldReaders<EditableFields> = {
  subject: (input) => readString(input, 'subject', { required: true }),
  kind: (input) => readEnum(input, 'kind', DRIVER_REPORT_KINDS, { required: true }) ?? 'technical',
  severity: (input) =>
    readEnum(input, 'severity', DRIVER_REPORT_SEVERITIES, { required: true }) ?? 'minor',
  urgency: (input) =>
    readEnum(input, 'urgency', DRIVER_REPORT_URGENCIES, { required: true }) ?? 'observation',
  channel: (input) =>
    readEnum(input, 'channel', DRIVER_REPORT_CHANNELS, { required: true }) ?? 'app',
  occurredOn: (input) => readDate(input, 'occurredOn', { required: true }) ?? '',
  reportedOn: (input) => readDate(input, 'reportedOn', { required: true }) ?? '',
  description: (input) => readString(input, 'description'),
  ownerName: (input) => readString(input, 'ownerName'),
  actionKind: (input) => readEnum(input, 'actionKind', DRIVER_REPORT_ACTION_KINDS) ?? '',
  actionText: (input) => readString(input, 'actionText'),
  dueOn: (input) => readDate(input, 'dueOn'),
  status: (input) => readEnum(input, 'status', DRIVER_REPORT_STATUSES, { required: true }) ?? 'open'
}

export function registerDriverReportsHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: '/fleet/driver-reports',
    feature: 'DRIVERREPORT',
    collection: db.driverReports,
    list: () => driverReportsApi(db),
    searchColumns: ['no', 'employeeName', 'subject'],
    optionFields: {
      kind: 'driverReportKind',
      severity: 'driverReportSeverity',
      urgency: 'driverReportUrgency',
      channel: 'driverReportChannel',
      actionKind: 'driverReportActionKind',
      status: 'driverReportStatus'
    },
    create: (input) => {
      const employeeNo = requireReference(db.employees, input, 'employeeNo')
      if (!isOnStaff(db.employees.findOrFail(employeeNo).status)) {
        throw unprocessable(FLEET_MESSAGES.notOnStaff)
      }
      const occurredOn = readDate(input, 'occurredOn', { required: true }) ?? ''
      const reportedOn = readDate(input, 'reportedOn', { required: true }) ?? ''
      const dueOn = readDate(input, 'dueOn')
      const actionText = readString(input, 'actionText')
      checkFacts({ occurredOn, reportedOn, dueOn, status: 'open', actionText })
      return {
        no: nextNo(
          db.driverReports.all().map((row) => row.no),
          'REM-',
          5
        ),
        employeeNo,
        subject: readString(input, 'subject', { required: true }),
        kind: readEnum(input, 'kind', DRIVER_REPORT_KINDS, { required: true }) ?? 'technical',
        severity:
          readEnum(input, 'severity', DRIVER_REPORT_SEVERITIES, { required: true }) ?? 'minor',
        urgency:
          readEnum(input, 'urgency', DRIVER_REPORT_URGENCIES, { required: true }) ?? 'observation',
        channel: readEnum(input, 'channel', DRIVER_REPORT_CHANNELS, { required: true }) ?? 'app',
        occurredOn,
        reportedOn,
        description: readString(input, 'description'),
        ownerName: readString(input, 'ownerName'),
        actionKind: (readEnum(input, 'actionKind', DRIVER_REPORT_ACTION_KINDS) ?? '') as
          | DriverReportActionKind
          | '',
        actionText,
        dueOn,
        closedOn: null,
        status: (actionText.trim() ? 'in_progress' : 'open') as DriverReportStatus
      }
    },
    update: (existing, input) => {
      if (existing.status === 'closed') throw conflict(FLEET_MESSAGES.driverReportClosed)
      const patch = readPatch(input, readers)
      const merged = { ...existing, ...patch }
      checkFacts(merged)
      return { ...patch, closedOn: merged.status === 'closed' ? todayIso() : null }
    }
  })

  /* From his phone, the driver reports what he met on the road; the report carries his name. */
  function myEmployeeNo(request: MockRequest): string {
    const employeeNo = sessionUser(request).employeeNo
    if (!employeeNo) throw notFound(FLEET_MESSAGES.driverNoEmployee)
    return employeeNo
  }

  router.get('/me/reports', { feature: 'MYSPACE', action: 'read' }, (request) => {
    const employeeNo = myEmployeeNo(request)
    const mine = driverReportsApi(db)
      .filter((report) => report.employeeNo === employeeNo)
      .sort((a, b) => b.reportedOn.localeCompare(a.reportedOn) || b.no.localeCompare(a.no))
    return ok(mine)
  })

  router.post('/me/reports', { feature: 'MYSPACE', action: 'execute' }, (request) => {
    const employeeNo = myEmployeeNo(request)
    if (!isOnStaff(db.employees.findOrFail(employeeNo).status)) {
      throw unprocessable(FLEET_MESSAGES.notOnStaff)
    }
    const body = readBody(request)
    const today = todayIso()
    const occurredOn = readDate(body, 'occurredOn') ?? today
    checkFacts({ occurredOn, reportedOn: today, dueOn: null, status: 'open', actionText: '' })
    const row = db.driverReports.insert(
      stampCreated(
        {
          no: nextNo(
            db.driverReports.all().map((report) => report.no),
            'REM-',
            5
          ),
          employeeNo,
          subject: readString(body, 'subject', { required: true }),
          kind: readEnum(body, 'kind', DRIVER_REPORT_KINDS, { required: true }) ?? 'technical',
          severity: readEnum(body, 'severity', DRIVER_REPORT_SEVERITIES) ?? 'minor',
          urgency: readEnum(body, 'urgency', DRIVER_REPORT_URGENCIES) ?? 'observation',
          channel: 'app',
          occurredOn,
          reportedOn: today,
          description: readString(body, 'description'),
          ownerName: '',
          actionKind: '',
          actionText: '',
          dueOn: null,
          closedOn: null,
          status: 'open'
        },
        request
      )
    )
    return created(driverReportsApi(db).find((report) => report.no === row.no))
  })
}
