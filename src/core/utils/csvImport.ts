/** Column names a file may use for each field, in French or English; the first one goes into the template. */
export type ImportColumns<F extends string> = Record<F, readonly string[]>

export interface ImportResult {
  line: number
  no: string | null
  error: string | null
}

export interface ImportReport {
  created: number
  rejected: number
  results: ImportResult[]
}

export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/** Which field each header of the file feeds; unknown headers are left out. */
export function mapHeaders<F extends string>(
  columns: ImportColumns<F>,
  headers: readonly string[]
): Map<string, F> {
  const mapping = new Map<string, F>()
  for (const header of headers) {
    const name = normalizeHeader(header)
    const field = (Object.keys(columns) as F[]).find((key) => columns[key].includes(name))
    if (field) mapping.set(header, field)
  }
  return mapping
}

export function missingColumns<F extends string>(
  mapping: Map<string, F>,
  required: readonly F[]
): F[] {
  const found = new Set(mapping.values())
  return required.filter((field) => !found.has(field))
}

/** Accepts 2026-09-03 15:00 and 03/09/2026 15:00; anything else is passed on for the server to refuse. */
export function parseImportDateTime(value: string): string {
  const text = value.trim()
  const french = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text)
  if (french) {
    const [, day, month, year, hour = '00', minute = '00'] = french
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}`
  }
  const iso = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text)
  if (iso) return `${iso[1]}T${(iso[2] ?? '00').padStart(2, '0')}:${iso[3] ?? '00'}`
  return text
}

/** A decimal comma and spaces between thousands are accepted; a blank cell stays empty. */
export function parseImportNumber(value: string): number | string | null {
  const text = value.replace(/\s/g, '').replace(',', '.')
  if (!text) return null
  const number = Number(text)
  return Number.isNaN(number) ? value : number
}
