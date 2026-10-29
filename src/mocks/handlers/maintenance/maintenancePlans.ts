import {
  modelCode,
  modelLabel,
  OPERATION_NATURES,
  operationIssues,
  type MaintenanceOperation,
  type OperationNature
} from '@/modules/maintenance/maintenance-plans/domain/maintenancePlan'
import type {
  MaintenancePlanApi,
  PlanCoverageApi
} from '@/modules/maintenance/maintenance-plans/types/maintenancePlan.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { MaintenancePlanRow } from '../../fixtures/maintenance/maintenancePlans'
import { readBody, registerCrudResource, routeParam, stampCreated } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  invalidField,
  readAll,
  readBoolean,
  readPatch,
  readString,
  readStringList,
  type FieldReaders
} from '../../http/input'
import { created, ok } from '../../http/responses'
import type { MockRouter } from '../../http/router'
import { MAINTENANCE_MESSAGES } from './messages'

type Fields = Omit<MaintenancePlanRow, 'no' | keyof AuditFields>

/** The vehicles in the park of each model, in plate order. */
function vehiclesOfModels(db: MockDatabase, codes: readonly string[]) {
  return db.vehicles
    .all()
    .filter((vehicle) => !vehicle.removal && codes.includes(modelCode(vehicle)))
    .sort((a, b) => a.plate.localeCompare(b.plate))
}

export function maintenancePlansApi(db: MockDatabase): MaintenancePlanApi[] {
  return db.maintenancePlans.all().map((row) => {
    const vehicles = vehiclesOfModels(db, row.modelCodes)
    return {
      ...row,
      modelNames: row.modelCodes.map(modelLabel).join(', '),
      vehicleNos: vehicles.map((vehicle) => vehicle.no),
      vehiclePlates: vehicles.map((vehicle) => vehicle.plate).join(', '),
      vehicleCount: vehicles.length,
      operationCount: row.operations.length
    }
  })
}

/** The active plan each vehicle follows: the one of its model, so a new vehicle inherits it. */
export function planByVehicle(db: MockDatabase): Map<string, MaintenancePlanRow> {
  const byModel = new Map(
    db.maintenancePlans
      .all()
      .filter((plan) => plan.active)
      .flatMap((plan) => plan.modelCodes.map((code) => [code, plan] as const))
  )
  return new Map(
    db.vehicles
      .all()
      .filter((vehicle) => byModel.has(modelCode(vehicle)))
      .map((vehicle) => [vehicle.no, byModel.get(modelCode(vehicle))!] as const)
  )
}

/**
 * The models of the park no plan covers, and the inactive plans some vehicles still depend on
 * because no active plan has taken over their model.
 */
