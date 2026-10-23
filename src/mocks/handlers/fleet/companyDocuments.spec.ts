import { beforeEach, describe, expect, it } from 'vitest'
import type { CompanyDocumentApi } from '@/modules/fleet/company-documents/types/companyDocument.types'
import type { FileMeta } from '@/types/file.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

async function scan(as = 'FLT001') {
  const form = new FormData()
  form.append('file', new File(['%PDF-1.4 scan'], 'scan.pdf', { type: 'application/pdf' }))
  return ((await call(server, 'post', '/files', { as, body: form })).data.data as FileMeta).no
}

async function get(no: string) {
  return (await call(server, 'get', `/fleet/company-documents/${no}`, { as: 'FLT001' })).data
    .data as CompanyDocumentApi
}

async function upload(body: Record<string, unknown>, as = 'FLT001') {
  return call(server, 'post', '/fleet/company-documents', {
    as,
    body: {
      name: 'Licence de transport de marchandises',
      documentTypeNo: 'CO-LIC',
      issueDate: '2026-09-01',
      expiryDate: '2027-08-31',
      fileNo: await scan(as),
      ...body
    }
  })
}

const decide = (no: string, decision: 'approve' | 'reject', as: string, reason?: string) =>
  call(server, 'post', `/fleet/company-documents/${no}/${decision}`, {
    as,
    body: reason ? { reason } : {}
  })

describe('uploading a company document', () => {
  it('waits for a review, and needs a scan and a company document type', async () => {
    const response = await upload({})
    expect(response.status).toBe(201)
    expect(response.data.data).toMatchObject({ status: 'pending', version: 1, state: null })
    expect((await upload({ fileNo: null })).status).toBe(422)
    expect((await upload({ documentTypeNo: 'VEH-INS' })).status).toBe(422)
    expect((await upload({ expiryDate: null })).status).toBe(422)
  })
})

describe('review', () => {
  it('is never done by the person who uploaded the document', async () => {
    expect((await decide('DE-0006', 'approve', 'FLT001')).status).toBe(403)
    const approved = await decide('DE-0006', 'approve', 'ADM001')
    expect(approved.data.data).toMatchObject({
      status: 'approved',
      decidedBy: 'ADM001',
      state: 'valid',
      current: true
    })
  })

  it('explains a rejection and decides only once', async () => {
    expect((await decide('DE-0007', 'reject', 'FLT001', 'Flou')).status).toBe(422)
    const rejected = await decide(
      'DE-0007',
      'reject',
      'FLT001',
      'Il manque la page des signatures.'
    )
    expect(rejected.data.data).toMatchObject({ status: 'rejected', current: false })
    expect((await decide('DE-0007', 'approve', 'FLT001')).status).toBe(409)
  })

  it('freezes a reviewed document, and lets a pending upload be withdrawn', async () => {
    const edit = await call(server, 'patch', '/fleet/company-documents/DE-0003', {
      as: 'FLT001',
      body: { name: 'Autre' }
    })
    expect(edit.status).toBe(409)
    const remove = (no: string) =>
      call(server, 'delete', `/fleet/company-documents/${no}`, { as: 'FLT001' })
    expect((await remove('DE-0003')).status).toBe(409)
    expect((await remove('DE-0006')).status).toBeLessThan(300)
  })
})

describe('new versions', () => {
  it('keep the current version in force until they are approved', async () => {
    const created = (await upload({ supersedesNo: 'DE-0003' })).data.data as CompanyDocumentApi
    expect(created).toMatchObject({ version: 3, supersedesNo: 'DE-0003' })
    expect(await get('DE-0003')).toMatchObject({ current: true, state: 'expiring' })
    expect((await upload({ supersedesNo: 'DE-0003' })).status).toBe(409)

    await decide(created.no, 'approve', 'ADM001')
    expect(await get('DE-0003')).toMatchObject({ current: false, replacedByNo: created.no })
    expect(await get(created.no)).toMatchObject({ current: true })
  })

  it('only replace the current version of the same type', async () => {
    expect((await upload({ supersedesNo: 'DE-0002' })).status).toBe(422)
    expect((await upload({ supersedesNo: 'DE-0004', documentTypeNo: 'CO-LIC' })).status).toBe(422)
  })
})
