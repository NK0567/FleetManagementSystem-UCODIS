import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** The identity of the company that runs the application; a single record. */
export interface CompanySettingsRow extends MockRow {
  legalName: string
  entityName: string
  activity: string
  address: string
  country: string
  taxId: string
}

export const COMPANY_SETTINGS_NO = 'COMPANY'

export const companySettingsCollection: CollectionDefinition<CompanySettingsRow> = {
  name: 'company-settings',
  seed: () => [
    {
      no: COMPANY_SETTINGS_NO,
      legalName: 'UCODIS',
      entityName: 'UCODIS Transport',
      activity: "Transport de marchandises sur longue distance pour le compte d'UCODIS",
      address: 'Antananarivo',
      country: 'Madagascar',
      taxId: '',
      ...seedAudit
    }
  ]
}
