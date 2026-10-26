import type { LocalizedText } from '../../i18n'

export const PLANNING_MESSAGES = {
  unknownSettingsSection: {
    fr: 'Cette section de réglages n’existe pas.',
    en: 'This settings section does not exist.'
  },
  customerNameTaken: {
    fr: 'Le client {no} porte déjà ce nom.',
    en: 'Customer {no} already has this name.'
  },
  customer_noRole: {
    fr: "Un client est donneur d'ordre, destinataire, ou les deux.",
    en: 'A customer is an orderer, a recipient, or both.'
  },
  customer_channelNeedsPhone: {
    fr: 'Le SMS demande un numéro de téléphone.',
    en: 'SMS needs a phone number.'
  },
  customer_channelNeedsEmail: {
    fr: 'Le courriel demande une adresse e-mail.',
    en: 'E-mail needs an e-mail address.'
  },
  customerHasDeliveryPoints: {
    fr: 'Ce client a des points de livraison : désactivez-le plutôt.',
    en: 'This customer has delivery points: deactivate it instead.'
  },
  productNameTaken: {
    fr: 'Le produit {no} porte déjà ce nom.',
    en: 'Product {no} already has this name.'
  },
  productNeedsDensity: {
    fr: 'Un carburant demande sa densité de référence, pour le calcul à 15 °C.',
    en: 'A fuel needs its reference density, for the 15 °C calculation.'
  },
  compatibilitySameProduct: {
    fr: 'Une règle de compatibilité porte sur deux produits différents.',
    en: 'A compatibility rule is about two different products.'
  },
  compatibilityExists: {
    fr: 'La règle {no} dit déjà la même chose.',
    en: 'Rule {no} already says the same.'
  },
  companyTolerance: {
    fr: 'Toute l’entreprise',
    en: 'Whole company'
  },
  tolerance_percentAbove100: {
    fr: 'Un écart en pourcentage ne dépasse pas 100 %.',
    en: 'A gap in percent does not exceed 100%.'
  },
  tolerance_quantityNeedsProduct: {
    fr: 'Un écart en quantité se compte dans l’unité d’un produit : choisissez le produit.',
    en: 'A gap in quantity is counted in the unit of a product: choose the product.'
  },
  toleranceExists: {
    fr: 'La tolérance {no} couvre déjà ce client et ce produit : modifiez-la plutôt.',
    en: 'Tolerance {no} already covers this customer and product: change it instead.'
  },
  companyToleranceKept: {
    fr: 'La tolérance de l’entreprise s’applique quand aucune autre ne convient : modifiez sa valeur.',
    en: 'The company tolerance applies when no other one fits: change its value instead.'
  },
  tariff_partyMissing: {
    fr: 'Choisissez le client ou le transporteur de ce tarif.',
    en: 'Choose the customer or the carrier of this tariff.'
  },
  tariff_routeNeeded: {
    fr: 'Un forfait s’applique à un itinéraire : choisissez-le.',
    en: 'A flat rate applies to a route template: choose it.'
  },
  tariffInternalCustomer: {
    fr: 'Un service interne ne se facture pas : les tarifs clients visent les clients externes.',
    en: 'An internal department is not billed: customer tariffs are for outside customers.'
  },
  tariffNotCarrier: {
    fr: 'Ce prestataire n’est pas un transporteur.',
    en: 'This provider is not a carrier.'
  },
  tariffCarrierNotAuthorized: {
    fr: 'Ce transporteur n’est plus autorisé : son tarif ne peut pas être actif.',
    en: 'This carrier is no longer authorized: its tariff cannot be active.'
  },
  tariffRouteInactive: {
    fr: 'Cet itinéraire est désactivé : choisissez un itinéraire actif.',
    en: 'This route template is inactive: choose an active one.'
  },
  tariffExists: {
    fr: 'Le tarif {no} couvre déjà ce cas : modifiez-le plutôt.',
    en: 'Tariff {no} already covers this case: change it instead.'
  },
  deliveryPointCustomerNotRecipient: {
    fr: 'Un point de livraison appartient à un client destinataire actif.',
    en: 'A delivery point belongs to an active recipient customer.'
  }
} satisfies Record<string, LocalizedText>
