export default {
  'maintenance.maintenancePlans.title': "Plans d'entretien",
  'maintenance.maintenancePlans.card': "Fiche plan d'entretien",
  'maintenance.maintenancePlans.new': "Nouveau plan d'entretien",
  'maintenance.maintenancePlans.loadingList': "Chargement des plans d'entretien…",
  'maintenance.maintenancePlans.noResults': "Aucun plan d'entretien.",
  'maintenance.maintenancePlans.noSearchResults': 'Aucun plan ne correspond à « {query} ».',
  'maintenance.maintenancePlans.saveSuccess': "Plan d'entretien enregistré.",
  'maintenance.maintenancePlans.saveError': "Le plan d'entretien n'a pas pu être enregistré.",
  'maintenance.maintenancePlans.createError': "Le plan d'entretien n'a pas pu être créé.",
  'maintenance.maintenancePlans.deleteError': "Le plan d'entretien n'a pas pu être supprimé.",
  'maintenance.maintenancePlans.confirmDelete': 'Supprimer le plan',
  'maintenance.maintenancePlans.confirmDeleteMsg':
    'Le plan « {name} » sera définitivement supprimé.',

  'maintenance.maintenancePlans.search.all': 'N° ou libellé',

  'maintenance.maintenancePlans.col.no': 'N°',
  'maintenance.maintenancePlans.col.name': 'Libellé',
  'maintenance.maintenancePlans.col.provisional': 'Provisoire',
  'maintenance.maintenancePlans.col.active': 'Actif',
  'maintenance.maintenancePlans.col.source': 'Source',
  'maintenance.maintenancePlans.col.vehicleCount': 'Véhicules',
  'maintenance.maintenancePlans.col.operationCount': 'Opérations',

  'maintenance.maintenancePlans.form.general': 'Général',
  'maintenance.maintenancePlans.form.no': 'N°',
  'maintenance.maintenancePlans.form.name': 'Libellé',
  'maintenance.maintenancePlans.form.provisional': 'Provisoire',
  'maintenance.maintenancePlans.form.provisionalHint':
    "Intervalles à confirmer : le plan alerte mais n'immobilise jamais un véhicule.",
  'maintenance.maintenancePlans.form.active': 'Actif',
  'maintenance.maintenancePlans.form.source': 'Source',
  'maintenance.maintenancePlans.form.vehicles': 'Véhicules',
  'maintenance.maintenancePlans.form.operations': 'Opérations',
  'maintenance.maintenancePlans.vehicles.empty': 'Aucun véhicule ne suit ce plan.',
  'maintenance.maintenancePlans.vehicles.count': 'Aucun véhicule | 1 véhicule | {count} véhicules',
  'maintenance.maintenancePlans.vehicles.addOne': 'Ajouter un véhicule',
  'maintenance.maintenancePlans.vehicles.addModel': 'Ajouter tout un modèle',
  'maintenance.maintenancePlans.vehicles.addModelHint':
    'Ajoute tous les véhicules de cette marque et de ce modèle.',
  'maintenance.maintenancePlans.operations.empty': 'Aucune opération.',
  'maintenance.maintenancePlans.operations.count':
    'Aucune opération | 1 opération | {count} opérations',
  'maintenance.maintenancePlans.operations.no': 'N°',
  'maintenance.maintenancePlans.operations.newNo': 'Nouvelle',
  'maintenance.maintenancePlans.operations.label': 'Opération',
  'maintenance.maintenancePlans.operations.subsystem': 'Sous-système',
  'maintenance.maintenancePlans.operations.nature': 'Nature',
  'maintenance.maintenancePlans.operations.intervalKm': 'Tous les (km)',
  'maintenance.maintenancePlans.operations.intervalDays': 'Tous les (jours)',
  'maintenance.maintenancePlans.operations.add': 'Ajouter une opération',
  'maintenance.maintenancePlans.operations.remove': "Retirer l'opération",
  'maintenance.maintenancePlans.operations.invalid':
    'Complétez chaque opération : libellé, sous-système et au moins un seuil en kilomètres, en heures ou en jours.',
  'maintenance.maintenancePlans.operations.issue.label': 'Libellé manquant.',
  'maintenance.maintenancePlans.operations.issue.subsystem': 'Sous-système manquant.',
  'maintenance.maintenancePlans.operations.issue.interval':
    'Indiquez au moins un seuil : kilomètres, heures ou jours.',
  'maintenance.maintenancePlans.operations.issue.intervalPositive':
    'Un intervalle doit être positif.',
  'maintenance.maintenancePlans.action.duplicate': 'Dupliquer',
  'maintenance.maintenancePlans.duplicateHint':
    'La copie reprend les opérations, sans modèle ni passage.',
  'maintenance.maintenancePlans.col.modelNames': 'Modèles',
  'maintenance.maintenancePlans.form.models': 'Modèles de véhicules',
  'maintenance.maintenancePlans.models.empty': 'Aucun modèle ne suit ce plan.',
  'maintenance.maintenancePlans.models.add': 'Ajouter un modèle',
  'maintenance.maintenancePlans.models.vehicles': 'Véhicules du parc : {plates}',
  'maintenance.maintenancePlans.models.noVehicle':
    "Aucun véhicule de ce modèle dans le parc pour l'instant.",
  'maintenance.maintenancePlans.models.inheritHint':
    'chaque véhicule du modèle hérite du plan, y compris ceux qui entreront dans le parc.',
  'maintenance.maintenancePlans.operations.intervalHours': 'Toutes les (heures moteur)'
}
