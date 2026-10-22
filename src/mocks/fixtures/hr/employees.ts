import type {
  ContractType,
  EmployeeStatus,
  Gender,
  IdDocumentType,
  MaritalStatus
} from '@/modules/hr/employees/types/employee.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface EmployeeRow extends MockRow {
  firstName: string
  lastName: string
  jobPositionNo: string
  orgUnitNo: string
  categoryNo: string
  siteCode: string
  phone: string
  email: string
  nationalId: string
  idDocumentType: IdDocumentType | null
  birthDate: string | null
  birthPlace: string
  gender: Gender | null
  maritalStatus: MaritalStatus | null
  contractType: ContractType
  hireDate: string
  exitDate: string | null
  status: EmployeeStatus
  statusReason: string
  drivingAuthorized: boolean
  drivingAuthorizedBy: string | null
  drivingAuthorizedAt: string | null
}

type EmployeeSeed = Pick<
  EmployeeRow,
  | 'no'
  | 'firstName'
  | 'lastName'
  | 'jobPositionNo'
  | 'orgUnitNo'
  | 'categoryNo'
  | 'siteCode'
  | 'phone'
  | 'nationalId'
  | 'birthDate'
  | 'hireDate'
> &
  Partial<EmployeeRow>

function employee(seed: EmployeeSeed): EmployeeRow {
  return {
    email: '',
    idDocumentType: 'national_id',
    birthPlace: '',
    gender: null,
    maritalStatus: null,
    contractType: 'permanent',
    exitDate: null,
    status: 'active',
    statusReason: '',
    drivingAuthorized: false,
    drivingAuthorizedBy: null,
    drivingAuthorizedAt: null,
    ...seedAudit,
    ...seed
  }
}

const OFFICE_STAFF: EmployeeSeed[] = [
  {
    no: 'UCT-001',
    firstName: 'Faniry',
    lastName: 'Rakotoarisoa',
    jobPositionNo: 'ADM',
    orgUnitNo: 'UCT',
    categoryNo: 'CAT-A',
    siteCode: 'HQ-TNR',
    phone: '034 12 345 01',
    email: 'f.rakotoarisoa@ucodis.mg',
    nationalId: '101 234 567 001',
    birthDate: '1988-03-14',
    hireDate: '2024-09-02'
  },
  {
    no: 'UCT-002',
    firstName: 'Hery',
    lastName: 'Andriamalala',
    jobPositionNo: 'RFL',
    orgUnitNo: 'FLT',
    categoryNo: 'CAT-A',
    siteCode: 'HQ-TNR',
    phone: '034 12 345 02',
    email: 'h.andriamalala@ucodis.mg',
    nationalId: '101 234 567 002',
    birthDate: '1982-11-05',
    hireDate: '2024-09-02'
  },
  {
    no: 'UCT-003',
    firstName: 'Tojo',
    lastName: 'Rasoanaivo',
    jobPositionNo: 'MNT',
    orgUnitNo: 'MNT',
    categoryNo: 'CAT-B',
    siteCode: 'GAR-TNR',
    phone: '034 12 345 03',
    email: 't.rasoanaivo@ucodis.mg',
    nationalId: '101 234 567 003',
    birthDate: '1985-06-21',
    hireDate: '2024-09-16'
  },
  {
    no: 'UCT-004',
    firstName: 'Miora',
    lastName: 'Randrianasolo',
    jobPositionNo: 'CLI',
    orgUnitNo: 'CLI',
    categoryNo: 'CAT-B',
    siteCode: 'HQ-TNR',
    phone: '034 12 345 04',
    email: 'm.randrianasolo@ucodis.mg',
    nationalId: '101 234 567 004',
    birthDate: '1991-01-30',
    hireDate: '2024-10-01',
    gender: 'female'
  },
  {
    no: 'UCT-005',
    firstName: 'Lova',
    lastName: 'Rabemananjara',
    jobPositionNo: 'COM',
    orgUnitNo: 'COM',
    categoryNo: 'CAT-B',
    siteCode: 'HQ-TNR',
    phone: '034 12 345 05',
    email: 'l.rabemananjara@ucodis.mg',
    nationalId: '101 234 567 005',
    birthDate: '1990-08-12',
    hireDate: '2024-10-01'
  },
  {
    no: 'UCT-006',
    firstName: 'Naina',
    lastName: 'Rakotobe',
    jobPositionNo: 'DEP',
    orgUnitNo: 'DEP',
    categoryNo: 'CAT-D',
    siteCode: 'DEP-TNJ',
    phone: '034 12 345 06',
    nationalId: '101 234 567 006',
    birthDate: '1993-04-08',
    hireDate: '2024-10-14'
  },
  {
    no: 'UCT-007',
    firstName: 'Rivo',
    lastName: 'Andrianjafy',
    jobPositionNo: 'DIR',
    orgUnitNo: 'UCT',
    categoryNo: 'CAT-A',
    siteCode: 'HQ-TNR',
    phone: '034 12 345 07',
    email: 'r.andrianjafy@ucodis.mg',
    nationalId: '101 234 567 007',
    birthDate: '1976-02-19',
    hireDate: '2024-08-19'
  },
  {
    no: 'UCT-008',
    firstName: 'Nirina',
    lastName: 'Ravelojaona',
    jobPositionNo: 'MNT',
    orgUnitNo: 'MNT',
    categoryNo: 'CAT-B',
    siteCode: 'GAR-TNR',
    phone: '034 12 345 08',
    nationalId: '101 234 567 008',
    birthDate: '1989-09-27',
    hireDate: '2024-11-04'
  },
  {
    no: 'UCT-009',
    firstName: 'Haja',
    lastName: 'Razafindrakoto',
    jobPositionNo: 'DEP',
    orgUnitNo: 'DEP',
    categoryNo: 'CAT-D',
    siteCode: 'DEP-TNJ',
    phone: '034 12 345 09',
    nationalId: '101 234 567 009',
    birthDate: '1995-12-03',
    hireDate: '2025-02-03',
    contractType: 'fixed_term'
  }
]

