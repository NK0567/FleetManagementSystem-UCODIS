import type { CollectionDefinition, MockRow } from '../../db/collection'
import { seedAudit } from '../seedAudit'

export interface JobPositionRow extends MockRow {
  name: string
  orgUnitNo: string
  drives: boolean
  plannedHeadcount: number
  responsibilities: string[]
  defaultCategoryNo: string
}

/** Positions and responsibilities come word for word from section 3 of the SOP. */
export const jobPositionsCollection: CollectionDefinition<JobPositionRow> = {
  name: 'hr-job-positions',
  seed: () => [
    {
      no: 'RFL',
      name: 'Responsable flotte',
      orgUnitNo: 'FLT',
      drives: false,
      plannedHeadcount: 1,
      defaultCategoryNo: 'CAT-A',
      responsibilities: [
        'Préparation des dossiers administratifs du camion : assurances, cartes grises, vignettes, cartes fiscales',
        'Enregistrement de suivis de camions',
        'Affectation du camion au conducteur',
        'Vérification de camion disponible sur le planning voyage',
        'Enregistrement de planning de voyage pour le camion',
        'Établissement de fiche de voyage',
        'Affectation du BL pour un camion',
        'Envoi du camion au dépôt UCODIS',
        'Clôture du voyage sur le planning voyage'
      ],
      ...seedAudit
    },
    {
      no: 'MNT',
      name: 'Technicien de maintenance',
      orgUnitNo: 'MNT',
      drives: false,
      plannedHeadcount: 2,
      defaultCategoryNo: 'CAT-B',
      responsibilities: [
        'Vérification à la réception du camion',
        "Vérification de l'état de camion avant l'utilisation, avec le conducteur",
        "Vérification de l'état de camion après l'utilisation, avec le conducteur"
      ],
      ...seedAudit
    },
    {
      no: 'CND',
      name: 'Conducteur',
      orgUnitNo: 'CND',
      drives: true,
      plannedHeadcount: 10,
      defaultCategoryNo: 'CAT-C',
      responsibilities: [
        "Vérification de l'état de camion avant son utilisation avec le maintenancier",
        'Nettoyage du camion',
        'Envoi du camion au dépôt de UCODIS',
        'Comptage et vérification des marchandises chargées dans le camion',
        'Vérification du poids des marchandises par rapport à la charge maximale autorisée',
        'Enregistrement du BL dans le carnet de bord',
        'Respect du code de la route et de la limitation de vitesse',
        "Respect des points d'arrêts",
        'Information au responsable flotte en cas de problème sur route',
        'Déchargement et comptage des marchandises',
        'Accusé réception du client sur BL, fiche de suivi de chargement et bordereau de transport',
        "Vérification de l'état de camion après utilisation"
      ],
      ...seedAudit
    },
    {
      no: 'AID',
      name: 'Aide conducteur',
      orgUnitNo: 'CND',
      drives: true,
      plannedHeadcount: 5,
      defaultCategoryNo: 'CAT-C',
      responsibilities: [
        'Nettoyage du camion',
        "Respect des points d'arrêts",
        'Information au responsable flotte sur les nouvelles zones de dangers ou autres'
      ],
      ...seedAudit
    },
    {
      no: 'CLI',
      name: 'Chargé de clientèle',
      orgUnitNo: 'CLI',
      drives: false,
      plannedHeadcount: 1,
      defaultCategoryNo: 'CAT-B',
      responsibilities: ['Affectation du BL pour un camion'],
      ...seedAudit
    },
    {
      no: 'COM',
      name: 'Agent commercial',
      orgUnitNo: 'COM',
      drives: false,
      plannedHeadcount: 1,
      defaultCategoryNo: 'CAT-B',
      responsibilities: [
        'Calcul du poids et nombre de cartons pour livraison',
        'Demande de disponibilité de camion au responsable flotte'
      ],
      ...seedAudit
    },
    {
      no: 'DEP',
      name: 'Agent de dépôt',
      orgUnitNo: 'DEP',
      drives: false,
      plannedHeadcount: 2,
      defaultCategoryNo: 'CAT-D',
      responsibilities: [
        'Comptage et vérifications des marchandises chargées dans le camion',
        'Vérification du poids des marchandises par rapport à la charge maximale autorisée',
        'En cas d’anomalie du poids : retour des marchandises au dépôt et remplacement'
      ],
      ...seedAudit
    },
    {
      no: 'DIR',
      name: 'Directeur UCODIS Transport',
      orgUnitNo: 'UCT',
      drives: false,
      plannedHeadcount: 1,
      defaultCategoryNo: 'CAT-A',
      responsibilities: ['Consultation des tableaux de bord, des coûts et des rapports'],
      ...seedAudit
    },
    {
      no: 'ADM',
      name: 'Administrateur système',
      orgUnitNo: 'UCT',
      drives: false,
      plannedHeadcount: 1,
      defaultCategoryNo: 'CAT-A',
      responsibilities: [
        "Gestion des comptes, des rôles et des droits d'accès",
        "Paramétrage des référentiels et des seuils d'alerte"
      ],
      ...seedAudit
    }
  ]
}
