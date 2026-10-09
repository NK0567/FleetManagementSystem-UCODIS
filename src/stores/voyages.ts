import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Voyage, StatutVoyage, ArretReleve, DocumentVoyage, TypeDocVoyage, EtapeVoyage, NotificationClient } from '../types'
import { calculerEcartPoids, calculerEcartKm, horsTournee, chargeOrdre } from '../utils/voyageUtils'
import { useVehiculeStore } from './vehicules'
import { useClientsStore } from './clients'
import { useCommandesStore } from './commandes'
import { useTrajetsStore } from './trajets'
import { useAbsenceStore } from './absences'
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

  const SEED_VOYAGES: Voyage[] = [
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
          emailDestinataire: 'contact@leaderprice-antsirabe.mg',
          adresseLivraison: 'Lot II M 12, Antsirabe', lat: -19.8667, lng: 47.0333, role: 'livraison', intervalleMin: 0, franchi: true,
          livreParChauffeurLe: '2026-09-01T09:38:00', receptionConfirmeeClientLe: '2026-09-01T09:40:00',
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
          emailDestinataire: 'contact@quincaillerie-centrale.mg',
          adresseLivraison: 'Route Circulaire, Antsirabe', lat: -19.8721, lng: 47.0389, role: 'livraison', intervalleMin: 0, franchi: true,
          livreParChauffeurLe: '2026-09-01T10:22:00', receptionConfirmeeClientLe: '2026-09-01T10:25:00',
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
          emailDestinataire: 'contact@superu-toamasina.mg',
          adresseLivraison: 'Boulevard Joffre, Toamasina', lat: -18.1492, lng: 49.4023, role: 'livraison', intervalleMin: 0, franchi: false,
          arriveeLe: '2026-09-24T09:15:00',
          notifications: [
            { id: 'NOTIF-013-1', type: 'planification', canal: 'sms', envoyeeLe: '2026-09-24T06:00:00', contenu: 'Votre livraison a été planifiée pour le 24/09/2026. Véhicule 4026 TBA, chauffeur Herizo Rakotondrabe, arrivée estimée à environ 20 min de trajet.' },
            { id: 'NOTIF-013-2', type: 'demarrage', canal: 'sms', envoyeeLe: '2026-09-24T08:50:00', contenu: 'Votre livraison est en cours. Chauffeur Herizo Rakotondrabe, arrivée estimée dans environ 20 min. Contact : Herizo Rakotondrabe.' },
          ],
        },
      ],
      origine: 'Dépôt UCODIS Toamasina', destination: 'Boulevard Joffre, Toamasina',
      vehiculeId: 'v-tr-6', vehiculePlaque: '4026 TBA',
      semiRemorqueId: 'v-sr-6', semiRemorquePlaque: 'RM 4106',
      chauffeurId: 'p-015', chauffeurNom: 'Herizo Rakotondrabe',
      datePlanifiee: '2026-09-24T06:00:00',
      dateDepartReel: '2026-09-24T08:50:00',
      kmReference: 15,
      marchandise: { typeProduit: 'Boissons', nombreCartons: 0, poidsChargeKg: 2200 },
      nbEcarts: 0, nbArretsNonJustifies: 0, createdAt: '2026-09-24T05:30:00',
    },
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
      return Array.isArray(parse) && parse.length ? parse : SEED_VOYAGES
    } catch {
      return SEED_VOYAGES
    }
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
    return !['livre', 'cloture', 'annule', 'litige'].includes(v.statut)
  }

  function vehiculeOccupe(vehiculeId: string, ignorerVoyageId?: string): Voyage | null {
    return voyages.value.find(v =>
      v.id !== ignorerVoyageId && v.vehiculeId === vehiculeId && engageVehiculeEtChauffeur(v)) ?? null
  }

  /** Un chauffeur n'est jamais retenu sans vérification, pour quelque
   *  motif que ce soit : en congé ou en absence approuvée à la date
   *  prévue, ou déjà engagé comme chauffeur sur un autre ordre non
   *  terminé, même avec un véhicule différent. La planification doit
   *  le signaler pour qu'un autre chauffeur soit choisi à la main
   *  plutôt que de l'affecter malgré tout. */
  function chauffeurIndisponible(personnelId: string, dateISO: string | undefined, ignorerVoyageId?: string): string | null {
    const dejaEngage = voyages.value.find(v =>
      v.id !== ignorerVoyageId && v.chauffeurId === personnelId && engageVehiculeEtChauffeur(v))
    if (dejaEngage) return `déjà engagé sur l'ordre ${dejaEngage.numeroOT || dejaEngage.reference}`
    if (!dateISO) return null
    const absences = useAbsenceStore()
    const date = dateISO.slice(0, 10)
    const absence = absences.absencesLe(date).find(a => a.personnelId === personnelId)
    return absence ? absence.type.toLowerCase() : null
  }

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

  /** Création rapide d'un ordre de transport : seuls véhicule et date
   *  prévue sont exigés, sans aucune ligne. Les lignes de livraison se
   *  définissent dans un second temps, une fois l'ordre ouvert en
   *  fiche - jamais un client unique porté par l'ordre lui-même. */
  function creerRapide(saisie: {
    vehiculeId: string; vehiculePlaque: string; chauffeurId?: string; chauffeurNom?: string
    semiRemorqueId?: string; semiRemorquePlaque?: string; datePlanifiee: string
    numeroOT?: string; typeProduit: string; poidsChargeKg: number; confirmationRequise?: boolean
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
      kmReference: 0, confirmationRequise: saisie.confirmationRequise ?? true,
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
    /* Un ordre planifié reste modifiable tant qu'il n'est pas confirmé : un
     * client ajouté à ce stade reçoit à son tour sa notification et son lien,
     * pour confirmer sa disponibilité comme les autres ; et retirer le dernier
     * client en attente peut suffire à faire passer l'ordre à confirmé. */
    if (v.statut === 'planifie') {
      v.etapes.filter(e => e.destinataire && !e.notifications?.length).forEach(e => notifier(v, e, 'planification'))
      reevaluerConfirmation(v)
    }
  }

  /** Notification automatique envoyée au destinataire d'une ligne :
   *  aucun canal SMS ou e-mail réel n'est branché dans cette maquette,
   *  le contenu est simulé mais structuré comme un envoi réel le
   *  serait. La durée reste une estimation simulée à partir de la
   *  distance, faute d'historique réel à ce stade. */
  /** Le chauffeur est prévenu (SMS simulé) quand une tournée lui est confiée
   *  ou annulée ; il n'a rien à accepter ni refuser. */
  function notifierChauffeur(v: Voyage, message: string) {
    v.notificationsChauffeur = [...(v.notificationsChauffeur ?? []), { le: new Date().toISOString(), message }]
  }

  function notifier(v: Voyage, e: EtapeVoyage, type: 'planification' | 'demarrage' | 'livraison') {
    if (!e.destinataire) return
    const kmParLigne = Math.max(v.kmReference / v.etapes.length, 15)
    const dureeEstimeeMin = Math.round(kmParLigne / 45 * 60)
    const contenu = type === 'planification'
      ? `Votre livraison a été planifiée pour le ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')}. Véhicule ${v.vehiculePlaque ?? '-'}, chauffeur ${v.chauffeurNom ?? '-'}, arrivée estimée à environ ${dureeEstimeeMin} min de trajet. Suivez votre livraison : ${lienSuivi(e.id)}`
      : type === 'demarrage'
      ? `Votre livraison est en cours. Chauffeur ${v.chauffeurNom ?? '-'}, arrivée estimée dans environ ${dureeEstimeeMin} min. Contact : ${v.chauffeurNom ?? '-'}. Suivez votre livraison : ${lienSuivi(e.id)}`
      : `Le chauffeur déclare avoir effectué votre livraison. Confirmez que vous l'avez bien reçue, ou signalez un problème : ${lienSuivi(e.id)}`
    /* Le canal vient de la ligne (commande), sinon de la fiche client. */
    const canal = e.canalNotification ?? useClientsStore().canalPour(e.destinataire)
    const canaux: ('sms' | 'email')[] = canal === 'sms_email' ? ['sms', 'email'] : [canal]
    const envoyeeLe = new Date().toISOString()
    e.notifications = [...(e.notifications ?? []), ...canaux.map((c, i) => ({
      id: `NOTIF-${Date.now()}-${i}-${Math.round(Math.random() * 999)}`, type, canal: c, envoyeeLe, contenu,
    } as NotificationClient))]
  }

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
    if (!v.vehiculeId) return {}
    const vehicules = useVehiculeStore()
    const at = vehicules.attelageActif(v.vehiculeId)
    const sr = at ? vehicules.parId(at.semiRemorqueId) : null
    return { kg: sr?.chargeMaxKg, m3: sr?.volumeMaxM3 }
  }

  function planifier(id: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (v.statut !== 'en_attente') return { ok: false, motif: "Cet ordre n'est plus en attente." }
    if (!v.etapes.length) return { ok: false, motif: 'Ajoutez au moins une ligne de livraison avant de planifier cet ordre.' }
    const cap = capaciteOrdre(v)
    const charge = chargeOrdre(v)
    if (cap.kg && charge.poidsKg > cap.kg) return { ok: false, motif: `Le poids chargé (${charge.poidsKg} kg) dépasse la charge maximale de la semi-remorque (${cap.kg} kg).` }
    if (cap.m3 && charge.volumeM3 > cap.m3) return { ok: false, motif: `Le volume chargé (${charge.volumeM3} m³) dépasse le volume utile de la semi-remorque (${cap.m3} m³).` }
    v.etapes.forEach(e => notifier(v, e, 'planification'))
    notifierChauffeur(v, `Une tournée vous est confiée : ${v.numeroOT || v.reference}, le ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')}, véhicule ${v.vehiculePlaque ?? '-'}, ${v.etapes.filter(e => !horsTournee(e)).length} livraison(s).`)
    if (v.confirmationRequise === false) {
      /* Certains clients n'ont pas besoin d'être appelés pour confirmer :
         directement prêt pour le chargement, sans étape Confirmé. */
      v.statut = 'confirme'
    } else {
      v.statut = 'planifie'
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
    const concernees = destinataires.filter(e => !e.indisponibleLe)
    /* Si tous les destinataires sont devenus indisponibles, il ne reste
     * plus personne à charger : la tournée passe confirmée quand même, y
     * compris pour ses seuls transferts internes s'il y en a - elle ne
     * doit jamais rester bloquée en planifié faute de client restant. */
    if (concernees.every(e => e.confirmeLe)) v.statut = 'confirme'
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
    etape.confirmeLe = new Date().toISOString()
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
    etape.indisponibleLe = new Date().toISOString()
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
    etape.dateConfirmeeLe = new Date().toISOString()
    const nouvelleLigne = (ordre: number): EtapeVoyage => ({
      id: `RPL-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ordre, siteId: etape.siteId, siteNom: etape.siteNom,
      destinataire: etape.destinataire, adresseLivraison: etape.adresseLivraison, lat: etape.lat, lng: etape.lng,
      role: 'livraison', intervalleMin: 0, franchi: false, emailDestinataire: etape.emailDestinataire,
      poidsKg: etape.poidsKg, volumeM3: etape.volumeM3, canalNotification: etape.canalNotification,
      commandeId: etape.commandeId, contenuCommande: etape.contenuCommande,
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
    const existant = voyages.value.find(x => x.creeParReplanification && x.statut === 'en_attente' && x.datePlanifiee.slice(0, 10) === jour)
    if (existant) {
      const l = fabrique(existant.etapes.length + 1)
      existant.etapes.push(l)
      existant.clientNom = libelleDestinataires(existant.etapes)
      existant.marchandise.poidsChargeKg = chargeOrdre(existant).poidsKg
      return existant.id
    }
    const premiere = fabrique(1)
    return creer({
      statut: 'en_attente', clientNom: premiere.destinataire ?? premiere.siteNom, toleranceEcartPoidsPourcent: 1,
      origine: '-', destination: '-', datePlanifiee: `${jour}T08:00`, kmReference: 0,
      marchandise: { typeProduit: v.marchandise.typeProduit, nombreCartons: 0, poidsChargeKg: premiere.poidsKg ?? 0 },
      creeParReplanification: true,
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
    if (etape.reliquatReprisLe) return { ok: false, motif: 'Ce reliquat est déjà replanifié.' }
    if (!dateISO) return { ok: false, motif: 'Choisissez une date.' }
    const total = etape.articles?.length || nonLivres.length
    const poids = etape.poidsKg != null ? Math.round(etape.poidsKg * nonLivres.length / total) : undefined
    etape.reliquatDate = dateISO
    etape.reliquatReprisLe = new Date().toISOString()
    etape.reliquatRepriseDansVoyageId = rattacherAOrdreDuJour(v, dateISO, ordre => ({
      id: `RLQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ordre, siteId: etape.siteId, siteNom: etape.siteNom,
      destinataire: etape.destinataire, adresseLivraison: etape.adresseLivraison, lat: etape.lat, lng: etape.lng,
      role: 'livraison', intervalleMin: 0, franchi: false, emailDestinataire: etape.emailDestinataire,
      canalNotification: etape.canalNotification, poidsKg: poids,
      contenuCommande: nonLivres.map(a => a.libelle).join(', '),
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
    if (!etape.dateDisponibleClient) return { ok: false, motif: "Le client n'a pas encore proposé de date." }
    reprendreLigneReplanifiee(v, etape, etape.dateDisponibleClient)
    return { ok: true }
  }

  /** Cas de secours seulement : le client n'a donné aucune date. Le
   *  planificateur en propose une, sous réserve de l'accord du client -
   *  jamais l'inverse, puisque lui seul connaît vraiment son programme. */
  function proposerDate(voyageId: string, etapeId: string, dateISO: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut === 'annule' || v.statut === 'cloture') return { ok: false, motif: 'Ordre introuvable ou clos.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || !horsTournee(etape)) return { ok: false, motif: "Cette ligne n'est pas à replanifier." }
    if (!dateISO) return { ok: false, motif: 'Choisissez une date.' }
    etape.dateProposeePlanif = dateISO
    etape.dateConfirmeeLe = undefined
    return { ok: true }
  }

  /** Le client confirme la date de secours proposée par le planificateur. */
  function confirmerNouvelleDate(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !horsTournee(etape) || !etape.dateProposeePlanif) return { ok: false, motif: "Aucune date n'a été proposée pour cette ligne." }
    reprendreLigneReplanifiee(v, etape, etape.dateProposeePlanif)
    return { ok: true }
  }

  /** La date de secours ne convient pas au client, qui redonne alors sa
   *  propre date - on revient au chemin normal. */
  function refuserNouvelleDate(voyageId: string, etapeId: string, autreDate?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !horsTournee(etape) || !etape.dateProposeePlanif) return { ok: false, motif: "Aucune date n'a été proposée pour cette ligne." }
    etape.dateProposeePlanif = undefined
    etape.dateConfirmeeLe = undefined
    if (autreDate) etape.dateDisponibleClient = autreDate
    return { ok: true }
  }

  /** Double contrôle du chargement, entre Confirmé et Prêt pour exécution.
   *  L'entrepôt déclare ce qu'il a chargé, ligne par ligne : c'est sur cette
   *  liste que le chauffeur contrôle ensuite. */
  function declarerChargementEntrepot(voyageId: string, contenus: Record<string, string>): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme') return { ok: false, motif: 'Cet ordre doit être confirmé avant le chargement.' }
    const lignes = v.etapes.filter(e => !horsTournee(e))
    if (lignes.some(e => !(contenus[e.id] ?? '').trim())) return { ok: false, motif: 'Indiquez ce qui est chargé pour chaque destinataire.' }
    lignes.forEach(e => {
      e.contenuCharge = contenus[e.id]!.trim()
      e.articles = e.contenuCharge.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)
        .map((libelle, i) => ({ id: `${e.id}-A${i + 1}`, libelle }))
    })
    v.chargementEntrepotLe = new Date().toISOString()
    return { ok: true }
  }

  /** La tournée passe Prêt pour exécution dès que toutes les lignes encore
   *  concernées ont été jugées conformes par le chauffeur. Une ligne jugée
   *  non conforme est sortie de ce compte : elle n'empêche jamais les autres
   *  de partir. */
  function finaliserControle(v: Voyage) {
    const restantes = v.etapes.filter(e => !horsTournee(e))
    if (restantes.length && restantes.every(e => e.chargementConformeLe)) {
      v.chargementChauffeurLe = new Date().toISOString()
      v.statut = 'pret'
    }
  }

  /** Le chauffeur contrôle une ligne par rapport à ce que l'entrepôt déclare
   *  pour elle : conforme, ou non conforme avec ce qui ne correspond pas.
   *  Chaque ligne se juge indépendamment des autres. */
  function controlerLigneChargement(voyageId: string, etapeId: string, conforme: boolean, motif?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme' || !v.chargementEntrepotLe) return { ok: false, motif: "L'entrepôt n'a pas encore déclaré le chargement terminé." }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e || horsTournee(e)) return { ok: false, motif: 'Ligne introuvable ou sortie de la tournée.' }
    if (conforme) {
      e.chargementConformeLe = new Date().toISOString()
    } else {
      if (!motif?.trim()) return { ok: false, motif: 'Précisez ce qui ne correspond pas.' }
      e.chargementNonConformeLe = new Date().toISOString()
      e.motifNonConformite = motif.trim()
      e.chargementConformeLe = undefined
    }
    finaliserControle(v)
    return { ok: true }
  }

  /** Raccourci du chauffeur quand tout est conforme : valide d'un coup les
   *  lignes qu'il n'a pas encore jugées. */
  function validerChargementChauffeur(voyageId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'confirme' || !v.chargementEntrepotLe) return { ok: false, motif: "L'entrepôt n'a pas encore déclaré le chargement terminé." }
    v.etapes.filter(e => !horsTournee(e) && !e.chargementConformeLe).forEach(e => { e.chargementConformeLe = new Date().toISOString() })
    finaliserControle(v)
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
    /* Annulé avant le départ : les commandes de l'ordre redeviennent
     * disponibles pour un autre ordre. Une tournée déjà partie garde les
     * siennes, puisque la marchandise a pu être livrée en partie. */
    if (v.statut !== 'en_cours') {
      const commandes = useCommandesStore()
      v.etapes.forEach(e => { if (e.commandeId && !e.franchi) commandes.remettreEnAttente(e.commandeId) })
    }
    v.statut = 'annule'
    v.annuleLe = new Date().toISOString()
    v.motifAnnulation = motif.trim()
    if (v.chauffeurId) notifierChauffeur(v, `La tournée ${v.numeroOT || v.reference} du ${new Date(v.datePlanifiee).toLocaleDateString('fr-FR')} est annulée : ${v.motifAnnulation}.`)
    return { ok: true }
  }

  /** Une tournée dont le chauffeur a réglé toutes les lignes n'est pas
   *  encore tout à fait terminée : elle reste en attente de clôture
   *  jusqu'à ce que le planificateur ou le responsable la vérifie et la
   *  clôture - à ce moment-là seulement, elle devient définitive et
   *  rejoint les archives. Jamais une action du chauffeur. */
  function cloturerTournee(id: string): { ok: boolean; motif?: string } {
    const v = getById(id)
    if (!v) return { ok: false, motif: 'Ordre introuvable.' }
    if (v.statut !== 'livre') return { ok: false, motif: "Cet ordre n'est pas en attente de clôture." }
    if (v.etapes.some(e => e.receptionContesteeLe && !e.contestationTraiteeLe))
      return { ok: false, motif: 'Une livraison est contestée par son client : traitez la contestation avant de clôturer.' }
    v.statut = 'cloture'
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
  function neBloquePlusLaSuite(e: EtapeVoyage) { return e.franchi || !!e.reporteLe || !!e.ligneAnnuleeLe || horsTournee(e) }
  function definitivementResolue(e: EtapeVoyage) { return e.franchi || !!e.ligneAnnuleeLe || horsTournee(e) }

  function marquerArrivee(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'pret' && v.statut !== 'en_cours')) return { ok: false, motif: 'Ordre introuvable ou pas encore prêt pour exécution.' }
    const tries = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    const index = tries.findIndex(e => e.id === etapeId)
    if (index < 0) return { ok: false, motif: 'Ligne introuvable.' }
    if (tries[index]!.arriveeLe) return { ok: false, motif: 'Arrivée déjà enregistrée pour ce point.' }
    if (tries.slice(0, index).some(e => !neBloquePlusLaSuite(e))) return { ok: false, motif: 'Le point précédent doit être résolu (signé, reporté ou annulé) avant celui-ci.' }

    if (v.statut === 'pret') {
      v.statut = 'en_cours'
      v.dateDepartReel = new Date().toISOString()
      v.etapes.filter(e => !e.franchi).forEach(e => notifier(v, e, 'demarrage'))
    }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (etape) etape.arriveeLe = new Date().toISOString()
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
    if (!etape || etape.franchi) return { ok: false, motif: 'Ligne introuvable ou déjà signée.' }
    etape.reporteLe = new Date().toISOString()
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
  function annulerLigne(voyageId: string, etapeId: string, motif: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || (v.statut !== 'planifie' && v.statut !== 'en_cours')) return { ok: false, motif: 'Ordre introuvable ou déjà terminé.' }
    if (!motif.trim()) return { ok: false, motif: "Un motif d'annulation est obligatoire." }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || etape.franchi) return { ok: false, motif: 'Ligne introuvable ou déjà signée.' }
    etape.ligneAnnuleeLe = new Date().toISOString()
    etape.motifAnnulationLigne = motif.trim()
    etape.reporteLe = undefined
    etape.motifReport = undefined
    if (v.etapes.every(definitivementResolue)) {
      v.statut = 'livre'
      v.dateArriveeReelle = new Date().toISOString()
    }
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
  function declarerLivraisonChauffeur(voyageId: string, etapeId: string, articlesNonLivres: { id: string; motif: string }[] = []): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'en_cours') return { ok: false, motif: 'Ordre introuvable ou pas en cours.' }
    const tries = [...v.etapes].sort((a, b) => a.ordre - b.ordre)
    const index = tries.findIndex(e => e.id === etapeId)
    if (index < 0 || tries[index]!.franchi || !tries[index]!.arriveeLe) return { ok: false, motif: "Le chauffeur n'est pas encore arrivé sur ce point." }

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
      etape.livreParChauffeurLe = new Date().toISOString()
      if (etape.destinataire) {
        notifier(v, etape, 'livraison')
        etape.eBL = {
          reference: `EBL-${v.numeroOT || v.reference}-${String(index + 1).padStart(2, '0')}`,
          emisLe: etape.livreParChauffeurLe, destinataire: etape.destinataire, adresse: etape.adresseLivraison ?? '',
          produit: livres.length ? livres.map(a => a.libelle).join(', ') : v.marchandise.typeProduit,
          articlesNonLivres: nonLivres.length ? nonLivres.map(a => ({ libelle: a.libelle, motif: a.motif ?? '' })) : undefined,
        }
      }
    }
    if (v.etapes.every(definitivementResolue)) {
      v.statut = 'livre'
      v.dateArriveeReelle = new Date().toISOString()
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
    if (!v || !etape || !etape.livreParChauffeurLe) return { ok: false, motif: "Le chauffeur n'a pas encore déclaré cette livraison." }
    if (etape.receptionConfirmeeClientLe) return { ok: false, motif: 'Cette réception est déjà confirmée.' }
    if (!motif.trim()) return { ok: false, motif: 'Expliquez ce qui ne va pas.' }
    etape.receptionContesteeLe = new Date().toISOString()
    etape.motifContestation = motif.trim()
    return { ok: true }
  }

  /** Le planificateur note comment la contestation a été traitée. */
  function traiterContestation(voyageId: string, etapeId: string, note: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !etape.receptionContesteeLe) return { ok: false, motif: "Cette livraison n'est pas contestée." }
    if (!note.trim()) return { ok: false, motif: 'Indiquez comment la contestation a été traitée.' }
    etape.contestationTraiteeLe = new Date().toISOString()
    etape.noteTraitementContestation = note.trim()
    return { ok: true }
  }

  function confirmerReceptionClient(voyageId: string, etapeId: string, nomSignataire: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !etape.livreParChauffeurLe) return { ok: false, motif: "Le chauffeur n'a pas encore déclaré cette livraison." }
    if (etape.receptionConfirmeeClientLe) return { ok: false, motif: 'Cette réception est déjà confirmée.' }
    if (etape.receptionContesteeLe) return { ok: false, motif: 'Cette livraison est contestée : le planificateur doit la traiter.' }
    if (!nomSignataire.trim()) return { ok: false, motif: 'Indiquez votre nom.' }
    etape.receptionConfirmeeClientLe = new Date().toISOString()
    if (etape.eBL) etape.eBL.signePar = nomSignataire.trim()
    etape.satisfactionEnvoyeeLe = etape.receptionConfirmeeClientLe
    return { ok: true }
  }


  /** Le client, sur place, demande de reporter à une autre date : la
   *  marchandise retourne à l'entrepôt pour être replanifiée, et la ligne
   *  sort de la tournée, qui continue sans elle. C'est un autre report que
   *  « je retenterai plus tard », qui garde la ligne dans la même tournée. */
  function reporterAvecRetour(voyageId: string, etapeId: string, motif: string, dateDemandee?: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    if (!v || v.statut !== 'en_cours') return { ok: false, motif: 'Ordre introuvable ou pas en cours.' }
    if (!motif.trim()) return { ok: false, motif: 'Un motif est obligatoire.' }
    const etape = v.etapes.find(e => e.id === etapeId)
    if (!etape || etape.franchi || !etape.destinataire) return { ok: false, motif: 'Ligne introuvable ou déjà signée.' }
    etape.retourEntrepotLe = new Date().toISOString()
    etape.motifRetour = motif.trim()
    etape.dateDisponibleClient = dateDemandee || undefined
    etape.reporteLe = undefined
    etape.motifReport = undefined
    if (v.etapes.every(definitivementResolue)) {
      v.statut = 'livre'
      v.dateArriveeReelle = new Date().toISOString()
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
    if (!v || !etape || !etape.retourEntrepotLe) return { ok: false, motif: "Cette ligne n'a pas de retour à réceptionner." }
    if (!conforme && !motif?.trim()) return { ok: false, motif: "Précisez ce qui ne va pas sur la marchandise revenue." }
    etape.retourRecuLe = new Date().toISOString()
    if (conforme) { etape.retourConformeLe = etape.retourRecuLe } else { etape.retourNonConformeLe = etape.retourRecuLe; etape.motifRetourNonConforme = motif!.trim() }
    return { ok: true }
  }

  /** Les articles non livrés d'une livraison signée restent un rappel pour
   *  le chauffeur tant qu'il ne les a pas physiquement rapportés à
   *  l'entrepôt - indépendamment du sort de la tournée qui les portait,
   *  qui peut très bien être déjà terminée et hors de vue. */
  function confirmerArticlesRapportes(voyageId: string, etapeId: string): { ok: boolean; motif?: string } {
    const v = getById(voyageId)
    const etape = v?.etapes.find(e => e.id === etapeId)
    if (!v || !etape || !etape.eBL?.articlesNonLivres?.length) return { ok: false, motif: 'Aucun article à rapporter pour cette ligne.' }
    etape.articlesRapportesLe = new Date().toISOString()
    return { ok: true }
  }

  /** Tous les articles qu'un chauffeur doit encore rapporter à l'entrepôt,
   *  toutes tournées confondues, terminées ou non. */
  const articlesARapporter = computed(() => voyages.value.flatMap(v => v.etapes
    .filter(e => e.eBL?.articlesNonLivres?.length && !e.articlesRapportesLe)
    .map(etape => ({ voyage: v, etape }))))

  /** Réponse du destinataire à l'enquête de satisfaction, depuis son
   *  propre espace de suivi - jamais saisie à sa place par le
   *  chauffeur ou le planificateur. Ne s'applique qu'à une ligne déjà
   *  signée, et une seule fois. */
  function repondreSatisfaction(etapeId: string, note: number, commentaire?: string) {
    const trouve = trouverLigne(etapeId)
    if (!trouve || !trouve.etape.franchi || trouve.etape.satisfactionNote != null) return
    trouve.etape.satisfactionNote = Math.min(5, Math.max(1, Math.round(note)))
    if (commentaire?.trim()) trouve.etape.satisfactionCommentaire = commentaire.trim()
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
    enAttente, planifies, confirmes, prets, enCoursKanban, enAttenteCloture, clotures, annules,
    creerRapide, definirLignes, planifier, annuler, marquerArrivee, declarerLivraisonChauffeur, capaciteOrdre, replanifierReliquat, confirmerReceptionClient, contesterReceptionClient, traiterContestation,
    trouverLigne, repondreSatisfaction, lienSuivi, reinitialiser, reporterAvecRetour, recevoirRetour, clientProposeDate, accepterDateClient,
    confirmerArticlesRapportes, articlesARapporter,
    vehiculeOccupe, chauffeurIndisponible, reporterLigne, reprendreLigne, annulerLigne,
    confirmerClient, declarerIndisponible, proposerDate, confirmerNouvelleDate, refuserNouvelleDate,
    declarerChargementEntrepot, validerChargementChauffeur, controlerLigneChargement, cloturerTournee,
  }
})
