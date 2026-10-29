import {
  appliesToPerson,
  appliesToVehicle
} from '@/modules/fleet/document-types/domain/documentType'
import {
  DECLARED_STATUSES,
  documentIssues,
  type DocumentIssue
} from '@/modules/fleet/documents/domain/document'
import {
  SUBJECT_KINDS,
  type DocumentApi,
  type MissingDocumentApi,
  type SubjectKind
} from '@/modules/fleet/documents/types/document.types'
import { employeeFullName, isOnStaff } from '@/modules/hr/employees/domain/employee'
import { todayIso } from '@/utils/date'
import { alertNotifications } from '@/modules/fleet/alerts/domain/alert'
import { alertRuleOf } from './alertRules'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { DocumentRow } from '../../fixtures/fleet/documents'
import {
  readBody,
  registerCrudResource,
  registerListResource,
  routeParam,
  stampModified
} from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readDate,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { fileMetaOf, releaseFiles } from '../files'
import { documentCompliance, documentStatuses } from './documentCompliance'
import { FLEET_MESSAGES } from './messages'

type EditableFields = Pick<
  DocumentRow,
  'number' | 'detail' | 'issueDate' | 'expiryDate' | 'noticeDays' | 'fileNo'
>

const ISSUE_MESSAGES: Record<DocumentIssue, (typeof FLEET_MESSAGES)['documentExpiryRequired']> = {
  expiryRequired: FLEET_MESSAGES.documentExpiryRequired,
  expiryBeforeIssue: FLEET_MESSAGES.documentExpiryBeforeIssue,
  issueInFuture: FLEET_MESSAGES.documentIssueInFuture
}

function subjectNames(db: MockDatabase): Record<SubjectKind, Map<string, string>> {
  return {
    vehicle: new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate])),
    person: new Map(db.employees.all().map((employee) => [employee.no, employeeFullName(employee)]))
  }
}

export function documentsApi(db: MockDatabase): DocumentApi[] {
  const statuses = documentStatuses(db)
  const types = new Map(db.documentTypes.all().map((type) => [type.no, type]))
  const names = subjectNames(db)
  const ruleRow = db.alertRules.find('document')
  const rule = ruleRow?.active ? alertRuleOf(ruleRow) : null
  return db.documents.all().map((document) => {
    const type = types.get(document.documentTypeNo)
    const status = statuses.get(document.no)
    const state = status?.state ?? 'valid'
    // The alert of a mandatory document goes out by the channels of the document rule, from the
    // day its notice starts (or its validity ends).
    const alerting = !document.replacedByNo && !!type?.mandatory && state !== 'valid'
    const since =
      state === 'expiring'
        ? (status?.notifyOn ?? todayIso())
        : (document.declaredAt ?? document.expiryDate ?? todayIso())
    return {
      ...document,
      subjectName: names[document.target].get(document.subjectNo) ?? document.subjectNo,
      documentTypeName: type?.name ?? '',
      mandatory: type?.mandatory ?? false,
      validity: type?.validity ?? 'limited',
      effectiveNoticeDays: status?.effectiveNoticeDays ?? 0,
      notifyOn: status?.notifyOn ?? null,
      file: document.fileNo ? fileMetaOf(db, document.fileNo) : null,
      state,
      current: !document.replacedByNo,
      notifications: alerting ? alertNotifications(rule, since) : []
    }
  })
}

export function missingDocumentsApi(db: MockDatabase): MissingDocumentApi[] {
  const { vehicles, persons } = documentCompliance(db)
  const names = subjectNames(db)
  const typeNames = new Map(db.documentTypes.all().map((type) => [type.no, type.name]))
  const current = db.documents.all().filter((document) => !document.replacedByNo)
  const rows = (
    target: SubjectKind,
    gaps: Map<string, { documentTypeNo: string; reason: MissingDocumentApi['reason'] }[]>
  ) =>
    [...gaps.entries()].flatMap(([subjectNo, subjectGaps]) =>
      subjectGaps.map((gap) => ({
        no: `${target}-${subjectNo}-${gap.documentTypeNo}`,
        target,
        subjectNo,
        subjectName: names[target].get(subjectNo) ?? subjectNo,
        documentTypeNo: gap.documentTypeNo,
        documentTypeName: typeNames.get(gap.documentTypeNo) ?? gap.documentTypeNo,
        reason: gap.reason,
        documentNo:
          current.find(
            (document) =>
              document.target === target &&
              document.subjectNo === subjectNo &&
              document.documentTypeNo === gap.documentTypeNo
          )?.no ?? null
      }))
    )
  return [...rows('vehicle', vehicles), ...rows('person', persons)]
}

function readFileNo(db: MockDatabase, input: Record<string, unknown>): string | null {
  const fileNo = readString(input, 'fileNo')
  if (!fileNo) return null
  if (!db.files.exists(fileNo)) throw unknownReference('fileNo')
  return fileNo
}

