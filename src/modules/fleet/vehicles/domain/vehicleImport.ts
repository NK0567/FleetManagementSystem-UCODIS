import { parseImportNumber, type ImportColumns } from '@/core/utils/csvImport'

/** Column names a vehicle file may use, in French or English; the first one goes into the template. */
export const VEHICLE_IMPORT_COLUMNS = {
  plate: ['immatriculation', 'plaque', 'plate'],
  vin: ['vin', 'numero_de_serie', 'chassis'],
  vehicleTypeNo: ['type', 'type_vehicule', 'vehicle_type'],
  make: ['marque', 'make'],
  model: ['modele', 'model'],
  category: ['categorie', 'category'],
  homeSiteNo: ['site', 'base', 'home_site'],
  year: ['annee', 'year'],
  fuelType: ['carburant', 'fuel'],
  maxLoadKg: ['charge_max_kg', 'charge_utile', 'max_load_kg'],
  odometerKm: ['kilometrage', 'compteur', 'odometer'],
  compartments: ['compartiments', 'compartments']
} as const satisfies ImportColumns<string>

export type VehicleImportField = keyof typeof VEHICLE_IMPORT_COLUMNS

export const VEHICLE_REQUIRED: readonly VehicleImportField[] = [
  'plate',
  'vin',
  'vehicleTypeNo',
  'make',
  'model',
  'homeSiteNo'
]

const NUMBER_FIELDS: readonly VehicleImportField[] = ['year', 'maxLoadKg', 'odometerKm']

const FUEL_WORDS: Record<string, string> = {
  gazole: 'diesel',
  gasoil: 'diesel',
  diesel: 'diesel',
  essence: 'petrol',
  petrol: 'petrol',
  electrique: 'electric',
  electric: 'electric',
  hybride: 'hybrid',
  hybrid: 'hybrid',
  gpl: 'lpg',
  lpg: 'lpg'
}

const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/** One line of the file, as the server expects it; compartments are given as 8000+8000+6000. */
export function toVehicleRow(
  record: Record<string, string>,
  mapping: Map<string, VehicleImportField>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [header, field] of mapping) {
    const value = (record[header] ?? '').trim()
    if (NUMBER_FIELDS.includes(field)) row[field] = parseImportNumber(value)
    else if (field === 'fuelType') row[field] = value ? (FUEL_WORDS[plain(value)] ?? value) : null
    else if (field === 'compartments') {
      row[field] = value
        ? value.split(/[+;/]/).map((volume) => ({ volumeL: parseImportNumber(volume) }))
        : undefined
    } else row[field] = value || null
  }
  return row
}
