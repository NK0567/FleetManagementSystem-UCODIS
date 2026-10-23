import { employeeFullName } from '@/modules/hr/employees/domain/employee'
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
