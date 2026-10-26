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

describe('customers and delivery points', () => {
  it('keep names unique and channels backed by a contact', async () => {
    const base = {
      name: 'Score Ivandry',
      isRecipient: true,
      nature: 'external',
      phone: '034 00 000 00',
      notificationChannel: 'sms'
    }
    expect(
      (await send('post', '/planning/customers', { ...base, name: ' shoprite MAHAJANGA ' })).status
    ).toBe(409)
    expect(
      (await send('post', '/planning/customers', { ...base, isRecipient: false })).status
    ).toBe(422)
    expect(
      (await send('post', '/planning/customers', { ...base, notificationChannel: 'email' })).status
    ).toBe(422)
    expect((await send('post', '/planning/customers', base, 'COM001')).status).toBe(403)
    const created = await send('post', '/planning/customers', base)
    expect(created.status).toBe(201)
    expect(created.data.data).toMatchObject({ no: 'CLI-011', deliveryPointCount: 0 })
  })

  it('place points on a recipient and refuse to drop a customer that has some', async () => {
    const point = { name: 'Quai 2', customerNo: 'CLI-004', latitude: -18.9, longitude: 47.5 }
    expect((await send('post', '/planning/delivery-points', point)).status).toBe(422)
    expect(
      (
        await send('post', '/planning/delivery-points', {
          ...point,
          customerNo: 'CLI-001',
          latitude: null
        })
      ).status
    ).toBe(400)
    expect(
      (
        await send('post', '/planning/delivery-points', {
          ...point,
          customerNo: 'CLI-001',
          acceptedVehicleTypeNos: ['ROCKET']
        })
      ).status
    ).toBe(400)
    const created = await send('post', '/planning/delivery-points', {
      ...point,
      customerNo: 'CLI-001'
    })
    expect(created.data.data).toMatchObject({
      no: 'DP-014',
      customerName: 'Jumbo Score Tanjombato'
    })
    expect((await send('delete', '/planning/customers/CLI-001')).status).toBe(409)
    expect(
      (await send('patch', '/planning/customers/CLI-001', { isRecipient: false, isOrderer: true }))
        .status
    ).toBe(409)
    const customer = await call(server, 'get', '/planning/customers/CLI-010', { as: 'COM001' })
    expect(customer.data.data).toMatchObject({ deliveryPointCount: 5 })
  })
})

describe('products', () => {
  it('keep names unique and fuels measured', async () => {
    const product = { name: 'Gasoil premium', family: 'Carburant', unit: 'Litre', isFuel: true }
    expect((await send('post', '/planning/products', product)).status).toBe(422)
    expect((await send('post', '/planning/products', { ...product, name: 'GAZOLE' })).status).toBe(
      409
    )
    expect(
      (await send('post', '/planning/products', { ...product, referenceDensity: 0.84 }, 'DEP001'))
        .status
    ).toBe(403)
    const created = await send('post', '/planning/products', { ...product, referenceDensity: 0.84 })
    expect(created.data.data).toMatchObject({ no: 'PRD-009', referenceDensity: 0.84 })
    const changed = await send('patch', '/planning/products/PRD-009', { isFuel: false })
    expect(changed.data.data).toMatchObject({ isFuel: false, referenceDensity: null })
  })
})
