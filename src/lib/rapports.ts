/**
 * Export des rapports (FMS-RA) : un rapport est un titre, un sous-titre et des
 * sections tabulaires ; il part en PDF (une section après l'autre) ou en
 * Excel (une feuille par section). Les bibliothèques sont chargées à la
 * demande, pour ne pas alourdir le premier affichage.
 */
export type ValeurRapport = string | number | null | undefined
export interface SectionRapport { titre: string; colonnes: string[]; lignes: ValeurRapport[][]; note?: string }
export interface Rapport { titre: string; sousTitre?: string; sections: SectionRapport[] }

/** Espaces insécables de toLocaleString remplacés : la police standard des PDF ne les connaît pas. */
const texte = (v: ValeurRapport) => v == null ? '' : String(v).replace(/[  ]/g, ' ')
const nomFichier = (titre: string, ext: string) =>
  `${titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.${ext}`

export async function exporterPdf(r: Rapport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(15); doc.text(texte(r.titre), 14, 16)
  let y = 22
  if (r.sousTitre) { doc.setFontSize(9); doc.setTextColor(100); doc.text(texte(r.sousTitre), 14, y); doc.setTextColor(0); y += 6 }
  r.sections.forEach(s => {
    if (y > 180) { doc.addPage(); y = 16 }
    doc.setFontSize(11); doc.text(texte(s.titre), 14, y + 4)
    autoTable(doc, {
      startY: y + 7, head: [s.colonnes.map(texte)], body: s.lignes.length ? s.lignes.map(l => l.map(texte)) : [[{ content: 'Aucune donnée', colSpan: s.colonnes.length }] as never],
      styles: { fontSize: 8, cellPadding: 1.6 }, headStyles: { fillColor: [11, 68, 128] }, margin: { left: 14, right: 14 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
    if (s.note) { doc.setFontSize(8); doc.setTextColor(100); doc.text(doc.splitTextToSize(texte(s.note), 265), 14, y + 2); doc.setTextColor(0); y += 8 }
    y += 4
  })
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`${texte(r.titre)} · page ${i} sur ${n}`, 14, 203) }
  doc.save(nomFichier(r.titre, 'pdf'))
}

export async function exporterExcel(r: Rapport): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const noms = new Set<string>()
  const feuilles = r.sections.map(s => {
    // Nom de feuille : 31 caractères au plus, sans caractère interdit, unique.
    let nom = s.titre.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || 'Feuille'
    let k = 2; while (noms.has(nom)) nom = `${nom.slice(0, 28)} ${k++}`
    noms.add(nom)
    const entete = s.colonnes.map(c => ({ value: c, fontWeight: 'bold' as const }))
    const corps = s.lignes.map(l => l.map(v => v == null || v === '' ? null : typeof v === 'number' ? { value: v, type: Number } : { value: texte(v), type: String }))
    return { sheet: nom, data: [entete, ...corps], columns: s.colonnes.map(() => ({ width: 22 })) }
  })
  await writeXlsxFile(feuilles as never).toFile(nomFichier(r.titre, 'xlsx'))
}
