export default {
  'fleet.settings.title': 'Fleet settings',
  'fleet.settings.subtitle':
    'Thresholds and notices used by the fleet checks. Each section is saved on its own.',
  'fleet.settings.lastModified': 'Changed on {date} by {user}',
  'fleet.settings.loadError': 'The fleet settings could not be loaded.',
  'fleet.settings.saveError': 'The settings could not be saved.',

  'fleet.settings.section.drivingTime': 'Driving and rest time',
  'fleet.settings.section.drivingTime.hint':
    'Legal limits checked before a departure and during trips.',
  'fleet.settings.section.geofencing': 'Sites and geofences',
  'fleet.settings.section.geofencing.hint':
    'Radius of a site when neither the site nor its type sets one.',
  'fleet.settings.section.documents': 'Documents',
  'fleet.settings.section.documents.hint': 'Notice of a document type that sets none.',

  'fleet.settings.field.drivingTime.continuousDrivingMaxMin': 'Maximum continuous driving',
  'fleet.settings.field.drivingTime.breakAfterDrivingMin': 'Break after continuous driving',
  'fleet.settings.field.drivingTime.dailyDrivingMaxMin': 'Maximum daily driving',
  'fleet.settings.field.drivingTime.dailyWorkMaxMin': 'Maximum daily work',
  'fleet.settings.field.drivingTime.restBeforeDepartureMinH': 'Minimum rest before a departure',
  'fleet.settings.field.drivingTime.weeklyRestMinH': 'Minimum weekly rest',
  'fleet.settings.field.drivingTime.weeklyDrivingMaxH': 'Maximum weekly driving',
  'fleet.settings.field.drivingTime.fortnightDrivingMaxH':
    'Maximum driving over two weeks (optional)',
  'fleet.settings.field.drivingTime.nightBanStart': 'No night driving from',
  'fleet.settings.field.drivingTime.nightBanEnd': 'No night driving until',
  'fleet.settings.field.geofencing.defaultSiteRadiusM': 'Default site radius',
  'fleet.settings.field.documents.defaultNoticeDays': 'Default notice',

  'fleet.settings.unit.min': 'min',
  'fleet.settings.unit.h': 'h',
  'fleet.settings.unit.m': 'm',
  'fleet.settings.unit.days': 'days',

  'fleet.settings.issue.required': 'This setting is required.',
  'fleet.settings.issue.outOfRange': 'Enter a value between {min} and {max} {unit}.',
  'fleet.settings.issue.invalidTime': 'Enter a time as HH:MM.',
  'fleet.settings.issue.nightWindowIncomplete':
    'Give both the start and the end, or leave both empty.',
  'fleet.settings.issue.nightWindowEmpty': 'The end must differ from the start.'
}
