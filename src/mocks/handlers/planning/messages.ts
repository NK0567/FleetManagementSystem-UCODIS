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
  reasonNotOffered: {
    fr: 'Ce motif n’est pas proposé ici : choisissez-en un dans la liste.',
    en: 'This reason is not offered here: choose one from the list.'
  },
  requestOrdererInvalid: {
    fr: 'Le donneur d’ordre doit être un client actif qui passe des commandes.',
    en: 'The orderer must be an active customer that places orders.'
  },
  requestPointInactive: {
    fr: 'Ce point de livraison est désactivé.',
    en: 'This delivery point is inactive.'
  },
  requestProductInactive: {
    fr: 'Ce produit est désactivé.',
    en: 'This product is inactive.'
  },
  request_desiredDateInPast: {
    fr: 'La date souhaitée ne peut pas être passée.',
    en: 'The desired date cannot be in the past.'
  },
  request_validityBeforeDesiredDate: {
    fr: 'La validité ne peut pas finir avant la date souhaitée.',
    en: 'The validity cannot end before the desired date.'
  },
  requestReferenceRequired: {
    fr: 'Indiquez la référence du client ({label}).',
    en: 'Give the customer reference ({label}).'
  },
  requestReferenceTaken: {
    fr: 'Cette référence client est déjà celle de la demande {no}.',
    en: 'This customer reference already belongs to request {no}.'
  },
  requestNotEditable: {
    fr: 'Une demande planifiée ou annulée ne se modifie plus.',
    en: 'A planned or cancelled request can no longer be changed.'
  },
  requestNotRejectable: {
    fr: 'Seule une demande en attente ou expirée se rejette.',
    en: 'Only a pending or expired request can be rejected.'
  },
  requestNotCancellable: {
    fr: 'Une demande planifiée ou déjà annulée ne s’annule plus ici.',
    en: 'A planned or already cancelled request cannot be cancelled here.'
  },
  requestNotSplittable: {
    fr: 'Seule une demande en attente se fractionne.',
    en: 'Only a pending request can be split.'
  },
  requestSplitTooLarge: {
    fr: 'La part retirée doit être plus petite que la quantité de la demande.',
    en: 'The part taken out must be smaller than the quantity of the request.'
  },
  requestNotMergeable: {
    fr: 'On regroupe sur la demande d’origine, quand elle est encore en attente.',
    en: 'Parts are merged into the original request, while it is still pending.'
  },
  requestNoPartToMerge: {
    fr: 'Aucune part en attente à regrouper avec cette demande.',
    en: 'No pending part to merge into this request.'
  },
  deliveryPointCustomerNotRecipient: {
    fr: 'Un point de livraison appartient à un client destinataire actif.',
    en: 'A delivery point belongs to an active recipient customer.'
  },
  orderDepartureInPast: {
    fr: 'Le départ ne peut pas être à une date passée.',
    en: 'The departure cannot be on a past date.'
  },
  orderRouteInactive: {
    fr: 'Cet itinéraire est désactivé.',
    en: 'This route template is inactive.'
  },
  orderNotEditable: {
    fr: 'Cet ordre ne se modifie plus.',
    en: 'This order can no longer be changed.'
  },
  orderScheduleLocked: {
    fr: 'L’itinéraire et l’heure se lisent sur le trajet une fois l’ordre planifié.',
    en: 'Once the order is planned, the route and the time are read from the trip.'
  },
  orderLinesLocked: {
    fr: 'Les lignes ne se modifient qu’en brouillon ou une fois planifié, avant le départ.',
    en: 'Lines can be changed only while the order is a draft or planned, before departure.'
  },
  orderNotPlannable: {
    fr: 'Seul un brouillon se planifie.',
    en: 'Only a draft can be planned.'
  },
  orderNotCancellable: {
    fr: 'Cet ordre ne peut plus être annulé.',
    en: 'This order can no longer be cancelled.'
  },
  orderNeedsLines: {
    fr: 'Ajoutez au moins une ligne avant de planifier.',
    en: 'Add at least one line before planning.'
  },
  orderScheduleMissing: {
    fr: 'Indiquez l’itinéraire et l’heure de départ avant de planifier.',
    en: 'Set the route and the departure time before planning.'
  },
  orderRequestTaken: {
    fr: 'La demande {no} est déjà sur un ordre.',
    en: 'Request {no} is already on an order.'
  },
  orderRequestUnavailable: {
    fr: 'La demande {no} n’est pas à planifier.',
    en: 'Request {no} is not waiting to be planned.'
  },
  orderRequestExpired: {
    fr: 'La demande {no} est expirée : le réglage interdit de la planifier.',
    en: 'Request {no} has expired: the setting forbids planning it.'
  },
  orderRequestRepeated: {
    fr: 'La demande {no} est citée deux fois.',
    en: 'Request {no} is listed twice.'
  },
  orderPointInactive: {
    fr: 'Ce point de livraison est désactivé.',
    en: 'This delivery point is inactive.'
  },
  orderProductInactive: {
    fr: 'Ce produit est désactivé.',
    en: 'This product is inactive.'
  },
  orderNothingToCarry: {
    fr: 'Cet ensemble ne porte rien : un tracteur a besoin de sa remorque, un porteur de sa propre charge.',
    en: 'This combination carries nothing: a tractor needs its trailer, a rigid truck its own load.'
  },
  orderPayloadUnknown: {
    fr: 'La charge utile de cet ensemble n’est pas connue.',
    en: 'The payload of this combination is not known.'
  },
  orderOverWeight: {
    fr: 'Le poids ({weightKg} kg) dépasse la charge utile ({maxLoadKg} kg).',
    en: 'The weight ({weightKg} kg) exceeds the payload ({maxLoadKg} kg).'
  },
  orderOverFuel: {
    fr: 'Le carburant ({liters} L) dépasse la citerne ({capacityL} L).',
    en: 'The fuel ({liters} L) exceeds the tank ({capacityL} L).'
  },
  orderPumpRequired: {
    fr: 'Le point {point} exige une pompe, et cet ensemble n’en a pas.',
    en: 'Delivery point {point} requires a pump, and this combination has none.'
  },
  orderVehicleTypeRefused: {
    fr: 'Le point {point} n’accepte pas ce type de véhicule.',
    en: 'Delivery point {point} does not accept this vehicle type.'
  },
  orderProductsIncompatible: {
    fr: '{productA} et {productB} ne voyagent pas ensemble.',
    en: '{productA} and {productB} do not travel together.'
  },
  orderTripNotPlanned: {
    fr: 'Seul un trajet encore planifié peut recevoir un ordre.',
    en: 'Only a trip that is still planned can take an order.'
  },
  orderNotCarrier: {
    fr: 'Ce prestataire n’est pas un transporteur.',
    en: 'This provider is not a carrier.'
  },
  orderCarrierNotAuthorized: {
    fr: 'Ce transporteur n’est plus autorisé.',
    en: 'This carrier is no longer authorized.'
  },
  confirmationClosed: {
    fr: 'On ne confirme les destinataires qu’une fois l’ordre planifié, et avant le départ.',
    en: 'Recipients are confirmed only once the order is planned, and before it leaves.'
  },
  confirmationLineMissing: {
    fr: 'Cette ligne n’est pas sur l’ordre.',
    en: 'This line is not on the order.'
  },
  confirmationOutOfTour: {
    fr: 'Cette ligne n’est plus dans la tournée.',
    en: 'This line is no longer in the tour.'
  },
  confirmationAlreadyReplanned: {
    fr: 'Cette ligne est déjà repartie dans les demandes à planifier.',
    en: 'This line has already gone back to the requests waiting to be planned.'
  },
  confirmationDateMissing: {
    fr: 'Indiquez la date retenue pour replanifier.',
    en: 'Give the date kept for replanning.'
  },
  confirmationNeedsOrderer: {
    fr: 'Cette ligne n’a pas de donneur d’ordre : elle ne peut pas revenir dans les demandes.',
    en: 'This line has no orderer: it cannot go back to the requests.'
  }
} satisfies Record<string, LocalizedText>
