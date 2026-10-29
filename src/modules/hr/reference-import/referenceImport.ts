import type { ImportColumns } from '@/core/utils/csvImport'

export type ReferenceImportKind = 'orgUnits' | 'employeeCategories' | 'jobPositions'

/** What a file of one kind holds: its column names in French or English, the first one heads the template. */
export interface ReferenceImportDefinition {
  columns: ImportColumns<string>
  required: readonly string[]
  example: readonly string[]
  templateName: string
}

const YES = new Set(['oui', 'o', 'yes', 'y', 'true', '1', 'x'])

export const REFERENCE_IMPORTS: Record<ReferenceImportKind, ReferenceImportDefinition> = {
  orgUnits: {
    columns: {
      no: ['code', 'no'],
      name: ['nom', 'name'],
      type: ['niveau', 'type'],
      parentNo: ['entite_parente', 'parent', 'parent_unit'],
      siteCode: ['site', 'base'],
      managerNo: ['responsable', 'matricule_responsable', 'manager'],
      description: ['description']
    },
    required: ['no', 'name', 'type', 'parentNo', 'siteCode'],
    example: ['ATL', 'Atelier', 'Service', 'MNT', 'DEP-TNJ', '', 'Atelier poids lourds'],
    templateName: 'entites-modele.csv'
  },
  employeeCategories: {
    columns: {
      no: ['code', 'no'],
      name: ['libelle', 'nom', 'name'],
      annualLeaveDays: ['jours_conge', 'conges_annuels', 'annual_leave_days'],
      description: ['description']
    },
    required: ['no', 'name', 'annualLeaveDays'],
    example: ['CAT-E', 'Cadre supérieur', '30', 'Direction et encadrement'],
    templateName: 'categories-modele.csv'
  },
  jobPositions: {
    columns: {
      no: ['code', 'no'],
      name: ['libelle', 'nom', 'name'],
      orgUnitNo: ['entite', 'service', 'org_unit'],
      defaultCategoryNo: ['categorie', 'category'],
      plannedHeadcount: ['effectif_prevu', 'effectif', 'planned_headcount'],
      drives: ['conduit', 'conducteur', 'drives'],
      responsibilities: ['responsabilites', 'responsibilities']
    },
    required: ['no', 'name', 'orgUnitNo', 'defaultCategoryNo'],
    example: [
      'MAG',
      'Magasinier',
      'MNT',
      'CAT-C',
      '1',
      'non',
      'Tenir le stock;Préparer les sorties'
    ],
    templateName: 'fonctions-modele.csv'
  }
}

const NUMBER_FIELDS = new Set(['annualLeaveDays', 'plannedHeadcount'])

/** One line of the file, as the server expects it; anything unreadable is passed on for it to refuse. */
export function toReferenceRow(
  record: Record<string, string>,
  mapping: Map<string, string>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (NUMBER_FIELDS.has(field)) {
      const number = Number(value.replace(',', '.'))
      row[field] = value === '' ? null : Number.isFinite(number) ? number : value
    } else if (field === 'drives') {
      row[field] = YES.has(value.toLowerCase())
    } else if (field === 'responsibilities') {
      row[field] = value
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
    } else row[field] = value || null
  }
  return row
}
