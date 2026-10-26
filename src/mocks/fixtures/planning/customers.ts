import type {
  CustomerNature,
  NotificationChannel
} from '@/modules/planning/customers/types/customer.types'
import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface CustomerRow extends MockRow {
  name: string
  isOrderer: boolean
  isRecipient: boolean
  nature: CustomerNature
  address: string
  city: string
  contactName: string
  phone: string
  email: string
  notificationChannel: NotificationChannel
  active: boolean
}

const SEED: Omit<CustomerRow, keyof typeof seedAudit>[] = [
  {
    no: 'CLI-001',
    name: 'Jumbo Score Tanjombato',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Route de Tanjombato',
    city: 'Antananarivo',
    contactName: 'Service réception',
    phone: '020 22 123 45',
    email: 'reception@jumboscore-tnj.mg',
    notificationChannel: 'sms_email',
    active: true
  },
  {
    no: 'CLI-002',
    name: 'Leader Price Antsirabe',
    isOrderer: true,
    isRecipient: true,
    nature: 'external',
    address: 'Route Circulaire',
    city: 'Antsirabe',
    contactName: 'Service réception',
    phone: '020 44 567 89',
    email: 'reception@leaderprice-antsirabe.mg',
    notificationChannel: 'email',
    active: true
  },
  {
    no: 'CLI-003',
    name: 'Shoprite Mahajanga',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Rue du Commerce',
    city: 'Mahajanga',
    contactName: 'Service réception',
    phone: '020 62 345 67',
    email: '',
    notificationChannel: 'sms',
    active: true
  },
  {
    no: 'CLI-004',
    name: 'Équipe commerciale',
    isOrderer: true,
    isRecipient: false,
    nature: 'internal',
    address: '',
    city: 'Antananarivo',
    contactName: 'Lova Rabemananjara',
    phone: '034 11 222 33',
    email: 'commercial@ucodis.mg',
    notificationChannel: 'email',
    active: true
  },
  {
    no: 'CLI-005',
    name: 'Jumbo Score Antananarivo',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Ankorondrano',
    city: 'Antananarivo',
    contactName: 'Service réception',
    phone: '020 22 234 56',
    email: '',
    notificationChannel: 'sms',
    active: true
  },
  {
    no: 'CLI-006',
    name: 'Shoprite Antsirabe',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Route Circulaire',
    city: 'Antsirabe',
    contactName: 'Service réception',
    phone: '020 44 678 90',
    email: '',
    notificationChannel: 'sms',
    active: true
  },
  {
    no: 'CLI-007',
    name: 'Leader Price Toamasina',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Boulevard Joffre',
    city: 'Toamasina',
    contactName: 'Service réception',
    phone: '020 53 321 45',
    email: 'reception@leaderprice-toamasina.mg',
    notificationChannel: 'sms_email',
    active: true
  },
  {
    no: 'CLI-008',
    name: 'Quincaillerie Centrale Antsirabe',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Route Circulaire',
    city: 'Antsirabe',
    contactName: 'Service réception',
    phone: '034 05 123 45',
    email: '',
    notificationChannel: 'sms',
    active: true
  },
  {
    no: 'CLI-009',
    name: 'Super U Toamasina',
    isOrderer: false,
    isRecipient: true,
    nature: 'external',
    address: 'Boulevard Joffre',
    city: 'Toamasina',
    contactName: 'Service réception',
    phone: '020 53 456 78',
    email: '',
    notificationChannel: 'sms',
    active: true
  },
  {
    no: 'CLI-010',
    name: 'Réseau Stations Hautes Terres',
    isOrderer: true,
    isRecipient: true,
    nature: 'external',
    address: '',
    city: 'Antananarivo',
    contactName: 'Service approvisionnement',
    phone: '034 20 101 00',
    email: 'appro@stations-ht.mg',
    notificationChannel: 'sms_email',
    active: true
  }
]

export const customersCollection: CollectionDefinition<CustomerRow> = {
  name: 'customers',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
