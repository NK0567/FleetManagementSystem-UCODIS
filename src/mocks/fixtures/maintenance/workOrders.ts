import type {
  PartLine,
  WorkOrderApi
} from '@/modules/maintenance/work-orders/types/workOrder.types'
import { addDays } from '@/utils/date'
import { DEMO_REFERENCE_DATE } from '../../clock'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export type WorkOrderRow = MockRow &
  Pick<
    WorkOrderApi,
    | 'vehicleNo'
    | 'maintenanceType'
    | 'severity'
    | 'origin'
    | 'originNo'
    | 'symptom'
    | 'declaredAt'
    | 'declaredBy'
    | 'odometerKmAtOpening'
    | 'diagnosis'
    | 'labour'
    | 'parts'
    | 'planning'
    | 'startedAt'
    | 'completedAt'
    | 'completedBy'
    | 'workDone'
    | 'odometerKmAtCompletion'
    | 'validatedAt'
    | 'validatedBy'
    | 'cancelledAt'
    | 'cancelledBy'
    | 'cancelReason'
    | 'downtimeNo'
    | 'external'
    | 'historicalCost'
    | 'serviceOperationNos'
    | 'history'
  >

type Seed = Omit<WorkOrderRow, keyof typeof seedAudit>

const at = (days: number, time: string) => `${addDays(DEMO_REFERENCE_DATE, days)}T${time}:00`
const day = (days: number) => addDays(DEMO_REFERENCE_DATE, days)

const stockPart = (itemNo: string, label: string, quantity: number, unitPrice: number) => ({
  itemNo,
  label,
  quantity,
  unitPrice,
  purchaseRequestNo: null,
  receivedAt: '2026-08-18T08:00:00'
})

const open = {
  originNo: null,
  startedAt: null,
  completedAt: null,
  completedBy: null,
  workDone: '',
  odometerKmAtCompletion: null,
  validatedAt: null,
  validatedBy: null,
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: '',
  downtimeNo: null,
  external: null,
  historicalCost: null,
  serviceOperationNos: [] as string[],
  parts: [] as PartLine[],
  planning: null
}

