import type { CouplingApi } from '@/modules/fleet/couplings/types/coupling.types'
import { latestEnd, periodDays, periodState } from '@/modules/fleet/shared/domain/period'
import { isUsable } from '@/modules/fleet/vehicles/domain/vehicleStatus'
import { todayIso } from '@/utils/date'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { VehicleRow } from '../../fixtures/fleet/vehicles'
import { readBody, registerCrudResource, routeParam, stampModified } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { readDate } from '../../http/input'
import { requireReference } from '../../http/references'
import { ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { localizeDay, type MockLanguage } from '../../i18n'
import { activeLinks, vehiclePlates } from './links'
import { FLEET_MESSAGES } from './messages'
import { statusReason, vehicleStatuses } from './vehicleState'

export function couplingsApi(db: MockDatabase): CouplingApi[] {
  const plates = vehiclePlates(db)
  const vehicles = new Map(db.vehicles.all().map((vehicle) => [vehicle.no, vehicle]))
  const typeNames = new Map(db.vehicleTypes.all().map((type) => [type.no, type.name]))
  const today = todayIso()
  return db.couplings.all().map((coupling) => ({
    ...coupling,
    tractorPlate: plates.get(coupling.tractorNo) ?? '',
    trailerPlate: plates.get(coupling.trailerNo) ?? '',
    trailerTypeName: typeNames.get(vehicles.get(coupling.trailerNo)?.vehicleTypeNo ?? '') ?? '',
    state: periodState(coupling),
    durationDays: periodDays(coupling, today)
  }))
}

/** Refuses a vehicle that is out of service, immobilized or removed, and says why. */
export function assertUsable(db: MockDatabase, vehicle: VehicleRow, language: MockLanguage): void {
  const result = vehicleStatuses(db).get(vehicle.no)
  if (result && !isUsable(result.status)) {
    throw unprocessable(FLEET_MESSAGES.vehicleNotUsable, {
      plate: vehicle.plate,
      reason: statusReason(result.cause, vehicle, language)
    })
  }
}

/** Ends a coupling or an assignment: the end is neither before its start nor in the future. */
export function readEndDate(body: Record<string, unknown>, startDate: string): string {
  const endDate = readDate(body, 'endDate', { required: true }) ?? todayIso()
  if (endDate > todayIso()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
  if (endDate < startDate) {
    throw unprocessable(FLEET_MESSAGES.endBeforeStart, { date: localizeDay(startDate) })
  }
  return endDate
}

export function readStartDate(body: Record<string, unknown>, previousEnd: string | null): string {
  const startDate = readDate(body, 'startDate', { required: true }) ?? todayIso()
  if (startDate > todayIso()) throw unprocessable(FLEET_MESSAGES.dateInFuture)
  if (previousEnd && startDate < previousEnd) {
    throw unprocessable(FLEET_MESSAGES.startBeforePreviousEnd, { date: localizeDay(previousEnd) })
  }
  return startDate
}

export function registerCouplingsHandlers(router: MockRouter, db: MockDatabase): void {
  const typeOf = (vehicle: VehicleRow) => db.vehicleTypes.findOrFail(vehicle.vehicleTypeNo)

  registerCrudResource(router, {
    basePath: '/fleet/couplings',
    feature: 'COUPLING',
    collection: db.couplings,
    list: () => couplingsApi(db),
    searchColumns: ['no', 'tractorPlate', 'trailerPlate'],
    optionFields: { state: 'periodState' },
    create: (input, request) => {
      const tractor = db.vehicles.findOrFail(requireReference(db.vehicles, input, 'tractorNo'))
      const trailer = db.vehicles.findOrFail(requireReference(db.vehicles, input, 'trailerNo'))
      if (typeOf(tractor).couplingRole !== 'tows') throw unprocessable(FLEET_MESSAGES.notATractor)
      if (typeOf(trailer).couplingRole !== 'towed') throw unprocessable(FLEET_MESSAGES.notATrailer)
      const links = activeLinks(db)
      for (const vehicle of [tractor, trailer]) {
        const running = links.couplingByVehicle.get(vehicle.no)
        if (running) {
          throw conflict(FLEET_MESSAGES.alreadyCoupled, { plate: vehicle.plate, no: running.no })
        }
        assertUsable(db, vehicle, request.language)
      }
      const history = db.couplings
        .all()
        .filter((coupling) =>
          [tractor.no, trailer.no].some(
            (no) => coupling.tractorNo === no || coupling.trailerNo === no
          )
        )
      return {
        no: nextNo(
          db.couplings.all().map((coupling) => coupling.no),
          'CPL-',
          4
        ),
        tractorNo: tractor.no,
        trailerNo: trailer.no,
        startDate: readStartDate(input, latestEnd(history)),
        endDate: null
      }
    }
  })

  router.post('/fleet/couplings/:no/end', { feature: 'COUPLING', action: 'update' }, (request) => {
    const coupling = db.couplings.findOrFail(routeParam(request, 'no'))
    if (coupling.endDate) throw conflict(FLEET_MESSAGES.periodAlreadyEnded)
    const endDate = readEndDate(readBody(request), coupling.startDate)
    db.couplings.update(coupling.no, { endDate, ...stampModified(request) })
    const updated = couplingsApi(db).find((row) => row.no === coupling.no)
    return ok(updated)
  })
}
