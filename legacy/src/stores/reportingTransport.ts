import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Commande, EtapeVoyage, StatutVoyage, Voyage } from '../types'
import { useVoyagesStore } from './voyages'
import { useCommandesStore } from './commandes'
import { useControlesTransportStore } from './controlesTransport'
import { useCarburantStore } from './carburant'
import { useMaintenanceStore } from './maintenance'
import { useSitesStore } from './sites'
import { useVehiculeStore } from './vehicules'
import { usePerimetresStore } from './perimetres'
import { useAuthStore } from './auth'
import { dansPeriode, type Periode } from './reporting'
import { heurePrevue, margeRetardMin, voyageEnRetard } from '../lib/horairesLivraison'
import { chargeOrdre, dansLaTournee, retourAControler } from '../utils/voyageUtils'

/**
 * Rapports du transport : activité, ponctualité et coûts, qualité de
 * livraison, utilisation des moyens et transporteurs externes. Tout est
 * calculé à partir des ordres de transport, des commandes, du carburant et
 * de la maintenance, jamais ressaisi. Une donnée absente donne une valeur
 * nulle (affichée « - »), jamais un chiffre par défaut.
 *
 * Les fonctions exportées hors du store sont des calculs purs, sans accès
 * aux autres stores : elles se testent seules.
 */

export interface FiltresTransport { periode: Periode; depot: string; region: string; client: string }
export type Granularite = 'jour' | 'semaine'

/* ══ Calculs purs ═════════════════════════════════════════════ */

/** Pourcentage arrondi au dixième ; nul quand la base est vide. */
export const taux = (n: number, base: number): number | null => base > 0 ? Math.round((n / base) * 1000) / 10 : null
/** Moyenne arrondie au dixième ; nulle sans valeur. */
export function moyenne(valeurs: (number | null | undefined)[]): number | null {
  const l = valeurs.filter((x): x is number => x != null && Number.isFinite(x))
  return l.length ? Math.round((l.reduce((s, x) => s + x, 0) / l.length) * 10) / 10 : null
}
/** Somme des valeurs connues ; nulle si aucune ne l'est. */
export function somme(valeurs: (number | null | undefined)[]): number | null {
  const l = valeurs.filter((x): x is number => x != null && Number.isFinite(x))
  return l.length ? l.reduce((s, x) => s + x, 0) : null
}

/** Ordres exécutés : partis au moins jusqu'au premier point. */
export const STATUTS_EXECUTES: StatutVoyage[] = ['en_cours', 'livre', 'cloture']
export const estExecute = (v: Voyage) => STATUTS_EXECUTES.includes(v.statut)

/** Lignes de livraison d'un ordre, hors celles sorties avant le départ
 *  (client indisponible, chargement non conforme, annulation demandée avant le départ). */
export function livraisonsDe(v: Voyage, client = ''): EtapeVoyage[] {
  return v.etapes.filter(e => e.role === 'livraison' && !e.indisponibleLe && !e.chargementNonConformeLe && !e.annuleeAvantDepart
    && (!client || e.destinataire === client))
}

/** Refus sur place : ligne annulée en cours de tournée, marchandise attendue au dépôt. */
export const estRefusee = (e: EtapeVoyage) => !!e.ligneAnnuleeLe && !e.annuleeAvantDepart && !!e.retourAttenduLe
/** Report : point reporté dans la tournée, ou report demandé par le client sur place. */
export const estReportee = (e: EtapeVoyage) => !!e.reporteLe || !!e.retourEntrepotLe
/** Livraison partielle : au moins un article déclaré non livré. */
export const estPartielle = (e: EtapeVoyage) => !!e.eBL?.articlesNonLivres?.length || (e.articles ?? []).some(a => a.statut === 'non_livre')
/** Livraison présentée : le conducteur est passé (arrivée, déclaration, refus ou report). */
export const estPresentee = (e: EtapeVoyage) => e.franchi || !!e.arriveeLe || estRefusee(e) || estReportee(e)

