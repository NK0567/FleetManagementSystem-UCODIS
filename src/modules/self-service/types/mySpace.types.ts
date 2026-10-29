import type {
  CompartmentPlanApi,
  TransportOrderStatus
} from '@/modules/planning/transport-orders/types/transportOrder.types'
import type { CheckResult } from '@/modules/fleet/check-points'
import type { DepartureAuthorizationApi } from '@/modules/fleet/departure-authorizations'
import type { DocumentState } from '@/modules/fleet/documents'
import type { StopRole } from '@/modules/fleet/route-templates'
import type { TripStatus } from '@/modules/fleet/trips'
import type { OverToleranceMode } from '@/modules/planning/planning-settings/domain/planningSettings'
import type { ToleranceRule } from '@/modules/planning/quantity-tolerances/domain/quantityTolerance'

export interface MyDocument {
  no: string
  name: string
  number: string
  expiryDate: string | null
  state: DocumentState
}

export interface MyBalance {
  leaveTypeNo: string
  leaveTypeName: string
  remainingDays: number
  availableDays: number
}

export interface MyLeaveType {
  no: string
  name: string
}

export interface MyProfileApi {
  employeeNo: string
  fullName: string
  phone: string
  jobPositionName: string
  /** What the position asks of him, from the HR positions. */
  responsibilities: string[]
  /** The driving limits in force (fleet settings), for a driver; null otherwise. */
  drivingLimits: {
    dailyDrivingMaxMin: number
    dailyRestMinH: number
    weeklyDrivingMaxH: number
  } | null
  siteName: string
  /** The driver declares; the assistant only reads the tour. */
  mayDeclare: boolean
  eligible: boolean
  ineligibilityReasons: string
  documentGaps: string
  documents: MyDocument[]
  leaveTypes: MyLeaveType[]
  balances: MyBalance[]
}

export interface MyTourStop {
  siteNo: string
  name: string
  role: StopRole
  city: string
  latitude: number | null
  longitude: number | null
  passedAt: string | null
}

export interface MyTourLine {
  orderNo: string
  lineNo: number
  deliveryRequestNo: string
  deliveryPointNo: string
  deliveryPointName: string
  city: string
  latitude: number | null
  longitude: number | null
  productName: string
  quantity: number
}

export interface MyCheckPoint {
  no: string
  label: string
  blocking: boolean
}

export interface MyTourApi {
  tripNo: string
  status: TripStatus
  plannedDeparture: string
  vehiclePlate: string
  departureDecision: DepartureAuthorizationApi['decision'] | null
  stops: MyTourStop[]
  lines: MyTourLine[]
  checkPoints: MyCheckPoint[]
}

export interface MyAbsenceInput {
  leaveTypeNo: string
  startDate: string
  endDate: string
  reason: string
}

export interface MyChecklistInput {
  takenAt: string
  /** Departure, a stop along the trip or the arrival. */
  stage?: 'departure' | 'stop' | 'arrival'
  /** Where the driver stopped to take it. */
  location?: string
  /** The trip a checklist kept without network was taken for; the current one otherwise. */
  tripNo?: string
  results: Pick<CheckResult, 'pointNo' | 'result' | 'comment'>[]
  /** The driver signs the checklist on his phone, at the moment given. */
  signed?: boolean
  signedAt?: string
}

/** A line of the driver's transport order, as he works it from his space. */
export interface MyOrderLineApi {
  lineNo: number
  deliveryPointNo: string
  deliveryPointName: string
  recipientName: string
  address: string
  productName: string
  unit: string
  quantity: number
  loadedQuantity: number | null
  conformingAt: string | null
  nonconformityAt: string | null
  arrivedAt: string | null
  declaredAt: string | null
  receivedQuantity: number | null
  refusalAt: string | null
  postponedAt: string | null
  returnedAt: string | null
  handedBackAt: string | null
  receptionConfirmedAt: string | null
  receptionContestedAt: string | null
  isFuel: boolean
  undeliveredReasonNo: string | null
  nonconformityReason: string
  refusalByRecipient: boolean
  /** Handed back or received at the warehouse: no correction any more. */
  goodsBackAt: string | null
  remainderAt: string | null
  /** The loaded quantity (or volume at 15 °C) the delivered one is compared with, and its rule. */
  tolerance: { loaded: number; loaded15L: number | null; rule: ToleranceRule | null }
}

export interface MyReturnApi {
  orderNo: string
  lineNo: number
  productName: string
  unit: string
  quantity: number
  deliveryPointName: string
  reason: string
}

export interface MyOrderApi {
  no: string
  status: TransportOrderStatus
  plannedDeparture: string | null
  routeName: string
  vehiclePlate: string
  trailerPlate: string
  compartmentPlan: CompartmentPlanApi | null
  overToleranceMode: OverToleranceMode
  lines: MyOrderLineApi[]
  reasons: Record<'nonconformity' | 'postponement' | 'refusal', { no: string; name: string }[]>
}
