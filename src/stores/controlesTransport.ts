import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Commande, Voyage } from '../types'
import { useClientsStore } from './clients'
import { useProduitsStore } from './produits'
import { useVoyagesStore } from './voyages'
import { aujourdhuiISO } from '../utils/horloge'
import { METHODES_VOLUME15, METHODE_VOLUME15_DEFAUT, completerVolume15, calculerVolume15, type MethodeVolume15 } from '../lib/volume15'
import type { MesureCompartiment } from '../types'

/**
 * Règles de contrôle du transport, propres à chaque entreprise :
 * écarts autorisés entre quantité chargée et quantité livrée (à 15 °C pour
 * le carburant), pour l'entreprise et si besoin par client ; comportement
 * hors tolérance (bloquer ou signaler) ; listes de types d'incident, de
 * types de motif et de codes motif ; comportement quand une commande ou une
 * tournée dépasse sa date sans avoir été exécutée.
 */
export type UniteTolerance = 'pourcent' | 'quantite'
export interface ToleranceEcart {
  id: string
  /** Vide : tolérance de l'entreprise. */
  clientId?: string
  /** Vide : tous les produits. Obligatoire pour une tolérance en quantité. */
  produitId?: string
  valeur: number
  /** En pourcentage de la quantité chargée, ou en quantité dans l'unité du produit. */
  unite: UniteTolerance
}
export type ModeDepassement = 'bloquer' | 'signaler'
export const LIB_MODE_DEPASSEMENT: Record<ModeDepassement, string> = { bloquer: 'Bloquer la saisie', signaler: 'Signaler seulement' }
export type ModeDateDepassee = 'alerter' | 'bloquer'
export const LIB_MODE_DATE_DEPASSEE: Record<ModeDateDepassee, string> = { alerter: 'Alerter seulement', bloquer: "Bloquer l'exécution" }

export interface EntreeListe { code: string; libelle: string; actif: boolean; /** Codes motif : type de motif auquel le code se rattache. */ typeMotif?: string }
export type NomListe = 'typesIncident' | 'typesMotif' | 'codesMotif'
export const LIB_LISTE: Record<NomListe, string> = { typesIncident: "Types d'incident", typesMotif: 'Types de motif', codesMotif: 'Codes motif' }

export interface ReglagesControles {
  tolerances: ToleranceEcart[]
  modeDepassement: ModeDepassement
  modeDateDepassee: ModeDateDepassee
  /** Méthode de calcul du volume à 15 °C quand le BSL ou le relevé de dépotage ne le donne pas. */
  methodeVolume15: MethodeVolume15
  typesIncident: EntreeListe[]
  typesMotif: EntreeListe[]
  codesMotif: EntreeListe[]
}
export interface Resultat { ok: boolean; motif?: string }
export interface ToleranceApplicable {
  valeur: number
  unite: UniteTolerance
  /** « % », ou l'unité du produit (« Litre à 15 °C » pour le carburant). */
  libelleUnite: string
  /** D'où vient la tolérance retenue. */
  source: 'client_produit' | 'client' | 'produit' | 'entreprise'
  regle: ToleranceEcart
}
export interface EtatDepassement {
  expiree: boolean
  mode: ModeDateDepassee
  /** Vrai en mode blocage : plus de chargement tant qu'elle n'est pas reprogrammée ou annulée. */
  bloque: boolean
  /** Date dépassée (AAAA-MM-JJ). */
  dateLimite?: string
  motif?: string
}

