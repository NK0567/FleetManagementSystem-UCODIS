import {
  layoutIssues,
  layoutPositions,
  type TyreAxle
} from '@/modules/maintenance/tyres/domain/tyre'
import type { TyreLayoutApi } from '@/modules/maintenance/tyre-layouts/types/tyreLayout.types'
import type { MockDatabase } from '../../db/database'
import type { TyreLayoutRow } from '../../fixtures/maintenance/tyreLayouts'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import { invalidField, readCode, readNumber } from '../../http/input'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'
import { mountedTyres } from './tyrePositions'

export function tyreLayoutsApi(db: MockDatabase): TyreLayoutApi[] {
  const types = new Map(db.vehicleTypes.all().map((type) => [type.no, type.name]))
  return db.tyreLayouts.all().map((row) => ({
    ...row,
    vehicleTypeName: types.get(row.no) ?? row.no,
    axleCount: row.axles.length,
    positionCount: layoutPositions(row).length
  }))
}

function readAxles(input: Record<string, unknown>): TyreAxle[] {
  const raw = input.axles
  if (!Array.isArray(raw)) throw invalidField('axles')
  return raw.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw invalidField('axles')
    const axle = item as Record<string, unknown>
    return {
      label: typeof axle.label === 'string' ? axle.label.trim() : '',
      twin: axle.twin === true
    }
  })
}

export function registerTyreLayoutsHandlers(router: MockRouter, db: MockDatabase): void {
  function read(input: Record<string, unknown>, existing?: TyreLayoutRow) {
    const layout = {
      axles: 'axles' in input || !existing ? readAxles(input) : existing.axles,
      spares:
        'spares' in input || !existing
          ? (readNumber(input, 'spares', { required: true }) ?? 0)
          : existing.spares
    }
    if (layoutIssues(layout).length) throw unprocessable(MAINTENANCE_MESSAGES.layoutInvalid)
    return layout
  }

  /** Mounted tyres keep their meaning: a position in use may not move to another axle or side, nor vanish. */
  function assertMountedKept(no: string, layout: Pick<TyreLayoutRow, 'axles' | 'spares'>) {
    const before = db.tyreLayouts.find(no)
    if (!before) return
    const now = new Map(layoutPositions(layout).map((position) => [position.code, position]))
    const vehicles = new Set(
      db.vehicles
        .all()
        .filter((vehicle) => vehicle.vehicleTypeNo === no)
        .map((vehicle) => vehicle.no)
    )
    const used = new Set(
      [...mountedTyres(db).keys()]
        .map((key) => key.split(' '))
        .filter(([vehicleNo]) => vehicles.has(vehicleNo ?? ''))
        .map(([, position]) => position)
    )
    for (const position of layoutPositions(before).filter((item) => used.has(item.code))) {
      const next = now.get(position.code)
      if (!next || next.axleRank !== position.axleRank || next.side !== position.side) {
        throw conflict(MAINTENANCE_MESSAGES.layoutPositionInUse, { position: position.code })
      }
    }
  }

  registerCrudResource(router, {
    basePath: '/maintenance/tyre-layouts',
    feature: 'TYRELAYOUT',
    collection: db.tyreLayouts,
    list: () => tyreLayoutsApi(db),
    searchColumns: ['no', 'vehicleTypeName'],
    create: (input) => {
      const no = readCode(input)
      if (!db.vehicleTypes.exists(no)) throw invalidField('no')
      return { no, ...read(input) }
    },
    update: (existing, input) => {
      const layout = read(input, existing)
      assertMountedKept(existing.no, layout)
      return layout
    },
    remove: (existing) => assertMountedKept(existing.no, { axles: [], spares: 0 })
  })
}
