import type { InspectionResult } from '@/modules/fleet/inspections/types/inspection.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface InspectionRow extends MockRow {
  vehicleNo: string
  inspectedOn: string
  center: string
  result: InspectionResult
  findings: string
  recheckDoneOn: string | null
}

const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)
const ALAROBIA = 'Centre de contrôle technique d’Alarobia'
const TANJOMBATO = 'Centre de contrôle technique de Tanjombato'

const SEED: Omit<InspectionRow, keyof typeof seedAudit>[] = [
  {
    no: 'INS-00001',
    vehicleNo: 'VEH-001',
    inspectedOn: day(-100),
    center: ALAROBIA,
    result: 'conforming',
    findings: '',
    recheckDoneOn: null
  },
  {
    no: 'INS-00002',
    vehicleNo: 'VEH-012',
    inspectedOn: day(-160),
    center: TANJOMBATO,
    result: 'conforming',
    findings: '',
    recheckDoneOn: null
  },
  {
    no: 'INS-00003',
    vehicleNo: 'VEH-016',
    inspectedOn: day(-30),
    center: TANJOMBATO,
    result: 'non_conforming',
    findings: 'Feu de gabarit arrière gauche hors service.',
    recheckDoneOn: day(-24)
  },
  {
    no: 'INS-00004',
    vehicleNo: 'VEH-022',
    inspectedOn: day(-10),
    center: ALAROBIA,
    result: 'non_conforming',
    findings: 'Jeu excessif dans la direction ; fuite au raccord de la vanne de fond.',
    recheckDoneOn: null
  }
]

export const inspectionsCollection: CollectionDefinition<InspectionRow> = {
  name: 'inspections',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['inspectedOn', 'recheckDoneOn']
}
