import { saveBlob } from '@/utils/downloadBlobResponse'
import type { ReportTable } from '../composables/useReportFormat'

/** Excel caps sheet names at 31 characters and forbids a few signs. */
const sheetName = (title: string) => title.replace(/[\/?*[\]:]/g, ' ').slice(0, 31)

/** One sheet per table; the library is only loaded on the first export. */
export async function exportReportXlsx(tables: ReportTable[], fileName: string): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/universal')
  const sheets = tables.map((table) => ({
    sheet: sheetName(table.title),
    data: [
      table.headers.map((header) => ({ value: header, fontWeight: 'bold' as const })),
      ...table.rows.map((row) =>
        row.map((cell, index) =>
          cell.value === null
            ? null
            : { value: cell.value, ...(table.numeric[index] ? { align: 'right' as const } : {}) }
        )
      )
    ]
  }))
  saveBlob(await writeXlsxFile(sheets).toBlob(), `${fileName}.xlsx`)
}

export async function exportReportPdf(
  heading: { title: string; subtitle: string },
  tables: ReportTable[],
  fileName: string,
  emptyText: string
): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const pdf = new jsPDF({ orientation: 'landscape' })
  pdf.setFontSize(14)
  pdf.text(heading.title, 14, 16)
  pdf.setFontSize(9)
  pdf.text(heading.subtitle, 14, 22)
  let y = 30
  for (const table of tables) {
    pdf.setFontSize(11)
    pdf.text(table.title, 14, y)
    autoTable(pdf, {
      startY: y + 3,
      head: [table.headers],
      body: table.rows.length
        ? table.rows.map((row) => row.map((cell) => cell.text))
        : [[{ content: emptyText, colSpan: table.headers.length }]],
      styles: { fontSize: 8 },
      columnStyles: Object.fromEntries(
        table.numeric.flatMap((numeric, index) => (numeric ? [[index, { halign: 'right' }]] : []))
      )
    })
    y = ((pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10
  }
  pdf.save(`${fileName}.pdf`)
}
