import { driverIneligibility } from '@/modules/fleet/drivers/domain/driver'
import type { DriverAssignmentApi } from '@/modules/fleet/driver-assignments/types/driverAssignment.types'
import { latestEnd, periodDays, periodState } from '@/modules/fleet/shared/domain/period'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { assertUsable, readEndDate, readStartDate } from './couplings'
import { driverFacts, ineligibilityText } from './drivers'
import { activeLinks, coupledWith, employeeNames, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'
import { tripIndex } from './tripIndex'

export function driverAssignmentsApi(db: MockDatabase): DriverAssignmentApi[] {
  const names = employeeNames(db)
  const plates = vehiclePlates(db)
  const links = activeLinks(db)
  const today = todayIso()
  return db.driverAssignments.all().map((assignment) => {
    const coupling = assignment.endDate
      ? undefined
      : links.couplingByVehicle.get(assignment.vehicleNo)
    return {
      ...assignment,
      employeeName: names.get(assignment.employeeNo) ?? '',
      vehiclePlate: plates.get(assignment.vehicleNo) ?? '',
      coupledTrailerPlate: coupling
        ? (plates.get(coupledWith(coupling, assignment.vehicleNo)) ?? '')
        : '',
      state: periodState(assignment),
      durationDays: periodDays(assignment, today)
    }
  })
}

export function registerDriverAssignmentsHandlers(router: MockRouter, db: MockDatabase): void {
  registerCrudResource(router, {
    basePath: '/fleet/driver-assignments',
    feature: 'DRIVERASSIGNMENT',
    collection: db.driverAssignments,
    list: () => driverAssignmentsApi(db),
    searchColumns: ['no', 'employeeName', 'vehiclePlate'],
    optionFields: { state: 'periodState' },
    create: (input, request) => {
      const employee = db.employees.findOrFail(requireReference(db.employees, input, 'employeeNo'))
      const vehicle = db.vehicles.findOrFail(requireReference(db.vehicles, input, 'vehicleNo'))
      if (!db.vehicleTypes.findOrFail(vehicle.vehicleTypeNo).motorized) {
        throw unprocessable(FLEET_MESSAGES.notMotorized)
      }
      const links = activeLinks(db)
      const vehicleAssignment = links.assignmentByVehicle.get(vehicle.no)
      if (vehicleAssignment) {
        throw conflict(FLEET_MESSAGES.vehicleAlreadyAssigned, {
          plate: vehicle.plate,
          name: employeeNames(db).get(vehicleAssignment.employeeNo) ?? vehicleAssignment.employeeNo
        })
      }
      const driverAssignment = links.assignmentByDriver.get(employee.no)
      if (driverAssignment) {
        throw conflict(FLEET_MESSAGES.driverAlreadyAssigned, {
          plate: vehiclePlates(db).get(driverAssignment.vehicleNo) ?? driverAssignment.vehicleNo
        })
      }
      assertUsable(db, vehicle, request.language)

      const history = db.driverAssignments
        .all()
        .filter((row) => row.vehicleNo === vehicle.no || row.employeeNo === employee.no)
      const startDate = readStartDate(input, latestEnd(history))
      const reasons = driverIneligibility(driverFacts(db, employee, startDate))
      if (reasons.length) {
        throw unprocessable(FLEET_MESSAGES.driverNotEligible, {
          reasons: ineligibilityText(request.language, reasons)
        })
      }
      return {
        no: nextNo(
          db.driverAssignments.all().map((row) => row.no),
          'ASG-',
          4
        ),
        employeeNo: employee.no,
        vehicleNo: vehicle.no,
        startDate,
        endDate: null
      }
    }
  })

  router.post(
    '/fleet/driver-assignments/:no/end',
    { feature: 'DRIVERASSIGNMENT', action: 'update' },
    (request) => {
      const assignment = db.driverAssignments.findOrFail(routeParam(request, 'no'))
      if (assignment.endDate) throw conflict(FLEET_MESSAGES.periodAlreadyEnded)
      const trips = tripIndex(db)
      const onRoad =
        trips.onRoadByVehicle.get(assignment.vehicleNo) ??
        trips.onRoadByDriver.get(assignment.employeeNo)
      if (onRoad) throw conflict(FLEET_MESSAGES.tripInProgress, { no: onRoad.no })
      const endDate = readEndDate(readBody(request), assignment.startDate)
      db.driverAssignments.update(assignment.no, { endDate, ...stampModified(request) })
      return ok(driverAssignmentsApi(db).find((row) => row.no === assignment.no))
    }
  )
}
