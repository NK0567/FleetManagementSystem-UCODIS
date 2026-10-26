import type { DeviationSeverity } from '@/modules/fleet/deviation-types/types/deviationType.types'
import type {
  DeviationQualification,
  DeviationSource
} from '@/modules/fleet/route-deviations/domain/routeDeviation'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface RouteDeviationRow extends MockRow {
  tripNo: string
  deviationTypeNo: string
  severity: DeviationSeverity
  source: DeviationSource
  detectedAt: string
  endedAt: string | null
  measure: number | null
  location: string
  latitude: number | null
  longitude: number | null
  justification: string
  justifiedAt: string | null
  justifiedBy: string | null
  qualification: DeviationQualification | null
}

const blank = {
  endedAt: null,
  latitude: null,
  longitude: null,
  justification: '',
  justifiedAt: null,
  justifiedBy: null,
  qualification: null
}

const SEED: Omit<RouteDeviationRow, keyof typeof seedAudit>[] = [
  {
    no: 'ECA-00001',
    tripNo: 'TRP-00002',
    deviationTypeNo: 'KM-GAP',
    severity: 'minor',
    source: 'telematics',
    detectedAt: '2026-08-20T13:10:00',
    measure: 8.2,
    location: 'RN2, déviation de Manjakandriana',
    ...blank,
    justification: 'Route barrée pour travaux, déviation imposée par la gendarmerie.',
    justifiedAt: '2026-08-20T15:00:00',
    justifiedBy: 'CND001',
    qualification: {
      nature: 'endured',
      decision: 'dismissed',
      reason: 'Déviation officielle confirmée par le bulletin routier du jour.',
      by: 'FLT001',
      at: '2026-08-21T09:00:00'
    }
  },
  {
    no: 'ECA-00002',
    tripNo: 'TRP-00003',
    deviationTypeNo: 'TIME-WINDOW',
    severity: 'minor',
    source: 'telematics',
    detectedAt: '2026-08-26T14:40:00',
    measure: 95,
    location: 'Station Antsirabe Nord',
    ...blank,
    qualification: {
      nature: 'unjustified',
      decision: 'warning',
      reason: 'Arrêt prolongé non déclaré avant la livraison ; aucune justification reçue.',
      by: 'FLT001',
      at: '2026-08-29T10:30:00'
    }
  },
  {
    no: 'ECA-00003',
    tripNo: 'TRP-00001',
    deviationTypeNo: 'STOP-ORDER',
    severity: 'minor',
    source: 'telematics',
    detectedAt: '2026-08-24T09:20:00',
    measure: null,
    location: 'Ambatolampy',
    ...blank
  },
  {
    no: 'ECA-00004',
    tripNo: 'TRP-00006',
    deviationTypeNo: 'UNPLANNED-STOP',
    severity: 'critical',
    source: 'telematics',
    detectedAt: '2026-09-04T08:10:00',
    measure: 35,
    location: 'RN7, PK 24',
    ...blank,
    endedAt: '2026-09-04T08:45:00',
    latitude: -19.0806,
    longitude: 47.5246
  }
]

export const routeDeviationsCollection: CollectionDefinition<RouteDeviationRow> = {
  name: 'route-deviations',
  seed: () =>
    SEED.map((row) => ({ ...row, ...seedAudit, createdBy: 'SYSTEM', modifiedBy: 'SYSTEM' })),
  dateFields: ['detectedAt', 'endedAt', 'justifiedAt', 'qualification.at']
}
