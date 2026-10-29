import { describe, expect, it } from 'vitest'
import { replanCandidate, type ReplanFacts } from './replanning'

const line = (patch: Partial<ReplanFacts> = {}): ReplanFacts => ({
  quantity: 20,
  weightKg: 400,
  volumeM3: null,
  unavailableAt: null,
  postponedAt: null,
  returnedAt: null,
  replannedAt: null,
  declaredAt: null,
  receivedQuantity: null,
  loadedQuantity: 20,
  remainderAt: null,
  clientProposedOn: null,
  plannerProposedOn: null,
  availableOn: null,
  refusalAt: null,
  warehouseReceivedAt: null,
  ...patch
})

describe('replanCandidate', () => {
  it('keeps a line still on its way in its order', () => {
    expect(replanCandidate(line())).toBeNull()
  })

  it('replans refused goods once the warehouse has received them back (TRS04-US01)', () => {
    expect(replanCandidate(line({ refusalAt: '2026-09-04T10:00:00' }))).toBeNull()
    const back = replanCandidate(
      line({ refusalAt: '2026-09-04T10:00:00', warehouseReceivedAt: '2026-09-04T18:00:00' })
    )
    expect(back).toMatchObject({ kind: 'refused', quantity: 20, weightKg: 400 })
  })

  it('replans a postponement with its return and the date the recipient gave', () => {
    const candidate = replanCandidate(
      line({
        postponedAt: '2026-09-04T10:00:00',
        returnedAt: '2026-09-04T10:00:00',
        availableOn: '2026-09-10'
      })
    )
    expect(candidate).toMatchObject({ kind: 'postponed', recipientDate: '2026-09-10' })
  })

  it('never replans a line twice', () => {
    expect(
      replanCandidate(line({ unavailableAt: '2026-09-03T10:00:00', replannedAt: '2026-09-03' }))
    ).toBeNull()
  })
})
