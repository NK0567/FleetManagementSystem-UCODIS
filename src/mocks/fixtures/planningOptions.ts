import type { LocalizedText } from '../i18n'

export const PLANNING_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  planningReasonKind: {
    cancellation: { fr: 'Annulation', en: 'Cancellation' },
    request_rejection: { fr: 'Rejet de demande', en: 'Request rejection' },
    delivery_refusal: { fr: 'Refus à la livraison', en: 'Refusal on delivery' },
    unavailability: { fr: 'Indisponibilité du destinataire', en: 'Recipient unavailable' },
    nonconformity: { fr: 'Non-conformité au chargement', en: 'Loading nonconformity' },
    postponement: { fr: 'Report de livraison', en: 'Delivery postponed' },
    contestation: { fr: 'Contestation de réception', en: 'Reception contested' },
    protest: { fr: 'Protêt', en: 'Protest note' }
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
  tariffTarget: {
    customer: { fr: 'Client', en: 'Customer' },
    carrier: { fr: 'Transporteur', en: 'Carrier' }
  },
  tariffBasis: {
    route_template: { fr: 'Forfait par itinéraire', en: 'Flat rate per route' },
    distance: { fr: 'Au kilomètre', en: 'Per kilometre' },
    weight: { fr: 'À la tonne', en: 'Per tonne' },
    quantity: { fr: "À l'unité de produit", en: 'Per product unit' }
  },
  deliveryRequestStatus: {
    pending: { fr: 'En attente', en: 'Pending' },
    planned: { fr: 'Planifiée', en: 'Planned' },
    expired: { fr: 'Expirée', en: 'Expired' },
    rejected: { fr: 'Rejetée', en: 'Rejected' },
    cancelled: { fr: 'Annulée', en: 'Cancelled' }
  },
  deliveryRequestOrigin: {
    request: { fr: 'Demande', en: 'Request' },
    import: { fr: 'Import', en: 'Import' },
    planner: { fr: 'Saisie par le planificateur', en: 'Keyed by the planner' }
  },
  freightPayer: {
    orderer: { fr: "Donneur d'ordre", en: 'Orderer' },
    recipient: { fr: 'Destinataire', en: 'Recipient' }
  },
  transportOrderStatus: {
    draft: { fr: 'Brouillon', en: 'Draft' },
    planned: { fr: 'Planifié', en: 'Planned' },
    confirmed: { fr: 'Confirmé', en: 'Confirmed' },
    ready: { fr: 'Prêt', en: 'Ready' },
    in_progress: { fr: 'En cours', en: 'In progress' },
    delivered: { fr: 'Livré', en: 'Delivered' },
    cancelled: { fr: 'Annulé', en: 'Cancelled' }
  },
  transportMeans: {
    fleet: { fr: 'Flotte', en: 'Fleet' },
    carrier: { fr: 'Transporteur', en: 'Carrier' }
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
