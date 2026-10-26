import { beforeEach, describe, expect, it } from 'vitest'
import type { PlanningSettingsApi } from '@/modules/planning/planning-settings/types/planningSettings.types'
import type { PlanningReasonApi } from '@/modules/planning/reasons/types/planningReason.types'
import { call, createTestServer } from '../../testing'
import type { MockServer } from '../../index'

let server: MockServer

beforeEach(() => {
  server = createTestServer()
})

const send = (
  method: 'post' | 'patch' | 'put' | 'delete',
  path: string,
  body = {},
  as = 'FLT001'
) => call(server, method, path, { as, body, language: 'en' })

describe('planning settings', () => {
  it('are saved one section at a time by the planners only', async () => {
    const settings = (await call(server, 'get', '/planning/settings', { as: 'DIR001' })).data
      .data as PlanningSettingsApi
    expect(settings.billing).toEqual({
      defaultFreightPayer: 'orderer',
      carrierInvoiceToleranceAmount: 0
    })
    const billing = { defaultFreightPayer: 'recipient', carrierInvoiceToleranceAmount: 5_000 }
    expect((await send('put', '/planning/settings/billing', billing, 'DIR001')).status).toBe(403)
    expect((await call(server, 'get', '/planning/settings', { as: 'COM001' })).status).toBe(403)
    const saved = await send('put', '/planning/settings/billing', billing)
    expect((saved.data.data as PlanningSettingsApi).billing).toEqual(billing)
    expect((await send('put', '/planning/settings/fleet', billing)).status).toBe(404)
  })

  it('refuse an unknown choice, an empty text and a switch that is not a boolean', async () => {
    const billing = { defaultFreightPayer: 'carrier', carrierInvoiceToleranceAmount: 0 }
    expect((await send('put', '/planning/settings/billing', billing)).status).toBe(422)
    const goods = { countingUnit: '  ', prefillQuantities: true }
    expect((await send('put', '/planning/settings/goods', goods)).status).toBe(422)
    const malformed = { countingUnit: 'pallets', prefillQuantities: 'yes' }
    expect((await send('put', '/planning/settings/goods', malformed)).status).toBe(400)
    const confirmation = { tacitConfirmationDays: '' }
    const saved = await send('put', '/planning/settings/confirmation', confirmation)
    expect((saved.data.data as PlanningSettingsApi).confirmation.tacitConfirmationDays).toBeNull()
  })
})

describe('planning reasons', () => {
  it('are read by the back office and kept by the planners', async () => {
    const { items } = (
      await call(server, 'get', '/planning/reasons', {
        as: 'COM001',
        query: { pageSize: 50, filters: JSON.stringify([]) }
      })
    ).data.data as { items: PlanningReasonApi[] }
    expect(items.filter((reason) => reason.kind === 'cancellation')).toHaveLength(4)
    const reason = { no: 'CXL-WEATHER', name: 'Intempéries', kind: 'cancellation' }
    expect((await send('post', '/planning/reasons', reason, 'COM001')).status).toBe(403)
    expect((await send('post', '/planning/reasons', reason, 'DIR001')).status).toBe(403)
    expect((await send('post', '/planning/reasons', reason)).status).toBe(201)
    expect((await send('post', '/planning/reasons', reason)).status).toBe(409)
    expect(
      (await send('post', '/planning/reasons', { ...reason, no: 'X', kind: 'other' })).status
    ).toBe(400)
  })
})
