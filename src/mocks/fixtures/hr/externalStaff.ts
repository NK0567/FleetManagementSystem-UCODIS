/**
 * What the company HR system holds, as the mock-up simulates it. A real connector would read these
 * records from that system; here they are fixed so that a synchronization shows what it does.
 */
export interface ExternalStaffRecord {
  externalId: string
  firstName: string
  lastName: string
  jobPositionNo: string
  orgUnitNo: string
  categoryNo: string
  siteCode: string
  phone: string
  email: string
  nationalId: string
  contractType: 'permanent' | 'fixed_term'
  hireDate: string
}

export const EXTERNAL_STAFF: readonly ExternalStaffRecord[] = [
  {
    externalId: 'SIRH-0001',
    firstName: 'Faniry',
    lastName: 'Rakotoarisoa',
    jobPositionNo: 'ADM',
    orgUnitNo: 'UCT',
    categoryNo: 'CAT-A',
    siteCode: 'HQ-TNR',
    phone: '034 12 345 91',
    email: 'f.rakotoarisoa@ucodis.mg',
    nationalId: '101 234 567 001',
    contractType: 'permanent',
    hireDate: '2024-09-02'
  },
  {
    externalId: 'SIRH-0102',
    firstName: 'Mamy',
    lastName: 'Rabenandrasana',
    jobPositionNo: 'CND',
    orgUnitNo: 'CND',
    categoryNo: 'CAT-C',
    siteCode: 'DEP-TNJ',
    phone: '034 12 349 01',
    email: '',
    nationalId: '101 234 599 001',
    contractType: 'fixed_term',
    hireDate: '2026-10-01'
  },
  {
    externalId: 'SIRH-0103',
    firstName: 'Volana',
    lastName: 'Razafimahefa',
    jobPositionNo: 'MNT',
    orgUnitNo: 'MNT',
    categoryNo: 'CAT-B',
    siteCode: 'GAR-TNR',
    phone: '034 12 349 02',
    email: 'v.razafimahefa@ucodis.mg',
    nationalId: '101 234 599 002',
    contractType: 'permanent',
    hireDate: '2026-10-15'
  }
]