interface CrewMember {
  firstName: string
  lastName: string
  birthDate: string
  drivingAuthorized: boolean
  status?: EmployeeStatus
  statusReason?: string
  contractType?: ContractType
}

const DRIVERS: CrewMember[] = [
  {
    firstName: 'Solofo',
    lastName: 'Rakotomanga',
    birthDate: '1986-05-11',
    drivingAuthorized: true
  },
  { firstName: 'Mamy', lastName: 'Andrianaivo', birthDate: '1984-07-22', drivingAuthorized: true },
  { firstName: 'Tiana', lastName: 'Rasolofoson', birthDate: '1990-02-17', drivingAuthorized: true },
  {
    firstName: 'Jaona',
    lastName: 'Ratsimbazafy',
    birthDate: '1983-10-09',
    drivingAuthorized: true
  },
  {
    firstName: 'Fenohery',
    lastName: 'Randriamampionona',
    birthDate: '1987-12-28',
    drivingAuthorized: true
  },
  {
    firstName: 'Herizo',
    lastName: 'Rakotondrabe',
    birthDate: '1992-06-15',
    drivingAuthorized: true
  },
  {
    firstName: 'Nomena',
    lastName: 'Andriantsoa',
    birthDate: '1988-04-02',
    drivingAuthorized: false
  },
  {
    firstName: 'Tsiory',
    lastName: 'Rabearison',
    birthDate: '1994-08-19',
    drivingAuthorized: true,
    status: 'on_leave'
  },
  {
    firstName: 'Jean-Luc',
    lastName: 'Razanamalala',
    birthDate: '1981-03-25',
    drivingAuthorized: false,
    status: 'suspended',
    statusReason: 'Habilitation retirée : visite médicale expirée'
  },
  {
    firstName: 'Fanomezantsoa',
    lastName: 'Rakotonirina',
    birthDate: '1991-11-07',
    drivingAuthorized: true
  }
]

const DRIVER_ASSISTANTS: CrewMember[] = [
  { firstName: 'Fidy', lastName: 'Ramanantsoa', birthDate: '1996-01-14', drivingAuthorized: true },
  {
    firstName: 'Toky',
    lastName: 'Razafimahatratra',
    birthDate: '1997-05-30',
    drivingAuthorized: true
  },
  {
    firstName: 'Sitraka',
    lastName: 'Andrianarivo',
    birthDate: '1998-09-06',
    drivingAuthorized: false
  },
  {
    firstName: 'Andry',
    lastName: 'Rakotonandrasana',
    birthDate: '1995-07-23',
    drivingAuthorized: true,
    contractType: 'fixed_term'
  },
  {
    firstName: 'Mihaja',
    lastName: 'Ranaivoson',
    birthDate: '1999-03-11',
    drivingAuthorized: false,
    contractType: 'fixed_term'
  }
]

function crew(
  members: CrewMember[],
  firstNumber: number,
  jobPositionNo: 'CND' | 'AID',
  phonePrefix: string,
  idPrefix: string,
  hireDate: string,
  authorizedAt: string
): EmployeeSeed[] {
  return members.map((member, index) => ({
    no: `UCT-${String(firstNumber + index).padStart(3, '0')}`,
    firstName: member.firstName,
    lastName: member.lastName,
    jobPositionNo,
    orgUnitNo: 'CND',
    categoryNo: 'CAT-C',
    siteCode: 'DEP-TNJ',
    phone: `${phonePrefix} ${String(index + 1).padStart(2, '0')}`,
    nationalId: `${idPrefix} 0${String(index + 1).padStart(2, '0')}`,
    birthDate: member.birthDate,
    hireDate,
    contractType: member.contractType ?? 'permanent',
    status: member.status ?? 'active',
    statusReason: member.statusReason ?? '',
    drivingAuthorized: member.drivingAuthorized,
    drivingAuthorizedBy: member.drivingAuthorized ? 'FLT001' : null,
    drivingAuthorizedAt: member.drivingAuthorized ? authorizedAt : null
  }))
}

export const employeesCollection: CollectionDefinition<EmployeeRow> = {
  name: 'hr-employees',
  seed: () =>
    [
      ...OFFICE_STAFF,
      ...crew(DRIVERS, 10, 'CND', '034 12 346', '101 234 568', '2024-11-04', '2024-11-18'),
      ...crew(DRIVER_ASSISTANTS, 20, 'AID', '034 12 347', '101 234 569', '2025-01-13', '2025-01-27')
    ].map(employee)
}
