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
  },
  loadingClosed: {
    fr: 'Le chargement se déclare une fois l’ordre confirmé, et avant qu’il soit prêt.',
    en: 'Loading is declared once the order is confirmed, and before it is ready.'
  },
  loadingQuantityMissing: {
    fr: 'Indiquez la quantité chargée de chaque ligne encore dans la tournée.',
    en: 'Give the loaded quantity of every line still in the tour.'
  },
  loadingLineOut: {
    fr: 'Cette ligne n’est plus à charger.',
    en: 'This line is no longer to be loaded.'
  },
  loadingNotDeclared: {
    fr: 'L’entrepôt n’a pas encore déclaré le chargement de cette ligne.',
    en: 'The warehouse has not declared the loading of this line yet.'
  },
  executionNotCarrier: {
    fr: 'Le départ et l’arrivée se saisissent pour un transporteur. Pour la flotte, ils sont sur le trajet.',
    en: 'Departure and arrival are entered for a carrier. For the fleet, they belong to the trip.'
  },
  executionNotReady: {
    fr: 'Le transporteur ne part qu’une fois l’ordre prêt.',
    en: 'The carrier leaves only once the order is ready.'
  },
  executionNotOnTheRoad: {
    fr: 'Une livraison se déclare une fois l’ordre en cours.',
    en: 'A delivery is declared once the order is on the road.'
  },
  executionLineSettled: {
    fr: 'Cette ligne est déjà réglée.',
    en: 'This line is already settled.'
  },
  executionGapBlocked: {
    fr: 'L’écart dépasse la tolérance : une justification est obligatoire.',
    en: 'The gap exceeds the tolerance: a justification is required.'
  },
  executionNoGap: {
    fr: 'Cette ligne n’a pas d’écart à qualifier.',
    en: 'This line has no gap to qualify.'
  },
  executionGapQualified: {
    fr: 'Cet écart est déjà qualifié.',
    en: 'This gap is already qualified.'
  },
  executionGapKind: {
    fr: 'Un gain qualifie un écart positif, une perte un écart négatif.',
    en: 'A gain qualifies a positive gap, a loss a negative one.'
  },
  receptionNotDeclared: {
    fr: 'La réception se confirme une fois la livraison déclarée.',
    en: 'Reception is confirmed once the delivery has been declared.'
  },
  receptionAlreadyConfirmed: {
    fr: 'Cette réception est déjà confirmée.',
    en: 'This reception is already confirmed.'
  },
  receptionContested: {
    fr: 'Cette livraison est contestée : elle se traite, elle ne se confirme plus.',
    en: 'This delivery is contested: it is handled, it is no longer confirmed.'
  },
  receptionNotContested: {
    fr: 'Cette livraison n’est pas contestée.',
    en: 'This delivery is not contested.'
  },
  receptionContestHandled: {
    fr: 'Cette contestation est déjà traitée.',
    en: 'This contestation is already handled.'
  },
  receptionSatisfactionClosed: {
    fr: 'La satisfaction se note une fois, après la confirmation de réception.',
    en: 'Satisfaction is recorded once, after the reception is confirmed.'
  },
  receptionNothingToReturn: {
    fr: 'Cette ligne n’a pas de marchandise à rapporter.',
    en: 'This line has no goods to bring back.'
  },
  receptionAlreadyHandedBack: {
    fr: 'Cette marchandise est déjà remise.',
    en: 'These goods have already been handed back.'
  },
  receptionReturnReceived: {
    fr: 'Ce retour est déjà réceptionné.',
    en: 'This return has already been received.'
  },
  receptionNoRemainder: {
    fr: 'Cette livraison n’a pas de quantité restante à replanifier.',
    en: 'This delivery has no remaining quantity to replan.'
  },
  receptionRemainderTaken: {
    fr: 'Ce reliquat est déjà replanifié.',
    en: 'This remainder is already replanned.'
  },
  qualityNotVisited: {
    fr: 'Un protêt porte sur une livraison où le conducteur est passé.',
    en: 'A protest note covers a delivery the driver has reached.'
  },
  qualityFollowUpClosed: {
    fr: 'Le suivi de cette ligne est clos.',
    en: 'The follow-up of this line is closed.'
  },
  qualityQuantity: {
    fr: 'La quantité en cause doit être positive et au plus égale à la quantité de la ligne.',
    en: 'The quantity at issue must be positive and at most the quantity of the line.'
  },
  qualityProtestIssued: {
    fr: 'Une note émise ne se modifie plus.',
    en: 'An issued note can no longer be changed.'
  },
  qualityProtestNotIssued: {
    fr: 'Seule une note émise se clôture.',
    en: 'Only an issued note can be closed.'
  },
  qualityNoFact: {
    fr: 'Aucun fait n’est enregistré sur cette livraison.',
    en: 'No fact is recorded on this delivery.'
  },
  qualityShareDuplicate: {
    fr: 'Un même acteur ne figure qu’une fois.',
    en: 'The same actor appears only once.'
  },
  qualityExternalMeans: {
    fr: 'Le transporteur externe ne répond que d’une expédition qui lui a été confiée.',
    en: 'The external carrier answers only for an expedition entrusted to them.'
  },
  qualityInternalMeans: {
    fr: 'Le transporteur interne ne répond pas d’une expédition confiée à un transporteur.',
    en: 'The internal carrier does not answer for an expedition entrusted to a carrier.'
  },
  qualitySharePercent: {
    fr: 'La part de chaque acteur est un pourcentage positif.',
    en: 'Each actor’s share is a positive percentage.'
  },
  qualityShareTotal: {
    fr: 'Les parts doivent totaliser 100 %.',
    en: 'The shares must add up to 100%.'
  },
  qualityImpactDuplicate: {
    fr: 'Un même impact ne se saisit qu’une fois.',
    en: 'The same impact is entered only once.'
  },
  qualityImpactAmount: {
    fr: 'Le montant d’un impact est positif.',
    en: 'An impact amount is positive.'
  },
  qualityWithholding: {
    fr: 'Une retenue ne vise que le transporteur externe responsable.',
    en: 'A withholding applies only to the responsible external carrier.'
  },
  qualityFrozen: {
    fr: 'Les parts sont figées : le client est facturé ou la facture du transporteur est validée.',
    en: 'The shares are frozen: the customer is invoiced or the carrier invoice is validated.'
  },
  qualityCreditMissing: {
    fr: 'Cette livraison n’a pas d’avoir à émettre.',
    en: 'This delivery has no credit note to issue.'
  },
  qualityCreditIssued: {
    fr: 'Cet avoir est déjà émis : son montant ne change plus.',
    en: 'This credit note is already issued: its amount no longer changes.'
  },
  qualityCreditReference: {
    fr: 'Cette référence d’avoir est déjà utilisée.',
    en: 'This credit note reference is already used.'
  },
  closingBlocked: {
    fr: 'La clôture est bloquée : {blocks}.',
    en: 'Closing is blocked: {blocks}.'
  },
  closingDone: {
    fr: 'Cet ordre est déjà clôturé.',
    en: 'This order is already closed.'
  },
  closingDocumentTaken: {
    fr: 'Ce document est déjà déposé.',
    en: 'This document is already filed.'
  },
  closingDebriefingEarly: {
    fr: 'La fiche de débriefing se remplit une fois l’ordre parti.',
    en: 'The debriefing sheet is filled once the order has left.'
  },
  closingVoucher: {
    fr: 'Indiquez le numéro de bon.',
    en: 'Enter the voucher number.'
  },
  closingVehicle: {
    fr: 'Le véhicule se lit sur le trajet : aucun n’est associé à cet ordre.',
    en: 'The vehicle is read from the trip: none is linked to this order.'
  },
  closingDates: {
    fr: 'La date de déchargement ne peut pas précéder la date de chargement.',
    en: 'The unloading date cannot be earlier than the loading date.'
  },
  billingNotDelivered: {
    fr: 'Cette livraison n’a pas eu lieu.',
    en: 'This delivery did not take place.'
  },
  billingInternal: {
    fr: 'Le fret est à la charge d’un service interne : rien à facturer.',
    en: 'The freight is paid by an internal department: nothing to invoice.'
  },
  billingReception: {
    fr: 'La livraison se facture une fois la réception attestée.',
    en: 'The delivery is invoiced once the reception is attested.'
  },
  billingGap: {
    fr: 'Qualifiez l’écart de quantité avant de facturer.',
    en: 'Qualify the quantity gap before invoicing.'
  },
  billingContestation: {
    fr: 'Traitez la contestation avant de facturer.',
    en: 'Handle the contestation before invoicing.'
  },
  billingTariff: {
    fr: 'Aucun tarif de ce client ne s’applique à cette livraison.',
    en: 'No tariff of this customer applies to this delivery.'
  },
  billingInvoiced: {
    fr: 'Cette livraison est déjà facturée.',
    en: 'This delivery is already invoiced.'
  },
  billingReference: {
    fr: 'Cette référence est déjà utilisée par une facture ou un avoir.',
    en: 'This reference is already used by an invoice or a credit note.'
  },
  carrierInvoiceNotCarrier: {
    fr: 'Seuls les transporteurs reçoivent une facture de transport.',
    en: 'Only carriers receive a transport invoice.'
  },
  carrierInvoiceDate: {
    fr: 'La date de la facture ne peut pas être dans le futur.',
    en: 'The invoice date cannot be in the future.'
  },
  carrierInvoiceOrders: {
    fr: 'Cochez au moins un ordre couvert par la facture.',
    en: 'Tick at least one order covered by the invoice.'
  },
  carrierInvoiceReference: {
    fr: 'Ce numéro de facture est déjà enregistré pour ce transporteur.',
    en: 'This invoice number is already recorded for this carrier.'
  },
  carrierInvoiceOrder: {
    fr: 'Cet ordre n’a pas été confié à ce transporteur.',
    en: 'This order was not entrusted to this carrier.'
  },
  carrierInvoiceCovered: {
    fr: 'Cet ordre figure déjà dans la facture {no}.',
    en: 'This order is already on invoice {no}.'
  },
  carrierInvoiceClosed: {
    fr: 'Cette facture a déjà été contrôlée.',
    en: 'This invoice has already been checked.'
  },
  carrierInvoiceNotDone: {
    fr: 'Seules les expéditions réellement effectuées se paient.',
    en: 'Only expeditions that were actually carried out are paid.'
  },
  carrierInvoiceOutside: {
    fr: 'Le montant facturé s’écarte du montant convenu au-delà de la tolérance.',
    en: 'The invoiced amount differs from the agreed amount beyond the tolerance.'
  },
  carrierInvoiceReason: {
    fr: 'Sans tarif, la validation exige un motif.',
    en: 'Without a tariff, validation requires a reason.'
  }
} satisfies Record<string, LocalizedText>
