import type { CompanyDocumentStatus } from '@/modules/fleet/company-documents/types/companyDocument.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface CompanyDocumentRow extends MockRow {
  name: string
  documentTypeNo: string
  orgUnitNo: string | null
  keywords: string[]
  issueDate: string
  expiryDate: string | null
  /** Required on upload; the demo records come without a scan. */
  fileNo: string | null
  status: CompanyDocumentStatus
  decidedBy: string | null
  decidedAt: string | null
  decisionReason: string
  supersedesNo: string | null
  replacedByNo: string | null
  version: number
}

type Seed = Omit<CompanyDocumentRow, keyof typeof seedAudit | 'no'>

const inDays = (days: number) => addDays(DEMO_REFERENCE_DATE, days)
const decidedOn = (days: number) => `${inDays(days)}T09:30:00.000Z`

function approved(seed: Partial<Seed> & Pick<Seed, 'name' | 'documentTypeNo' | 'issueDate'>): Seed {
  return {
    orgUnitNo: null,
    keywords: [],
    expiryDate: null,
    fileNo: null,
    status: 'approved',
    decidedBy: 'DIR001',
    decidedAt: decidedOn(-200),
    decisionReason: '',
    supersedesNo: null,
    replacedByNo: null,
    version: 1,
    ...seed
  }
}

const SEED: (Seed & { no: string; createdBy?: string })[] = [
  {
    no: 'DE-0001',
    ...approved({
      name: 'Statuts de la société UCODIS Transport',
      documentTypeNo: 'CO-STAT',
      orgUnitNo: 'UCT',
      keywords: ['statuts', 'juridique'],
      issueDate: '2019-03-12'
    })
  },
  {
    no: 'DE-0002',
    ...approved({
      name: 'Licence de transport de marchandises',
      documentTypeNo: 'CO-LIC',
      orgUnitNo: 'FLT',
      keywords: ['licence', 'transport'],
      issueDate: inDays(-705),
      expiryDate: inDays(-340),
      decidedAt: decidedOn(-700),
      replacedByNo: 'DE-0003'
    })
  },
  {
    no: 'DE-0003',
    ...approved({
      name: 'Licence de transport de marchandises',
      documentTypeNo: 'CO-LIC',
      orgUnitNo: 'FLT',
      keywords: ['licence', 'transport'],
      issueDate: inDays(-340),
      expiryDate: inDays(25),
      decidedAt: decidedOn(-338),
      supersedesNo: 'DE-0002',
      version: 2
    })
  },
  {
    no: 'DE-0004',
    ...approved({
      name: 'Procédure de chargement des citernes',
      documentTypeNo: 'CO-PROC',
      orgUnitNo: 'DEP',
      keywords: ['citerne', 'sécurité', 'chargement'],
      issueDate: inDays(-120)
    })
  },
  {
    no: 'DE-0005',
    ...approved({
      name: 'Attestation de régularité fiscale',
      documentTypeNo: 'CO-TAX',
      keywords: ['fiscal', 'impôts'],
      issueDate: inDays(-30),
      expiryDate: inDays(335),
      status: 'rejected',
      decidedAt: decidedOn(-28),
      decisionReason: 'Scan illisible : merci de déposer une copie nette des deux pages.'
    }),
    createdBy: 'FLT001'
  },
  {
    no: 'DE-0006',
    ...approved({
      name: 'Attestation de régularité fiscale',
      documentTypeNo: 'CO-TAX',
      keywords: ['fiscal', 'impôts'],
      issueDate: inDays(-30),
      expiryDate: inDays(335),
      status: 'pending',
      decidedBy: null,
      decidedAt: null
    }),
    createdBy: 'FLT001'
  },
  {
    no: 'DE-0007',
    ...approved({
      name: 'Procédure de dépotage en station',
      documentTypeNo: 'CO-PROC',
      orgUnitNo: 'DEP',
      keywords: ['dépotage', 'station'],
      issueDate: inDays(-3),
      status: 'pending',
      decidedBy: null,
      decidedAt: null
    })
  }
]

export const companyDocumentsCollection: CollectionDefinition<CompanyDocumentRow> = {
  name: 'company-documents',
  seed: () =>
    SEED.map(({ createdBy, ...row }) => ({
      ...row,
      ...seedAudit,
      ...(createdBy ? { createdBy, modifiedBy: createdBy } : {})
    })),
  dateFields: ['issueDate', 'expiryDate', 'decidedAt']
}
