export default {
  'maintenance.settings.title': 'Maintenance settings',
  'maintenance.settings.subtitle':
    'Workshop capacity, costs, service notice, tyre thresholds and mobile team targets.',
  'maintenance.settings.lastModified': 'Changed on {date} by {user}',
  'maintenance.settings.loadError': 'The maintenance settings could not be loaded.',
  'maintenance.settings.saveError': 'The settings could not be saved.',

  'maintenance.settings.section.workshop': 'Workshop capacity',
  'maintenance.settings.section.workshop.hint': 'Measures the planned workload.',
  'maintenance.settings.field.workshop.stations': 'Work stations',
  'maintenance.settings.field.workshop.hoursPerDay': 'Working hours per day',
  'maintenance.settings.field.workshop.workingDaysPerWeek': 'Working days per week',

  'maintenance.settings.section.labour': 'Labour',
  'maintenance.settings.section.labour.hint':
    'Values the hours logged on the work orders of the workshop.',
  'maintenance.settings.field.labour.hourlyRate': 'Single hourly rate',
  'maintenance.settings.section.downtimeCost': 'Downtime cost',
  'maintenance.settings.section.downtimeCost.hint':
    'What a day without the vehicle costs. Costs per kind replace the average cost when set.',
  'maintenance.settings.field.downtimeCost.dayCost': 'Average cost per day',
  'maintenance.settings.field.downtimeCost.tractorDayCost': 'Cost per day of a motor vehicle',
  'maintenance.settings.field.downtimeCost.trailerDayCost': 'Cost per day of a trailer',

  'maintenance.settings.section.service': 'Preventive service',
  'maintenance.settings.section.service.hint':
    'The notice turns a due date to due soon and raises the alert. An overdue service makes the vehicle unavailable, except on a provisional plan.',
  'maintenance.settings.field.service.noticeKm': 'Notice in kilometres',
  'maintenance.settings.field.service.noticeDays': 'Notice in days',

  'maintenance.settings.section.tyres': 'Tyres',
  'maintenance.settings.section.tyres.hint':
    'A mounted tyre below these thresholds raises a safety alert; rotation is due at whichever term comes first.',
  'maintenance.settings.field.tyres.minPressureBar': 'Minimum pressure',
  'maintenance.settings.field.tyres.minTreadMm': 'Minimum tread',
  'maintenance.settings.field.tyres.rotationKm': 'Rotation every',
  'maintenance.settings.field.tyres.rotationMonths': 'or every',

  'maintenance.settings.section.mobileTeam': 'Mobile team',
  'maintenance.settings.section.mobileTeam.hint':
    'Monthly targets, compared with the calendar month.',
  'maintenance.settings.field.mobileTeam.interventionsPerMonth': 'Interventions per month',
  'maintenance.settings.field.mobileTeam.resolutionRatePct': 'Target resolution rate',
  'maintenance.settings.field.mobileTeam.averageTimeMin': 'Target average intervention time',
  'maintenance.settings.field.mobileTeam.checksPerMonth': 'Checks per month',

  'maintenance.settings.unit.count': '',
  'maintenance.settings.unit.h': 'h',
  'maintenance.settings.unit.days': 'days',
  'maintenance.settings.unit.amount': 'Ar',
  'maintenance.settings.unit.km': 'km',
  'maintenance.settings.unit.bar': 'bar',
  'maintenance.settings.unit.mm': 'mm',
  'maintenance.settings.unit.months': 'months',
  'maintenance.settings.unit.percent': '%',
  'maintenance.settings.unit.min': 'min',

  'maintenance.settings.issue.required': 'This setting is required.',
  'maintenance.settings.issue.outOfRange': 'Give a value between {min} and {max} {unit}.',
  'maintenance.settings.issue.invalidTime': 'Give a time as HH:MM.',
  'maintenance.settings.field.service.noticeHours': 'Notice in engine hours',
  'maintenance.settings.section.targets': 'Targets of the indicators',
  'maintenance.settings.section.targets.hint':
    'Compared with the maintenance and reliability indicators.',
  'maintenance.settings.field.targets.preventiveShareTargetPct': 'Target share of preventive work',
  'maintenance.settings.field.targets.preventiveCompletionTargetPct':
    'Target completion rate of preventive work',
  'maintenance.settings.field.targets.mttrTargetHours': 'Highest MTTR',
  'maintenance.settings.field.targets.mtbfTargetKm': 'Lowest MTBF'
}
