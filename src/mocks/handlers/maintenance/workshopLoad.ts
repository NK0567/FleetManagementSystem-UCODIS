import { isWorkable } from '@/modules/maintenance/work-orders/domain/workOrder'
import {
  capacityPerDay,
  daysToAbsorb,
  occupancyRate,
  remainingHours
} from '@/modules/maintenance/workshop-load/domain/workshopLoad'
import type {
  WorkshopJob,
  WorkshopLoadApi
} from '@/modules/maintenance/workshop-load/types/workshopLoad.types'
import type { MockDatabase } from '../../db/database'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { maintenanceSettings } from './settings'
import { techniciansApi } from './technicians'
import { workOrdersApi } from './workOrders'

const SEVERITY_RANK = { critical: 0, major: 1, minor: 2 } as const

/** The open jobs of the inside workshop: outside garages carry their own load. */
function workshopJobs(db: MockDatabase): WorkshopJob[] {
  return workOrdersApi(db)
    .filter((order) => isWorkable(order.status) && !order.external)
    .map((order) => ({
      no: order.no,
      vehiclePlate: order.vehiclePlate,
      symptom: order.symptom,
      severity: order.severity,
      status: order.status,
      plannedDate: order.planning?.date ?? null,
      estimatedHours: order.planning?.estimatedHours ?? null,
      loggedHours: order.labourHours,
      remainingHours: order.planning
        ? remainingHours(order.planning.estimatedHours, order.labourHours)
        : 0,
      technicianNos: order.planning?.technicianNos ?? []
    }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        (a.plannedDate ?? '9999').localeCompare(b.plannedDate ?? '9999')
    )
}

export function workshopLoadApi(db: MockDatabase): WorkshopLoadApi {
  const capacity = maintenanceSettings(db).workshop
  const jobs = workshopJobs(db)
  const planned = jobs.filter((job) => job.plannedDate)
  const loadHours =
    Math.round(planned.reduce((total, job) => total + job.remainingHours, 0) * 100) / 100
  const technicians = techniciansApi(db)
    .filter(
      (technician) =>
        technician.active || planned.some((job) => job.technicianNos.includes(technician.no))
    )
    .map((technician) => {
      const own = planned.filter((job) => job.technicianNos.includes(technician.no))
      return {
        no: technician.no,
        name: technician.fullName,
        active: technician.active,
        plannedHours:
          Math.round(
            own.reduce((total, job) => total + job.remainingHours / job.technicianNos.length, 0) *
              100
          ) / 100,
        jobs: own
      }
    })
  const unplanned = jobs.filter((job) => !job.plannedDate)
  return {
    capacityHoursPerDay: capacityPerDay(capacity),
    workingDaysPerWeek: capacity.workingDaysPerWeek,
    loadHours,
    occupancyRate: occupancyRate(loadHours, capacity),
    daysToAbsorb: daysToAbsorb(loadHours, capacity),
    unplannedCount: unplanned.length,
    technicians,
    unplanned
  }
}

export function registerWorkshopLoadHandlers(router: MockRouter, db: MockDatabase): void {
  router.get('/maintenance/workshop-load', { feature: 'WORKSHOPLOAD', action: 'read' }, () =>
    ok(workshopLoadApi(db))
  )
}
