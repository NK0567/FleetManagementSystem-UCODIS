import type { UserProfileCode } from '@/types/auth.types'

export interface GuideText {
  fr: string
  en: string
}

/** One step of a role's work: what to do, where, and the screen it opens. */
export interface GuideStep {
  title: GuideText
  detail: GuideText
  to?: string
}

export interface RoleGuide {
  intro: GuideText
  steps: GuideStep[]
}

const step = (to: string | undefined, title: GuideText, detail: GuideText): GuideStep => ({
  to,
  title,
  detail
})

const PERSONAL: GuideStep = step(
  '/hr/leave-requests',
  { fr: 'Demander une absence', en: 'Request a leave' },
  {
    fr: 'Ressources humaines, Demandes d’absence, Nouveau. Le solde se lit dans Soldes de congés.',
    en: 'Human resources, Leave requests, New. The balance is in Leave balances.'
  }
)

/** The work of each account, in the order it is done (from the user stories of each actor). */
export const ROLE_GUIDES: Record<UserProfileCode, RoleGuide> = {
  ADMIN: {
    intro: {
      fr: 'Vous préparez l’application pour les autres : modules, société, comptes et réglages.',
      en: 'You set the application up for the others: modules, company, accounts and settings.'
    },
    steps: [
      step(
        '/settings/module-toggles',
        { fr: 'Choisir les modules', en: 'Choose the modules' },
        {
          fr: 'Icône engrenage en haut, onglet Modules : activez seulement les écrans utiles à l’entreprise.',
          en: 'Gear icon at the top, Modules tab: switch on only the screens the company needs.'
        }
      ),
      step(
        '/settings/company',
        { fr: 'Renseigner la société', en: 'Fill in the company' },
        {
          fr: 'Onglet Société : raison sociale, adresse, NIF/STAT.',
          en: 'Company tab: name, address, tax numbers.'
        }
      ),
      step(
        '/settings/accounts',
        { fr: 'Créer les comptes', en: 'Create the accounts' },
        {
          fr: 'Onglet Comptes et rôles, Nouveau : chaque personne reçoit un rôle, qui décide de ses menus.',
          en: 'Accounts and roles tab, New: each person gets a role, which decides their menus.'
        }
      ),
      step(
        '/planning/settings',
        { fr: 'Régler la planification', en: 'Set the planning up' },
        {
          fr: 'Planification, Réglages : arrivée des commandes, canaux de notification, contrôles stricts ou non.',
          en: 'Planning, Settings: how orders arrive, notification channels, strict controls or not.'
        }
      ),
      step(
        '/fleet/vehicle-types',
        { fr: 'Paramétrer la flotte', en: 'Set the fleet up' },
        {
          fr: 'Flotte, Configuration : types de véhicules et compartiments, règles d’alerte, réglages.',
          en: 'Fleet, Configuration: vehicle types and compartments, alert rules, settings.'
        }
      ),
      step(
        '/maintenance/settings',
        { fr: 'Paramétrer la maintenance', en: 'Set maintenance up' },
        {
          fr: 'Maintenance, Réglages : tarif horaire, coût d’immobilisation, seuils.',
          en: 'Maintenance, Settings: hourly rate, downtime cost, thresholds.'
        }
      ),
      step(
        '/settings/activity-log',
        { fr: 'Suivre le journal', en: 'Follow the log' },
        {
          fr: 'Onglet Journal d’activité : qui a fait quoi, avec export.',
          en: 'Activity log tab: who did what, with export.'
        }
      )
    ]
  },
  SALES: {
    intro: {
      fr: 'Vous transmettez les commandes de vos clients au planificateur et vous les suivez.',
      en: 'You send your customers’ orders to the planner and follow them.'
    },
    steps: [
      step(
        '/planning/delivery-requests',
        { fr: 'Créer une commande', en: 'Create an order' },
        {
          fr: 'Commandes, Nouveau : destinataire, date souhaitée, produits, poids et canal de notification.',
          en: 'Orders, New: recipient, wanted date, products, weight and notification channel.'
        }
      ),
      step(
        '/planning/delivery-requests',
        { fr: 'Suivre ses commandes', en: 'Follow your orders' },
        {
          fr: 'La colonne État dit où en est chaque commande. Tant qu’elle n’est pas planifiée, vous pouvez la corriger ou l’annuler.',
          en: 'The State column tells where each order is. Until it is planned, you can correct or cancel it.'
        }
      ),
      step(
        '/planning/delivery-requests',
        { fr: 'Corriger une commande rejetée', en: 'Correct a rejected order' },
        {
          fr: 'Ouvrez la commande rejetée, lisez le motif, corrigez puis renvoyez-la.',
          en: 'Open the rejected order, read the reason, correct it and send it again.'
        }
      ),
      step(
        '/planning/delivery-requests',
        { fr: 'Donner son avis', en: 'Give your opinion' },
        {
          fr: 'Une fois l’ordre terminé, la fiche de la commande propose l’enquête de satisfaction.',
          en: 'Once the order is completed, the order card offers the satisfaction survey.'
        }
      ),
      PERSONAL
    ]
  },
  PLANNER: {
    intro: {
      fr: 'Vous transformez les commandes en ordres de transport et vous leur donnez des moyens.',
      en: 'You turn orders into transport orders and give them means.'
    },
    steps: [
      step(
        '/planning/delivery-requests',
        { fr: 'Regarder les commandes en attente', en: 'Look at the waiting orders' },
        {
          fr: 'Commandes : rejetez avec un motif celles qui ne sont pas exploitables.',
          en: 'Orders: reject with a reason those that cannot be used.'
        }
      ),
      step(
        '/planning/transport-orders',
        { fr: 'Créer un ordre de transport', en: 'Create a transport order' },
        {
          fr: 'Ordres de transport, Nouveau : itinéraire et départ. Ou laissez la proposition de chargement répartir les commandes.',
          en: 'Transport orders, New: route and departure. Or let the loading proposal share the orders out.'
        }
      ),
      step(
        '/planning/transport-orders',
        { fr: 'Ajouter les commandes', en: 'Add the orders' },
        {
          fr: 'Dans la fiche, Modifier les lignes : cochez les commandes. Glissez les lignes pour l’ordre des livraisons.',
          en: 'In the card, Edit lines: tick the orders. Drag the lines to set the delivery order.'
        }
      ),
      step(
        '/planning/transport-orders',
        { fr: 'Planifier', en: 'Plan' },
        {
          fr: 'Bouton Planifier : transporteur, véhicule et conducteur. La jauge montre la charge.',
          en: 'Plan button: carrier, vehicle and driver. The gauge shows the load.'
        }
      ),
      step(
        '/planning/calendar',
        { fr: 'Vérifier le calendrier', en: 'Check the calendar' },
        {
          fr: 'Un chevauchement de véhicule ou de conducteur apparaît en rouge.',
          en: 'An overlap of vehicle or driver shows in red.'
        }
      ),
      step(
        '/fleet/live-map',
        { fr: 'Suivre les véhicules', en: 'Follow the vehicles' },
        {
          fr: 'Carte en temps réel : cliquez sur un véhicule pour voir où il en est.',
          en: 'Live map: click a vehicle to see where it stands.'
        }
      ),
      step(
        '/planning/transport-orders',
        { fr: 'Traiter les imprévus', en: 'Handle the unexpected' },
        {
          fr: 'Dans la fiche de l’ordre : reliquats à replanifier, litiges des destinataires, puis Terminer.',
          en: 'In the order card: remainders to replan, recipient disputes, then Complete.'
        }
      ),
      PERSONAL
    ]
  },
  CUSTOMER_SERVICE: {
    intro: {
      fr: 'Vous appelez les destinataires avant le départ pour confirmer qu’ils seront là.',
      en: 'You call the recipients before departure to confirm they will be there.'
    },
    steps: [
      step(
        '/planning/confirmations',
        { fr: 'Ouvrir la file à confirmer', en: 'Open the queue to confirm' },
        {
          fr: 'Les lignes sont classées par date de départ : commencez par le haut.',
          en: 'Lines are sorted by departure date: start from the top.'
        }
      ),
      step(
        '/planning/confirmations',
        { fr: 'Prendre une ligne', en: 'Take a line' },
        {
          fr: 'Bouton Prendre : la ligne est à vous et disparaît chez les autres agents.',
          en: 'Take button: the line is yours and leaves the other agents’ queues.'
        }
      ),
      step(
        '/planning/confirmations',
        { fr: 'Noter la réponse', en: 'Record the answer' },
        {
          fr: 'Après l’appel : Confirmer, Indisponible avec un motif, ou Date du destinataire.',
          en: 'After the call: Confirm, Unavailable with a reason, or Recipient date.'
        }
      ),
      step(
        '/planning/confirmations/answered',
        { fr: 'Revoir les réponses', en: 'Review the answers' },
        {
          fr: 'Déjà répondu : chaque réponse, qui l’a donnée et l’état actuel de l’ordre.',
          en: 'Already answered: each answer, who gave it and the order’s current state.'
        }
      ),
      PERSONAL
    ]
  },
  DEPOT: {
    intro: {
      fr: 'Vous confirmez ce qui a été chargé et vous réceptionnez les retours.',
      en: 'You confirm what was loaded and receive the returns.'
    },
    steps: [
      step(
        '/planning/loading',
        { fr: 'Voir les ordres à charger', en: 'See the orders to load' },
        {
          fr: 'Chargement : les ordres du jour avec leur bon d’enlèvement.',
          en: 'Loading: the day’s orders with their pickup note.'
        }
      ),
      step(
        '/planning/loading',
        { fr: 'Confirmer l’enlèvement', en: 'Confirm the pickup' },
        {
          fr: 'Bouton Confirmer l’enlèvement : référence du document du dépôt et quantités chargées.',
          en: 'Confirm pickup button: depot document reference and loaded quantities.'
        }
      ),
      step(
        '/planning/loading',
        { fr: 'Réceptionner les retours', en: 'Receive the returns' },
        {
          fr: 'Retours à réceptionner : contrôlez l’état, conforme ou non conforme avec un motif.',
          en: 'Returns to receive: check the state, conforming or not with a reason.'
        }
      ),
      PERSONAL
    ]
  },
  DELIVERY_MANAGER: {
    intro: {
      fr: 'Vous organisez le chargement, suivez l’exécution et la qualité des livraisons.',
      en: 'You organise loading and follow execution and delivery quality.'
    },
    steps: [
      step(
        '/planning/dashboard',
        { fr: 'Commencer par le tableau de bord', en: 'Start with the dashboard' },
        {
          fr: 'Ordres par statut, retards, alertes et commandes en attente.',
          en: 'Orders by status, delays, alerts and waiting orders.'
        }
      ),
      step(
        '/planning/loading-preparations',
        { fr: 'Préparer un chargement', en: 'Prepare a loading' },
        {
          fr: 'Nouvelle préparation : dépôt, commandes, véhicules. Proposer une répartition, ajustez, puis Valider.',
          en: 'New preparation: depot, orders, vehicles. Propose a split, adjust, then Validate.'
        }
      ),
      step(
        '/planning/loading',
        { fr: 'Envoyer le bon d’enlèvement', en: 'Send the pickup note' },
        {
          fr: 'Chargement : imprimez ou envoyez le bon au dépôt, puis confirmez l’enlèvement.',
          en: 'Loading: print or send the note to the depot, then confirm the pickup.'
        }
      ),
      step(
        '/planning/transport-orders',
        { fr: 'Suivre un ordre', en: 'Follow an order' },
        {
          fr: 'Dans la fiche : écarts de quantité à qualifier, débriefing et dossier complet.',
          en: 'In the card: quantity gaps to qualify, debriefing and full file.'
        }
      ),
      step(
        '/planning/delivery-quality',
        { fr: 'Traiter la qualité', en: 'Handle quality' },
        {
          fr: 'Qualité de livraison : notes de protêt et responsabilités.',
          en: 'Delivery quality: protest notes and responsibilities.'
        }
      ),
      step(
        '/planning/reports',
        { fr: 'Lire les rapports', en: 'Read the reports' },
        {
          fr: 'Ponctualité, coûts, qualité et transporteurs.',
          en: 'Punctuality, costs, quality and carriers.'
        }
      ),
      PERSONAL
    ]
  },
  BILLING: {
    intro: {
      fr: 'Vous facturez le transport et contrôlez les factures des transporteurs.',
      en: 'You invoice transport and check the carriers’ invoices.'
    },
    steps: [
      step(
        '/planning/customer-billing',
        { fr: 'Facturer le transport', en: 'Invoice transport' },
        {
          fr: 'Facturation du transport : les livraisons terminées et leur montant. Marquez-les facturées.',
          en: 'Transport billing: completed deliveries and their amount. Mark them invoiced.'
        }
      ),
      step(
        '/planning/carrier-invoices',
        { fr: 'Contrôler une facture de transporteur', en: 'Check a carrier invoice' },
        {
          fr: 'Factures transporteurs, Nouveau : choisissez les ordres. Le montant est comparé au tarif convenu.',
          en: 'Carrier invoices, New: choose the orders. The amount is compared to the agreed rate.'
        }
      ),
      PERSONAL
    ]
  },
  MANAGEMENT: {
    intro: {
      fr: 'Vous lisez les tableaux de bord et exportez les rapports.',
      en: 'You read the dashboards and export the reports.'
    },
    steps: [
      step(
        '/fleet/dashboard',
        { fr: 'État de la flotte', en: 'Fleet status' },
        { fr: 'Flotte, Tableau de bord.', en: 'Fleet, Dashboard.' }
      ),
      step(
        '/fleet/reports',
        { fr: 'Rapports de la flotte', en: 'Fleet reports' },
        {
          fr: 'Synthèse, audit, carburant, conducteurs, avec export.',
          en: 'Summary, audit, fuel, drivers, with export.'
        }
      ),
      step(
        '/planning/reports',
        { fr: 'Rapports du transport', en: 'Transport reports' },
        { fr: 'Ponctualité, coûts et qualité.', en: 'Punctuality, costs and quality.' }
      ),
      step(
        '/maintenance/reliability',
        { fr: 'Fiabilité et coûts de maintenance', en: 'Maintenance reliability and costs' },
        { fr: 'MTBF, MTTR et coût par kilomètre.', en: 'MTBF, MTTR and cost per kilometre.' }
      ),
      PERSONAL
    ]
  },
  FLEET_MANAGER: {
    intro: {
      fr: 'Vous gardez les véhicules et les conducteurs en état et en règle.',
      en: 'You keep vehicles and drivers in order and compliant.'
    },
    steps: [
      step(
        '/fleet/dashboard',
        { fr: 'Commencer par le tableau de bord', en: 'Start with the dashboard' },
        {
          fr: 'Véhicules prêts, conducteurs disponibles, documents à régulariser.',
          en: 'Ready vehicles, available drivers, documents to regularise.'
        }
      ),
      step(
        '/fleet/alerts',
        { fr: 'Traiter les alertes', en: 'Handle the alerts' },
        {
          fr: 'La cloche en haut, ou Flotte, Alertes : prenez en compte puis traitez.',
          en: 'The bell at the top, or Fleet, Alerts: acknowledge then handle.'
        }
      ),
      step(
        '/fleet/departure-authorizations',
        { fr: 'Autoriser les départs', en: 'Authorise departures' },
        {
          fr: 'Le système vérifie le véhicule et le conducteur ; vous accordez ou refusez.',
          en: 'The system checks vehicle and driver; you grant or refuse.'
        }
      ),
      step(
        '/fleet/live-map',
        { fr: 'Suivre la carte', en: 'Follow the map' },
        {
          fr: 'Cliquez sur un véhicule pour sa fiche, son historique et ses événements.',
          en: 'Click a vehicle for its card, history and events.'
        }
      ),
      step(
        '/fleet/vehicles',
        { fr: 'Tenir les véhicules et conducteurs', en: 'Keep vehicles and drivers' },
        {
          fr: 'Véhicules, Conducteurs, Affectations et Documents : fiches à jour, pièces valides.',
          en: 'Vehicles, Drivers, Assignments and Documents: cards up to date, papers valid.'
        }
      ),
      step(
        '/fleet/fuel-refills',
        { fr: 'Contrôler le carburant', en: 'Check fuel' },
        {
          fr: 'Pleins, consommation et écarts à qualifier.',
          en: 'Refills, consumption and gaps to qualify.'
        }
      ),
      step(
        '/fleet/reports',
        { fr: 'Lire les rapports', en: 'Read the reports' },
        { fr: 'Synthèse, carburant, conducteurs.', en: 'Summary, fuel, drivers.' }
      ),
      PERSONAL
    ]
  },
  MAINTENANCE_MANAGER: {
    intro: {
      fr: 'Vous planifiez l’entretien et l’atelier, et validez les réparations.',
      en: 'You plan maintenance and the workshop, and validate repairs.'
    },
    steps: [
      step(
        '/maintenance/dashboard',
        { fr: 'Commencer par le tableau de bord', en: 'Start with the dashboard' },
        {
          fr: 'Ordres en cours, fins à valider, entretiens à planifier.',
          en: 'Orders in progress, closings to validate, services to plan.'
        }
      ),
      step(
        '/maintenance/service-due',
        { fr: 'Planifier l’entretien', en: 'Plan servicing' },
        {
          fr: 'Échéances d’entretien : créez l’ordre préventif d’une échéance proche ou dépassée.',
          en: 'Service due: create the preventive order of a close or overdue service.'
        }
      ),
      step(
        '/maintenance/work-orders',
        { fr: 'Suivre les ordres de travail', en: 'Follow work orders' },
        {
          fr: 'Affectez un technicien ou un atelier externe, puis validez la clôture déclarée.',
          en: 'Assign a technician or external workshop, then validate the declared closing.'
        }
      ),
      step(
        '/maintenance/workshop-load',
        { fr: 'Regarder la charge de l’atelier', en: 'Look at workshop load' },
        {
          fr: 'Charge par technicien et par compétence.',
          en: 'Load per technician and per skill.'
        }
      ),
      step(
        '/maintenance/mobile-interventions',
        { fr: 'Dépanner sur la route', en: 'Repair on the road' },
        {
          fr: 'Équipe mobile : envoyez une intervention vers un véhicule en panne.',
          en: 'Mobile team: send an intervention to a broken-down vehicle.'
        }
      ),
      step(
        '/maintenance/reliability',
        { fr: 'Suivre la fiabilité', en: 'Follow reliability' },
        { fr: 'MTBF, MTTR, coûts et jours perdus.', en: 'MTBF, MTTR, costs and lost days.' }
      ),
      PERSONAL
    ]
  },
  MAINTENANCE_TECHNICIAN: {
    intro: {
      fr: 'Vous réparez les véhicules et enregistrez ce que vous faites.',
      en: 'You repair vehicles and record what you do.'
    },
    steps: [
      step(
        '/maintenance/work-orders',
        { fr: 'Ouvrir son ordre de travail', en: 'Open your work order' },
        {
          fr: 'Ordres de travail : diagnostiquez avec la nomenclature et ajoutez les pièces.',
          en: 'Work orders: diagnose with the nomenclature and add the parts.'
        }
      ),
      step(
        '/maintenance/work-orders',
        { fr: 'Déclarer la fin', en: 'Declare the end' },
        {
          fr: 'Déclarez l’intervention terminée : le responsable valide la clôture.',
          en: 'Declare the intervention done: the manager validates the closing.'
        }
      ),
      step(
        '/maintenance/vehicle-checks',
        { fr: 'Faire un contrôle véhicule', en: 'Do a vehicle check' },
        {
          fr: 'Contrôles véhicule, Nouveau : chaque point, conforme ou non.',
          en: 'Vehicle checks, New: each point, conforming or not.'
        }
      ),
      step(
        '/maintenance/tyres',
        { fr: 'Gérer les pneus', en: 'Manage tyres' },
        {
          fr: 'Pneumatiques : monter un pneu sur une position, relever pression et usure.',
          en: 'Tyres: mount a tyre on a position, record pressure and wear.'
        }
      ),
      step(
        '/maintenance/stock-items',
        { fr: 'Consulter le stock', en: 'Check stock' },
        { fr: 'Stock de pièces et mouvements.', en: 'Parts stock and movements.' }
      ),
      PERSONAL
    ]
  },
  DRIVER: {
    intro: {
      fr: 'Tout se fait depuis Mon espace, sur votre téléphone.',
      en: 'Everything happens in My space, on your phone.'
    },
    steps: [
      step(
        '/me/checklist',
        { fr: 'Remplir la check-list', en: 'Fill in the checklist' },
        {
          fr: 'Avant de partir, à la pause et à l’arrivée. Elle marche aussi sans réseau.',
          en: 'Before leaving, at the break and on arrival. It also works without network.'
        }
      ),
      step(
        '/me/tour',
        { fr: 'Contrôler le chargement', en: 'Check the load' },
        {
          fr: 'Mon ordre de transport : Conforme pour chaque ligne, ou signalez une non-conformité.',
          en: 'My transport order: Conforming for each line, or report a non-conformity.'
        }
      ),
      step(
        '/me/tour',
        { fr: 'Arriver chez le destinataire', en: 'Arrive at the recipient' },
        {
          fr: 'Bouton Je suis arrivé sur le point. Le premier point démarre l’ordre.',
          en: 'I have arrived button on the point. The first point starts the order.'
        }
      ),
      step(
        '/me/tour',
        { fr: 'Déclarer la livraison', en: 'Declare the delivery' },
        {
          fr: 'Cochez ce qui est livré, donnez un motif pour le reste. Ou Reporter, ou Refus du destinataire.',
          en: 'Tick what is delivered, give a reason for the rest. Or Postpone, or Recipient refusal.'
        }
      ),
      step(
        '/me/tour',
        { fr: 'Rapporter les marchandises', en: 'Bring the goods back' },
        {
          fr: 'À rapporter à l’entrepôt : confirmez quand c’est fait.',
          en: 'To bring back to the warehouse: confirm when done.'
        }
      ),
      step(
        '/me/vehicle',
        { fr: 'Plein ou panne', en: 'Refill or breakdown' },
        {
          fr: 'Mon véhicule : déclarez un plein ou une panne.',
          en: 'My vehicle: declare a refill or a breakdown.'
        }
      ),
      step(
        '/me/absences',
        { fr: 'Demander une absence', en: 'Request a leave' },
        { fr: 'Mes absences, Nouveau.', en: 'My absences, New.' }
      )
    ]
  },
  DRIVER_ASSISTANT: {
    intro: {
      fr: 'Vous accompagnez le conducteur et consultez l’ordre depuis Mon espace.',
      en: 'You go with the driver and read the order in My space.'
    },
    steps: [
      step(
        '/me/tour',
        { fr: 'Consulter l’ordre de transport', en: 'Read the transport order' },
        {
          fr: 'Les arrêts dans l’ordre, avec le destinataire et le contenu.',
          en: 'The stops in order, with the recipient and the content.'
        }
      ),
      step(
        '/me/absences',
        { fr: 'Demander une absence', en: 'Request a leave' },
        { fr: 'Mes absences, Nouveau.', en: 'My absences, New.' }
      )
    ]
  }
}
