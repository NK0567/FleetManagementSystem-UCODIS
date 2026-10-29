import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportReport } from '@/core/utils/csvImport'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const importRows = async (path: string, rows: unknown[], as = 'ADM001') =>
  call(server, 'post', `/hr/${path}/import`, { as, body: { rows }, language: 'fr' })

describe('imports of the HR reference data', () => {
  it('imports units in file order, by parent code or name, refusing bad lines', async () => {
    const response = await importRows('org-units', [
      {
        no: 'ATL',
        name: 'Atelier',
        type: 'Service',
        parentNo: 'UCODIS Transport',
        siteCode: 'HQ-TNR'
      },
      { no: 'ATL-PL', name: 'Poids lourds', type: 'équipe', parentNo: 'ATL', siteCode: 'HQ-TNR' },
      { no: 'ATL', name: 'Doublon', type: 'team', parentNo: 'UCT', siteCode: 'HQ-TNR' },
      { no: 'XYZ', name: 'Sans parent', type: 'team', siteCode: 'HQ-TNR' }
    ])
    const report = response.data.data as ImportReport
    expect(report).toMatchObject({ created: 2, rejected: 2 })
    expect(server.db.orgUnits.find('ATL-PL')).toMatchObject({
      parentNo: 'ATL',
      type: 'team',
      status: 'pending_validation'
    })
    expect(report.results[2]?.error).toContain('ATL')
  })

  it('imports categories and job positions with the rules of their forms', async () => {
    const categories = (
      await importRows('employee-categories', [
        { no: 'CAT-Z', name: 'Stagiaire', annualLeaveDays: 0 },
        { no: 'CAT-Y', name: 'Sans jours' }
      ])
    ).data.data as ImportReport
    expect(categories).toMatchObject({ created: 1, rejected: 1 })

    const positions = (
      await importRows('job-positions', [
        {
          no: 'MAG',
          name: 'Magasinier',
          orgUnitNo: 'MNT',
          defaultCategoryNo: 'Stagiaire',
          drives: false,
          responsibilities: ['Tenir le stock']
        },
        { no: 'MAG2', name: 'Inconnu', orgUnitNo: 'NOPE', defaultCategoryNo: 'CAT-Z' }
      ])
    ).data.data as ImportReport
    expect(positions).toMatchObject({ created: 1, rejected: 1 })
    expect(server.db.jobPositions.find('MAG')?.defaultCategoryNo).toBe('CAT-Z')
  })

  it('keeps the import to those who may create the records', async () => {
    const rows = [{ no: 'Q', name: 'Q', annualLeaveDays: 1 }]
    expect((await importRows('org-units', rows, 'FLT001')).status).toBe(403)
    expect((await importRows('employee-categories', rows, 'MNT001')).status).toBe(403)
    expect((await importRows('job-positions', [], 'ADM001')).status).toBe(422)
  })
})
