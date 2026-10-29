import { pickTour } from '@/modules/self-service/domain/myspace'
import type { MockDatabase } from '../../db/database'
import { notFound, unprocessable } from '../../http/errors'
import { sessionUser, type MockRequest } from '../../http/types'
import { activeLinks } from './links'
import { FLEET_MESSAGES } from './messages'

/**
 * The vehicle a driver reports on from his phone: the one of his tour on the road or planned,
 * else the one assigned to him. He never picks another one.
 */
export function driverVehicle(
  db: MockDatabase,
  request: MockRequest
): { employeeNo: string; vehicleNo: string } {
  const employeeNo = sessionUser(request).employeeNo
  if (!employeeNo) throw notFound(FLEET_MESSAGES.driverNoEmployee)
  const tour = pickTour(
    db.trips
      .all()
      .filter(
        (trip) =>
          trip.driverNo === employeeNo &&
          (trip.status === 'in_progress' || trip.status === 'planned')
      )
  )
  const vehicleNo = tour?.vehicleNo ?? activeLinks(db).assignmentByDriver.get(employeeNo)?.vehicleNo
  if (!vehicleNo) throw unprocessable(FLEET_MESSAGES.driverNoVehicle)
  return { employeeNo, vehicleNo }
}
