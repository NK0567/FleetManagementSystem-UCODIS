import type { LocalizedText } from '../i18n'

export const PLANNING_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  planningReasonKind: {
    cancellation: { fr: 'Annulation', en: 'Cancellation' },
    request_rejection: { fr: 'Rejet de demande', en: 'Request rejection' },
    delivery_refusal: { fr: 'Refus à la livraison', en: 'Refusal on delivery' },
    unavailability: { fr: 'Indisponibilité du destinataire', en: 'Recipient unavailable' },
    nonconformity: { fr: 'Non-conformité au chargement', en: 'Loading nonconformity' },
    postponement: { fr: 'Report de livraison', en: 'Delivery postponed' }
  },
  customerNature: {
    external: { fr: 'Externe', en: 'External' },
    internal: { fr: 'Service interne', en: 'Internal department' }
  },
  notificationChannel: {
    sms: { fr: 'SMS', en: 'SMS' },
    email: { fr: 'E-mail', en: 'E-mail' },
    sms_email: { fr: 'SMS et e-mail', en: 'SMS and e-mail' }
  },
  productCompatibilityKind: {
    together: { fr: 'Jamais ensemble', en: 'Never together' },
    succession: { fr: 'Pas B après A sans nettoyage', en: 'No B after A without cleaning' }
  },
  toleranceUnit: {
    percent: { fr: '% du chargé', en: '% of loaded' },
    quantity: { fr: 'Unités du produit', en: 'Product units' }
  },
  freightPayer: {
    orderer: { fr: "Donneur d'ordre", en: 'Orderer' },
    recipient: { fr: 'Destinataire', en: 'Recipient' }
  },
  expiredDateMode: {
    alert: { fr: 'Alerter seulement', en: 'Alert only' },
    block: { fr: "Bloquer l'exécution", en: 'Block execution' }
  },
  overToleranceMode: {
    flag: { fr: 'Signaler seulement', en: 'Flag only' },
    block: { fr: 'Bloquer la saisie', en: 'Block the entry' }
  }
}
