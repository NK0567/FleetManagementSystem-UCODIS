import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface DriverAssignmentRow extends MockRow {
  employeeNo: string
  vehicleNo: string
  startDate: string
  endDate: string | null
}

const SEED: Omit<DriverAssignmentRow, keyof typeof seedAudit>[] = [
  {
    no: 'ASG-0001',
    employeeNo: 'UCT-010',
    vehicleNo: 'VEH-001',
    startDate: '2025-02-01',
    endDate: null
  },
  {
    no: 'ASG-0002',
    employeeNo: 'UCT-011',
    vehicleNo: 'VEH-002',
    startDate: '2025-02-01',
    endDate: null
  },
  {
    no: 'ASG-0003',
    employeeNo: 'UCT-012',
    vehicleNo: 'VEH-003',
    startDate: '2025-02-01',
    endDate: null
  },
  {
    no: 'ASG-0004',
    employeeNo: 'UCT-013',
    vehicleNo: 'VEH-004',
    startDate: '2025-02-01',
    endDate: null
  },
  {
    no: 'ASG-0005',
    employeeNo: 'UCT-015',
    vehicleNo: 'VEH-006',
    startDate: '2025-02-01',
    endDate: null
  },
  {
    no: 'ASG-0006',
    employeeNo: 'UCT-019',
    vehicleNo: 'VEH-010',
    startDate: '2025-02-01',
    endDate: null
  }
]

export const driverAssignmentsCollection: CollectionDefinition<DriverAssignmentRow> = {
  name: 'driver-assignments',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
