import type {
  DocumentTarget,
  PersonScope,
  DocumentValidity
} from '@/modules/fleet/document-types/types/documentType.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface DocumentTypeRow extends MockRow {
  name: string
  target: DocumentTarget
  personScope: PersonScope
  vehicleTypeNos: string[]
  mandatory: boolean
  active: boolean
  validity: DocumentValidity
  durationMonths: number | null
  noticeDays: number | null
}

const SEED: Omit<DocumentTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'VEH-REG',
    name: 'Carte grise',
    target: 'vehicle',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'unlimited',
    durationMonths: null,
    noticeDays: null,
    active: true
  },
  {
    no: 'VEH-INS',
    name: "Attestation d'assurance",
    target: 'vehicle',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'limited',
    durationMonths: 12,
    noticeDays: 30,
    active: true
  },
  {
    no: 'VEH-INSP',
    name: 'Visite technique',
    target: 'vehicle',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'limited',
    durationMonths: 6,
    noticeDays: 30,
    active: true
  },
  {
    no: 'VEH-TAX',
    name: 'Vignette',
    target: 'vehicle',
    vehicleTypeNos: ['TRACTOR'],
    personScope: 'all',
    mandatory: true,
    validity: 'limited',
    durationMonths: 12,
    noticeDays: 30,
    active: true
  },
  {
    no: 'VEH-FISC',
    name: 'Carte fiscale',
    target: 'vehicle',
    vehicleTypeNos: ['TRACTOR'],
    personScope: 'all',
    mandatory: false,
    validity: 'limited',
    durationMonths: 12,
    noticeDays: 30,
    active: true
  },
  {
    no: 'PER-LIC',
    name: 'Permis de conduire',
    target: 'person',
    vehicleTypeNos: [],
    personScope: 'drivers',
    mandatory: true,
    validity: 'limited',
    durationMonths: 120,
    noticeDays: 60,
    active: true
  },
  {
    no: 'PER-MED',
    name: 'Visite médicale',
    target: 'person',
    vehicleTypeNos: [],
    personScope: 'drivers',
    mandatory: true,
    validity: 'limited',
    durationMonths: 12,
    noticeDays: 30,
    active: true
  },
  {
    no: 'PER-ID',
    name: "Carte d'identité nationale",
    target: 'person',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'unlimited',
    durationMonths: null,
    noticeDays: null,
    active: true
  },
  {
    no: 'PER-CTR',
    name: 'Contrat de travail',
    target: 'person',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'unlimited',
    durationMonths: null,
    noticeDays: null,
    active: true
  },
  {
    no: 'PER-TRN',
    name: 'Attestation de formation',
    target: 'person',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: false,
    validity: 'unlimited',
    durationMonths: null,
    noticeDays: null,
    active: true
  },
  {
    no: 'PER-CERT',
    name: 'Certification',
    target: 'person',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: false,
    validity: 'limited',
    durationMonths: 24,
    noticeDays: 30,
    active: true
  },
  {
    no: 'CO-STAT',
    name: 'Statuts de la société',
    target: 'company',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'unlimited',
    durationMonths: null,
    noticeDays: null,
    active: true
  },
  {
    no: 'CO-LIC',
    name: 'Licence de transport',
    target: 'company',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: true,
    validity: 'limited',
    durationMonths: 12,
    noticeDays: 60,
    active: true
  },
  {
    no: 'CO-TAX',
    name: 'Attestation de régularité fiscale',
    target: 'company',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: false,
    validity: 'limited',
    durationMonths: 12,
    noticeDays: 30,
    active: true
  },
  {
    no: 'CO-PROC',
    name: 'Procédure interne',
    target: 'company',
    vehicleTypeNos: [],
    personScope: 'all',
    mandatory: false,
    validity: 'unlimited',
    durationMonths: null,
    noticeDays: null,
    active: true
  }
]

export const documentTypesCollection: CollectionDefinition<DocumentTypeRow> = {
  name: 'document-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