/** Arrivée réelle chez le destinataire : marquée par le conducteur, à défaut l'heure de sa déclaration. */
export function arriveeReelle(e: EtapeVoyage): Date | null {
  const iso = e.arriveeLe ?? (e.franchi ? e.livreParChauffeurLe : undefined)
  return iso ? new Date(iso) : null
}
/** Écart en minutes entre l'arrivée réelle et l'heure prévue, et verdict face à la marge. */
export function comparerHeures(prevue: Date | null, reelle: Date | null, margeMin: number): { ecartMin: number; alHeure: boolean } | null {
  if (!prevue || !reelle) return null
  const ecartMin = Math.round((reelle.getTime() - prevue.getTime()) / 60_000)
  return { ecartMin, alHeure: ecartMin <= margeMin }
}

/** Distance d'un ordre : relevés du compteur, à défaut distance de référence du trajet. */
export function distanceOrdre(v: Voyage): number | null {
  if (v.kmArrivee != null && v.kmDepart != null) return Math.max(0, v.kmArrivee - v.kmDepart)
  return v.kmReference > 0 ? v.kmReference : null
}

/** Taux de remplissage ; nul quand la capacité ou la charge est inconnue. */
export function remplissage(charge: number | null | undefined, capacite: number | null | undefined): number | null {
  if (!capacite || capacite <= 0 || charge == null || charge <= 0) return null
  return taux(charge, capacite)
}

/** Indicateurs de qualité d'un ensemble de livraisons. */
export function qualiteDe(lignes: EtapeVoyage[]) {
  const presentees = lignes.filter(estPresentee)
  const declarees = lignes.filter(e => e.franchi)
  const notes = lignes.map(e => e.satisfactionNote).filter((n): n is number => n != null)
  const nb = {
    presentees: presentees.length,
    declarees: declarees.length,
    confirmees: declarees.filter(e => !!e.receptionConfirmeeClientLe).length,
    partielles: declarees.filter(estPartielle).length,
    contestees: declarees.filter(e => !!e.receptionContesteeLe).length,
    contestationsTraitees: declarees.filter(e => !!e.receptionContesteeLe && !!e.contestationTraiteeLe).length,
    refusees: presentees.filter(estRefusee).length,
    reportees: presentees.filter(estReportee).length,
    retours: presentees.filter(retourAControler).length,
    reponsesSatisfaction: notes.length,
  }
  return {
    ...nb,
    tauxConfirmees: taux(nb.confirmees, nb.declarees),
    tauxPartielles: taux(nb.partielles, nb.declarees),
    tauxContestees: taux(nb.contestees, nb.declarees),
    tauxRefusees: taux(nb.refusees, nb.presentees),
    tauxReportees: taux(nb.reportees, nb.presentees),
    tauxRetours: taux(nb.retours, nb.presentees),
    noteSatisfaction: moyenne(notes),
  }
}

/** Écarts de quantité qualifiés en gain ou en coulage, et ceux encore à qualifier, unité par unité :
 *  le carburant en litres (à 15 °C), les autres marchandises dans leur unité ; jamais additionnés entre unités.
 *  uniteDe donne l'unité d'un écart qui ne la porte pas. */
export function ecartsQuantite(lignes: EtapeVoyage[], uniteDe: (e: EtapeVoyage) => string = () => '') {
  const avecEcart = lignes.filter(e => !!e.ecartQuantite)
  return [...grouper(avecEcart, e => e.ecartQuantite!.unite ?? uniteDe(e)).entries()].map(([unite, ls]) => {
    const ecarts = ls.map(e => e.ecartQuantite!)
    const de = (q?: 'gain' | 'coulage') => ecarts.filter(x => x.qualification === q)
    return {
      unite,
      gain: { nb: de('gain').length, quantite: de('gain').reduce((s, x) => s + x.ecart, 0) },
      coulage: { nb: de('coulage').length, quantite: de('coulage').reduce((s, x) => s + x.ecart, 0) },
      aQualifier: ecarts.filter(x => !x.qualification).length,
    }
  })
}

