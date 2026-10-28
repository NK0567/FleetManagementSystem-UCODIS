import { describe, it, expect, beforeEach } from 'vitest'
import { dedupeInFlight, clearInFlightRequests } from './inFlightRequests'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('dedupeInFlight', () => {
  beforeEach(() => {
    clearInFlightRequests()
  })

  it('runs the factory once for concurrent calls', async () => {
    const gate = deferred<string>()
    let calls = 0
    const factory = () => {
      calls += 1
      return gate.promise
    }

    const first = dedupeInFlight('key', factory)
    const second = dedupeInFlight('key', factory)
    gate.resolve('value')

    expect(calls).toBe(1)
    expect(await first).toBe('value')
    expect(await second).toBe('value')
  })

  it('keeps distinct keys apart', async () => {
    let calls = 0
    const factory = () => Promise.resolve(++calls)

    await Promise.all([dedupeInFlight('fr', factory), dedupeInFlight('en', factory)])

    expect(calls).toBe(2)
  })

  it('runs again once settled: it is not a cache', async () => {
    let calls = 0
    const factory = () => Promise.resolve(++calls)

    await dedupeInFlight('key', factory)
    await dedupeInFlight('key', factory)

    expect(calls).toBe(2)
  })

  it('propagates a failure to every caller and releases the key', async () => {
    const gate = deferred<string>()
    const failing = dedupeInFlight('key', () => gate.promise)
    const joined = dedupeInFlight('key', () => gate.promise)
    gate.reject(new Error('boom'))

    await expect(failing).rejects.toThrow('boom')
    await expect(joined).rejects.toThrow('boom')
    await expect(dedupeInFlight('key', () => Promise.resolve('ok'))).resolves.toBe('ok')
  })

  it('leaves no entry behind when the factory throws synchronously', async () => {
    await expect(
      dedupeInFlight('key', () => {
        throw new Error('sync')
      })
    ).rejects.toThrow('sync')

    await expect(dedupeInFlight('key', () => Promise.resolve('ok'))).resolves.toBe('ok')
  })
})
