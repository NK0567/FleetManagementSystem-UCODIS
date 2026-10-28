import type {
  LineResponsibility,
  ProtestNote,
  ProtestStatus,
  QualityActor,
  QualityFact,
  QualityOrigin,
  ResponsibilityImpact
} from '../domain/quality'

export interface ProtestRowApi extends ProtestNote {
  status: ProtestStatus
}

export interface QualityRowApi {
  orderNo: string
  lineNo: number
  recipientName: string
  deliveryPointName: string
  productName: string
  unit: string
  /** Loaded quantity, or ordered when nothing was loaded: the ceiling of a protest. */
  quantity: number
  means: 'fleet' | 'carrier' | null
  facts: QualityFact[]
  protests: ProtestRowApi[]
  responsibility: LineResponsibility | null
  creditReference: string | null
  creditIssuedAt: string | null
}

export interface ProtestInput {
  reasonNo: string
  comment: string
  quantity: number
}

export interface ResponsibilityInput {
  origin: QualityOrigin
  comment: string
  shares: { actor: QualityActor; percent: number }[]
  impacts: ResponsibilityImpact[]
}
