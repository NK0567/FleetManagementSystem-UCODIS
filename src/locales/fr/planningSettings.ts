export default {
  'planning.settings.title': 'Réglages de la planification',
  'planning.settings.subtitle': 'Règles de la planification et du transport.',
  'planning.settings.lastModified': 'Modifié le {date} par {user}',
  'planning.settings.loadError': "Les réglages de la planification n'ont pas pu être chargés.",
  'planning.settings.saveError': "Les réglages n'ont pas pu être enregistrés.",

  'planning.settings.section.schedule': 'Horaires',
  'planning.settings.section.schedule.hint':
    'Heure proposée, vitesse des arrêts et marge avant retard.',
  'planning.settings.field.schedule.defaultDepartureTime': 'Heure de départ proposée',
  'planning.settings.field.schedule.averageSpeedKmh': 'Vitesse moyenne',
  'planning.settings.field.schedule.lateMarginMin': 'Marge avant retard',

  'planning.settings.section.confirmation': 'Confirmation des destinataires',
  'planning.settings.section.confirmation.hint':
    'Délai après lequel une livraison sans réponse est tenue pour confirmée. Vide : jamais.',
  'planning.settings.field.confirmation.tacitConfirmationDays': 'Confirmation tacite après',

  'planning.settings.section.goods': 'Marchandises',
  'planning.settings.section.goods.hint':
    'Unité des colis et point de départ des quantités livrées.',
  'planning.settings.field.goods.countingUnit': 'Unité de comptage',
  'planning.settings.field.goods.prefillQuantities': 'Préremplir les quantités livrées',

  'planning.settings.section.requests': 'Commandes et ordres',
  'planning.settings.section.requests.hint':
    "Référence de l'ordonnateur et sort des commandes ou ordres expirés.",
  'planning.settings.field.requests.externalReferenceLabel':
    "Libellé de la référence de l'ordonnateur",
  'planning.settings.field.requests.externalReferenceRequired':
    "Référence de l'ordonnateur obligatoire",
  'planning.settings.field.requests.expiredDateMode': 'Date dépassée',

  'planning.settings.section.quantities': 'Contrôle des quantités',
  'planning.settings.section.quantities.hint':
    'Que faire quand la quantité reçue sort de la tolérance.',
  'planning.settings.field.quantities.overToleranceMode': 'Hors tolérance',
  'planning.settings.field.quantities.volume15Method': 'Volume à 15 °C',

  'planning.settings.section.billing': 'Facturation',
  'planning.settings.section.billing.hint':
    'Payeur du fret par défaut et écart accepté sur les factures transporteurs.',
  'planning.settings.field.billing.defaultFreightPayer': 'Fret à la charge de',
  'planning.settings.field.billing.carrierInvoiceToleranceAmount':
    'Écart toléré sur une facture transporteur',

  'planning.settings.section.closing': 'Clôture',
  'planning.settings.section.closing.hint':
    'Documents exigés avant de terminer un ordre, séparés par des virgules ; « - » pour aucun.',
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
    'Capacité et chevauchement : signalés par défaut, bloquants en contrôle strict.',
  'planning.settings.field.controls.strictCapacity': 'Contrôle de capacité strict',
  'planning.settings.field.controls.strictCalendar': 'Calendrier strict',
  'planning.settings.section.intake': 'Circuit des commandes',
  'planning.settings.section.intake.hint':
    "Les façons dont les commandes arrivent. Aucune n'est imposée.",
  'planning.settings.field.intake.manualEntry': 'Saisie à la main par le planificateur',
  'planning.settings.field.intake.fileImport': 'Import de fichier',
  'planning.settings.field.intake.erpConnector': 'Connecteur du système de gestion',
  'planning.settings.field.intake.ordererApi': 'API pour les ordonnateurs externes',
  'planning.settings.field.intake.serviceTransmission':
    'Transmission par un service (ordonnateurs internes)',
  'planning.settings.field.intake.plannerDirectEntry':
    "Saisie d'une commande dans la fiche de l'ordre",
  'planning.settings.section.channels': 'Canaux de notification',
  'planning.settings.section.channels.hint':
    'Les canaux proposés aux destinataires dans leurs préférences. « Aucune notification » reste toujours possible.',
  'planning.settings.field.channels.sms': 'SMS',
  'planning.settings.field.channels.call': 'Appel',
  'planning.settings.field.channels.email': 'E-mail',
  'planning.settings.field.channels.whatsapp': 'WhatsApp',
  'planning.settings.field.confirmation.callMoment': 'Moment des appels',
  'planning.settings.incidents.title': "Types d'incident, types de motif et codes motif",
  'planning.settings.incidents.hint':
    'Les listes utilisées pour annuler ou dévier un bon. Chaque code motif se rattache à un type de motif.',
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
  'planning.settings.incidents.issue.unknownReasonType':
    'Chaque code motif doit être rattaché à un type de motif de la liste.',
  'planning.settings.perimeters.title': 'Périmètre des utilisateurs',
  'planning.settings.perimeters.hint':
    'Chaque utilisateur ne voit que les ordres de transport et les commandes de ses dépôts et de ses régions. Sans rattachement, il voit tout.',
  'planning.settings.perimeters.user': 'Utilisateur',
  'planning.settings.perimeters.depots': 'Dépôts',
  'planning.settings.perimeters.regions': 'Régions',
  'planning.settings.perimeters.all': 'Tout',
  'planning.settings.perimeters.editTitle': 'Périmètre de {name}',
  'planning.settings.perimeters.owner': 'Appartient à {owner}',
  'planning.settings.perimeters.noneHint': "Sans dépôt ni région cochés, l'utilisateur voit tout."
}
