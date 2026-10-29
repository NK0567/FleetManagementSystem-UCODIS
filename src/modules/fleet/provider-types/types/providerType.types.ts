import type { ProviderType } from '@/modules/fleet/providers/types/provider.types'

/**
 * A type of provider, set up by the administrator. A type that carries a role is the one the
 * application looks for (the garages of the workshop, the carriers of the planning…): its role
 * cannot change and the type cannot be deleted.
 */
export interface ProviderTypeApi {
  no: string
  name: string
  systemRole: ProviderType | null
  active: boolean
  providerCount: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
}

export type ProviderTypeSearchColumn = 'no' | 'name' | 'no,name'
