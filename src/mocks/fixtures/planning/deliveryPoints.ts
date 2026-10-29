import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface DeliveryPointRow extends MockRow {
  name: string
  customerNo: string
  address: string
  city: string
  latitude: number
  longitude: number
  pumpRequired: boolean
  acceptedVehicleTypeNos: string[]
  active: boolean
  /** A recipient's delivery site, or a loading depot (TRS07-US02); absent reads as a site. */
  kind?: 'delivery' | 'depot'
  /** The site of the FMS register it stands for: its place then comes from there. */
  siteNo?: string | null
  /** A site belonging to someone else (a third-party depot); empty when it is ours. */
  ownerName?: string
}

const SEED: Omit<DeliveryPointRow, keyof typeof seedAudit>[] = [
  {
    no: 'DP-001',
    customerNo: 'CLI-001',
    name: 'Jumbo Score Tanjombato, quai de réception',
    address: 'Route de Tanjombato',
    city: 'Antananarivo',
    latitude: -18.9583,
    longitude: 47.5283,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-002',
    customerNo: 'CLI-002',
    name: 'Leader Price Antsirabe',
    address: 'Route Circulaire',
    city: 'Antsirabe',
    latitude: -19.8659,
    longitude: 47.0333,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-003',
    customerNo: 'CLI-003',
    name: 'Shoprite Mahajanga',
    address: 'Rue du Commerce',
    city: 'Mahajanga',
    latitude: -15.7167,
    longitude: 46.3167,
    pumpRequired: false,
    acceptedVehicleTypeNos: ['SEMI-TRAILER'],
    active: true
  },
  {
    no: 'DP-004',
    customerNo: 'CLI-005',
    name: 'Jumbo Score Ankorondrano',
    address: 'Ankorondrano',
    city: 'Antananarivo',
    latitude: -18.889,
    longitude: 47.524,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-005',
    customerNo: 'CLI-006',
    name: 'Shoprite Antsirabe',
    address: 'Route Circulaire',
    city: 'Antsirabe',
    latitude: -19.87,
    longitude: 47.036,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-006',
    customerNo: 'CLI-007',
    name: 'Leader Price Toamasina',
    address: 'Boulevard Joffre',
    city: 'Toamasina',
    latitude: -18.1492,
    longitude: 49.4023,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-007',
    customerNo: 'CLI-008',
    name: 'Quincaillerie Centrale, cour arrière',
    address: 'Route Circulaire',
    city: 'Antsirabe',
    latitude: -19.862,
    longitude: 47.03,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-008',
    customerNo: 'CLI-009',
    name: 'Super U Toamasina',
    address: 'Boulevard Joffre',
    city: 'Toamasina',
    latitude: -18.155,
    longitude: 49.41,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DP-009',
    customerNo: 'CLI-010',
    name: 'Station Ambohimanarina',
    address: '',
    city: 'Antananarivo',
    latitude: -18.879,
    longitude: 47.505,
    pumpRequired: true,
    acceptedVehicleTypeNos: ['TANKER'],
    active: true
  },
  {
    no: 'DP-010',
    customerNo: 'CLI-010',
    name: 'Station Ivato',
    address: "Route de l'aéroport",
    city: 'Antananarivo',
    latitude: -18.8,
    longitude: 47.48,
    pumpRequired: true,
    acceptedVehicleTypeNos: ['TANKER'],
    active: true
  },
  {
    no: 'DP-011',
    customerNo: 'CLI-010',
    name: 'Station Anosizato',
    address: '',
    city: 'Antananarivo',
    latitude: -18.93,
    longitude: 47.5,
    pumpRequired: false,
    acceptedVehicleTypeNos: ['TANKER'],
    active: true
  },
  {
    no: 'DP-012',
    customerNo: 'CLI-010',
    name: 'Station Andraharo',
    address: '',
    city: 'Antananarivo',
    latitude: -18.885,
    longitude: 47.515,
    pumpRequired: false,
    acceptedVehicleTypeNos: ['TANKER'],
    active: true
  },
  {
    no: 'DP-013',
    customerNo: 'CLI-010',
    name: 'Station Talatamaty',
    address: '',
    city: 'Antananarivo',
    latitude: -18.835,
    longitude: 47.47,
    pumpRequired: true,
    acceptedVehicleTypeNos: ['TANKER'],
    active: true
  },
  // The loading depots, taken from the site register of the FMS (TRS07-US02).
  {
    no: 'DPT-001',
    customerNo: '',
    kind: 'depot',
    siteNo: 'DEP-TNJ',
    ownerName: '',
    name: 'Dépôt Tanjombato',
    address: '',
    city: 'Antananarivo',
    latitude: -18.8792,
    longitude: 47.5079,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DPT-002',
    customerNo: '',
    kind: 'depot',
    siteNo: 'ENT-TNJ',
    ownerName: '',
    name: 'Entrepôt Tanjombato',
    address: '',
    city: 'Antananarivo',
    latitude: -18.9167,
    longitude: 47.53,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  },
  {
    no: 'DPT-003',
    customerNo: '',
    kind: 'depot',
    siteNo: 'DEP-ALR',
    ownerName: "Société de stockage d'Alarobia",
    name: "Dépôt pétrolier d'Alarobia",
    address: '',
    city: 'Antananarivo',
    latitude: -18.8735,
    longitude: 47.5262,
    pumpRequired: false,
    acceptedVehicleTypeNos: [],
    active: true
  }
]

export const deliveryPointsCollection: CollectionDefinition<DeliveryPointRow> = {
  name: 'delivery-points',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
