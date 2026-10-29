import type { InspectionPart } from '@/modules/fleet/inspection-items/types/inspectionItem.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

/** One item of the periodic inspection grid; its code is its number. */
export interface InspectionItemRow extends MockRow {
  label: string
  part: InspectionPart
  sortOrder: number
  active: boolean
}

const item = (no: string, label: string, part: InspectionPart, sortOrder: number) => ({
  no,
  label,
  part,
  sortOrder,
  active: true
})

const SEED: Omit<InspectionItemRow, keyof typeof seedAudit>[] = [
  item('VH-01', 'Freinage de service et de stationnement', 'vehicle', 10),
  item('VH-02', 'Direction et timonerie', 'vehicle', 20),
  item('VH-03', 'Suspension et essieux', 'vehicle', 30),
  item('VH-04', 'Pneumatiques et roues', 'vehicle', 40),
  item('VH-05', 'Éclairage et signalisation', 'vehicle', 50),
  item('VH-06', 'Châssis, attelage et sellette', 'vehicle', 60),
  item('VH-07', 'Extincteurs et équipements de sécurité', 'vehicle', 70),
  item('CT-01', 'Étanchéité de la citerne et des compartiments', 'tank', 110),
  item('CT-02', 'Vannes de fond et clapets', 'tank', 120),
  item('CT-03', 'Trous d’homme et soupapes', 'tank', 130),
  item('CT-04', 'Mise à la terre et liaison équipotentielle', 'tank', 140),
  item('CT-05', 'Plaques et marquage de danger', 'tank', 150)
]

export const inspectionItemsCollection: CollectionDefinition<InspectionItemRow> = {
  name: 'inspection-items',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
