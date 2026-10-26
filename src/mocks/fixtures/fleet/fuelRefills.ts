import type { RefillChannel } from '@/modules/fleet/fuel-refills/domain/refill'
import type { RefillQualification } from '@/modules/fleet/fuel-refills/types/fuelRefill.types'
import { addDays } from '@/utils/date'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { DEMO_REFERENCE_DATE } from '../../clock'
import { seedAudit } from '../seedAudit'

export interface FuelRefillRow extends MockRow {
  refueledAt: string
  vehicleNo: string
  driverNo: string | null
  tripNo: string | null
  stationSiteNo: string | null
  stationName: string
  latitude: number | null
  longitude: number | null
  liters: number
  unitPrice: number
  odometerKm: number
  fullTank: boolean
  channel: RefillChannel
  receiptFileNo: string | null
  qualification: RefillQualification | null
}

type Seed = Omit<FuelRefillRow, keyof typeof seedAudit | 'no'>

/** Tractors with an assigned driver, their odometer today and their usual consumption. */
const FLEET = [
  { vehicleNo: 'VEH-001', driverNo: 'UCT-010', odometerKm: 182_400, l100: 35.5 },
  { vehicleNo: 'VEH-002', driverNo: 'UCT-011', odometerKm: 165_900, l100: 36.5 },
  { vehicleNo: 'VEH-003', driverNo: 'UCT-012', odometerKm: 201_300, l100: 34.8 },
  { vehicleNo: 'VEH-004', driverNo: 'UCT-013', odometerKm: 98_500, l100: 34.6 },
  { vehicleNo: 'VEH-006', driverNo: 'UCT-015', odometerKm: 176_700, l100: 36.2 },
  { vehicleNo: 'VEH-010', driverNo: 'UCT-019', odometerKm: 112_600, l100: 35.0 }
]

const DEPOT = { siteNo: 'DEP-TNJ', latitude: -18.8792, longitude: 47.5079 }
const REFILLS_PER_VEHICLE = 8
const DAYS_BETWEEN = 5

/** Situations to show: a period burning too much, one already up for a deduction, three anomalies. */
const L100_OVERRIDES: Record<string, Record<number, number>> = {
  'VEH-002': { 7: 42.5 },
  'VEH-003': { 5: 40.5 }
}

function vehicleRefills(vehicle: (typeof FLEET)[number], fleetIndex: number): Seed[] {
  const km = Array.from({ length: REFILLS_PER_VEHICLE }, (_, index) =>
    index === 0 ? 0 : 850 + ((index * 37 + fleetIndex * 53) % 120)
  )
  const odometers: number[] = []
  let odometer = vehicle.odometerKm - 150
  for (let index = REFILLS_PER_VEHICLE - 1; index >= 0; index--) {
    odometers[index] = odometer
    odometer -= km[index] ?? 0
  }
  return km.map((distance, index) => {
    const l100 = L100_OVERRIDES[vehicle.vehicleNo]?.[index] ?? vehicle.l100
    const day = addDays(DEMO_REFERENCE_DATE, -38 + index * DAYS_BETWEEN)
    const atNight = vehicle.vehicleNo === 'VEH-006' && index === 6
    const offSite = vehicle.vehicleNo === 'VEH-001' && index === 4
    const atDepot = index % 2 === 0
    return {
      refueledAt: `${day}T${atNight ? '02:30' : `07:${String(10 + fleetIndex * 7).padStart(2, '0')}`}:00`,
      vehicleNo: vehicle.vehicleNo,
      driverNo: vehicle.driverNo,
      tripNo: null,
      stationSiteNo: atDepot ? DEPOT.siteNo : null,
      stationName: atDepot ? '' : 'Station Jovena Antsirabe',
      // The receipt of this refill puts the truck 4 km away from the depot it names.
      latitude: offSite ? DEPOT.latitude + 0.036 : atDepot ? DEPOT.latitude : null,
      longitude: offSite ? DEPOT.longitude : atDepot ? DEPOT.longitude : null,
      liters: index === 0 ? 310 : Math.round((distance * l100) / 100),
      unitPrice: 5450 + (index % 3) * 25,
      odometerKm: odometers[index] ?? 0,
      fullTank: true,
      channel: 'manual',
      receiptFileNo: null,
      qualification: null
    }
  })
}

/** A partial refill larger than the 500 L tank of VEH-004, after its last full tank. */
function oversizedRefill(): Seed {
  return {
    refueledAt: `${addDays(DEMO_REFERENCE_DATE, -1)}T15:20:00`,
    vehicleNo: 'VEH-004',
    driverNo: 'UCT-013',
    tripNo: null,
    stationSiteNo: null,
    stationName: 'Station Galana Ambohimanambola',
    latitude: null,
    longitude: null,
    liters: 545,
    unitPrice: 5475,
    odometerKm: 98_500 - 30,
    fullTank: false,
    channel: 'manual',
    receiptFileNo: null,
    qualification: null
  }
}

export function seededRefills(): Omit<FuelRefillRow, keyof typeof seedAudit>[] {
  return [...FLEET.flatMap(vehicleRefills), oversizedRefill()].map((refill, index) => ({
    no: `RCH-${String(index + 1).padStart(5, '0')}`,
    ...refill
  }))
}

export const fuelRefillsCollection: CollectionDefinition<FuelRefillRow> = {
  name: 'fuel-refills',
  seed: () =>
    seededRefills().map((row) => ({
      ...row,
      ...seedAudit,
      createdBy: 'FLT001',
      modifiedBy: 'FLT001'
    })),
  dateFields: ['refueledAt', 'qualification.at']
}
