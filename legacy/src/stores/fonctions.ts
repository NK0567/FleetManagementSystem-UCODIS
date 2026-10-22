import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Fonction } from '../types'

/**
 * Les fonctions et leurs responsabilités sont reprises telles quelles du
 * tableau de la section 3 de la SOP UCD-TRUCK-FLOT-001. Rien n'est ajouté.
 * Seules « Direction » et « Administrateur système » n'y figurent pas :
 * elles sont signalées comme ajouts dans le document de user stories.
 */
const SEED: Fonction[] = [
  {
    id: 'f-rflotte', code: 'RFL', libelle: 'Responsable flotte', entiteId: 'e2',
    conduit: false, effectif: 1,
    responsabilites: [
      "Préparation des dossiers administratifs du camion : assurances, cartes grises, vignettes, cartes fiscales",
      "Enregistrement de suivis de camions",
      "Affectation du camion au conducteur",
      "Vérification de camion disponible sur le planning voyage",
      "Enregistrement de planning de voyage pour le camion",
      "Établissement de fiche de voyage",
      "Affectation du BL pour un camion",
      "Envoi du camion au dépôt UCODIS",
      "Clôture du voyage sur le planning voyage",
    ],
  },
  {
    id: 'f-maint', code: 'MNT', libelle: 'Technicien de maintenance', entiteId: 'e3',
    conduit: false, effectif: 2,
    responsabilites: [
      "Vérification à la réception du camion",
      "Vérification de l'état de camion avant l'utilisation, avec le conducteur",
      "Vérification de l'état de camion après l'utilisation, avec le conducteur",
    ],
  },
  {
    id: 'f-cond', code: 'CND', libelle: 'Conducteur', entiteId: 'e4',
    conduit: true, effectif: 10,
    responsabilites: [
      "Vérification de l'état de camion avant son utilisation avec le maintenancier",
      "Nettoyage du camion",
      "Envoi du camion au dépôt de UCODIS",
      "Comptage et vérification des marchandises chargées dans le camion",
      "Vérification du poids des marchandises par rapport à la charge maximale autorisée",
      "Enregistrement du BL dans le carnet de bord",
      "Respect du code de la route et de la limitation de vitesse",
      "Respect des points d'arrêts",
      "Information au responsable flotte en cas de problème sur route",
      "Déchargement et comptage des marchandises",
      "Accusé réception du client sur BL, fiche de suivi de chargement et bordereau de transport",
      "Vérification de l'état de camion après utilisation",
    ],
  },
  {
    id: 'f-aide', code: 'AID', libelle: 'Aide conducteur', entiteId: 'e4',
    conduit: true, effectif: 5,
    responsabilites: [
      "Nettoyage du camion",
      "Respect des points d'arrêts",
      "Information au responsable flotte sur les nouvelles zones de dangers ou autres",
    ],
  },
  {
    id: 'f-cli', code: 'CLI', libelle: 'Chargé de clientèle', entiteId: 'e5',
    conduit: false, effectif: 1,
    responsabilites: ["Affectation du BL pour un camion"],
  },
  {
    id: 'f-com', code: 'COM', libelle: 'Agent commercial', entiteId: 'e6',
    conduit: false, effectif: 1,
    responsabilites: [
      "Calcul du poids et nombre de cartons pour livraison",
      "Demande de disponibilité de camion au responsable flotte",
    ],
  },
  {
    id: 'f-depot', code: 'DEP', libelle: 'Agent de dépôt', entiteId: 'e7',
    conduit: false, effectif: 2,
    responsabilites: [
      "Comptage et vérifications des marchandises chargées dans le camion",
      "Vérification du poids des marchandises par rapport à la charge maximale autorisée",
      "En cas d'anomalie du poids : retour des marchandises au dépôt et remplacement",
    ],
  },
  {
    id: 'f-dir', code: 'DIR', libelle: 'Directeur UCODIS Transport', entiteId: 'e1',
    conduit: false, effectif: 1,
    responsabilites: [
      "Consultation des tableaux de bord, des coûts et des rapports",
      "Fonction ajoutée pour le pilotage · à valider par UCODIS",
    ],
  },
  {
    id: 'f-adm', code: 'ADM', libelle: 'Administrateur système', entiteId: 'e1',
    conduit: false, effectif: 1,
    responsabilites: [
      "Gestion des comptes, des rôles et des droits d'accès",
      "Paramétrage des référentiels et des seuils d'alerte",
      "Fonction ajoutée pour l'exploitation du logiciel",
    ],
  },
]

export const useFonctionStore = defineStore('fonctions', () => {
  const liste = ref<Fonction[]>(SEED)

  const fonctionsConduite = computed(() => liste.value.filter(f => f.conduit))

  function parId(id: string) {
    return liste.value.find(f => f.id === id) ?? null
  }

  let prochainId = liste.value.length + 1
  function creer(f: Omit<Fonction, 'id'>) {
    const id = `f-perso-${prochainId++}`
    liste.value.push({ ...f, id })
    return id
  }
  function mettreAJour(id: string, patch: Partial<Omit<Fonction, 'id'>>) {
    const f = parId(id)
    if (f) Object.assign(f, patch)
  }
  function supprimer(id: string) {
    liste.value = liste.value.filter(f => f.id !== id)
  }

  return { liste, fonctionsConduite, parId, creer, mettreAJour, supprimer }
})
