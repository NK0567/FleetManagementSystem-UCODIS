import type { ReferenceItem } from '@/types/reference.types'
import type { MockDatabase } from '../../db/database'

/** Fleet lists served by GET /reference/all for selects, lookups and filters. */
export function fleetReferenceData(db: MockDatabase): Record<string, ReferenceItem[]> {
  return {
    vehicleTypes: db.vehicleTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    equipmentTypes: db.equipmentTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    siteTypes: db.siteTypes
      .all()
      .map((type) => ({ code: type.no, description: type.name, active: type.active })),
    sites: db.sites
      .all()
      .map((site) => ({ code: site.no, description: site.name, active: site.active })),
    providers: db.providers.all().map((provider) => ({
      code: provider.no,
      description: provider.name,
      active: provider.authorized
    }))
  }
}
