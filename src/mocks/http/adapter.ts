import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosAdapter,
  type AxiosResponse,
  type GenericAbortSignal,
  type InternalAxiosRequestConfig
} from 'axios'
import type { MockRouter } from './router'
import type { HttpMethod } from './types'

function canceled(config: InternalAxiosRequestConfig) {
  return new CanceledError(undefined, undefined, config)
}

function wait(
  ms: number,
  signal: GenericAbortSignal | undefined,
  config: InternalAxiosRequestConfig
) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(canceled(config))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener?.('abort', () => {
      clearTimeout(timer)
      reject(canceled(config))
    })
  })
}

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string' || data === '') return data ?? null
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

/** Serves axios requests from the in-browser router, with the latency and errors of a real API. */
export function createMockAdapter(
  router: MockRouter,
  options: { latencyMs: number }
): AxiosAdapter {
  return async (config) => {
    await wait(options.latencyMs, config.signal, config)

    const headers = AxiosHeaders.from(config.headers)
    const result = await router.handle({
      method: (config.method ?? 'get').toLowerCase() as HttpMethod,
      path: config.url ?? '/',
      query: (config.params as Record<string, unknown> | undefined) ?? {},
      body: parseBody(config.data),
      authorization: headers.get('Authorization')?.toString(),
      language: headers.get('x-lang')?.toString()
    })
    if (config.signal?.aborted) throw canceled(config)

    const response: AxiosResponse = {
      data: result.data,
      status: result.status,
      statusText: String(result.status),
      headers: result.headers ?? {},
      config,
      request: {}
    }
    const valid = config.validateStatus
      ? config.validateStatus(result.status)
      : result.status >= 200 && result.status < 300
    if (valid) return response

    const message = (result.data as { message?: string } | null)?.message ?? `HTTP ${result.status}`
    const code = result.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST
    throw new AxiosError(message, code, config, {}, response)
  }
}
