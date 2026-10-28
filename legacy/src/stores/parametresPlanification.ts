import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { RoleUtilisateur } from '../types'

/**
 * Réglages du circuit des commandes, propres à chaque entreprise : le module
 * n'est pas figé pour un client. Les commandes peuvent arriver par import du
 * système de gestion, par transmission d'un service (rôles ordonnateurs) ou
 * par saisie directe du planificateur ; chaque mode se coche ici.
 */
export interface ParametresPlanification {
  /** Les commandes peuvent être importées depuis le système de gestion. */
  importCommandes: boolean
  /** Rôles autorisés à jouer l'ordonnateur (transmission par un service). */
  rolesEmetteurs: RoleUtilisateur[]
  /** Le planificateur peut-il saisir lui-même une commande dans un ordre ? */
  saisieParPlanificateur: boolean
  /** Rôles habilités à planifier, annuler et clôturer une tournée. */
  habilites: RoleUtilisateur[]
  /** Libellé de la référence de la commande dans le système de l'entreprise. */
  libelleReferenceExterne: string
  referenceExterneObligatoire: boolean
  /** Unité de comptage des marchandises (cartons, colis, palettes...). */
  uniteComptage: string
  /** Au-delà de cette marge (minutes) entre l'heure estimée et l'heure prévue, une livraison est signalée en retard. */
  margeRetardMin: number
  /** Vitesse moyenne (km/h) pour estimer les heures d'arrivée quand le trajet n'a pas de temps de référence. */
  vitesseMoyenneKmh: number
  /** Modes de transport proposés pour une expédition. */
  modesTransport: string[]
  /** Heure de départ proposée par défaut (HH:MM) : proposition de chargement, ordre de replanification. */
  heureDepartDefaut: string
  /** Rôle de l'agent chargé d'appeler les clients pour leur confirmation. */
  roleAgentAppels: RoleUtilisateur
  /** Rôles qui déclarent le chargement (entrepôt, dépôt), jamais la direction. */
  rolesChargement: RoleUtilisateur[]
  /** À la livraison, les quantités reçues et les volumes dépotés sont pré-remplis avec ce qui a été chargé. */
  preremplirQuantites: boolean
  /** Qui paie le fret par défaut sur une nouvelle commande : l'ordonnateur ou le destinataire. */
  fretALaChargeDefaut: 'ordonnateur' | 'destinataire'
  /** Livraison ni confirmée ni contestée : au-delà de ce délai (en jours), elle est réputée confirmée. Vide : jamais. */
  delaiConfirmationTaciteJours: number | null
  /** Écart toléré entre la facture d'un transporteur et le montant convenu (montant). */
  toleranceFactureTransporteur: number
  /** Rôles qui peuvent valider une facture de transporteur sans grille tarifaire applicable, avec un motif. */
  rolesValidationSansTarif: RoleUtilisateur[]
}

const DEFAUT: ParametresPlanification = {
  importCommandes: true,
  rolesEmetteurs: ['commercial'],
  saisieParPlanificateur: false,
  habilites: ['admin', 'responsable_flotte'],
  libelleReferenceExterne: 'N° de commande',
  referenceExterneObligatoire: true,
  uniteComptage: 'cartons',
  margeRetardMin: 30,
  vitesseMoyenneKmh: 45,
  modesTransport: ['Camion', 'Train', 'Bateau', 'Avion'],
  heureDepartDefaut: '08:00',
  roleAgentAppels: 'charge_clientele',
  rolesChargement: ['depot', 'admin', 'responsable_flotte'],
  preremplirQuantites: true,
  fretALaChargeDefaut: 'ordonnateur',
  delaiConfirmationTaciteJours: null,
  toleranceFactureTransporteur: 0,
  rolesValidationSansTarif: ['admin'],
}
const CLE = 'fms-ucodis-parametres-planification'

export interface Resultat { ok: boolean; motif?: string }

