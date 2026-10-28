import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface LeaveTypeRow extends MockRow {
  name: string
  color: string
  statutory: boolean
  active: boolean
  annualEntitlementDays: number | null
  monthlyAccrualDays: number | null
  maxCarryOverDays: number | null
  noticeDays: number
  requiresDocument: boolean
  paid: boolean
  tracksBalance: boolean
  comment: string
}

export const leaveTypesCollection: CollectionDefinition<LeaveTypeRow> = {
  name: 'hr-leave-types',
  seed: () => [
    {
      no: 'CA',
      name: 'Congé annuel',
      color: '#1d4ed8',
      statutory: true,
      active: true,
      annualEntitlementDays: 30,
      monthlyAccrualDays: 2.5,
      maxCarryOverDays: 6,
      noticeDays: 15,
      requiresDocument: false,
      paid: true,
      tracksBalance: true,
      comment: '',
      ...seedAudit
    },
    {
      no: 'CM',
      name: 'Congé maladie',
      color: '#15803d',
      statutory: true,
      active: true,
      annualEntitlementDays: 8,
      monthlyAccrualDays: null,
      maxCarryOverDays: null,
      noticeDays: 0,
      requiresDocument: true,
      paid: true,
      tracksBalance: true,
      comment: 'Certificat médical exigé sous 48 heures.',
      ...seedAudit
    },
    {
      no: 'REC',
      name: 'Récupération',
      color: '#92400e',
      statutory: false,
      active: true,
      annualEntitlementDays: null,
      monthlyAccrualDays: null,
      maxCarryOverDays: null,
      noticeDays: 2,
      requiresDocument: false,
      paid: true,
      tracksBalance: true,
      comment: 'Acquise voyage par voyage, sans droit annuel fixe.',
      ...seedAudit
    },
    {
      no: 'MAT',
      name: 'Congé maternité',
      color: '#be185d',
      statutory: true,
      active: true,
      annualEntitlementDays: 98,
      monthlyAccrualDays: null,
      maxCarryOverDays: null,
      noticeDays: 30,
      requiresDocument: true,
      paid: true,
      tracksBalance: false,
      comment: '',
      ...seedAudit
    },
    {
      no: 'PE',
      name: 'Permission exceptionnelle',
      color: '#6d28d9',
      statutory: false,
      active: true,
      annualEntitlementDays: 2,
      monthlyAccrualDays: null,
      maxCarryOverDays: 0,
      noticeDays: 1,
      requiresDocument: true,
      paid: true,
      tracksBalance: true,
      comment: 'Mariage, naissance, décès.',
      ...seedAudit
    },
    {
      no: 'SS',
      name: 'Absence sans solde',
      color: '#6b7280',
      statutory: false,
      active: true,
      annualEntitlementDays: null,
      monthlyAccrualDays: null,
      maxCarryOverDays: null,
      noticeDays: 7,
      requiresDocument: true,
      paid: false,
      tracksBalance: false,
      comment: '',
      ...seedAudit
    }
  ]
}
