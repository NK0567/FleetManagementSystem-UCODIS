import {
  normalizeHeader,
  parseImportDateTime,
  parseImportNumber,
  type ImportColumns
} from '@/core/utils/csvImport'

/** Column names a maintenance history file may use, in French or English; the first goes into the template. */
export const HISTORY_IMPORT_COLUMNS = {
  plate: ['immatriculation', 'plaque', 'plate'],
  doneOn: ['date', 'date_intervention', 'done_on'],
  maintenanceType: ['type', 'type_maintenance', 'maintenance_type'],
  workDone: ['travaux', 'travaux_realises', 'work_done'],
  category: ['categorie', 'sous_systeme', 'organe', 'category'],
  odometerKm: ['kilometrage', 'compteur', 'odometer'],
  cost: ['cout', 'montant', 'cost']
} as const satisfies ImportColumns<string>

export type HistoryImportField = keyof typeof HISTORY_IMPORT_COLUMNS

export const HISTORY_REQUIRED: readonly HistoryImportField[] = [
  'plate',
  'doneOn',
  'maintenanceType',
  'workDone',
  'cost'
]

const TYPE_WORDS: Record<string, 'corrective' | 'preventive'> = {
  correctif: 'corrective',
  corrective: 'corrective',
  curatif: 'corrective',
  preventif: 'preventive',
  preventive: 'preventive',
  entretien: 'preventive'
}

/** One line of the file, as the server expects it; unknown words are passed on for it to refuse. */
export function toHistoryRow(
  record: Record<string, string>,
  mapping: Map<string, HistoryImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (field === 'doneOn') row[field] = parseImportDateTime(value).slice(0, 10)
    else if (field === 'odometerKm' || field === 'cost') row[field] = parseImportNumber(value)
    else if (field === 'maintenanceType') row[field] = TYPE_WORDS[normalizeHeader(value)] ?? value
    else row[field] = value
  }
  return row
}

/** Words that tell a subsystem, in lower case without accents; the subsystem name counts too. */
export type SubsystemKeywords = Record<string, readonly string[]>

const words = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)

/** Two words match on their first five letters, so "freins" and "freinage" meet. */
const stem = (word: string) => word.slice(0, 5)

/**
 * The subsystem of the nomenclature an old line most likely belongs to: the one whose name or
 * keywords share the most words with the category of the former books, else with the work done.
 * Nothing is proposed when no word matches or when two subsystems tie: a person then chooses.
 */
export function proposeSubsystem(
  texts: readonly string[],
  subsystems: readonly { no: string; name: string }[],
  keywords: SubsystemKeywords = {}
): string | null {
  for (const text of texts) {
    const found = new Set(words(text).map(stem))
    if (!found.size) continue
    const scored = subsystems
      .map((subsystem) => {
        const terms = new Set(
          [...words(subsystem.name), ...(keywords[subsystem.no] ?? []).flatMap(words)].map(stem)
        )
        return { no: subsystem.no, score: [...terms].filter((term) => found.has(term)).length }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
    const [best, next] = scored
    if (best && (!next || next.score < best.score)) return best.no
  }
  return null
}
