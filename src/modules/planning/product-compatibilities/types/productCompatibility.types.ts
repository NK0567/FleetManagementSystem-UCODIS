export const PRODUCT_COMPATIBILITY_KINDS = ['together', 'succession'] as const
export type ProductCompatibilityKind = (typeof PRODUCT_COMPATIBILITY_KINDS)[number]

export interface ProductCompatibilityApi {
  no: string
  kind: ProductCompatibilityKind
  productANo: string
  productBNo: string
  active: boolean
  productAName: string
  productBName: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ProductCompatibilitySearchColumn =
  | 'no'
  | 'productAName'
  | 'productBName'
  | 'no,productAName,productBName'
