import { describe, it, expect } from 'vitest'
import { CanceledError } from 'axios'
import { createLatestRequest, isCanceledRequest } from './latestRequest'

describe('createLatestRequest', () => {
  it('invalidates the previous request as soon as a new one starts', () => {
    const sequencer = createLatestRequest()

    const first = sequencer.start()
    const second = sequencer.start()

    expect(first.isCurrent()).toBe(false)
    expect(second.isCurrent()).toBe(true)
  })

  it('aborts the signal of the replaced request', () => {
    const sequencer = createLatestRequest()

    const first = sequencer.start()
    sequencer.start()

    expect(first.signal.aborted).toBe(true)
  })

  it('cancel() aborts and invalidates the running request', () => {
    const sequencer = createLatestRequest()

    const request = sequencer.start()
    sequencer.cancel()

    expect(request.signal.aborted).toBe(true)
    expect(request.isCurrent()).toBe(false)
  })
})

describe('isCanceledRequest', () => {
  it('recognizes an axios cancellation', () => {
    expect(isCanceledRequest(new CanceledError('canceled'))).toBe(true)
  })

  it('recognizes a native AbortError', () => {
    expect(isCanceledRequest(new DOMException('aborted', 'AbortError'))).toBe(true)
  })

  it('lets a real error through', () => {
    expect(isCanceledRequest(new Error('500'))).toBe(false)
  })
})
