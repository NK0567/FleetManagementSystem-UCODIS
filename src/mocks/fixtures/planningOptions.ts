import type { LocalizedText } from '../i18n'

export const PLANNING_OPTION_SETS: Record<string, Record<string, LocalizedText>> = {
  planningReasonKind: {
    cancellation: { fr: 'Annulation', en: 'Cancellation' },
    request_rejection: { fr: 'Rejet de commande', en: 'Request rejection' },
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
    none: { fr: 'Aucune notification', en: 'No notification' },
    sms: { fr: 'SMS', en: 'SMS' },
    call: { fr: 'Appel', en: 'Call' },
    email: { fr: 'E-mail', en: 'E-mail' },
    whatsapp: { fr: 'WhatsApp', en: 'WhatsApp' }
  },
  deliverySlot: {
    any: { fr: 'Indifférent', en: 'Any time' },
    morning: { fr: 'Le matin', en: 'In the morning' },
    afternoon: { fr: "L'après-midi", en: 'In the afternoon' }
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
    customer: { fr: 'Ordonnateur ou destinataire', en: 'Orderer or recipient' },
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
    request: { fr: 'Transmise par un service', en: 'Sent by a service' },
    import: { fr: 'Import de fichier', en: 'File import' },
    planner: { fr: 'Saisie par le planificateur', en: 'Keyed by the planner' },
    connector: { fr: 'Système de gestion', en: 'Management system' },
    api: { fr: 'API des ordonnateurs', en: 'Orderers API' }
  },
  deliveryRequestKind: {
    sale: { fr: 'Vente à livrer', en: 'Sale to deliver' },
    transfer: { fr: 'Transfert entre sites', en: 'Transfer between sites' },
    return: { fr: 'Retour vers la base', en: 'Return to the base' }
  },
  deliveryPointKind: {
    delivery: { fr: 'Site de livraison', en: 'Delivery site' },
    depot: { fr: 'Dépôt de chargement', en: 'Loading depot' }
  },
  transportMode: {
    road: { fr: 'Camion', en: 'Truck' },
    rail: { fr: 'Train', en: 'Train' },
    sea: { fr: 'Bateau', en: 'Ship' },
    air: { fr: 'Avion', en: 'Plane' }
  },
  productMeasure: {
    quantity: { fr: 'Quantité', en: 'Quantity' },
    weight: { fr: 'Poids', en: 'Weight' },
    temperature: { fr: 'Température', en: 'Temperature' },
    density: { fr: 'Densité', en: 'Density' },
    volume15: { fr: 'Volume à 15 °C', en: 'Volume at 15 °C' }
  },
  callMoment: {
    day_before: { fr: 'La veille de la livraison', en: 'The day before the delivery' },
    same_day: { fr: 'Le jour même', en: 'On the day itself' }
  },
  freightPayer: {
    orderer: { fr: 'Ordonnateur', en: 'Orderer' },
    recipient: { fr: 'Destinataire', en: 'Recipient' }
  },
  transportOrderStatus: {
    draft: { fr: 'En attente', en: 'Pending' },
    planned: { fr: 'Planifié', en: 'Planned' },
    confirmed: { fr: 'Confirmé', en: 'Confirmed' },
    ready: { fr: 'Prêt pour exécution', en: 'Ready for execution' },
    in_progress: { fr: 'En cours', en: 'In progress' },
    completed: { fr: 'Terminé', en: 'Completed' },
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
  volume15Method: {
    coefficient: { fr: 'Coefficient de dilatation', en: 'Expansion coefficient' },
    typed: { fr: 'Valeur saisie seule', en: 'Typed value only' }
  },
  overToleranceMode: {
    flag: { fr: 'Signaler seulement', en: 'Flag only' },
    block: { fr: 'Bloquer la saisie', en: 'Block the entry' }
  }
}
