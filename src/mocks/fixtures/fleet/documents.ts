import type { DeclaredStatus } from '@/modules/fleet/documents/domain/document'
import type { SubjectKind } from '@/modules/fleet/documents/types/document.types'
import { addDays, addMonths } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface DocumentRow extends MockRow {
  target: SubjectKind
  subjectNo: string
  documentTypeNo: string
  number: string
  detail: string
  issueDate: string | null
  expiryDate: string | null
  noticeDays: number | null
  fileNo: string | null
  declaredStatus: DeclaredStatus | null
  declaredReason: string
  declaredAt: string | null
  declaredBy: string | null
  version: number
  replacedByNo: string | null
}

type Seed = Omit<DocumentRow, keyof typeof seedAudit | 'no'>

const pad = (value: number, width = 3) => String(value).padStart(width, '0')
const inDays = (days: number) => addDays(DEMO_REFERENCE_DATE, days)

/** A document with a limited validity, ending in `days` from the demo date. */
function limited(
  target: SubjectKind,
  subjectNo: string,
  documentTypeNo: string,
  months: number,
  days: number,
  number: string,
  extra: Partial<Seed> = {}
): Seed {
  const expiryDate = inDays(days)
  return {
    target,
    subjectNo,
    documentTypeNo,
    number,
    detail: '',
    issueDate: addMonths(expiryDate, -months),
    expiryDate,
    noticeDays: null,
    fileNo: null,
    declaredStatus: null,
    declaredReason: '',
    declaredAt: null,
    declaredBy: null,
    version: 1,
    replacedByNo: null,
    ...extra
  }
}

function unlimited(
  target: SubjectKind,
  subjectNo: string,
  documentTypeNo: string,
  issueDate: string,
  number: string,
  extra: Partial<Seed> = {}
): Seed {
  return {
    ...limited(target, subjectNo, documentTypeNo, 0, 0, number),
    issueDate,
    expiryDate: null,
    ...extra
  }
}

/** Two insurers share the fleet; the policy number starts with the insurer's prefix. */
const insurerPrefix = (vehicleIndex: number) =>
  vehicleIndex >= 15 && vehicleIndex <= 20 ? 'NYH' : 'ARO'

/** Vehicle documents: every vehicle in order, with a few situations to show. */
function vehicleDocuments(): Seed[] {
  const docs: Seed[] = []
  for (let index = 1; index <= 24; index++) {
    const no = `VEH-${pad(index)}`
    const tractor = index <= 10
    const lost = index === 24
    if (index !== 19) {
      docs.push(
        unlimited(
          'vehicle',
          no,
          'VEH-REG',
          `${2020 + (index % 4)}-0${(index % 9) + 1}-10`,
          `CG-${2020 + index}`,
          lost
            ? {
                declaredStatus: 'lost',
                declaredReason: 'Perdue lors du dernier contrôle routier.',
                declaredAt: inDays(-3),
                declaredBy: 'FLT001'
              }
            : {}
        )
      )
    }
    docs.push(
      limited(
        'vehicle',
        no,
        'VEH-INS',
        12,
        index === 8 ? 18 : 120 + index * 9,
        `${insurerPrefix(index)}-2026-${pad(index, 4)}`
      )
    )
    docs.push(
      limited(
        'vehicle',
        no,
        'VEH-INSP',
        6,
        index === 5 ? -6 : index === 12 ? 20 : 60 + index * 4,
        `VT-2026-${pad(index, 4)}`
      )
    )
    if (tractor) {
      docs.push(limited('vehicle', no, 'VEH-TAX', 12, 200 + index * 7, `VIG-2026-${pad(index, 4)}`))
      if (index % 3 === 0)
        docs.push(
          limited('vehicle', no, 'VEH-FISC', 12, 150 + index * 5, `CF-2026-${pad(index, 4)}`)
        )
    }
  }
  return docs
}

/** Days before the end of the licence and of the medical check of each driver and assistant. */
const CREW_DAYS: Record<string, [number, number, string]> = {
  'UCT-010': [420, 180, 'CE'],
  'UCT-011': [300, 12, 'CE'],
  'UCT-012': [610, 260, 'CE'],
  'UCT-013': [95, 40, 'CE'],
  'UCT-014': [540, 21, 'CE'],
  'UCT-015': [380, 200, 'C'],
  'UCT-016': [-18, 60, 'CE'],
  'UCT-017': [250, 130, 'CE'],
  'UCT-018': [480, -35, 'CE'],
  'UCT-019': [700, 300, 'CE'],
  'UCT-020': [350, 150, 'B'],
  'UCT-021': [210, 25, 'B'],
  'UCT-022': [90, -8, 'B'],
  'UCT-023': [560, 240, 'B'],
  'UCT-024': [140, 55, 'B']
}

function personDocuments(): Seed[] {
  const docs: Seed[] = []
  for (let index = 1; index <= 24; index++) {
    const no = `UCT-${pad(index)}`
    const crew = CREW_DAYS[no]
    if (crew) {
      const [licenceDays, medicalDays, category] = crew
      docs.push(
        limited('person', no, 'PER-LIC', 120, licenceDays, `PC-${20190000 + index}`, {
          detail: category
        })
      )
      docs.push(limited('person', no, 'PER-MED', 12, medicalDays, `VM-2026-${pad(index)}`))
    }
    docs.push(unlimited('person', no, 'PER-ID', '2012-04-11', `101 234 ${pad(500 + index)}`))
    docs.push(
      unlimited('person', no, 'PER-CTR', crew ? '2024-11-04' : '2024-09-02', `CTR-${pad(index)}`)
    )
    if (index >= 10 && index <= 15) {
      docs.push(
        unlimited('person', no, 'PER-TRN', '2024-11-12', `FOR-2024-${pad(index)}`, {
          detail: 'Conduite préventive poids lourd'
        })
      )
    }
  }
  return docs
}

function seed(): Omit<DocumentRow, keyof typeof seedAudit>[] {
  const current = [...vehicleDocuments(), ...personDocuments()].map((doc, index) => ({
    no: `DOC-${pad(index + 1, 5)}`,
    ...doc
  }))
  const insurance = current.find(
    (doc) => doc.subjectNo === 'VEH-001' && doc.documentTypeNo === 'VEH-INS'
  )
  if (!insurance) return current
  insurance.version = 2
  const previous = {
    ...insurance,
    no: `DOC-${pad(current.length + 1, 5)}`,
    number: 'ARO-2025-0001',
    issueDate: addMonths(insurance.issueDate ?? DEMO_REFERENCE_DATE, -12),
    expiryDate: addMonths(insurance.expiryDate ?? DEMO_REFERENCE_DATE, -12),
    version: 1,
    replacedByNo: insurance.no
  }
  return [...current, previous]
}

export const documentsCollection: CollectionDefinition<DocumentRow> = {
  name: 'documents',
  seed: () => seed().map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['issueDate', 'expiryDate', 'declaredAt']
}