/** Clé et libellé d'un jour ou d'une semaine (commençant le lundi). */
export function cleTemps(iso: string, g: Granularite): { cle: string; lib: string } {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (g === 'jour') return { cle: iso.slice(0, 10), lib: d.toLocaleDateString('fr-FR') }
  const lundi = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  const cle = `${lundi.getFullYear()}-${String(lundi.getMonth() + 1).padStart(2, '0')}-${String(lundi.getDate()).padStart(2, '0')}`
  return { cle, lib: `semaine du ${lundi.toLocaleDateString('fr-FR')}` }
}

/** Regroupe des éléments sous une clé, dans l'ordre de première apparition. */
export function grouper<T>(liste: T[], cle: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>()
  liste.forEach(x => { const k = cle(x); m.set(k, [...(m.get(k) ?? []), x]) })
  return m
}

/* ══ Store ════════════════════════════════════════════════════ */

/** Libellé des moyens de l'entreprise, face aux transporteurs externes. */
export const NOS_MOYENS = 'Nos moyens'

export interface LignePonctualite { voyage: Voyage; etape: EtapeVoyage; prevue: Date | null; reelle: Date | null; ecartMin: number | null; alHeure: boolean | null }
export interface CoutOrdre { voyage: Voyage; distance: number | null; carburant: number | null; vehicule: number | null; facture: number | null; total: number | null }

