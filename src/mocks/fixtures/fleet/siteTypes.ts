import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface SiteTypeRow extends MockRow {
  name: string
  defaultRadiusM: number
  color: string
  loadingDepot: boolean
  restAllowed: boolean
  restricted: boolean
  active: boolean
}

const SEED: Omit<SiteTypeRow, keyof typeof seedAudit>[] = [
  {
    no: 'BASE',
    name: 'Base',
    defaultRadiusM: 800,
    color: '#0b4480',
    loadingDepot: false,
    restAllowed: true,
    restricted: false,
    active: true
  },
  {
    no: 'DEPOT',
    name: 'Dépôt',
    defaultRadiusM: 800,
    color: '#0b4480',
    loadingDepot: true,
    restAllowed: true,
    restricted: false,
    active: true
  },
  {
    no: 'CUST-WH',
    name: 'Entrepôt client',
    defaultRadiusM: 600,
    color: '#16a34a',
    loadingDepot: false,
    restAllowed: false,
    restricted: false,
    active: true
  },
  {
    no: 'WORKSHOP',
    name: 'Atelier',
    defaultRadiusM: 400,
    color: '#ca8a04',
    loadingDepot: false,
    restAllowed: false,
    restricted: false,
    active: true
  },
  {
    no: 'PARKING',
    name: 'Parking',
    defaultRadiusM: 500,
    color: '#6b7280',
    loadingDepot: false,
    restAllowed: true,
    restricted: false,
    active: true
  },
  {
    no: 'RISK-ZONE',
    name: 'Zone à risque',
    defaultRadiusM: 3000,
    color: '#dc2626',
    loadingDepot: false,
    restAllowed: false,
    restricted: true,
    active: true
  },
  {
    no: 'CHECKPOINT',
    name: 'Point de contrôle',
    defaultRadiusM: 600,
    color: '#2563eb',
    loadingDepot: false,
    restAllowed: false,
    restricted: false,
    active: true
  },
  {
    no: 'RELAY',
    name: 'Relais',
    defaultRadiusM: 1000,
    color: '#ca8a04',
    loadingDepot: false,
    restAllowed: true,
    restricted: false,
    active: true
  }
]

export const siteTypesCollection: CollectionDefinition<SiteTypeRow> = {
  name: 'site-types',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