/** Listes de motifs de la suite des livraisons : protêt, traitement des contestations, responsabilité. */
const TYPES_AJOUTES: EntreeListe[] = [
  { code: 'PROTET', libelle: 'Motifs de protêt', actif: true },
  { code: 'CONTESTATION', libelle: 'Traitement des contestations', actif: true },
  { code: 'RESPONSABILITE', libelle: 'Motifs de responsabilité', actif: true },
]
const CODES_AJOUTES: EntreeListe[] = [
  { code: 'PRT-MAN', libelle: 'Manquant', typeMotif: 'PROTET', actif: true },
  { code: 'PRT-AVA', libelle: 'Avarie', typeMotif: 'PROTET', actif: true },
  { code: 'PRT-COU', libelle: 'Coulage', typeMotif: 'PROTET', actif: true },
  { code: 'PRT-RET', libelle: 'Retard', typeMotif: 'PROTET', actif: true },
  { code: 'PRT-NCF', libelle: 'Non-conformité', typeMotif: 'PROTET', actif: true },
  { code: 'CTS-ENQ', libelle: 'Enquête', typeMotif: 'CONTESTATION', actif: true },
  { code: 'CTS-REL', libelle: 'Relivraison', typeMotif: 'CONTESTATION', actif: true },
  { code: 'CTS-AVO', libelle: 'Avoir au client', typeMotif: 'CONTESTATION', actif: true },
  { code: 'CTS-INF', libelle: 'Contestation non fondée', typeMotif: 'CONTESTATION', actif: true },
  { code: 'RSP-CAL', libelle: 'Calage ou arrimage insuffisant', typeMotif: 'RESPONSABILITE', actif: true },
  { code: 'RSP-PRE', libelle: 'Erreur de préparation au départ', typeMotif: 'RESPONSABILITE', actif: true },
  { code: 'RSP-MAN', libelle: 'Manutention au déchargement', typeMotif: 'RESPONSABILITE', actif: true },
  { code: 'RSP-CMD', libelle: 'Erreur de commande', typeMotif: 'RESPONSABILITE', actif: true },
]

const DEFAUT = (): ReglagesControles => ({
  tolerances: [
    { id: 'TOL-001', valeur: 0.5, unite: 'pourcent' },
    { id: 'TOL-002', clientId: 'cli-001', valeur: 1, unite: 'pourcent' },
    { id: 'TOL-003', produitId: 'PRD-006', valeur: 20, unite: 'quantite' },
  ],
  modeDepassement: 'signaler',
  modeDateDepassee: 'alerter',
  methodeVolume15: METHODE_VOLUME15_DEFAUT,
  typesIncident: [
    { code: 'PANNE', libelle: 'Panne du véhicule', actif: true },
    { code: 'ACCIDENT', libelle: 'Accident', actif: true },
    { code: 'ROUTE', libelle: 'Route impraticable', actif: true },
    { code: 'MARCHANDISE', libelle: 'Marchandise endommagée', actif: true },
    { code: 'VOL', libelle: 'Vol ou perte de marchandise', actif: true },
    { code: 'RETARD', libelle: 'Retard important', actif: true },
  ],
  typesMotif: [
    { code: 'ANNULATION', libelle: 'Annulation', actif: true },
    { code: 'DEVIATION', libelle: 'Déviation', actif: true },
    ...TYPES_AJOUTES,
  ],
  codesMotif: [
    { code: 'ANN-CLI', libelle: 'Demande du client', typeMotif: 'ANNULATION', actif: true },
    { code: 'ANN-INC', libelle: 'Incident sur la tournée', typeMotif: 'ANNULATION', actif: true },
    { code: 'ANN-VEH', libelle: 'Véhicule indisponible', typeMotif: 'ANNULATION', actif: true },
    { code: 'ANN-STK', libelle: 'Produit indisponible au dépôt', typeMotif: 'ANNULATION', actif: true },
    { code: 'DEV-ROU', libelle: 'Route coupée', typeMotif: 'DEVIATION', actif: true },
    { code: 'DEV-SEC', libelle: 'Raison de sécurité', typeMotif: 'DEVIATION', actif: true },
    { code: 'DEV-CLI', libelle: 'Changement de lieu demandé par le client', typeMotif: 'DEVIATION', actif: true },
    ...CODES_AJOUTES,
  ],
})
const CLE = 'fms-ucodis-controles-transport'
const norm = (s?: string) => (s ?? '').trim().toLowerCase()
/** Tournées pas encore parties : seules elles peuvent « dépasser leur date sans avoir été exécutées ». */
const NON_DEMARREES: Voyage['statut'][] = ['en_attente', 'planifie', 'confirme', 'pret']