export function registerDocumentsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    number: (input) => readString(input, 'number'),
    detail: (input) => readString(input, 'detail'),
    issueDate: (input) => readDate(input, 'issueDate'),
    expiryDate: (input) => readDate(input, 'expiryDate'),
    noticeDays: (input) => readNumber(input, 'noticeDays', { min: 0, max: 365 }),
    fileNo: (input) => readFileNo(db, input)
  }

  /** The subject exists, is still in the fleet or on staff, and the type concerns it. */
  function assertApplicable(target: SubjectKind, subjectNo: string, documentTypeNo: string) {
    const type = db.documentTypes.findOrFail(documentTypeNo)
    if (target === 'vehicle') {
      const vehicle = db.vehicles.find(subjectNo)
      if (!vehicle || vehicle.removal) throw unknownReference('subjectNo')
      if (!appliesToVehicle(type, vehicle.vehicleTypeNo)) {
        throw unprocessable(FLEET_MESSAGES.documentTypeNotApplicable)
      }
      return type
    }
    const employee = db.employees.find(subjectNo)
    if (!employee || !isOnStaff(employee.status)) throw unknownReference('subjectNo')
    const drives = !!db.jobPositions.find(employee.jobPositionNo)?.drives
    if (!appliesToPerson(type, drives)) {
      throw unprocessable(FLEET_MESSAGES.documentTypeNotApplicable)
    }
    return type
  }

  function assertValid(
    document: Pick<DocumentRow, 'issueDate' | 'expiryDate'>,
    validity: 'limited' | 'unlimited'
  ) {
    const [issue] = documentIssues(document, validity, todayIso())
    if (issue) throw unprocessable(ISSUE_MESSAGES[issue])
  }

  function assertEditable(document: DocumentRow) {
    if (document.replacedByNo) throw conflict(FLEET_MESSAGES.documentReplaced)
    if (document.declaredStatus) throw conflict(FLEET_MESSAGES.documentDeclared)
  }

  registerCrudResource(router, {
    basePath: '/fleet/documents',
    feature: 'DOCUMENT',
    collection: db.documents,
    list: () => documentsApi(db),
    searchColumns: ['no', 'subjectName', 'number'],
    optionFields: { target: 'documentTarget', state: 'documentState' },
    create: (input) => {
      const target = readEnum(input, 'target', SUBJECT_KINDS, { required: true }) ?? 'vehicle'
      const subjectNo = readString(input, 'subjectNo', { required: true })
      const documentTypeNo = requireReference(db.documentTypes, input, 'documentTypeNo')
      const type = assertApplicable(target, subjectNo, documentTypeNo)
      const fields = {
        number: readers.number(input),
        detail: readers.detail(input),
        issueDate: readers.issueDate(input),
        expiryDate: type.validity === 'unlimited' ? null : readers.expiryDate(input),
        noticeDays: readers.noticeDays(input),
        fileNo: readers.fileNo(input)
      }
      assertValid(fields, type.validity)

      const no = nextNo(
        db.documents.all().map((document) => document.no),
        'DOC-',
        5
      )
      // A new document of the same type replaces the current one, which stays in the history.
      const previous = db.documents
        .all()
        .find(
          (document) =>
            document.target === target &&
            document.subjectNo === subjectNo &&
            document.documentTypeNo === documentTypeNo &&
            !document.replacedByNo
        )
      if (previous) db.documents.update(previous.no, { replacedByNo: no })
      return {
        no,
        target,
        subjectNo,
        documentTypeNo,
        ...fields,
        declaredStatus: null,
        declaredReason: '',
        declaredAt: null,
        declaredBy: null,
        version: (previous?.version ?? 0) + 1,
        replacedByNo: null
      }
    },
    update: (existing, input) => {
      assertEditable(existing)
      const patch = readPatch(input, readers)
      const type = db.documentTypes.findOrFail(existing.documentTypeNo)
      if (type.validity === 'unlimited') patch.expiryDate = null
      assertValid({ ...existing, ...patch }, type.validity)
      if ('fileNo' in patch && existing.fileNo && patch.fileNo !== existing.fileNo) {
        void releaseFiles(db, [existing.fileNo])
      }
      return patch
    }
  })

  router.post(
    '/fleet/documents/:no/declare',
    { feature: 'DOCUMENT', action: 'update' },
    (request) => {
      const document = db.documents.findOrFail(routeParam(request, 'no'))
      assertEditable(document)
      const body = readBody(request)
      const status = readEnum(body, 'status', DECLARED_STATUSES, { required: true }) ?? 'lost'
      const reason = readString(body, 'reason')
      if (!reason) throw unprocessable(FLEET_MESSAGES.reasonRequired)
      db.documents.update(document.no, {
        declaredStatus: status,
        declaredReason: reason,
        declaredAt: nowIso(),
        declaredBy: sessionUser(request).code,
        ...stampModified(request)
      })
      return ok(documentsApi(db).find((row) => row.no === document.no))
    }
  )

  registerListResource(router, {
    basePath: '/fleet/missing-documents',
    feature: 'DOCUMENT',
    rows: () => missingDocumentsApi(db),
    searchColumns: ['subjectName', 'documentTypeName'],
    optionFields: { target: 'documentTarget', reason: 'complianceGapReason' }
  })
}
