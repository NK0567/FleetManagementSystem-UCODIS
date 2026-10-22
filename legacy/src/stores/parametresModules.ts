import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const CLE_STOCKAGE = 'fms-ucodis-modules-actifs-v2'
/** Ancienne clé : les écrans de maintenance y étaient désactivés par défaut. */
const CLE_ANCIENNE = 'fms-ucodis-modules-actifs'

export interface ModuleConfigurable {
  cle: string
  libelle: string
  description: string
  /** Pourquoi la fonctionnalité est simulée ou incomplète aujourd'hui. */
  note?: string
  actif: boolean
}

/**
 * Écrans activables : chaque entreprise garde ceux dont elle a besoin.
 * Les écrans de maintenance sont actifs par défaut.
 */
export const useParametresModulesStore = defineStore('parametresModules', () => {
  const modules = ref<ModuleConfigurable[]>([
    { cle: 'carte_temps_reel', libelle: 'Carte temps réel', actif: true,
      description: "Position des véhicules sur une carte, avec simulation de déplacement." },
    { cle: 'telemetrie', libelle: 'Télémétrie', actif: true,
      description: 'Mesures embarquées par véhicule et événements remontés : comportements, caméra, défauts moteur, signal.' },
    { cle: 'voyages', libelle: 'Voyages', actif: true,
      description: 'Fiche de voyage, dossier documentaire, trajet et sites desservis.' },
    { cle: 'conformite', libelle: 'Conformité', actif: true,
      description: "Écarts d'itinéraire détectés sur les voyages, à qualifier par le responsable flotte." },
    { cle: 'carburant', libelle: 'Carburant & cartes', actif: true,
      description: 'Suivi des pleins par méthode plein-à-plein, consommation de référence, qualification des anomalies.' },
    { cle: 'etat_flotte', libelle: 'État de flotte', actif: true,
      description: 'Vue consolidée de la disponibilité et des immobilisations du parc.' },
    { cle: 'controles', libelle: 'Contrôles', actif: true,
      description: "Checklists sur route remplies à chaque pause du voyage, et inspections périodiques du véhicule et de la citerne." },
    { cle: 'departs', libelle: 'Départs', actif: true,
      description: "Autorisation de départ conditionnée à quatre contrôles (checklist, test, documents chauffeur, documents véhicule)." },
    { cle: 'assurances', libelle: 'Assurances', actif: true,
      description: 'Déclaration et suivi des accidents et incidents, polices d\'assurance, indicateur d\'accidents par million de km.' },
    { cle: 'documents', libelle: 'Documents', actif: true,
      description: "Documents des véhicules et des personnes avec leurs échéances, et documents de l'entreprise avec leur circuit de validation." },
    { cle: 'configuration', libelle: 'Configuration', actif: true,
      description: "Données de référence : trajets, clients, types d'écart, seuils d'exploitation." },
    { cle: 'conducteurs_flotte', libelle: 'Conducteurs (vue Flotte)', actif: true,
      description: "Vue opérationnelle du conducteur : affectation, conformité, historique de voyage." },
    { cle: 'sites_geofences', libelle: 'Sites & géofences', actif: true,
      description: "Référentiel des sites géographiques (dépôts, entrepôts, relais, points de contrôle), avec fiche éditable." },
    { cle: 'maintenance_atelier', libelle: 'Maintenance · Charge d\'atelier', actif: true,
      description: "Charge par mécanicien, compétences requises, taux d'occupation de l'atelier." },
    { cle: 'maintenance_echeances', libelle: 'Maintenance · Échéances', actif: true,
      description: "Liste consolidée des entretiens préventifs à venir, proches ou dépassés, tous véhicules confondus." },
    { cle: 'maintenance_indisponibilites', libelle: 'Maintenance · Indisponibilités', actif: true,
      description: "Historique détaillé des indisponibilités du parc, par cause et par famille de cause." },
    { cle: 'maintenance_fiabilite', libelle: 'Maintenance · Fiabilité', actif: true,
      description: "Kilométrage moyen entre deux pannes par sous-système, véhicules les plus touchés, coût cumulé par véhicule." },
    { cle: 'maintenance_equipe_mobile', libelle: 'Maintenance · Équipe mobile', actif: true,
      description: "Dépannage sur route d'un camion bloqué loin d'un atelier, et sécurisation d'accident." },
    { cle: 'maintenance_achats', libelle: 'Maintenance · Achats & stock', actif: true,
      description: "Catalogue de pièces, fournisseurs et mouvements de stock, avec seuils d'alerte de réapprovisionnement." },
  ])

  // Le choix d'activation est conservé d'une session à l'autre. Une clé
  // ajoutée plus tard garde sa valeur par défaut ; une clé disparue est ignorée.
  // Depuis l'ancienne clé, seuls les choix hors maintenance sont repris.
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    const ancien = brut ? null : localStorage.getItem(CLE_ANCIENNE)
    const etats = JSON.parse(brut ?? ancien ?? '{}') as Record<string, boolean>
    for (const m of modules.value) {
      const e = etats[m.cle]
      if (typeof e === 'boolean' && (brut || !m.cle.startsWith('maintenance_'))) m.actif = e
    }
  } catch { /* stockage indisponible ou illisible : valeurs par défaut */ }
  watch(modules, v => {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(Object.fromEntries(v.map(m => [m.cle, m.actif])))) } catch { /* ignoré */ }
  }, { deep: true })

  function estActif(cle: string) { return modules.value.find(m => m.cle === cle)?.actif ?? false }
  function basculer(cle: string) {
    const m = modules.value.find(x => x.cle === cle)
    if (m) m.actif = !m.actif
  }

  const actifs = computed(() => modules.value.filter(m => m.actif))

  return { modules, estActif, basculer, actifs }
})
