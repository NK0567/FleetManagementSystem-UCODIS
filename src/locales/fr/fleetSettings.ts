export default {
  'fleet.settings.title': 'Réglages de la flotte',
  'fleet.settings.subtitle':
    "Seuils et préavis utilisés par les contrôles de la flotte. Chaque section s'enregistre séparément.",
  'fleet.settings.lastModified': 'Modifié le {date} par {user}',
  'fleet.settings.loadError': "Les réglages de la flotte n'ont pas pu être chargés.",
  'fleet.settings.saveError': "Les réglages n'ont pas pu être enregistrés.",

  'fleet.settings.section.drivingTime': 'Temps de conduite et de repos',
  'fleet.settings.section.drivingTime.hint':
    'Limites réglementaires contrôlées avant un départ et pendant les trajets.',
  'fleet.settings.section.geofencing': 'Sites et géorepères',
  'fleet.settings.section.geofencing.hint':
    "Rayon appliqué à un site lorsque ni le site ni son type n'en fixent un.",
  'fleet.settings.section.documents': 'Documents',
  'fleet.settings.section.documents.hint':
    "Préavis appliqué à un type de document qui n'en fixe pas.",

  'fleet.settings.field.drivingTime.continuousDrivingMaxMin': 'Conduite continue maximale',
  'fleet.settings.field.drivingTime.breakAfterDrivingMin': 'Pause après conduite continue',
  'fleet.settings.field.drivingTime.dailyDrivingMaxMin': 'Conduite journalière maximale',
  'fleet.settings.field.drivingTime.dailyWorkMaxMin': 'Travail journalier maximal',
  'fleet.settings.field.drivingTime.restBeforeDepartureMinH': 'Repos minimal avant un départ',
  'fleet.settings.field.drivingTime.weeklyRestMinH': 'Repos hebdomadaire minimal',
  'fleet.settings.field.drivingTime.weeklyDrivingMaxH': 'Conduite hebdomadaire maximale',
  'fleet.settings.field.drivingTime.fortnightDrivingMaxH':
    'Conduite maximale sur deux semaines (facultatif)',
  'fleet.settings.field.drivingTime.nightBanStart': 'Conduite de nuit interdite à partir de',
  'fleet.settings.field.drivingTime.nightBanEnd': "Conduite de nuit interdite jusqu'à",
  'fleet.settings.field.geofencing.defaultSiteRadiusM': 'Rayon de site par défaut',
  'fleet.settings.field.documents.defaultNoticeDays': 'Préavis par défaut',

  'fleet.settings.unit.min': 'min',
  'fleet.settings.unit.h': 'h',
  'fleet.settings.unit.m': 'm',
  'fleet.settings.unit.days': 'jours',

  'fleet.settings.issue.required': 'Ce réglage est obligatoire.',
  'fleet.settings.issue.outOfRange': 'Indiquez une valeur entre {min} et {max} {unit}.',
  'fleet.settings.issue.invalidTime': 'Indiquez une heure au format HH:MM.',
  'fleet.settings.issue.nightWindowIncomplete':
    "Indiquez l'heure de début et l'heure de fin, ou laissez les deux vides.",
  'fleet.settings.issue.nightWindowEmpty': "L'heure de fin doit différer de l'heure de début.",
  'fleet.settings.section.safety': 'Sécurité',
  'fleet.settings.section.safety.hint': 'Délais appliqués aux contrôles des véhicules.',
  'fleet.settings.field.safety.recheckDelayDays': 'Délai de contre-visite',
  'fleet.settings.field.safety.justificationDelayH': "Délai de justification d'un écart"
}
