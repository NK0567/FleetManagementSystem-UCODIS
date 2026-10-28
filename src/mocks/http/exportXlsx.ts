import type { SheetData } from 'write-excel-file/universal'

export interface ExportColumn {
  field: string
  label: string
  align?: 'right'
}

export type ExportCell = string | number | boolean | null

function isExportColumn(value: unknown): value is ExportColumn {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.field === 'string' && typeof candidate.label === 'string'
}

export function readExportColumns(raw: unknown): ExportColumn[] {
  return Array.isArray(raw) ? raw.filter(isExportColumn) : []
}

/** Builds the workbook lazily: the spreadsheet library is only loaded on the first export. */
export async function buildWorkbook(columns: ExportColumn[], rows: ExportCell[][]): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal')
  const header = columns.map((column) => ({ value: column.label, fontWeight: 'bold' as const }))
  const body = rows.map((row) =>
    row.map((value, index) =>
      value === null
        ? null
        : { value, ...(columns[index]?.align === 'right' ? { align: 'right' as const } : {}) }
    )
  )
  const sheet: SheetData = [header, ...body]
  return writeXlsxFile(sheet).toBlob()
}
