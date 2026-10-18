/**
 * Données de démonstration de la livraison de carburant : citernes à
 * compartiments, dépôt pétrolier appartenant à un tiers, commandes de
 * carburant et deux tournées déjà composées (l'une validée avec ses bons,
 * l'autre en cours, chargée avec son BSL et une première livraison en écart).
 * Module de données seulement, sans store, repris par les stores concernés.
 */
import type { Commande, EquipementEmbarque, SiteReseau, Vehicule, Voyage } from '../types'

/* ── Parc : trois citernes de plus (la CT 4201 existe déjà) ── */
const citerne = (id: string, immat: string, vin: string, volumes: number[], chargeMaxKg: number): Vehicule => ({
  id, immatriculation: immat, vin, type: 'citerne', marque: 'Schmitz', modele: `Citerne ${volumes.length} compartiments`,
  categorie: 'Citerne', carburant: 'Sans objet', chargeMaxKg, site: 'Dépôt Tanjombato', statut: 'disponible', kilometrage: 0,
  annee: 2024, dateMiseEnCirculation: '2024-02-01', modeAcquisition: 'achat', coutAcquisitionAr: 98_000_000, valeurResiduelleAr: 88_000_000,
  compartiments: volumes.map((volumeL, i) => ({ numero: i + 1, volumeL })),
})
export const CITERNES_DEMO: Vehicule[] = [
  citerne('v-ct-2', 'CT 4202', 'LZGJCT2024001', [12_000, 10_000, 8_000], 30_000),
  citerne('v-ct-3', 'CT 4203', 'LZGJCT2024002', [15_000, 10_000, 8_000], 32_000),
  citerne('v-ct-4', 'CT 4204', 'LZGJCT2024003', [12_000, 10_000, 8_000], 30_000),
]
/** La CT 4203 porte une pompe de dépotage. */
export const EQUIPEMENTS_DEMO: EquipementEmbarque[] = [
  { id: 'eq-pompe-ct-3', vehiculeId: 'v-ct-3', type: 'pompe', numeroSerie: 'PMP-2024-0031', etat: 'operationnel' },
]

/* ── Dépôt de chargement appartenant à un tiers ── */
export const SITES_DEMO: SiteReseau[] = [
  { id: 'site-012', code: 'DEP-ALR', nom: "Dépôt pétrolier d'Alarobia", type: 'Dépôt', lat: -18.8735, lng: 47.5262, ville: 'Antananarivo', region: 'Analamanga', rayonM: 800, actif: true, proprietaireTiers: "Société de stockage d'Alarobia", email: 'chargement@depot-alarobia.mg' },
]