const SEED: Seed[] = [
  {
    ...open,
    no: 'OT-2026-0001',
    vehicleNo: 'VEH-001',
    maintenanceType: 'preventive',
    severity: 'minor',
    origin: 'preventive',
    symptom: 'Entretien des 180 000 km : vidange moteur, filtres à huile et à gazole.',
    declaredAt: '2026-08-17T16:00:00',
    declaredBy: 'FLT001',
    odometerKmAtOpening: 180_420,
    diagnosis: {
      subsystemNo: 'ENGINE',
      modeNo: null,
      causeNo: null,
      by: 'MNT001',
      at: '2026-08-18T07:00:00'
    },
    labour: [{ technicianNo: 'UCT-003', date: '2026-08-18', hours: 6, loggedBy: 'MNT001' }],
    startedAt: '2026-08-18T07:00:00',
    completedAt: '2026-08-18T16:45:00',
    completedBy: 'MNT001',
    workDone: 'Vidange faite, filtres à huile et à gazole remplacés, niveaux contrôlés.',
    odometerKmAtCompletion: 180_420,
    validatedAt: '2026-08-18T17:30:00',
    validatedBy: 'FLT001',
    downtimeNo: 'IND-00001',
    serviceOperationNos: ['OP-001', 'OP-002'],
    parts: [
      stockPart('FLT-HUI-HW', 'Filtre à huile Howo', 1, 45_000),
      stockPart('FLT-GAZ-HW', 'Filtre à gazole Howo', 1, 52_000),
      stockPart('HUI-15W40', 'Huile moteur 15W40 (bidon de 20 L)', 2, 28_000)
    ],
    history: []
  },
  {
    ...open,
    no: 'OT-2026-0002',
    vehicleNo: 'VEH-010',
    maintenanceType: 'corrective',
    severity: 'major',
    origin: 'driver_report',
    symptom: "Perte de pression d'air au freinage, sifflement côté gauche.",
    declaredAt: '2026-08-27T09:00:00',
    declaredBy: 'FLT001',
    odometerKmAtOpening: 112_600,
    diagnosis: {
      subsystemNo: 'AIR',
      modeNo: 'LEAK',
      causeNo: 'POOR-MAINTENANCE',
      by: 'MNT001',
      at: '2026-08-27T11:00:00'
    },
    labour: [
      { technicianNo: 'UCT-008', date: '2026-08-28', hours: 4, loggedBy: 'MNT001' },
      { technicianNo: 'UCT-003', date: '2026-08-29', hours: 2, loggedBy: 'MNT001' }
    ],
    startedAt: '2026-08-28T08:00:00',
    completedAt: '2026-08-29T14:30:00',
    completedBy: 'MNT001',
    workDone: 'Raccord du circuit de freinage gauche remplacé, essai de pression conforme.',
    odometerKmAtCompletion: 112_600,
    validatedAt: '2026-08-29T15:00:00',
    validatedBy: 'FLT001',
    downtimeNo: 'IND-00003',
    parts: [
      {
        itemNo: null,
        label: "Raccord rapide du circuit d'air",
        quantity: 1,
        unitPrice: 35_000,
        purchaseRequestNo: 'DA-2026-0002',
        receivedAt: '2026-08-28T16:00:00'
      }
    ],
    history: []
  },
  {
    ...open,
    no: 'OT-2026-0003',
    vehicleNo: 'VEH-002',
    maintenanceType: 'corrective',
    severity: 'minor',
    origin: 'driver_report',
    symptom: 'Grincement au freinage à basse vitesse.',
    declaredAt: at(-1, '08:00'),
    declaredBy: 'FLT001',
    odometerKmAtOpening: 165_900,
    diagnosis: {
      subsystemNo: 'BRAKES',
      modeNo: 'WEAR',
      causeNo: 'POOR-MAINTENANCE',
      by: 'MNT001',
      at: at(-1, '10:30')
    },
    labour: [],
    planning: { date: day(1), estimatedHours: 3, technicianNos: ['UCT-003'] },
    history: []
  },
  {
    ...open,
    no: 'OT-2026-0004',
    vehicleNo: 'VEH-008',
    maintenanceType: 'corrective',
    severity: 'critical',
    origin: 'driver_report',
    symptom: 'Le démarreur ne répond plus ; le moteur ne se lance pas.',
    declaredAt: at(-2, '14:00'),
    declaredBy: 'FLT001',
    odometerKmAtOpening: 132_800,
    diagnosis: {
      subsystemNo: 'ELECTRONICS',
      modeNo: 'NOT-WORKING',
      causeNo: 'SUPPLIER',
      by: 'MNT001',
      at: at(-2, '16:00')
    },
    labour: [
      { technicianNo: 'UCT-008', date: day(-1), hours: 3, loggedBy: 'MNT001' },
      { technicianNo: 'UCT-003', date: day(-1), hours: 2, loggedBy: 'MNT001' }
    ],
    startedAt: at(-1, '08:00'),
    completedAt: at(0, '08:30'),
    completedBy: 'MNT001',
    workDone: 'Démarreur remplacé, essais de démarrage concluants.',
    odometerKmAtCompletion: 132_800,
    downtimeNo: 'IND-00004',
    history: []
  },
  {
    ...open,
    no: 'OT-2026-0005',
    vehicleNo: 'VEH-005',
    maintenanceType: 'corrective',
    severity: 'major',
    origin: 'driver_report',
    symptom: 'Les vitesses craquent et la 4e saute sous charge.',
    declaredAt: '2026-08-04T10:00:00',
    declaredBy: 'FLT001',
    odometerKmAtOpening: 243_700,
    diagnosis: {
      subsystemNo: 'TRANSMISSION',
      modeNo: 'BREAKAGE',
      causeNo: 'SUPPLIER',
      by: 'MNT001',
      at: '2026-08-04T15:00:00'
    },
    labour: [{ technicianNo: 'UCT-008', date: '2026-08-04', hours: 2, loggedBy: 'MNT001' }],
    startedAt: '2026-08-05T08:00:00',
    completedAt: '2026-08-12T15:00:00',
    completedBy: 'MNT001',
    workDone: 'Boîte de vitesses déposée et reconditionnée par le garage, synchros remplacés.',
    odometerKmAtCompletion: 243_720,
    validatedAt: '2026-08-12T17:00:00',
    validatedBy: 'FLT001',
    downtimeNo: 'IND-00005',
    external: {
      providerNo: 'PRS-002',
      handedOverAt: '2026-08-05T08:00:00',
      expectedReturnOn: '2026-08-11',
      quoteAmount: 4_500_000,
      progress: 'Synchros commandés chez le distributeur.',
      returnedAt: '2026-08-12T15:00:00',
      finalAmount: 4_800_000
    },
    history: []
  }
]

export const workOrdersCollection: CollectionDefinition<WorkOrderRow> = {
  name: 'work-orders',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit })),
  dateFields: [
    'declaredAt',
    'external.handedOverAt',
    'external.expectedReturnOn',
    'external.returnedAt',
    'diagnosis.at',
    'labour[].date',
    'parts[].receivedAt',
    'planning.date',
    'startedAt',
    'completedAt',
    'validatedAt',
    'cancelledAt',
    'history[].at'
  ]
}
