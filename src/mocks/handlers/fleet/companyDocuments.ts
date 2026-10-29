import {
  decisionBlock,
  isRejectionReasonValid,
  MIN_REJECTION_REASON_LENGTH
} from '@/modules/fleet/company-documents/domain/companyDocument'
import type { CompanyDocumentApi } from '@/modules/fleet/company-documents/types/companyDocument.types'
import {
  documentIssues,
  documentState,
  noticeDaysOf,
  notifyOn,
  type DocumentIssue
} from '@/modules/fleet/documents/domain/document'
import { todayIso } from '@/utils/date'
import { nowIso } from '../../clock'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { CompanyDocumentRow } from '../../fixtures/fleet/companyDocuments'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, forbidden, unprocessable } from '../../http/errors'
import {
  readAll,
  readDate,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { optionalReference, requireReference, unknownReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { sessionUser } from '../../http/types'
import { fileMetaOf, releaseFiles } from '../files'
import { FLEET_MESSAGES } from './messages'
import { fleetSettings } from './settings'

type EditableFields = Pick<
  CompanyDocumentRow,
  'name' | 'orgUnitNo' | 'keywords' | 'issueDate' | 'expiryDate' | 'fileNo'
>

const ISSUE_MESSAGES: Record<DocumentIssue, (typeof FLEET_MESSAGES)['documentExpiryRequired']> = {
  expiryRequired: FLEET_MESSAGES.documentExpiryRequired,
  expiryBeforeIssue: FLEET_MESSAGES.documentExpiryBeforeIssue,
  issueInFuture: FLEET_MESSAGES.documentIssueInFuture
}

export function companyDocumentsApi(db: MockDatabase): CompanyDocumentApi[] {
  const today = todayIso()
  const fallback = fleetSettings(db).documents.defaultNoticeDays
  const types = new Map(db.documentTypes.all().map((type) => [type.no, type]))
  const units = new Map(db.orgUnits.all().map((unit) => [unit.no, unit.name]))
  return db.companyDocuments.all().map((document) => {
    const type = types.get(document.documentTypeNo)
    const validity = type?.validity ?? 'limited'
    const effectiveNoticeDays = noticeDaysOf(null, type?.noticeDays ?? null, fallback)
    const approved = document.status === 'approved'
    return {
      ...document,
      documentTypeName: type?.name ?? '',
      orgUnitName: document.orgUnitNo ? (units.get(document.orgUnitNo) ?? '') : '',
      keywordText: document.keywords.join(', '),
      filedOn: document.createdAt.slice(0, 10),
      validity,
      state: approved
        ? documentState(
            { expiryDate: document.expiryDate, declaredStatus: null },
            validity,
            effectiveNoticeDays,
            today
          )
        : null,
      current: approved && !document.replacedByNo,
      effectiveNoticeDays,
      notifyOn: approved ? notifyOn(document.expiryDate, effectiveNoticeDays) : null,
      file: document.fileNo ? fileMetaOf(db, document.fileNo) : null
    }
  })
}

function companyDocumentApiOf(db: MockDatabase, no: string): CompanyDocumentApi | undefined {
  return companyDocumentsApi(db).find((row) => row.no === no)
}

export function registerCompanyDocumentsHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<EditableFields> = {
    name: (input) => readString(input, 'name', { required: true }),
    orgUnitNo: (input) => optionalReference(db.orgUnits, input, 'orgUnitNo'),
    keywords: (input) => readStringList(input, 'keywords'),
    issueDate: (input) => readDate(input, 'issueDate', { required: true }) ?? '',
    expiryDate: (input) => readDate(input, 'expiryDate'),
    fileNo: (input) => {
      const fileNo = readString(input, 'fileNo')
      if (!fileNo) throw unprocessable(FLEET_MESSAGES.companyDocumentFileRequired)
      if (!db.files.exists(fileNo)) throw unknownReference('fileNo')
      return fileNo
    }
  }

  function companyType(documentTypeNo: string) {
    const type = db.documentTypes.findOrFail(documentTypeNo)
    if (type.target !== 'company' || !type.active) {
      throw unprocessable(FLEET_MESSAGES.documentTypeNotApplicable)
    }
    return type
  }

  function checkDates(
    fields: Pick<CompanyDocumentRow, 'issueDate' | 'expiryDate'>,
    documentTypeNo: string
  ) {
    const validity = companyType(documentTypeNo).validity
    const [issue] = documentIssues(fields, validity, todayIso())
    if (issue) throw unprocessable(ISSUE_MESSAGES[issue])
  }

  /** The approved, current version a new upload replaces, if any. */
  function supersededVersion(input: Record<string, unknown>, documentTypeNo: string) {
    const supersedesNo = readString(input, 'supersedesNo')
    if (!supersedesNo) return null
    const previous = db.companyDocuments.findOrFail(supersedesNo)
    if (
      previous.status !== 'approved' ||
      previous.replacedByNo ||
      previous.documentTypeNo !== documentTypeNo
    ) {
      throw unprocessable(FLEET_MESSAGES.companyDocumentNotCurrent)
    }
    const waiting = db.companyDocuments
      .all()
      .some((row) => row.supersedesNo === previous.no && row.status === 'pending')
    if (waiting) throw conflict(FLEET_MESSAGES.companyDocumentReplacementPending)
    return previous
  }

  registerCrudResource(router, {
    basePath: '/fleet/company-documents',
    feature: 'COMPANYDOCUMENT',
    collection: db.companyDocuments,
    list: () => companyDocumentsApi(db),
    searchColumns: ['no', 'name', 'documentTypeName', 'keywordText'],
    optionFields: { status: 'companyDocumentStatus', state: 'documentState' },
    create: (input) => {
      const documentTypeNo = requireReference(db.documentTypes, input, 'documentTypeNo')
      const fields = readAll(input, readers)
      if (companyType(documentTypeNo).validity === 'unlimited') fields.expiryDate = null
      checkDates(fields, documentTypeNo)
      const previous = supersededVersion(input, documentTypeNo)
      return {
        no: nextNo(
          db.companyDocuments.all().map((row) => row.no),
          'DE-',
          4
        ),
        documentTypeNo,
        ...fields,
        status: 'pending' as const,
        decidedBy: null,
        decidedAt: null,
        decisionReason: '',
        supersedesNo: previous?.no ?? null,
        replacedByNo: null,
        version: (previous?.version ?? 0) + 1
      }
    },
    update: (existing, input) => {
      if (existing.status !== 'pending') throw conflict(FLEET_MESSAGES.companyDocumentDecided)
      const patch = readPatch(input, readers)
      if (companyType(existing.documentTypeNo).validity === 'unlimited') patch.expiryDate = null
      checkDates({ ...existing, ...patch }, existing.documentTypeNo)
      if ('fileNo' in patch && existing.fileNo && patch.fileNo !== existing.fileNo) {
        void releaseFiles(db, [existing.fileNo])
      }
      return patch
    },
    remove: (existing) => {
      // A decision stays in the history: only an upload still awaiting review can be withdrawn.
      if (existing.status !== 'pending') throw conflict(FLEET_MESSAGES.companyDocumentDecided)
      if (existing.fileNo) void releaseFiles(db, [existing.fileNo])
    }
  })

  function pendingFor(request: Parameters<typeof sessionUser>[0]) {
    const document = db.companyDocuments.findOrFail(routeParam(request, 'no'))
    const block = decisionBlock(document, sessionUser(request).code)
    if (block === 'notPending') throw conflict(FLEET_MESSAGES.companyDocumentNotPending)
    if (block === 'ownDocument') throw forbidden(FLEET_MESSAGES.companyDocumentOwnDecision)
    return document
  }

  router.post(
    '/fleet/company-documents/:no/approve',
    { feature: 'COMPANYDOCUMENT', action: 'execute' },
    (request) => {
      const document = pendingFor(request)
      db.companyDocuments.update(document.no, {
        status: 'approved',
        decidedBy: sessionUser(request).code,
        decidedAt: nowIso(),
        decisionReason: '',
        ...stampModified(request)
      })
      if (document.supersedesNo) {
        db.companyDocuments.update(document.supersedesNo, { replacedByNo: document.no })
      }
      return ok(companyDocumentApiOf(db, document.no))
    }
  )

  router.post(
    '/fleet/company-documents/:no/reject',
    { feature: 'COMPANYDOCUMENT', action: 'execute' },
    (request) => {
      const document = pendingFor(request)
      const reason = readString(readBody(request), 'reason')
      if (!isRejectionReasonValid(reason)) {
        throw unprocessable(FLEET_MESSAGES.rejectionReasonTooShort, {
          min: MIN_REJECTION_REASON_LENGTH
        })
      }
      db.companyDocuments.update(document.no, {
        status: 'rejected',
        decidedBy: sessionUser(request).code,
        decidedAt: nowIso(),
        decisionReason: reason.trim(),
        ...stampModified(request)
      })
      return ok(companyDocumentApiOf(db, document.no))
    }
  )
}