/* ── Commandes de carburant ── */
const cmd = (id: string, ref: string, client: string, adresse: string, lat: number, lng: number, produit: string, volumeL: number, densite: number, depotId: string,
  extra: Partial<Commande> = {}): Commande => ({
  id, referenceExterne: ref, destinataire: client, adresseLivraison: adresse, lat, lng, contenu: produit, produit, volumeL,
  poidsKg: Math.round(volumeL * densite), dateSouhaitee: '2026-09-05', statut: 'en_attente', createdAt: '2026-09-02T09:00:00',
  origine: 'systeme_externe', depotId, modeLivraison: 'camion', canalNotification: 'sms', region: 'Analamanga', ...extra,
})
export const COMMANDES_CARBURANT_DEMO: Commande[] = [
  /* Tournée validée (OT-2026-04450) */
  cmd('CMD-C01', 'CC-26-0501', 'Station-service Ambohimanarina', 'Route d\'Ambohimanarina, Antananarivo', -18.8650, 47.5050, 'Gazole', 14_000, 0.845, 'site-012', { statut: 'affectee', voyageId: 'VOY-016' }),
  cmd('CMD-C02', 'CC-26-0502', "Hôpital d'Itaosy", 'Itaosy, Antananarivo', -18.9200, 47.4700, 'Gazole', 6_000, 0.845, 'site-012', { statut: 'affectee', voyageId: 'VOY-016', pompeExigee: true }),
  cmd('CMD-C03', 'CC-26-0503', 'Station-service Ivato', 'Route de l\'aéroport, Ivato', -18.8000, 47.4800, 'Essence sans plomb', 8_000, 0.745, 'site-012', { statut: 'affectee', voyageId: 'VOY-016' }),
  /* Tournée en cours (OT-2026-04452) */
  cmd('CMD-C04', 'CC-26-0504', 'Station-service Anosizato', 'Anosizato, Antananarivo', -18.9250, 47.5020, 'Gazole', 12_000, 0.845, 'site-001', { statut: 'affectee', voyageId: 'VOY-017', dateSouhaitee: '2026-09-04' }),
  cmd('CMD-C05', 'CC-26-0505', 'Station-service Ampitatafika', 'Ampitatafika, Antananarivo', -18.9380, 47.4880, 'Pétrole lampant', 9_000, 0.79, 'site-001', { statut: 'affectee', voyageId: 'VOY-017', dateSouhaitee: '2026-09-04' }),
  /* À planifier */
  cmd('CMD-C06', 'CC-26-0506', 'Station-service Ankorondrano', 'Ankorondrano, Antananarivo', -18.8890, 47.5220, 'Gazole', 10_000, 0.845, 'site-001'),
  cmd('CMD-C07', 'CC-26-0507', 'Station-service Andraharo', 'Andraharo, Antananarivo', -18.8790, 47.5150, 'Essence sans plomb', 7_000, 0.745, 'site-001'),
  cmd('CMD-C08', 'CC-26-0508', "Carrière d'Ambohidratrimo", 'Ambohidratrimo', -18.8170, 47.4400, 'Gazole', 5_000, 0.845, 'site-001', { pompeExigee: true }),
  cmd('CMD-C09', 'CC-26-0509', 'Station-service Ambanidia', 'Ambanidia, Antananarivo', -18.9150, 47.5350, 'Pétrole lampant', 4_000, 0.79, 'site-001'),
  cmd('CMD-C10', 'CC-26-0510', 'Station-service Talatamaty', 'Talatamaty, Antananarivo', -18.8300, 47.4600, 'Gazole', 12_000, 0.845, 'site-012'),
  cmd('CMD-C11', 'CC-26-0511', 'Station-service Ambohibao', 'Ambohibao, Antananarivo', -18.8450, 47.4700, 'Gazole', 6_000, 0.845, 'site-001'),
  /* Enlèvement direct par le client : ne passe pas par la planification */
  cmd('CMD-C12', 'CC-26-0512', 'Transports Rasoa', 'Enlèvement au dépôt', -18.8792, 47.5079, 'Gazole', 3_000, 0.845, 'site-001', { modeLivraison: 'enlevement_client' }),
]

/* ── Tournées de démonstration ── */
const notif = (id: string, type: 'planification' | 'demarrage' | 'livraison', le: string, contenu: string) => ({ id, type, canal: 'sms' as const, envoyeeLe: le, contenu })

