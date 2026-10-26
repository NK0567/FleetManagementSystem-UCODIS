import type { UserProfileCode } from '@/types/auth.types'

export interface MockAccount {
  code: string
  password: string
  name: string
  email?: string
  profile: UserProfileCode
  employeeNo?: string
  orgUnitNo?: string
  language: 'fr' | 'en'
  landingRoute: string
  active: boolean
}

export const DEMO_PASSWORD = 'demo'

/** One account per role of the SOP responsibility table, plus a second driver and a suspended one. */
export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    code: 'ADM001',
    password: DEMO_PASSWORD,
    name: 'Faniry Rakotoarisoa',
    email: 'f.rakotoarisoa@ucodis.mg',
    profile: 'ADMIN',
    employeeNo: 'UCT-001',
    orgUnitNo: 'UCT',
    language: 'fr',
    landingRoute: '/hr',
    active: true
  },
  {
    code: 'FLT001',
    password: DEMO_PASSWORD,
    name: 'Hery Andriamalala',
    email: 'h.andriamalala@ucodis.mg',
    profile: 'FLEET_MANAGER',
    employeeNo: 'UCT-002',
    orgUnitNo: 'FLT',
    language: 'fr',
    landingRoute: '/hr',
    active: true
  },
  {
    code: 'MNT001',
    password: DEMO_PASSWORD,
    name: 'Tojo Rasoanaivo',
    email: 't.rasoanaivo@ucodis.mg',
    profile: 'MAINTENANCE_TECHNICIAN',
    employeeNo: 'UCT-003',
    orgUnitNo: 'MNT',
    language: 'fr',
    landingRoute: '/maintenance',
    active: true
  },
  {
    code: 'CLI001',
    password: DEMO_PASSWORD,
    name: 'Miora Randrianasolo',
    email: 'm.randrianasolo@ucodis.mg',
    profile: 'CUSTOMER_SERVICE',
    employeeNo: 'UCT-004',
    orgUnitNo: 'CLI',
    language: 'fr',
    landingRoute: '/planning/customer-confirmations',
    active: true
  },
  {
    code: 'COM001',
    password: DEMO_PASSWORD,
    name: 'Lova Rabemananjara',
    email: 'l.rabemananjara@ucodis.mg',
    profile: 'SALES',
    employeeNo: 'UCT-005',
    orgUnitNo: 'COM',
    language: 'fr',
    landingRoute: '/planning/delivery-requests',
    active: true
  },
  {
    code: 'DEP001',
    password: DEMO_PASSWORD,
    name: 'Naina Rakotobe',
    profile: 'DEPOT',
    employeeNo: 'UCT-006',
    orgUnitNo: 'DEP',
    language: 'fr',
    landingRoute: '/hr',
    active: true
  },
  {
    code: 'DIR001',
    password: DEMO_PASSWORD,
    name: 'Rivo Andrianjafy',
    email: 'r.andrianjafy@ucodis.mg',
    profile: 'MANAGEMENT',
    employeeNo: 'UCT-007',
    orgUnitNo: 'UCT',
    language: 'fr',
    landingRoute: '/hr',
    active: true
  },
  {
    code: 'CND001',
    password: DEMO_PASSWORD,
    name: 'Tiana Rasolofoson',
    profile: 'DRIVER',
    employeeNo: 'UCT-012',
    orgUnitNo: 'CND',
    language: 'fr',
    landingRoute: '/me',
    active: true
  },
  {
    code: 'CND002',
    password: DEMO_PASSWORD,
    name: 'Mamy Andrianaivo',
    profile: 'DRIVER',
    employeeNo: 'UCT-011',
    orgUnitNo: 'CND',
    language: 'fr',
    landingRoute: '/me',
    active: true
  },
  {
    code: 'CND009',
    password: DEMO_PASSWORD,
    name: 'Jean-Luc Razanamalala',
    profile: 'DRIVER',
    employeeNo: 'UCT-018',
    orgUnitNo: 'CND',
    language: 'fr',
    landingRoute: '/me',
    active: false
  },
  {
    code: 'AID001',
    password: DEMO_PASSWORD,
    name: 'Fidy Ramanantsoa',
    profile: 'DRIVER_ASSISTANT',
    employeeNo: 'UCT-020',
    orgUnitNo: 'CND',
    language: 'fr',
    landingRoute: '/me',
    active: true
  }
]

export function findAccount(code: string): MockAccount | undefined {
  const normalized = code.trim().toUpperCase()
  return MOCK_ACCOUNTS.find((account) => account.code === normalized)
}
