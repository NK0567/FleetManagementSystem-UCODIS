import type { ReferenceItem } from '@/types/reference.types'
import type { MockDatabase } from '../../db/database'
import { techniciansApi } from './technicians'

export function maintenanceReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  const failureCodes = db.failureCodes.all()
  const ofKind = (kind: string) =>
    failureCodes
      .filter((code) => code.kind === kind)
      .map((code) => ({ code: code.no, description: code.name, active: code.active }))
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
    missionTypes: db.missionTypes
      .all()
      .map((item) => ({ code: item.no, description: item.name, active: item.active }))
  }
}
