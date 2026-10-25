import type { ReferenceItem } from '@/types/reference.types'
import type { MockDatabase } from '../../db/database'
import { isWorkable, workOrderStatus } from '@/modules/maintenance/work-orders/domain/workOrder'
import { techniciansApi } from './technicians'

export function maintenanceReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  const failureCodes = db.failureCodes.all()
  const ofKind = (kind: string) =>
    failureCodes
      .filter((code) => code.kind === kind)
      .map((code) => ({ code: code.no, description: code.name, active: code.active }))
  const vehicles = db.vehicles.all().filter((vehicle) => !vehicle.removal)
  const modelCode = (vehicle: { make: string; model: string }) => `${vehicle.make}|${vehicle.model}`
  const vehicleModels = new Map(
    vehicles.map((vehicle) => [modelCode(vehicle), `${vehicle.make} ${vehicle.model}`])
  )
  return {
    competences: db.competences
      .all()
      .map((item) => ({ code: item.no, description: item.name, active: item.active })),
    failureSystems: ofKind('system'),
    failureSubsystems: ofKind('subsystem'),
    failureModes: ofKind('mode'),
    failureCauses: ofKind('cause'),
    downtimeCodes: db.downtimeCodes
      .all()
      .map((item) => ({ code: item.no, description: item.name, active: item.active })),
    technicians: techniciansApi(db).map((technician) => ({
      code: technician.no,
      description: technician.fullName,
      active: technician.active
    })),
    garages: db.providers
      .all()
      .filter((provider) => provider.providerType === 'garage')
      .map((provider) => ({
        code: provider.no,
        description: provider.name,
        active: provider.authorized
      })),
    vehicleModels: [...vehicleModels.entries()].map(([code, description]) => ({
      code,
      description
    })),
    // Each vehicle under its make and model, so a plan can take every vehicle of a model at once.
    planVehicles: vehicles.map((vehicle) => ({
      code: vehicle.no,
      description: vehicle.plate,
      parentCode: modelCode(vehicle)
    })),
    partsSuppliers: db.providers
      .all()
      .filter((provider) => provider.providerType === 'parts_supplier')
      .map((provider) => ({
        code: provider.no,
        description: provider.name,
        active: provider.authorized
      })),
    stockItems: db.stockItems
      .all()
      .map((item) => ({ code: item.no, description: item.name, active: item.active })),
    openWorkOrders: db.workOrders
      .all()
      .filter((order) =>
        isWorkable(workOrderStatus({ ...order, diagnosedAt: order.diagnosis?.at ?? null }))
      )
      .map((order) => ({ code: order.no, description: order.symptom })),
    tyreSuppliers: db.providers
      .all()
      .filter((provider) => provider.providerType === 'tyre_supplier')
      .map((provider) => ({
        code: provider.no,
        description: provider.name,
        active: provider.authorized
      })),
    missionTypes: db.missionTypes
      .all()
      .map((item) => ({ code: item.no, description: item.name, active: item.active }))
  }
}
