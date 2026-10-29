import type {
  CarrierVehicle,
  ProviderContract,
  ProviderSource
} from '@/modules/fleet/providers/types/provider.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface ProviderRow extends MockRow {
  name: string
  providerType: string
  contactName: string
  phone: string
  email: string
  address: string
  authorized: boolean
  notAuthorizedReason: string
  contracts: ProviderContract[]
  carrierVehicles?: CarrierVehicle[]
  source?: ProviderSource
  externalId?: string | null
}

const SEED: Omit<ProviderRow, keyof typeof seedAudit>[] = [
  {
    no: 'PRS-001',
    name: 'Garage Poids Lourds Ankorondrano',
    providerType: 'garage',
    contactName: 'Fidy Rakotondrabe',
    phone: '034 20 111 22',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-002',
    name: 'Atelier Diesel Tanjombato',
    providerType: 'garage',
    contactName: 'Haja Randria',
    phone: '033 41 555 18',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-003',
    name: 'Mécanique Générale Ivato',
    providerType: 'garage',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    authorized: false,
    notAuthorizedReason: 'Retards répétés et facturation contestée.',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-004',
    name: 'Pneus Océan Indien',
    providerType: 'tyre_supplier',
    contactName: 'Lanto Rabe',
    phone: '034 05 900 41',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-005',
    name: 'Rechapage Hautes Terres',
    providerType: 'tyre_supplier',
    contactName: '',
    phone: '032 07 340 12',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-006',
    name: 'Somaco Antananarivo',
    providerType: 'parts_supplier',
    contactName: 'Rija Andriamampionona',
    phone: '034 12 345 67',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-007',
    name: 'Réseau Stations Hautes Terres',
    providerType: 'fuel_supplier',
    contactName: 'Service cartes',
    phone: '020 22 400 10',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-008',
    name: "Carburants de l'Île",
    providerType: 'fuel_supplier',
    contactName: '',
    phone: '020 22 515 30',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-009',
    name: 'Banque de financement Poids Lourds',
    providerType: 'bank',
    contactName: 'Service leasing',
    phone: '020 22 610 00',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [
      {
        reference: 'CTR-001',
        subject: 'Leasing tracteurs 2021-2026',
        startDate: '2021-01-10',
        endDate: '2026-12-31',
        amount: 610000000
      }
    ]
  },
  {
    no: 'PRS-010',
    name: 'ARO Madagascar',
    providerType: 'insurer',
    contactName: 'Service flottes',
    phone: '020 22 201 54',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [
      {
        reference: 'CTR-002',
        subject: 'Assurance flotte, responsabilité civile et dommages',
        startDate: '2025-01-01',
        endDate: '2026-12-31',
        amount: null
      }
    ]
  },
  {
    no: 'PRS-011',
    name: 'NY HAVANA Assurances',
    providerType: 'insurer',
    contactName: '',
    phone: '020 22 268 20',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-012',
    name: 'Distributeur Poids Lourds Antananarivo',
    providerType: 'manufacturer',
    contactName: 'Service après-vente',
    phone: '',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-013',
    name: 'Filtres & Lubrifiants Océan Indien',
    providerType: 'parts_supplier',
    contactName: 'Nirina Ravalison',
    phone: '033 98 765 43',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-014',
    name: 'Freinage Pro Antananarivo',
    providerType: 'parts_supplier',
    contactName: 'Tiana Rakotoson',
    phone: '032 55 112 20',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-015',
    name: 'Électricité Poids Lourds SARL',
    providerType: 'parts_supplier',
    contactName: 'Herimanana Rasolofo',
    phone: '034 77 220 10',
    email: '',
    address: '',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: []
  },
  {
    no: 'PRS-016',
    name: 'Transports Rapides Analamanga',
    providerType: 'carrier',
    contactName: 'Andry Rakotomalala',
    phone: '034 60 210 33',
    email: 'exploitation@tra.mg',
    address: 'Zone industrielle Forello, Tanjombato',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: [
      { plate: '2345 TBA', description: 'Semi-remorque bâchée 32 t' },
      { plate: '2378 TBA', description: 'Porteur 19 t' }
    ]
  },
  {
    no: 'PRS-017',
    name: 'Citernes du Grand Sud',
    providerType: 'carrier',
    contactName: 'Service affrètement',
    phone: '020 22 330 15',
    email: '',
    address: 'Route des Hydrocarbures, Toamasina',
    authorized: true,
    notAuthorizedReason: '',
    contracts: [],
    carrierVehicles: [
      { plate: '5120 TAD', description: 'Citerne 3 compartiments 30 000 L' },
      { plate: '5144 TAD', description: 'Citerne 2 compartiments 20 000 L' }
    ]
  }
]

export const providersCollection: CollectionDefinition<ProviderRow> = {
  name: 'providers',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
