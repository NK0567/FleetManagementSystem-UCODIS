import type { LocalizedText } from '../i18n'

export const FLEET_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  couplingRole: {
    tows: { fr: 'Tire une remorque', en: 'Tows a trailer' },
    towed: { fr: 'Est attelé à un tracteur', en: 'Is towed by a tractor' },
    none: { fr: "Ne s'attelle pas", en: 'Is not coupled' }
  },
  equipmentCapability: {
    tracker: { fr: 'Boîtier de suivi', en: 'Tracker' },
    camera: { fr: 'Caméra', en: 'Camera' },
    pump: { fr: 'Pompe', en: 'Pump' },
    safety: { fr: 'Sécurité', en: 'Safety' },
    other: { fr: 'Autre', en: 'Other' }
  },
  providerType: {
    garage: { fr: 'Atelier', en: 'Garage' },
    parts_supplier: { fr: 'Fournisseur de pièces', en: 'Parts supplier' },
    tyre_supplier: { fr: 'Fournisseur de pneus', en: 'Tyre supplier' },
    fuel_supplier: { fr: 'Fournisseur de carburant', en: 'Fuel supplier' },
    insurer: { fr: 'Assureur', en: 'Insurer' },
    manufacturer: { fr: 'Constructeur', en: 'Manufacturer' },
    bank: { fr: 'Banque', en: 'Bank' },
    carrier: { fr: 'Transporteur', en: 'Carrier' }
  }
}