export const useControlesTransportStore = defineStore('controlesTransport', () => {
  let initial = DEFAUT()
  try {
    const b = localStorage.getItem(CLE)
    if (b) { const lu = JSON.parse(b) as Partial<ReglagesControles>; const d = DEFAUT(); initial = { ...d, ...lu } }
  } catch { /* défaut */ }
  if (!initial.tolerances.some(t => !t.clientId && !t.produitId)) initial.tolerances.unshift({ ...DEFAUT().tolerances[0]! })
  /* Réglages enregistrés avant l'ajout des listes de la suite des livraisons : elles sont ajoutées une fois. */
  TYPES_AJOUTES.forEach(t => {
    if (initial.typesMotif.some(x => x.code === t.code)) return
    initial.typesMotif = [...initial.typesMotif, { ...t }]
    initial.codesMotif = [...initial.codesMotif, ...CODES_AJOUTES.filter(c => c.typeMotif === t.code && !initial.codesMotif.some(x => x.code === c.code)).map(c => ({ ...c }))]
  })
  const reglages = ref<ReglagesControles>(initial)
  watch(reglages, v => { try { localStorage.setItem(CLE, JSON.stringify(v)) } catch { /* tant pis */ } }, { deep: true })

  const produits = () => useProduitsStore()
  const idSuivant = () => { const max = reglages.value.tolerances.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, '')) || 0), 0); return `TOL-${String(max + 1).padStart(3, '0')}` }

  /* ── Écarts autorisés ── */
  const toleranceEntreprise = () => reglages.value.tolerances.find(t => !t.clientId && !t.produitId)!
  function libelleUnite(unite: UniteTolerance, produitId?: string): string {
    if (unite === 'pourcent') return '%'
    const p = produits().getById(produitId)
    if (!p) return 'unités du produit'
    return p.carburant ? `${p.unite} à 15 °C` : p.unite
  }
  function controlerTolerance(t: Omit<ToleranceEcart, 'id'>, ignorerId?: string): string | null {
    if (t.valeur == null || !Number.isFinite(t.valeur)) return "Indiquez l'écart autorisé."
    if (t.valeur < 0) return "L'écart autorisé ne peut pas être négatif."
    if (t.unite === 'pourcent' && t.valeur > 100) return "Un écart en pourcentage ne dépasse pas 100 %."
    if (t.unite === 'quantite' && !t.produitId) return "Un écart en quantité s'exprime dans l'unité d'un produit : choisissez le produit."
    if (t.clientId && !useClientsStore().getById(t.clientId)) return 'Client introuvable.'
    if (t.produitId && !produits().getById(t.produitId)) return 'Produit introuvable.'
    if (reglages.value.tolerances.some(x => x.id !== ignorerId && (x.clientId ?? '') === (t.clientId ?? '') && (x.produitId ?? '') === (t.produitId ?? '')))
      return 'Un écart autorisé existe déjà pour ce client et ce produit : modifiez-le plutôt.'
    return null
  }
  function ajouterTolerance(t: Omit<ToleranceEcart, 'id'>): Resultat {
    const motif = controlerTolerance(t); if (motif) return { ok: false, motif }
    reglages.value.tolerances.push({ ...t, clientId: t.clientId || undefined, produitId: t.produitId || undefined, id: idSuivant() })
    return { ok: true }
  }
  function modifierTolerance(id: string, t: Partial<Omit<ToleranceEcart, 'id'>>): Resultat {
    const x = reglages.value.tolerances.find(y => y.id === id); if (!x) return { ok: false, motif: 'Écart autorisé introuvable.' }
    const fusion = { ...x, ...t }
    if (!x.clientId && !x.produitId && (fusion.clientId || fusion.produitId)) return { ok: false, motif: "L'écart autorisé de l'entreprise s'applique à tous : il ne se rattache ni à un client ni à un produit." }
    const motif = controlerTolerance(fusion, id); if (motif) return { ok: false, motif }
    Object.assign(x, fusion)
    return { ok: true }
  }
  function retirerTolerance(id: string): Resultat {
    const x = reglages.value.tolerances.find(y => y.id === id); if (!x) return { ok: false, motif: 'Écart autorisé introuvable.' }
    if (!x.clientId && !x.produitId) return { ok: false, motif: "L'écart autorisé de l'entreprise ne se retire pas : modifiez sa valeur." }
    reglages.value.tolerances = reglages.value.tolerances.filter(y => y.id !== id)
    return { ok: true }
  }
  /**
   * Écart autorisé pour un client et un produit (identifiants ou noms) : le
   * réglage le plus précis l'emporte (client et produit, puis client, puis
   * produit, puis entreprise).
   */
  function toleranceFor(client?: string, produit?: string): ToleranceApplicable {
    const cli = client ? useClientsStore().getById(client) ?? useClientsStore().parNom(client) : undefined
    const prd = produit ? produits().resoudre(produit) : undefined
    const l = reglages.value.tolerances
    const trouve = (cid?: string, pid?: string) => l.find(t => (t.clientId ?? '') === (cid ?? '') && (t.produitId ?? '') === (pid ?? ''))
    const choix: [ToleranceEcart | undefined, ToleranceApplicable['source']][] = [
      [cli && prd ? trouve(cli.id, prd.id) : undefined, 'client_produit'],
      [cli ? trouve(cli.id) : undefined, 'client'],
      [prd ? trouve(undefined, prd.id) : undefined, 'produit'],
      [toleranceEntreprise(), 'entreprise'],
    ]
    const [regle, source] = choix.find(([r]) => !!r) as [ToleranceEcart, ToleranceApplicable['source']]
    return { valeur: regle.valeur, unite: regle.unite, libelleUnite: libelleUnite(regle.unite, regle.produitId), source, regle }
  }
  const modeDepassement = (): ModeDepassement => reglages.value.modeDepassement
  function definirModeDepassement(m: ModeDepassement): Resultat {
    if (!LIB_MODE_DEPASSEMENT[m]) return { ok: false, motif: 'Choisissez bloquer ou signaler.' }
    reglages.value.modeDepassement = m; return { ok: true }
  }
  /**
   * Contrôle d'une quantité livrée face à la quantité chargée. Hors
   * tolérance : en mode « bloquer », ok est faux et la saisie est refusée ;
   * en mode « signaler », ok reste vrai mais horsTolerance l'indique, avec le motif.
   */
  function controlerEcart(client: string | undefined, produit: string | undefined, quantiteChargee: number, quantiteLivree: number): Resultat & { horsTolerance: boolean; ecart: number; tolerance: ToleranceApplicable } {
    const tolerance = toleranceFor(client, produit)
    if (!Number.isFinite(quantiteChargee) || !Number.isFinite(quantiteLivree)) return { ok: false, motif: 'Indiquez les quantités chargée et livrée.', horsTolerance: false, ecart: 0, tolerance }
    if (quantiteChargee < 0 || quantiteLivree < 0) return { ok: false, motif: 'Une quantité ne peut pas être négative.', horsTolerance: false, ecart: 0, tolerance }
    const ecart = quantiteLivree - quantiteChargee
    const mesure = tolerance.unite === 'pourcent' ? (quantiteChargee > 0 ? Math.abs(ecart) / quantiteChargee * 100 : (ecart === 0 ? 0 : Infinity)) : Math.abs(ecart)
    const horsTolerance = mesure > tolerance.valeur
    if (!horsTolerance) return { ok: true, horsTolerance, ecart, tolerance }
    const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
    const motif = `Écart de ${fmt(ecart)} (${tolerance.unite === 'pourcent' ? `${fmt(mesure)} %` : tolerance.libelleUnite}), au-delà de l'écart autorisé de ${fmt(tolerance.valeur)} ${tolerance.libelleUnite}.`
    return { ok: modeDepassement() !== 'bloquer', motif, horsTolerance, ecart, tolerance }
  }

  /* ── Listes de motifs ── */
  /** Entrées actives d'une liste ; pour les codes motif, éventuellement ceux d'un type de motif. */
  function motifs(liste: NomListe, typeMotif?: string): EntreeListe[] {
    return reglages.value[liste].filter(e => e.actif && (!typeMotif || liste !== 'codesMotif' || e.typeMotif === typeMotif))
  }
  const libelleMotif = (liste: NomListe, code?: string) => reglages.value[liste].find(e => e.code === code)?.libelle ?? code ?? ''
  function ajouterEntree(liste: NomListe, e: { code: string; libelle: string; typeMotif?: string }): Resultat {
    const code = e.code.trim().toUpperCase(), libelle = e.libelle.trim()
    if (!code) return { ok: false, motif: 'Indiquez le code.' }
    if (!libelle) return { ok: false, motif: 'Indiquez le libellé.' }
    if (!/^[A-Z0-9_-]+$/.test(code)) return { ok: false, motif: 'Le code ne contient que des lettres, des chiffres, des tirets ou des soulignés.' }
    const l = reglages.value[liste]
    if (l.some(x => x.code === code)) return { ok: false, motif: 'Ce code existe déjà.' }
    if (l.some(x => norm(x.libelle) === norm(libelle) && (liste !== 'codesMotif' || x.typeMotif === e.typeMotif))) return { ok: false, motif: 'Ce libellé existe déjà.' }
    if (liste === 'codesMotif' && !reglages.value.typesMotif.some(t => t.code === e.typeMotif)) return { ok: false, motif: 'Choisissez le type de motif du code.' }
    l.push({ code, libelle, actif: true, typeMotif: liste === 'codesMotif' ? e.typeMotif : undefined })
    return { ok: true }
  }
  /** Le type de motif « Déviation » sert à la déviation d'une livraison de carburant : il reste actif et ne se supprime pas. */
  const MOTIF_DEVIATION_PROTEGE = "Le type de motif « Déviation » sert à la déviation d'une livraison vers un autre client : il ne se désactive pas et ne se supprime pas."
  const protege = (liste: NomListe, code: string) => liste === 'typesMotif' && code === 'DEVIATION'
  function modifierEntree(liste: NomListe, code: string, d: { libelle?: string; actif?: boolean }): Resultat {
    const l = reglages.value[liste], x = l.find(y => y.code === code); if (!x) return { ok: false, motif: 'Entrée introuvable.' }
    if (d.actif === false && protege(liste, code)) return { ok: false, motif: MOTIF_DEVIATION_PROTEGE }
    if (d.libelle !== undefined) {
      const lib = d.libelle.trim()
      if (!lib) return { ok: false, motif: 'Le libellé ne peut pas être vide.' }
      if (l.some(y => y.code !== code && norm(y.libelle) === norm(lib) && (liste !== 'codesMotif' || y.typeMotif === x.typeMotif))) return { ok: false, motif: 'Ce libellé existe déjà.' }
      x.libelle = lib
    }
    if (d.actif !== undefined) {
      if (!d.actif && x.actif && l.filter(y => y.actif && (liste !== 'codesMotif' || y.typeMotif === x.typeMotif)).length === 1) return { ok: false, motif: 'Au moins une entrée doit rester active.' }
      x.actif = d.actif
    }
    return { ok: true }
  }
  function supprimerEntree(liste: NomListe, code: string): Resultat {
    const l = reglages.value[liste]; if (!l.some(y => y.code === code)) return { ok: false, motif: 'Entrée introuvable.' }
    if (protege(liste, code)) return { ok: false, motif: MOTIF_DEVIATION_PROTEGE }
    if (liste === 'typesMotif' && reglages.value.codesMotif.some(c => c.typeMotif === code)) return { ok: false, motif: 'Des codes motif se rattachent à ce type : retirez-les ou désactivez le type.' }
    if (l.filter(y => y.code !== code && y.actif).length === 0) return { ok: false, motif: 'Au moins une entrée doit rester active.' }
    reglages.value[liste] = l.filter(y => y.code !== code)
    return { ok: true }
  }

  /* ── Date dépassée ── */
  const etatDepassementMode = (): ModeDateDepassee => reglages.value.modeDateDepassee
  function definirModeDateDepassee(m: ModeDateDepassee): Resultat {
    if (!LIB_MODE_DATE_DEPASSEE[m]) return { ok: false, motif: 'Choisissez alerter ou bloquer.' }
    reglages.value.modeDateDepassee = m; return { ok: true }
  }
  const jour = (iso?: string) => (iso ?? '').slice(0, 10)
  /** Une commande expire quand sa date de validité (à défaut sa date souhaitée) est passée sans qu'elle ait été livrée. */
  function estExpiree(c: Commande): boolean {
    if (c.statut === 'annulee' || c.statut === 'rejetee') return false
    const limite = jour(c.dateValidite || c.dateSouhaitee)
    if (!limite || limite >= aujourdhuiISO()) return false
    if (c.statut === 'en_attente') return true
    const v = c.voyageId ? useVoyagesStore().getById(c.voyageId) : undefined
    return !v || NON_DEMARREES.includes(v.statut)
  }
  /** Une tournée expire quand sa date prévue est passée sans qu'elle ait démarré. */
  function estTourneeExpiree(v: Voyage): boolean {
    /* Carburant : la tournée vaut jusqu'à sa date de validité. */
    const limite = jour(v.carburant?.dateValidite || v.datePlanifiee)
    return !!limite && limite < aujourdhuiISO() && NON_DEMARREES.includes(v.statut)
  }
  /** Ce qui s'applique à une commande ou une tournée dont la date est dépassée, selon le réglage. */
  function etatDepassement(objet: Commande | Voyage): EtatDepassement {
    const mode = etatDepassementMode()
    const tournee = 'etapes' in objet
    const expiree = tournee ? estTourneeExpiree(objet) : estExpiree(objet)
    if (!expiree) return { expiree, mode, bloque: false }
    const dateLimite = tournee ? jour(objet.carburant?.dateValidite || objet.datePlanifiee) : jour(objet.dateValidite || objet.dateSouhaitee)
    const quoi = tournee ? 'cette tournée' : 'cette commande'
    const date = new Date(`${dateLimite}T00:00:00`).toLocaleDateString('fr-FR')
    return mode === 'bloquer'
      ? { expiree, mode, bloque: true, dateLimite, motif: `Date dépassée depuis le ${date} : ${quoi} ne peut plus être chargée tant qu'elle n'est pas reprogrammée ou annulée.` }
      : { expiree, mode, bloque: false, dateLimite, motif: `Date dépassée depuis le ${date}.` }
  }
  /** Chargement possible au regard de la date : refusé seulement en mode blocage. */
  function peutCharger(objet: Commande | Voyage): Resultat {
    const e = etatDepassement(objet)
    return e.bloque ? { ok: false, motif: e.motif } : { ok: true }
  }

  /* ── Volume à 15 °C ── */
  const methodeVolume15 = (): MethodeVolume15 => METHODES_VOLUME15[reglages.value.methodeVolume15] ? reglages.value.methodeVolume15 : METHODE_VOLUME15_DEFAUT
  function definirMethodeVolume15(m: MethodeVolume15): Resultat {
    if (!METHODES_VOLUME15[m]) return { ok: false, motif: 'Choisissez la méthode de calcul du volume à 15 °C.' }
    reglages.value.methodeVolume15 = m; return { ok: true }
  }
  const produitCalcul = (produit?: string) => { const p = produits().resoudre(produit); return p ? { nom: p.nom, coefficientDilatation: p.coefficientDilatation } : undefined }
  /** Volume à 15 °C retenu pour une mesure : la valeur saisie fait foi, sinon le calcul de la méthode réglée. */
  const volume15Retenu = (m: MesureCompartiment, produit?: string) => completerVolume15(m, methodeVolume15(), produitCalcul(produit))
  /** Aperçu du calcul pendant la saisie : valeur calculée, raison de l'absence de calcul, ou null (méthode sans calcul, mesures incomplètes). */
  const apercuVolume15 = (volumeL: unknown, temperature: unknown, produit?: string) => calculerVolume15(methodeVolume15(), volumeL, temperature, produitCalcul(produit))

  function reinitialiser() { reglages.value = DEFAUT() }

  return { reglages, toleranceEntreprise, libelleUnite, ajouterTolerance, modifierTolerance, retirerTolerance, toleranceFor,
    modeDepassement, definirModeDepassement, controlerEcart,
    motifs, libelleMotif, ajouterEntree, modifierEntree, supprimerEntree,
    modeDateDepassee: etatDepassementMode, definirModeDateDepassee, methodeVolume15, definirMethodeVolume15, volume15Retenu, apercuVolume15, estExpiree, estTourneeExpiree, etatDepassement, peutCharger,
    reinitialiser }
})
