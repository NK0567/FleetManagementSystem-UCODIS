import { nowIso } from '../clock'
import type { AuditFields, Collection, MockRow } from '../db/collection'
import { optionLabel } from '../fixtures/options'
import { COMMON_MESSAGES, localize } from '../i18n'
import { badRequest, conflict } from './errors'
import { buildWorkbook, readExportColumns, type ExportCell } from './exportXlsx'
import { applyListQuery, filterAndSort } from './listQuery'
import { created, file, ok, paginated } from './responses'
import type { MockRouter } from './router'
import { sessionUser, type MockRequest } from './types'

const DUPLICATE_NO = {
  fr: 'Le code « {no} » est déjà utilisé.',
  en: 'The code "{no}" is already used.'
}

type Draft<Row extends MockRow> = Omit<Row, keyof AuditFields>
type Patch<Row extends MockRow> = Partial<Omit<Row, 'no' | keyof AuditFields>>

export interface CrudResourceOptions<Row extends MockRow, Api extends { no: string }> {
  basePath: string
  feature: string
  collection: Collection<Row>
  /** Adds the derived and joined fields; runs before search, filters and sort. */
  toApi: (row: Row) => Api
  searchColumns?: string[]
  /** Option set per field, so exports write labels instead of codes. */
  optionFields?: Record<string, string>
  create?: (input: Record<string, unknown>, request: MockRequest) => Draft<Row>
  update?: (existing: Row, input: Record<string, unknown>, request: MockRequest) => Patch<Row>
  /** Enables DELETE; throw to refuse the deletion. */
  remove?: (existing: Row, request: MockRequest) => void
}

export function readBody(request: MockRequest): Record<string, unknown> {
  const { body } = request
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest(COMMON_MESSAGES.invalidBody)
  }
  return body as Record<string, unknown>
}

export function routeParam(request: MockRequest, name: string): string {
  return request.params[name] ?? ''
}

export function stampCreated<Row extends MockRow>(draft: Draft<Row>, request: MockRequest): Row {
  const now = nowIso()
  const code = sessionUser(request).code
  // The audit fields complete the draft into a full row.
  return { ...draft, createdAt: now, createdBy: code, modifiedAt: now, modifiedBy: code } as Row
}

export function stampModified(
  request: MockRequest
): Pick<AuditFields, 'modifiedAt' | 'modifiedBy'> {
  return { modifiedAt: nowIso(), modifiedBy: sessionUser(request).code }
}

function exportCell(
  value: unknown,
  field: string,
  request: MockRequest,
  optionFields: Record<string, string>
): ExportCell {
  if (value == null || value === '') return null
  const optionSet = optionFields[field]
  if (optionSet) return optionLabel(request.language, optionSet, value)
  if (typeof value === 'boolean') {
    return localize(request.language, value ? COMMON_MESSAGES.yes : COMMON_MESSAGES.no)
  }
  if (typeof value === 'number' || typeof value === 'string') return value
  return Array.isArray(value) ? value.join(', ') : JSON.stringify(value)
}

/** Standard list, card, create, update, delete and export endpoints of an entity. */
export function registerCrudResource<Row extends MockRow, Api extends { no: string }>(
  router: MockRouter,
  options: CrudResourceOptions<Row, Api>
): void {
  const { basePath, feature, collection, toApi, searchColumns, optionFields = {} } = options
  const apiRows = () => collection.all().map(toApi)

  router.get(basePath, { feature, action: 'read' }, (request) =>
    paginated(applyListQuery(apiRows(), request.query, { searchColumns }))
  )

  router.post(`${basePath}/export`, { feature, action: 'export' }, async (request) => {
    const body = readBody(request)
    const columns = readExportColumns(body.columns)
    const rows = filterAndSort(apiRows(), body, { searchColumns }).map((row) =>
      columns.map((column) =>
        exportCell(
          (row as Record<string, unknown>)[column.field],
          column.field,
          request,
          optionFields
        )
      )
    )
    const baseName =
      typeof body.fileBaseName === 'string' && body.fileBaseName.trim()
        ? body.fileBaseName.trim()
        : (basePath.split('/').pop() ?? 'export')
    return file(await buildWorkbook(columns, rows), `${baseName}.xlsx`)
  })

  router.get(`${basePath}/:no`, { feature, action: 'read' }, (request) =>
    ok(toApi(collection.findOrFail(routeParam(request, 'no'))))
  )

  const { create, update, remove } = options

  if (create) {
    router.post(basePath, { feature, action: 'insert' }, (request) => {
      const row = stampCreated<Row>(create(readBody(request), request), request)
      if (collection.exists(row.no)) {
        throw conflict(
          DUPLICATE_NO,
          { no: row.no },
          { duplicateField: 'no', duplicateValue: row.no }
        )
      }
      return created(toApi(collection.insert(row)))
    })
  }

  if (update) {
    router.patch(`${basePath}/:no`, { feature, action: 'update' }, (request) => {
      const existing = collection.findOrFail(routeParam(request, 'no'))
      const patch = update(existing, readBody(request), request)
      // A patch is a subset of the row, completed with the audit fields.
      const next = collection.update(existing.no, {
        ...patch,
        ...stampModified(request)
      } as Partial<Row>)
      return ok(toApi(next))
    })
  }

  if (remove) {
    router.delete(`${basePath}/:no`, { feature, action: 'delete' }, (request) => {
      const existing = collection.findOrFail(routeParam(request, 'no'))
      remove(existing, request)
      collection.remove(existing.no)
      return ok(null)
    })
  }
}
