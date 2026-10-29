import type {
  CompartmentPlanApi,
  TransportOrderStatus
} from '@/modules/planning/transport-orders/types/transportOrder.types'
import type { CheckResult } from '@/modules/fleet/check-points'
import type { DepartureAuthorizationApi } from '@/modules/fleet/departure-authorizations'
import type { DocumentState } from '@/modules/fleet/documents'
import type { StopRole } from '@/modules/fleet/route-templates'
import type { TripStatus } from '@/modules/fleet/trips'

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
  results: Pick<CheckResult, 'pointNo' | 'result' | 'comment'>[]
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
}

export interface MyOrderApi {
  no: string
  status: TransportOrderStatus
  plannedDeparture: string | null
  routeName: string
  vehiclePlate: string
  trailerPlate: string
  compartmentPlan: CompartmentPlanApi | null
  lines: MyOrderLineApi[]
  reasons: Record<'nonconformity' | 'postponement' | 'refusal', { no: string; name: string }[]>
}
