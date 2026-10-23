import {
  CONTRACT_TYPES,
  GENDERS,
  ID_DOCUMENT_TYPES,
  MARITAL_STATUSES
} from '@/modules/hr/employees/types/employee.types'
import { MANUAL_EMPLOYEE_STATUSES, statusNeedsReason } from '@/modules/hr/employees/domain/employee'
import { isValidEmail } from '@/utils/email'
import { todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { conflict, unprocessable } from '../../http/errors'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import {
  invalidField,
  readAll,
  readBoolean,
  readDate,
  readEnum,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser, type MockRequest } from '../../http/types'
import { COMPANY } from '../../fixtures/company'
import type { EmployeeRow } from '../../fixtures/hr/employees'
import { HR_MESSAGES } from './messages'
import { requireReference } from '../../http/references'
import { employeesApi } from './views'

/** Fields typed in the form; status, exit and driving authorization have their own actions. */
type EditableFields = Pick<
  EmployeeRow,
  | 'firstName'
  | 'lastName'
  | 'jobPositionNo'
  | 'orgUnitNo'
  | 'categoryNo'
  | 'siteCode'
  | 'phone'
  | 'email'
  | 'nationalId'
  | 'idDocumentType'
  | 'birthDate'
  | 'birthPlace'
  | 'gender'
  | 'maritalStatus'
  | 'contractType'
  | 'hireDate'
>

export function registerEmployeeHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    firstName: (input) => readString(input, 'firstName', { required: true }),
    lastName: (input) => readString(input, 'lastName', { required: true }),
    jobPositionNo: (input) => requireReference(db.jobPositions, input, 'jobPositionNo'),
    orgUnitNo: (input) => requireReference(db.orgUnits, input, 'orgUnitNo'),
    categoryNo: (input) => requireReference(db.employeeCategories, input, 'categoryNo'),
    siteCode: (input) => requireReference(db.sites, input, 'siteCode'),
    phone: (input) => readString(input, 'phone', { required: true }),
    email: (input) => {
      const email = readString(input, 'email')
      if (email && !isValidEmail(email)) throw invalidField('email')
      return email
    },
    nationalId: (input) => readString(input, 'nationalId', { required: true }),
    idDocumentType: (input) => readEnum(input, 'idDocumentType', ID_DOCUMENT_TYPES),
    birthDate: (input) => readDate(input, 'birthDate'),
    birthPlace: (input) => readString(input, 'birthPlace'),
    gender: (input) => readEnum(input, 'gender', GENDERS),
    maritalStatus: (input) => readEnum(input, 'maritalStatus', MARITAL_STATUSES),
    contractType: (input) =>
      readEnum(input, 'contractType', CONTRACT_TYPES, { required: true }) ?? 'permanent',
    hireDate: (input) => readDate(input, 'hireDate', { required: true }) ?? todayIso()
  }

  /** One identity document per person, checked on creation as well as on every change. */
  function assertUniqueNationalId(nationalId: string | undefined, ownNo: string | null) {
    if (!nationalId) return
    const owner = db.employees
      .all()
      .find((employee) => employee.nationalId === nationalId && employee.no !== ownNo)
    if (owner) {
      throw conflict(
        HR_MESSAGES.duplicateNationalId,
        { no: owner.no },
        { duplicateField: 'nationalId', duplicateValue: owner.no }
      )
    }
  }

  function findEditable(request: MockRequest): EmployeeRow {
    const employee = db.employees.findOrFail(routeParam(request, 'no'))
    if (employee.status === 'archived') throw conflict(HR_MESSAGES.employeeArchived)
    return employee
  }

  const apiRecord = (no: string) => employeesApi(db).find((employee) => employee.no === no)

  registerCrudResource(router, {
    basePath: '/hr/employees',
    feature: 'EMPLOYEE',
    collection: db.employees,
    list: () => employeesApi(db),
    searchColumns: ['no', 'fullName', 'nationalId', 'phone'],
    optionFields: {
      status: 'employeeStatus',
      contractType: 'contractType',
      gender: 'gender',
      maritalStatus: 'maritalStatus',
      idDocumentType: 'idDocumentType'
    },
    create: (input) => {
      const fields = readAll(input, readers)
      assertUniqueNationalId(fields.nationalId, null)
      return {
        no: nextNo(
          db.employees.all().map((employee) => employee.no),
          COMPANY.employeeNoPrefix,
          COMPANY.employeeNoWidth
        ),
        ...fields,
        exitDate: null,
        status: 'active' as const,
        statusReason: '',
        drivingAuthorized: false,
        drivingAuthorizedBy: null,
        drivingAuthorizedAt: null
      }
    },
    update: (existing, input) => {
      if (existing.status === 'archived') throw conflict(HR_MESSAGES.employeeArchived)
      const patch = readPatch(input, readers)
      assertUniqueNationalId(patch.nationalId, existing.no)
      return patch
    }
  })

  router.post('/hr/employees/:no/status', { feature: 'EMPLOYEE', action: 'execute' }, (request) => {
    const employee = findEditable(request)
    const body = readBody(request)
    const status = readEnum(body, 'status', MANUAL_EMPLOYEE_STATUSES, { required: true })
    if (!status) throw invalidField('status')
    if (status === employee.status) throw conflict(HR_MESSAGES.sameEmployeeStatus)
    const reason = readString(body, 'reason')
    if (statusNeedsReason(status) && !reason) throw unprocessable(HR_MESSAGES.statusReasonRequired)
    db.employees.update(employee.no, {
      status,
      statusReason: reason,
      exitDate: status === 'contract_ended' ? todayIso() : null,
      ...stampModified(request)
    })
    return ok(apiRecord(employee.no))
  })

  /** Employees are archived, never deleted: their history stays attached to them. */
  router.post(
    '/hr/employees/:no/archive',
    { feature: 'EMPLOYEE', action: 'execute' },
    (request) => {
      const employee = findEditable(request)
      db.employees.update(employee.no, {
        status: 'archived',
        statusReason: readString(readBody(request), 'reason'),
        exitDate: employee.exitDate ?? todayIso(),
        drivingAuthorized: false,
        ...stampModified(request)
      })
      return ok(apiRecord(employee.no))
    }
  )

  router.post(
    '/hr/employees/:no/driving-authorization',
    { feature: 'EMPLOYEE', action: 'execute' },
    (request) => {
      const employee = findEditable(request)
      if (!db.jobPositions.find(employee.jobPositionNo)?.drives) {
        throw unprocessable(HR_MESSAGES.positionDoesNotDrive)
      }
      db.employees.update(employee.no, {
        drivingAuthorized: readBoolean(readBody(request), 'authorized'),
        drivingAuthorizedBy: sessionUser(request).code,
        drivingAuthorizedAt: nowIso(),
        ...stampModified(request)
      })
      return ok(apiRecord(employee.no))
    }
  )
}
