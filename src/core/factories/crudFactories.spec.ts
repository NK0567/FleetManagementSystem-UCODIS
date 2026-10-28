import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import httpClient from '@/core/api/httpClient'
import { createCrudApi } from './createCrudApi'
import { createCrudService } from './createCrudService'

interface Row {
  no: string
  name: string
}

let requests: InternalAxiosRequestConfig[] = []
const originalAdapter = httpClient.defaults.adapter

const recordingAdapter: AxiosAdapter = async (config) => {
  requests.push(config)
  const data =
    config.method === 'get' && config.url === '/things'
      ? { success: true, data: { items: [{ no: 'A', name: 'Alpha' }], meta: { total: 1 } } }
      : { success: true, data: config.method === 'delete' ? null : { no: 'A', name: 'Alpha' } }
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

beforeEach(() => {
  requests = []
  httpClient.defaults.adapter = recordingAdapter
})

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter
})

const api = createCrudApi<Row>({ basePath: '/things' })
const service = createCrudService<Row>(api)

function lastRequest(): InternalAxiosRequestConfig {
  const request = requests.at(-1)
  if (!request) throw new Error('no request sent')
  return request
}

describe('createCrudApi', () => {
  it('serializes filters into a single query parameter', async () => {
    await api.getAll({
      page: 2,
      filters: [{ field: 'name', valueType: 'string', value: 'Al', operator: 'STARTS' }]
    })

    expect(lastRequest().params).toEqual({
      page: 2,
      filters: JSON.stringify([
        { field: 'name', valueType: 'string', value: 'Al%', operator: 'LIKE' }
      ])
    })
  })

  it('encodes record numbers in the path', async () => {
    await api.getById('A/1 B')
    expect(lastRequest().url).toBe('/things/A%2F1%20B')

    await api.remove('A')
    expect(lastRequest().method).toBe('delete')
    expect(lastRequest().url).toBe('/things/A')
  })

  it('posts exports as a blob request', async () => {
    await api.exportExcel({ columns: [] })
    expect(lastRequest().url).toBe('/things/export')
    expect(lastRequest().responseType).toBe('blob')
  })
})

describe('createCrudService', () => {
  it('sends paging defaults and drops empty search or filters', async () => {
    await service.getAll({ filters: [{ field: 'name', valueType: 'string', value: '' }] })
    expect(lastRequest().params).toEqual({ page: 1, pageSize: 25 })
  })

  it('unwraps the envelope of single records', async () => {
    await expect(service.getById('A')).resolves.toEqual({ no: 'A', name: 'Alpha' })
    await expect(service.update('A', { name: 'Alpha' })).resolves.toEqual({
      no: 'A',
      name: 'Alpha'
    })
    await expect(service.remove('A')).resolves.toBeUndefined()
  })

  it('returns the paginated envelope of lists', async () => {
    const response = await service.getAll()
    expect(response.data.items).toEqual([{ no: 'A', name: 'Alpha' }])
  })
})
