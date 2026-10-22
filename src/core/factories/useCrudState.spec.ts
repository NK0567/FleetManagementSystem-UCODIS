import { describe, it, expect, beforeEach } from 'vitest'
import { CanceledError } from 'axios'
import i18n from '@/core/i18n'
import { useCrudState } from './useCrudState'
import type { CrudService, GetListParams } from '@/core/types/crud.types'
import type { PaginatedResponse } from '@/types/api-response.types'

interface Row {
  no: string
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function page(items: Row[]): PaginatedResponse<Row> {
  return {
    success: true,
    statusCode: 200,
    message: 'OK',
    timestamp: '',
    data: { items, meta: { total: items.length, page: 1, limit: 25, totalPages: 1 } }
  }
}

/** Service answered by hand: one pending request per call, settled when the test decides. */
function createControllableService() {
  const calls: {
    params: GetListParams
    gate: ReturnType<typeof deferred<PaginatedResponse<Row>>>
  }[] = []
  const unused = () => Promise.reject(new Error('unused'))
  const service: CrudService<Row> = {
    getAll(params: GetListParams = {}) {
      const gate = deferred<PaginatedResponse<Row>>()
      calls.push({ params, gate })
      return gate.promise
    },
    getById: unused,
    update: unused,
    create: unused,
    remove: unused
  }
  const call = (index: number) => {
    const entry = calls[index]
    if (!entry) throw new Error(`no request #${index}`)
    return entry
  }
  return { service, calls, call }
}

function createState(service: CrudService<Row>, persistKey?: string) {
  return useCrudState<Row>({
    service,
    defaultSearchColumn: 'no',
    entityLabelKey: 'common.appName',
    persistKey
  })
}

describe('useCrudState: concurrent searches', () => {
  it('ignores the response of an outdated search', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service)

    const stale = crud.search('ab')
    const latest = crud.search('abc')
    call(1).gate.resolve(page([{ no: 'LATEST' }]))
    await latest
    call(0).gate.resolve(page([{ no: 'STALE' }]))
    await stale

    expect(crud.items.value.map((row) => row.no)).toEqual(['LATEST'])
  })

  it('aborts the previous request', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service)

    void crud.search('ab')
    const latest = crud.search('abc')

    expect(call(0).params.signal?.aborted).toBe(true)
    expect(call(1).params.signal?.aborted).toBe(false)
    call(1).gate.resolve(page([]))
    await latest
  })

  it('keeps the loader while the current search runs', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service)

    const stale = crud.search('ab')
    const latest = crud.search('abc')
    call(0).gate.reject(new CanceledError('canceled'))
    await stale
    expect(crud.loading.value).toBe(true)
    expect(crud.error.value).toBeNull()

    call(1).gate.resolve(page([]))
    await latest
    expect(crud.loading.value).toBe(false)
  })

  it('reports a real error of the current request in the active language', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service)

    const request = crud.search('ab')
    call(0).gate.reject(new Error('500'))
    await request

    expect(crud.error.value).toBe(
      i18n.global.t('common.error.loadList', { entity: i18n.global.t('common.appName') })
    )
    expect(crud.loading.value).toBe(false)
  })
})

describe('useCrudState: filters', () => {
  it('resetFilters closes the panel and clears user filters', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service)
    crud.filterPanelOpen.value = true
    crud.userFilters.value = [{ field: 'status', valueType: 'string', value: 'pending' }]

    const reset = crud.resetFilters()
    call(0).gate.resolve(page([]))
    await reset

    expect(crud.filterPanelOpen.value).toBe(false)
    expect(crud.userFilters.value).toEqual([])
  })

  it('sends only filters with a value', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service)

    const set = crud.setUserFilters([
      { field: 'status', valueType: 'string', value: 'pending' },
      { field: 'type', valueType: 'string', value: [] }
    ])
    call(0).gate.resolve(page([]))
    await set

    expect(call(0).params.filters).toEqual([
      { field: 'status', valueType: 'string', value: 'pending' }
    ])
  })
})

describe('useCrudState: session persistence', () => {
  const persistKey = 'test-crud-persist'

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('restores user filters and panel state', () => {
    sessionStorage.setItem(
      `list_state_${persistKey}`,
      JSON.stringify({
        userFilters: [{ field: 'city', valueType: 'string', value: 'Toamasina' }],
        filterPanelOpen: true
      })
    )

    const crud = createState(createControllableService().service, persistKey)

    expect(crud.userFilters.value).toEqual([
      { field: 'city', valueType: 'string', value: 'Toamasina' }
    ])
    expect(crud.filterPanelOpen.value).toBe(true)
  })

  it('writes the state when filters change', async () => {
    const { service, call } = createControllableService()
    const crud = createState(service, persistKey)

    const set = crud.setUserFilters([{ field: 'name', valueType: 'string', value: 'Ra' }])
    call(0).gate.resolve(page([]))
    await set
    crud.filterPanelOpen.value = true

    const saved = JSON.parse(sessionStorage.getItem(`list_state_${persistKey}`) ?? '{}')
    expect(saved).toEqual({
      userFilters: [{ field: 'name', valueType: 'string', value: 'Ra' }],
      filterPanelOpen: true
    })
  })
})