export const VOYAGES_CARBURANT_DEMO: Voyage[] = [
  /* Validée : plan figé, bon d'enlèvement émis (pas encore transmis), un bon
     de livraison par client ; les clients doivent encore confirmer. */
  {
    id: 'VOY-016', reference: 'VOY-2026-0162', numeroOT: 'OT-2026-04450', statut: 'planifie',
    clientNom: 'Station-service Ambohimanarina et 2 autre(s)', toleranceEcartPoidsPourcent: 0.5,
    etapes: [
      {
        id: 'VOY-016-L1', ordre: 1, siteNom: "Route d'Ambohimanarina, Antananarivo", destinataire: 'Station-service Ambohimanarina', adresseLivraison: "Route d'Ambohimanarina, Antananarivo",
        lat: -18.8650, lng: 47.5050, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 11_830, canalNotification: 'sms',
        commandeId: 'CMD-C01', referenceExterne: 'CC-26-0501', produit: 'Gazole', nombreUnites: 14_000, contenuCommande: 'Gazole, 14 000 L',
        heurePrevue: '2026-09-05T07:40:00', bonLivraison: { numero: 'BL-2026-0001', emisLe: '2026-09-04T08:30:00', statut: 'emis' },
        notifications: [notif('NOTIF-016-1', 'planification', '2026-09-04T08:30:00', 'Votre livraison a été planifiée pour le 05/09/2026. Véhicule 4030 TBA, conducteur Fanomezantsoa Rakotonirina, arrivée estimée le 05/09/2026 vers 7 h 40.')],
      },
      {
        id: 'VOY-016-L2', ordre: 2, siteNom: 'Itaosy, Antananarivo', destinataire: "Hôpital d'Itaosy", adresseLivraison: 'Itaosy, Antananarivo',
        lat: -18.9200, lng: 47.4700, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 5_070, canalNotification: 'sms', pompeExigee: true,
        commandeId: 'CMD-C02', referenceExterne: 'CC-26-0502', produit: 'Gazole', nombreUnites: 6_000, contenuCommande: 'Gazole, 6 000 L',
        heurePrevue: '2026-09-05T08:30:00', bonLivraison: { numero: 'BL-2026-0002', emisLe: '2026-09-04T08:30:00', statut: 'emis' }, confirmeLe: '2026-09-04T09:10:00',
        notifications: [notif('NOTIF-016-2', 'planification', '2026-09-04T08:30:00', 'Votre livraison a été planifiée pour le 05/09/2026. Véhicule 4030 TBA, conducteur Fanomezantsoa Rakotonirina, arrivée estimée le 05/09/2026 vers 8 h 30.')],
      },
      {
        id: 'VOY-016-L3', ordre: 3, siteNom: "Route de l'aéroport, Ivato", destinataire: 'Station-service Ivato', adresseLivraison: "Route de l'aéroport, Ivato",
        lat: -18.8000, lng: 47.4800, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 5_960, canalNotification: 'sms',
        commandeId: 'CMD-C03', referenceExterne: 'CC-26-0503', produit: 'Essence sans plomb', nombreUnites: 8_000, contenuCommande: 'Essence sans plomb, 8 000 L',
        heurePrevue: '2026-09-05T09:20:00', bonLivraison: { numero: 'BL-2026-0003', emisLe: '2026-09-04T08:30:00', statut: 'emis' },
        notifications: [notif('NOTIF-016-3', 'planification', '2026-09-04T08:30:00', 'Votre livraison a été planifiée pour le 05/09/2026. Véhicule 4030 TBA, conducteur Fanomezantsoa Rakotonirina, arrivée estimée le 05/09/2026 vers 9 h 20.')],
      },
    ],
    origine: "Route d'Ambohimanarina, Antananarivo", destination: "Route de l'aéroport, Ivato",
    vehiculeId: 'v-tr-10', vehiculePlaque: '4030 TBA', semiRemorqueId: 'v-ct-3', semiRemorquePlaque: 'CT 4203',
    chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina',
    datePlanifiee: '2026-09-05T07:00:00', modeTransport: 'Camion', confirmationRequise: true, planifieLe: '2026-09-04T08:30:00',
    kmReference: 32, moyen: 'propres',
    marchandise: { typeProduit: 'Carburant', nombreCartons: 0, poidsChargeKg: 22_860 },
    notificationsChauffeur: [{ le: '2026-09-04T08:30:00', message: 'Une tournée vous est confiée : OT-2026-04450, le 05/09/2026, véhicule 4030 TBA, 3 livraison(s).' }],
    carburant: {
      reference: 'TC-2026-001', depotId: 'site-012', depotNom: "Dépôt pétrolier d'Alarobia", dateValidite: '2026-09-06', region: 'Analamanga',
      camions: [{ vehiculeId: 'v-tr-10', plaque: '4030 TBA', citerneId: 'v-ct-3', citernePlaque: 'CT 4203', chauffeurId: 'p-019', chauffeurNom: 'Fanomezantsoa Rakotonirina' }],
      commandeIds: ['CMD-C01', 'CMD-C02', 'CMD-C03'],
      plan: [
        { vehiculeId: 'v-tr-10', citerneId: 'v-ct-3', numero: 1, capaciteL: 15_000, produit: 'Gazole', volumeL: 14_000, commandeId: 'CMD-C01', client: 'Station-service Ambohimanarina' },
        { vehiculeId: 'v-tr-10', citerneId: 'v-ct-3', numero: 2, capaciteL: 10_000, produit: 'Gazole', volumeL: 6_000, commandeId: 'CMD-C02', client: "Hôpital d'Itaosy" },
        { vehiculeId: 'v-tr-10', citerneId: 'v-ct-3', numero: 3, capaciteL: 8_000, produit: 'Essence sans plomb', volumeL: 8_000, commandeId: 'CMD-C03', client: 'Station-service Ivato' },
      ],
      planEnregistreLe: '2026-09-04T08:20:00', valideeLe: '2026-09-04T08:30:00', valideePar: 'Hery Andriamalala',
      bonEnlevement: { numero: 'BE-2026-0001', statut: 'emis', emisLe: '2026-09-04T08:30:00', historique: [{ le: '2026-09-04T08:30:00', par: 'Hery Andriamalala', action: 'Bon émis à la validation de la tournée' }] },
    },
    createdAt: '2026-09-04T08:00:00',
  },
  /* En cours : BSL saisi par le dépôt, chargement contrôlé compartiment par
     compartiment ; la première livraison est déclarée avec ses volumes
     dépotés, en écart à 15 °C au-delà de l'écart autorisé (à qualifier). */
  {
    id: 'VOY-017', reference: 'VOY-2026-0163', numeroOT: 'OT-2026-04452', statut: 'en_cours',
    clientNom: 'Station-service Anosizato et 1 autre(s)', toleranceEcartPoidsPourcent: 0.5,
    etapes: [
      {
        id: 'VOY-017-L1', ordre: 1, siteNom: 'Anosizato, Antananarivo', destinataire: 'Station-service Anosizato', adresseLivraison: 'Anosizato, Antananarivo',
        lat: -18.9250, lng: 47.5020, role: 'livraison', intervalleMin: 0, franchi: true, poidsKg: 10_140, canalNotification: 'sms',
        commandeId: 'CMD-C04', referenceExterne: 'CC-26-0504', produit: 'Gazole', contenuCommande: 'Gazole, 12 000 L',
        contenuCharge: 'Compartiment 1 : Gazole, 12 000 L', articles: [{ id: 'VOY-017-L1-A1', libelle: 'Compartiment 1 : Gazole, 12 000 L', statut: 'livre' }],
        nombreUnites: 11_875, heurePrevue: '2026-09-04T07:30:00', confirmeLe: '2026-09-03T16:40:00', chargementConformeLe: '2026-09-04T06:30:00',
        arriveeLe: '2026-09-04T07:40:00', livreParChauffeurLe: '2026-09-04T08:05:00', quantiteRecue: 11_791,
        mesuresDepotees: [{ numero: 1, volumeL: 11_905, temperature: 27, densite: 0.845, volume15: 11_791 }],
        eBL: { reference: 'BL-2026-0004', emisLe: '2026-09-04T08:05:00', destinataire: 'Station-service Anosizato', adresse: 'Anosizato, Antananarivo', produit: 'Gazole', quantiteRecue: 11_791,
          volumes: [{ numero: 1, volumeL: 11_905, temperature: 27, densite: 0.845, volume15: 11_791 }] },
        ecartQuantite: { quantiteChargee: 11_875, quantiteRecue: 11_791, ecart: -84, horsTolerance: true, motif: "Écart de -84 (Litre à 15 °C), au-delà de l'écart autorisé de 20 Litre à 15 °C.", detecteLe: '2026-09-04T08:05:00' },
        bonLivraison: { numero: 'BL-2026-0004', emisLe: '2026-09-03T15:00:00', statut: 'emis' },
        notifications: [
          notif('NOTIF-017-1', 'planification', '2026-09-03T15:00:00', 'Votre livraison a été planifiée pour le 04/09/2026. Véhicule 4021 TBA, conducteur Solofo Rakotomanga, arrivée estimée le 04/09/2026 vers 7 h 30.'),
          notif('NOTIF-017-2', 'demarrage', '2026-09-04T06:45:00', 'Votre livraison est en cours. Conducteur Solofo Rakotomanga, arrivée estimée vers 7 h 30. Contact : Solofo Rakotomanga.'),
          notif('NOTIF-017-3', 'livraison', '2026-09-04T08:05:00', "Le conducteur déclare avoir effectué votre livraison. Confirmez que vous l'avez bien reçue, ou signalez un problème, depuis votre lien de suivi."),
        ],
      },
      {
        id: 'VOY-017-L2', ordre: 2, siteNom: 'Ampitatafika, Antananarivo', destinataire: 'Station-service Ampitatafika', adresseLivraison: 'Ampitatafika, Antananarivo',
        lat: -18.9380, lng: 47.4880, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: 7_110, canalNotification: 'sms',
        commandeId: 'CMD-C05', referenceExterne: 'CC-26-0505', produit: 'Pétrole lampant', contenuCommande: 'Pétrole lampant, 9 000 L',
        contenuCharge: 'Compartiment 2 : Pétrole lampant, 9 000 L', articles: [{ id: 'VOY-017-L2-A1', libelle: 'Compartiment 2 : Pétrole lampant, 9 000 L' }],
        nombreUnites: 8_895, heurePrevue: '2026-09-04T08:30:00', confirmeLe: '2026-09-03T17:00:00', chargementConformeLe: '2026-09-04T06:30:00',
        bonLivraison: { numero: 'BL-2026-0005', emisLe: '2026-09-03T15:00:00', statut: 'emis' },
        notifications: [
          notif('NOTIF-017-4', 'planification', '2026-09-03T15:00:00', 'Votre livraison a été planifiée pour le 04/09/2026. Véhicule 4021 TBA, conducteur Solofo Rakotomanga, arrivée estimée le 04/09/2026 vers 8 h 30.'),
          notif('NOTIF-017-5', 'demarrage', '2026-09-04T06:45:00', 'Votre livraison est en cours. Conducteur Solofo Rakotomanga, arrivée estimée vers 8 h 30. Contact : Solofo Rakotomanga.'),
        ],
      },
    ],
    origine: 'Anosizato, Antananarivo', destination: 'Ampitatafika, Antananarivo',
    vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', semiRemorqueId: 'v-ct-4', semiRemorquePlaque: 'CT 4204',
    chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
    datePlanifiee: '2026-09-04T05:30:00', modeTransport: 'Camion', confirmationRequise: true,
    planifieLe: '2026-09-03T15:00:00', confirmeLe: '2026-09-03T17:00:00',
    chargementEntrepotLe: '2026-09-04T06:10:00', chargementChauffeurLe: '2026-09-04T06:30:00', dateDepartReel: '2026-09-04T06:45:00',
    kmReference: 18, kmDepart: 182_400, moyen: 'propres',
    marchandise: { typeProduit: 'Carburant', nombreCartons: 0, poidsChargeKg: 17_250 },
    notificationsChauffeur: [{ le: '2026-09-03T15:00:00', message: 'Une tournée vous est confiée : OT-2026-04452, le 04/09/2026, véhicule 4021 TBA, 2 livraison(s).' }],
    carburant: {
      reference: 'TC-2026-002', depotId: 'site-001', depotNom: 'Dépôt Tanjombato', dateValidite: '2026-09-04', region: 'Analamanga',
      camions: [{ vehiculeId: 'v-tr-1', plaque: '4021 TBA', citerneId: 'v-ct-4', citernePlaque: 'CT 4204', chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga' }],
      commandeIds: ['CMD-C04', 'CMD-C05'],
      plan: [
        { vehiculeId: 'v-tr-1', citerneId: 'v-ct-4', numero: 1, capaciteL: 12_000, produit: 'Gazole', volumeL: 12_000, commandeId: 'CMD-C04', client: 'Station-service Anosizato', conformeLe: '2026-09-04T06:30:00' },
        { vehiculeId: 'v-tr-1', citerneId: 'v-ct-4', numero: 2, capaciteL: 10_000, produit: 'Pétrole lampant', volumeL: 9_000, commandeId: 'CMD-C05', client: 'Station-service Ampitatafika', conformeLe: '2026-09-04T06:30:00' },
        { vehiculeId: 'v-tr-1', citerneId: 'v-ct-4', numero: 3, capaciteL: 8_000 },
      ],
      planEnregistreLe: '2026-09-03T14:50:00', valideeLe: '2026-09-03T15:00:00', valideePar: 'Hery Andriamalala',
      bonEnlevement: {
        numero: 'BE-2026-0002', statut: 'confirme', emisLe: '2026-09-03T15:00:00', transmisLe: '2026-09-03T15:05:00', transmisA: 'chargement@depot-tanjombato.mg',
        bsl: { numero: 'BSL-26-0912', saisiLe: '2026-09-04T06:10:00', saisiPar: 'Naina Rakotobe', parDepot: true, mesures: [
          { numero: 1, volumeL: 12_000, temperature: 28, densite: 0.845, volume15: 11_875 },
          { numero: 2, volumeL: 9_000, temperature: 28, densite: 0.79, volume15: 8_895 },
        ] },
        historique: [
          { le: '2026-09-03T15:00:00', par: 'Hery Andriamalala', action: 'Bon émis à la validation de la tournée' },
          { le: '2026-09-03T15:05:00', par: 'Hery Andriamalala', action: 'Transmis au dépôt Dépôt Tanjombato (chargement@depot-tanjombato.mg)' },
          { le: '2026-09-04T06:10:00', par: 'Naina Rakotobe', action: 'Enlèvement confirmé par le dépôt, BSL BSL-26-0912' },
        ],
      },
    },
    createdAt: '2026-09-03T14:00:00',
  },
]
