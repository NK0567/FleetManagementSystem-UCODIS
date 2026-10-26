import type {
  TariffTarget,
  TariffBasis
} from '@/modules/planning/transport-tariffs/types/transportTariff.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface TransportTariffRow extends MockRow {
  target: TariffTarget
  customerNo: string | null
  carrierNo: string | null
  basis: TariffBasis
  routeTemplateNo: string | null
  price: number
  active: boolean
  family: string
  productNo: string | null
}

const SEED: Omit<TransportTariffRow, keyof typeof seedAudit>[] = [
  {
    no: 'TRF-001',
    target: 'customer',
    customerNo: 'CLI-002',
    carrierNo: null,
    basis: 'route_template',
    price: 1800000,
    routeTemplateNo: 'TNR-ATS',
    family: '',
    productNo: null,
    active: true
  },
  {
    no: 'TRF-002',
    target: 'customer',
    customerNo: 'CLI-001',
    carrierNo: null,
    basis: 'weight',
    price: 95000,
    routeTemplateNo: null,
    family: '',
    productNo: null,
    active: true
  },
  {
    no: 'TRF-003',
    target: 'customer',
    customerNo: 'CLI-003',
    carrierNo: null,
    basis: 'distance',
    price: 4200,
    routeTemplateNo: null,
    family: '',
    productNo: null,
    active: true
  },
  {
    no: 'TRF-004',
    target: 'carrier',
    customerNo: null,
    carrierNo: 'PRS-016',
    basis: 'distance',
    price: 3600,
    routeTemplateNo: null,
    family: '',
    productNo: null,
    active: true
  },
  {
    no: 'TRF-005',
    target: 'carrier',
    customerNo: null,
    carrierNo: 'PRS-017',
    basis: 'route_template',
    price: 2400000,
    routeTemplateNo: 'TNR-TOA',
    family: '',
    productNo: null,
    active: true
  },
  {
    no: 'TRF-006',
    target: 'carrier',
    customerNo: null,
    carrierNo: 'PRS-017',
    basis: 'quantity',
    price: 45,
    routeTemplateNo: null,
    family: 'Carburant',
    productNo: null,
    active: true
  }
]

export const transportTariffsCollection: CollectionDefinition<TransportTariffRow> = {
  name: 'transport-tariffs',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
