import { defineStore } from 'pinia'
import { useDepartsStore } from './departs'
import { useParametresModulesStore } from './parametresModules'
import { fileDeclarationsLivraison } from '../lib/fileHorsReseau'
import { ref, computed, watch } from 'vue'
import type { Voyage, StatutVoyage, DocumentVoyage, TypeDocVoyage, EtapeVoyage, NotificationClient, TypeNotificationClient, PointPlanTrajet, QualificationEcart, OrigineProbleme, ActeurResponsable, TypeImpactFinancier, PieceJointe, FicheDebriefing, MesureCompartiment } from '../types'
import { VOYAGES_CARBURANT_DEMO } from './donneesCarburant'
import { controlerMesure, totalA15, totalVolume } from '../lib/volume15'
import { calculerEcartPoids, calculerEcartKm, horsTournee, chargeOrdre, dansLaTournee, retourAControler } from '../utils/voyageUtils'
import { useAuthStore } from './auth'
import { useParametresPlanificationStore } from './parametresPlanification'
import { useDocumentsVehiculeStore } from './documentsVehicule'
import { useDocumentsStore } from './documentsPersonnel'
import { useVehiculeStore } from './vehicules'
import { useClientsStore } from './clients'
import { useCommandesStore } from './commandes'
import { useTrajetsStore } from './trajets'
import { useAbsenceStore } from './absences'
import { useConfigTypesEcartStore } from './ecarts'
import { aujourdhuiISO, maintenantMs, maintenant } from '../utils/horloge'
import { usePrestatairesStore } from './prestataires'
import { useProduitsStore } from './produits'
import { useContraintesLivraisonStore } from './contraintesLivraison'
import { useControlesTransportStore } from './controlesTransport'
import { useTarifsTransportStore } from './tarifsTransport'
import { heurePrevueCalculee, heureEstimee, heurePrevue, fmtHeure, fmtArrivee, pointDepart } from '../lib/horairesLivraison'
/** Facture d'un transporteur externe couvrant plusieurs expéditions qui lui ont été confiées. */
export interface FactureTransporteurGroupee {
  id: string
  transporteurId: string
  numero: string
  date: string
  montantTotal: number
  voyageIds: string[]
  saisieLe: string
  saisiePar: string
  statut: 'a_controler' | 'validee' | 'refusee'
  motifRefus?: string
  decideeLe?: string
  decideePar?: string
  motifValidationSansTarif?: string
}

/** Libellés des choix de la responsabilité et des impacts financiers. */
export const LIB_ORIGINE_PROBLEME: Record<OrigineProbleme, string> = {
  depart: 'Marchandise non chargée ou mal vérifiée au départ',
  transport: 'Marchandise perdue ou abîmée pendant le transport',
  commande: "Problème de commande de l'ordonnateur",
}
export const LIB_ACTEUR_RESPONSABLE: Record<ActeurResponsable, string> = {
  ordonnateur: 'Ordonnateur', logistique: 'Logistique', transporteur_interne: 'Transporteur interne', transporteur_externe: 'Transporteur externe',
}
export const LIB_IMPACT: Record<TypeImpactFinancier, string> = {
  retenue_transporteur: 'Retenue sur la facture du transporteur', avoir_client: 'Avoir au client',
}
export const LIB_STATUT_PROTET: Record<'en_preparation' | 'emise' | 'cloturee', string> = {
  en_preparation: 'En préparation', emise: 'Émise', cloturee: 'Clôturée',
}
export const LIB_QUALIFICATION: Record<QualificationEcart, string> = { gain: 'Gain', coulage: 'Coulage' }
/** Quantité reçue saisie à la livraison, avec la justification d'un écart hors tolérance ;
 *  pour le carburant, les volumes dépotés compartiment par compartiment, dont le total à 15 °C fait la quantité reçue. */
export interface SaisieQuantite { recue?: number; justification?: string; mesures?: MesureCompartiment[] }

/** Pièces obligatoires au dossier de voyage · conditionnent la clôture,
 *  le bon de livraison étant explicitement cité par la SOP. */
export const DOCS_OBLIGATOIRES: TypeDocVoyage[] = ['ordre_transport', 'bon_chargement', 'feuille_route', 'bon_livraison']

export const LIB_DOC: Record<TypeDocVoyage, string> = {
  ordre_transport: 'Ordre de transport',
  bon_chargement: 'Bon de chargement',
  feuille_route: 'Feuille de route',
  bon_livraison: 'Bon de livraison',
  note_reserve: 'Note de protêt',
}

/**
 * Store du VOYAGE · repris du socle FMS, objet pivot du suivi
 * d'exploitation. Adapté au fret général d'UCODIS : poids et cartons au
 * lieu de volumes de carburant, écart de poids au lieu de coulage.
 */
