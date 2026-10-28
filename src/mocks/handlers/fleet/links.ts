import { employeeFullName } from '@/modules/hr/employees/domain/employee'
import { nowIsoDateTime } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import type { CouplingRow } from '../../fixtures/fleet/couplings'
import type { DriverAssignmentRow } from '../../fixtures/fleet/driverAssignments'

/** Couplings and driver assignments still running, indexed by the vehicles and drivers they bind. */
export function activeLinks(db: MockDatabase) {
  const couplings = db.couplings.all().filter((coupling) => !coupling.endDate)
  const assignments = db.driverAssignments.all().filter((assignment) => !assignment.endDate)
  const couplingByVehicle = new Map<string, CouplingRow>()
  for (const coupling of couplings) {
    couplingByVehicle.set(coupling.tractorNo, coupling)
    couplingByVehicle.set(coupling.trailerNo, coupling)
  }
  return {
    couplingByVehicle,
    assignmentByVehicle: new Map<string, DriverAssignmentRow>(
      assignments.map((assignment) => [assignment.vehicleNo, assignment])
    ),
    assignmentByDriver: new Map<string, DriverAssignmentRow>(
      assignments.map((assignment) => [assignment.employeeNo, assignment])
    )
  }
}

/** The vehicle on the other side of a coupling. */
export function coupledWith(coupling: CouplingRow, vehicleNo: string): string {
  return coupling.tractorNo === vehicleNo ? coupling.trailerNo : coupling.tractorNo
}

export function employeeNames(db: MockDatabase): Map<string, string> {
  return new Map(db.employees.all().map((employee) => [employee.no, employeeFullName(employee)]))
}

export function vehiclePlates(db: MockDatabase): Map<string, string> {
  return new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle.plate]))
}

/** The trip the vehicle was on at that moment, if any. */
export function tripAt(db: MockDatabase, vehicleNo: string, at: string) {
  const now = nowIsoDateTime()
  return (
    db.trips
      .all()
      .find(
        (trip) =>
          (trip.vehicleNo === vehicleNo || trip.trailerNo === vehicleNo) &&
          !!trip.actualDeparture &&
          trip.actualDeparture <= at &&
          (trip.actualArrival ?? (trip.status === 'in_progress' ? now : '')) >= at
      ) ?? null
  )
}

/** The driver assigned to the vehicle that day, and the driver of the trip it was on. */
export function expectedDrivers(
  db: MockDatabase,
  vehicleNo: string,
  at: string,
  tripNo: string | null
): string[] {
  const day = at.slice(0, 10)
  const assigned = db.driverAssignments
    .all()
    .filter(
      (row) =>
        row.vehicleNo === vehicleNo && row.startDate <= day && (!row.endDate || row.endDate >= day)
    )
    .map((row) => row.employeeNo)
  const trip = tripNo ? db.trips.find(tripNo) : tripAt(db, vehicleNo, at)
  return trip ? [...assigned, trip.driverNo] : assigned
}
