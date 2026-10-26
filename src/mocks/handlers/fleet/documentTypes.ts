import {
  DOCUMENT_TARGETS,
  DOCUMENT_VALIDITIES,
  PERSON_SCOPES,
  type DocumentTypeApi
} from '@/modules/fleet/document-types/types/documentType.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import type { DocumentTypeRow } from '../../fixtures/fleet/documentTypes'
import { registerCrudResource } from '../../http/crudResource'
import { conflict } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readCode,
  readEnum,
  readNumber,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { unknownReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { FLEET_MESSAGES } from './messages'

type Fields = Omit<DocumentTypeRow, 'no' | 'target' | keyof AuditFields>

export function documentTypesApi(db: MockDatabase): DocumentTypeApi[] {
  const documents = db.documents.all()
  return db.documentTypes.all().map((type) => ({
    ...type,
    documentCount: documents.filter(
      (document) => document.documentTypeNo === type.no && !document.replacedByNo
    ).length
  }))
}

export function registerDocumentTypesHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    personScope: (input) =>
      readEnum(input, 'personScope', PERSON_SCOPES, { required: true }) ?? 'all',
    vehicleTypeNos: (input) => {
      const codes = readStringList(input, 'vehicleTypeNos')
      if (codes.some((code) => !db.vehicleTypes.exists(code))) {
        throw unknownReference('vehicleTypeNos')
      }
      return codes
    },
    mandatory: (input) => readBoolean(input, 'mandatory', true),
    active: (input) => readBoolean(input, 'active', true),
    validity: (input) =>
      readEnum(input, 'validity', DOCUMENT_VALIDITIES, { required: true }) ?? 'limited',
    durationMonths: (input) => readNumber(input, 'durationMonths', { min: 1, max: 240 }),
    noticeDays: (input) => readNumber(input, 'noticeDays', { min: 0, max: 365 })
  }

  registerCrudResource(router, {
    basePath: '/fleet/document-types',
    feature: 'DOCUMENTTYPE',
    collection: db.documentTypes,
    list: () => documentTypesApi(db),
    searchColumns: ['no', 'name'],
    optionFields: {
      target: 'documentTarget',
      personScope: 'personScope',
      validity: 'documentValidity'
    },
    create: (input) => ({
      no: readCode(input),
      target: readEnum(input, 'target', DOCUMENT_TARGETS, { required: true }) ?? 'vehicle',
      ...readAll(input, readers)
    }),
    update: (_existing, input) => readPatch(input, readers),
    remove: (existing) => {
      if (db.documents.all().some((document) => document.documentTypeNo === existing.no)) {
        throw conflict(FLEET_MESSAGES.documentTypeInUse)
      }
    }
  })
}
