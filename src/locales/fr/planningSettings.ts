export default {
  'planning.settings.title': 'Réglages de la planification',
  'planning.settings.subtitle':
    'Horaires, confirmation des destinataires, marchandises, demandes, contrôle des quantités et facturation.',
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

  'planning.settings.section.requests': 'Demandes et ordres',
  'planning.settings.section.requests.hint':
    'La référence que le client donne à sa commande, et ce qui se passe quand une demande ou un ordre dépasse sa date sans être exécuté.',
  'planning.settings.field.requests.externalReferenceLabel': 'Libellé de la référence client',
  'planning.settings.field.requests.externalReferenceRequired': 'Référence client obligatoire',
  'planning.settings.field.requests.expiredDateMode': 'Date dépassée',

  'planning.settings.section.quantities': 'Contrôle des quantités',
  'planning.settings.section.quantities.hint':
    'Ce qui se passe quand la quantité reçue sort de la tolérance. Les tolérances elles-mêmes se règlent par client et par produit.',
  'planning.settings.field.quantities.overToleranceMode': 'Hors tolérance',

  'planning.settings.section.billing': 'Facturation',
  'planning.settings.section.billing.hint':
    "Qui paie le fret quand la demande ne le dit pas, et l'écart accepté entre la facture d'un transporteur et le montant convenu.",
  'planning.settings.field.billing.defaultFreightPayer': 'Fret à la charge de',
  'planning.settings.field.billing.carrierInvoiceToleranceAmount':
    'Écart toléré sur une facture transporteur',

  'planning.settings.unit.kmh': 'km/h',
  'planning.settings.unit.min': 'min',
  'planning.settings.unit.days': 'jours',
  'planning.settings.unit.amount': 'Ar',

  'planning.settings.issue.required': 'Ce réglage est obligatoire.',
  'planning.settings.issue.outOfRange': 'Indiquez une valeur entre {min} et {max} {unit}.',
  'planning.settings.issue.invalidTime': 'Indiquez une heure au format HH:MM.',
  'planning.settings.issue.tooLong': 'Ce réglage est limité à {max} caractères.',
  'planning.settings.issue.invalidChoice': 'Choisissez une des valeurs proposées.'
}