export const useParametresPlanificationStore = defineStore('parametresPlanification', () => {
  let initial: ParametresPlanification = { ...DEFAUT }
  try { const b = localStorage.getItem(CLE); if (b) initial = { ...DEFAUT, ...JSON.parse(b) } } catch { /* défaut */ }
  if (!Number.isFinite(initial.vitesseMoyenneKmh) || initial.vitesseMoyenneKmh <= 0) initial.vitesseMoyenneKmh = DEFAUT.vitesseMoyenneKmh
  if (!Array.isArray(initial.habilites) || initial.habilites.length === 0) initial.habilites = [...DEFAUT.habilites]
  if (!Array.isArray(initial.rolesChargement) || initial.rolesChargement.length === 0) initial.rolesChargement = ['depot', ...initial.habilites.filter(r => r !== 'depot')]
  /* Anciens libellés des modes de transport, remplacés par ceux de la gestion du transport. */
  if (JSON.stringify(initial.modesTransport) === JSON.stringify(['Routier', 'Ferroviaire', 'Maritime', 'Aérien'])) initial.modesTransport = [...DEFAUT.modesTransport]
  if (initial.fretALaChargeDefaut !== 'ordonnateur' && initial.fretALaChargeDefaut !== 'destinataire') initial.fretALaChargeDefaut = DEFAUT.fretALaChargeDefaut
  if (!Array.isArray(initial.rolesValidationSansTarif)) initial.rolesValidationSansTarif = [...DEFAUT.rolesValidationSansTarif]
  if (!Number.isFinite(initial.toleranceFactureTransporteur) || initial.toleranceFactureTransporteur < 0) initial.toleranceFactureTransporteur = 0
  const parametres = ref<ParametresPlanification>(initial)
  watch(parametres, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const peutEmettre = (role?: string | null) => !!role && parametres.value.rolesEmetteurs.includes(role as RoleUtilisateur)
  /** Planifier, annuler, clôturer : jamais la direction (lecture seule), quel que soit le réglage. */
  const peutPiloter = (role?: string | null) =>
    !!role && role !== 'direction' && parametres.value.habilites.includes(role as RoleUtilisateur)

  /** Déclarer le chargement : rôles réglés, jamais la direction (lecture seule). */
  const peutDeclarerChargement = (role?: string | null) =>
    !!role && role !== 'direction' && parametres.value.rolesChargement.includes(role as RoleUtilisateur)

  function modesActifs(p: ParametresPlanification) {
    return (p.importCommandes ? 1 : 0) + (p.rolesEmetteurs.length > 0 ? 1 : 0) + (p.saisieParPlanificateur ? 1 : 0)
  }
  const MOTIF_MODE = 'Au moins un mode d\'arrivée des commandes doit rester actif.'

  function basculerEmetteur(role: RoleUtilisateur): Resultat {
    const l = parametres.value.rolesEmetteurs
    const suivant = l.includes(role) ? l.filter(x => x !== role) : [...l, role]
    if (modesActifs({ ...parametres.value, rolesEmetteurs: suivant }) === 0) return { ok: false, motif: MOTIF_MODE }
    parametres.value.rolesEmetteurs = suivant
    return { ok: true }
  }
  function definirImport(actif: boolean): Resultat {
    if (modesActifs({ ...parametres.value, importCommandes: actif }) === 0) return { ok: false, motif: MOTIF_MODE }
    parametres.value.importCommandes = actif
    return { ok: true }
  }
  function definirSaisie(actif: boolean): Resultat {
    if (modesActifs({ ...parametres.value, saisieParPlanificateur: actif }) === 0) return { ok: false, motif: MOTIF_MODE }
    parametres.value.saisieParPlanificateur = actif
    return { ok: true }
  }
  function basculerHabilite(role: RoleUtilisateur): Resultat {
    if (role === 'direction') return { ok: false, motif: 'La direction consulte en lecture seule : elle ne peut pas être habilitée.' }
    const l = parametres.value.habilites
    const suivant = l.includes(role) ? l.filter(x => x !== role) : [...l, role]
    if (suivant.length === 0) return { ok: false, motif: 'Au moins un rôle doit rester habilité à planifier, annuler et clôturer.' }
    parametres.value.habilites = suivant
    return { ok: true }
  }
  function basculerRoleChargement(role: RoleUtilisateur): Resultat {
    if (role === 'direction') return { ok: false, motif: 'La direction consulte en lecture seule : elle ne peut pas déclarer le chargement.' }
    const l = parametres.value.rolesChargement
    const suivant = l.includes(role) ? l.filter(x => x !== role) : [...l, role]
    if (suivant.length === 0) return { ok: false, motif: 'Au moins un rôle doit pouvoir déclarer le chargement.' }
    parametres.value.rolesChargement = suivant
    return { ok: true }
  }
  function definirLibelleReference(v: string): Resultat {
    if (!v.trim()) return { ok: false, motif: 'Le libellé de la référence de commande ne peut pas être vide.' }
    parametres.value.libelleReferenceExterne = v.trim(); return { ok: true }
  }
  function definirUniteComptage(v: string): Resultat {
    if (!v.trim()) return { ok: false, motif: "L'unité de comptage des marchandises ne peut pas être vide." }
    parametres.value.uniteComptage = v.trim(); return { ok: true }
  }
  function definirMargeRetard(n: number): Resultat {
    if (!Number.isFinite(n) || n < 0) return { ok: false, motif: 'La marge de retard doit être un nombre de minutes positif ou nul.' }
    parametres.value.margeRetardMin = Math.round(n); return { ok: true }
  }
  function definirVitesseMoyenne(n: number): Resultat {
    if (!Number.isFinite(n) || Math.round(n) < 1) return { ok: false, motif: 'La vitesse moyenne doit être un nombre de km/h supérieur à 0.' }
    if (n > 130) return { ok: false, motif: 'La vitesse moyenne ne peut pas dépasser 130 km/h.' }
    parametres.value.vitesseMoyenneKmh = Math.round(n); return { ok: true }
  }
  function definirModesTransport(liste: string[]): Resultat {
    const modes = [...new Set(liste.map(m => m.trim()).filter(Boolean))]
    if (!modes.length) return { ok: false, motif: 'Indiquez au moins un mode de transport.' }
    parametres.value.modesTransport = modes; return { ok: true }
  }
  function definirHeureDepart(v: string): Resultat {
    const h = v.trim()
    const m = /^(\d{2}):(\d{2})$/.exec(h)
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { ok: false, motif: "L'heure de départ par défaut doit être une heure valide (HH:MM)." }
    parametres.value.heureDepartDefaut = h; return { ok: true }
  }
  function definirRoleAgentAppels(role: RoleUtilisateur): Resultat {
    if (!role) return { ok: false, motif: "Choisissez le rôle de l'agent qui appelle les clients." }
    if (role === 'direction') return { ok: false, motif: 'La direction consulte en lecture seule : elle ne peut pas enregistrer les réponses des clients.' }
    parametres.value.roleAgentAppels = role; return { ok: true }
  }
  function definirFretALaCharge(v: string): Resultat {
    if (v !== 'ordonnateur' && v !== 'destinataire') return { ok: false, motif: "Choisissez l'ordonnateur ou le destinataire." }
    parametres.value.fretALaChargeDefaut = v; return { ok: true }
  }
  /** Vide : pas de confirmation tacite. */
  function definirDelaiConfirmationTacite(v: string): Resultat {
    if (!v.trim()) { parametres.value.delaiConfirmationTaciteJours = null; return { ok: true } }
    const n = Number(v.replace(',', '.'))
    if (!Number.isInteger(n) || n < 1) return { ok: false, motif: 'Le délai de confirmation tacite est un nombre entier de jours, au moins 1 (laissez vide pour ne jamais confirmer tacitement).' }
    parametres.value.delaiConfirmationTaciteJours = n; return { ok: true }
  }
  function definirToleranceFacture(v: string): Resultat {
    const n = Number(v.replace(',', '.'))
    if (!v.trim() || !Number.isFinite(n) || n < 0) return { ok: false, motif: "L'écart toléré sur la facture d'un transporteur est un montant positif ou nul." }
    parametres.value.toleranceFactureTransporteur = n; return { ok: true }
  }
  function basculerValidationSansTarif(role: RoleUtilisateur): Resultat {
    if (role === 'direction') return { ok: false, motif: 'La direction consulte en lecture seule : elle ne peut pas valider une facture.' }
    const l = parametres.value.rolesValidationSansTarif
    parametres.value.rolesValidationSansTarif = l.includes(role) ? l.filter(x => x !== role) : [...l, role]
    return { ok: true }
  }
  /** Valider une facture de transporteur sans grille : rôles réglés, jamais la direction. */
  const peutValiderSansTarif = (role?: string | null) => !!role && role !== 'direction' && parametres.value.rolesValidationSansTarif.includes(role as RoleUtilisateur)
  /** Le rôle connecté est-il celui de l'agent qui appelle les clients ? */
  const estAgentAppels = (role?: string | null) => !!role && role === parametres.value.roleAgentAppels
  function reinitialiser() { parametres.value = { ...DEFAUT, rolesEmetteurs: [...DEFAUT.rolesEmetteurs], habilites: [...DEFAUT.habilites], modesTransport: [...DEFAUT.modesTransport], rolesChargement: [...DEFAUT.rolesChargement], rolesValidationSansTarif: [...DEFAUT.rolesValidationSansTarif] } }

  return { parametres, peutEmettre, peutPiloter, peutDeclarerChargement, basculerRoleChargement, basculerEmetteur, definirImport, definirSaisie, basculerHabilite, definirLibelleReference, definirUniteComptage, definirMargeRetard, definirVitesseMoyenne, definirModesTransport, definirHeureDepart, definirRoleAgentAppels, estAgentAppels, definirFretALaCharge, definirDelaiConfirmationTacite, definirToleranceFacture, basculerValidationSansTarif, peutValiderSansTarif, reinitialiser }
})

/** Raccourci hors composant : le rôle peut-il planifier, annuler et clôturer ? */
export function peutPiloter(role?: string | null): boolean {
  return useParametresPlanificationStore().peutPiloter(role)
}
