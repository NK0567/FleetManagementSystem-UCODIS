/**
 * The third parties of the company management system, as the mock-up simulates it. A real
 * connector would read them from that system; here they are fixed so that a resumption shows
 * what it does.
 */
export interface ExternalProviderRecord {
  externalId: string
  name: string
  providerType: string
  contactName: string
  phone: string
  email: string
  address: string
  /** Blocked in the management system: the fleet may no longer work with it. */
  blocked: boolean
}

export const EXTERNAL_PROVIDERS: readonly ExternalProviderRecord[] = [
  {
    externalId: 'ERP-F-0001',
    name: 'Garage Poids Lourds Ankorondrano',
    providerType: 'garage',
    contactName: 'Fidy Rakotondrabe',
    phone: '034 20 111 22',
    email: 'contact@gpl-ankorondrano.mg',
    address: 'Rue Ravoninahitriniarivo, Ankorondrano',
    blocked: false
  },
  {
    externalId: 'ERP-F-0042',
    name: 'Pneus Service Ivato',
    providerType: 'tyre_supplier',
    contactName: 'Lova Rakoto',
    phone: '034 20 333 10',
    email: 'ventes@pneus-ivato.mg',
    address: 'Route de l’aéroport, Ivato',
    blocked: false
  },
  {
    externalId: 'ERP-F-0057',
    name: 'Assurances Océan Indien',
    providerType: 'insurer',
    contactName: 'Service flottes',
    phone: '020 22 456 00',
    email: 'flottes@aoi.mg',
    address: 'Antaninarenina, Antananarivo',
    blocked: true
  }
]
