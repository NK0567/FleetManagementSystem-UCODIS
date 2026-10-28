import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface SiteRow extends MockRow {
  name: string
  siteTypeNo: string
  city: string
  region: string
  address: string
  email: string
  thirdPartyOwner: string
  active: boolean
  latitude: number
  longitude: number
  radiusM: number | null
}

const SEED: Omit<SiteRow, keyof typeof seedAudit>[] = [
  {
    no: 'HQ-TNR',
    name: 'Siège Antananarivo',
    siteTypeNo: 'BASE',
    city: 'Antananarivo',
    region: 'Analamanga',
    address: 'Rue Rainitovo, Antsahavola',
    latitude: -18.9137,
    longitude: 47.5361,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'GAR-TNR',
    name: 'Garage Antananarivo',
    siteTypeNo: 'WORKSHOP',
    city: 'Antananarivo',
    region: 'Analamanga',
    address: 'Zone industrielle Ankorondrano',
    latitude: -18.8885,
    longitude: 47.518,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'DEP-TNJ',
    name: 'Dépôt Tanjombato',
    siteTypeNo: 'DEPOT',
    city: 'Antananarivo',
    region: 'Analamanga',
    address: '',
    latitude: -18.8792,
    longitude: 47.5079,
    radiusM: 800,
    thirdPartyOwner: '',
    email: 'chargement@depot-tanjombato.mg',
    active: true
  },
  {
    no: 'ENT-TNJ',
    name: 'Entrepôt Tanjombato',
    siteTypeNo: 'DEPOT',
    city: 'Antananarivo',
    region: 'Analamanga',
    address: '',
    latitude: -18.9167,
    longitude: 47.53,
    radiusM: 800,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'DEP-ALR',
    name: "Dépôt pétrolier d'Alarobia",
    siteTypeNo: 'DEPOT',
    city: 'Antananarivo',
    region: 'Analamanga',
    address: '',
    latitude: -18.8735,
    longitude: 47.5262,
    radiusM: 800,
    thirdPartyOwner: "Société de stockage d'Alarobia",
    email: 'chargement@depot-alarobia.mg',
    active: true
  },
  {
    no: 'ENT-TOA',
    name: 'Entrepôt Toamasina',
    siteTypeNo: 'CUST-WH',
    city: 'Toamasina',
    region: 'Atsinanana',
    address: '',
    latitude: -18.1492,
    longitude: 49.4023,
    radiusM: 800,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'ENT-ATS',
    name: 'Entrepôt Antsirabe centre',
    siteTypeNo: 'CUST-WH',
    city: 'Antsirabe',
    region: 'Vakinankaratra',
    address: '',
    latitude: -19.8667,
    longitude: 47.0333,
    radiusM: 800,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'ENT-MJN',
    name: 'Entrepôt Mahajanga',
    siteTypeNo: 'CUST-WH',
    city: 'Mahajanga',
    region: 'Boeny',
    address: '',
    latitude: -15.7167,
    longitude: 46.3167,
    radiusM: 800,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'REL-MOR',
    name: 'Relais Moramanga',
    siteTypeNo: 'RELAY',
    city: 'Moramanga',
    region: 'Alaotra-Mangoro',
    address: '',
    latitude: -18.9333,
    longitude: 47.9333,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'PTC-BRK',
    name: 'Contrôle Brickaville',
    siteTypeNo: 'CHECKPOINT',
    city: 'Brickaville',
    region: 'Atsinanana',
    address: '',
    latitude: -18.6667,
    longitude: 48.9833,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'STA-AMB',
    name: 'Station Ambatolampy',
    siteTypeNo: 'CHECKPOINT',
    city: 'Ambatolampy',
    region: 'Vakinankaratra',
    address: '',
    latitude: -19.3833,
    longitude: 47.4167,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'PTC-ANK',
    name: 'Contrôle Ankazobe',
    siteTypeNo: 'CHECKPOINT',
    city: 'Ankazobe',
    region: 'Analamanga',
    address: '',
    latitude: -18.3167,
    longitude: 47.1167,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'PTC-MEV',
    name: 'Contrôle Maevatanana',
    siteTypeNo: 'CHECKPOINT',
    city: 'Maevatanana',
    region: 'Betsiboka',
    address: '',
    latitude: -16.95,
    longitude: 46.8333,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  },
  {
    no: 'ZAR-RN2',
    name: 'Zone à risque RN2',
    siteTypeNo: 'RISK-ZONE',
    city: 'Route nationale 2',
    region: 'Alaotra-Mangoro',
    address: '',
    latitude: -18.75,
    longitude: 48.7,
    radiusM: null,
    thirdPartyOwner: '',
    email: '',
    active: true
  }
]

export const sitesCollection: CollectionDefinition<SiteRow> = {
  name: 'sites',
  seed: () => SEED.map((row) => ({ ...row, ...seedAudit }))
}
