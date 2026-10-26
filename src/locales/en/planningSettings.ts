export default {
  'planning.settings.title': 'Planning settings',
  'planning.settings.subtitle':
    'Times, recipient confirmation, goods, requests, quantity control, billing and closing.',
  'planning.settings.lastModified': 'Changed on {date} by {user}',
  'planning.settings.loadError': 'The planning settings could not be loaded.',
  'planning.settings.saveError': 'The settings could not be saved.',

  'planning.settings.section.schedule': 'Times',
  'planning.settings.section.schedule.hint':
    'The time offered for a new order, the speed that times the stops when the route template gives no duration, and the margin before a stop counts as late.',
  'planning.settings.field.schedule.defaultDepartureTime': 'Departure time offered',
  'planning.settings.field.schedule.averageSpeedKmh': 'Average speed',
  'planning.settings.field.schedule.lateMarginMin': 'Margin before late',

  'planning.settings.section.confirmation': 'Recipient confirmation',
  'planning.settings.section.confirmation.hint':
    'With no answer from the recipient after this delay, the delivery is held as confirmed, for billing as for closing. Leave empty to never confirm by default.',
  'planning.settings.field.confirmation.tacitConfirmationDays': 'Tacit confirmation after',

  'planning.settings.section.goods': 'Goods',
  'planning.settings.section.goods.hint':
    'The unit parcels are counted in, and whether delivered quantities start from the loaded ones.',
  'planning.settings.field.goods.countingUnit': 'Counting unit',
  'planning.settings.field.goods.prefillQuantities': 'Prefill delivered quantities',

  'planning.settings.section.requests': 'Requests and orders',
  'planning.settings.section.requests.hint':
    'The reference the customer gives to its order, and what happens when a request or an order passes its date without being carried out.',
  'planning.settings.field.requests.externalReferenceLabel': 'Customer reference label',
  'planning.settings.field.requests.externalReferenceRequired': 'Customer reference required',
  'planning.settings.field.requests.expiredDateMode': 'Date passed',

  'planning.settings.section.quantities': 'Quantity control',
  'planning.settings.section.quantities.hint':
    'What happens when the received quantity falls outside the tolerance. The tolerances themselves are set per customer and per product.',
  'planning.settings.field.quantities.overToleranceMode': 'Outside tolerance',

  'planning.settings.section.billing': 'Billing',
  'planning.settings.section.billing.hint':
    'Who pays the freight when the request does not say, and the gap accepted between a carrier invoice and the agreed amount.',
  'planning.settings.field.billing.defaultFreightPayer': 'Freight paid by',
  'planning.settings.field.billing.carrierInvoiceToleranceAmount':
    'Gap accepted on a carrier invoice',

  'planning.settings.section.closing': 'Closing',
  'planning.settings.section.closing.hint':
    'Documents to file before an order can be closed, separated by commas. A dash requires none.',
  'planning.settings.field.closing.requiredDocuments': 'Mandatory documents',

  'planning.settings.unit.kmh': 'km/h',
  'planning.settings.unit.min': 'min',
  'planning.settings.unit.days': 'days',
  'planning.settings.unit.amount': 'Ar',

  'planning.settings.issue.required': 'This setting is required.',
  'planning.settings.issue.outOfRange': 'Enter a value between {min} and {max} {unit}.',
  'planning.settings.issue.invalidTime': 'Enter a time as HH:MM.',
  'planning.settings.issue.tooLong': 'This setting is limited to {max} characters.',
  'planning.settings.issue.invalidChoice': 'Pick one of the offered values.'
}
