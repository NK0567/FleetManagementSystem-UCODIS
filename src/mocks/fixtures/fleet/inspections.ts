import type { InspectionItemResult } from '@/modules/fleet/inspections/domain/inspection'
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
  items: InspectionItemResult[]
  inspector: string
  signedBy: string | null
  signedAt: string | null
}

const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)
const ALAROBIA = 'Centre de contrôle technique d’Alarobia'
const TANJOMBATO = 'Centre de contrôle technique de Tanjombato'

type Verdict = InspectionItemResult['verdict']
const grid = (
  part: InspectionItemResult['part'],
  entries: [string, string, Verdict, string?][]
): InspectionItemResult[] =>
  entries.map(([itemNo, label, verdict, comment]) => ({
    itemNo,
    label,
    part,
    verdict,
    comment: comment ?? ''
  }))

/** Recorded before the grid existed: no item, no signature. */
const legacy = { items: [], inspector: '', signedBy: null, signedAt: null }

const SEED: Omit<InspectionRow, keyof typeof seedAudit>[] = [
  {
    no: 'INS-00001',
    vehicleNo: 'VEH-001',
    inspectedOn: day(-100),
    center: ALAROBIA,
    result: 'conforming',
    findings: '',
    recheckDoneOn: null,
    ...legacy
  },
  {
    no: 'INS-00002',
    vehicleNo: 'VEH-012',
    inspectedOn: day(-160),
    center: TANJOMBATO,
    result: 'conforming',
    findings: '',
    recheckDoneOn: null,
    ...legacy
  },
  {
    no: 'INS-00003',
    vehicleNo: 'VEH-016',
    inspectedOn: day(-30),
    center: TANJOMBATO,
    result: 'non_conforming',
    findings: 'Feu de gabarit arrière gauche hors service.',
    recheckDoneOn: day(-24),
    ...legacy
  },
  {
    no: 'INS-00004',
    vehicleNo: 'VEH-022',
    inspectedOn: day(-10),
    center: ALAROBIA,
    result: 'non_conforming',
    findings: 'Jeu excessif dans la direction ; fuite au raccord de la vanne de fond.',
    recheckDoneOn: null,
    items: [
      ...grid('vehicle', [
        ['VH-01', 'Freinage de service et de stationnement', 'conforming'],
        ['VH-02', 'Direction et timonerie', 'non_conforming', 'Jeu excessif dans la direction.'],
        ['VH-03', 'Suspension et essieux', 'conforming'],
        ['VH-04', 'Pneumatiques et roues', 'observation', 'Usure irrégulière, essieu 2 gauche.'],
        ['VH-05', 'Éclairage et signalisation', 'conforming'],
        ['VH-06', 'Châssis, attelage et sellette', 'conforming'],
        ['VH-07', 'Extincteurs et équipements de sécurité', 'conforming']
      ]),
      ...grid('tank', [
        ['CT-01', 'Étanchéité de la citerne et des compartiments', 'conforming'],
        [
          'CT-02',
          'Vannes de fond et clapets',
          'non_conforming',
          'Fuite au raccord de la vanne de fond.'
        ],
        ['CT-03', 'Trous d’homme et soupapes', 'conforming'],
        ['CT-04', 'Mise à la terre et liaison équipotentielle', 'conforming'],
        ['CT-05', 'Plaques et marquage de danger', 'conforming']
      ])
    ],
    inspector: 'Faly Rasolofo',
    signedBy: 'FLT001',
    signedAt: `${day(-10)}T11:40:00`
  }
]

export const inspectionsCollection: CollectionDefinition<InspectionRow> = {
  name: 'inspections',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit })),
  dateFields: ['inspectedOn', 'recheckDoneOn', 'signedAt']
}
