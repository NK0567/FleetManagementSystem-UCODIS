export const TARIFF_TARGETS = ['customer', 'carrier'] as const
export type TariffTarget = (typeof TARIFF_TARGETS)[number]

export const TARIFF_BASES = ['route_template', 'distance', 'weight', 'quantity'] as const
export type TariffBasis = (typeof TARIFF_BASES)[number]

export interface TransportTariffApi {
  no: string
  target: TariffTarget
  customerNo: string | null
  carrierNo: string | null
  basis: TariffBasis
  routeTemplateNo: string | null
  price: number
  active: boolean
  family: string
  productNo: string | null
  partyName: string
  routeTemplateName: string
  productName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type TransportTariffSearchColumn = 'no' | 'partyName' | 'family' | 'no,partyName,family'
