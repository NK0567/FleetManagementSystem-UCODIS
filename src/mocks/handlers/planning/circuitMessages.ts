import type { LocalizedText } from '../../i18n'

/** Messages of the order circuit, the replanning and the loading proposal. */
export const CIRCUIT_MESSAGES = {
  equipmentRequired: {
    fr: 'La commande {no} exige un véhicule équipé de : {equipment}.',
    en: 'Order {no} requires a vehicle fitted with: {equipment}.'
  },
  incident_nameRequired: {
    fr: 'Chaque élément des listes doit avoir un libellé.',
    en: 'Every item of the lists needs a label.'
  },
  incident_codeRequired: {
    fr: 'Chaque élément des listes doit avoir un code.',
    en: 'Every item of the lists needs a code.'
  },
  incident_codeTaken: {
    fr: 'Un code est repris deux fois dans la même liste.',
    en: 'A code appears twice in the same list.'
  },
  incident_unknownReasonType: {
    fr: 'Chaque code motif doit être rattaché à un type de motif de la liste.',
    en: 'Every reason code must belong to a reason type of the list.'
  },
  intakeClosed: {
    fr: 'L’entreprise n’a pas ouvert ce mode de réception des commandes : {mode}.',
    en: 'The company has not opened this way of receiving orders: {mode}.'
  },
  plannerEntryClosed: {
    fr: 'L’entreprise n’autorise pas le planificateur à saisir lui-même une commande.',
    en: 'The company does not allow the planner to key an order himself.'
  },
  channelNotOffered: {
    fr: 'Le canal de notification choisi n’est pas proposé par l’entreprise.',
    en: 'The notification channel chosen is not offered by the company.'
  },
  requestWeightRequired: {
    fr: 'Le poids de chaque ligne de produit est obligatoire : il conditionne le choix du véhicule.',
    en: 'The weight of each product line is required: it decides the choice of the vehicle.'
  },
  requestTransferPoint: {
    fr: 'Un transfert part d’un dépôt et va vers un site de l’entreprise.',
    en: 'A transfer leaves a depot and goes to a site of the company.'
  },
  requestReturnPoint: {
    fr: 'Un retour part du site du destinataire et revient vers un dépôt de l’entreprise.',
    en: 'A return leaves the recipient’s site and comes back to a depot of the company.'
  },
  requestSaleDestination: {
    fr: 'Une vente se livre sur un site de destinataire.',
    en: 'A sale is delivered to a recipient’s site.'
  },
  requestPickupInvalid: {
    fr: 'Le lieu d’enlèvement doit être un dépôt actif, ou le site du destinataire pour un retour.',
    en: 'The pickup place must be an active depot, or the recipient’s site for a return.'
  },
  apiOrdererUnknown: {
    fr: 'Clé d’API inconnue : l’ordonnateur n’est pas reconnu.',
    en: 'Unknown API key: the orderer is not recognised.'
  },
  manualLineNeedsOrderer: {
    fr: 'Indiquez l’ordonnateur de la commande saisie dans l’ordre.',
    en: 'Give the orderer of the order keyed in the transport order.'
  },
  partialQuantity: {
    fr: 'La quantité retenue pour la ligne {line} de la commande {no} doit être positive et ne pas dépasser la quantité commandée.',
    en: 'The quantity taken for line {line} of order {no} must be positive and not exceed the quantity ordered.'
  },
  fullDeliveryReduced: {
    fr: 'La commande {no} exige une livraison complète : une quantité réduite ne la livre pas en entier.',
    en: 'Order {no} requires a full delivery: a reduced quantity does not deliver it whole.'
  },
  overVolume: {
    fr: 'Le volume de l’ordre ({volume} m³) dépasse le volume utile du véhicule ({max} m³).',
    en: 'The volume of the order ({volume} m³) exceeds the vehicle’s useful volume ({max} m³).'
  },
  overloadRemedy: {
    fr: 'Retirez des lignes de l’ordre ou choisissez un autre véhicule.',
    en: 'Remove lines from the order or choose another vehicle.'
  },
  requestExpiredAlert: {
    fr: 'La commande {no} a dépassé sa date de validité : elle est expirée.',
    en: 'Order {no} is past its validity date: it has expired.'
  },
  expiredBlocked: {
    fr: 'L’ordre {no} a dépassé sa date sans être exécuté : reprogrammez-le ou annulez-le avant de le charger.',
    en: 'Order {no} is past its date without being carried out: reschedule or cancel it before loading it.'
  },
  replanNotOpen: {
    fr: 'Cette ligne n’est pas à replanifier.',
    en: 'This line is not to replan.'
  },
  replanDateMissing: {
    fr: 'Aucune date n’est encore proposée pour cette ligne.',
    en: 'No date is proposed yet for this line.'
  },
  replanDateInPast: {
    fr: 'La date de replanification ne peut pas être passée.',
    en: 'The replanning date cannot be in the past.'
  },
  replanAwaitsRecipient: {
    fr: 'La date proposée attend l’accord du destinataire.',
    en: 'The date proposed awaits the recipient’s agreement.'
  },
  modeMeans: {
    fr: 'Ce mode de transport n’a pas de moyen disponible : seul le camion est proposé.',
    en: 'This transport mode has no means available: only the truck is offered.'
  },
  routeChangeReason: {
    fr: 'Une modification d’itinéraire en cours de trajet exige un motif.',
    en: 'A change of route during the trip requires a reason.'
  },
  routeChangeSame: {
    fr: 'Choisissez un autre itinéraire type que celui suivi.',
    en: 'Choose another route template than the one followed.'
  },
  routeChangeClosed: {
    fr: 'L’itinéraire ne se modifie en cours de trajet que pour un ordre en cours.',
    en: 'The route changes during the trip only for an order in progress.'
  },
  proposalNoVehicle: {
    fr: 'Aucun véhicule disponible ne peut transporter ces commandes.',
    en: 'No available vehicle can carry these orders.'
  },
  proposalNoRoom: {
    fr: 'Aucun véhicule libre ce jour ne peut la prendre sans enfreindre une règle ou sa capacité.',
    en: 'No vehicle free that day can take it without breaking a rule or its capacity.'
  },
  proposalByHand: {
    fr: 'À affecter à la main.',
    en: 'To assign by hand.'
  },
  proposalComment: {
    fr: 'Créé par la proposition de chargement',
    en: 'Created by the loading proposal'
  },
  proposalEmpty: {
    fr: 'La proposition n’affecte aucune commande à un véhicule.',
    en: 'The proposal assigns no order to a vehicle.'
  },
  proposalRequestTaken: {
    fr: 'La commande {no} n’est plus en attente.',
    en: 'Order {no} is no longer pending.'
  },
  perimeterUnknownUser: {
    fr: 'Utilisateur inconnu.',
    en: 'Unknown user.'
  },
  perimeterUnknownDepot: {
    fr: 'Le dépôt {no} n’existe pas dans le référentiel des sites.',
    en: 'Depot {no} does not exist in the site register.'
  },
  perimeterUnknownRegion: {
    fr: 'La région {region} n’existe pas dans le référentiel des sites.',
    en: 'Region {region} does not exist in the site register.'
  },
  pointSiteRequired: {
    fr: 'Un dépôt de chargement se rattache à un site du référentiel.',
    en: 'A loading depot is attached to a site of the register.'
  },
  measureFuelOnly: {
    fr: 'La température et le volume à 15 °C ne se mesurent que pour un carburant.',
    en: 'Temperature and volume at 15 °C are measured for a fuel only.'
  },
  measureQuantityRequired: {
    fr: 'La quantité fait toujours partie des mesures à saisir.',
    en: 'The quantity is always one of the measures to take.'
  }
} satisfies Record<string, LocalizedText>
