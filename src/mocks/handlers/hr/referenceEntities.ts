import { nextNo } from '../../db/numbering'
import { conflict, unprocessable } from '../../http/errors'
import { registerCrudResource } from '../../http/crudResource'
import {
  readAll,
  readBoolean,
  readCode,
  readDate,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import type { MockRouter } from '../../http/router'
import type { MockDatabase } from '../../db/database'
import type { EmployeeCategoryRow } from '../../fixtures/hr/employeeCategories'
import type { JobPositionRow } from '../../fixtures/hr/jobPositions'
import type { LeaveTypeRow } from '../../fixtures/hr/leaveTypes'
import type { PublicHolidayRow } from '../../fixtures/hr/calendar'
import type { AuditFields } from '../../db/collection'
import { HR_MESSAGES } from './messages'
import { employeeCategoriesApi, jobPositionsApi } from './views'
import { requireReference } from '../../http/references'
import { codeOrName, registerReferenceImport } from './referenceImport'

type Fields<Row> = Omit<Row, 'no' | keyof AuditFields>

export function registerEmployeeCategoryHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields<EmployeeCategoryRow>> = {
    name: (input) => readString(input, 'name', { required: true }),
    description: (input) => readString(input, 'description'),
    annualLeaveDays: (input) =>
      readNumber(input, 'annualLeaveDays', { required: true, min: 0 }) ?? 0,
    active: (input) => readBoolean(input, 'active', true)
  }

  registerReferenceImport(router, {
    basePath: '/hr/employee-categories',
    feature: 'EMPLOYEECATEGORY',
    collection: db.employeeCategories,
    build: (input) => ({ no: readCode(input), ...readAll(input, readers) })
  })

  registerCrudResource(router, {
    basePath: '/hr/employee-categories',
    feature: 'EMPLOYEECATEGORY',
    collection: db.employeeCategories,
    list: () => employeeCategoriesApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({ no: readCode(input), ...readAll(input, readers) }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.employees.all().some((employee) => employee.categoryNo === existing.no)) {
        throw conflict(HR_MESSAGES.categoryInUse)
      }
    }
  })
}

export function registerLeaveTypeHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Omit<Fields<LeaveTypeRow>, 'statutory'>> = {
    name: (input) => readString(input, 'name', { required: true }),
    color: (input) => readString(input, 'color') || '#6b7280',
    active: (input) => readBoolean(input, 'active', true),
    annualEntitlementDays: (input) => readNumber(input, 'annualEntitlementDays', { min: 0 }),
    monthlyAccrualDays: (input) => readNumber(input, 'monthlyAccrualDays', { min: 0 }),
    maxCarryOverDays: (input) => readNumber(input, 'maxCarryOverDays', { min: 0 }),
    noticeDays: (input) => readNumber(input, 'noticeDays', { min: 0 }) ?? 0,
    requiresDocument: (input) => readBoolean(input, 'requiresDocument'),
    paid: (input) => readBoolean(input, 'paid', true),
    tracksBalance: (input) => readBoolean(input, 'tracksBalance'),
    comment: (input) => readString(input, 'comment')
  }

  registerCrudResource(router, {
    basePath: '/hr/leave-types',
    feature: 'LEAVETYPE',
    collection: db.leaveTypes,
    list: () => db.leaveTypes.all(),
    searchColumns: ['no', 'name'],
    create: (input) => ({
      no: readCode(input),
      statutory: readBoolean(input, 'statutory'),
      ...readAll(input, readers)
    }),
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      if (existing.statutory && patch.active === false) {
        throw unprocessable(HR_MESSAGES.statutoryLeaveType)
      }
      return patch
    },
    remove: (existing) => {
      if (existing.statutory) throw conflict(HR_MESSAGES.statutoryLeaveType)
      if (db.leaveRequests.all().some((request) => request.leaveTypeNo === existing.no)) {
        throw conflict(HR_MESSAGES.leaveTypeInUse)
      }
    }
  })
}

export function registerJobPositionHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields<JobPositionRow>> = {
    name: (input) => readString(input, 'name', { required: true }),
    orgUnitNo: (input) => requireReference(db.orgUnits, input, 'orgUnitNo'),
    drives: (input) => readBoolean(input, 'drives'),
    plannedHeadcount: (input) => readNumber(input, 'plannedHeadcount', { min: 0 }) ?? 0,
    responsibilities: (input) => readStringList(input, 'responsibilities'),
    defaultCategoryNo: (input) =>
      requireReference(db.employeeCategories, input, 'defaultCategoryNo')
  }

  registerReferenceImport(router, {
    basePath: '/hr/job-positions',
    feature: 'JOBPOSITION',
    collection: db.jobPositions,
    build: (input) => ({
      no: readCode(input),
      ...readAll(
        {
          ...input,
          orgUnitNo: codeOrName(db.orgUnits.all(), input.orgUnitNo),
          defaultCategoryNo: codeOrName(db.employeeCategories.all(), input.defaultCategoryNo)
        },
        readers
      )
    })
  })

  registerCrudResource(router, {
    basePath: '/hr/job-positions',
    feature: 'JOBPOSITION',
    collection: db.jobPositions,
    list: () => jobPositionsApi(db),
    searchColumns: ['no', 'name'],
    create: (input) => ({ no: readCode(input), ...readAll(input, readers) }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.employees.all().some((employee) => employee.jobPositionNo === existing.no)) {
        throw conflict(HR_MESSAGES.jobPositionInUse)
      }
    }
  })
}

export function registerPublicHolidayHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields<PublicHolidayRow>> = {
    name: (input) => readString(input, 'name', { required: true }),
    date: (input) => readDate(input, 'date', { required: true }) ?? '',
    recurring: (input) => readBoolean(input, 'recurring')
  }

  registerCrudResource(router, {
    basePath: '/hr/public-holidays',
    feature: 'PUBLICHOLIDAY',
    collection: db.publicHolidays,
    list: () => db.publicHolidays.all(),
    searchColumns: ['name'],
    create: (input) => ({
      no: nextNo(
        db.publicHolidays.all().map((holiday) => holiday.no),
        'PH-',
        3
      ),
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: () => undefined
  })
}