export function planCoverage(db: MockDatabase): PlanCoverageApi {
  const plans = db.maintenancePlans.all()
  const activeModels = new Set(
    plans.filter((plan) => plan.active).flatMap((plan) => plan.modelCodes)
  )
  const anyModels = new Set(plans.flatMap((plan) => plan.modelCodes))
  const counts = new Map<string, number>()
  for (const vehicle of db.vehicles.all().filter((row) => !row.removal)) {
    const code = modelCode(vehicle)
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return {
    modelsWithoutPlan: [...counts.entries()]
      .filter(([code]) => !anyModels.has(code))
      .map(([code, vehicleCount]) => ({
        modelCode: code,
        modelName: modelLabel(code),
        vehicleCount
      }))
      .sort((a, b) => b.vehicleCount - a.vehicleCount || a.modelName.localeCompare(b.modelName)),
    inactivePlansInUse: plans
      .filter((plan) => !plan.active)
      .map((plan) => ({
        no: plan.no,
        name: plan.name,
        vehicleCount: plan.modelCodes
          .filter((code) => !activeModels.has(code))
          .reduce((total, code) => total + (counts.get(code) ?? 0), 0)
      }))
      .filter((plan) => plan.vehicleCount > 0)
  }
}

function operationNos(db: MockDatabase): string[] {
  return db.maintenancePlans
    .all()
    .flatMap((plan) => plan.operations.map((operation) => operation.no))
}

/** Operation numbers are unique across plans and never reused, so passages stay with their operation. */
function readOperations(db: MockDatabase, input: Record<string, unknown>): MaintenanceOperation[] {
  const raw = input.operations
  if (raw == null) return []
  if (!Array.isArray(raw)) throw invalidField('operations')
  const taken = operationNos(db)
  const subsystems = new Set(
    db.failureCodes
      .all()
      .filter((code) => code.kind === 'subsystem')
      .map((code) => code.no)
  )
  return raw.map((item: unknown, index) => {
    if (!item || typeof item !== 'object') throw invalidField('operations')
    const line = item as Record<string, unknown>
    const interval = (field: string) =>
      line[field] == null || line[field] === '' ? null : Number(line[field])
    const nature = OPERATION_NATURES.includes(line.nature as OperationNature)
      ? (line.nature as OperationNature)
      : 'check'
    const operation = {
      label: typeof line.label === 'string' ? line.label.trim() : '',
      subsystemNo: typeof line.subsystemNo === 'string' ? line.subsystemNo : '',
      nature,
      intervalKm: interval('intervalKm'),
      intervalHours: interval('intervalHours'),
      intervalDays: interval('intervalDays')
    }
    if (operationIssues(operation).length > 0 || !subsystems.has(operation.subsystemNo)) {
      throw unprocessable(MAINTENANCE_MESSAGES.invalidOperation, { line: index + 1 })
    }
    let no = typeof line.no === 'string' ? line.no : ''
    if (!no) {
      no = nextNo(taken, 'OP-', 3)
      taken.push(no)
    }
    return { no, ...operation }
  })
}

export function registerMaintenancePlansHandlers(router: MockRouter, db: MockDatabase): void {
  const readers: FieldReaders<Fields> = {
    name: (input) => readString(input, 'name', { required: true }),
    provisional: (input) => readBoolean(input, 'provisional'),
    active: (input) => readBoolean(input, 'active', true),
    source: (input) => readString(input, 'source'),
    modelCodes: (input) => {
      const codes = [...new Set(readStringList(input, 'modelCodes'))]
      const known = new Set(db.vehicles.all().map(modelCode))
      for (const code of codes) {
        if (!known.has(code)) throw invalidField('modelCodes')
      }
      return codes
    },
    operations: (input) => readOperations(db, input)
  }

  /** A model follows one active plan at most, or the due dates of its vehicles would contradict each other. */
  function assertModelsFree(plan: Pick<Fields, 'active' | 'modelCodes'>, no?: string) {
    if (!plan.active) return
    for (const other of db.maintenancePlans.all()) {
      if (other.no === no || !other.active) continue
      const shared = plan.modelCodes.find((code) => other.modelCodes.includes(code))
      if (shared) {
        throw conflict(MAINTENANCE_MESSAGES.modelHasPlan, {
          model: modelLabel(shared),
          plan: other.name
        })
      }
    }
  }

  const newNo = () =>
    nextNo(
      db.maintenancePlans.all().map((row) => row.no),
      'PE-',
      3
    )

  registerCrudResource(router, {
    basePath: '/maintenance/maintenance-plans',
    feature: 'MAINTENANCEPLAN',
    collection: db.maintenancePlans,
    list: () => maintenancePlansApi(db),
    searchColumns: ['no', 'name', 'vehiclePlates'],
    create: (input) => {
      const fields = readAll(input, readers)
      assertModelsFree(fields)
      return { no: newNo(), ...fields }
    },
    update: (existing, input) => {
      const patch = readPatch(input, readers)
      assertModelsFree({ ...existing, ...patch }, existing.no)
      return patch
    },
    remove: (existing) => {
      if (vehiclesOfModels(db, existing.modelCodes).length) {
        throw conflict(MAINTENANCE_MESSAGES.planHasVehicles)
      }
    }
  })

  router.get(
    '/maintenance/maintenance-plans/coverage',
    { feature: 'MAINTENANCEPLAN', action: 'read' },
    () => ok(planCoverage(db))
  )

  // One click from the coverage alert: an empty, provisional plan for the model, to fill in.
  router.post(
    '/maintenance/maintenance-plans/for-model',
    { feature: 'MAINTENANCEPLAN', action: 'insert' },
    (request) => {
      const code = readString(readBody(request), 'modelCode', { required: true })
      if (!db.vehicles.all().some((vehicle) => !vehicle.removal && modelCode(vehicle) === code)) {
        throw invalidField('modelCode')
      }
      const fields: Fields = {
        name: modelLabel(code),
        provisional: true,
        active: true,
        source: '',
        modelCodes: [code],
        operations: []
      }
      assertModelsFree(fields)
      const plan = db.maintenancePlans.insert(
        stampCreated<MaintenancePlanRow>({ no: newNo(), ...fields }, request)
      )
      return created(maintenancePlansApi(db).find((row) => row.no === plan.no))
    }
  )

  // A copy starts with no model and new operation numbers: passages belong to the original.
  router.post(
    '/maintenance/maintenance-plans/:no/duplicate',
    { feature: 'MAINTENANCEPLAN', action: 'insert' },
    (request) => {
      const source = db.maintenancePlans.findOrFail(routeParam(request, 'no'))
      const name = readString(readBody(request), 'name', { required: true })
      const taken = operationNos(db)
      const operations = source.operations.map((operation) => {
        const no = nextNo(taken, 'OP-', 3)
        taken.push(no)
        return { ...operation, no }
      })
      const copy = db.maintenancePlans.insert(
        stampCreated(
          { ...structuredClone(source), no: newNo(), name, modelCodes: [], operations },
          request
        )
      )
      return created(maintenancePlansApi(db).find((plan) => plan.no === copy.no))
    }
  )
}