export const useVoyagesStore = defineStore('voyages', () => {

  const SEED_VOYAGES: Voyage[] = [
    {
      id: 'VOY-001', reference: 'VOY-2026-0148', numeroOT: 'OT-2026-04412',
      statut: 'livre',
      clientNom: 'Jumbo Score Tanjombato', toleranceEcartPoidsPourcent: 0.5,
      trajetId: 'TRJ-001', trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)',
      /* Terminé, en attente de clôture : la livraison est déclarée par le
         conducteur mais contestée par le destinataire, à traiter avant clôture. */
      etapes: [
        { id: 'VOY-001-ET-001', siteNom: 'Dépôt Tanjombato', ordre: 1, lat: -18.8792, lng: 47.5079, role: 'depart', intervalleMin: 0, franchi: true },
        { id: 'VOY-001-ET-002', siteNom: 'Entrepôt Tanjombato', ordre: 2, lat: -18.9167, lng: 47.5300, role: 'chargement', intervalleMin: 25, franchi: true },
        { id: 'VOY-001-ET-003', siteNom: 'Relais Moramanga', ordre: 3, lat: -18.9333, lng: 47.9333, role: 'repos', intervalleMin: 110, pausePrevueMin: 45, franchi: true },
        { id: 'VOY-001-ET-004', siteNom: 'Contrôle Brickaville', ordre: 4, lat: -18.6667, lng: 48.9833, role: 'controle', intervalleMin: 55, franchi: true },
        {
          id: 'VOY-001-ET-005', siteNom: 'Entrepôt Toamasina', ordre: 5, lat: -18.1492, lng: 49.4023, role: 'livraison', intervalleMin: 140, franchi: true,
          destinataire: 'Jumbo Score Tanjombato', adresseLivraison: 'Entrepôt Toamasina', poidsKg: 9600,
          nombreUnites: 480, produit: 'Produits alimentaires secs', quantiteRecue: 456,
          arriveeLe: '2026-08-24T17:55:00', livreParChauffeurLe: '2026-08-24T18:12:00',
          eBL: { reference: 'EBL-OT-2026-04412-01', emisLe: '2026-08-24T18:12:00', destinataire: 'Jumbo Score Tanjombato', adresse: 'Entrepôt Toamasina', produit: 'Produits alimentaires secs', quantiteRecue: 456 },
          receptionContesteeLe: '2026-08-24T19:05:00', motifContestation: '20 cartons manquants et 4 cartons abîmés à la réception.',
          /* Écart signalé, encore à qualifier : aucune conséquence n'en est tirée pour l'instant. */
          ecartQuantite: { quantiteChargee: 480, quantiteRecue: 456, ecart: -24, horsTolerance: true, motif: "Écart de -24 (5 %), au-delà de l'écart autorisé de 1 %.", detecteLe: '2026-08-24T18:12:00' },
          notesProtet: [{
            id: 'NP-001', numero: 'NP-2026-001', motif: 'Cartons manquants et abîmés constatés à la réception chez le client.', quantiteEnCause: 24,
            piecesJointes: [{ nom: 'photos-cartons-abimes.jpg' }], statut: 'emise', prepareeLe: '2026-08-24T19:20:00', prepareePar: 'Hery Andriamalala', emiseLe: '2026-08-24T19:30:00',
          }],
        },
      ],
      origine: 'Antananarivo', destination: 'Toamasina',
      vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      semiRemorqueId: 'v-sr-1', semiRemorquePlaque: 'RM 4101',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      datePlanifiee: '2026-08-24T05:30:00', modeTransport: 'Camion',
      dateDepartReel: '2026-08-24T05:48:00',
      dateArriveeReelle: '2026-08-24T18:12:00',
      kmReference: 352, kmDepart: 182_100, kmArrivee: 182_478,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 480, poidsChargeKg: 9600, poidsDechargeKg: 9550 },
      createdAt: '2026-08-23T14:00:00',
    },
    {
      id: 'VOY-002', reference: 'VOY-2026-0149', numeroOT: 'OT-2026-04418',
      statut: 'en_cours',
      clientNom: 'Jumbo Score Tanjombato', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-001', trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)', etapes: [],
      origine: 'Antananarivo', destination: 'Toamasina',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA',
      semiRemorqueId: 'v-sr-3', semiRemorquePlaque: 'RM 4103',
      chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      datePlanifiee: '2026-09-03T06:00:00',
      dateDepartReel: '2026-09-03T06:05:00',
      kmReference: 352, kmDepart: 98_450,
      marchandise: { typeProduit: 'Produits ménagers', nombreCartons: 520, poidsChargeKg: 8200 },
      createdAt: '2026-09-02T16:30:00',
    },
    {
      id: 'VOY-003', reference: 'VOY-2026-0147', numeroOT: 'OT-2026-04405',
      statut: 'cloture',
      clientNom: 'Shoprite Mahajanga', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-003', trajetLibelle: 'Antananarivo → Mahajanga (RN4)', etapes: [],
      origine: 'Antananarivo', destination: 'Mahajanga',
      vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA',
      semiRemorqueId: 'v-sr-2', semiRemorquePlaque: 'RM 4102',
      chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo',
      datePlanifiee: '2026-08-20T05:00:00',
      dateDepartReel: '2026-08-20T05:10:00',
      dateArriveeReelle: '2026-08-20T17:40:00',
      kmReference: 570, kmDepart: 165_780, kmArrivee: 166_352,
      marchandise: { typeProduit: 'Boissons', nombreCartons: 610, poidsChargeKg: 12_200, poidsDechargeKg: 12_180 },
      createdAt: '2026-08-19T11:00:00',
    },
    {
      id: 'VOY-004', reference: 'VOY-2026-0150',
      statut: 'planifie',
      clientNom: 'Leader Price Antsirabe', toleranceEcartPoidsPourcent: 0.5,
      /* Planifié : le destinataire a reçu sa notification et doit encore
         confirmer sa disponibilité depuis son lien de suivi. */
      etapes: [
        {
          id: 'VOY-004-L1', ordre: 1, siteNom: 'Entrepôt Antsirabe centre', destinataire: 'Leader Price Antsirabe',
          adresseLivraison: 'Entrepôt Antsirabe centre',
          lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 0, franchi: false,
          poidsKg: 6000, contenuCommande: '300 cartons de produits alimentaires secs', nombreUnites: 300, produit: 'Produits alimentaires secs', heurePrevue: '2026-09-10T10:15:00',
          notifications: [
            { id: 'NOTIF-004-1', type: 'planification', canal: 'sms', envoyeeLe: '2026-09-04T09:20:00', contenu: 'Votre livraison a été planifiée pour le 10/09/2026. Véhicule 4024 TBA, conducteur Jaona Ratsimbazafy, arrivée estimée le 10/09/2026 vers 10 h 15.' },
          ],
        },
      ],
      origine: 'Entrepôt Antsirabe centre', destination: 'Entrepôt Antsirabe centre',
      vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA',
      semiRemorqueId: 'v-sr-4', semiRemorquePlaque: 'RM 4104',
      chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy',
      datePlanifiee: '2026-09-10T06:30:00', confirmationRequise: true, modeTransport: 'Camion', planifieLe: '2026-09-04T09:20:00',
      kmReference: 168,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 300, poidsChargeKg: 6000 },
      createdAt: '2026-09-04T09:15:00',
    },
    {
      id: 'VOY-005', reference: 'VOY-2026-0146', numeroOT: 'OT-2026-04390',
      statut: 'livre',
      clientNom: 'Shoprite Mahajanga', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-001', trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)', etapes: [],
      origine: 'Antananarivo', destination: 'Toamasina',
      vehiculeId: 'v-tr-4', vehiculePlaque: '4024 TBA',
      semiRemorqueId: 'v-sr-4', semiRemorquePlaque: 'RM 4104',
      chauffeurId: 'p-013', chauffeurNom: 'Jaona Ratsimbazafy',
      datePlanifiee: '2026-08-26T06:00:00',
      dateDepartReel: '2026-08-26T06:22:00',
      dateArriveeReelle: '2026-08-26T14:05:00',
      kmReference: 352, kmDepart: 120_100, kmArrivee: 120_461,
      marchandise: { typeProduit: 'Produits ménagers', nombreCartons: 450, poidsChargeKg: 8800, poidsDechargeKg: 8760 },
      createdAt: '2026-08-25T15:00:00',
    },
    {
      id: 'VOY-006', reference: 'VOY-2026-0145', numeroOT: 'OT-2026-04380',
      statut: 'cloture',
      clientNom: 'Leader Price Antsirabe', toleranceEcartPoidsPourcent: 0.5,
      trajetId: 'TRJ-002', trajetLibelle: 'Antananarivo → Antsirabe (RN7)', etapes: [],
      origine: 'Antananarivo', destination: 'Antsirabe',
      vehiculeId: 'v-tr-5', vehiculePlaque: '4025 TBA',
      semiRemorqueId: 'v-sr-5', semiRemorquePlaque: 'RM 4105',
      chauffeurId: 'p-014', chauffeurNom: 'Fenohery Randriamampionona',
      datePlanifiee: '2026-08-10T06:00:00',
      dateDepartReel: '2026-08-10T06:10:00',
      dateArriveeReelle: '2026-08-10T09:45:00',
      kmReference: 168, kmDepart: 243_400, kmArrivee: 243_568,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 280, poidsChargeKg: 5600, poidsDechargeKg: 5590 },
      createdAt: '2026-08-09T14:00:00',
    },
    {
      id: 'VOY-007', reference: 'VOY-2026-0144', numeroOT: 'OT-2026-04370',
      statut: 'cloture',
      clientNom: 'Jumbo Score Tanjombato', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-001', trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)', etapes: [],
      origine: 'Antananarivo', destination: 'Toamasina',
      vehiculeId: 'v-tr-6', vehiculePlaque: '4026 TBA',
      semiRemorqueId: 'v-sr-6', semiRemorquePlaque: 'RM 4106',
      chauffeurId: 'p-015', chauffeurNom: 'Herizo Rakotondrabe',
      datePlanifiee: '2026-08-18T05:45:00',
      dateDepartReel: '2026-08-18T05:50:00',
      dateArriveeReelle: '2026-08-18T18:30:00',
      kmReference: 352, kmDepart: 176_100, kmArrivee: 176_452,
      marchandise: { typeProduit: 'Boissons', nombreCartons: 590, poidsChargeKg: 11_800, poidsDechargeKg: 11_800 },
      createdAt: '2026-08-17T10:00:00',
    },
    {
      id: 'VOY-008', reference: 'VOY-2026-0143', numeroOT: 'OT-2026-04360',
      statut: 'en_cours',
      clientNom: 'Shoprite Mahajanga', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-003', trajetLibelle: 'Antananarivo → Mahajanga (RN4)', etapes: [],
      origine: 'Antananarivo', destination: 'Mahajanga',
      vehiculeId: 'v-tr-7', vehiculePlaque: '4027 TBA',
      semiRemorqueId: 'v-sr-7', semiRemorquePlaque: 'RM 4107',
      chauffeurId: 'p-016', chauffeurNom: 'Nomena Andriantsoa',
      datePlanifiee: '2026-09-04T05:30:00',
      dateDepartReel: '2026-09-04T05:40:00',
      kmReference: 570, kmDepart: 54_100,
      marchandise: { typeProduit: 'Matériaux de construction', nombreCartons: 210, poidsChargeKg: 9200 },
      createdAt: '2026-09-03T16:00:00',
    },
    {
      id: 'VOY-009', reference: 'VOY-2026-0142', numeroOT: 'OT-2026-04350',
      statut: 'cloture',
      clientNom: 'Leader Price Antsirabe', toleranceEcartPoidsPourcent: 0.5,
      trajetId: 'TRJ-002', trajetLibelle: 'Antananarivo → Antsirabe (RN7)', etapes: [],
      origine: 'Antananarivo', destination: 'Antsirabe',
      vehiculeId: 'v-tr-8', vehiculePlaque: '4028 TBA',
      semiRemorqueId: 'v-sr-8', semiRemorquePlaque: 'RM 4108',
      chauffeurId: 'p-017', chauffeurNom: 'Tsiory Rabearison',
      datePlanifiee: '2026-08-05T06:15:00',
      dateDepartReel: '2026-08-05T06:20:00',
      dateArriveeReelle: '2026-08-05T09:50:00',
      kmReference: 168, kmDepart: 132_500, kmArrivee: 132_668,
      marchandise: { typeProduit: 'Produits ménagers', nombreCartons: 320, poidsChargeKg: 6400, poidsDechargeKg: 6400 },
      createdAt: '2026-08-04T11:00:00',
    },
    {
      id: 'VOY-010', reference: 'VOY-2026-0141', numeroOT: 'OT-2026-04340',
      statut: 'cloture',
      clientNom: 'Jumbo Score Tanjombato', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-001', trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)', etapes: [],
      origine: 'Antananarivo', destination: 'Toamasina',
      vehiculeId: 'v-tr-9', vehiculePlaque: '4029 TBA',
      semiRemorqueId: 'v-sr-9', semiRemorquePlaque: 'RM 4109',
      chauffeurId: 'p-018', chauffeurNom: 'Jean-Luc Razanamalala',
      datePlanifiee: '2026-07-28T06:00:00',
      dateDepartReel: '2026-07-28T06:05:00',
      dateArriveeReelle: '2026-07-28T18:20:00',
      kmReference: 352, kmDepart: 288_700, kmArrivee: 289_052,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 470, poidsChargeKg: 9400, poidsDechargeKg: 9350 },
      createdAt: '2026-07-27T09:00:00',
    },
    {
      id: 'VOY-011', reference: 'VOY-2026-0140', numeroOT: 'OT-2026-04330',
      statut: 'cloture',
      clientNom: 'Shoprite Mahajanga', toleranceEcartPoidsPourcent: 1,
      trajetId: 'TRJ-003', trajetLibelle: 'Antananarivo → Mahajanga (RN4)', etapes: [],
      origine: 'Antananarivo', destination: 'Mahajanga',
      vehiculeId: 'v-tr-10', vehiculePlaque: '4030 TBA',
      semiRemorqueId: 'v-sr-10', semiRemorquePlaque: 'RM 4110',
      chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina',
      datePlanifiee: '2026-08-22T05:30:00',
      dateDepartReel: '2026-08-22T05:35:00',
      dateArriveeReelle: '2026-08-22T17:50:00',
      kmReference: 570, kmDepart: 112_000, kmArrivee: 112_570,
      marchandise: { typeProduit: 'Textile', nombreCartons: 380, poidsChargeKg: 7600, poidsDechargeKg: 7600 },
      createdAt: '2026-08-21T13:00:00',
    },
    /* Exemple de tournée multi-destinataires déjà terminée, telle que
       produite par le module Planification : deux livraisons confirmées, l'une
       avec une réponse déjà reçue à l'enquête de satisfaction, l'autre
       encore en attente - pour montrer les deux états sans manipulation. */
    {
      id: 'VOY-012', reference: 'VOY-2026-0158', numeroOT: 'OT-2026-04430',
      statut: 'livre',
      clientNom: 'Leader Price Antsirabe et 1 autre(s)', toleranceEcartPoidsPourcent: 1,
      etapes: [
        {
          id: 'VOY-012-L1', ordre: 1, siteNom: 'Lot II M 12, Antsirabe', destinataire: 'Leader Price Antsirabe',
          adresseLivraison: 'Lot II M 12, Antsirabe', lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 0, franchi: true, poidsKg: 800,
          commandeId: 'CMD-012', referenceExterne: 'BL-26-10388', nombreUnites: 40, produit: 'Produits alimentaires secs', contenuCommande: '40 cartons de produits alimentaires secs', contenuCharge: '40 cartons de produits alimentaires secs',
          heurePrevue: '2026-09-01T06:25:00', confirmeLe: '2026-08-31T16:10:00', chargementConformeLe: '2026-09-01T06:55:00',
          arriveeLe: '2026-09-01T09:30:00', livreParChauffeurLe: '2026-09-01T09:38:00', receptionConfirmeeClientLe: '2026-09-01T09:40:00',
          quantiteRecue: 40, quantiteConfirmeeClientLe: '2026-09-01T09:40:00',
          eBL: { reference: 'EBL-OT-2026-04430-01', emisLe: '2026-09-01T09:40:00', destinataire: 'Leader Price Antsirabe', adresse: 'Lot II M 12, Antsirabe', produit: 'Produits alimentaires secs', signePar: 'Notiavina R., réceptionniste', quantiteRecue: 40 },
          facturation: { statut: 'facturee', clientId: 'cli-002', montant: 1_800_000, detail: 'Forfait Antananarivo → Antsirabe (RN7)', reference: 'FAC-2026-0912', factureeLe: '2026-09-02T10:00:00', factureePar: 'Hery Andriamalala' },
          satisfactionEnvoyeeLe: '2026-09-01T09:40:00', satisfactionNote: 5, satisfactionCommentaire: 'Livraison à l\'heure, conducteur très courtois.',
          notifications: [
            { id: 'NOTIF-011-1', type: 'planification', canal: 'sms', envoyeeLe: '2026-08-31T15:00:00', contenu: 'Votre livraison a été planifiée pour le 01/09/2026. Véhicule 4028 TBA, conducteur Tsiory Rabearison, arrivée estimée le 01/09/2026 vers 6 h 25.' },
            { id: 'NOTIF-011-2', type: 'demarrage', canal: 'sms', envoyeeLe: '2026-09-01T07:05:00', contenu: 'Votre livraison est en cours. Conducteur Tsiory Rabearison, arrivée estimée vers 7 h 30.' },
            { id: 'NOTIF-011-3', type: 'livraison', canal: 'sms', envoyeeLe: '2026-09-01T09:40:00', contenu: 'Le conducteur déclare avoir effectué votre livraison. Confirmez que vous l\'avez bien reçue, ou signalez un problème, depuis votre lien de suivi.' },
          ],
        },
        {
          id: 'VOY-012-L2', ordre: 2, siteNom: 'Route Circulaire, Antsirabe', destinataire: 'Quincaillerie Centrale Antsirabe',
          adresseLivraison: 'Route Circulaire, Antsirabe', lat: -19.8721, lng: 47.0389, role: 'livraison', intervalleMin: 0, franchi: true, poidsKg: 600,
          nombreUnites: 30, produit: 'Produits alimentaires secs', contenuCommande: '30 cartons de produits alimentaires secs', contenuCharge: '30 cartons de produits alimentaires secs',
          heurePrevue: '2026-09-01T06:40:00', confirmeLe: '2026-08-31T16:30:00', chargementConformeLe: '2026-09-01T06:55:00',
          arriveeLe: '2026-09-01T10:15:00', livreParChauffeurLe: '2026-09-01T10:22:00', receptionConfirmeeClientLe: '2026-09-01T10:25:00',
          quantiteRecue: 29, quantiteConfirmeeClientLe: '2026-09-01T10:25:00',
          eBL: { reference: 'EBL-OT-2026-04430-02', emisLe: '2026-09-01T10:25:00', destinataire: 'Quincaillerie Centrale Antsirabe', adresse: 'Route Circulaire, Antsirabe', produit: 'Produits alimentaires secs', signePar: 'Quincaillerie Centrale Antsirabe', quantiteRecue: 29 },
          ecartQuantite: {
            quantiteChargee: 30, quantiteRecue: 29, ecart: -1, horsTolerance: true, motif: "Écart de -1 (3,33 %), au-delà de l'écart autorisé de 0,5 %.", detecteLe: '2026-09-01T10:22:00',
            qualification: 'coulage', imputableConducteur: false, commentaire: 'Un carton écrasé pendant le transport, retiré par le client.', qualifieLe: '2026-09-01T11:00:00', qualifiePar: 'Hery Andriamalala',
          },
          responsabilite: {
            origine: 'transport', acteur: 'transporteur_interne', commentaire: 'Carton écrasé par un mauvais calage dans la semi-remorque.',
            impacts: [{ type: 'avoir_client', montant: 25_000 }], etablieLe: '2026-09-01T11:15:00', etabliePar: 'Hery Andriamalala',
          },
          satisfactionEnvoyeeLe: '2026-09-01T10:25:00',
          notifications: [
            { id: 'NOTIF-011-4', type: 'livraison', canal: 'sms', envoyeeLe: '2026-09-01T10:25:00', contenu: 'Le conducteur déclare avoir effectué votre livraison. Confirmez que vous l\'avez bien reçue, ou signalez un problème, depuis votre lien de suivi.' },
          ],
        },
      ],
      origine: 'Lot II M 12, Antsirabe', destination: 'Route Circulaire, Antsirabe',
      vehiculeId: 'v-tr-8', vehiculePlaque: '4028 TBA',
      semiRemorqueId: 'v-sr-8', semiRemorquePlaque: 'RM 4108',
      chauffeurId: 'p-017', chauffeurNom: 'Tsiory Rabearison',
      datePlanifiee: '2026-09-01T06:00:00', modeTransport: 'Camion', confirmationRequise: true,
      trajetId: 'TRJ-002', trajetLibelle: 'Antananarivo → Antsirabe (RN7)',
      planTrajet: [
        { id: 'VOY-012-P1', siteNom: 'Dépôt Tanjombato', ordre: 1, lat: -18.8792, lng: 47.5079, role: 'depart', intervalleMin: 0 },
        { id: 'VOY-012-P2', siteNom: 'Station Ambatolampy', ordre: 2, lat: -19.3833, lng: 47.4167, role: 'controle', intervalleMin: 95 },
        { id: 'VOY-012-P3', siteNom: 'Entrepôt Antsirabe centre', ordre: 3, lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 75 },
      ],
      planifieLe: '2026-08-31T15:00:00', confirmeLe: '2026-08-31T16:30:00',
      chargementEntrepotLe: '2026-09-01T06:40:00', chargementChauffeurLe: '2026-09-01T06:55:00',
      dateDepartReel: '2026-09-01T07:05:00',
      dateArriveeReelle: '2026-09-01T10:25:00',
      kmReference: 30,
      debriefing: {
        numeroBon: 'OT-2026-04430', dateChargement: '2026-09-01T06:40', dateDechargement: '2026-09-01T10:25',
        lieu: 'Lot II M 12, Antsirabe ; Route Circulaire, Antsirabe', vehicule: '4028 TBA', citerne: 'RM 4108',
        gainOuCoulage: 'Coulage de 1 carton chez Quincaillerie Centrale Antsirabe, non imputable au conducteur',
        observations: "Départ retardé d'une heure : attente au quai de chargement.", enregistreeLe: '2026-09-01T11:00:00', enregistreePar: 'Hery Andriamalala',
      },
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 0, poidsChargeKg: 1400 },
      createdAt: '2026-09-01T05:30:00',
    },
    /* Exemple prêt à confirmer côté client : le chauffeur est déjà
       arrivé sur place, il ne manque plus que la confirmation du
       destinataire - directement testable via son lien de suivi,
       sans manipulation préalable. */
    {
      id: 'VOY-013', reference: 'VOY-2026-0159', numeroOT: 'OT-2026-04440',
      statut: 'en_cours',
      clientNom: 'Super U Toamasina', toleranceEcartPoidsPourcent: 1,
      etapes: [
        {
          id: 'VOY-013-L1', ordre: 1, siteNom: 'Boulevard Joffre, Toamasina', destinataire: 'Super U Toamasina',
          adresseLivraison: 'Boulevard Joffre, Toamasina', lat: -18.1492, lng: 49.4023, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 2200,
          nombreUnites: 110, produit: 'Boissons', heurePrevue: '2026-09-24T06:20:00',
          arriveeLe: '2026-09-24T09:15:00',
          notifications: [
            { id: 'NOTIF-013-1', type: 'planification', canal: 'sms', envoyeeLe: '2026-09-24T06:00:00', contenu: 'Votre livraison a été planifiée pour le 24/09/2026. Véhicule 4026 TBA, conducteur Herizo Rakotondrabe, arrivée estimée le 24/09/2026 vers 6 h 20.' },
            { id: 'NOTIF-013-2', type: 'demarrage', canal: 'sms', envoyeeLe: '2026-09-24T08:50:00', contenu: 'Votre livraison est en cours. Conducteur Herizo Rakotondrabe, arrivée estimée vers 9 h 10.' },
          ],
        },
      ],
      origine: 'Dépôt Toamasina', destination: 'Boulevard Joffre, Toamasina',
      vehiculeId: 'v-tr-6', vehiculePlaque: '4026 TBA',
      semiRemorqueId: 'v-sr-6', semiRemorquePlaque: 'RM 4106',
      chauffeurId: 'p-015', chauffeurNom: 'Herizo Rakotondrabe',
      datePlanifiee: '2026-09-24T06:00:00',
      dateDepartReel: '2026-09-24T08:50:00',
      kmReference: 15, modeTransport: 'Camion',
      marchandise: { typeProduit: 'Boissons', nombreCartons: 0, poidsChargeKg: 2200 },
      createdAt: '2026-09-24T05:30:00',
    },
    /* Expédition confiée à un transporteur externe, en cours : la première
       livraison est déclarée, la seconde est en retard sur l'heure prévue.
       L'itinéraire a été modifié en route, et la facture du transporteur
       attend son contrôle face au tarif convenu. */
    {
      id: 'VOY-014', reference: 'VOY-2026-0160', numeroOT: 'OT-2026-04445',
      statut: 'en_cours', confirmationRequise: true,
      clientNom: 'Leader Price Antsirabe et 1 autre(s)', toleranceEcartPoidsPourcent: 1,
      moyen: 'externe', transporteurId: 'PRS-016', transporteurNom: 'Transports Rapides Analamanga',
      vehiculeTransporteurId: 'VTR-001', vehiculeTransporteurPlaque: '5120 TBB', conducteurTransporteurId: 'CTR-T-001', conducteurTransporteurNom: 'Solofo Randrianarisoa',
      modeTransport: 'Camion', trajetId: 'TRJ-002', trajetLibelle: 'Antananarivo → Antsirabe (RN7)',
      planTrajet: [
        { id: 'VOY-014-P1', siteNom: 'Dépôt Tanjombato', ordre: 1, lat: -18.8792, lng: 47.5079, role: 'depart', intervalleMin: 0 },
        { id: 'VOY-014-P2', siteNom: 'Station Ambatolampy', ordre: 2, lat: -19.3833, lng: 47.4167, role: 'controle', intervalleMin: 95 },
        { id: 'VOY-014-P3', siteNom: 'Entrepôt Antsirabe centre', ordre: 3, lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 75 },
      ],
      historiqueItineraire: [{
        le: '2026-09-04T07:20:00', par: 'Hery Andriamalala', motif: 'Route secondaire coupée après Behenjy : reprise par la RN7.',
        ancienLibelle: 'Itinéraire composé pour ce voyage', ancienPlan: [], nouveauTrajetId: 'TRJ-002', nouveauLibelle: 'Antananarivo → Antsirabe (RN7)',
      }],
      etapes: [
        {
          id: 'VOY-014-L1', ordre: 1, siteNom: 'Lot II M 12, Antsirabe', destinataire: 'Leader Price Antsirabe',
          adresseLivraison: 'Lot II M 12, Antsirabe', lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 0, franchi: true, poidsKg: 3000,
          nombreUnites: 200, produit: 'Produits ménagers', contenuCommande: '200 cartons de produits ménagers', contenuCharge: '200 cartons de produits ménagers',
          articles: [{ id: 'VOY-014-L1-A1', libelle: '200 cartons de produits ménagers', statut: 'livre' }],
          heurePrevue: '2026-09-04T08:45:00', confirmeLe: '2026-09-03T16:00:00', chargementConformeLe: '2026-09-04T06:30:00',
          arriveeLe: '2026-09-04T09:40:00', livreParChauffeurLe: '2026-09-04T10:05:00', quantiteRecue: 200,
          eBL: { reference: 'EBL-OT-2026-04445-01', emisLe: '2026-09-04T10:05:00', destinataire: 'Leader Price Antsirabe', adresse: 'Lot II M 12, Antsirabe', produit: '200 cartons de produits ménagers', quantiteRecue: 200 },
          notifications: [
            { id: 'NOTIF-014-1', type: 'planification', canal: 'email', envoyeeLe: '2026-09-03T15:00:00', contenu: 'Votre livraison a été planifiée pour le 04/09/2026. Véhicule 5120 TBB (Transports Rapides Analamanga), conducteur Solofo Randrianarisoa, arrivée estimée le 04/09/2026 vers 8 h 45.' },
            { id: 'NOTIF-014-2', type: 'demarrage', canal: 'email', envoyeeLe: '2026-09-04T06:35:00', contenu: 'Votre livraison est en cours. Conducteur Solofo Randrianarisoa, arrivée estimée vers 8 h 45.' },
            { id: 'NOTIF-014-3', type: 'livraison', canal: 'email', envoyeeLe: '2026-09-04T10:05:00', contenu: "Le conducteur déclare avoir effectué votre livraison. Confirmez que vous l'avez bien reçue, ou signalez un problème, depuis votre lien de suivi." },
          ],
        },
        {
          id: 'VOY-014-L2', ordre: 2, siteNom: 'Route Circulaire, Antsirabe', destinataire: 'Quincaillerie Centrale Antsirabe',
          adresseLivraison: 'Route Circulaire, Antsirabe', lat: -19.8721, lng: 47.0389, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 2200,
          nombreUnites: 140, produit: 'Produits ménagers', contenuCommande: '140 cartons de produits ménagers', contenuCharge: '140 cartons de produits ménagers',
          articles: [{ id: 'VOY-014-L2-A1', libelle: '140 cartons de produits ménagers' }],
          heurePrevue: '2026-09-04T09:00:00', confirmeLe: '2026-09-03T16:20:00', chargementConformeLe: '2026-09-04T06:30:00',
          notifications: [
            { id: 'NOTIF-014-4', type: 'planification', canal: 'sms', envoyeeLe: '2026-09-03T15:00:00', contenu: 'Votre livraison a été planifiée pour le 04/09/2026. Véhicule 5120 TBB (Transports Rapides Analamanga), conducteur Solofo Randrianarisoa, arrivée estimée le 04/09/2026 vers 9 h 00.' },
            { id: 'NOTIF-014-5', type: 'demarrage', canal: 'sms', envoyeeLe: '2026-09-04T06:35:00', contenu: 'Votre livraison est en cours. Conducteur Solofo Randrianarisoa, arrivée estimée vers 9 h 00.' },
          ],
        },
      ],
      origine: 'Lot II M 12, Antsirabe', destination: 'Route Circulaire, Antsirabe',
      datePlanifiee: '2026-09-04T06:00:00', planifieLe: '2026-09-03T15:00:00', confirmeLe: '2026-09-03T16:20:00',
      chargementEntrepotLe: '2026-09-04T06:10:00', chargementChauffeurLe: '2026-09-04T06:30:00',
      dateDepartReel: '2026-09-04T06:35:00',
      kmReference: 168,
      marchandise: { typeProduit: 'Produits ménagers', nombreCartons: 340, poidsChargeKg: 5200 },
      notificationsChauffeur: [{ le: '2026-09-03T15:00:00', message: 'Une expédition est confiée à Transports Rapides Analamanga : OT-2026-04445, le 04/09/2026, véhicule 5120 TBB, 2 livraison(s).' }],
      factureTransporteur: { reference: 'TRA-F-0931', montantFacture: 620_000, saisieLe: '2026-09-04T08:00:00', saisiePar: 'Hery Andriamalala', statut: 'a_controler' },
      createdAt: '2026-09-03T14:00:00',
    },
    /* Ordre resté en attente au-delà de sa date prévue : il apparaît expiré. */
    {
      id: 'VOY-015', reference: 'VOY-2026-0161',
      statut: 'en_attente', confirmationRequise: true,
      clientNom: 'Super U Toamasina', toleranceEcartPoidsPourcent: 1,
      etapes: [{
        id: 'VOY-015-L1', ordre: 1, siteNom: 'Boulevard Joffre, Toamasina', destinataire: 'Super U Toamasina',
        adresseLivraison: 'Boulevard Joffre, Toamasina', lat: -18.1492, lng: 49.4023, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 1800,
        nombreUnites: 90, produit: 'Boissons', contenuCommande: '90 cartons de boissons',
      }],
      origine: 'Boulevard Joffre, Toamasina', destination: 'Boulevard Joffre, Toamasina',
      vehiculeId: 'v-tr-2', vehiculePlaque: '4022 TBA', semiRemorqueId: 'v-sr-2', semiRemorquePlaque: 'RM 4102',
      chauffeurId: 'p-011', chauffeurNom: 'Mamy Andrianaivo',
      datePlanifiee: '2026-09-02T07:00:00', modeTransport: 'Camion',
      kmReference: 15,
      marchandise: { typeProduit: 'Boissons', nombreCartons: 90, poidsChargeKg: 1800 },
      createdAt: '2026-08-30T10:00:00',
    },
    /* Livraison de carburant : une tournée validée avec ses bons, une tournée en cours. */
    ...(JSON.parse(JSON.stringify(VOYAGES_CARBURANT_DEMO)) as Voyage[]),
  ]

  /** Persisté dans le stockage local du navigateur, partagé entre tous
   *  les onglets d'une même origine : sans cela, un onglet ouvert
   *  depuis un lien de suivi envoyé à un destinataire ne verrait
   *  jamais les ordres créés dans un autre onglet, chacun repartant
   *  sinon des seules données de démonstration. Cette maquette reste
   *  entièrement côté client - aucun serveur ni base de données
   *  réels - mais au moins les onglets d'un même navigateur se voient
   *  entre eux, comme s'ils partageaient un même poste de travail. */
  const CLE_STOCKAGE = 'fms-ucodis-voyages'
  function chargerDepuisStockage(): Voyage[] {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE)
      if (!brut) return SEED_VOYAGES
      const parse = JSON.parse(brut)
      return Array.isArray(parse) && parse.length ? migrer(parse) : SEED_VOYAGES
    } catch {
      return SEED_VOYAGES
    }
  }

  /** Reprise des données enregistrées avant l'alignement sur les huit
   *  statuts : « en litige » et « affecté » n'existent plus. Les exemples
   *  de démonstration devenus incohérents reprennent leur version actuelle. */
  function migrer(liste: Voyage[]): Voyage[] {
    return liste.map((v): Voyage => {
      const statut = v.statut as string
      const seed = SEED_VOYAGES.find(x => x.id === v.id)
      const perime = seed && (
        statut === 'litige'
        || (v.id === 'VOY-004' && !v.etapes.some(e => e.destinataire))
        || v.etapes.some(e => e.notifications?.some(n => n.contenu.includes('signature électronique') || n.contenu.includes('Contact :') || /environ \d+ min/.test(n.contenu))))
      if (perime) return JSON.parse(JSON.stringify(seed)) as Voyage
      if (statut === 'litige') return { ...v, statut: 'livre' }
      if (statut === 'affecte') return { ...v, statut: 'planifie' }
      /* Anciens libellés des modes de transport. */
      const ANCIENS_MODES: Record<string, string> = { Routier: 'Camion', Ferroviaire: 'Train', Maritime: 'Bateau', 'Aérien': 'Avion' }
      if (v.modeTransport && ANCIENS_MODES[v.modeTransport]) return { ...v, modeTransport: ANCIENS_MODES[v.modeTransport] }
      return v
    }).concat(SEED_VOYAGES.filter(s => !liste.some(v => v.id === s.id)).map(s => JSON.parse(JSON.stringify(s)) as Voyage))
  }

  const voyages = ref<Voyage[]>(chargerDepuisStockage())

  function sauvegarder() {
    try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(voyages.value)) } catch { /* stockage indisponible, tant pis pour la persistance */ }
  }
  watch(voyages, sauvegarder, { deep: true })

  /** Un autre onglet vient d'écrire : on relit pour refléter ses
   *  changements ici aussi, sans avoir à recharger la page. */
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === CLE_STOCKAGE && e.newValue) {
        try { voyages.value = JSON.parse(e.newValue) } catch { /* valeur illisible, on garde l'état actuel */ }
      }
    })
  }

  /** Efface tout ce qui a été créé pendant la démonstration et revient
   *  au jeu de données d'origine, dans cet onglet comme dans les
   *  autres déjà ouverts. */
  function reinitialiser() {
    voyages.value = JSON.parse(JSON.stringify(SEED_VOYAGES))
  }


  /* Hydratation : chaque voyage reçoit une COPIE des étapes de son trajet de
     référence, jamais une simple référence · modifier un trajet ne doit pas
     altérer rétroactivement les voyages déjà clôturés. */
  {
    const trajetsStore = useTrajetsStore()
    voyages.value.forEach(v => {
      if (v.etapes.length === 0 && v.trajetId && !v.planTrajet) {
        const t = trajetsStore.getById(v.trajetId)
        if (t) v.etapes = t.etapes.map((e, i) => ({
          ...e, id: `${v.id}-${e.id}`,
          franchi: v.statut === 'cloture' || v.statut === 'livre' || (v.statut === 'en_cours' && i < 2),
        }))
      }
    })
  }

  const documents = ref<DocumentVoyage[]>([
    { id: 'DOC-001', voyageId: 'VOY-001', type: 'ordre_transport', numero: 'OT-2026-04412', emetteur: 'Responsable Flotte', date: '2026-08-23', obligatoire: true, present: true },
    { id: 'DOC-002', voyageId: 'VOY-001', type: 'bon_chargement', numero: 'BC-88204', emetteur: 'Équipe dépôt', date: '2026-08-24', obligatoire: true, present: true },
    { id: 'DOC-003', voyageId: 'VOY-001', type: 'feuille_route', numero: 'FR-0148', emetteur: 'Responsable Flotte', date: '2026-08-24', obligatoire: true, present: true },
    { id: 'DOC-004', voyageId: 'VOY-001', type: 'bon_livraison', numero: 'BL-33917', emetteur: 'Jumbo Score Tanjombato', date: '2026-08-24', obligatoire: true, present: true },
    { id: 'DOC-005', voyageId: 'VOY-001', type: 'note_reserve', numero: 'NR-2026-071', emetteur: 'Jumbo Score Tanjombato', date: '2026-08-24', obligatoire: false, present: true },

    { id: 'DOC-006', voyageId: 'VOY-002', type: 'ordre_transport', numero: 'OT-2026-04418', emetteur: 'Responsable Flotte', date: '2026-09-02', obligatoire: true, present: true },
    { id: 'DOC-007', voyageId: 'VOY-002', type: 'bon_chargement', numero: 'BC-88251', emetteur: 'Équipe dépôt', date: '2026-09-03', obligatoire: true, present: true },
    { id: 'DOC-008', voyageId: 'VOY-002', type: 'feuille_route', numero: 'FR-0149', emetteur: 'Responsable Flotte', date: '2026-09-03', obligatoire: true, present: true },
    { id: 'DOC-009', voyageId: 'VOY-002', type: 'bon_livraison', obligatoire: true, present: false },

    { id: 'DOC-010', voyageId: 'VOY-005', type: 'ordre_transport', numero: 'OT-2026-04390', emetteur: 'Responsable Flotte', date: '2026-08-25', obligatoire: true, present: true },
    { id: 'DOC-011', voyageId: 'VOY-005', type: 'bon_chargement', numero: 'BC-88180', emetteur: 'Équipe dépôt', date: '2026-08-26', obligatoire: true, present: true },
    { id: 'DOC-012', voyageId: 'VOY-005', type: 'feuille_route', numero: 'FR-0146', emetteur: 'Responsable Flotte', date: '2026-08-26', obligatoire: true, present: true },
    { id: 'DOC-013', voyageId: 'VOY-005', type: 'bon_livraison', numero: 'BL-33902', emetteur: 'Shoprite Mahajanga', date: '2026-08-26', obligatoire: true, present: true },
  ])

  const getById = (id: string) => voyages.value.find(v => v.id === id)

  /** Retrouve une ligne de livraison n'importe où dans le parc, à
   *  partir du seul identifiant de la ligne : c'est la clé du lien de
   *  suivi envoyé au destinataire, qui n'a pas de compte dans le
   *  système et ne connaît donc pas l'identifiant de la tournée. */
  function trouverLigne(etapeId: string): { voyage: Voyage; etape: EtapeVoyage } | null {
    for (const voyage of voyages.value) {
      const etape = voyage.etapes.find(e => e.id === etapeId)
      if (etape) return { voyage, etape }
    }
    return null
  }

  /** Un véhicule déjà engagé sur un autre ordre non terminé n'est pas
   *  disponible pour un nouvel ordre : la planification ne le déduit
   *  jamais sans vérifier qu'il n'est pas déjà pris ailleurs. */
  /** Un ordre mobilise son véhicule et son chauffeur tant qu'il n'est ni
   *  terminé, ni clôturé, ni annulé : y compris aux statuts Confirmé et Prêt
   *  pour exécution, où le camion est en cours de chargement. */
  function engageVehiculeEtChauffeur(v: Voyage) {
    return !['livre', 'cloture', 'annule'].includes(v.statut)
  }

  /** Une semi-remorque déjà portée par un autre ordre non terminé. */
  function remorqueOccupee(semiRemorqueId: string, ignorerVoyageId?: string): Voyage | null {
    return voyages.value.find(v =>
      v.id !== ignorerVoyageId && (v.semiRemorqueId === semiRemorqueId || !!v.carburant?.camions.some(c => c.citerneId === semiRemorqueId)) && engageVehiculeEtChauffeur(v)) ?? null
  }

  /** Planifier, annuler et clôturer : réservés aux rôles habilités dans les
   *  paramètres de planification, jamais à la direction (lecture seule). */
  function habilite(): boolean {
    return useParametresPlanificationStore().peutPiloter(useAuthStore().role)
  }
  const MOTIF_NON_HABILITE = `Votre rôle n'est pas habilité à planifier, annuler ou clôturer une tournée.`
  const MOTIF_CHARGEMENT_NON_HABILITE = `Votre rôle n'est pas habilité à déclarer le chargement.`
  const parQui = () => useAuthStore().user?.nom ?? ''
  /** Erreur de saisie corrigée sur une livraison : tracée avec son auteur, sa date et son motif. */
  function tracer(e: EtapeVoyage, action: string, motif?: string) {
    ;(e.corrections ??= []).push({ le: maintenant().toISOString(), par: parQui(), action, motif: motif?.trim() || undefined })
  }

  /* ── Autorisation de départ (lien avec la Flotte) : exigée avant la première
     arrivée quand l'écran Départs est actif ; demandée d'elle-même dès que la
     tournée est prête pour exécution. Un transporteur externe n'en a pas. ── */
  function departExige(v: Voyage) {
    return v.moyen !== 'externe' && useParametresModulesStore().estActif('departs')
  }
  function autorisationDe(v: Voyage) {
    return [...useDepartsStore().autorisations.filter(a => a.voyageId === v.id)].sort((a, b) => b.demandeeLe.localeCompare(a.demandeeLe))[0]
  }
  /** État de l'autorisation de départ d'une tournée prête ou partie : à demander, en attente, accordée, refusée (avec sa raison). */
  function etatAutorisationDepart(v: Voyage): { etat: 'a_demander' | 'en_attente' | 'accordee' | 'refusee'; libelle: string; motif?: string } | null {
    if (!departExige(v) || !['pret', 'en_cours'].includes(v.statut)) return null
    const a = autorisationDe(v)
    if (useDepartsStore().autorisations.some(x => x.voyageId === v.id && x.accordee)) return { etat: 'accordee', libelle: 'Autorisation de départ accordée' }
    if (!a) return { etat: 'a_demander', libelle: 'Autorisation de départ à demander' }
    if (!a.decideLe) return { etat: 'en_attente', libelle: 'Autorisation de départ en attente de décision' }
    return { etat: 'refusee', libelle: 'Autorisation de départ refusée', motif: a.motifRefus }
  }
  function demanderAutorisationDepart(id: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (!departExige(v)) return { ok: false, motif: "Cette tournée n'a pas besoin d'autorisation de départ." }
    if (v.statut !== 'pret') return { ok: false, motif: "L'autorisation de départ se demande quand la tournée est prête pour exécution." }
    return useDepartsStore().demander(v.id, parQui())
  }

  function vehiculeOccupe(vehiculeId: string, ignorerVoyageId?: string): Voyage | null {
    return voyages.value.find(v =>
      v.id !== ignorerVoyageId && (v.vehiculeId === vehiculeId || !!v.carburant?.camions.some(c => c.vehiculeId === vehiculeId)) && engageVehiculeEtChauffeur(v)) ?? null
  }

  /** Un chauffeur n'est jamais retenu sans vérification, pour quelque
   *  motif que ce soit : en congé ou en absence approuvée à la date
   *  prévue, ou déjà engagé comme chauffeur sur un autre ordre non
   *  terminé, même avec un véhicule différent. La planification doit
   *  le signaler pour qu'un autre chauffeur soit choisi à la main
   *  plutôt que de l'affecter malgré tout. */
  function chauffeurIndisponible(personnelId: string, dateISO: string | undefined, ignorerVoyageId?: string): string | null {
    const dejaEngage = voyages.value.find(v =>
      v.id !== ignorerVoyageId && (v.chauffeurId === personnelId || !!v.carburant?.camions.some(c => c.chauffeurId === personnelId)) && engageVehiculeEtChauffeur(v))
    if (dejaEngage) return `déjà engagé sur l'ordre ${dejaEngage.numeroOT || dejaEngage.reference}`
    if (!dateISO) return null
    const absences = useAbsenceStore()
    const date = dateISO.slice(0, 10)
    const absence = absences.absencesLe(date).find(a => a.personnelId === personnelId)
    return absence ? absence.type.toLowerCase() : null
  }

  const enCours = computed(() => voyages.value.filter(v => v.statut === 'en_cours'))
  const aCloturer = computed(() => voyages.value.filter(v => v.statut === 'livre'))

  const documentsDuVoyage = (voyageId: string) => documents.value.filter(d => d.voyageId === voyageId)

  /** Complétude du dossier documentaire · conditionne la clôture. Seuls
   *  comptent les documents réellement prévus sur ce voyage : un ordre créé
   *  dans la Planification n'a aucun document saisi à la main, son dossier
   *  se constitue de lui-même (ordre, liste de chargement, bons de livraison). */
  function completudeDossier(voyageId: string) {
    const docs = documentsDuVoyage(voyageId)
    const prevus = DOCS_OBLIGATOIRES.filter(t => docs.some(d => d.type === t && d.obligatoire))
    const manquants = prevus.filter(t => !docs.some(d => d.type === t && d.present))
    return {
      total: prevus.length,
      presents: prevus.length - manquants.length,
      manquants,
      complet: manquants.length === 0,
      pct: prevus.length ? Math.round(((prevus.length - manquants.length) / prevus.length) * 100) : 100,
    }
  }

  const ecartPoids = (voyageId: string) => { const v = getById(voyageId); return v ? calculerEcartPoids(v) : null }
  const ecartKm = (voyageId: string) => { const v = getById(voyageId); return v ? calculerEcartKm(v, useConfigTypesEcartStore().reglage('ecart_kilometrique')?.seuilValeur ?? Infinity) : null }

  let prochainId = voyages.value.reduce((m, v) => Math.max(m, Number(/^VOY-perso-(\d+)$/.exec(v.id)?.[1] ?? 0)), voyages.value.length) + 1
  function creer(saisie: Omit<Voyage, 'id' | 'reference' | 'createdAt' | 'etapes'> & { etapesPersonnalisees?: EtapeVoyage[] }) {
    const trajetsStore = useTrajetsStore()
    const { etapesPersonnalisees, ...donneesVoyage } = saisie
    const t = donneesVoyage.trajetId ? trajetsStore.getById(donneesVoyage.trajetId) : null
    const etapes = etapesPersonnalisees?.length
      ? etapesPersonnalisees.map(e => ({ ...e, id: `VOY-perso-${prochainId}-${e.id}` }))
      : t ? t.etapes.map(e => ({ ...e, id: `VOY-perso-${prochainId}-${e.id}`, franchi: false })) : []
    const id = `VOY-perso-${prochainId}`
    const numero = 150 + prochainId
    prochainId++
    voyages.value.unshift({
      ...donneesVoyage, id, etapes,
      reference: `VOY-2026-${String(numero).padStart(4, '0')}`,
      createdAt: aujourdhuiISO(),
    })
    return id
  }

  /** Une livraison qui exige une pompe ne part qu'avec un véhicule (tracteur
   *  ou semi-remorque attelée) équipé d'une pompe opérationnelle. */
  function controlePompe(vehiculeId: string | undefined, etapes: EtapeVoyage[]): { ok: boolean; motif?: string } {
    const exigees = etapes.filter(e => e.role === 'livraison' && e.pompeExigee)
    if (!exigees.length || !vehiculeId) return { ok: true }
    const vehicules = useVehiculeStore()
    const at = vehicules.attelageActif(vehiculeId)
    if (vehicules.aPompe(vehiculeId) || (at && vehicules.aPompe(at.semiRemorqueId))) return { ok: true }
    const plaque = vehicules.parId(vehiculeId)?.immatriculation ?? 'Ce véhicule'
    return { ok: false, motif: `${plaque} n'a pas de pompe opérationnelle, exigée pour la livraison à ${exigees.map(e => e.siteNom).join(', ')}.` }
  }

  /** Création d'un voyage depuis la fenêtre de création : le véhicule doit
   *  répondre aux exigences des livraisons (pompe). */
  function creerVoyage(saisie: Parameters<typeof creer>[0]): { ok: boolean; motif?: string; id?: string } {
    const trajet = saisie.trajetId ? useTrajetsStore().getById(saisie.trajetId) : null
    const etapes = saisie.etapesPersonnalisees?.length ? saisie.etapesPersonnalisees : (trajet?.etapes.map(e => ({ ...e, franchi: false })) ?? [])
    const pompe = controlePompe(saisie.vehiculeId, etapes)
    if (!pompe.ok) return pompe
    /* Mêmes vérifications que la Planification : véhicule non engagé, conducteur disponible. */
    if (saisie.vehiculeId && vehiculeOccupe(saisie.vehiculeId)) return { ok: false, motif: `${saisie.vehiculePlaque ?? 'Ce véhicule'} est déjà engagé sur un autre ordre.` }
    if (saisie.semiRemorqueId && remorqueOccupee(saisie.semiRemorqueId)) return { ok: false, motif: `La semi-remorque ${saisie.semiRemorquePlaque ?? ''} est déjà engagée sur un autre ordre.` }
    if (saisie.chauffeurId) {
      const indispo = chauffeurIndisponible(saisie.chauffeurId, saisie.datePlanifiee)
      if (indispo) return { ok: false, motif: `${saisie.chauffeurNom ?? 'Le conducteur'} n'est pas disponible (${indispo}) : affectez un autre conducteur au véhicule.` }
    }
    const id = creer(saisie)
    const v = getById(id)!
    /* Un voyage créé planifié ne reste pas bloqué en Planifié : sans confirmation
     * demandée aux destinataires, il passe confirmé comme une tournée sans destinataire. */
    if (v.statut === 'planifie') {
      v.planifieLe = maintenant().toISOString()
      if (v.confirmationRequise === false) { v.statut = 'confirme'; v.confirmeLe = v.planifieLe }
      else reevaluerConfirmation(v)
    }
    return { ok: true, id }
  }

  function changerStatut(id: string, statut: StatutVoyage) {
    const v = getById(id)
    if (v) v.statut = statut
  }

  /* ══════════════════════════════════════════════════════════
     Planification - cycle de vie Kanban de l'ordre de transport.
     En attente → Planifié → En cours → Terminé, avec Annulé
     atteignable depuis Planifié (refus chauffeur) à tout moment.
     Le statut Terminé correspond à « livre » : la clôture propre-
     ment dite (kilométrage retour, dossier documentaire) reste un
     second temps, déjà géré par cloturer() ci-dessous.
     ══════════════════════════════════════════════════════════ */
  const enAttente = computed(() => voyages.value.filter(v => v.statut === 'en_attente'))
  const planifies = computed(() => voyages.value.filter(v => v.statut === 'planifie'))
  const confirmes = computed(() => voyages.value.filter(v => v.statut === 'confirme'))
  const prets = computed(() => voyages.value.filter(v => v.statut === 'pret'))
  const enCoursKanban = computed(() => voyages.value.filter(v => v.statut === 'en_cours'))
  const enAttenteCloture = computed(() => voyages.value.filter(v => v.statut === 'livre'))
  const clotures = computed(() => voyages.value.filter(v => v.statut === 'cloture'))
  const annules = computed(() => voyages.value.filter(v => v.statut === 'annule'))

  /** Résume les destinataires des lignes d'une tournée pour l'affichage
   *  d'ensemble : jamais un client unique porté par l'ordre lui-même,
   *  seulement un résumé calculé à partir de ses lignes. */
  function resumeDestinataires(etapes: EtapeVoyage[]): string {
    const noms = [...new Set(etapes.map(e => e.destinataire).filter((n): n is string => !!n))]
    if (!noms.length) return etapes.length ? 'Transferts internes' : 'Aucune ligne'
    if (noms.length === 1) return noms[0]!
    return `${noms[0]} et ${noms.length - 1} autre(s)`
  }

  /** Marchandise de l'ordre : jamais saisie, calculée à partir des produits
   *  (à défaut du contenu) des lignes encore dans la tournée. */
  function marchandiseDe(etapes: EtapeVoyage[]): string {
    return [...new Set(etapes.filter(dansLaTournee).map(e => e.produit || e.contenuCommande).filter((x): x is string => !!x))].join(', ')
  }

  /** Tolérance d'écart de poids (en %) lue dans les écarts autorisés : celle
   *  du client et du produit si elle est en pourcentage, sinon celle de l'entreprise. */
  function tolerancePoids(client?: string, produit?: string): number {
    const ctrl = useControlesTransportStore()
    const t = ctrl.toleranceFor(client, produit)
    if (t.unite === 'pourcent') return t.valeur
    const e = ctrl.toleranceEntreprise()
    return e?.unite === 'pourcent' ? e.valeur : 0
  }

  /** Message au conducteur quand une tournée lui est confiée : le détail de
   *  ses livraisons, destinataire et adresse, dans l'ordre de passage. */
  function detailLivraisons(v: Voyage): string {
    const lignes = v.etapes.filter(dansLaTournee).sort((a, b) => a.ordre - b.ordre)
    const detail = lignes.map((e, i) => `${i + 1}. ${e.destinataire ?? e.siteNom}, ${e.adresseLivraison ?? e.siteNom}`).join(' ; ')
    return `${lignes.length} livraison(s)${detail ? ` : ${detail}` : ''}`
  }
  function messageTourneeConfiee(v: Voyage): string {
    return `Une tournée vous est confiée : ${v.numeroOT || v.reference}, le ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')}, véhicule ${v.vehiculePlaque ?? '-'}, ${detailLivraisons(v)}.`
  }

  /** Création rapide d'un ordre de transport : seuls véhicule et date
   *  prévue sont exigés, sans aucune ligne. Les lignes de livraison se
   *  définissent dans un second temps, une fois l'ordre ouvert en
   *  fiche - jamais un client unique porté par l'ordre lui-même. */
  function creerRapide(saisie: {
    vehiculeId?: string; vehiculePlaque?: string; chauffeurId?: string; chauffeurNom?: string
    semiRemorqueId?: string; semiRemorquePlaque?: string; datePlanifiee: string
    numeroOT?: string; typeProduit?: string; confirmationRequise?: boolean
    moyen?: 'propres' | 'externe'; transporteurId?: string; vehiculeTransporteurId?: string; conducteurTransporteurId?: string
    modeTransport?: string; trajetId?: string
  }) {
    const id = creer({
      statut: 'en_attente',
      clientNom: 'Aucune ligne',
      toleranceEcartPoidsPourcent: tolerancePoids(undefined, saisie.typeProduit),
      origine: '-', destination: '-',
      vehiculeId: saisie.vehiculeId || undefined, vehiculePlaque: saisie.vehiculePlaque || undefined,
      chauffeurId: saisie.chauffeurId, chauffeurNom: saisie.chauffeurNom,
      semiRemorqueId: saisie.semiRemorqueId, semiRemorquePlaque: saisie.semiRemorquePlaque,
      datePlanifiee: saisie.datePlanifiee, numeroOT: saisie.numeroOT,
      kmReference: 0, confirmationRequise: saisie.confirmationRequise ?? true,
      marchandise: { typeProduit: saisie.typeProduit ?? '', nombreCartons: 0, poidsChargeKg: 0 },
      moyen: saisie.moyen ?? 'propres', modeTransport: saisie.modeTransport,
    })
    const v = getById(id)!
    if (saisie.moyen === 'externe') appliquerTransporteur(v, saisie.transporteurId, saisie.vehiculeTransporteurId, saisie.conducteurTransporteurId)
    if (saisie.trajetId) appliquerTrajet(v, saisie.trajetId)
    return id
  }

  /* ══════════════════════════════════════════════════════════
     Moyens de l'expédition : nos véhicules ou un transporteur externe,
     mode de transport et trajet de référence.
     ══════════════════════════════════════════════════════════ */
  /** Véhicule et conducteur tels qu'on les annonce, quels que soient les moyens. */
  function moyensDe(v: Voyage): { vehicule: string; conducteur: string } {
    if (v.moyen === 'externe') return {
      vehicule: v.vehiculeTransporteurPlaque ? `${v.vehiculeTransporteurPlaque} (${v.transporteurNom ?? 'transporteur externe'})` : (v.transporteurNom ?? 'transporteur externe'),
      conducteur: v.conducteurTransporteurNom ?? 'à préciser par le transporteur',
    }
    return { vehicule: v.vehiculePlaque ?? 'à préciser', conducteur: v.chauffeurNom ?? 'à préciser' }
  }
  /** Véhicule ou conducteur changé après la planification : chaque destinataire
   *  encore à livrer reçoit à nouveau sa notification, avec les nouveaux moyens. */
  function renotifierSiMoyensChanges(id: string, avant: { vehicule: string; conducteur: string }) {
    const v = getById(id)
    if (!v || !['planifie', 'confirme', 'pret', 'en_cours'].includes(v.statut)) return
    const apres = moyensDe(v)
    if (apres.vehicule === avant.vehicule && apres.conducteur === avant.conducteur) return
    v.etapes.filter(e => e.destinataire && dansLaTournee(e) && !e.franchi).forEach(e => notifier(v, e, 'planification', { miseAJour: true }))
  }
  function appliquerTransporteur(v: Voyage, transporteurId?: string, vehiculeId?: string, conducteurId?: string) {
    const t = usePrestatairesStore().getById(transporteurId)
    const veh = t?.vehicules?.find(x => x.id === vehiculeId)
    const cond = t?.conducteurs?.find(x => x.id === conducteurId)
    v.moyen = 'externe'
    v.transporteurId = t?.id; v.transporteurNom = t?.nom
    v.vehiculeTransporteurId = veh?.id; v.vehiculeTransporteurPlaque = veh?.immatriculation
    v.conducteurTransporteurId = cond?.id; v.conducteurTransporteurNom = cond?.nom
    /* Le transporteur remplace nos moyens : véhicule et conducteur de la flotte sont libérés. */
    v.vehiculeId = undefined; v.vehiculePlaque = undefined; v.semiRemorqueId = undefined; v.semiRemorquePlaque = undefined
    v.chauffeurId = undefined; v.chauffeurNom = undefined
  }
  function planDepuisTrajet(trajetId: string, prefixe: string): PointPlanTrajet[] {
    const t = useTrajetsStore().getById(trajetId)
    return (t?.etapes ?? []).map((e, i) => ({ id: `${prefixe}-P${i + 1}`, siteNom: e.siteNom, ordre: e.ordre, lat: e.lat, lng: e.lng, role: e.role, intervalleMin: e.intervalleMin, pausePrevueMin: e.pausePrevueMin }))
  }
  function appliquerTrajet(v: Voyage, trajetId?: string) {
    const t = trajetId ? useTrajetsStore().getById(trajetId) : undefined
    v.trajetId = t?.id; v.trajetLibelle = t?.libelle
    v.planTrajet = t ? planDepuisTrajet(t.id, `${v.id}-${maintenantMs()}`) : []
  }

  /** Change les moyens, le mode de transport ou le trajet de référence d'un
   *  ordre encore modifiable (avant sa confirmation). */
  function definirTransport(id: string, saisie: {
    moyen: 'propres' | 'externe'; transporteurId?: string; vehiculeTransporteurId?: string; conducteurTransporteurId?: string
    modeTransport?: string; trajetId?: string
  }): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (v.statut !== 'en_attente' && v.statut !== 'planifie') return { ok: false, motif: "Les moyens et le trajet ne se changent plus une fois l'ordre confirmé." }
    const modes = useParametresPlanificationStore().parametres.modesTransport
    if (saisie.modeTransport && !modes.includes(saisie.modeTransport)) return { ok: false, motif: 'Choisissez un mode de transport de la liste.' }
    if (saisie.trajetId && !useTrajetsStore().getById(saisie.trajetId)) return { ok: false, motif: 'Trajet de référence introuvable.' }
    if (saisie.moyen === 'externe') {
      const r = verifierTransporteur(saisie.transporteurId, saisie.vehiculeTransporteurId, saisie.conducteurTransporteurId)
      if (!r.ok) return r
      const change = v.moyen !== 'externe' || v.transporteurId !== saisie.transporteurId
      appliquerTransporteur(v, saisie.transporteurId, saisie.vehiculeTransporteurId, saisie.conducteurTransporteurId)
      if (v.statut === 'planifie' && change) notifierTransporteur(v)
    } else if (v.moyen === 'externe') {
      v.moyen = 'propres'
      v.transporteurId = v.transporteurNom = v.vehiculeTransporteurId = v.vehiculeTransporteurPlaque = v.conducteurTransporteurId = v.conducteurTransporteurNom = undefined
    } else v.moyen = 'propres'
    v.modeTransport = saisie.modeTransport || undefined
    if ((saisie.trajetId ?? '') !== (v.trajetId ?? '')) appliquerTrajet(v, saisie.trajetId)
    if (v.statut === 'planifie') fixerHeuresPrevues(v)
    return { ok: true }
  }
  function verifierTransporteur(transporteurId?: string, vehiculeId?: string, conducteurId?: string): { ok: boolean; motif?: string } {
    const pr = usePrestatairesStore()
    const t = pr.getById(transporteurId)
    if (!t || !pr.estTransporteur(t.id)) return { ok: false, motif: 'Choisissez le transporteur externe.' }
    if (!t.autorise) return { ok: false, motif: `${t.nom} n'est plus autorisé à travailler avec l'entreprise.` }
    if (vehiculeId && !t.vehicules?.some(x => x.id === vehiculeId)) return { ok: false, motif: `Ce véhicule n'appartient pas à ${t.nom}.` }
    if (conducteurId && !t.conducteurs?.some(x => x.id === conducteurId)) return { ok: false, motif: `Ce conducteur n'appartient pas à ${t.nom}.` }
    return { ok: true }
  }
  function notifierTransporteur(v: Voyage) {
    notifierChauffeur(v, `Une expédition est confiée à ${v.transporteurNom ?? 'votre entreprise'} : ${v.numeroOT || v.reference}, le ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')}, véhicule ${v.vehiculeTransporteurPlaque ?? 'à préciser'}, ${detailLivraisons(v)}.`)
  }

  /** En cours de voyage, l'itinéraire se modifie avec un motif : le conducteur
   *  est notifié et l'ancien trajet reste dans l'historique. */
  function modifierItineraire(id: string, trajetId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!['confirme', 'pret', 'en_cours'].includes(v.statut)) return { ok: false, motif: "L'itinéraire se modifie ainsi une fois l'ordre confirmé et jusqu'à la fin du voyage." }
    if (!motif.trim()) return { ok: false, motif: "Indiquez le motif de la modification de l'itinéraire." }
    const t = useTrajetsStore().getById(trajetId)
    if (!t) return { ok: false, motif: 'Choisissez le nouveau trajet de référence.' }
    if (t.id === v.trajetId) return { ok: false, motif: 'Ce trajet est déjà celui du voyage.' }
    ;(v.historiqueItineraire ??= []).push({
      le: maintenant().toISOString(), par: useAuthStore().user?.nom ?? '', motif: motif.trim(),
      ancienTrajetId: v.trajetId, ancienLibelle: v.trajetLibelle ?? 'Itinéraire composé pour ce voyage', ancienPlan: [...(v.planTrajet ?? [])],
      nouveauTrajetId: t.id, nouveauLibelle: t.libelle,
    })
    appliquerTrajet(v, t.id)
    notifierChauffeur(v, `Itinéraire modifié pour ${v.numeroOT || v.reference} : ${t.libelle}. Motif : ${motif.trim()}.`)
    return { ok: true }
  }

  /** Contraintes de livraison et compatibilité des produits d'un ordre. */
  function controleContraintes(v: Voyage): { ok: boolean; motif?: string } {
    const lignes = v.etapes.filter(dansLaTournee)
    const produits = lignes.map(e => e.produit).filter((p): p is string => !!p)
    return useContraintesLivraisonStore().respecteContraintes({
      vehiculeIds: v.moyen === 'externe' ? [] : [v.vehiculeId, v.semiRemorqueId].filter((x): x is string => !!x),
      transporteurId: v.moyen === 'externe' ? v.transporteurId : undefined,
      vehiculesTransporteurIds: v.moyen === 'externe' && v.vehiculeTransporteurId ? [v.vehiculeTransporteurId] : undefined,
      produits,
      livraisons: lignes.map(e => ({ client: e.destinataire, siteId: e.siteId, pompeExigee: e.pompeExigee })),
    })
  }

  /** Heures prévues fixées à la planification, livraison par livraison. */
  function fixerHeuresPrevues(v: Voyage) {
    v.etapes.forEach(e => {
      if (!dansLaTournee(e) || e.franchi) return
      const h = heurePrevueCalculee(v, { ...e, heurePrevue: undefined })
      if (h) h.setSeconds(0, 0)
      e.heurePrevue = h?.toISOString()
    })
  }
  function recalculerHeuresPrevues(id: string) {
    const v = getById(id)
    if (v && v.statut === 'planifie') fixerHeuresPrevues(v)
  }

  /** Remplace les lignes de livraison d'un ordre encore en attente :
   *  chacune porte son propre destinataire, client ou transfert entre
   *  sites internes. Le résumé affiché sur l'ordre se recalcule à
   *  partir de ces lignes plutôt que d'être saisi à part. */
  function definirLignes(voyageId: string, lignes: EtapeVoyage[]): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!['en_attente', 'planifie'].includes(v.statut)) return { ok: false, motif: "Les commandes de l'ordre ne se modifient plus une fois l'ordre confirmé." }
    const tries = [...lignes].sort((a, b) => a.ordre - b.ordre)
    /* On ne reprend de la liste reçue que la composition et l'ordre : pour une
     * ligne déjà connue, c'est la version enregistrée qui fait foi, pour ne
     * jamais écraser ce qui a été saisi entre-temps (notifications, réponse du
     * client, déclaration de l'entrepôt...). */
    const connues = new Map(v.etapes.map(e => [e.id, e]))
    v.etapes = tries.map((e, i) => {
      const enregistree = connues.get(e.id)
      return enregistree ? Object.assign(enregistree, { ordre: i + 1 }) : { ...e, ordre: i + 1, franchi: false }
    })
    v.clientNom = resumeDestinataires(v.etapes)
    v.origine = tries[0]?.siteNom ?? '-'
    v.destination = tries[tries.length - 1]?.siteNom ?? '-'
    const trajetsStore = useTrajetsStore()
    v.kmReference = trajetsStore.distanceSimulee(tries)
    /* Le poids de l'ordre est toujours la somme de ses lignes. */
    v.marchandise.poidsChargeKg = chargeOrdre(v).poidsKg
    if (!v.carburant) v.marchandise.typeProduit = marchandiseDe(v.etapes)
    /* Un ordre planifié reste modifiable tant qu'il n'est pas confirmé : un
     * client ajouté à ce stade reçoit à son tour sa notification et son lien,
     * pour confirmer sa disponibilité comme les autres ; et retirer le dernier
     * client en attente peut suffire à faire passer l'ordre à confirmé. */
    if (v.statut === 'planifie') {
      fixerHeuresPrevues(v)
      v.etapes.filter(e => e.destinataire && !e.notifications?.length).forEach(e => notifier(v, e, 'planification'))
      reevaluerConfirmation(v)
    }
    return { ok: true }
  }

  /** Notification automatique envoyée au destinataire d'une ligne :
   *  aucun canal SMS ou e-mail réel n'est branché dans cette maquette,
   *  le contenu est simulé mais structuré comme un envoi réel le
   *  serait. La durée reste une estimation simulée à partir de la
   *  distance, faute d'historique réel à ce stade. */
  /** Le chauffeur est prévenu (SMS simulé) quand une tournée lui est confiée
   *  ou annulée ; il n'a rien à accepter ni refuser. */
  function notifierChauffeur(v: Voyage, message: string) {
    v.notificationsChauffeur = [...(v.notificationsChauffeur ?? []), { le: maintenant().toISOString(), message, chauffeurId: v.chauffeurId }]
  }

  /** Téléphone et e-mail du destinataire : ceux précisés sur la commande, sinon ceux de sa fiche client. */
  function coordonneesDe(e: EtapeVoyage): { telephone?: string; email?: string } {
    const cmd = e.commandeId ? useCommandesStore().getById(e.commandeId) : undefined
    const fiche = useClientsStore().parNom(e.destinataire)
    return {
      telephone: cmd?.telephoneDestinataire?.trim() || fiche?.telephone?.trim() || undefined,
      email: cmd?.emailDestinataire?.trim() || fiche?.email?.trim() || undefined,
    }
  }
  /** Jour de la livraison elle-même : son heure prévue, à défaut la date de l'ordre. */
  function jourLivraison(v: Voyage, e: EtapeVoyage): string {
    return (heurePrevue(v, e) ?? new Date(v.datePlanifiee)).toLocaleDateString('fr-FR')
  }
  /** Motif d'annulation d'un ordre tel qu'on le donne au client : le libellé
   *  du code motif choisi, jamais le commentaire interne. */
  function motifClientAnnulation(v: Voyage): string | undefined {
    return v.codeMotifAnnulation ? useControlesTransportStore().libelleMotif('codesMotif', v.codeMotifAnnulation) || undefined : undefined
  }

  /** Notification automatique au destinataire d'une ligne, à chaque étape qui
   *  le concerne. Le canal vient de la commande, sinon de la fiche client ;
   *  sans coordonnée pour ce canal, la notification est marquée non envoyée
   *  et le planificateur le voit dans la fiche de l'ordre. */
  function notifier(v: Voyage, e: EtapeVoyage, type: TypeNotificationClient, opt: { miseAJour?: boolean; motif?: string; texte?: string; date?: string } = {}) {
    if (!e.destinataire) return
    const { vehicule, conducteur } = moyensDe(v)
    const eta = heureEstimee(v, e)
    const lien = `Suivez votre livraison : ${lienSuivi(e.id)}`
    const jour = jourLivraison(v, e)
    const rang = e.commandeId ? useCommandesStore().rangPart(e.commandeId) : null
    const part = rang ? ` (livraison ${rang.rang} sur ${rang.total} de votre commande)` : ''
    const arrivee = eta ? `arrivée estimée le ${eta.toLocaleDateString('fr-FR')} vers ${fmtHeure(eta)}` : "heure d'arrivée communiquée au départ"
    let contenu: string
    if (type === 'planification') contenu = opt.miseAJour
      ? `Changement de véhicule ou de conducteur pour votre livraison du ${jour}${part}. Véhicule ${vehicule}, conducteur ${conducteur}, ${arrivee}. ${lien}`
      : `Votre livraison a été planifiée pour le ${jour}${part}. Véhicule ${vehicule}, conducteur ${conducteur}, ${arrivee}. ${lien}`
    else if (type === 'demarrage') contenu = `Votre livraison est en cours${part}. Conducteur ${conducteur}, ${eta ? `arrivée estimée ${fmtArrivee(eta)}` : "heure d'arrivée à suivre depuis votre lien"}. ${lien}`
    else if (type === 'livraison') contenu = `Le conducteur déclare avoir effectué votre livraison. Confirmez que vous l'avez bien reçue, ou signalez un problème : ${lienSuivi(e.id)}`
    else if (type === 'annulation') contenu = `${opt.texte ?? `Votre livraison du ${jour}${part} est annulée`}${opt.motif ? `. Motif : ${opt.motif}` : ''}. ${lien}`
    else if (type === 'hors_tournee') contenu = `Votre commande ne part pas avec la tournée du ${jour}${part} : un problème a été constaté au chargement. Elle sera rechargée et replanifiée. ${lien}`
    else contenu = `Une nouvelle date de livraison vous est proposée : le ${opt.date ? new Date(opt.date).toLocaleDateString('fr-FR') : ''}. Acceptez-la ou indiquez une autre date depuis votre lien : ${lienSuivi(e.id)}`
    const canal = e.canalNotification ?? useClientsStore().canalPour(e.destinataire)
    const canaux: ('sms' | 'email')[] = canal === 'sms_email' ? ['sms', 'email'] : [canal]
    const coord = coordonneesDe(e)
    const envoyeeLe = maintenant().toISOString()
    e.notifications = [...(e.notifications ?? []), ...canaux.map((c, i) => {
      const a = c === 'sms' ? coord.telephone : coord.email
      return { id: `NOTIF-${maintenantMs()}-${i}-${Math.round(Math.random() * 999)}`, type, canal: c, envoyeeLe, contenu, a, nonEnvoyee: a ? undefined : true } as NotificationClient
    })]
  }
  /** Notifications non envoyées faute de coordonnée, à signaler au planificateur. */
  const notificationsNonEnvoyees = (e: EtapeVoyage) => (e.notifications ?? []).filter(n => n.nonEnvoyee)

  /** Lien de suivi propre à chaque ligne, envoyé au destinataire par SMS
   *  ou e-mail : il ouvre son propre espace, sans compte ni mot de
   *  passe, comme un lien de suivi de colis. */
  function lienSuivi(etapeId: string) {
    return `${window.location.origin}/suivi/${etapeId}`
  }

  /** Planifier : le planificateur affecte l'ordre à un chauffeur et un
   *  véhicule ; l'ordre passe alors à Planifié. Il n'y a pas d'étape de
   *  validation où le chauffeur accepterait ou refuserait l'ordre - le
   *  passage à En cours se déclenche seulement quand le chauffeur
   *  commence réellement à exécuter la tournée, en signant sa première
   *  livraison (voir declarerLivraisonChauffeur). Chaque destinataire d'une ligne
   *  client reçoit à la planification une notification annonçant le
   *  jour, le véhicule, le chauffeur et une arrivée estimée. */
  /** Capacité de l'ordre : charge maximale et volume utile de la
   *  semi-remorque attelée au tracteur choisi, qui porte la marchandise. */
  function capaciteOrdre(v: Voyage): { kg?: number; m3?: number } {
    if (v.moyen === 'externe') {
      const veh = usePrestatairesStore().getById(v.transporteurId)?.vehicules?.find(x => x.id === v.vehiculeTransporteurId)
      return { kg: veh?.chargeUtileKg, m3: veh?.volumeM3 }
    }
    if (!v.vehiculeId) return {}
    const vehicules = useVehiculeStore()
    const srId = v.semiRemorqueId ?? vehicules.attelageActif(v.vehiculeId)?.semiRemorqueId
    const sr = srId ? vehicules.parId(srId) : null
    return { kg: sr?.chargeMaxKg, m3: sr?.volumeMaxM3 }
  }

  /** Contrôle de charge : poids et volume des lignes encore dans la tournée
   *  face à la capacité de la semi-remorque. Sans semi-remorque, la capacité
   *  est inconnue et le contrôle ne peut pas se faire. */
  function controleCharge(v: Voyage): { ok: boolean; motif?: string } {
    const cap = capaciteOrdre(v)
    const charge = chargeOrdre(v)
    /* Transporteur externe : la charge se contrôle face à son véhicule, s'il est renseigné. */
    if (v.moyen === 'externe') {
      if (cap.kg && charge.poidsKg > cap.kg) return { ok: false, motif: `Le poids chargé (${charge.poidsKg} kg) dépasse la charge utile du véhicule ${v.vehiculeTransporteurPlaque} (${cap.kg} kg) : retirez des lignes ou choisissez un autre véhicule du transporteur.` }
      if (cap.m3 && charge.volumeM3 > cap.m3) return { ok: false, motif: `Le volume chargé (${charge.volumeM3} m³) dépasse le volume du véhicule ${v.vehiculeTransporteurPlaque} (${cap.m3} m³) : retirez des lignes ou choisissez un autre véhicule du transporteur.` }
      return { ok: true }
    }
    if (!cap.kg) return { ok: false, motif: `Aucune semi-remorque n'est attelée à ce véhicule : sa capacité est inconnue. Attelez une semi-remorque ou choisissez un autre véhicule.` }
    if (charge.poidsKg > cap.kg) return { ok: false, motif: `Le poids chargé (${charge.poidsKg} kg) dépasse la charge maximale de la semi-remorque (${cap.kg} kg) : retirez des lignes ou choisissez un autre véhicule.` }
    if (cap.m3 && charge.volumeM3 > cap.m3) return { ok: false, motif: `Le volume chargé (${charge.volumeM3} m³) dépasse le volume utile de la semi-remorque (${cap.m3} m³) : retirez des lignes ou choisissez un autre véhicule.` }
    return { ok: true }
  }

  /** Conducteur et semi-remorque restent modifiables à la main à tout moment,
   *  sauf une fois la tournée terminée, clôturée ou annulée. Le conducteur
   *  retenu est vérifié disponible et en règle ; un nouveau conducteur d'une
   *  tournée déjà planifiée en est notifié. */
  function modifierAffectation(id: string, saisie: { chauffeurId?: string; chauffeurNom?: string; semiRemorqueId?: string; semiRemorquePlaque?: string }): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (['livre', 'cloture', 'annule'].includes(v.statut)) return { ok: false, motif: `Cet ordre n'est plus modifiable.` }
    if (!saisie.chauffeurId) return { ok: false, motif: 'Choisissez un conducteur.' }
    const indispo = chauffeurIndisponible(saisie.chauffeurId, v.datePlanifiee, v.id)
    if (indispo) return { ok: false, motif: `${saisie.chauffeurNom ?? 'Ce conducteur'} n'est pas disponible (${indispo}) : choisissez un autre conducteur.` }
    if (!useDocumentsStore().enRegle(saisie.chauffeurId)) return { ok: false, motif: `${saisie.chauffeurNom ?? 'Ce conducteur'} n'est pas en règle : une pièce obligatoire est expirée ou manquante.` }
    if (saisie.semiRemorqueId && remorqueOccupee(saisie.semiRemorqueId, v.id)) return { ok: false, motif: 'Cette semi-remorque est déjà engagée sur un autre ordre.' }
    if (v.statut !== 'en_attente' && v.semiRemorqueId !== saisie.semiRemorqueId) {
      const essai = controleCharge({ ...v, semiRemorqueId: saisie.semiRemorqueId })
      if (!essai.ok) return essai
    }
    const nouveauConducteur = v.chauffeurId !== saisie.chauffeurId
    v.chauffeurId = saisie.chauffeurId
    v.chauffeurNom = saisie.chauffeurNom
    v.semiRemorqueId = saisie.semiRemorqueId
    v.semiRemorquePlaque = saisie.semiRemorquePlaque
    if (nouveauConducteur && v.statut !== 'en_attente')
      notifierChauffeur(v, messageTourneeConfiee(v))
    return { ok: true }
  }

  function planifier(id: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (v.statut !== 'en_attente') return { ok: false, motif: "Cet ordre n'est plus en attente." }
    if (!v.etapes.length) return { ok: false, motif: 'Ajoutez au moins une ligne de livraison avant de planifier cet ordre.' }
    if (v.moyen === 'externe') {
      /* Transporteur externe : ni véhicule ni conducteur de la flotte. */
      const r = verifierTransporteur(v.transporteurId, v.vehiculeTransporteurId, v.conducteurTransporteurId)
      if (!r.ok) return r
    } else {
      if (!v.vehiculeId) return { ok: false, motif: 'Choisissez un véhicule avant de planifier cet ordre.' }
      if (!v.chauffeurId) return { ok: false, motif: 'Choisissez un conducteur avant de planifier cet ordre.' }
      const indispo = chauffeurIndisponible(v.chauffeurId, v.datePlanifiee, v.id)
      if (indispo) return { ok: false, motif: `${v.chauffeurNom ?? 'Le conducteur'} n'est pas disponible (${indispo}) : choisissez un autre conducteur.` }
      if (!useDocumentsStore().enRegle(v.chauffeurId)) return { ok: false, motif: `${v.chauffeurNom ?? 'Le conducteur'} n'est pas en règle : une pièce obligatoire est expirée ou manquante.` }
      const docsVeh = useDocumentsVehiculeStore()
      if (!docsVeh.enRegle(v.vehiculeId)) return { ok: false, motif: `${v.vehiculePlaque ?? 'Le véhicule'} n'est pas en règle : une pièce administrative est expirée ou manquante.` }
      if (v.semiRemorqueId && !docsVeh.enRegle(v.semiRemorqueId)) return { ok: false, motif: `La semi-remorque ${v.semiRemorquePlaque ?? ''} n'est pas en règle : une pièce administrative est expirée ou manquante.` }
    }
    const charge = controleCharge(v)
    if (!charge.ok) return charge
    const contraintes = controleContraintes(v)
    if (!contraintes.ok) return contraintes
    fixerHeuresPrevues(v)
    v.planifieLe = maintenant().toISOString()
    v.etapes.forEach(e => notifier(v, e, 'planification'))
    if (v.moyen === 'externe') notifierTransporteur(v)
    else notifierChauffeur(v, messageTourneeConfiee(v))
    if (v.confirmationRequise === false) {
      /* Certains clients n'ont pas besoin d'être appelés pour confirmer :
         directement prêt pour le chargement, sans étape Confirmé. */
      v.statut = 'confirme'
      v.confirmeLe = v.planifieLe
    } else {
      v.statut = 'planifie'
      /* Sans destinataire client (transferts seuls), personne n'a à confirmer :
       * la tournée ne reste pas bloquée en Planifié. */
      reevaluerConfirmation(v)
    }
    return { ok: true }
  }

  /** Dès que tous les destinataires encore concernés par la tournée ont
   *  confirmé leur disponibilité, elle passe elle-même à Confirmé. Un
   *  destinataire indisponible est sorti de ce compte : son indisponibilité
   *  n'empêche jamais les autres d'être confirmés. */
  function reevaluerConfirmation(v: Voyage) {
    if (v.statut !== 'planifie') return
    const destinataires = v.etapes.filter(e => e.destinataire)
    /* Une livraison annulée avant le départ (bon annulé par un incident) n'attend plus de confirmation. */
    const concernees = destinataires.filter(e => !e.indisponibleLe && !e.ligneAnnuleeLe)
    /* Si tous les destinataires sont devenus indisponibles, il ne reste
     * plus personne à charger : la tournée passe confirmée quand même, y
     * compris pour ses seuls transferts internes s'il y en a - elle ne
     * doit jamais rester bloquée en planifié faute de client restant. */
    if (concernees.every(e => e.confirmeLe)) { v.statut = 'confirme'; v.confirmeLe = maintenant().toISOString() }
  }

  /** Avant tout chargement, chaque destinataire est appelé pour confirmer
   *  sa disponibilité à la date prévue : ça évite un retour coûteux si le
   *  client s'avère finalement absent. Un destinataire d'abord indisponible
   *  qui se ravise est simplement remis dans la tournée. */
  function confirmerClient(voyageId: string, etapeId: string, viaAgent = false): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'planifie') return { ok: false, motif: "Cet ordre n'est pas en attente de confirmation." }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || !etape.destinataire) return { ok: false, motif: 'Ligne introuvable ou sans destinataire à confirmer.' }
    if (etape.ligneAnnuleeLe) return { ok: false, motif: "Cette livraison est annulée : il n'y a plus de disponibilité à confirmer." }
    etape.confirmeLe = maintenant().toISOString()
    etape.reponseViaAgent = viaAgent
    etape.indisponibleLe = undefined
    etape.motifIndisponibilite = undefined
    etape.dateDisponibleClient = undefined
    etape.dateProposeePlanif = undefined
    etape.dateConfirmeeLe = undefined
    reevaluerConfirmation(v)
    return { ok: true }
  }

  /** Le destinataire signale ne pas être disponible à la date prévue, et
   *  peut dire à quelle date il le sera. Sa ligne sort de la tournée, qui
   *  continue sans elle : les autres destinataires se confirment, se
   *  chargent et se livrent comme si de rien n'était. La ligne, elle,
   *  entre dans un processus de replanification. */
  function declarerIndisponible(voyageId: string, etapeId: string, motif: string, dateDisponible?: string, viaAgent = false): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'planifie') return { ok: false, motif: "Cet ordre n'est pas en attente de confirmation." }
    if (!motif.trim()) return { ok: false, motif: 'Un motif est obligatoire.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || !etape.destinataire) return { ok: false, motif: 'Ligne introuvable ou sans destinataire à confirmer.' }
    if (etape.ligneAnnuleeLe) return { ok: false, motif: "Cette livraison est annulée : il n'y a plus de disponibilité à confirmer." }
    etape.indisponibleLe = maintenant().toISOString()
    etape.reponseViaAgent = viaAgent
    etape.motifIndisponibilite = motif.trim()
    etape.dateDisponibleClient = dateDisponible || undefined
    etape.confirmeLe = undefined
    etape.dateProposeePlanif = undefined
    etape.dateConfirmeeLe = undefined
    reevaluerConfirmation(v)
    return { ok: true }
  }

  /** Reprend automatiquement une ligne sortie de la tournée dans un nouvel
   *  ordre, en attente, à la date désormais retenue - le planificateur n'a
   *  plus rien à ressaisir à la main. Véhicule et chauffeur restent à
   *  affecter, comme pour toute commande nouvellement entrée. */
  function reprendreLigneReplanifiee(v: Voyage, etape: EtapeVoyage, dateISO: string) {
    etape.dateProposeePlanif = dateISO
    etape.dateConfirmeeLe = maintenant().toISOString()
    /* Carburant : la commande retourne parmi les commandes de carburant à planifier,
     * à cette date ; elle repartira dans une tournée de carburant, jamais dans un ordre de fret. */
    if (v.carburant) {
      if (etape.commandeId) useCommandesStore().remettreCarburantAPlanifier(etape.commandeId, dateISO)
      etape.commandeRemiseLe = etape.dateConfirmeeLe
      return
    }
    const nouvelleLigne = (ordre: number): EtapeVoyage => ({
      id: `RPL-${maintenantMs()}-${Math.floor(Math.random() * 1000)}`, ordre, siteId: etape.siteId, siteNom: etape.siteNom,
      destinataire: etape.destinataire, adresseLivraison: etape.adresseLivraison, lat: etape.lat, lng: etape.lng,
      role: 'livraison', intervalleMin: 0, franchi: false,
      poidsKg: etape.poidsKg, volumeM3: etape.volumeM3, canalNotification: etape.canalNotification,
      commandeId: etape.commandeId, contenuCommande: etape.contenuCommande, referenceExterne: etape.referenceExterne,
      nombreUnites: etape.nombreUnites, produit: etape.produit,
      nonConformiteReprise: etape.retourNonConformeLe ? etape.motifRetourNonConforme : undefined,
    })
    etape.repriseDansVoyageId = rattacherAOrdreDuJour(v, dateISO, nouvelleLigne)
    /* La commande suit sa livraison dans le nouvel ordre. */
    if (etape.commandeId) useCommandesStore().affecter([etape.commandeId], etape.repriseDansVoyageId)
  }

  /** Toutes les lignes reprises au même jour vont dans un même ordre en
   *  attente, quelle que soit la tournée d'origine : un chargement doit rester
   *  optimal, pas se réduire à une ligne par ordre. On ne rattache qu'à un
   *  ordre encore en attente, donc encore modifiable. Renvoie l'ordre retenu. */
  function rattacherAOrdreDuJour(v: Voyage, dateISO: string, fabrique: (ordre: number) => EtapeVoyage): string {
    const jour = dateISO.slice(0, 10)
    const origine = v.numeroOT || v.reference
    const existant = voyages.value.find(x => x.creeParReplanification && x.statut === 'en_attente' && x.datePlanifiee.slice(0, 10) === jour)
    if (existant) {
      const l = fabrique(existant.etapes.length + 1)
      existant.etapes.push(l)
      existant.clientNom = libelleDestinataires(existant.etapes)
      existant.marchandise.poidsChargeKg = chargeOrdre(existant).poidsKg
      existant.marchandise.typeProduit = marchandiseDe(existant.etapes)
      existant.replanifieDepuis = [...new Set([...(existant.replanifieDepuis ?? []), origine])]
      return existant.id
    }
    const premiere = fabrique(1)
    const heure = useParametresPlanificationStore().parametres.heureDepartDefaut || '08:00'
    return creer({
      statut: 'en_attente', clientNom: premiere.destinataire ?? premiere.siteNom, toleranceEcartPoidsPourcent: tolerancePoids(premiere.destinataire, premiere.produit),
      origine: '-', destination: '-', datePlanifiee: `${jour}T${heure}`, kmReference: 0,
      marchandise: { typeProduit: marchandiseDe([premiere]), nombreCartons: 0, poidsChargeKg: premiere.poidsKg ?? 0 },
      creeParReplanification: true, replanifieDepuis: [origine],
      etapesPersonnalisees: [premiere],
    })
  }

  /** Reliquat d'une livraison partielle : les articles non livrés sont repris
   *  dans l'ordre en attente du jour choisi, avec un poids estimé au prorata
   *  des articles. Le client confirmera sa disponibilité pour cette nouvelle
   *  date comme pour toute tournée planifiée. */
  function replanifierReliquat(voyageId: string, etapeId: string, dateISO: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    const nonLivres = etape?.eBL?.articlesNonLivres ?? []
    if (!v || !etape || !nonLivres.length) return { ok: false, motif: "Cette livraison n'a pas d'articles à replanifier." }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    if (etape.reliquatReprisLe) return { ok: false, motif: 'Ce reliquat est déjà replanifié.' }
    if (!dateISO) return { ok: false, motif: 'Choisissez une date.' }
    const total = etape.articles?.length || nonLivres.length
    const poids = etape.poidsKg != null ? Math.round(etape.poidsKg * nonLivres.length / total) : undefined
    etape.reliquatDate = dateISO
    etape.reliquatReprisLe = maintenant().toISOString()
    /* Carburant : le volume non livré retourne parmi les commandes de carburant à planifier. */
    if (v.carburant) {
      const nonDepotes = (etape.mesuresDepotees ?? []).filter(m => m.volumeL === 0).map(m => m.numero)
      const bsl = v.carburant.bonEnlevement?.bsl?.mesures ?? []
      const volume = compartimentsDe(v, etape).filter(c => nonDepotes.includes(c.numero))
        .reduce((t, c) => t + (bsl.find(m => m.numero === c.numero)?.volumeL ?? c.volumeL ?? 0), 0)
      if (etape.commandeId) useCommandesStore().remettreCarburantAPlanifier(etape.commandeId, dateISO, volume || undefined)
      etape.commandeRemiseLe = etape.reliquatReprisLe
      return { ok: true }
    }
    etape.reliquatRepriseDansVoyageId = rattacherAOrdreDuJour(v, dateISO, ordre => ({
      id: `RLQ-${maintenantMs()}-${Math.floor(Math.random() * 1000)}`, ordre, siteId: etape.siteId, siteNom: etape.siteNom,
      destinataire: etape.destinataire, adresseLivraison: etape.adresseLivraison, lat: etape.lat, lng: etape.lng,
      role: 'livraison', intervalleMin: 0, franchi: false,
      canalNotification: etape.canalNotification, poidsKg: poids,
      commandeId: etape.commandeId, referenceExterne: etape.referenceExterne,
      contenuCommande: nonLivres.map(a => a.libelle).join(', '), produit: etape.produit,
      nonConformiteReprise: etape.retourNonConformeLe ? etape.motifRetourNonConforme : undefined,
    }))
    return { ok: true }
  }

  function libelleDestinataires(etapes: EtapeVoyage[]) {
    const noms = etapes.map(e => e.destinataire ?? e.siteNom)
    return noms.length > 1 ? `${noms[0]} et ${noms.length - 1} autre(s)` : (noms[0] ?? 'Aucune ligne')
  }


  /** Le client connaît son propre programme : c'est à lui de dire, depuis son
   *  espace de suivi, la date qui lui convient - à la déclaration de son
   *  indisponibilité, ou plus tard s'il change d'avis, tant que rien n'est
   *  encore confirmé. Il ne s'agit jamais d'une date que le planificateur
   *  lui impose. */
  function clientProposeDate(voyageId: string, etapeId: string, dateISO: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !horsTournee(etape) || etape.dateConfirmeeLe) return { ok: false, motif: "Cette ligne n'est pas à replanifier." }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    if (!dateISO) return { ok: false, motif: 'Choisissez une date.' }
    etape.dateDisponibleClient = dateISO
    return { ok: true }
  }

  /** Le planificateur accepte la date que le client a lui-même proposée :
   *  c'est le chemin normal, celui qui n'a besoin d'aucun aller-retour. */
  function accepterDateClient(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !horsTournee(etape)) return { ok: false, motif: "Cette ligne n'est pas à replanifier." }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    if (!etape.dateDisponibleClient) return { ok: false, motif: "Le client n'a pas encore proposé de date." }
    reprendreLigneReplanifiee(v, etape, etape.dateDisponibleClient)
    return { ok: true }
  }

  /** Cas de secours seulement : le client n'a donné aucune date. Le
   *  planificateur en propose une, sous réserve de l'accord du client -
   *  jamais l'inverse, puisque lui seul connaît vraiment son programme. */
  function proposerDate(voyageId: string, etapeId: string, dateISO: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || !horsTournee(etape)) return { ok: false, motif: "Cette ligne n'est pas à replanifier." }
    if (!dateISO) return { ok: false, motif: 'Choisissez une date.' }
    etape.dateProposeePlanif = dateISO
    etape.dateConfirmeeLe = undefined
    notifier(v, etape, 'date_proposee', { date: dateISO })
    return { ok: true }
  }

  /** Le client confirme la date de secours proposée par le planificateur. */
  function confirmerNouvelleDate(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !horsTournee(etape) || !etape.dateProposeePlanif) return { ok: false, motif: "Aucune date n'a été proposée pour cette ligne." }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    reprendreLigneReplanifiee(v, etape, etape.dateProposeePlanif)
    return { ok: true }
  }

  /** La date de secours ne convient pas au client, qui redonne alors sa
   *  propre date - on revient au chemin normal. */
  function refuserNouvelleDate(voyageId: string, etapeId: string, autreDate?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !horsTournee(etape) || !etape.dateProposeePlanif) return { ok: false, motif: "Aucune date n'a été proposée pour cette ligne." }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    etape.dateProposeePlanif = undefined
    etape.dateConfirmeeLe = undefined
    if (autreDate) etape.dateDisponibleClient = autreDate
    return { ok: true }
  }

  /** Double contrôle du chargement, entre Confirmé et Prêt pour exécution.
   *  L'entrepôt déclare ce qu'il a chargé, ligne par ligne : c'est sur cette
   *  liste que le chauffeur contrôle ensuite. */
  /** Quantité chargée saisie par l'entrepôt : vide (non renseignée) ou un entier positif ou nul. */
  function lireQuantiteChargee(x: unknown, nom: string): { ok: boolean; motif?: string; valeur?: number } {
    if (x == null || x === '') return { ok: true }
    const n = Number(x)
    const unite = useParametresPlanificationStore().parametres.uniteComptage
    if (!Number.isFinite(n)) return { ok: false, motif: `${nom} : indiquez la quantité chargée en chiffres.` }
    if (n < 0) return { ok: false, motif: `${nom} : la quantité chargée ne peut pas être négative.` }
    if (!Number.isInteger(n)) return { ok: false, motif: `${nom} : la quantité chargée est un nombre entier de ${unite}.` }
    return { ok: true, valeur: n }
  }
  function declarerChargementEntrepot(voyageId: string, contenus: Record<string, string>, quantites: Record<string, number | string | null | undefined> = {}): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme') return { ok: false, motif: 'Cet ordre doit être confirmé avant le chargement.' }
    if (!useParametresPlanificationStore().peutDeclarerChargement(useAuthStore().role)) return { ok: false, motif: MOTIF_CHARGEMENT_NON_HABILITE }
    if (v.chargementEntrepotLe) return { ok: false, motif: 'Le chargement est déjà déclaré : corrigez une ligne tant que le conducteur ne l\'a pas contrôlée.' }
    const lignes = v.etapes.filter(dansLaTournee)
    if (lignes.some(e => !(contenus[e.id] ?? '').trim())) return { ok: false, motif: 'Indiquez ce qui est chargé pour chaque destinataire.' }
    const qtes: Record<string, number | undefined> = {}
    for (const e of lignes) {
      const q = lireQuantiteChargee(quantites[e.id], e.destinataire ?? e.siteNom)
      if (!q.ok) return q
      qtes[e.id] = q.valeur
    }
    /* Date dépassée : en mode blocage, ni la tournée ni ses commandes ne se chargent. */
    const ctrl = useControlesTransportStore()
    const date = ctrl.peutCharger(v)
    if (!date.ok) return date
    const cmds = useCommandesStore()
    for (const e of lignes) {
      const c = e.commandeId ? cmds.getById(e.commandeId) : undefined
      const r = c ? ctrl.peutCharger(c) : { ok: true }
      if (!r.ok) return { ok: false, motif: `${e.destinataire ?? e.siteNom} : ${r.motif}` }
    }
    lignes.forEach(e => {
      e.contenuCharge = contenus[e.id]!.trim()
      e.articles = e.contenuCharge.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)
        .map((libelle, i) => ({ id: `${e.id}-A${i + 1}`, libelle }))
      e.quantiteChargee = qtes[e.id]
    })
    v.chargementEntrepotLe = maintenant().toISOString()
    return { ok: true }
  }

  /** L'entrepôt corrige sa déclaration pour un destinataire, tant que le conducteur ne l'a pas contrôlée. */
  function corrigerChargementEntrepot(voyageId: string, etapeId: string, contenu: string, quantite?: number | string | null, motif = ''): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme' || !v.chargementEntrepotLe) return { ok: false, motif: "Le chargement n'est pas déclaré, ou la tournée n'est plus en cours de chargement." }
    if (!useParametresPlanificationStore().peutDeclarerChargement(useAuthStore().role)) return { ok: false, motif: MOTIF_CHARGEMENT_NON_HABILITE }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e || !dansLaTournee(e)) return { ok: false, motif: 'Ligne introuvable ou sortie de la tournée.' }
    if (e.chargementConformeLe || e.chargementNonConformeLe) return { ok: false, motif: 'Le conducteur a déjà contrôlé cette ligne : la déclaration ne se corrige plus.' }
    if (!contenu.trim()) return { ok: false, motif: 'Indiquez ce qui est chargé pour ce destinataire.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif de la correction.' }
    const q = lireQuantiteChargee(quantite, e.destinataire ?? e.siteNom)
    if (!q.ok) return q
    const avant = `${e.contenuCharge ?? ''}${e.quantiteChargee != null ? ` (${e.quantiteChargee})` : ''}`
    e.contenuCharge = contenu.trim()
    e.articles = e.contenuCharge.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).map((libelle, i) => ({ id: `${e.id}-A${i + 1}`, libelle }))
    e.quantiteChargee = q.valeur
    tracer(e, `Déclaration de chargement corrigée, avant : ${avant}`, motif)
    return { ok: true }
  }

  /** La tournée passe Prêt pour exécution dès que toutes les lignes encore
   *  concernées ont été jugées conformes par le chauffeur. Une ligne jugée
   *  non conforme est sortie de ce compte : elle n'empêche jamais les autres
   *  de partir. */
  function finaliserControle(v: Voyage) {
    const restantes = v.etapes.filter(dansLaTournee)
    if (restantes.length && restantes.every(e => e.chargementConformeLe)) {
      v.chargementChauffeurLe = maintenant().toISOString()
      v.statut = 'pret'
      /* La demande d'autorisation de départ part d'elle-même, sans attendre qu'on y pense. */
      if (departExige(v) && v.vehiculeId && v.chauffeurId && !useDepartsStore().autorisations.some(a => a.voyageId === v.id && (!a.decideLe || a.accordee))) useDepartsStore().demander(v.id, parQui())
    }
  }

  /** Le conducteur annule sa non-conformité (erreur de saisie) tant que la tournée est en Confirmé :
   *  la ligne revient dans la tournée, à contrôler de nouveau. */
  function annulerNonConformite(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme') return { ok: false, motif: "La non-conformité ne s'annule que tant que la tournée est en cours de chargement." }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e?.chargementNonConformeLe) return { ok: false, motif: "Cette ligne n'a pas de non-conformité à annuler." }
    if (e.dateConfirmeeLe || e.repriseDansVoyageId || e.commandeRemiseLe) return { ok: false, motif: 'Cette livraison est déjà replanifiée : la non-conformité ne s\'annule plus.' }
    if (!motif.trim()) return { ok: false, motif: "Indiquez pourquoi la non-conformité est annulée." }
    tracer(e, `Non-conformité annulée : ${e.motifNonConformite ?? ''}`, motif)
    e.chargementNonConformeLe = undefined; e.motifNonConformite = undefined
    e.dateDisponibleClient = undefined; e.dateProposeePlanif = undefined
    v.carburant?.plan.filter(x => x.commandeId === e.commandeId).forEach(x => { x.nonConformeLe = undefined; x.motifNonConformite = undefined })
    return { ok: true }
  }

  /** Le chauffeur contrôle une ligne par rapport à ce que l'entrepôt déclare
   *  pour elle : conforme, ou non conforme avec ce qui ne correspond pas.
   *  Chaque ligne se juge indépendamment des autres. */
  function controlerLigneChargement(voyageId: string, etapeId: string, conforme: boolean, motif?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme' || !v.chargementEntrepotLe) return { ok: false, motif: "L'entrepôt n'a pas encore déclaré le chargement terminé." }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e || !dansLaTournee(e)) return { ok: false, motif: 'Ligne introuvable ou sortie de la tournée.' }
    if (conforme) {
      e.chargementConformeLe = maintenant().toISOString()
    } else {
      if (!motif?.trim()) return { ok: false, motif: 'Précisez ce qui ne correspond pas.' }
      e.chargementNonConformeLe = maintenant().toISOString()
      e.motifNonConformite = motif.trim()
      e.chargementConformeLe = undefined
      notifier(v, e, 'hors_tournee')
    }
    finaliserControle(v)
    return { ok: true }
  }

  /** Raccourci du chauffeur quand tout est conforme : valide d'un coup les
   *  lignes qu'il n'a pas encore jugées. */
  function validerChargementChauffeur(voyageId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme' || !v.chargementEntrepotLe) return { ok: false, motif: "L'entrepôt n'a pas encore déclaré le chargement terminé." }
    v.etapes.filter(e => dansLaTournee(e) && !e.chargementConformeLe).forEach(e => { e.chargementConformeLe = maintenant().toISOString() })
    finaliserControle(v)
    return { ok: true }
  }

  /** Annuler reste réservé au planificateur ou au responsable : ce
   *  n'est jamais une action que le chauffeur peut poser depuis son
   *  espace, à aucun moment du cycle de vie de la tournée. */
  function annuler(id: string, motif: string, codeMotif?: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (v.statut === 'livre' || v.statut === 'cloture' || v.statut === 'annule') return { ok: false, motif: 'Cet ordre ne peut plus être annulé.' }
    if (!motif.trim()) return { ok: false, motif: "Un motif d'annulation est obligatoire." }
    /* Annulé avant le départ : les commandes de l'ordre redeviennent
     * disponibles pour un autre ordre. Une tournée déjà partie garde les
     * siennes, puisque la marchandise a pu être livrée en partie. */
    const commandes = useCommandesStore()
    const encoreIci = (e: EtapeVoyage) => !!e.commandeId && commandes.getById(e.commandeId)?.voyageId === v.id
    if (v.statut !== 'en_cours') {
      /* Seules les commandes encore dans cet ordre : pas celles reprises entre-temps
       * dans un ordre de replanification ou de reliquat. */
      v.etapes.forEach(e => {
        if (!e.commandeId || e.franchi || e.ligneAnnuleeLe || horsTournee(e)) return
        if (encoreIci(e)) commandes.remettreEnAttente(e.commandeId)
      })
    }
    /* Une ligne sortie de la tournée (indisponible, non conforme, report) et pas encore
     * reprise dans un autre ordre libère sa commande : elle ne reste pas bloquée sur un ordre annulé. */
    v.etapes.forEach(e => {
      if (horsTournee(e) && !e.repriseDansVoyageId && encoreIci(e)) commandes.remettreEnAttente(e.commandeId!)
    })
    /* Carburant : les bons de livraison encore ouverts sont annulés ; après le chargement,
     * le retour du produit au dépôt est enregistré. */
    if (v.carburant) {
      const le = maintenant().toISOString()
      const charge = v.carburant.bonEnlevement?.statut === 'confirme'
      v.etapes.filter(e => e.bonLivraison?.statut === 'emis' && !e.franchi).forEach(e => {
        e.bonLivraison!.statut = 'annule'
        /* Chargé au dépôt : dans la tournée, ou jugé non conforme après le chargement. */
        if (charge && (dansLaTournee(e) || e.chargementNonConformeLe)) e.retourAttenduLe = e.retourAttenduLe ?? le
      })
      v.carburant.bonEnlevement?.historique.push({ le, par: useAuthStore().user?.nom ?? '', action: charge ? 'Ordre annulé : bons de livraison annulés, produit chargé à ramener au dépôt' : 'Ordre annulé : bons de livraison annulés', motif: motif.trim() })
    }
    const etaitPlanifie = !!v.planifieLe && v.statut !== 'en_attente'
    v.statut = 'annule'
    v.annuleLe = maintenant().toISOString()
    v.motifAnnulation = motif.trim()
    v.codeMotifAnnulation = codeMotif || undefined
    /* Les destinataires déjà prévenus de leur livraison apprennent son annulation,
     * avec le libellé du motif choisi, jamais le commentaire interne. */
    if (etaitPlanifie) v.etapes.filter(e => e.destinataire && !e.franchi && !e.ligneAnnuleeLe && !e.repriseDansVoyageId)
      .forEach(e => notifier(v, e, 'annulation', { motif: motifClientAnnulation(v) }))
    if (v.moyen === 'externe') notifierChauffeur(v, `L'expédition ${v.numeroOT || v.reference} du ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')} confiée à ${v.transporteurNom ?? 'votre entreprise'} est annulée : ${v.motifAnnulation}.`)
    else if (v.chauffeurId) notifierChauffeur(v, `La tournée ${v.numeroOT || v.reference} du ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')} est annulée : ${v.motifAnnulation}.`)
    return { ok: true }
  }

  /** Recueille la signature électronique du destinataire d'une ligne,
   *  sur l'appareil du chauffeur, sans jamais pouvoir en sauter une :
   *  ce n'est pas le chauffeur qui atteste être passé, c'est le
   *  destinataire qui confirme avoir été livré. Signer la toute
   *  première ligne d'un ordre encore Planifié fait passer la tournée
   *  à En cours du même geste - il n'y a pas d'étape de démarrage
   *  distincte que le chauffeur poserait à part : commencer à livrer,
   *  c'est ce qui démarre la tournée. Chaque signature déclenche sa
   *  propre notification de livraison, le bon de livraison électronique
   *  et l'envoi de l'enquête de satisfaction pour cette ligne. Une fois
   *  toutes les lignes signées, la tournée passe automatiquement à
   *  Terminé. */
  /** Le chauffeur marque son arrivée sur le point de livraison, avant
   *  de recueillir la signature du destinataire : deux gestes
   *  distincts. Il ne peut arriver sur un point que si le précédent a
   *  déjà été signé - aucun point ne peut être sauté, dans un sens
   *  comme dans l'autre. La toute première arrivée d'une tournée
   *  encore Planifiée la fait passer En cours : c'est bien le
   *  chauffeur qui atteint le terrain qui démarre l'exécution, pas sa
   *  signature. */
  /** Une ligne cesse de bloquer les suivantes dès qu'elle est signée,
   *  reportée ou annulée - mais seule une ligne signée ou annulée est
   *  définitivement résolue : une ligne reportée reste à retenter, et
   *  la tournée ne peut pas se terminer tant qu'elle ne l'a pas été. */
  /** Une déclaration faite sans réseau, gardée sur l'appareil, règle déjà le point : la tournée continue en zone blanche. */
  const declarationEnAttenteReseau = (e: EtapeVoyage) => !!fileDeclarationsLivraison().enAttente(`livraison:${e.id}`)
  function neBloquePlusLaSuite(e: EtapeVoyage) { return e.franchi || !!e.reporteLe || !!e.ligneAnnuleeLe || horsTournee(e) || declarationEnAttenteReseau(e) }
  function definitivementResolue(e: EtapeVoyage) { return e.franchi || !!e.ligneAnnuleeLe || horsTournee(e) }

  function marquerArrivee(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'pret' && v.statut !== 'en_cours')) return { ok: false, motif: 'Ordre introuvable ou pas encore prêt pour exécution.' }
    const tries = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    const index = tries.findIndex(e => e.id === etapeId)
    if (index < 0) return { ok: false, motif: 'Ligne introuvable.' }
    if (tries[index]!.arriveeLe) return { ok: false, motif: 'Arrivée déjà enregistrée pour ce point.' }
    if (tries.slice(0, index).some(e => !neBloquePlusLaSuite(e))) return { ok: false, motif: 'Le point précédent doit être réglé (livraison déclarée, reportée ou refusée) avant celui-ci.' }

    /* Aucun camion ne part sans autorisation de départ accordée, quand l'écran Départs est actif. */
    if (v.statut === 'pret' && departExige(v) && !useDepartsStore().autorisations.some(a => a.voyageId === v.id && a.accordee)) {
      const etat = etatAutorisationDepart(v)
      return { ok: false, motif: etat?.etat === 'refusee' ? `Départ refusé${etat.motif ? ` : ${etat.motif}` : ''}. Une nouvelle autorisation doit être accordée dans Départs.` : etat?.etat === 'en_attente' ? "Départ non autorisé : l'autorisation de départ attend la décision du responsable flotte, dans Départs." : "Départ non autorisé : à demander au responsable flotte, qui l'accorde dans Départs." }
    }
    if (v.statut === 'pret') {
      v.statut = 'en_cours'
      v.dateDepartReel = maintenant().toISOString()
      v.etapes.filter(e => !e.franchi && dansLaTournee(e)).forEach(e => notifier(v, e, 'demarrage'))
    }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (etape) etape.arriveeLe = maintenant().toISOString()
    return { ok: true }
  }

  /** Le chauffeur ne peut pas livrer ce point maintenant (client fermé,
   *  absent au moment du passage...) : la tournée continue sur les
   *  points suivants plutôt que de rester bloquée. Le point reporté
   *  reste visible et pourra être retenté tant que la tournée est en
   *  cours. */
  function reporterLigne(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'en_cours') return { ok: false, motif: 'Ordre introuvable ou pas encore en cours.' }
    if (!motif.trim()) return { ok: false, motif: 'Un motif de report est obligatoire.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || etape.franchi) return { ok: false, motif: 'Ligne introuvable ou livraison déjà déclarée.' }
    etape.reporteLe = maintenant().toISOString()
    etape.motifReport = motif.trim()
    return { ok: true }
  }

  /** Reprendre un point reporté, pour le retenter plus tard dans la
   *  même tournée - efface le report sans toucher au reste. */
  function reprendreLigne(voyageId: string, etapeId: string) {
    const v = getById(voyageId)
    if (!v) return
    const etape = v.etapes.find(e => e.id === etapeId)
    if (etape && etape.reporteLe && !etape.franchi) { etape.reporteLe = undefined; etape.motifReport = undefined }
  }

  /** Le client annule sa propre commande en cours de route : cette
   *  ligne ne sera plus jamais livrée, mais ça ne remet pas en cause le
   *  reste de la tournée. Reste distinct de l'annulation de la tournée
   *  entière (annuler ci-dessous), qui elle reste réservée au
   *  planificateur et concerne l'ordre dans son ensemble. */
  function annulerLigne(voyageId: string, etapeId: string, motif: string, notifierClient = true, saisiPar: 'conducteur' | 'destinataire' = 'conducteur'): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'planifie' && v.statut !== 'en_cours')) return { ok: false, motif: 'Ordre introuvable ou déjà terminé.' }
    if (!motif.trim()) return { ok: false, motif: 'Un motif est obligatoire.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || etape.franchi) return { ok: false, motif: 'Ligne introuvable ou livraison déjà déclarée.' }
    etape.ligneAnnuleeLe = maintenant().toISOString()
    etape.motifAnnulationLigne = motif.trim()
    etape.refusSaisiPar = saisiPar
    etape.reporteLe = undefined
    etape.motifReport = undefined
    /* Refus sur place : la marchandise revient à l'entrepôt, qui la contrôle. */
    if (v.statut === 'en_cours') etape.retourAttenduLe = etape.ligneAnnuleeLe
    if (notifierClient) notifier(v, etape, 'annulation', { texte: v.statut === 'en_cours' ? 'Le refus de votre livraison est enregistré' : `Votre livraison du ${jourLivraison(v, etape)} est annulée`, motif: motif.trim() })
    if (v.etapes.every(definitivementResolue)) {
      v.statut = 'livre'
      v.dateArriveeReelle = maintenant().toISOString()
    }
    return { ok: true }
  }

  /** Un refus enregistré par erreur s'annule tant que le conducteur est encore sur place :
   *  aucun point suivant n'est commencé. Le refus du destinataire lui-même ne s'annule pas ici. */
  function annulerRefus(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'en_cours' && v.statut !== 'livre')) return { ok: false, motif: "Le refus ne s'annule que pendant la tournée." }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e?.ligneAnnuleeLe || e.annuleeAvantDepart || e.incidentBon || e.devieeVers) return { ok: false, motif: "Cette livraison n'a pas de refus à annuler." }
    if (e.refusSaisiPar === 'destinataire') return { ok: false, motif: 'Le destinataire a refusé lui-même depuis son lien : ce refus ne s\'annule pas à sa place.' }
    if (!e.arriveeLe) return { ok: false, motif: "Le conducteur n'est pas passé sur ce point." }
    const suivants = v.etapes.filter(x => x.ordre > e.ordre && dansLaTournee(x))
    if (suivants.some(x => x.arriveeLe)) return { ok: false, motif: 'Le conducteur a déjà commencé le point suivant : le refus ne s\'annule plus.' }
    if (e.retourRecuLe || e.articlesRapportesLe) return { ok: false, motif: "La marchandise est déjà remise à l'entrepôt : le refus ne s'annule plus." }
    if (!motif.trim()) return { ok: false, motif: "Indiquez pourquoi le refus est annulé." }
    tracer(e, `Refus annulé : ${e.motifAnnulationLigne ?? ''}`, motif)
    e.ligneAnnuleeLe = undefined; e.motifAnnulationLigne = undefined; e.refusSaisiPar = undefined; e.retourAttenduLe = undefined
    if (v.statut === 'livre') { v.statut = 'en_cours'; v.dateArriveeReelle = undefined }
    return { ok: true }
  }

  /** Le conducteur annule sa déclaration de livraison (erreur de saisie) tant que le destinataire
   *  ne l'a pas confirmée : le point redevient à déclarer, la tournée reprend si elle était terminée. */
  function annulerDeclarationLivraison(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'en_cours' && v.statut !== 'livre')) return { ok: false, motif: "La déclaration ne s'annule plus : la tournée est clôturée ou annulée." }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e?.livreParChauffeurLe) return { ok: false, motif: "Cette livraison n'est pas déclarée." }
    if (e.receptionConfirmeeClientLe) return { ok: false, motif: 'Le destinataire a déjà confirmé sa réception : la déclaration ne s\'annule plus.' }
    if (e.receptionContesteeLe) return { ok: false, motif: 'Le destinataire a contesté cette livraison : le planificateur traite la contestation.' }
    if (e.reliquatReprisLe || e.articlesRapportesLe || e.retourRecuLe) return { ok: false, motif: 'Les articles non livrés sont déjà repris ou remis : la déclaration ne s\'annule plus.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez pourquoi la déclaration est annulée.' }
    tracer(e, `Déclaration de livraison annulée (déclarée le ${new Date(e.livreParChauffeurLe).toLocaleString('fr-FR')})`, motif)
    e.franchi = false; e.livreParChauffeurLe = undefined; e.eBL = undefined
    e.quantiteRecue = undefined; e.justificationQuantite = undefined; e.ecartQuantite = undefined; e.ecartNonControle = undefined; e.mesuresDepotees = undefined
    e.articles?.forEach(a => { a.statut = undefined; a.motif = undefined })
    if (v.statut === 'livre') { v.statut = 'en_cours'; v.dateArriveeReelle = undefined }
    return { ok: true }
  }

  /** Le client demande l'annulation de sa commande avant le départ : la
   *  demande passe par le planificateur, jamais par le conducteur. La ligne
   *  sort de la tournée, sa commande est annulée avec le motif, et la tournée
   *  continue avec les autres destinataires. */
  function annulerLigneAvantDepart(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (v.statut !== 'confirme' && v.statut !== 'pret') return { ok: false, motif: `Cette annulation s'enregistre avant le départ, quand l'ordre est confirmé ou prêt pour exécution.` }
    if (!motif.trim()) return { ok: false, motif: `Indiquez le motif de l'annulation demandée par le client.` }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || !dansLaTournee(etape)) return { ok: false, motif: 'Ligne introuvable ou déjà sortie de la tournée.' }
    if (!etape.destinataire) return { ok: false, motif: `Un transfert interne n'a pas de client pour en demander l'annulation.` }
    if (v.etapes.filter(dansLaTournee).length === 1) return { ok: false, motif: `C'est la dernière livraison de la tournée : annulez plutôt la tournée entière.` }
    etape.ligneAnnuleeLe = maintenant().toISOString()
    etape.motifAnnulationLigne = motif.trim()
    etape.annuleeAvantDepart = true
    notifier(v, etape, 'annulation', { texte: `Votre livraison du ${jourLivraison(v, etape)} est annulée, à votre demande` })
    if (etape.commandeId) {
      const c = useCommandesStore().getById(etape.commandeId)
      if (c) { c.statut = 'annulee'; c.motifAnnulation = motif.trim(); c.annuleeLe = aujourdhuiISO() }
    }
    v.marchandise.poidsChargeKg = chargeOrdre(v).poidsKg
    v.clientNom = resumeDestinataires(v.etapes.filter(dansLaTournee))
    if (v.statut === 'confirme' && v.chargementEntrepotLe) finaliserControle(v)
    return { ok: true }
  }

  /** Recueille la signature électronique du destinataire d'une ligne,
   *  sur l'appareil du chauffeur : ce n'est pas le chauffeur qui
   *  atteste être passé - il l'a déjà fait en marquant son arrivée -
   *  c'est le destinataire qui confirme avoir été livré. La signature
   *  déclenche automatiquement la notification de livraison, le bon de
   *  livraison électronique et l'envoi de l'enquête de satisfaction
   *  pour cette ligne. Une fois toutes les lignes signées, la tournée
   *  passe automatiquement à Terminé. */
  /** Le chauffeur déclare, depuis son appareil, avoir effectué la livraison.
   *  Ça fait avancer sa tournée (point suivant, fin de tournée), mais ça ne
   *  vaut pas preuve de réception : aucun nom n'est saisi ici, et le bon de
   *  livraison reste « en attente du client » tant que celui-ci n'a pas
   *  confirmé lui-même depuis son espace de suivi. */
  function declarerLivraisonChauffeur(voyageId: string, etapeId: string, articlesNonLivres: { id: string; motif: string }[] = [], quantite: SaisieQuantite = {}): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'en_cours') return { ok: false, motif: 'Ordre introuvable ou pas en cours.' }
    const tries = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    const index = tries.findIndex(e => e.id === etapeId)
    if (index < 0 || tries[index]!.franchi || !tries[index]!.arriveeLe) return { ok: false, motif: "Le conducteur n'est pas encore arrivé sur ce point." }
    const ctrlQte = controleQuantite(v, tries[index]!, quantite)
    if (!ctrlQte.ok) return ctrlQte

    const etape = v.etapes.find(e => e.id === etapeId)
    if (etape) {
      /* Chaque article a son propre sort : la livraison peut être partielle.
         Si rien n'est livré, ce n'est plus une livraison mais un refus. */
      const refus = new Map(articlesNonLivres.map(a => [a.id, a.motif.trim()]))
      if (etape.articles?.length) {
        if (etape.articles.every(a => refus.has(a.id))) return { ok: false, motif: "Aucun article n'est livré : signalez plutôt un refus ou un report." }
        if ([...refus.values()].some(m => !m)) return { ok: false, motif: 'Précisez le motif de chaque article non livré.' }
        etape.articles.forEach(a => {
          if (refus.has(a.id)) { a.statut = 'non_livre'; a.motif = refus.get(a.id) } else { a.statut = 'livre'; a.motif = undefined }
        })
      }
      const livres = etape.articles?.filter(a => a.statut === 'livre') ?? []
      const nonLivres = etape.articles?.filter(a => a.statut === 'non_livre') ?? []

      etape.franchi = true
      etape.livreParChauffeurLe = maintenant().toISOString()
      if (etape.destinataire) {
        notifier(v, etape, 'livraison')
        etape.eBL = {
          reference: etape.bonLivraison?.numero ?? `EBL-${v.numeroOT || v.reference}-${String(index + 1).padStart(2, '0')}`,
          emisLe: etape.livreParChauffeurLe, destinataire: etape.destinataire, adresse: etape.adresseLivraison ?? '',
          produit: ligneCarburant(v, etape) ? (etape.produit ?? v.marchandise.typeProduit) : livres.length ? livres.map(a => a.libelle).join(', ') : (etape.contenuCommande || etape.produit || v.marchandise.typeProduit),
          articlesNonLivres: nonLivres.length ? nonLivres.map(a => ({ libelle: a.libelle, motif: a.motif ?? '' })) : undefined,
        }
      }
      enregistrerQuantite(etape, quantite)
    }
    if (v.etapes.every(definitivementResolue)) {
      v.statut = 'livre'
      v.dateArriveeReelle = maintenant().toISOString()
    }
    return { ok: true }
  }
  /** Seule action qui fait foi : le client confirme lui-même la réception,
   *  depuis son propre espace de suivi. Elle complète le bon de livraison
   *  ouvert par la déclaration du chauffeur et déclenche l'enquête de
   *  satisfaction. Impossible avant que le chauffeur ait déclaré. */
  /** Le client conteste ce que le chauffeur a déclaré. Rien n'est effacé :
   *  la déclaration du chauffeur reste tracée, la contestation s'y ajoute,
   *  et le planificateur voit la ligne en litige. */
  function contesterReceptionClient(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !etape.livreParChauffeurLe) return { ok: false, motif: "Le conducteur n'a pas encore déclaré cette livraison." }
    if (etape.receptionConfirmeeClientLe) return { ok: false, motif: 'Cette réception est déjà confirmée.' }
    if (!motif.trim()) return { ok: false, motif: 'Expliquez ce qui ne va pas.' }
    etape.receptionContesteeLe = maintenant().toISOString()
    etape.motifContestation = motif.trim()
    return { ok: true }
  }

  /** Le planificateur note comment la contestation a été traitée : motif choisi
   *  dans la liste réglable et commentaire. Une contestation arrivée après la
   *  clôture se traite encore : c'est la seule action permise sur un ordre
   *  clôturé, et elle est tracée. */
  function traiterContestation(voyageId: string, etapeId: string, note: string, code?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !etape.receptionContesteeLe) return { ok: false, motif: "Cette livraison n'est pas contestée." }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (etape.contestationTraiteeLe) return { ok: false, motif: 'Cette contestation est déjà traitée.' }
    if (!note.trim()) return { ok: false, motif: 'Indiquez comment la contestation a été traitée.' }
    etape.contestationTraiteeLe = maintenant().toISOString()
    etape.contestationTraiteePar = parQui()
    etape.noteTraitementContestation = note.trim()
    etape.codeTraitementContestation = code || undefined
    if (v.statut === 'cloture') tracer(etape, "Contestation traitée après la clôture de l'ordre", note)
    return { ok: true }
  }

  /* ── Suite d'un ordre : ce qui reste à traiter, et ce qui reste permis ── */
  /** Un ordre annulé en cours de tournée garde la suite des livraisons déjà
   *  faites (facturation, protêt, responsabilité, débriefing) ; un ordre
   *  clôturé est définitif. */
  function suiteOuverte(v: Voyage, e?: EtapeVoyage): boolean {
    if (v.statut === 'cloture') return false
    if (v.statut !== 'annule') return true
    return e ? !!e.livreParChauffeurLe : v.etapes.some(x => x.livreParChauffeurLe)
  }
  const contestationsATraiter = (v: Voyage) => v.etapes.filter(e => e.receptionContesteeLe && !e.contestationTraiteeLe)
  const ecartsAQualifier = (v: Voyage) => v.etapes.filter(e => e.ecartQuantite && !e.ecartQuantite.qualification)
  const notesProtetOuvertes = (v: Voyage) => v.etapes.flatMap(e => (e.notesProtet ?? []).filter(n => n.statut !== 'cloturee'))
  /** Livraison déclarée, ni confirmée ni contestée, au-delà du délai réglé : réputée confirmée. */
  function confirmeeTacitement(e: EtapeVoyage): boolean {
    const delai = useParametresPlanificationStore().parametres.delaiConfirmationTaciteJours
    if (delai == null || !e.livreParChauffeurLe || e.receptionConfirmeeClientLe || e.receptionContesteeLe) return false
    return maintenantMs() >= new Date(e.livreParChauffeurLe).getTime() + delai * 86_400_000
  }
  /** Date à partir de laquelle la livraison est réputée confirmée sans réponse du destinataire. */
  function dateConfirmationTacite(e: EtapeVoyage): string | undefined {
    const delai = useParametresPlanificationStore().parametres.delaiConfirmationTaciteJours
    if (delai == null || !e.livreParChauffeurLe) return undefined
    return new Date(new Date(e.livreParChauffeurLe).getTime() + delai * 86_400_000).toISOString()
  }

  function confirmerReceptionClient(voyageId: string, etapeId: string, nomSignataire: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !etape.livreParChauffeurLe) return { ok: false, motif: "Le conducteur n'a pas encore déclaré cette livraison." }
    if (etape.receptionConfirmeeClientLe) return { ok: false, motif: 'Cette réception est déjà confirmée.' }
    if (etape.receptionContesteeLe) return { ok: false, motif: 'Cette livraison est contestée : le planificateur doit la traiter.' }
    if (!nomSignataire.trim()) return { ok: false, motif: 'Indiquez votre nom.' }
    etape.receptionConfirmeeClientLe = maintenant().toISOString()
    if (etape.eBL) etape.eBL.signePar = nomSignataire.trim()
    /* La confirmation du client signe le bon, quantité reçue comprise. */
    if (etape.quantiteRecue != null) etape.quantiteConfirmeeClientLe = etape.receptionConfirmeeClientLe
    etape.satisfactionEnvoyeeLe = etape.receptionConfirmeeClientLe
    return { ok: true }
  }


  /** Le client, sur place, demande de reporter à une autre date : la
   *  marchandise retourne à l'entrepôt pour être replanifiée, et la ligne
   *  sort de la tournée, qui continue sans elle. C'est un autre report que
   *  « je retenterai plus tard », qui garde la ligne dans la même tournée. */
  function reporterAvecRetour(voyageId: string, etapeId: string, motif: string, dateDemandee?: string, clientAbsent = false): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'en_cours') return { ok: false, motif: 'Ordre introuvable ou pas en cours.' }
    if (!motif.trim()) return { ok: false, motif: 'Un motif est obligatoire.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || etape.franchi || !etape.destinataire) return { ok: false, motif: 'Ligne introuvable ou livraison déjà déclarée.' }
    etape.retourEntrepotLe = maintenant().toISOString()
    etape.motifRetour = motif.trim()
    etape.retourClientAbsent = clientAbsent || undefined
    etape.dateDisponibleClient = clientAbsent ? undefined : dateDemandee || undefined
    etape.reporteLe = undefined
    etape.motifReport = undefined
    if (v.etapes.every(definitivementResolue)) {
      v.statut = 'livre'
      v.dateArriveeReelle = maintenant().toISOString()
    }
    return { ok: true }
  }

  /** L'entrepôt accuse réception de la marchandise revenue de tournée. */
  /** L'entrepôt contrôle l'état de la marchandise revenue de tournée avant
   *  de la réceptionner : rien ne garantit qu'elle soit encore dans l'état
   *  où elle est partie. Conforme, elle est prête à être replanifiée sans
   *  réserve ; non conforme, elle l'est quand même - la ligne reste sortie
   *  de la tournée, personne ne force le client à recevoir un produit
   *  abîmé - mais l'anomalie reste tracée pour être traitée à part. */
  function recevoirRetour(voyageId: string, etapeId: string, conforme: boolean, motif?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !retourAControler(etape)) return { ok: false, motif: "Cette ligne n'a pas de retour à réceptionner." }
    if (etape.retourRecuLe) return { ok: false, motif: 'Ce retour est déjà réceptionné.' }
    if (!conforme && !motif?.trim()) return { ok: false, motif: "Précisez ce qui ne va pas sur la marchandise revenue." }
    etape.retourRecuLe = maintenant().toISOString()
    if (conforme) { etape.retourConformeLe = etape.retourRecuLe } else { etape.retourNonConformeLe = etape.retourRecuLe; etape.motifRetourNonConforme = motif!.trim() }
    return { ok: true }
  }

  /** Les articles non livrés d'une livraison signée restent un rappel pour
   *  le chauffeur tant qu'il ne les a pas physiquement rapportés à
   *  l'entrepôt - indépendamment du sort de la tournée qui les portait,
   *  qui peut très bien être déjà terminée et hors de vue. */
  /** Ce que le conducteur rapporte : articles non livrés, marchandise d'un report avec retour ou d'un refus. */
  const aRapporter = (e: EtapeVoyage) => !!e.eBL?.articlesNonLivres?.length || !!e.retourEntrepotLe || !!e.retourAttenduLe
  function confirmerArticlesRapportes(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !aRapporter(etape)) return { ok: false, motif: 'Aucune marchandise à rapporter pour cette ligne.' }
    if (etape.articlesRapportesLe) return { ok: false, motif: 'Cette marchandise est déjà remise.' }
    if (etape.retourRecuLe) return { ok: false, motif: "L'entrepôt a déjà réceptionné ce retour." }
    etape.articlesRapportesLe = maintenant().toISOString()
    return { ok: true }
  }

  /** Tout ce qu'un conducteur doit encore rapporter à l'entrepôt ou au dépôt,
   *  toutes tournées confondues, terminées ou non, jusqu'à ce qu'il l'ait remis
   *  ou que l'entrepôt l'ait réceptionné. */
  const articlesARapporter = computed(() => voyages.value.flatMap(v => v.etapes
    .filter(e => aRapporter(e) && !e.articlesRapportesLe && !e.retourRecuLe)
    .map(etape => ({ voyage: v, etape }))))
  /** Ce qui est à rapporter pour une ligne, tel que le conducteur le lit. */
  function libelleARapporter(e: EtapeVoyage): string {
    if (e.eBL?.articlesNonLivres?.length) return e.eBL.articlesNonLivres.map(a => a.libelle).join(', ')
    return e.contenuCharge || e.contenuCommande || e.produit || ''
  }

  /** Réponse du destinataire à l'enquête de satisfaction, depuis son
   *  propre espace de suivi - jamais saisie à sa place par le
   *  chauffeur ou le planificateur. Ne s'applique qu'à une ligne déjà
   *  signée, et une seule fois. */
  function repondreSatisfaction(etapeId: string, note: number, commentaire?: string): { ok: boolean; motif?: string } {
    const trouve = trouverLigne(etapeId)
    if (!trouve) return { ok: false, motif: 'Livraison introuvable.' }
    if (!trouve.etape.receptionConfirmeeClientLe) return { ok: false, motif: `L'enquête n'est proposée qu'après votre confirmation de réception.` }
    if (trouve.etape.satisfactionNote != null) return { ok: false, motif: 'Vous avez déjà répondu à cette enquête.' }
    if (!Number.isFinite(note) || note < 1 || note > 5) return { ok: false, motif: 'Choisissez une note de 1 à 5.' }
    trouve.etape.satisfactionNote = Math.round(note)
    if (commentaire?.trim()) trouve.etape.satisfactionCommentaire = commentaire.trim()
    return { ok: true }
  }

  /** Règle unique de clôture, la même depuis la Flotte et depuis la
   *  Planification : un dernier contrôle par un rôle habilité, sur un ordre
   *  terminé dont toutes les livraisons sont réglées, sans contestation non
   *  traitée, avec le kilométrage au retour et les documents prévus sur ce
   *  voyage. Renvoie chaque blocage, pour l'afficher à l'écran. */
  function blocagesCloture(id: string, kmArrivee: number | null | undefined, objet: 'voyage' | 'ordre' = 'voyage'): string[] {
    const v = getById(id)
    if (!v) return ['Ordre introuvable.']
    const out: string[] = []
    if (!habilite()) out.push(MOTIF_NON_HABILITE)
    if (v.statut !== 'livre') out.push(objet === 'ordre' ? `Cet ordre n'est pas terminé : il ne peut pas encore être clôturé.` : `Ce voyage n'est pas terminé : il ne peut pas encore être clôturé.`)
    const nonReglees = v.etapes.filter(e => e.role === 'livraison' && !definitivementResolue(e))
    if (nonReglees.length) out.push(`${nonReglees.length} livraison(s) ne sont pas réglées : ${nonReglees.map(e => e.destinataire ?? e.siteNom).join(', ')}.`)
    const contestees = v.etapes.filter(e => e.receptionContesteeLe && !e.contestationTraiteeLe)
    if (contestees.length) out.push(`Livraison contestée par ${contestees.map(e => e.destinataire ?? e.siteNom).join(', ')} : traitez la contestation avant de clôturer.`)
    const notes = v.etapes.filter(e => e.notesProtet?.some(n => n.statut !== 'cloturee'))
    if (notes.length) out.push(`Note de protêt non clôturée pour ${notes.map(e => e.destinataire ?? e.siteNom).join(', ')} : clôturez-la avant de clôturer.`)
    const ecarts = v.etapes.filter(e => e.ecartQuantite && !e.ecartQuantite.qualification)
    if (ecarts.length) out.push(`Écart de quantité à qualifier chez ${ecarts.map(e => e.destinataire ?? e.siteNom).join(', ')} : qualifiez-le en gain ou en coulage avant de clôturer.`)
    /* Le relevé au retour est facultatif à la clôture : sans saisie, le
     *  compteur connu du véhicule est repris. Une saisie est contrôlée. */
    if (kmArrivee == null || (kmArrivee as unknown) === '' || Number.isNaN(Number(kmArrivee))) { /* repris du compteur */ }
    else if (kmArrivee < 0) out.push('Le kilométrage au retour ne peut pas être négatif.')
    else if (v.kmDepart != null && kmArrivee < v.kmDepart) out.push(`Le kilométrage au retour ne peut pas être inférieur au kilométrage au départ (${v.kmDepart.toLocaleString('fr-FR')} km).`)
    const c = completudeDossier(id)
    if (!c.complet) out.push(`Dossier incomplet : ${c.manquants.map(m => LIB_DOC[m]).join(', ')}.`)
    return out
  }

  /** Un écart anormalement élevé au kilométrage de référence est signalé à
   *  l'appelant sans bloquer la clôture : c'est à l'utilisateur de juger. */
  function cloturer(id: string, kmArrivee: number | null | undefined, objet: 'voyage' | 'ordre' = 'voyage'): { ok: boolean; motif?: string; alerteEcart?: string } {
    const blocages = blocagesCloture(id, kmArrivee, objet)
    if (blocages.length) return { ok: false, motif: blocages.join(' ') }
    const v = getById(id)!
    const veh = v.vehiculeId ? useVehiculeStore().parId(v.vehiculeId) : null
    const saisi = kmArrivee == null || (kmArrivee as unknown) === '' || Number.isNaN(Number(kmArrivee)) ? null : Number(kmArrivee)
    /* Sans saisie, le compteur du véhicule tenu par le FMS fait foi. */
    const compteur = veh && (v.kmDepart == null || veh.kilometrage >= v.kmDepart) ? veh.kilometrage : null
    const km = saisi ?? compteur
    if (km == null) { changerStatut(id, 'cloture'); v.clotureLe = maintenant().toISOString(); return { ok: true } }
    v.kmArrivee = km
    /* Le relevé au retour met à jour le kilométrage du véhicule (FMS-DB-03). */
    if (veh && saisi != null) {
      ;(veh.relevesKm ??= []).push({ le: maintenant().toISOString(), km, source: 'Retour de voyage', voyageRef: v.reference })
      if (km > veh.kilometrage) veh.kilometrage = km
    }
    /* Au-delà de la tolérance du type d'écart « Écart kilométrique », un écart
       est ouvert à la clôture (détection télématique) ; l'appelant le signale. */
    const tolerance = useConfigTypesEcartStore().reglage('ecart_kilometrique')?.seuilValeur
    const ecart = calculerEcartKm({ ...v, kmArrivee: km }, tolerance ?? Infinity)
    let alerteEcart: string | undefined
    if (tolerance != null && ecart.horsTolerance && ecart.ecartKm != null)
      alerteEcart = `Kilométrage réel (${km - (v.kmDepart ?? 0)} km) éloigné du kilométrage de référence (${v.kmReference} km), écart de ${ecart.ecartPourcent} % : un écart kilométrique est ouvert, à qualifier.`
    changerStatut(id, 'cloture')
    v.clotureLe = maintenant().toISOString()
    return { ok: true, alerteEcart }
  }

  /* ══════════════════════════════════════════════════════════
     Saisies faites sans réseau (conducteur, destinataire) : elles sont
     gardées sur l'appareil puis transmises au retour de la connexion. La
     transmission tient compte de ce qui a pu se passer entre-temps.
     ══════════════════════════════════════════════════════════ */
  /** Contrôles de la déclaration de livraison faisables sur l'appareil,
   *  avant de la garder en attente du réseau. */
  function verifierDeclarationLivraison(voyageId: string, etapeId: string, articlesNonLivres: { id: string; motif: string }[] = [], quantite: SaisieQuantite = {}): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'en_cours') return { ok: false, motif: 'Ordre introuvable ou pas en cours.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || etape.franchi || !etape.arriveeLe) return { ok: false, motif: "Le conducteur n'est pas encore arrivé sur ce point." }
    const ctrlQte = controleQuantite(v, etape, quantite)
    if (!ctrlQte.ok) return ctrlQte
    if (etape.articles?.length) {
      const refus = new Map(articlesNonLivres.map(a => [a.id, a.motif.trim()]))
      if (etape.articles.every(a => refus.has(a.id))) return { ok: false, motif: "Aucun article n'est livré : signalez plutôt un refus ou un report." }
      if ([...refus.values()].some(m => !m)) return { ok: false, motif: 'Précisez le motif de chaque article non livré.' }
    }
    return { ok: true }
  }
  type ResultatTransmission = { ok: boolean; motif?: string; dejaFait?: boolean; conflit?: boolean }
  /** Transmet une déclaration de livraison faite sans réseau, à l'heure où
   *  elle a été faite. Déjà déclarée entre-temps : rien à refaire. Ligne
   *  refusée, annulée ou sortie de la tournée entre-temps : conflit, motif à l'appui. */
  function transmettreDeclarationLivraison(voyageId: string, etapeId: string, articlesNonLivres: { id: string; motif: string }[], declareLe: string, quantite: SaisieQuantite = {}): ResultatTransmission {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape) return { ok: false, conflit: true, motif: "Cette livraison n'existe plus dans la tournée." }
    if (etape.livreParChauffeurLe) return { ok: true, dejaFait: true }
    if (v.statut === 'annule') return { ok: false, conflit: true, motif: `La tournée a été annulée entre-temps${v.motifAnnulation ? ` : ${v.motifAnnulation}` : ''}.` }
    if (etape.ligneAnnuleeLe) return { ok: false, conflit: true, motif: `Cette livraison a été refusée ou annulée entre-temps${etape.motifAnnulationLigne ? ` : ${etape.motifAnnulationLigne}` : ''}.` }
    if (horsTournee(etape)) return { ok: false, conflit: true, motif: 'Cette livraison a été sortie de la tournée entre-temps.' }
    const r = declarerLivraisonChauffeur(voyageId, etapeId, articlesNonLivres, quantite)
    if (!r.ok) return { ok: false, conflit: true, motif: r.motif }
    etape.livreParChauffeurLe = declareLe
    if (etape.ecartQuantite) etape.ecartQuantite.detecteLe = declareLe
    if (etape.eBL) etape.eBL.emisLe = declareLe
    return { ok: true }
  }
  /** Transmet une contestation faite sans réseau par le destinataire. */
  function transmettreContestationReception(voyageId: string, etapeId: string, motif: string, contesteeLe: string): ResultatTransmission {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape) return { ok: false, conflit: true, motif: "Cette livraison n'existe plus." }
    if (etape.receptionContesteeLe) return { ok: true, dejaFait: true }
    if (etape.receptionConfirmeeClientLe) return { ok: false, conflit: true, motif: 'Cette réception a déjà été confirmée.' }
    if (!etape.livreParChauffeurLe) return { ok: false, conflit: true, motif: "La déclaration du conducteur a été annulée entre-temps : il n'y a plus rien à contester." }
    const r = contesterReceptionClient(voyageId, etapeId, motif)
    if (!r.ok) return { ok: false, conflit: true, motif: r.motif }
    etape.receptionContesteeLe = contesteeLe
    return { ok: true }
  }
  /** Transmet une confirmation de réception faite sans réseau par le destinataire. */
  function transmettreConfirmationReception(voyageId: string, etapeId: string, nomSignataire: string, confirmeLe: string): ResultatTransmission {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape) return { ok: false, conflit: true, motif: "Cette livraison n'existe plus." }
    if (etape.receptionConfirmeeClientLe) return { ok: true, dejaFait: true }
    if (etape.ligneAnnuleeLe) return { ok: false, conflit: true, motif: `Cette livraison a été refusée ou annulée entre-temps${etape.motifAnnulationLigne ? ` : ${etape.motifAnnulationLigne}` : ''}.` }
    if (etape.receptionContesteeLe) return { ok: false, conflit: true, motif: `Cette livraison a été contestée entre-temps${etape.motifContestation ? ` : ${etape.motifContestation}` : ''}.` }
    const r = confirmerReceptionClient(voyageId, etapeId, nomSignataire)
    if (!r.ok) return { ok: false, conflit: true, motif: r.motif }
    etape.receptionConfirmeeClientLe = confirmeLe
    if (etape.quantiteConfirmeeClientLe) etape.quantiteConfirmeeClientLe = confirmeLe
    etape.satisfactionEnvoyeeLe = confirmeLe
    return { ok: true }
  }

  /* ══════════════════════════════════════════════════════════
     Proposition de chargement validée : un ordre de transport en attente
     par véhicule, avec ses commandes, sans le planifier.
     ══════════════════════════════════════════════════════════ */
  function creerOrdreDepuisCommandes(saisie: {
    vehiculeId: string; chauffeurId?: string; chauffeurNom?: string; datePlanifiee: string; typeProduit?: string
  }, commandeIds: string[]): { ok: boolean; motif?: string; id?: string } {
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!saisie.datePlanifiee) return { ok: false, motif: 'Renseignez la date prévue.' }
    if (!commandeIds.length) return { ok: false, motif: 'Aucune commande pour ce véhicule.' }
    const vehicules = useVehiculeStore()
    const veh = vehicules.parId(saisie.vehiculeId)
    if (!veh) return { ok: false, motif: 'Véhicule introuvable.' }
    if (vehiculeOccupe(veh.id)) return { ok: false, motif: `${veh.immatriculation} vient d'être engagé sur un autre ordre.` }
    const srId = vehicules.attelageActif(veh.id)?.semiRemorqueId
    const sr = srId ? vehicules.parId(srId) : undefined
    if (srId && remorqueOccupee(srId)) return { ok: false, motif: `La semi-remorque ${sr?.immatriculation ?? ''} vient d'être engagée sur un autre ordre.` }
    const cmdStore = useCommandesStore()
    const cmds = commandeIds.map(id => cmdStore.getById(id))
    const perdue = cmds.findIndex(c => !c || c.statut !== 'en_attente')
    if (perdue >= 0) return { ok: false, motif: `La commande ${cmds[perdue]?.referenceExterne || commandeIds[perdue]} n'est plus en attente : elle a été prise ou retirée entre-temps.` }
    let chauffeurId = saisie.chauffeurId, chauffeurNom = saisie.chauffeurNom
    if (chauffeurId && (chauffeurIndisponible(chauffeurId, saisie.datePlanifiee) || !useDocumentsStore().enRegle(chauffeurId))) { chauffeurId = undefined; chauffeurNom = undefined }
    const id = creerRapide({
      vehiculeId: veh.id, vehiculePlaque: veh.immatriculation, chauffeurId, chauffeurNom,
      semiRemorqueId: srId, semiRemorquePlaque: sr?.immatriculation, datePlanifiee: saisie.datePlanifiee,
      typeProduit: saisie.typeProduit, confirmationRequise: true,
    })
    const lignes: EtapeVoyage[] = cmds.map((c, i) => ({
      id: `${id}-L${maintenantMs()}-${i}`, ordre: i + 1,
      siteId: c!.siteId, siteNom: c!.adresseLivraison, destinataire: c!.siteId ? undefined : c!.destinataire,
      adresseLivraison: c!.adresseLivraison, lat: c!.lat, lng: c!.lng, role: 'livraison', intervalleMin: 0, franchi: false,
      poidsKg: c!.poidsKg, volumeM3: c!.volumeM3, canalNotification: c!.canalNotification,
      commandeId: c!.id, contenuCommande: c!.contenu, referenceExterne: c!.referenceExterne,
      nombreUnites: c!.nombreUnites, produit: produitDeCommande(c!),
    }))
    cmdStore.affecter(commandeIds, id)
    definirLignes(id, lignes)
    return { ok: true, id }
  }

  /* ══════════════════════════════════════════════════════════
     Quantités reçues et écarts autorisés.
     ══════════════════════════════════════════════════════════ */
  /** Produit d'une commande : celui choisi, sinon celui que son contenu nomme. */
  function produitDeCommande(c: { produit?: string; contenu: string }): string | undefined {
    return c.produit ?? useProduitsStore().resoudre(c.contenu)?.nom
  }
  /** Contrôle de la quantité reçue face à la quantité chargée et aux écarts
   *  autorisés : hors tolérance, la saisie est bloquée (à corriger ou à
   *  justifier) ou seulement signalée, selon le réglage. */
  /** Livraison de carburant : ligne d'une tournée validée, avec son bon de livraison. */
  function ligneCarburant(v: Voyage, e: EtapeVoyage) { return !!v.carburant && !!e.bonLivraison }
  /** Compartiments chargés pour une livraison de carburant. */
  function compartimentsDe(v: Voyage, e: EtapeVoyage) {
    return (v.carburant?.plan ?? []).filter(x => x.commandeId && x.commandeId === e.commandeId && (x.volumeL ?? 0) > 0 && !x.nonCharge)
  }
  /** Carburant : base de comparaison de l'écart, d'après les mesures saisies au BSL. À 15 °C quand le volume à
   *  15 °C est saisi pour chaque compartiment ; sinon sur le volume saisi ; sinon aucune comparaison possible. */
  function baseCarburant(v: Voyage, e: EtapeVoyage): 'volume15' | 'volume' | null {
    const bsl = v.carburant?.bonEnlevement?.bsl?.mesures ?? []
    const mes = compartimentsDe(v, e).map(c => bsl.find(m => m.numero === c.numero))
    if (!mes.length) return null
    if (mes.every(m => m?.volume15 != null)) return 'volume15'
    if (mes.every(m => m?.volumeL != null)) return 'volume'
    return null
  }
  /** Unité de la quantité d'une ligne : litres à 15 °C ou litres pour le carburant, l'unité de comptage sinon. */
  function uniteQuantite(v: Voyage, e: EtapeVoyage): string {
    if (!ligneCarburant(v, e)) return useParametresPlanificationStore().parametres.uniteComptage
    return baseCarburant(v, e) === 'volume' ? 'L' : 'L à 15 °C'
  }
  const MOTIF_SANS_CONTROLE = "Écart non contrôlé : ni le volume à 15 °C ni le volume chargé n'ont été saisis à l'enlèvement."
  /** Carburant : le volume dépoté est exigé pour chaque compartiment, avec sa température, sa densité et son volume
   *  à 15 °C ; un compartiment non dépoté (0 L) exige un motif. La quantité reçue se compte dans la base du chargement. */
  function avecMesures(v: Voyage, e: EtapeVoyage, q: SaisieQuantite): { ok: boolean; motif?: string; q: SaisieQuantite } {
    if (!ligneCarburant(v, e)) return { ok: true, q }
    if (!q.mesures?.length) return { ok: false, motif: 'Indiquez les volumes dépotés, compartiment par compartiment.', q }
    const comps = compartimentsDe(v, e)
    /* Le volume à 15 °C saisi fait foi ; à défaut, il se calcule avec la méthode réglée. */
    const ctrl15 = useControlesTransportStore()
    const completee = (m: MesureCompartiment) => {
      const c = comps.find(x => x.numero === m.numero)
      return ctrl15.volume15Retenu(m, c?.produit ?? e.produit)
    }
    for (const c of comps) {
      const m = q.mesures.find(x => x.numero === c.numero)
      if (m && m.volumeL === 0) {
        if (!m.motifNonDepote?.trim()) return { ok: false, motif: `Compartiment ${c.numero} non dépoté : indiquez le motif.`, q }
        continue
      }
      const err = controlerMesure(m ? completee(m) : {}, `Compartiment ${c.numero}`)
      if (err) {
        const apercu = m ? ctrl15.apercuVolume15(m.volumeL, m.temperature, c.produit ?? e.produit) : null
        if (apercu && 'raison' in apercu && /indiquez le volume à 15 °C/.test(err)) return { ok: false, motif: `${err.replace(/\.$/, '')} : ${apercu.raison} pour ${c.produit ?? e.produit}.`, q }
        return { ok: false, motif: err, q }
      }
    }
    const retenues: MesureCompartiment[] = q.mesures.filter(m => comps.some(c => c.numero === m.numero))
      .map(m => m.volumeL === 0 ? { numero: m.numero, volumeL: 0, motifNonDepote: m.motifNonDepote!.trim() } : { ...completee(m), motifNonDepote: undefined })
    const depotees = retenues.filter(m => (m.volumeL ?? 0) > 0)
    if (!depotees.length) return { ok: false, motif: "Aucun compartiment n'est dépoté : signalez plutôt un refus ou un report.", q }
    const base = baseCarburant(v, e)
    return { ok: true, q: { ...q, mesures: retenues, recue: base === 'volume' ? totalVolume(depotees) : totalA15(depotees) } }
  }
  /** Quantité de référence du contrôle d'écart : pour le fret, la quantité chargée déclarée par
   *  l'entrepôt quand elle existe, sinon celle de la commande ; pour le carburant, le volume chargé. */
  function quantiteReference(v: Voyage, e: EtapeVoyage): number | undefined {
    return ligneCarburant(v, e) ? e.nombreUnites : (e.quantiteChargee ?? e.nombreUnites)
  }
  function controleQuantite(v: Voyage, e: EtapeVoyage, q0: SaisieQuantite): { ok: boolean; motif?: string; horsTolerance?: boolean; ecartMotif?: string; sansControle?: boolean } {
    const m = avecMesures(v, e, q0)
    if (!m.ok) return { ok: false, motif: m.motif }
    const q = m.q
    if (q.recue == null) return { ok: true }
    if (!Number.isFinite(q.recue)) return { ok: false, motif: 'Indiquez la quantité reçue en chiffres.' }
    if (q.recue < 0) return { ok: false, motif: 'La quantité reçue ne peut pas être négative.' }
    const ref = quantiteReference(v, e)
    if (ref == null) return { ok: true }
    /* Sans volume saisi à l'enlèvement, l'écart ne peut pas se contrôler. */
    if (ligneCarburant(v, e) && !baseCarburant(v, e)) return { ok: true, sansControle: true }
    const r = useControlesTransportStore().controlerEcart(e.destinataire, e.produit ?? v.marchandise.typeProduit, ref, q.recue)
    if (!r.ok && !r.horsTolerance) return { ok: false, motif: r.motif }
    if (!r.ok && !q.justification?.trim()) return { ok: false, motif: `${r.motif} Corrigez la quantité reçue ou justifiez l'écart.` }
    return { ok: true, horsTolerance: r.horsTolerance, ecartMotif: r.motif }
  }
  function enregistrerQuantite(e: EtapeVoyage, q0: SaisieQuantite) {
    const v = voyages.value.find(x => x.etapes.includes(e))
    const q = v ? avecMesures(v, e, q0).q : q0
    if (q.recue == null) return
    const ctrl = v ? controleQuantite(v, e, q) : { ok: true }
    if (q.mesures?.length) {
      e.mesuresDepotees = q.mesures.map(m => ({ ...m }))
      if (e.eBL) {
        e.eBL.volumes = q.mesures.filter(m => (m.volumeL ?? 0) > 0).map(m => ({ ...m }))
        /* Un compartiment non dépoté figure au bon de livraison comme non livré, avec son motif. */
        const nonDepotes = q.mesures.filter(m => m.volumeL === 0)
        if (nonDepotes.length) {
          const libelle = (n: number) => e.articles?.find(a => a.libelle.startsWith(`Compartiment ${n} `))?.libelle ?? `Compartiment ${n}`
          e.eBL.articlesNonLivres = nonDepotes.map(m => ({ libelle: libelle(m.numero), motif: m.motifNonDepote ?? '' }))
          e.articles?.forEach(a => {
            const nd = nonDepotes.find(m => a.libelle.startsWith(`Compartiment ${m.numero} `))
            if (nd) { a.statut = 'non_livre'; a.motif = nd.motifNonDepote } else { a.statut = 'livre'; a.motif = undefined }
          })
        }
      }
    }
    e.quantiteRecue = q.recue
    e.justificationQuantite = q.justification?.trim() || undefined
    if (e.eBL) e.eBL.quantiteRecue = q.recue
    e.ecartNonControle = 'sansControle' in ctrl && ctrl.sansControle ? MOTIF_SANS_CONTROLE : undefined
    /* Hors tolérance : un écart est ouvert, à qualifier. */
    const ref = v ? quantiteReference(v, e) : e.nombreUnites
    if ('horsTolerance' in ctrl && ctrl.horsTolerance && ref != null) {
      e.ecartQuantite = { quantiteChargee: ref, quantiteRecue: q.recue, ecart: q.recue - ref, horsTolerance: true,
        motif: ctrl.ecartMotif, unite: v ? uniteQuantite(v, e) : undefined, detecteLe: maintenant().toISOString(), commentaire: e.justificationQuantite }
    } else e.ecartQuantite = undefined
  }
  function figee(v: Voyage) { return v.statut === 'cloture' || v.statut === 'annule' }
  const MOTIF_FIGE = 'Cet ordre est clôturé ou annulé : il n’est plus modifiable.'

  /** Quantité reçue saisie après coup par le responsable, tant que le client n'a pas confirmé. */
  function saisirQuantiteRecue(voyageId: string, etapeId: string, q: SaisieQuantite): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    if (!v || !e) return { ok: false, motif: 'Livraison introuvable.' }
    if (figee(v)) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!e.livreParChauffeurLe) return { ok: false, motif: "La quantité reçue se saisit une fois la livraison déclarée." }
    if (e.receptionConfirmeeClientLe) return { ok: false, motif: 'Le client a déjà confirmé sa réception : la quantité reçue est attestée.' }
    if (q.recue == null) return { ok: false, motif: 'Indiquez la quantité reçue.' }
    const r = controleQuantite(v, e, q)
    if (!r.ok) return r
    const ancienne = e.quantiteRecue
    enregistrerQuantite(e, q)
    /* Correction par le responsable : l'ancienne valeur reste tracée, avec l'auteur et la date. */
    if (ancienne != null && ancienne !== e.quantiteRecue) tracer(e, `Quantité reçue corrigée : ${ancienne.toLocaleString('fr-FR')} remplacée par ${e.quantiteRecue!.toLocaleString('fr-FR')} ${uniteQuantite(v, e)}`, q.justification)
    return { ok: true }
  }

  /** Qualification d'un écart signalé : gain ou coulage, imputable ou non au conducteur. */
  function qualifierEcart(voyageId: string, etapeId: string, saisie: { qualification?: QualificationEcart; imputableConducteur: boolean; commentaire: string }): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    if (!v || !e?.ecartQuantite) return { ok: false, motif: 'Aucun écart à qualifier sur cette livraison.' }
    if (!suiteOuverte(v, e)) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (saisie.qualification !== 'gain' && saisie.qualification !== 'coulage') return { ok: false, motif: "Qualifiez l'écart en gain ou en coulage." }
    if (saisie.qualification === 'gain' && e.ecartQuantite.ecart < 0) return { ok: false, motif: "L'écart est négatif (moins reçu que chargé) : c'est un coulage, pas un gain." }
    if (saisie.qualification === 'coulage' && e.ecartQuantite.ecart > 0) return { ok: false, motif: "L'écart est positif (plus reçu que chargé) : c'est un gain, pas un coulage." }
    if (!saisie.commentaire.trim()) return { ok: false, motif: 'Ajoutez un commentaire sur cet écart.' }
    Object.assign(e.ecartQuantite, { qualification: saisie.qualification, imputableConducteur: saisie.imputableConducteur, commentaire: saisie.commentaire.trim(),
      qualifieLe: maintenant().toISOString(), qualifiePar: useAuthStore().user?.nom ?? '' })
    /* La fiche de débriefing déjà enregistrée reprend le gain ou le coulage qualifié, le reste est gardé. */
    if (v.debriefing) v.debriefing.gainOuCoulage = debriefingPrerempli(v).gainOuCoulage
    return { ok: true }
  }

  /** Faits enregistrés sur une livraison, qui fondent la responsabilité. */
  function faitsLigne(e: EtapeVoyage): string[] {
    const out: string[] = []
    if (e.chargementNonConformeLe) out.push(`Non conforme au chargement : ${e.motifNonConformite ?? ''}`)
    if (e.ligneAnnuleeLe && !e.annuleeAvantDepart) out.push(`Refusée par le destinataire : ${e.motifAnnulationLigne ?? ''}`)
    if (e.eBL?.articlesNonLivres?.length) out.push(`Articles non livrés : ${e.eBL.articlesNonLivres.map(a => `${a.libelle} (${a.motif})`).join(', ')}`)
    if (e.ecartQuantite) out.push(`Écart de quantité : ${e.ecartQuantite.ecart > 0 ? '+' : ''}${e.ecartQuantite.ecart}${e.ecartQuantite.qualification ? `, qualifié en ${LIB_QUALIFICATION[e.ecartQuantite.qualification].toLowerCase()}` : ', à qualifier'}`)
    if (e.receptionContesteeLe) out.push(`Réception contestée : ${e.motifContestation ?? ''}`)
    if (e.retourNonConformeLe) out.push(`Retour non conforme : ${e.motifRetourNonConforme ?? ''}`)
    if (e.satisfactionNote != null && e.satisfactionNote <= 2) out.push(`Destinataire insatisfait : note ${e.satisfactionNote}/5`)
    const enq = e.commandeId ? useCommandesStore().getById(e.commandeId)?.enqueteOrdonnateur : undefined
    if (enq && Math.min(enq.respectOrdre, enq.delais, enq.qualite) <= 2) out.push(`Ordonnateur insatisfait : respect ${enq.respectOrdre}/5, délais ${enq.delais}/5, qualité ${enq.qualite}/5`)
    e.notesProtet?.forEach(n => out.push(`Note de protêt ${n.numero} : ${n.motif}`))
    return out
  }

  /* ══════════════════════════════════════════════════════════
     Notes de protêt : préparées, émises, puis clôturées.
     ══════════════════════════════════════════════════════════ */
  function controlerNote(v: Voyage, e: EtapeVoyage, n: { motif: string; quantiteEnCause: number }): string | null {
    if (!n.motif.trim()) return 'Indiquez le motif de la réserve.'
    if (n.quantiteEnCause == null || !Number.isFinite(n.quantiteEnCause)) return 'Indiquez la quantité en cause.'
    if (n.quantiteEnCause <= 0) return 'La quantité en cause doit être positive.'
    if (e.nombreUnites != null && n.quantiteEnCause > e.nombreUnites) return `La quantité en cause dépasse la quantité chargée pour cette livraison (${e.nombreUnites}).`
    if (!suiteOuverte(v, e)) return MOTIF_FIGE
    return null
  }
  function preparerNoteProtet(voyageId: string, etapeId: string, n: { motif: string; quantiteEnCause: number; piecesJointes: PieceJointe[] }): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    if (!v || !e) return { ok: false, motif: 'Livraison introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!e.arriveeLe && !e.livreParChauffeurLe) return { ok: false, motif: 'Une réserve porte sur une livraison qui a eu lieu : le conducteur doit être passé chez le destinataire.' }
    const m = controlerNote(v, e, n); if (m) return { ok: false, motif: m }
    const total = voyages.value.reduce((s, x) => s + x.etapes.reduce((t, y) => t + (y.notesProtet?.length ?? 0), 0), 0)
    const annee = aujourdhuiISO().slice(0, 4)
    ;(e.notesProtet ??= []).push({
      id: `NP-${maintenantMs()}`, numero: `NP-${annee}-${String(total + 1).padStart(3, '0')}`, motif: n.motif.trim(), quantiteEnCause: n.quantiteEnCause,
      piecesJointes: [...n.piecesJointes], statut: 'en_preparation', prepareeLe: maintenant().toISOString(), prepareePar: useAuthStore().user?.nom ?? '',
    })
    return { ok: true }
  }
  function trouverNote(voyageId: string, etapeId: string, noteId: string) {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    return { v, e, n: e?.notesProtet?.find(x => x.id === noteId) }
  }
  function modifierNoteProtet(voyageId: string, etapeId: string, noteId: string, d: { motif: string; quantiteEnCause: number; piecesJointes: PieceJointe[] }): { ok: boolean; motif?: string } {
    const { v, e, n } = trouverNote(voyageId, etapeId, noteId)
    if (!v || !e || !n) return { ok: false, motif: 'Note de protêt introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (n.statut !== 'en_preparation') return { ok: false, motif: 'Une note émise ne se modifie plus.' }
    const m = controlerNote(v, e, d); if (m) return { ok: false, motif: m }
    Object.assign(n, { motif: d.motif.trim(), quantiteEnCause: d.quantiteEnCause, piecesJointes: [...d.piecesJointes] })
    return { ok: true }
  }
  function emettreNoteProtet(voyageId: string, etapeId: string, noteId: string): { ok: boolean; motif?: string } {
    const { v, e, n } = trouverNote(voyageId, etapeId, noteId)
    if (!v || !e || !n) return { ok: false, motif: 'Note de protêt introuvable.' }
    if (!suiteOuverte(v, e)) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (n.statut !== 'en_preparation') return { ok: false, motif: 'Cette note est déjà émise.' }
    n.statut = 'emise'; n.emiseLe = maintenant().toISOString()
    return { ok: true }
  }
  function cloturerNoteProtet(voyageId: string, etapeId: string, noteId: string, issue: string): { ok: boolean; motif?: string } {
    const { v, e, n } = trouverNote(voyageId, etapeId, noteId)
    if (!v || !e || !n) return { ok: false, motif: 'Note de protêt introuvable.' }
    /* Comme la contestation, une note émise se clôture encore sur un ordre clôturé, tracée. */
    if (v.statut !== 'cloture' && !suiteOuverte(v, e)) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (n.statut !== 'emise') return { ok: false, motif: 'Seule une note émise se clôture.' }
    if (!issue.trim()) return { ok: false, motif: 'Indiquez comment la réserve a été levée ou réglée.' }
    n.statut = 'cloturee'; n.clotureeLe = maintenant().toISOString(); n.issue = issue.trim()
    if (v.statut === 'cloture') tracer(e, `Note de protêt ${n.numero} clôturée après la clôture de l'ordre`, issue)
    return { ok: true }
  }

  /* ══════════════════════════════════════════════════════════
     Responsabilité en cas d'insatisfaction, de perte ou de dommage.
     ══════════════════════════════════════════════════════════ */
  /** Responsabilité établie à partir des faits : un acteur, ou plusieurs avec
   *  leur part en pourcentage (total 100 %). L'impact financier se répartit en
   *  conséquence : la retenue sur la facture du transporteur externe est sa
   *  part de l'avoir au client. Un avoir sur une livraison déjà facturée est
   *  enregistré « avoir à émettre » : c'est la pièce qui corrige la facture. */
  type SaisieResponsabilite = { origine?: OrigineProbleme; acteur?: ActeurResponsable; repartition?: { acteur?: ActeurResponsable | ''; part: number }[]; motif?: string; commentaire: string; impacts: { type: TypeImpactFinancier; montant: number }[] }
  function partsResponsabilite(r: { acteur: ActeurResponsable; repartition?: { acteur: ActeurResponsable; part: number }[] }) {
    return r.repartition?.length ? r.repartition : [{ acteur: r.acteur, part: 100 }]
  }
  /** Part de l'impact financier portée par chaque acteur. */
  function impactsRepartis(r: { acteur: ActeurResponsable; repartition?: { acteur: ActeurResponsable; part: number }[]; impacts: { type: TypeImpactFinancier; montant: number }[] }) {
    const total = r.impacts.filter(i => i.type === 'avoir_client').reduce((t, i) => t + i.montant, 0)
    return partsResponsabilite(r).map(x => ({ ...x, montant: Math.round(total * x.part / 100) }))
  }
  function etablirResponsabilite(voyageId: string, etapeId: string, saisie: SaisieResponsabilite): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    if (!v || !e) return { ok: false, motif: 'Livraison introuvable.' }
    if (!suiteOuverte(v, e)) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!faitsLigne(e).length) return { ok: false, motif: "Aucun fait n'est enregistré sur cette livraison : rien ne fonde une responsabilité." }
    if (!saisie.origine || !LIB_ORIGINE_PROBLEME[saisie.origine]) return { ok: false, motif: "Choisissez l'origine du problème." }
    const rep = (saisie.repartition?.length ? saisie.repartition : [{ acteur: saisie.acteur, part: 100 }])
    if (rep.some(x => !x.acteur || !LIB_ACTEUR_RESPONSABLE[x.acteur])) return { ok: false, motif: "Choisissez l'acteur responsable." }
    const repartition = rep.map(x => ({ acteur: x.acteur as ActeurResponsable, part: Number(x.part) }))
    if (new Set(repartition.map(x => x.acteur)).size !== repartition.length) return { ok: false, motif: 'Un même acteur ne figure qu\'une fois dans la répartition.' }
    if (repartition.some(x => x.acteur === 'transporteur_externe') && v.moyen !== 'externe') return { ok: false, motif: "Cette expédition n'a pas été confiée à un transporteur externe." }
    if (repartition.some(x => x.acteur === 'transporteur_interne') && v.moyen === 'externe') return { ok: false, motif: 'Cette expédition a été confiée à un transporteur externe, pas à nos moyens.' }
    if (repartition.some(x => !Number.isFinite(x.part) || x.part <= 0)) return { ok: false, motif: 'La part de chaque acteur doit être un pourcentage positif.' }
    const somme = repartition.reduce((t, x) => t + x.part, 0)
    if (Math.abs(somme - 100) > 0.001) return { ok: false, motif: `La répartition doit totaliser 100 % (actuellement ${somme.toLocaleString('fr-FR')} %).` }
    if (!saisie.commentaire.trim()) return { ok: false, motif: 'Ajoutez un commentaire.' }
    for (const i of saisie.impacts) {
      if (!LIB_IMPACT[i.type]) return { ok: false, motif: "Choisissez le type d'impact financier." }
      if (i.montant == null || !Number.isFinite(i.montant) || i.montant <= 0) return { ok: false, motif: "Le montant d'un impact financier doit être positif." }
    }
    if (new Set(saisie.impacts.map(i => i.type)).size !== saisie.impacts.length) return { ok: false, motif: "Un même type d'impact ne se saisit qu'une fois." }
    const partExterne = repartition.find(x => x.acteur === 'transporteur_externe')?.part ?? 0
    const avoir = saisie.impacts.find(i => i.type === 'avoir_client')?.montant ?? 0
    let impacts = saisie.impacts.map(i => ({ ...i }))
    if (impacts.some(i => i.type === 'retenue_transporteur') && !partExterne) return { ok: false, motif: 'Une retenue sur facture ne vise que le transporteur externe responsable.' }
    /* Avoir et transporteur externe responsable : sa retenue est sa part de l'avoir. */
    if (avoir && partExterne) impacts = [...impacts.filter(i => i.type !== 'retenue_transporteur'), { type: 'retenue_transporteur', montant: Math.round(avoir * partExterne / 100) }]
    const retenueAvant = (e.responsabilite?.impacts ?? []).find(i => i.type === 'retenue_transporteur')?.montant ?? 0
    const retenueApres = impacts.find(i => i.type === 'retenue_transporteur')?.montant ?? 0
    if (retenueAvant !== retenueApres && v.factureTransporteur?.statut === 'validee') return { ok: false, motif: 'La facture du transporteur est déjà validée : la retenue ne peut plus s’y appliquer.' }
    /* Livraison déjà facturée : l'avoir est à émettre ; une fois émis, il ne change plus. */
    const fac = e.facturation?.statut === 'facturee' ? e.facturation : undefined
    if (fac?.avoirAEmettre?.emisLe && fac.avoirAEmettre.montant !== avoir) return { ok: false, motif: `L'avoir ${fac.avoirAEmettre.reference ?? ''} est déjà émis : son montant ne se modifie plus.` }
    const principal = [...repartition].sort((a, b) => b.part - a.part)[0]!.acteur
    e.responsabilite = { origine: saisie.origine, acteur: principal, repartition: repartition.length > 1 ? repartition : undefined,
      motif: saisie.motif?.trim() || undefined, commentaire: saisie.commentaire.trim(), impacts,
      etablieLe: maintenant().toISOString(), etabliePar: useAuthStore().user?.nom ?? '' }
    if (fac && !fac.avoirAEmettre?.emisLe) fac.avoirAEmettre = avoir ? { montant: avoir, depuisLe: e.responsabilite.etablieLe } : undefined
    return { ok: true }
  }
  /** L'avoir à émettre sur une livraison déjà facturée est émis, avec sa référence. */
  function emettreAvoir(voyageId: string, etapeId: string, reference: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    const a = e?.facturation?.avoirAEmettre
    if (!v || !e || !a) return { ok: false, motif: "Aucun avoir à émettre sur cette livraison." }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (a.emisLe) return { ok: false, motif: 'Cet avoir est déjà émis.' }
    if (!reference.trim()) return { ok: false, motif: "Indiquez la référence de l'avoir." }
    const ref = reference.trim().toLowerCase()
    if (voyages.value.some(x => x.etapes.some(y => y.facturation?.reference?.toLowerCase() === ref || y.facturation?.avoirAEmettre?.reference?.toLowerCase() === ref))) return { ok: false, motif: 'Cette référence est déjà utilisée.' }
    Object.assign(a, { reference: reference.trim(), emisLe: maintenant().toISOString(), emisPar: parQui() })
    return { ok: true }
  }

  /* ══════════════════════════════════════════════════════════
     Fiche de débriefing du voyage.
     ══════════════════════════════════════════════════════════ */
  /** Valeurs reprises du voyage quand la donnée existe. */
  function debriefingPrerempli(v: Voyage): Omit<FicheDebriefing, 'enregistreeLe' | 'enregistreePar'> {
    const lignes = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    const livrees = lignes.filter(e => e.livreParChauffeurLe)
    const dechargement = livrees.map(e => e.livreParChauffeurLe!).sort().pop() ?? v.dateArriveeReelle ?? ''
    const unite = useParametresPlanificationStore().parametres.uniteComptage
    const ecarts = lignes.filter(e => e.ecartQuantite?.qualification).map(e => {
      const x = e.ecartQuantite!
      return `${LIB_QUALIFICATION[x.qualification!]} de ${Math.abs(x.ecart).toLocaleString('fr-FR')} ${x.unite ?? (ligneCarburant(v, e) ? uniteQuantite(v, e) : unite)} chez ${e.destinataire ?? e.siteNom}, ${x.imputableConducteur ? 'imputable' : 'non imputable'} au conducteur`
    })
    const lieux = [...new Set((livrees.length ? livrees : lignes.filter(e => e.role === 'livraison')).map(e => e.adresseLivraison ?? e.siteNom))]
    return {
      numeroBon: v.numeroOT || v.reference,
      dateChargement: (v.chargementEntrepotLe ?? v.dateDepartReel ?? '').slice(0, 16),
      dateDechargement: dechargement.slice(0, 16),
      lieu: lieux.join(' ; ') || (v.destination !== '-' ? v.destination : ''),
      vehicule: (v.moyen === 'externe' ? v.vehiculeTransporteurPlaque : v.vehiculePlaque) ?? '',
      citerne: v.moyen === 'externe' ? '' : v.semiRemorquePlaque ?? '',
      gainOuCoulage: ecarts.join(' ; '),
      observations: '',
    }
  }
  function enregistrerDebriefing(voyageId: string, f: Omit<FicheDebriefing, 'enregistreeLe' | 'enregistreePar'>): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v) return { ok: false, motif: 'Voyage introuvable.' }
    if (!suiteOuverte(v)) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (v.statut !== 'en_cours' && v.statut !== 'livre' && v.statut !== 'annule') return { ok: false, motif: 'La fiche de débriefing se remplit au retour du voyage, une fois celui-ci parti.' }
    /* Le gain ou coulage qualifié découle des écarts qualifiés : il n'est pas ressaisi. */
    const derive = debriefingPrerempli(v).gainOuCoulage
    if (derive) f = { ...f, gainOuCoulage: derive }
    if (!f.numeroBon.trim()) return { ok: false, motif: 'Indiquez le numéro de bon.' }
    if (!f.vehicule.trim()) return { ok: false, motif: 'Indiquez le véhicule.' }
    if (f.dateChargement && f.dateDechargement && f.dateDechargement < f.dateChargement) return { ok: false, motif: 'La date de déchargement ne peut pas précéder la date de chargement.' }
    v.debriefing = { ...f, numeroBon: f.numeroBon.trim(), vehicule: f.vehicule.trim(), lieu: f.lieu.trim(), citerne: f.citerne.trim(), gainOuCoulage: f.gainOuCoulage.trim(), observations: f.observations.trim(),
      enregistreeLe: maintenant().toISOString(), enregistreePar: useAuthStore().user?.nom ?? '' }
    return { ok: true }
  }

  /* ══════════════════════════════════════════════════════════
     Facturation des prestations pour le compte de clients, et contrôle
     des factures des transporteurs externes.
     ══════════════════════════════════════════════════════════ */
  /** Qui paie le fret d'une livraison : réglé sur sa commande, sinon le réglage par défaut. */
  function fretALaCharge(e: EtapeVoyage): 'ordonnateur' | 'destinataire' {
    const c = e.commandeId ? useCommandesStore().getById(e.commandeId) : undefined
    return c?.fretALaCharge ?? useParametresPlanificationStore().parametres.fretALaChargeDefaut
  }
  /** Client facturé pour une livraison : l'ordonnateur qui confie ses marchandises,
   *  ou le destinataire, selon qui a le fret à sa charge. Un ordonnateur interne
   *  (service de l'entreprise) qui a le fret à sa charge : rien à facturer. */
  function clientFacture(e: EtapeVoyage): { client?: ReturnType<ReturnType<typeof useClientsStore>['parNom']>; motif?: string } {
    const clients = useClientsStore()
    if (fretALaCharge(e) === 'ordonnateur') {
      const confiePar = e.commandeId ? useCommandesStore().getById(e.commandeId)?.ordonnateurExterne : undefined
      if (!confiePar) return { motif: "Fret à la charge de l'ordonnateur, un service de l'entreprise : rien à facturer." }
      const c = clients.parNom(confiePar)
      return c ? { client: c } : { motif: `${confiePar}, qui a le fret à sa charge, n'a pas de fiche client.` }
    }
    const dest = clients.parNom(e.destinataire)
    return dest ? { client: dest } : { motif: `${e.destinataire ?? 'Le destinataire'}, qui a le fret à sa charge, n'a pas de fiche client.` }
  }
  /** Réception attestée : confirmée par le destinataire, ou réputée confirmée faute de réponse dans le délai réglé. */
  const receptionAttestee = (e: EtapeVoyage) => !!e.receptionConfirmeeClientLe || confirmeeTacitement(e)
  function distanceKmEntre(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371, rad = Math.PI / 180
    const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
  }
  /** Distance propre à une livraison : depuis le point de livraison précédent
   *  où le véhicule est passé, ou depuis le départ pour la première. Jamais la
   *  distance de toute la tournée, qui serait facturée à chaque livraison. */
  function distanceLivraison(v: Voyage, e: EtapeVoyage): number | undefined {
    const precedentes = [...v.etapes].filter(x => x.role === 'livraison' && x.ordre < e.ordre && (x.arriveeLe || x.livreParChauffeurLe)).sort((a, b) => a.ordre - b.ordre)
    const depuis = precedentes[precedentes.length - 1] ?? pointDepart(v)
    if (!depuis) return undefined
    const km = Math.round(distanceKmEntre(depuis, e))
    return km > 0 ? km : undefined
  }
  /** Livraisons de l'expédition facturées au même client : elles se partagent un forfait au trajet. */
  function livraisonsDuClient(v: Voyage, clientId: string): EtapeVoyage[] {
    return v.etapes.filter(x => x.role === 'livraison' && x.destinataire && !x.ligneAnnuleeLe && !horsTournee(x)
      && (v.statut !== 'annule' || x.livreParChauffeurLe) && clientFacture(x).client?.id === clientId).sort((a, b) => a.ordre - b.ordre)
  }
  /** Montant de la prestation selon la tarification du client, sans ressaisie. */
  function valorisationLivraison(v: Voyage, e: EtapeVoyage): { ok: boolean; motif?: string; clientId?: string; clientNom?: string; montant?: number; detail?: string; avoirs?: number; partForfait?: number; tacite?: boolean } {
    if (e.facturation?.statut === 'facturee') return { ok: true, clientId: e.facturation.clientId, montant: e.facturation.montant, detail: e.facturation.detail }
    if (v.statut === 'annule' && !e.livreParChauffeurLe) return { ok: false, motif: "Ordre annulé : cette livraison n'a pas eu lieu." }
    const { client, motif } = clientFacture(e)
    if (!client) return { ok: false, motif }
    if (!receptionAttestee(e)) return { ok: false, motif: 'À facturer une fois la livraison confirmée par le client.' }
    if (e.ecartQuantite && !e.ecartQuantite.qualification) return { ok: false, motif: "Qualifiez l'écart de quantité avant de facturer." }
    if (e.receptionContesteeLe && !e.contestationTraiteeLe) return { ok: false, motif: 'Traitez la contestation avant de facturer.' }
    const tarif = useTarifsTransportStore().tarifPour({
      cible: 'client', tiersId: client.id, trajetId: v.trajetId, distanceKm: distanceLivraison(v, e),
      quantite: e.quantiteRecue ?? e.nombreUnites, poidsKg: e.poidsKg, produit: e.produit ?? v.marchandise.typeProduit,
    })
    if (!tarif) return { ok: false, motif: `Aucune grille tarifaire de ${client.nom} ne s'applique à cette livraison (trajet, distance, quantité ou poids manquant).` }
    let brut = tarif.montant, detail = tarif.detail, partForfait: number | undefined
    /* Forfait au trajet : compté une seule fois pour l'expédition, réparti entre
       les livraisons du client ; les parts déjà facturées sont gardées. */
    if (tarif.tarif.base === 'trajet') {
      const parts = livraisonsDuClient(v, client.id)
      if (parts.length > 1) {
        const deja = parts.filter(x => x.facturation?.statut === 'facturee').reduce((t, x) => t + (x.facturation!.partForfait ?? 0), 0)
        const restantes = parts.filter(x => x.facturation?.statut !== 'facturee')
        const part = Math.round((tarif.montant - deja) / restantes.length)
        const derniere = restantes[restantes.length - 1]?.id === e.id
        brut = derniere ? tarif.montant - deja - part * (restantes.length - 1) : part
        brut = Math.max(0, brut)
        detail = `${tarif.detail} réparti entre ${parts.length} livraisons`
      }
      partForfait = brut
    }
    const avoirs = (e.responsabilite?.impacts ?? []).filter(i => i.type === 'avoir_client').reduce((s2, i) => s2 + i.montant, 0)
    return { ok: true, clientId: client.id, clientNom: client.nom, montant: Math.max(0, brut - avoirs), avoirs, partForfait, tacite: !e.receptionConfirmeeClientLe,
      detail: `${detail}${avoirs ? `, moins un avoir de ${avoirs.toLocaleString('fr-FR')}` : ''}` }
  }
  function marquerFacturee(voyageId: string, etapeId: string, reference: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const e = v?.etapes.find(x => x.id === etapeId)
    if (!v || !e) return { ok: false, motif: 'Livraison introuvable.' }
    if (v.statut === 'annule' && !e.livreParChauffeurLe) return { ok: false, motif: MOTIF_FIGE }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (e.facturation?.statut === 'facturee') return { ok: false, motif: 'Cette livraison est déjà facturée.' }
    if (!reference.trim()) return { ok: false, motif: 'Indiquez la référence de la facture.' }
    const ref = reference.trim().toLowerCase()
    if (voyages.value.some(x => x.etapes.some(y => y.facturation?.reference?.toLowerCase() === ref || y.facturation?.avoirAEmettre?.reference?.toLowerCase() === ref))) return { ok: false, motif: 'Cette référence de facture est déjà utilisée.' }
    const val = valorisationLivraison(v, e)
    if (!val.ok) return { ok: false, motif: val.motif }
    e.facturation = { statut: 'facturee', clientId: val.clientId!, montant: val.montant!, detail: val.detail!, reference: reference.trim(),
      factureeLe: maintenant().toISOString(), factureePar: useAuthStore().user?.nom ?? '', partForfait: val.partForfait }
    return { ok: true }
  }

  /** Montant attendu du transporteur externe, selon sa tarification, retenues déduites.
   *  Ordre annulé en route : seules les livraisons faites se paient. */
  function montantAttenduTransporteur(v: Voyage): { montant: number; brut: number; retenues: number; detail: string } | null {
    if (v.moyen !== 'externe' || !v.transporteurId) return null
    const lignes = v.statut === 'annule' ? v.etapes.filter(e => e.livreParChauffeurLe) : v.etapes.filter(dansLaTournee)
    const tarif = useTarifsTransportStore().tarifPour({
      cible: 'transporteur', tiersId: v.transporteurId, trajetId: v.trajetId, distanceKm: v.kmReference || undefined,
      quantite: lignes.reduce((s2, e) => s2 + (e.nombreUnites ?? 0), 0) || undefined, poidsKg: lignes.reduce((s2, e) => s2 + (e.poidsKg ?? 0), 0) || undefined, produit: v.marchandise.typeProduit,
    })
    if (!tarif) return null
    const retenues = v.etapes.flatMap(e => e.responsabilite?.impacts ?? []).filter(i => i.type === 'retenue_transporteur').reduce((s2, i) => s2 + i.montant, 0)
    return { brut: tarif.montant, retenues, montant: Math.max(0, tarif.montant - retenues), detail: tarif.detail }
  }
  function saisirFactureTransporteur(voyageId: string, f: { reference: string; montantFacture: number }): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v) return { ok: false, motif: 'Expédition introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (v.moyen !== 'externe') return { ok: false, motif: "Cette expédition n'a pas été confiée à un transporteur externe." }
    if (v.factureTransporteur?.statut === 'validee') return { ok: false, motif: 'La facture du transporteur est déjà validée.' }
    const groupee = factureGroupeeDe(v.id)
    if (groupee) return { ok: false, motif: `Cette expédition est déjà couverte par la facture ${groupee.numero} du transporteur.` }
    if (!f.reference.trim()) return { ok: false, motif: 'Indiquez la référence de la facture du transporteur.' }
    if (f.montantFacture == null || !Number.isFinite(f.montantFacture) || f.montantFacture <= 0) return { ok: false, motif: 'Le montant facturé doit être positif.' }
    v.factureTransporteur = { reference: f.reference.trim(), montantFacture: f.montantFacture, saisieLe: maintenant().toISOString(), saisiePar: useAuthStore().user?.nom ?? '', statut: 'a_controler' }
    return { ok: true }
  }
  /** Écart entre la facture et le montant convenu, au-delà de la tolérance réglée. */
  function ecartFactureHorsTolerance(v: Voyage): number | null {
    const f = v.factureTransporteur, attendu = montantAttenduTransporteur(v)
    if (!f || !attendu) return null
    const ecart = f.montantFacture - attendu.montant
    return Math.abs(ecart) > useParametresPlanificationStore().parametres.toleranceFactureTransporteur ? ecart : null
  }
  /** Sans grille tarifaire applicable, seul un rôle habilité valide, avec un motif. */
  function validerFactureTransporteur(voyageId: string, motifSansTarif = ''): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const f = v?.factureTransporteur
    if (!v || !f) return { ok: false, motif: 'Aucune facture saisie.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (f.statut !== 'a_controler') return { ok: false, motif: 'Cette facture a déjà été contrôlée.' }
    const effectuee = v.statut === 'livre' || v.statut === 'cloture' || (v.statut === 'annule' && v.etapes.some(e => e.livreParChauffeurLe))
    if (!effectuee) return { ok: false, motif: v.statut === 'annule' ? "L'expédition a été annulée sans aucune livraison faite : rien n'est à payer." : "L'expédition n'est pas terminée : seules les expéditions réellement effectuées se paient." }
    const attendu = montantAttenduTransporteur(v)
    if (!attendu) {
      if (!useParametresPlanificationStore().peutValiderSansTarif(useAuthStore().role)) return { ok: false, motif: "Aucune grille tarifaire du transporteur ne s'applique : le montant convenu est inconnu. Ajoutez sa grille, ou faites valider par un rôle habilité, avec un motif." }
      if (!motifSansTarif.trim()) return { ok: false, motif: 'Indiquez le motif de la validation sans grille tarifaire.' }
      f.motifValidationSansTarif = motifSansTarif.trim()
    } else {
      const ecart = ecartFactureHorsTolerance(v)
      if (ecart != null) return { ok: false, motif: `Le montant facturé (${f.montantFacture.toLocaleString('fr-FR')}) diffère du montant convenu (${attendu.montant.toLocaleString('fr-FR')}) au-delà de l'écart toléré : refusez la facture ou faites-la corriger.` }
    }
    f.statut = 'validee'; f.decideeLe = maintenant().toISOString(); f.decideePar = useAuthStore().user?.nom ?? ''
    return { ok: true }
  }
  function refuserFactureTransporteur(voyageId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const f = v?.factureTransporteur
    if (!v || !f) return { ok: false, motif: 'Aucune facture saisie.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (f.statut !== 'a_controler') return { ok: false, motif: 'Cette facture a déjà été contrôlée.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du refus.' }
    f.statut = 'refusee'; f.motifRefus = motif.trim(); f.decideeLe = maintenant().toISOString(); f.decideePar = useAuthStore().user?.nom ?? ''
    return { ok: true }
  }

  /* Factures de transporteur couvrant plusieurs expéditions, rapprochées
     des expéditions confiées, de leur statut de livraison et du tarif. */
  const CLE_FACTURES_GROUPEES = 'fms-ucodis-factures-transporteurs'
  function chargerFacturesGroupees(): FactureTransporteurGroupee[] {
    try { const p = JSON.parse(localStorage.getItem(CLE_FACTURES_GROUPEES) ?? '[]'); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  const facturesGroupees = ref<FactureTransporteurGroupee[]>(chargerFacturesGroupees())
  watch(facturesGroupees, () => { try { localStorage.setItem(CLE_FACTURES_GROUPEES, JSON.stringify(facturesGroupees.value)) } catch { /* stockage indisponible */ } }, { deep: true })
  /** Expéditions confiées à ce transporteur externe. */
  function expeditionsDuTransporteur(transporteurId: string): Voyage[] {
    return voyages.value.filter(v => v.moyen === 'externe' && v.transporteurId === transporteurId)
  }
  /** Facture groupée (non refusée) qui couvre déjà cette expédition. */
  function factureGroupeeDe(voyageId: string, ignorerId?: string): FactureTransporteurGroupee | undefined {
    return facturesGroupees.value.find(f => f.id !== ignorerId && f.statut !== 'refusee' && f.voyageIds.includes(voyageId))
  }
  const expeditionTerminee = (v: Voyage) => v.statut === 'livre' || v.statut === 'cloture' || (v.statut === 'annule' && v.etapes.some(e => e.livreParChauffeurLe))
  /** Rapprochement : pour chaque expédition, son statut de livraison et le montant convenu ; total convenu et écart. */
  function rapprochementFacture(voyageIds: string[], montantTotal: number | null) {
    const lignes = voyageIds.map(id => getById(id)).filter((v): v is Voyage => !!v).map(v => {
      const attendu = montantAttenduTransporteur(v)
      return { voyage: v, terminee: expeditionTerminee(v), convenu: attendu?.montant ?? null }
    })
    const totalConvenu = lignes.reduce((t, l) => t + (l.convenu ?? 0), 0)
    const sansTarif = lignes.filter(l => l.convenu == null).length
    const ecart = montantTotal != null && Number.isFinite(montantTotal) && lignes.length ? montantTotal - totalConvenu : null
    const horsTolerance = ecart != null && !sansTarif && Math.abs(ecart) > useParametresPlanificationStore().parametres.toleranceFactureTransporteur
    return { lignes, totalConvenu, sansTarif, ecart, horsTolerance, nonTerminees: lignes.filter(l => !l.terminee).length }
  }
  function saisirFactureGroupee(f: { transporteurId: string; numero: string; date: string; montantTotal: number; voyageIds: string[] }): { ok: boolean; motif?: string } {
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (!f.numero.trim()) return { ok: false, motif: 'Indiquez le numéro de la facture.' }
    if (!f.date) return { ok: false, motif: 'Indiquez la date de la facture.' }
    if (f.date > aujourdhuiISO()) return { ok: false, motif: 'La date de la facture ne peut pas être dans le futur.' }
    if (f.montantTotal == null || !Number.isFinite(f.montantTotal) || f.montantTotal <= 0) return { ok: false, motif: 'Le montant total doit être positif.' }
    if (!f.voyageIds.length) return { ok: false, motif: 'Cochez au moins une expédition couverte par la facture.' }
    const num = f.numero.trim().toLowerCase()
    if (facturesGroupees.value.some(x => x.transporteurId === f.transporteurId && x.numero.toLowerCase() === num)) return { ok: false, motif: 'Ce numéro de facture est déjà enregistré pour ce transporteur.' }
    for (const id of f.voyageIds) {
      const v = getById(id)
      if (!v || v.moyen !== 'externe' || v.transporteurId !== f.transporteurId) return { ok: false, motif: `L'expédition ${id} n'a pas été confiée à ce transporteur.` }
      const deja = factureGroupeeDe(id)
      if (deja) return { ok: false, motif: `L'expédition ${id} figure déjà dans la facture ${deja.numero}.` }
      if (v.factureTransporteur && v.factureTransporteur.statut !== 'refusee') return { ok: false, motif: `L'expédition ${id} a déjà sa propre facture ${v.factureTransporteur.reference}.` }
    }
    facturesGroupees.value.push({ id: `FTR-${String(facturesGroupees.value.length + 1).padStart(3, '0')}-${maintenantMs()}`, transporteurId: f.transporteurId, numero: f.numero.trim(), date: f.date,
      montantTotal: f.montantTotal, voyageIds: [...f.voyageIds], saisieLe: maintenant().toISOString(), saisiePar: parQui(), statut: 'a_controler' })
    return { ok: true }
  }
  function validerFactureGroupee(id: string, motifSansTarif = ''): { ok: boolean; motif?: string } {
    const f = facturesGroupees.value.find(x => x.id === id)
    if (!f) return { ok: false, motif: 'Facture introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (f.statut !== 'a_controler') return { ok: false, motif: 'Cette facture a déjà été contrôlée.' }
    const r = rapprochementFacture(f.voyageIds, f.montantTotal)
    if (r.nonTerminees) return { ok: false, motif: `${r.nonTerminees} expédition(s) de la facture ne sont pas terminées : seules les expéditions réellement effectuées se paient.` }
    if (r.sansTarif) {
      if (!useParametresPlanificationStore().peutValiderSansTarif(useAuthStore().role)) return { ok: false, motif: "Aucune grille tarifaire du transporteur ne s'applique à certaines expéditions : le montant convenu est inconnu. Ajoutez sa grille, ou faites valider par un rôle habilité, avec un motif." }
      if (!motifSansTarif.trim()) return { ok: false, motif: 'Indiquez le motif de la validation sans grille tarifaire.' }
      f.motifValidationSansTarif = motifSansTarif.trim()
    } else if (r.horsTolerance) {
      return { ok: false, motif: `Le montant facturé (${f.montantTotal.toLocaleString('fr-FR')}) diffère du total convenu (${r.totalConvenu.toLocaleString('fr-FR')}) au-delà de l'écart toléré : refusez la facture ou faites-la corriger.` }
    }
    f.statut = 'validee'; f.decideeLe = maintenant().toISOString(); f.decideePar = parQui()
    return { ok: true }
  }
  function refuserFactureGroupee(id: string, motif: string): { ok: boolean; motif?: string } {
    const f = facturesGroupees.value.find(x => x.id === id)
    if (!f) return { ok: false, motif: 'Facture introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (f.statut !== 'a_controler') return { ok: false, motif: 'Cette facture a déjà été contrôlée.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du refus.' }
    f.statut = 'refusee'; f.motifRefus = motif.trim(); f.decideeLe = maintenant().toISOString(); f.decideePar = parQui()
    return { ok: true }
  }

  return {
    facturesGroupees, expeditionsDuTransporteur, factureGroupeeDe, rapprochementFacture, saisirFactureGroupee, validerFactureGroupee, refuserFactureGroupee,
    voyages, documents,
    enCours, aCloturer,
    getById, documentsDuVoyage,
    completudeDossier, ecartPoids, ecartKm,
    creer, creerVoyage, controlePompe, changerStatut, cloturer, blocagesCloture,
    enAttente, planifies, confirmes, prets, enCoursKanban, enAttenteCloture, clotures, annules,
    creerRapide, definirLignes, planifier, annuler, modifierAffectation, remorqueOccupee, controleCharge, annulerLigneAvantDepart, marquerArrivee, declarerLivraisonChauffeur, capaciteOrdre, replanifierReliquat, confirmerReceptionClient, contesterReceptionClient, traiterContestation,
    trouverLigne, repondreSatisfaction, lienSuivi, reinitialiser, reporterAvecRetour, recevoirRetour, clientProposeDate, accepterDateClient,
    confirmerArticlesRapportes, articlesARapporter,
    vehiculeOccupe, chauffeurIndisponible, reporterLigne, reprendreLigne, annulerLigne,
    confirmerClient, declarerIndisponible, proposerDate, confirmerNouvelleDate, refuserNouvelleDate,
    declarerChargementEntrepot, validerChargementChauffeur, controlerLigneChargement,
    verifierDeclarationLivraison, transmettreDeclarationLivraison, transmettreConfirmationReception, creerOrdreDepuisCommandes,
    moyensDe, renotifierSiMoyensChanges, coordonneesDe, notificationsNonEnvoyees, jourLivraison, motifClientAnnulation, definirTransport, modifierItineraire, controleContraintes, recalculerHeuresPrevues, produitDeCommande,
    saisirQuantiteRecue, qualifierEcart, faitsLigne,
    preparerNoteProtet, modifierNoteProtet, emettreNoteProtet, cloturerNoteProtet,
    etablirResponsabilite, debriefingPrerempli, enregistrerDebriefing,
    valorisationLivraison, marquerFacturee, montantAttenduTransporteur, saisirFactureTransporteur, validerFactureTransporteur, refuserFactureTransporteur,
    emettreAvoir, impactsRepartis, partsResponsabilite, ecartFactureHorsTolerance, fretALaCharge, distanceLivraison,
    suiteOuverte, contestationsATraiter, ecartsAQualifier, notesProtetOuvertes, confirmeeTacitement, dateConfirmationTacite, receptionAttestee,
    finaliserControle, reevaluerConfirmation, notifier, resumeDestinataires, ligneCarburant, compartimentsDe, uniteQuantite, baseCarburant,
    marchandiseDe, tolerancePoids, figee, messageTourneeConfiee,
    etatAutorisationDepart, demanderAutorisationDepart, departExige, corrigerChargementEntrepot, annulerNonConformite, annulerRefus, annulerDeclarationLivraison,
    transmettreContestationReception, quantiteReference, libelleARapporter,
    controleConducteur, creerOrdreControle,
  }

  /** Conducteur retenable à une date : disponible (ni absent, ni engagé sur un autre ordre) et pièces obligatoires en règle. */
  function controleConducteur(personnelId: string, dateISO?: string, ignorerVoyageId?: string, nom?: string): { ok: boolean; motif?: string } {
    const qui = nom || 'Ce conducteur'
    const indispo = chauffeurIndisponible(personnelId, dateISO, ignorerVoyageId)
    if (indispo) return { ok: false, motif: `${qui} n'est pas disponible (${indispo}) : choisissez un autre conducteur.` }
    if (!useDocumentsStore().enRegle(personnelId)) return { ok: false, motif: `${qui} n'est pas en règle : une pièce obligatoire est expirée ou manquante.` }
    return { ok: true }
  }
  /** Création d'un ordre depuis sa fiche : conducteur vérifié (disponible et en règle), transporteur externe autorisé. */
  function creerOrdreControle(saisie: Parameters<typeof creerRapide>[0]): { ok: boolean; motif?: string; id?: string } {
    if (saisie.moyen === 'externe') {
      const r = verifierTransporteur(saisie.transporteurId, saisie.vehiculeTransporteurId, saisie.conducteurTransporteurId)
      if (!r.ok) return r
    } else if (saisie.chauffeurId) {
      const r = controleConducteur(saisie.chauffeurId, saisie.datePlanifiee, undefined, saisie.chauffeurNom)
      if (!r.ok) return r
    }
    return { ok: true, id: creerRapide(saisie) }
  }
})
