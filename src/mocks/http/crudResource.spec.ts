import { beforeEach, describe, expect, it } from 'vitest'
import { createCollection, type MockRow } from '../db/collection'
import { nextNo } from '../db/numbering'
import { conflict, requiredField } from './errors'
import { createMockRouter } from './router'
import { registerCrudResource } from './crudResource'
import type { MockSessionUser } from './types'

interface ThingRow extends MockRow {
  name: string
  locked: boolean
}

const user: MockSessionUser = { code: 'ADM001', name: 'Admin', profile: 'ADMIN' }
const audit = { createdAt: '', createdBy: 'SEED', modifiedAt: '', modifiedBy: 'SEED' }

function setup() {
  localStorage.clear()
  const collection = createCollection<ThingRow>(
    {
      name: 'things',
      seed: () => [
        { no: 'T-001', name: 'Bravo', locked: false, ...audit },
        { no: 'T-002', name: 'Alpha', locked: true, ...audit }
      ]
    },
    { seedVersion: 1, dayOffset: 0 }
  )
  const router = createMockRouter({ resolveUser: () => user, can: () => true })
  registerCrudResource(router, {
    basePath: '/things',
    feature: 'THING',
    collection,
    list: () => collection.all().map((row) => ({ ...row, label: `${row.no} ${row.name}` })),
    searchColumns: ['name'],
    create: (input) => {
      if (typeof input.name !== 'string' || !input.name) throw requiredField('name')
      return {
        no: nextNo(
          collection.all().map((row) => row.no),
          'T-',
          3
        ),
        name: input.name,
        locked: false
      }
    },
    update: (_existing, input) => (typeof input.name === 'string' ? { name: input.name } : {}),
    remove: (existing) => {
      if (existing.locked) throw conflict({ fr: 'Verrouillé', en: 'Locked' })
    }
  })
  const send = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body: unknown = null,
    query = {}
  ) => router.handle({ method, path, query, body, authorization: 'Bearer x', language: 'en' })
  return { collection, send }
}

let ctx: ReturnType<typeof setup>

beforeEach(() => {
  ctx = setup()
})

describe('registerCrudResource', () => {
  it('lists enriched rows with search, sort and paging', async () => {
    const response = await ctx.send('get', '/things', null, { sortBy: 'name', searchQuery: 'a' })
    const body = response.data as {
      data: { items: { no: string; label: string }[]; meta: { total: number } }
    }

    expect(body.data.items.map((item) => item.no)).toEqual(['T-002', 'T-001'])
    expect(body.data.items[0]?.label).toBe('T-002 Alpha')
    expect(body.data.meta.total).toBe(2)
  })

  it('creates a numbered row with audit fields', async () => {
    const response = await ctx.send('post', '/things', { name: 'Charlie' })

    expect(response.status).toBe(201)
    expect(ctx.collection.find('T-003')).toMatchObject({ name: 'Charlie', createdBy: 'ADM001' })
  })

  it('reports validation errors from the create hook', async () => {
    const response = await ctx.send('post', '/things', { name: '' })
    expect(response.status).toBe(400)
    expect(response.data).toMatchObject({ errorCode: 'REQUIRED', errors: ['name'] })
  })

  it('rejects a body that is not an object', async () => {
    expect((await ctx.send('post', '/things', 'oops')).status).toBe(400)
  })

  it('updates only the patched fields and stamps the modification', async () => {
    const response = await ctx.send('patch', '/things/T-001', { name: 'Bravo 2', no: 'HACK' })

    expect(response.status).toBe(200)
    expect(ctx.collection.find('T-001')).toMatchObject({ name: 'Bravo 2', modifiedBy: 'ADM001' })
    expect(ctx.collection.exists('HACK')).toBe(false)
  })

  it('lets the delete hook refuse a deletion', async () => {
    expect((await ctx.send('delete', '/things/T-002')).status).toBe(409)
    expect((await ctx.send('delete', '/things/T-001')).status).toBe(200)
    expect(ctx.collection.all().map((row) => row.no)).toEqual(['T-002'])
  })

  it('returns 404 for unknown records', async () => {
    expect((await ctx.send('get', '/things/T-999')).status).toBe(404)
  })

  it('exports the filtered rows as a spreadsheet file', async () => {
    const response = await ctx.send('post', '/things/export', {
      columns: [
        { field: 'no', label: 'No.' },
        { field: 'locked', label: 'Locked' }
      ],
      fileBaseName: 'things'
    })

    expect(response.status).toBe(200)
    expect(response.data).toBeInstanceOf(Blob)
    expect(response.headers?.['content-disposition']).toContain('things.xlsx')
  })
})
