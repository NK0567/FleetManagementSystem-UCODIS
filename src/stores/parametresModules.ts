import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ModuleConfigurable {
  cle: string
  libelle: string
  description: string
  /** Pourquoi la fonctionnalité est simulée ou incomplète pour UCODIS aujourd'hui. */
  note?: string
  actif: boolean
}

/**
 * Base commune FMS : toutes les fonctionnalités du socle existent
 * dans le code, mais celles qui n'ont pas encore de donnée réelle
 * pour les fonder restent désactivables ici plutôt que supprimées ·
 * chaque client active ce dont il a besoin.
 */
export const useParametresModulesStore = defineStore('parametresModules', () => {
  const modules = ref<ModuleConfigurable[]>([
    { cle: 'carte_temps_reel', libelle: 'Carte temps réel', actif: true,
      description: "Position des véhicules sur une carte, avec simulation de déplacement." },
    { cle: 'telemetrie', libelle: 'Télémétrie', actif: true,
      description: 'Kilométrage, carburant, état moteur et signal par véhicule.' },
    { cle: 'voyages', libelle: 'Voyages', actif: true,
      description: 'Fiche de voyage, dossier documentaire, trajet et sites desservis.' },
    { cle: 'conformite', libelle: 'Conformité', actif: true,
      description: "Écarts d'itinéraire détectés sur les voyages, à qualifier par le responsable flotte." },
    { cle: 'carburant', libelle: 'Carburant & cartes', actif: true,
      description: 'Suivi des pleins par méthode plein-à-plein, consommation de référence, qualification des anomalies.' },
    { cle: 'etat_flotte', libelle: 'État de flotte', actif: true,
      description: 'Vue consolidée de la disponibilité et des immobilisations du parc.' },
    { cle: 'controles', libelle: 'Contrôles', actif: true,
      description: "Checklists sur route, seize points de contrôle, réparties sur les pauses du voyage." },
    { cle: 'departs', libelle: 'Départs', actif: true,
      description: "Autorisation de départ conditionnée à quatre contrôles (checklist, test, documents chauffeur, documents véhicule)." },
    { cle: 'assurances', libelle: 'Assurances', actif: true,
      description: 'Sinistres et polices d\'assurance, avec indicateur d\'accidents par million de km.' },
    { cle: 'documents', libelle: 'Documents', actif: true,
      description: "Suivi réglementaire unifié des documents véhicules et conducteurs, avec échéances et alertes." },
    { cle: 'configuration', libelle: 'Configuration', actif: true,
      description: "Données de référence : trajets, clients, types d'écart, seuils d'exploitation." },
    { cle: 'conducteurs_flotte', libelle: 'Conducteurs (vue Flotte)', actif: true,
      description: "Vue opérationnelle du conducteur : affectation, conformité, historique de voyage." },
    { cle: 'sites_geofences', libelle: 'Sites & géofences', actif: true,
      description: "Référentiel des sites géographiques (dépôts, entrepôts, relais, points de contrôle), avec fiche éditable." },
    { cle: 'maintenance_atelier', libelle: 'Maintenance · Charge d\'atelier', actif: false,
      description: "Charge par mécanicien, compétences requises, taux d'occupation de l'atelier." },
    { cle: 'maintenance_echeances', libelle: 'Maintenance · Échéances', actif: false,
      description: "Liste consolidée des entretiens préventifs à venir, proches ou dépassés, tous véhicules confondus." },
    { cle: 'maintenance_indisponibilites', libelle: 'Maintenance · Indisponibilités', actif: false,
      description: "Historique détaillé des immobilisations du parc, par code et par famille de cause." },
    { cle: 'maintenance_fiabilite', libelle: 'Maintenance · Fiabilité', actif: false,
      description: "MTBF par sous-système, top véhicules problématiques, coût cumulé par véhicule." },
    { cle: 'maintenance_equipe_mobile', libelle: 'Maintenance · Équipe mobile', actif: false,
      description: "Interventions de la patrouille conjointe : dépannage sur route, sécurisation d'accident, contrôles alcool et drogue inopinés." },
    { cle: 'maintenance_achats', libelle: 'Maintenance · Achats & stock', actif: false,
      description: "Catalogue de pièces, fournisseurs et mouvements de stock, avec seuils d'alerte de réapprovisionnement." },
  ])

  function estActif(cle: string) { return modules.value.find(m => m.cle === cle)?.actif ?? false }
  function basculer(cle: string) {
    const m = modules.value.find(x => x.cle === cle)
    if (m) m.actif = !m.actif
  }

  const actifs = computed(() => modules.value.filter(m => m.actif))

  return { modules, estActif, basculer, actifs }
})
