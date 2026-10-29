import type {
  WorkOrderSeverity,
  WorkOrderStatus
} from '@/modules/maintenance/work-orders/domain/workOrder'

/** An open inside job and what is left of it. */
export interface WorkshopJob {
  no: string
  vehiclePlate: string
  symptom: string
  severity: WorkOrderSeverity
  status: WorkOrderStatus
  plannedDate: string | null
  estimatedHours: number | null
  loggedHours: number
  remainingHours: number
  technicianNos: string[]
  /** The competence the diagnosed subsystem calls for, null before the diagnosis. */
  competenceNo: string | null
}

export interface TechnicianLoad {
  no: string
  name: string
  active: boolean
  /** Remaining hours of the jobs planned on them, shared equally between the technicians of a job. */
  plannedHours: number
  jobs: WorkshopJob[]
}

/** Open inside jobs that call for a competence, and the hours estimated for them. */
export interface CompetenceLoad {
  competenceNo: string
  name: string
  jobCount: number
  estimatedHours: number
}

export interface WorkshopLoadApi {
  capacityHoursPerDay: number
  workingDaysPerWeek: number
  loadHours: number
  occupancyRate: number | null
  daysToAbsorb: number | null
  unplannedCount: number
  technicians: TechnicianLoad[]
  unplanned: WorkshopJob[]
  competences: CompetenceLoad[]
}
