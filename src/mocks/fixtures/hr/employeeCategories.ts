import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface EmployeeCategoryRow extends MockRow {
  name: string
  description: string
  annualLeaveDays: number
  active: boolean
}

export const employeeCategoriesCollection: CollectionDefinition<EmployeeCategoryRow> = {
  name: 'hr-employee-categories',
  seed: () => [
    {
      no: 'CAT-A',
      name: 'Cadre',
      description: 'Direction, responsable flotte, administrateur.',
      annualLeaveDays: 30,
      active: true,
      ...seedAudit
    },
    {
      no: 'CAT-B',
      name: 'Agent de maîtrise',
      description: 'Technicien de maintenance, chargé de clientèle, agent commercial.',
      annualLeaveDays: 30,
      active: true,
      ...seedAudit
    },
    {
      no: 'CAT-C',
      name: 'Personnel roulant',
      description: "Conducteurs et aides conducteurs de l'équipe conduite.",
      annualLeaveDays: 30,
      active: true,
      ...seedAudit
    },
    {
      no: 'CAT-D',
      name: 'Personnel de dépôt',
      description: 'Agents de dépôt chargés du chargement et du comptage.',
      annualLeaveDays: 30,
      active: true,
      ...seedAudit
    }
  ]
}
