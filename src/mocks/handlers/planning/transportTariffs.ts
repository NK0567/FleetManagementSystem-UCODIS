import {
  partyOf,
  sameGrid,
  tariffIssues
} from '@/modules/planning/transport-tariffs/domain/transportTariff'
import {
  TARIFF_BASES,
  TARIFF_TARGETS,
  type TransportTariffApi
} from '@/modules/planning/transport-tariffs/types/transportTariff.types'
import type { AuditFields } from '../../db/collection'
import type { MockDatabase } from '../../db/database'
import { nextNo } from '../../db/numbering'
import type { TransportTariffRow } from '../../fixtures/planning/transportTariffs'
import { registerCrudResource } from '../../http/crudResource'
import { conflict, unprocessable } from '../../http/errors'
import {
  readAll,
  readBoolean,
  readEnum,
  readNumber,
  readPatch,
  readString,
  type FieldReaders
} from '../../http/input'
import { optionalReference } from '../../http/references'
import type { MockRouter } from '../../http/router'
import { PLANNING_MESSAGES } from './messages'

type Fields = Omit<TransportTariffRow, 'no' | keyof AuditFields>

export function transportTariffsApi(db: MockDatabase): TransportTariffApi[] {
  const customers = new Map(db.customers.all().map((customer) => [customer.no, customer.name]))
  const carriers = new Map(db.providers.all().map((provider) => [provider.no, provider.name]))
  const routes = new Map(db.routeTemplates.all().map((route) => [route.no, route.name]))
  const products = new Map(db.products.all().map((product) => [product.no, product.name]))
  return db.transportTariffs.all().map((row) => ({
    ...row,
    partyName:
      (row.target === 'customer'
        ? customers.get(row.customerNo ?? '')
        : carriers.get(row.carrierNo ?? '')) ?? '',
    routeTemplateName: row.routeTemplateNo ? (routes.get(row.routeTemplateNo) ?? '') : '',
    productName: row.productNo ? (products.get(row.productNo) ?? '') : ''
  }))
}

/** Keeps only the party of the target and the route of a flat rate. */
function normalized(tariff: Fields): Fields {
  return {
    ...tariff,
    customerNo: tariff.target === 'customer' ? tariff.customerNo : null,
    carrierNo: tariff.target === 'carrier' ? tariff.carrierNo : null,
    routeTemplateNo: tariff.basis === 'route_template' ? tariff.routeTemplateNo : null,
    family: tariff.family.trim()
  }
}

function checkTariff(db: MockDatabase, tariff: Fields, no?: string): void {
  const [issue] = tariffIssues(tariff)
  if (issue) throw unprocessable(PLANNING_MESSAGES[`tariff_${issue}`])
  if (tariff.target === 'customer') {
    const customer = db.customers.findOrFail(partyOf(tariff) ?? '')
    // An internal department is served, not billed.
    if (customer.nature !== 'external')
      throw unprocessable(PLANNING_MESSAGES.tariffInternalCustomer)
  } else {
    const carrier = db.providers.findOrFail(partyOf(tariff) ?? '')
    if (carrier.providerType !== 'carrier') throw unprocessable(PLANNING_MESSAGES.tariffNotCarrier)
    if (tariff.active && !carrier.authorized) {
      throw unprocessable(PLANNING_MESSAGES.tariffCarrierNotAuthorized)
    }
  }
  const twin = db.transportTariffs.all().find((other) => other.no !== no && sameGrid(other, tariff))
  if (twin) throw conflict(PLANNING_MESSAGES.tariffExists, { no: twin.no })
}

export function registerTransportTariffsHandlers(router: MockRouter, db: MockDatabase): void {
  const editable: FieldReaders<Omit<Fields, 'target' | 'customerNo' | 'carrierNo'>> = {
    basis: (input) => readEnum(input, 'basis', TARIFF_BASES, { required: true }) ?? 'distance',
    routeTemplateNo: (input) => optionalReference(db.routeTemplates, input, 'routeTemplateNo'),
    price: (input) =>
      readNumber(input, 'price', { required: true, min: 1, max: 100000000000 }) ?? 0,
    active: (input) => readBoolean(input, 'active', true),
    family: (input) => readString(input, 'family'),
    productNo: (input) => optionalReference(db.products, input, 'productNo')
  }
  const readers: FieldReaders<Fields> = {
    ...editable,
    target: (input) => readEnum(input, 'target', TARIFF_TARGETS, { required: true }) ?? 'customer',
    customerNo: (input) => optionalReference(db.customers, input, 'customerNo'),
    carrierNo: (input) => optionalReference(db.providers, input, 'carrierNo')
  }

  function checkRoute(tariff: Fields): void {
    if (tariff.routeTemplateNo && !db.routeTemplates.findOrFail(tariff.routeTemplateNo).active) {
      throw unprocessable(PLANNING_MESSAGES.tariffRouteInactive)
    }
  }

  registerCrudResource(router, {
    basePath: '/planning/transport-tariffs',
    feature: 'TRANSPORTTARIFF',
    collection: db.transportTariffs,
    list: () => transportTariffsApi(db),
    searchColumns: ['no', 'partyName', 'family'],
    optionFields: { target: 'tariffTarget', basis: 'tariffBasis' },
    create: (input) => {
      const tariff = normalized(readAll(input, readers))
      checkTariff(db, tariff)
      checkRoute(tariff)
      return {
        no: nextNo(
          db.transportTariffs.all().map((row) => row.no),
          'TRF-',
          3
        ),
        ...tariff
      }
    },
    // The target and the party are fixed at creation: another party is another grid.
    update: (existing, input) => {
      const patch = readPatch(input, editable)
      const merged = normalized({ ...existing, ...patch })
      checkTariff(db, merged, existing.no)
      if (patch.routeTemplateNo !== undefined) checkRoute(merged)
      return {
        ...patch,
        routeTemplateNo: merged.routeTemplateNo,
        family: merged.family
      }
    },
    remove: () => undefined
  })
}
