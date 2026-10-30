export default {
  'planning.settings.title': 'Planning settings',
  'planning.settings.subtitle': 'Planning and transport rules.',
  'planning.settings.lastModified': 'Changed on {date} by {user}',
  'planning.settings.loadError': 'The planning settings could not be loaded.',
  'planning.settings.saveError': 'The settings could not be saved.',

  'planning.settings.section.schedule': 'Times',
  'planning.settings.section.schedule.hint': 'Proposed time, stop speed and margin before a delay.',
  'planning.settings.field.schedule.defaultDepartureTime': 'Departure time offered',
  'planning.settings.field.schedule.averageSpeedKmh': 'Average speed',
  'planning.settings.field.schedule.lateMarginMin': 'Margin before late',

  'planning.settings.section.confirmation': 'Recipient confirmation',
  'planning.settings.section.confirmation.hint':
    'Delay after which an unanswered delivery counts as confirmed. Empty: never.',
  'planning.settings.field.confirmation.tacitConfirmationDays': 'Tacit confirmation after',

  'planning.settings.section.goods': 'Goods',
  'planning.settings.section.goods.hint':
    'Unit of parcels and starting point of the delivered quantities.',
  'planning.settings.field.goods.countingUnit': 'Counting unit',
  'planning.settings.field.goods.prefillQuantities': 'Prefill delivered quantities',

  'planning.settings.section.requests': 'Requests and orders',
  'planning.settings.section.requests.hint':
    'Orderer reference and what happens to expired orders.',
  'planning.settings.field.requests.externalReferenceLabel': "Orderer's reference label",
  'planning.settings.field.requests.externalReferenceRequired': "Orderer's reference required",
  'planning.settings.field.requests.expiredDateMode': 'Date passed',

  'planning.settings.section.quantities': 'Quantity control',
  'planning.settings.section.quantities.hint':
    'What to do when the received quantity is out of tolerance.',
  'planning.settings.field.quantities.overToleranceMode': 'Outside tolerance',
  'planning.settings.field.quantities.volume15Method': 'Volume at 15 °C',

  'planning.settings.section.billing': 'Billing',
  'planning.settings.section.billing.hint':
    'Default freight payer and accepted gap on carrier invoices.',
  'planning.settings.field.billing.defaultFreightPayer': 'Freight paid by',
  'planning.settings.field.billing.carrierInvoiceToleranceAmount':
    'Gap accepted on a carrier invoice',

  'planning.settings.section.closing': 'Closing',
  'planning.settings.section.closing.hint':
    'Documents required before completing an order, separated by commas; « - » for none.',
  'planning.settings.field.closing.requiredDocuments': 'Mandatory documents',

  'planning.settings.unit.kmh': 'km/h',
  'planning.settings.unit.min': 'min',
  'planning.settings.unit.days': 'days',
  'planning.settings.unit.amount': 'Ar',

  'planning.settings.issue.required': 'This setting is required.',
  'planning.settings.issue.outOfRange': 'Enter a value between {min} and {max} {unit}.',
  'planning.settings.issue.invalidTime': 'Enter a time as HH:MM.',
  'planning.settings.issue.tooLong': 'This setting is limited to {max} characters.',
  'planning.settings.issue.invalidChoice': 'Pick one of the offered values.',
  'planning.settings.section.controls': 'Strictness of the checks',
  'planning.settings.section.controls.hint':
    'Capacity and overlap: flagged by default, blocking in strict mode.',
  'planning.settings.field.controls.strictCapacity': 'Strict capacity check',
  'planning.settings.field.controls.strictCalendar': 'Strict calendar',
  'planning.settings.section.intake': 'Order circuit',
  'planning.settings.section.intake.hint': 'The ways orders come in. None is mandatory.',
  'planning.settings.field.intake.manualEntry': 'Manual entry by the planner',
  'planning.settings.field.intake.fileImport': 'File import',
  'planning.settings.field.intake.erpConnector': 'Management system connector',
  'planning.settings.field.intake.ordererApi': 'API for external orderers',
  'planning.settings.field.intake.serviceTransmission':
    'Transmission by a service (internal orderers)',
  'planning.settings.field.intake.plannerDirectEntry': 'Order keyed in the transport order card',
  'planning.settings.section.channels': 'Notification channels',
  'planning.settings.section.channels.hint':
    'The channels offered to the recipients in their preferences. « No notification » always stays possible.',
  'planning.settings.field.channels.sms': 'SMS',
  'planning.settings.field.channels.call': 'Call',
  'planning.settings.field.channels.email': 'E-mail',
  'planning.settings.field.channels.whatsapp': 'WhatsApp',
  'planning.settings.field.confirmation.callMoment': 'Time of the calls',
  'planning.settings.incidents.title': 'Incident types, reason types and reason codes',
  'planning.settings.incidents.hint':
    'The lists used to cancel or deviate a note. Each reason code belongs to a reason type.',
  'planning.settings.incidents.incidentTypes': 'Incident types',
  'planning.settings.incidents.reasonTypes': 'Reason types',
  'planning.settings.incidents.reasonCodes': 'Reason codes',
  'planning.settings.incidents.code': 'Code',
  'planning.settings.incidents.name': 'Label',
  'planning.settings.incidents.reasonType': 'Reason type',
  'planning.settings.incidents.active': 'Active',
  'planning.settings.incidents.add': 'Add',
  'planning.settings.incidents.remove': 'Remove',
  'planning.settings.incidents.empty': 'No item.',
  'planning.settings.incidents.issue.nameRequired': 'Every item needs a label.',
  'planning.settings.incidents.issue.codeRequired': 'Every item needs a code.',
  'planning.settings.incidents.issue.codeTaken': 'A code appears twice in the same list.',
  'planning.settings.incidents.issue.unknownReasonType':
    'Every reason code must belong to a reason type of the list.',
  'planning.settings.perimeters.title': "Users' scope",
  'planning.settings.perimeters.hint':
    'Each user sees only the transport orders and the orders of his depots and regions. Tied to nothing, he sees everything.',
  'planning.settings.perimeters.user': 'User',
  'planning.settings.perimeters.depots': 'Depots',
  'planning.settings.perimeters.regions': 'Regions',
  'planning.settings.perimeters.all': 'Everything',
  'planning.settings.perimeters.editTitle': 'Scope of {name}',
  'planning.settings.perimeters.owner': 'Owned by {owner}',
  'planning.settings.perimeters.noneHint':
    'With no depot nor region ticked, the user sees everything.'
}
