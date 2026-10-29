export default {
  'planning.settings.title': 'Réglages de la planification',
  'planning.settings.subtitle':
    'Horaires, confirmation des destinataires, marchandises, commandes, contrôle des quantités, facturation et clôture.',
  'planning.settings.lastModified': 'Modifié le {date} par {user}',
  'planning.settings.loadError': "Les réglages de la planification n'ont pas pu être chargés.",
  'planning.settings.saveError': "Les réglages n'ont pas pu être enregistrés.",

  'planning.settings.section.schedule': 'Horaires',
  'planning.settings.section.schedule.hint':
    "L'heure proposée pour un nouvel ordre, la vitesse qui chronomètre les arrêts quand la route type ne donne pas de durée, et la marge avant de compter un retard.",
  'planning.settings.field.schedule.defaultDepartureTime': 'Heure de départ proposée',
  'planning.settings.field.schedule.averageSpeedKmh': 'Vitesse moyenne',
  'planning.settings.field.schedule.lateMarginMin': 'Marge avant retard',

  'planning.settings.section.confirmation': 'Confirmation des destinataires',
  'planning.settings.section.confirmation.hint':
    "Sans réponse du destinataire après ce délai, la livraison est tenue pour confirmée, pour la facturation comme pour la clôture. Laissez vide pour ne jamais confirmer d'office.",
  'planning.settings.field.confirmation.tacitConfirmationDays': 'Confirmation tacite après',

  'planning.settings.section.goods': 'Marchandises',
  'planning.settings.section.goods.hint':
    "L'unité dans laquelle on compte les colis, et si les quantités livrées partent des quantités chargées.",
  'planning.settings.field.goods.countingUnit': 'Unité de comptage',
  'planning.settings.field.goods.prefillQuantities': 'Préremplir les quantités livrées',

  'planning.settings.section.requests': 'Commandes et ordres',
  'planning.settings.section.requests.hint':
    "La référence que l'ordonnateur donne à sa commande, et ce qui se passe quand une commande ou un ordre dépasse sa date sans être exécuté.",
  'planning.settings.field.requests.externalReferenceLabel':
    "Libellé de la référence de l'ordonnateur",
  'planning.settings.field.requests.externalReferenceRequired':
    "Référence de l'ordonnateur obligatoire",
  'planning.settings.field.requests.expiredDateMode': 'Date dépassée',

  'planning.settings.section.quantities': 'Contrôle des quantités',
  'planning.settings.section.quantities.hint':
    'Ce qui se passe quand la quantité reçue sort de la tolérance. Les tolérances elles-mêmes se règlent par destinataire et par produit.',
  'planning.settings.field.quantities.overToleranceMode': 'Hors tolérance',
  'planning.settings.field.quantities.volume15Method': 'Volume à 15 °C',

  'planning.settings.section.billing': 'Facturation',
  'planning.settings.section.billing.hint':
    "Qui paie le fret quand la commande ne le dit pas, et l'écart accepté entre la facture d'un transporteur et le montant convenu.",
  'planning.settings.field.billing.defaultFreightPayer': 'Fret à la charge de',
  'planning.settings.field.billing.carrierInvoiceToleranceAmount':
    'Écart toléré sur une facture transporteur',

  'planning.settings.section.closing': 'Clôture',
  'planning.settings.section.closing.hint':
    'Documents à déposer avant de clôturer un ordre, séparés par des virgules. Un tiret n’en exige aucun.',
  'planning.settings.field.closing.requiredDocuments': 'Documents obligatoires',

  'planning.settings.unit.kmh': 'km/h',
  'planning.settings.unit.min': 'min',
  'planning.settings.unit.days': 'jours',
  'planning.settings.unit.amount': 'Ar',

  'planning.settings.issue.required': 'Ce réglage est obligatoire.',
  'planning.settings.issue.outOfRange': 'Indiquez une valeur entre {min} et {max} {unit}.',
  'planning.settings.issue.invalidTime': 'Indiquez une heure au format HH:MM.',
  'planning.settings.issue.tooLong': 'Ce réglage est limité à {max} caractères.',
  'planning.settings.issue.invalidChoice': 'Choisissez une des valeurs proposées.',
  'planning.settings.section.controls': 'Rigueur des contrôles',
  'planning.settings.section.controls.hint':
    'Par défaut, un dépassement de capacité ou un chevauchement de planning est signalé et le planificateur décide. Un contrôle strict bloque la planification.',
  'planning.settings.field.controls.strictCapacity': 'Contrôle de capacité strict',
  'planning.settings.field.controls.strictCalendar': 'Calendrier strict',
  'planning.settings.section.intake': 'Circuit des commandes',
  'planning.settings.section.intake.hint': "Comment les commandes arrivent. Saisie à la main et import : par le planificateur ; connecteur : depuis le système de gestion ; API : envoyées par les ordonnateurs externes ; transmission par un service : par les comptes ordonnateurs (équipe commerciale). Aucun mode n'est imposé.",
  'planning.settings.field.intake.manualEntry': 'Saisie à la main par le planificateur',
  'planning.settings.field.intake.fileImport': 'Import de fichier',
  'planning.settings.field.intake.erpConnector': 'Connecteur du système de gestion',
  'planning.settings.field.intake.ordererApi': 'API pour les ordonnateurs externes',
  'planning.settings.field.intake.serviceTransmission': 'Transmission par un service (ordonnateurs internes)',
  'planning.settings.field.intake.plannerDirectEntry': "Saisie d'une commande dans la fiche de l'ordre",
  'planning.settings.section.channels': 'Canaux de notification',
  'planning.settings.section.channels.hint': 'Les canaux proposés aux destinataires dans leurs préférences. « Aucune notification » reste toujours possible.',
  'planning.settings.field.channels.sms': 'SMS',
  'planning.settings.field.channels.call': 'Appel',
  'planning.settings.field.channels.email': 'E-mail',
  'planning.settings.field.channels.whatsapp': 'WhatsApp',
  'planning.settings.field.confirmation.callMoment': 'Moment des appels',
  'planning.settings.incidents.title': "Types d'incident, types de motif et codes motif",
  'planning.settings.incidents.hint': 'Les listes utilisées pour annuler ou dévier un bon. Chaque code motif se rattache à un type de motif.',
  'planning.settings.incidents.incidentTypes': "Types d'incident",
  'planning.settings.incidents.reasonTypes': 'Types de motif',
  'planning.settings.incidents.reasonCodes': 'Codes motif',
  'planning.settings.incidents.code': 'Code',
  'planning.settings.incidents.name': 'Libellé',
  'planning.settings.incidents.reasonType': 'Type de motif',
  'planning.settings.incidents.active': 'Actif',
  'planning.settings.incidents.add': 'Ajouter',
  'planning.settings.incidents.remove': 'Retirer',
  'planning.settings.incidents.empty': 'Aucun élément.',
  'planning.settings.incidents.issue.nameRequired': 'Chaque élément doit avoir un libellé.',
  'planning.settings.incidents.issue.codeRequired': 'Chaque élément doit avoir un code.',
  'planning.settings.incidents.issue.codeTaken': 'Un code est repris deux fois dans la même liste.',
  'planning.settings.incidents.issue.unknownReasonType': 'Chaque code motif doit être rattaché à un type de motif de la liste.',
  'planning.settings.perimeters.title': 'Périmètre des utilisateurs',
  'planning.settings.perimeters.hint': 'Chaque utilisateur ne voit que les ordres de transport et les commandes de ses dépôts et de ses régions. Sans rattachement, il voit tout.',
  'planning.settings.perimeters.user': 'Utilisateur',
  'planning.settings.perimeters.depots': 'Dépôts',
  'planning.settings.perimeters.regions': 'Régions',
  'planning.settings.perimeters.all': 'Tout',
  'planning.settings.perimeters.editTitle': 'Périmètre de {name}',
  'planning.settings.perimeters.owner': 'Appartient à {owner}',
  'planning.settings.perimeters.noneHint': "Sans dépôt ni région cochés, l'utilisateur voit tout."
}
