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
  deliveryPointCustomerNotRecipient: {
    fr: 'Un point de livraison appartient à un client destinataire actif.',
    en: 'A delivery point belongs to an active recipient customer.'
  }
} satisfies Record<string, LocalizedText>
