import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Voyage, StatutVoyage, ArretReleve, DocumentVoyage, TypeDocVoyage, EtapeVoyage, NotificationClient } from '../types'
import { calculerEcartPoids, calculerEcartKm } from '../utils/voyageUtils'
import { useTrajetsStore } from './trajets'
import { aujourdhuiISO } from '../utils/horloge'

/** Pièces obligatoires au dossier de voyage · conditionnent la clôture,
 *  le bon de livraison étant explicitement cité par la SOP. */
export const DOCS_OBLIGATOIRES: TypeDocVoyage[] = ['ordre_transport', 'bon_chargement', 'feuille_route', 'bon_livraison']

export const LIB_DOC: Record<TypeDocVoyage, string> = {
  ordre_transport: 'Ordre de transport',
  bon_chargement: 'Bon de chargement',
  feuille_route: 'Feuille de route',
  bon_livraison: 'Bon de livraison',
  note_reserve: 'Note de réserve',
}

/**
 * Store du VOYAGE · repris du socle FMS, objet pivot du suivi
 * d'exploitation. Adapté au fret général d'UCODIS : poids et cartons au
 * lieu de volumes de carburant, écart de poids au lieu de coulage.
 */
export const useVoyagesStore = defineStore('voyages', () => {

  const voyages = ref<Voyage[]>([
    {
      id: 'VOY-001', reference: 'VOY-2026-0148', numeroOT: 'OT-2026-04412',
      statut: 'litige',
      clientNom: 'Jumbo Score Tanjombato', toleranceEcartPoidsPourcent: 0.5,
      trajetId: 'TRJ-001', trajetLibelle: 'Antananarivo → Toamasina (RN2 standard)', etapes: [],
      origine: 'Antananarivo', destination: 'Toamasina',
      vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA',
      semiRemorqueId: 'v-sr-1', semiRemorquePlaque: 'RM 4101',
      chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      datePlanifiee: '2026-08-24T05:30:00',
      dateDepartReel: '2026-08-24T05:48:00',
      dateArriveeReelle: '2026-08-24T18:12:00',
      kmReference: 352, kmDepart: 182_100, kmArrivee: 182_478,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 480, poidsChargeKg: 9600, poidsDechargeKg: 9550 },
      nbEcarts: 1, nbArretsNonJustifies: 1, createdAt: '2026-08-23T14:00:00',
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
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-09-02T16:30:00',
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
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-08-19T11:00:00',
    },
    {
      id: 'VOY-004', reference: 'VOY-2026-0150',
      statut: 'planifie',
      clientNom: 'Leader Price Antsirabe', toleranceEcartPoidsPourcent: 0.5,
      trajetId: 'TRJ-002', trajetLibelle: 'Antananarivo → Antsirabe (RN7)', etapes: [],
      origine: 'Antananarivo', destination: 'Antsirabe',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA',
      semiRemorqueId: 'v-sr-3', semiRemorquePlaque: 'RM 4103',
      chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      datePlanifiee: '2026-09-10T06:30:00',
      kmReference: 168,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 300, poidsChargeKg: 6000 },
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-09-04T09:15:00',
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
      nbEcarts: 1, nbArretsNonJustifies: 0, createdAt: '2026-08-25T15:00:00',
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
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-08-09T14:00:00',
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
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-08-17T10:00:00',
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
      datePlanifiee: '2026-09-08T05:30:00',
      dateDepartReel: '2026-09-08T05:40:00',
      kmReference: 570, kmDepart: 54_100,
      marchandise: { typeProduit: 'Matériaux de construction', nombreCartons: 210, poidsChargeKg: 9200 },
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-09-07T16:00:00',
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
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-08-04T11:00:00',
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
      nbEcarts: 1, nbArretsNonJustifies: 0, createdAt: '2026-07-27T09:00:00',
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
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-08-21T13:00:00',
    },
    /* Exemple de tournée multi-destinataires déjà terminée, telle que
       produite par le module Planification : deux lignes signées, l'une
       avec une réponse déjà reçue à l'enquête de satisfaction, l'autre
       encore en attente - pour montrer les deux états sans manipulation. */
    {
      id: 'VOY-012', reference: 'VOY-2026-0158', numeroOT: 'OT-2026-04430',
      statut: 'livre',
      clientNom: 'Leader Price Antsirabe et 1 autre(s)', toleranceEcartPoidsPourcent: 1,
      etapes: [
        {
          id: 'VOY-012-L1', ordre: 1, siteNom: 'Lot II M 12, Antsirabe', destinataire: 'Leader Price Antsirabe',
          adresseLivraison: 'Lot II M 12, Antsirabe', lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 0, franchi: true,
          signeLe: '2026-09-01T09:40:00',
          eBL: { reference: 'EBL-OT-2026-04430-01', emisLe: '2026-09-01T09:40:00', destinataire: 'Leader Price Antsirabe', adresse: 'Lot II M 12, Antsirabe', produit: 'Produits alimentaires secs', signePar: 'Notiavina R., réceptionniste' },
          satisfactionEnvoyeeLe: '2026-09-01T09:40:00', satisfactionNote: 5, satisfactionCommentaire: 'Livraison à l\'heure, chauffeur très courtois.',
          notifications: [
            { id: 'NOTIF-011-1', type: 'planification', canal: 'sms', envoyeeLe: '2026-09-01T06:00:00', contenu: 'Votre livraison a été planifiée pour le 01/09/2026. Véhicule 4028 TBA, chauffeur Tsiory Rabearison, arrivée estimée à environ 25 min de trajet.' },
            { id: 'NOTIF-011-2', type: 'demarrage', canal: 'sms', envoyeeLe: '2026-09-01T07:05:00', contenu: 'Votre livraison est en cours. Chauffeur Tsiory Rabearison, arrivée estimée dans environ 25 min. Contact : Tsiory Rabearison.' },
            { id: 'NOTIF-011-3', type: 'livraison', canal: 'sms', envoyeeLe: '2026-09-01T09:40:00', contenu: 'Votre livraison a été effectuée et confirmée par signature électronique. Le bon de livraison électronique vous a été transmis.' },
          ],
        },
        {
          id: 'VOY-012-L2', ordre: 2, siteNom: 'Route Circulaire, Antsirabe', destinataire: 'Quincaillerie Centrale Antsirabe',
          adresseLivraison: 'Route Circulaire, Antsirabe', lat: -19.8721, lng: 47.0389, role: 'livraison', intervalleMin: 0, franchi: true,
          signeLe: '2026-09-01T10:25:00',
          eBL: { reference: 'EBL-OT-2026-04430-02', emisLe: '2026-09-01T10:25:00', destinataire: 'Quincaillerie Centrale Antsirabe', adresse: 'Route Circulaire, Antsirabe', produit: 'Produits alimentaires secs', signePar: 'Quincaillerie Centrale Antsirabe' },
          satisfactionEnvoyeeLe: '2026-09-01T10:25:00',
          notifications: [
            { id: 'NOTIF-011-4', type: 'livraison', canal: 'sms', envoyeeLe: '2026-09-01T10:25:00', contenu: 'Votre livraison a été effectuée et confirmée par signature électronique. Le bon de livraison électronique vous a été transmis.' },
          ],
        },
      ],
      origine: 'Lot II M 12, Antsirabe', destination: 'Route Circulaire, Antsirabe',
      vehiculeId: 'v-tr-8', vehiculePlaque: '4028 TBA',
      semiRemorqueId: 'v-sr-8', semiRemorquePlaque: 'RM 4108',
      chauffeurId: 'p-017', chauffeurNom: 'Tsiory Rabearison',
      datePlanifiee: '2026-09-01T06:00:00',
      dateDepartReel: '2026-09-01T07:05:00',
      dateArriveeReelle: '2026-09-01T10:25:00',
      kmReference: 30,
      marchandise: { typeProduit: 'Produits alimentaires secs', nombreCartons: 0, poidsChargeKg: 1400 },
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-09-01T05:30:00',
    },
  ])

  /* Hydratation : chaque voyage reçoit une COPIE des étapes de son trajet de
     référence, jamais une simple référence · modifier un trajet ne doit pas
     altérer rétroactivement les voyages déjà clôturés. */
  {
    const trajetsStore = useTrajetsStore()
    voyages.value.forEach(v => {
      if (v.etapes.length === 0 && v.trajetId) {
        const t = trajetsStore.getById(v.trajetId)
        if (t) v.etapes = t.etapes.map((e, i) => ({
          ...e, id: `${v.id}-${e.id}`,
          franchi: v.statut === 'cloture' || v.statut === 'livre' || (v.statut === 'en_cours' && i < 2),
        }))
      }
    })
  }

  const arrets = ref<ArretReleve[]>([
    { id: 'ARR-001', voyageId: 'VOY-001', debut: '2026-08-24T11:42:00', fin: '2026-08-24T12:27:00', dureeMin: 45,
      lat: -18.7500, lng: 48.7000, lieu: 'Piste secondaire, 14 km au sud de Moramanga', dansSiteDeclare: false, justifie: false },
    { id: 'ARR-002', voyageId: 'VOY-001', debut: '2026-08-24T09:05:00', fin: '2026-08-24T09:38:00', dureeMin: 33,
      lat: -18.9333, lng: 47.9333, lieu: 'Relais Moramanga', dansSiteDeclare: true, justifie: true, motif: 'Pause réglementaire' },
  ])

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

  const enCours = computed(() => voyages.value.filter(v => v.statut === 'en_cours'))
  const aCloturer = computed(() => voyages.value.filter(v => v.statut === 'livre'))

  const arretsDuVoyage = (voyageId: string) => arrets.value.filter(a => a.voyageId === voyageId)
  const documentsDuVoyage = (voyageId: string) => documents.value.filter(d => d.voyageId === voyageId)

  /** Complétude du dossier documentaire · conditionne la clôture. */
  function completudeDossier(voyageId: string) {
    const docs = documentsDuVoyage(voyageId)
    const manquants = DOCS_OBLIGATOIRES.filter(t => !docs.some(d => d.type === t && d.present))
    return {
      total: DOCS_OBLIGATOIRES.length,
      presents: DOCS_OBLIGATOIRES.length - manquants.length,
      manquants,
      complet: manquants.length === 0,
      pct: Math.round(((DOCS_OBLIGATOIRES.length - manquants.length) / DOCS_OBLIGATOIRES.length) * 100),
    }
  }

  const ecartPoids = (voyageId: string) => { const v = getById(voyageId); return v ? calculerEcartPoids(v) : null }
  const ecartKm = (voyageId: string) => { const v = getById(voyageId); return v ? calculerEcartKm(v) : null }

  let prochainId = voyages.value.length + 1
  function creer(saisie: Omit<Voyage, 'id' | 'reference' | 'createdAt' | 'etapes' | 'nbEcarts' | 'nbArretsNonJustifies'> & { etapesPersonnalisees?: EtapeVoyage[] }) {
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
      ...donneesVoyage, id, etapes, nbEcarts: 0, nbArretsNonJustifies: 0,
      reference: `VOY-2026-${String(numero).padStart(4, '0')}`,
      createdAt: aujourdhuiISO(),
    })
    return id
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
  const enCoursKanban = computed(() => voyages.value.filter(v => v.statut === 'en_cours'))
  const termines = computed(() => voyages.value.filter(v => v.statut === 'livre' || v.statut === 'cloture'))
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

  /** Création rapide d'un ordre de transport : seuls véhicule et date
   *  prévue sont exigés, sans aucune ligne. Les lignes de livraison se
   *  définissent dans un second temps, une fois l'ordre ouvert en
   *  fiche - jamais un client unique porté par l'ordre lui-même. */
  function creerRapide(saisie: {
    vehiculeId: string; vehiculePlaque: string; chauffeurId?: string; chauffeurNom?: string
    semiRemorqueId?: string; semiRemorquePlaque?: string; datePlanifiee: string
    numeroOT?: string; typeProduit: string; poidsChargeKg: number
  }) {
    return creer({
      statut: 'en_attente',
      clientNom: 'Aucune ligne',
      toleranceEcartPoidsPourcent: 1,
      origine: '-', destination: '-',
      vehiculeId: saisie.vehiculeId, vehiculePlaque: saisie.vehiculePlaque,
      chauffeurId: saisie.chauffeurId, chauffeurNom: saisie.chauffeurNom,
      semiRemorqueId: saisie.semiRemorqueId, semiRemorquePlaque: saisie.semiRemorquePlaque,
      datePlanifiee: saisie.datePlanifiee, numeroOT: saisie.numeroOT,
      kmReference: 0,
      marchandise: { typeProduit: saisie.typeProduit, nombreCartons: 0, poidsChargeKg: saisie.poidsChargeKg || 0 },
    })
  }

  /** Remplace les lignes de livraison d'un ordre encore en attente :
   *  chacune porte son propre destinataire, client ou transfert entre
   *  sites internes. Le résumé affiché sur l'ordre se recalcule à
   *  partir de ces lignes plutôt que d'être saisi à part. */
  function definirLignes(voyageId: string, lignes: EtapeVoyage[]) {
    const v = getById(voyageId)
    if (!v) return
    const tries = [...lignes].sort((a, b) => a.ordre - b.ordre)
    v.etapes = tries.map((e, i) => ({ ...e, ordre: i + 1, franchi: false }))
    v.clientNom = resumeDestinataires(v.etapes)
    v.origine = tries[0]?.siteNom ?? '-'
    v.destination = tries[tries.length - 1]?.siteNom ?? '-'
    const trajetsStore = useTrajetsStore()
    v.kmReference = trajetsStore.distanceSimulee(tries)
  }

  /** Notification automatique envoyée au destinataire d'une ligne :
   *  aucun canal SMS ou e-mail réel n'est branché dans cette maquette,
   *  le contenu est simulé mais structuré comme un envoi réel le
   *  serait. La durée reste une estimation simulée à partir de la
   *  distance, faute d'historique réel à ce stade. */
  function notifier(v: Voyage, e: EtapeVoyage, type: 'planification' | 'demarrage' | 'livraison') {
    if (!e.destinataire) return
    const kmParLigne = Math.max(v.kmReference / v.etapes.length, 15)
    const dureeEstimeeMin = Math.round(kmParLigne / 45 * 60)
    const contenu = type === 'planification'
      ? `Votre livraison a été planifiée pour le ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')}. Véhicule ${v.vehiculePlaque ?? '-'}, chauffeur ${v.chauffeurNom ?? '-'}, arrivée estimée à environ ${dureeEstimeeMin} min de trajet.`
      : type === 'demarrage'
      ? `Votre livraison est en cours. Chauffeur ${v.chauffeurNom ?? '-'}, arrivée estimée dans environ ${dureeEstimeeMin} min. Contact : ${v.chauffeurNom ?? '-'}.`
      : `Votre livraison a été effectuée et confirmée par signature électronique. Le bon de livraison électronique vous a été transmis.`
    const notif: NotificationClient = {
      id: `NOTIF-${Date.now()}-${Math.round(Math.random() * 999)}`,
      type, canal: 'sms', envoyeeLe: new Date().toISOString(), contenu,
    }
    e.notifications = [...(e.notifications ?? []), notif]
  }

  /** Planifier : le planificateur affecte l'ordre à un chauffeur et un
   *  véhicule ; l'ordre passe alors à Planifié. Il n'y a pas d'étape de
   *  validation où le chauffeur accepterait ou refuserait l'ordre - le
   *  passage à En cours se déclenche seulement quand le chauffeur
   *  commence réellement à exécuter la tournée, en signant sa première
   *  livraison (voir signerLigne). Chaque destinataire d'une ligne
   *  client reçoit à la planification une notification annonçant le
   *  jour, le véhicule, le chauffeur et une arrivée estimée. */
  function planifier(id: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (v.statut !== 'en_attente') return { ok: false, motif: "Cet ordre n'est plus en attente." }
    if (!v.etapes.length) return { ok: false, motif: 'Ajoutez au moins une ligne de livraison avant de planifier cet ordre.' }
    v.statut = 'planifie'
    v.etapes.forEach(e => notifier(v, e, 'planification'))
    return { ok: true }
  }

  /** Annuler reste réservé au planificateur ou au responsable : ce
   *  n'est jamais une action que le chauffeur peut poser depuis son
   *  espace, à aucun moment du cycle de vie de la tournée. */
  function annuler(id: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (v.statut === 'livre' || v.statut === 'cloture' || v.statut === 'annule') return { ok: false, motif: 'Cet ordre ne peut plus être annulé.' }
    if (!motif.trim()) return { ok: false, motif: "Un motif d'annulation est obligatoire." }
    v.statut = 'annule'
    v.annuleLe = new Date().toISOString()
    v.motifAnnulation = motif.trim()
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
  function signerLigne(voyageId: string, etapeId: string, signePar?: string) {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'planifie' && v.statut !== 'en_cours')) return
    const tries = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    const index = tries.findIndex(e => e.id === etapeId)
    if (index < 0 || tries[index]!.franchi) return
    if (tries.slice(0, index).some(e => !e.franchi)) return

    if (v.statut === 'planifie') {
      v.statut = 'en_cours'
      v.dateDepartReel = new Date().toISOString()
      v.etapes.filter(e => !e.franchi).forEach(e => notifier(v, e, 'demarrage'))
    }

    const etape = v.etapes.find(e => e.id === etapeId)
    if (etape) {
      etape.franchi = true
      etape.signeLe = new Date().toISOString()
      if (etape.destinataire) {
        notifier(v, etape, 'livraison')
        etape.eBL = {
          reference: `EBL-${v.numeroOT || v.reference}-${String(index + 1).padStart(2, '0')}`,
          emisLe: etape.signeLe, destinataire: etape.destinataire, adresse: etape.adresseLivraison ?? '',
          produit: v.marchandise.typeProduit, signePar: signePar || etape.destinataire,
        }
        etape.satisfactionEnvoyeeLe = etape.signeLe
      }
    }
    if (v.etapes.every(e => e.franchi)) {
      v.statut = 'livre'
      v.dateArriveeReelle = new Date().toISOString()
    }
  }

  /** Clôture bloquée tant que le kilométrage au retour n'est pas
   *  saisi, qu'il est inférieur au kilométrage au départ, ou que le
   *  dossier documentaire est incomplet. Un écart anormalement élevé
   *  par rapport au kilométrage de référence est signalé à l'appelant
   *  sans bloquer la clôture : c'est à l'utilisateur de juger. */
  function cloturer(id: string, kmArrivee: number): { ok: boolean; motif?: string; alerteEcart?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Voyage introuvable.' }
    if (kmArrivee == null || Number.isNaN(kmArrivee)) return { ok: false, motif: 'Le kilométrage au retour est obligatoire pour clôturer le voyage.' }
    if (v.kmDepart != null && kmArrivee < v.kmDepart) return { ok: false, motif: 'Le kilométrage au retour ne peut pas être inférieur au kilométrage au départ.' }
    const c = completudeDossier(id)
    if (!c.complet) return { ok: false, motif: `Dossier incomplet : ${c.manquants.map(m => LIB_DOC[m]).join(', ')}` }
    v.kmArrivee = kmArrivee
    const kmReel = v.kmDepart != null ? kmArrivee - v.kmDepart : null
    let alerteEcart: string | undefined
    if (kmReel != null && v.kmReference > 0) {
      const ecartPct = Math.abs(kmReel - v.kmReference) / v.kmReference * 100
      if (ecartPct > 20) alerteEcart = `Kilométrage réel (${kmReel} km) très éloigné du kilométrage de référence (${v.kmReference} km), écart de ${ecartPct.toFixed(0)} %.`
    }
    changerStatut(id, 'cloture')
    return { ok: true, alerteEcart }
  }

  return {
    voyages, arrets, documents,
    enCours, aCloturer,
    getById, arretsDuVoyage, documentsDuVoyage,
    completudeDossier, ecartPoids, ecartKm,
    creer, changerStatut, cloturer,
    enAttente, planifies, enCoursKanban, termines, annules,
    creerRapide, definirLignes, planifier, annuler, signerLigne,
  }
})
