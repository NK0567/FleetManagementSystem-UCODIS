import type { RouteStop, StopRole } from '@/modules/fleet/route-templates/domain/routeTemplate'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface RouteTemplateRow extends MockRow {
  name: string
  recurring: boolean
  estimatedDistanceKm: number
  fuelReferenceL100: number | null
  active: boolean
  stops: RouteStop[]
}

const stop = (siteNo: string, role: StopRole, plannedIntervalMin: number, breakMin = 0) => ({
  siteNo,
  role,
  plannedIntervalMin,
  breakMin
})

export const ROUTE_TEMPLATE_STOPS: Record<'TNR-TOA' | 'TNR-ATS' | 'TNR-MJN', RouteStop[]> = {
  'TNR-TOA': [
    stop('DEP-TNJ', 'departure', 0),
    stop('ENT-TNJ', 'loading', 25),
    stop('REL-MOR', 'rest', 140, 45),
    stop('PTC-BRK', 'check', 85),
    stop('ENT-TOA', 'delivery', 155)
  ],
  'TNR-ATS': [
    stop('DEP-TNJ', 'departure', 0),
    stop('STA-AMB', 'check', 100, 15),
    stop('ENT-ATS', 'delivery', 95)
  ],
  'TNR-MJN': [
    stop('DEP-TNJ', 'departure', 0),
    stop('PTC-ANK', 'check', 130),
    stop('PTC-MEV', 'check', 260, 45),
    stop('ENT-MJN', 'delivery', 285)
  ]
}

const SEED: Omit<RouteTemplateRow, keyof typeof seedAudit>[] = [
  {
    no: 'TNR-TOA',
    name: 'Antananarivo → Toamasina (RN2)',
    recurring: true,
    estimatedDistanceKm: 352,
    fuelReferenceL100: 36,
    active: true,
    stops: ROUTE_TEMPLATE_STOPS['TNR-TOA']
  },
  {
    no: 'TNR-ATS',
    name: 'Antananarivo → Antsirabe (RN7)',
    recurring: true,
    estimatedDistanceKm: 168,
    fuelReferenceL100: 32,
    active: true,
    stops: ROUTE_TEMPLATE_STOPS['TNR-ATS']
  },
  {
    no: 'TNR-MJN',
    name: 'Antananarivo → Mahajanga (RN4)',
    recurring: true,
    estimatedDistanceKm: 570,
    fuelReferenceL100: 39,
    active: true,
    stops: ROUTE_TEMPLATE_STOPS['TNR-MJN']
  }
]

export const routeTemplatesCollection: CollectionDefinition<RouteTemplateRow> = {
  name: 'route-templates',
  seed: () => SEED.map((row) => ({ ...structuredClone(row), ...seedAudit }))
}
