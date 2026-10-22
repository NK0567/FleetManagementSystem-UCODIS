import type { ReferenceItem } from '@/types/reference.types'

export const COMPANY = {
  name: 'UCODIS Transport',
  employeeNoPrefix: 'UCT-',
  employeeNoWidth: 3
} as const

export const COMPANY_SITES: ReferenceItem[] = [
  { code: 'HQ-TNR', description: 'Siège Antananarivo' },
  { code: 'GAR-TNR', description: 'Garage Antananarivo' },
  { code: 'DEP-TNJ', description: 'Dépôt Tanjombato' }
]
