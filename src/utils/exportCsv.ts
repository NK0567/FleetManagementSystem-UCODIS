/**
 * Export CSV générique, réutilisable sur n'importe quel écran liste.
 * Échappe les guillemets et les valeurs contenant une virgule, un
 * saut de ligne ou un guillemet, comme l'exige le format CSV.
 */
export interface ColonneExport<T> {
  libelle: string
  valeur: (item: T) => string | number | null | undefined
}

function echapper(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exporterCsv<T>(nomFichier: string, colonnes: ColonneExport<T>[], lignes: T[]) {
  const entetes = colonnes.map(c => echapper(c.libelle)).join(',')
  const corps = lignes.map(l => colonnes.map(c => echapper(c.valeur(l))).join(',')).join('\n')
  const contenu = '\uFEFF' + entetes + '\n' + corps
  const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier.endsWith('.csv') ? nomFichier : `${nomFichier}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
