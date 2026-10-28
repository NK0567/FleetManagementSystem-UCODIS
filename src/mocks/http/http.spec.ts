import { describe, expect, it } from 'vitest'
import axios, { AxiosError, CanceledError } from 'axios'
import { createMockAdapter } from './adapter'
import { createMockRouter } from './router'
import { conflict } from './errors'
import { ok } from './responses'
import type { MockSessionUser } from './types'

const admin: MockSessionUser = { code: 'ADM001', name: 'Admin', profile: 'ADMIN' }

function createRouter() {
  const router = createMockRouter({
    resolveUser: (authorization) => (authorization === 'Bearer ok' ? admin : null),
    can: (_user, feature, action) => feature === 'THING' && action !== 'delete'
  })
  router.get('/things/summary', { feature: 'THING' }, () => ok('summary'))
  router.get('/things/:no', { feature: 'THING' }, (request) => ok(request.params.no))
  router.delete('/things/:no', { feature: 'THING' }, () => ok(null))
  router.get('/public', { public: true }, (request) => ok(request.language))
  router.post('/fail', {}, () => {
    throw conflict(
      { fr: 'Conflit sur {no}', en: 'Conflict on {no}' },
      { no: 'A' },
      { errorCode: 'X' }
    )
  })
  router.get('/crash', {}, () => {
    throw new Error('boom')
  })
  return router
}

function client(latencyMs = 0) {
  return axios.create({ adapter: createMockAdapter(createRouter(), { latencyMs }) })
}

describe('mock router', () => {
  it('prefers static segments over parameters', async () => {
    const router = createRouter()
    const summary = await router.handle({
      method: 'get',
      path: '/things/summary',
      query: {},
      body: null,
      authorization: 'Bearer ok'
    })
    const item = await router.handle({
      method: 'get',
      path: '/things/A%2F1',
      query: {},
      body: null,
      authorization: 'Bearer ok'
    })

    expect((summary.data as { data: unknown }).data).toBe('summary')
    expect((item.data as { data: unknown }).data).toBe('A/1')
  })

  it('answers 404 for unknown paths and 405 for unsupported methods', async () => {
    const router = createRouter()
    expect(
      (await router.handle({ method: 'get', path: '/nope', query: {}, body: null })).status
    ).toBe(404)
    expect(
      (await router.handle({ method: 'post', path: '/things/A', query: {}, body: null })).status
    ).toBe(405)
  })

  it('requires a session and the feature permission', async () => {
    const router = createRouter()
    expect(
      (await router.handle({ method: 'get', path: '/things/A', query: {}, body: null })).status
    ).toBe(401)
    expect(
      (
        await router.handle({
          method: 'delete',
          path: '/things/A',
          query: {},
          body: null,
          authorization: 'Bearer ok'
        })
      ).status
    ).toBe(403)
  })

  it('translates error messages with the request language', async () => {
    const router = createRouter()
    const response = await router.handle({
      method: 'post',
      path: '/fail',
      query: {},
      body: null,
      authorization: 'Bearer ok',
      language: 'fr'
    })

    expect(response.status).toBe(409)
    expect(response.data).toMatchObject({
      success: false,
      message: 'Conflit sur A',
      errorCode: 'X'
    })
  })

  it('turns unexpected errors into a 500 envelope', async () => {
    const router = createRouter()
    const original = console.error
    console.error = () => {}
    const response = await router.handle({
      method: 'get',
      path: '/crash',
      query: {},
      body: null,
      authorization: 'Bearer ok'
    })
    console.error = original

    expect(response.status).toBe(500)
    expect(response.data).toMatchObject({ success: false })
  })
})

describe('mock adapter', () => {
  it('returns the API envelope and forwards the language header', async () => {
    const response = await client().get('/public', { headers: { 'x-lang': 'en' } })
    expect(response.data).toMatchObject({ success: true, data: 'en' })
  })

  it('rejects error statuses with an AxiosError carrying the body', async () => {
    const error = await client()
      .post('/fail', {}, { headers: { Authorization: 'Bearer ok', 'x-lang': 'en' } })
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(AxiosError)
    expect((error as AxiosError).response?.status).toBe(409)
    expect((error as AxiosError<{ message: string }>).response?.data.message).toBe('Conflict on A')
  })

  it('honors abort signals during the simulated latency', async () => {
    const controller = new AbortController()
    const request = client(50).get('/public', { signal: controller.signal })
    controller.abort()

    await expect(request).rejects.toBeInstanceOf(CanceledError)
  })
})
