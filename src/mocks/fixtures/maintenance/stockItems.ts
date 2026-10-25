import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface StockItemRow extends MockRow {
  name: string
  subsystemNo: string
  supplierNo: string | null
  unitPrice: number
  alertThreshold: number
  active: boolean
}

const item = (
  no: string,
  name: string,
  subsystemNo: string,
  supplierNo: string,
  unitPrice: number,
  alertThreshold: number
) => ({ no, name, subsystemNo, supplierNo, unitPrice, alertThreshold, active: true })

const SEED: Omit<StockItemRow, keyof typeof seedAudit>[] = [
  item('FLT-HUI-HW', 'Filtre à huile Howo', 'ENGINE', 'PRS-013', 45_000, 6),
  item('FLT-AIR-HW', 'Filtre à air Howo', 'AIR', 'PRS-013', 68_000, 6),
  item('FLT-GAZ-HW', 'Filtre à gazole Howo', 'FUEL-SYSTEM', 'PRS-013', 52_000, 6),
  item('CYL-FRN-STD', 'Cylindre de frein avant', 'BRAKES', 'PRS-014', 340_000, 2),
  item('GRN-STD', 'Jeu de garnitures de frein', 'BRAKES', 'PRS-014', 65_000, 4),
  item('BAT-12V-140', 'Batterie 12 V 140 Ah', 'ELECTRONICS', 'PRS-015', 480_000, 3),
  item('HUI-15W40', 'Huile moteur 15W40 (bidon de 20 L)', 'ENGINE', 'PRS-013', 28_000, 8),
  item(
    'BV-FOT-EST',
    'Boîte de vitesses complète Foton Auman',
    'TRANSMISSION',
    'PRS-006',
    3_200_000,
    1
  )
]

export const stockItemsCollection: CollectionDefinition<StockItemRow> = {
  name: 'stock-items',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
