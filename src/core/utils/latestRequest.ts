import axios from 'axios'

export function isCanceledRequest(error: unknown): boolean {
  if (axios.isCancel(error)) return true
  return error instanceof DOMException && error.name === 'AbortError'
}

export interface LatestRequestHandle {
  signal: AbortSignal
  isCurrent: () => boolean
}

/**
 * "Latest request wins" sequencer for chained searches: each start() aborts the previous call
 * and invalidates its response, even when the HTTP layer ignores the signal.
 */
export function createLatestRequest() {
  let controller: AbortController | null = null
  let sequence = 0

  return {
    start(): LatestRequestHandle {
      controller?.abort()
      controller = new AbortController()
      const id = ++sequence
      return {
        signal: controller.signal,
        isCurrent: () => id === sequence
      }
    },
    cancel(): void {
      controller?.abort()
      controller = null
      sequence++
    }
  }
}
