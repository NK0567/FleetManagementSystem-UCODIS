export default {
  'maintenance.settings.title': 'Réglages de la maintenance',
  'maintenance.settings.subtitle':
    "Capacité de l'atelier, coûts, préavis d'entretien, seuils des pneus et objectifs de l'équipe mobile.",
  'maintenance.settings.lastModified': 'Modifié le {date} par {user}',
  'maintenance.settings.loadError': "Les réglages de la maintenance n'ont pas pu être chargés.",
  'maintenance.settings.saveError': "Les réglages n'ont pas pu être enregistrés.",

  'maintenance.settings.section.workshop': "Capacité de l'atelier",
  'maintenance.settings.section.workshop.hint': 'Sert à mesurer la charge de travail planifiée.',
  'maintenance.settings.field.workshop.stations': 'Postes de travail',
  'maintenance.settings.field.workshop.hoursPerDay': 'Heures de travail par jour',
  'maintenance.settings.field.workshop.workingDaysPerWeek': 'Jours ouvrés par semaine',

  'maintenance.settings.section.labour': "Main-d'œuvre",
  'maintenance.settings.section.labour.hint':
    "Valorise les heures pointées sur les ordres de travail de l'atelier.",
  'maintenance.settings.field.labour.hourlyRate': 'Taux horaire',

  'maintenance.settings.section.downtimeCost': "Coût d'immobilisation",
  'maintenance.settings.section.downtimeCost.hint':
    'Ce que coûte une journée sans le véhicule. Les coûts par type remplacent le coût moyen quand ils sont renseignés.',
  'maintenance.settings.field.downtimeCost.dayCost': 'Coût moyen par jour',
  'maintenance.settings.field.downtimeCost.tractorDayCost': "Coût par jour d'un véhicule moteur",
  'maintenance.settings.field.downtimeCost.trailerDayCost': "Coût par jour d'une remorque",

  'maintenance.settings.section.service': 'Entretien préventif',
  'maintenance.settings.section.service.hint':
    "Le préavis fait passer une échéance à « proche » et déclenche l'alerte. Une échéance dépassée rend le véhicule indisponible, sauf sur un plan provisoire.",
  'maintenance.settings.field.service.noticeKm': 'Préavis en kilomètres',
  'maintenance.settings.field.service.noticeDays': 'Préavis en jours',

  'maintenance.settings.section.tyres': 'Pneus',
  'maintenance.settings.section.tyres.hint':
    'Un pneu monté sous ces seuils déclenche une alerte de sécurité ; la rotation est due au premier des deux termes atteint.',
  'maintenance.settings.field.tyres.minPressureBar': 'Pression minimale',
  'maintenance.settings.field.tyres.minTreadMm': 'Sculpture minimale',
  'maintenance.settings.field.tyres.rotationKm': 'Rotation tous les',
  'maintenance.settings.field.tyres.rotationMonths': 'ou tous les',

  'maintenance.settings.section.mobileTeam': 'Équipe mobile',
  'maintenance.settings.section.mobileTeam.hint': 'Objectifs mensuels, comparés au mois civil.',
  'maintenance.settings.field.mobileTeam.interventionsPerMonth': 'Interventions par mois',
  'maintenance.settings.field.mobileTeam.resolutionRatePct': 'Taux de résolution visé',
  'maintenance.settings.field.mobileTeam.averageTimeMin': "Durée moyenne d'intervention visée",
  'maintenance.settings.field.mobileTeam.checksPerMonth': 'Contrôles par mois',

  'maintenance.settings.unit.count': '',
  'maintenance.settings.unit.h': 'h',
  'maintenance.settings.unit.days': 'jours',
  'maintenance.settings.unit.amount': 'Ar',
  'maintenance.settings.unit.km': 'km',
  'maintenance.settings.unit.bar': 'bar',
  'maintenance.settings.unit.mm': 'mm',
  'maintenance.settings.unit.months': 'mois',
  'maintenance.settings.unit.percent': '%',
  'maintenance.settings.unit.min': 'min',

  'maintenance.settings.issue.required': 'Ce réglage est obligatoire.',
  'maintenance.settings.issue.outOfRange': 'Indiquez une valeur entre {min} et {max} {unit}.',
  'maintenance.settings.issue.invalidTime': 'Indiquez une heure au format HH:MM.',
  'maintenance.settings.field.service.noticeHours': 'Préavis en heures moteur',
  'maintenance.settings.section.targets': 'Cibles des indicateurs',
  'maintenance.settings.section.targets.hint':
    'Comparées aux indicateurs de maintenance et de fiabilité.',
  'maintenance.settings.field.targets.preventiveShareTargetPct': 'Part du préventif visée',
  'maintenance.settings.field.targets.preventiveCompletionTargetPct':
    'Taux de réalisation du préventif visé',
  'maintenance.settings.field.targets.mttrTargetHours': 'MTTR à ne pas dépasser',
  'maintenance.settings.field.targets.mtbfTargetKm': 'MTBF minimal'
}
