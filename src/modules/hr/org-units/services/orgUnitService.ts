import { createCrudService } from '@/core/factories'
import type { ImportReport } from '@/core/utils/csvImport'
import { orgUnitApi } from '../api/orgUnitApi'
import type { OrgUnitApi, OrgUnitSearchColumn } from '../types/orgUnit.types'

/** The largest page the API serves: enough for the whole structure of a company. */
const STRUCTURE_PAGE_SIZE = 500

const crudService = createCrudService<OrgUnitApi, OrgUnitSearchColumn>(orgUnitApi)

export const orgUnitService = {
  ...crudService,
  async importRows(rows: Record<string, unknown>[]): Promise<ImportReport> {
    return (await orgUnitApi.importRows(rows)).data.data
  },
  async validate(no: string): Promise<OrgUnitApi> {
    return (await orgUnitApi.validate(no)).data.data
  },
  async getStructure(): Promise<OrgUnitApi[]> {
    return (await crudService.getAll({ pageSize: STRUCTURE_PAGE_SIZE, sortBy: 'no' })).data.items
  }
}
