const inFlight = new Map<string, Promise<unknown>>()

/**
 * Runs `factory` once per `key` while the previous call is still pending: concurrent callers share
 * the same promise. Unlike a cache, the key is released as soon as the promise settles.
 */
export function dedupeInFlight<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined
  if (running) return running

  let started: Promise<T>
  try {
    started = factory()
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  }

  const promise = started.finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}

export function clearInFlightRequests(): void {
  inFlight.clear()
}