export const useReportingTransportStore = defineStore('reportingTransport', () => {
  const voyagesStore = useVoyagesStore()
  const sites = useSitesStore()
  const vehicules = useVehiculeStore()

  /* ── Filtres : dépôt, région, client, comme le tableau de la planification ── */
  const depots = computed(() => sites.depots)
  const regions = computed(() => [...new Set(sites.actifs.map(s => s.region).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b, 'fr')))
  const clients = computed(() => [...new Set(voyagesStore.voyages.flatMap(v => v.etapes.map(e => e.destinataire)).filter((d): d is string => !!d))].sort((a, b) => a.localeCompare(b, 'fr')))

  /** Dépôt d'un ordre : dépôt de chargement d'une tournée de carburant, site de départ de sa tournée, sinon base du véhicule. */
  function depotDe(v: Voyage): string | undefined {
    if (v.carburant) return v.carburant.depotNom
    const depart = v.etapes.find(e => e.role === 'depart')
    if (depart) return depart.siteNom
    return v.vehiculeId ? vehicules.parId(v.vehiculeId)?.site : undefined
  }
  function regionsDe(v: Voyage): string[] {
    const noms = [depotDe(v), ...v.etapes.map(e => e.siteNom)]
    const ids = v.etapes.map(e => e.siteId)
    const out = sites.sites.filter(s => s.region && (ids.includes(s.id) || noms.includes(s.nom))).map(s => s.region!)
    /* Tournée de carburant : la région choisie pour la tournée. */
    if (v.carburant?.region) out.push(v.carburant.region)
    return out
  }
  /** Un utilisateur rattaché à des dépôts ou des régions ne voit que les ordres qui en dépendent. */
  function visible(v: Voyage): boolean {
    const p = usePerimetresStore(); const id = useAuthStore().user?.id
    return p.voitExpedition(id, v) || p.voitLieu(id, { nom: depotDe(v) })
  }

  /** Commande à livrer dans le périmètre de l'utilisateur : son dépôt de chargement, son site, son adresse ou sa région. Sans rattachement, tout. */
  function commandeVisible(c: Commande): boolean {
    const p = usePerimetresStore(); const id = useAuthStore().user?.id
    if (p.perimetreVisible(id).tout) return true
    const site = c.siteId ? sites.getById(c.siteId) : undefined
    return (!!c.depotId && p.voitLieu(id, { siteId: c.depotId }))
      || p.voitLieu(id, { siteId: c.siteId, nom: c.adresseLivraison, region: c.region ?? site?.region })
      || sites.sitesDuClient(c.destinataire).some(s => p.voitLieu(id, { siteId: s.id }))
  }

  /** Ordres de la période (date prévue) qui passent les filtres. Un ordre
   *  encore ouvert prévu après la fin de la période compte aussi : c'est
   *  l'activité en cours, celle que montre le tableau de la planification. */
  const OUVERTS = ['en_attente', 'planifie', 'confirme', 'pret', 'en_cours']
  const dansLaPeriode = (v: Voyage, f: FiltresTransport) =>
    dansPeriode(v.datePlanifiee, f.periode) || (OUVERTS.includes(v.statut) && (v.datePlanifiee ?? '').slice(0, 10) > f.periode.au)
  function ordres(f: FiltresTransport): Voyage[] {
    return voyagesStore.voyages.filter(v => visible(v) && dansLaPeriode(v, f)
      && (!f.depot || depotDe(v) === f.depot)
      && (!f.region || regionsDe(v).includes(f.region))
      && (!f.client || v.etapes.some(e => e.destinataire === f.client)))
  }
  const executes = (f: FiltresTransport) => ordres(f).filter(estExecute)

  /* ── Activité ── */
  function activite(f: FiltresTransport) {
    const liste = ordres(f)
    const controles = useControlesTransportStore()
    const parStatut = (Object.keys({ en_attente: 1, planifie: 1, confirme: 1, pret: 1, en_cours: 1, livre: 1, cloture: 1, annule: 1 }) as StatutVoyage[])
      .map(s => ({ statut: s, nb: liste.filter(v => v.statut === s).length }))
    const enRetard = liste.filter(voyageEnRetard)
    const enAlerte = liste.filter(v => controles.etatDepassement(v).expiree)
    /* Commandes à livrer qui attendent un ordre : elles n'ont pas encore de dépôt de départ. */
    /* Une commande dont une part est déjà dans un ordre et le reste en attente ne compte qu'une fois, par son reste. */
    const commandes = useCommandesStore().enAttente.filter(c => commandeVisible(c) && dansPeriode(c.dateSouhaitee, f.periode)
      && (!f.client || c.destinataire === f.client)
      && (!f.region || (c.region ?? (c.siteId ? sites.getById(c.siteId)?.region : undefined)) === f.region)
      /* Une commande de carburant porte déjà son dépôt de chargement. */
      && (!f.depot || !c.depotId || sites.getById(c.depotId)?.nom === f.depot))
    return { total: liste.length, parStatut, enRetard, enAlerte, commandes }
  }

  /* ── Ponctualité ── */
  function ponctualite(f: FiltresTransport): LignePonctualite[] {
    const marge = margeRetardMin()
    return executes(f).flatMap(v => livraisonsDe(v, f.client).map(e => {
      const prevue = heurePrevue(v, e); const reelle = arriveeReelle(e)
      const c = comparerHeures(prevue, reelle, marge)
      return { voyage: v, etape: e, prevue, reelle, ecartMin: c?.ecartMin ?? null, alHeure: c?.alHeure ?? null }
    }))
  }
  /** Agrégat de ponctualité : livraisons arrivées comparables, à l'heure, taux. */
  function syntheseHeures(lignes: LignePonctualite[]) {
    const comparees = lignes.filter(l => l.alHeure != null)
    const alHeure = comparees.filter(l => l.alHeure).length
    return { arrivees: comparees.length, alHeure, enRetard: comparees.length - alHeure, taux: taux(alHeure, comparees.length),
      retardMoyen: moyenne(comparees.filter(l => !l.alHeure).map(l => l.ecartMin)) }
  }
  const transporteurDe = (v: Voyage) => v.moyen === 'externe' ? (v.transporteurNom ?? 'Transporteur externe') : NOS_MOYENS

  /* ── Coûts ── */
  function coutDe(v: Voyage): CoutOrdre {
    const distance = distanceOrdre(v)
    if (v.moyen === 'externe') {
      const f = v.factureTransporteur
      const facture = f && f.statut !== 'refusee' ? f.montantFacture : null
      return { voyage: v, distance, carburant: null, vehicule: null, facture, total: facture }
    }
    const pleins = useCarburantStore().recharges.filter(r => r.voyageId === v.id)
    const carburant = pleins.length ? pleins.reduce((s, r) => s + (r.montant || 0), 0) : null
    const coutKm = v.vehiculeId ? useMaintenanceStore().coutParKmObserve(v.vehiculeId) : null
    const vehicule = coutKm != null && distance != null ? Math.round(coutKm * distance) : null
    return { voyage: v, distance, carburant, vehicule, facture: null, total: carburant != null && vehicule != null ? carburant + vehicule : null }
  }
  const couts = (f: FiltresTransport) => executes(f).map(coutDe)

  /* ── Qualité ── */
  function qualite(f: FiltresTransport) {
    const liste = executes(f)
    const lignes = liste.flatMap(v => livraisonsDe(v, f.client))
    /* Enquêtes des ordonnateurs, rattachées aux commandes livrées par ces ordres. */
    const cmd = useCommandesStore()
    /* Une commande répartie en plusieurs livraisons n'a qu'une enquête, portée par sa commande d'origine : comptée une fois. */
    const origines = [...new Set(lignes.map(e => { const c = e.commandeId ? cmd.getById(e.commandeId) : undefined; return c ? cmd.racine(c) : undefined }).filter((x): x is string => !!x))]
    const enquetes = origines.map(id => cmd.getById(id)?.enqueteOrdonnateur).filter((x): x is NonNullable<typeof x> => !!x)
    return {
      ...qualiteDe(lignes),
      reponsesOrdonnateur: enquetes.length,
      noteOrdonnateur: moyenne(enquetes.map(q => (q.respectOrdre + q.delais + q.qualite) / 3)),
      ecarts: ecartsQuantite(lignes, e => { const v = liste.find(x => x.etapes.includes(e)); return v ? voyagesStore.uniteQuantite(v, e) : '' }),
      lignes,
    }
  }

  /* ── Moyens ── */
  function moyenDe(v: Voyage) {
    const cap = voyagesStore.capaciteOrdre(v)
    const charge = chargeOrdre(v)
    /* Poids des lignes ; pour un ordre sans lignes pesées, le poids chargé enregistré sur l'ordre. */
    const poids = charge.poidsKg || v.marchandise.poidsChargeKg || 0
    return {
      voyage: v,
      poidsKg: poids || null, capaciteKg: cap.kg ?? null, remplissagePoids: remplissage(poids, cap.kg),
      volumeM3: charge.volumeM3 || null, capaciteM3: cap.m3 ?? null, remplissageVolume: remplissage(charge.volumeM3, cap.m3),
      livraisons: v.etapes.filter(e => e.role === 'livraison' && dansLaTournee(e)).length,
      distance: distanceOrdre(v),
    }
  }
  const moyens = (f: FiltresTransport) => executes(f).map(moyenDe)

  /* ── Transporteurs externes ── */
  function ecartFacture(v: Voyage): number | null {
    const f = v.factureTransporteur
    if (!f) return null
    const attendu = voyagesStore.montantAttenduTransporteur(v)
    return attendu ? f.montantFacture - attendu.montant : null
  }
  function transporteurs(f: FiltresTransport) {
    const liste = executes(f).filter(v => v.moyen === 'externe')
    const heures = ponctualite(f)
    return [...grouper(liste, transporteurDe).entries()].map(([nom, vs]) => {
      const ids = new Set(vs.map(v => v.id))
      const lignes = vs.flatMap(v => livraisonsDe(v, f.client))
      const q = qualiteDe(lignes)
      const ecarts = vs.map(ecartFacture)
      return {
        nom, ordres: vs.length,
        ponctualite: syntheseHeures(heures.filter(l => ids.has(l.voyage.id))).taux,
        confirmees: q.tauxConfirmees, contestees: q.tauxContestees, refusees: q.tauxRefusees,
        factures: vs.filter(v => !!v.factureTransporteur).length,
        facturesEnEcart: ecarts.filter(x => x != null && x !== 0).length,
        /* Facture reçue sans grille tarifaire applicable : rien à comparer, comptée à part. */
        facturesSansTarif: vs.filter(v => !!v.factureTransporteur && !voyagesStore.montantAttenduTransporteur(v)).length,
        ecartMoyen: moyenne(ecarts),
      }
    }).sort((a, b) => b.ordres - a.ordres)
  }

  return { depots, regions, clients, depotDe, commandeVisible, regionsDe, ordres, executes, activite, ponctualite, syntheseHeures, transporteurDe,
    coutDe, couts, qualite, moyenDe, moyens, ecartFacture, transporteurs }
})
