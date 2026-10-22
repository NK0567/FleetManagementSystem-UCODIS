import type { OrgUnitStatus, OrgUnitType } from '@/modules/hr/org-units/types/orgUnit.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface OrgUnitRow extends MockRow {
  name: string
  type: OrgUnitType
  parentNo: string | null
  managerNo: string | null
  siteCode: string
  description: string
  status: OrgUnitStatus
  submittedAt: string | null
  validatedAt: string | null
  validatedBy: string | null
}

const validated = {
  status: 'validated' as const,
  submittedAt: null,
  validatedAt: null,
  validatedBy: null
}

/** Departments follow the responsibility table of the SOP UCD-TRUCK-FLOT-001. */
export const orgUnitsCollection: CollectionDefinition<OrgUnitRow> = {
  name: 'hr-org-units',
  dateFields: ['submittedAt', 'validatedAt'],
  seed: () => [
    {
      no: 'UCT',
      name: 'UCODIS Transport',
      type: 'directorate',
      parentNo: null,
      managerNo: 'UCT-007',
      siteCode: 'HQ-TNR',
      description:
        'Entité créée par UCODIS pour assurer le transport de ses marchandises sur longue distance.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'FLT',
      name: 'Service Flotte',
      type: 'department',
      parentNo: 'UCT',
      managerNo: 'UCT-002',
      siteCode: 'HQ-TNR',
      description:
        'Dossiers administratifs des camions, suivi du parc, affectation aux conducteurs, planning et fiches de voyage.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'MNT',
      name: 'Service Maintenance',
      type: 'department',
      parentNo: 'UCT',
      managerNo: 'UCT-003',
      siteCode: 'GAR-TNR',
      description:
        'Contrôle des camions à la réception, puis avant et après chaque utilisation, avec le conducteur.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'CND',
      name: 'Équipe conduite',
      type: 'team',
      parentNo: 'FLT',
      managerNo: 'UCT-002',
      siteCode: 'DEP-TNJ',
      description: 'Dix conducteurs et cinq aides conducteurs, un conducteur par tracteur du parc.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'CLI',
      name: 'Service Clientèle',
      type: 'department',
      parentNo: 'UCT',
      managerNo: 'UCT-004',
      siteCode: 'HQ-TNR',
      description: 'Affectation du bon de livraison à un camion.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'COM',
      name: 'Équipe commerciale UCODIS',
      type: 'department',
      parentNo: 'UCT',
      managerNo: 'UCT-005',
      siteCode: 'HQ-TNR',
      description:
        'Calcul du poids et du nombre de cartons à livrer, demande de disponibilité de camion.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'DEP',
      name: 'Équipe dépôt',
      type: 'department',
      parentNo: 'UCT',
      managerNo: 'UCT-006',
      siteCode: 'DEP-TNJ',
      description:
        'Comptage et vérification des marchandises chargées, contrôle du poids par rapport à la charge maximale autorisée.',
      ...validated,
      ...seedAudit
    },
    {
      no: 'OPV',
      name: 'Opérations et voyages',
      type: 'department',
      parentNo: 'UCT',
      managerNo: null,
      siteCode: 'HQ-TNR',
      description:
        'Entité proposée pour porter le planning de voyage, la fiche de voyage et le carnet de bord. Statut à confirmer avec UCODIS.',
      status: 'pending_validation',
      submittedAt: '2026-09-02T09:00:00.000Z',
      validatedAt: null,
      validatedBy: null,
      ...seedAudit
    }
  ]
}
