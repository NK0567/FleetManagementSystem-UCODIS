import type { AuditFields, Collection, MockRow } from '../../db/collection'
import { conflict } from '../../http/errors'
import { importRows } from '../../http/importRows'
import { readBody, stampCreated } from '../../http/crudResource'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'

const DUPLICATE_CODE = {
  fr: 'Le code « {no} » est déjà utilisé.',
  en: 'The code "{no}" is already used.'
}

/** A reference given in a file by its code or its name; an unknown text is left for the rules to refuse. */
export function codeOrName(rows: readonly { no: string; name: string }[], value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : ''
  const wanted = text.toLowerCase()
  const found = rows.find(
    (row) => row.no.toLowerCase() === wanted || row.name.toLowerCase() === wanted
  )
  return found?.no ?? text
}

/**
 * POST {basePath}/import: each line goes through the rules of the form, in the order of the file,
 * so that a line can use a record created by an earlier one.
 */
export function registerReferenceImport<Row extends MockRow>(
  router: MockRouter,
  options: {
    basePath: string
    feature: string
    collection: Collection<Row>
    build: (input: Record<string, unknown>) => Omit<Row, keyof AuditFields>
  }
): void {
  const { basePath, feature, collection, build } = options
  router.post(`${basePath}/import`, { feature, action: 'insert' }, (request) =>
    ok(
      importRows(readBody(request).rows, request, (input) => {
        const row = stampCreated<Row>(build(input), request)
        if (collection.exists(row.no)) throw conflict(DUPLICATE_CODE, { no: row.no })
        return collection.insert(row).no
      })
    )
  )
}
