import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { BonEnlevement, CamionTournee, Commande, CompartimentPlan, EtapeVoyage, IncidentBon, MesureCompartiment, Voyage } from '../types'
import { useVoyagesStore } from './voyages'
import { useCommandesStore } from './commandes'
import { useVehiculeStore } from './vehicules'
import { useTypesVehiculesStore } from './typesVehicules'
import { usePersonnelStore } from './personnel'
import { useDocumentsStore } from './documentsPersonnel'
import { useDocumentsVehiculeStore } from './documentsVehicule'
import { useSitesStore } from './sites'
import { useProduitsStore } from './produits'
import { useContraintesLivraisonStore } from './contraintesLivraison'
import { useControlesTransportStore } from './controlesTransport'
import { useParametresPlanificationStore } from './parametresPlanification'
import { useParametresStore } from './parametres'
import { useAuthStore } from './auth'
import { aujourdhuiISO, maintenant, maintenantMs } from '../utils/horloge'
import { dansLaTournee } from '../utils/voyageUtils'
import { proposerPlanCompartiments, distanceKm } from '../lib/propositionChargement'
import { controlerMesuresSaisies, fmtL, mesuresSaisies, totalA15, totalVolume } from '../lib/volume15'

/**
 * Livraison de carburant (TMS, planification) : une tournée de carburant est
 * un ordre de transport dont les commandes sont des produits carburant. Elle
 * se compose avec un dépôt de chargement, une date, une date de validité, une
 * région, ses commandes et ses camions (véhicule motorisé et citerne à
 * compartiments). La proposition remplit les compartiments, le responsable
 * corrige compartiment par compartiment ; la validation fige le plan et
 * produit les bons (un bon d'enlèvement par camion, un bon de livraison par
 * client), chaque camion devenant un ordre de transport planifié. Un imprévu
 * se traite ensuite sur le bon : changement de camion ou de dépôt, annulation
 * par un incident, déviation vers un autre client.
 */
export interface Resultat { ok: boolean; motif?: string }
export interface SaisieTournee {
  depotId: string
  datePlanifiee: string
  dateValidite: string
  region: string
  commandeIds: string[]
  camions: { vehiculeId: string; citerneId: string }[]
  confirmationRequise: boolean
}
export interface SaisieIncident { typeIncident: string; typeMotif: string; codeMotif: string; commentaire?: string }
export type StatutBonEnlevement = 'emis' | 'confirme' | 'annule'
export const LIB_STATUT_BON: Record<StatutBonEnlevement, string> = { emis: 'Émis', confirme: 'Confirmé', annule: 'Annulé' }
export const LIB_STATUT_BL: Record<'emis' | 'annule' | 'devie', string> = { emis: 'Émis', annule: 'Annulé', devie: 'Clos par déviation' }
/** État réel d'un bon de livraison : émis, livré, signé par le client, annulé ou clos par déviation. */
export function etatBonLivraison(e: EtapeVoyage): { libelle: string; ton: 'info' | 'succes' | 'attente' | 'danger' } {
  const s = e.bonLivraison?.statut
  if (s === 'annule') return { libelle: 'Annulé', ton: 'danger' }
  if (s === 'devie') return { libelle: 'Clos par déviation', ton: 'danger' }
  if (e.receptionConfirmeeClientLe) return { libelle: 'Signé par le client', ton: 'succes' }
  if (e.franchi) return { libelle: 'Livré', ton: 'attente' }
  return { libelle: 'Émis', ton: 'info' }
}
/** Type de motif réservé à la déviation : il ne sert pas à une annulation. */
export const TYPE_MOTIF_DEVIATION = 'DEVIATION'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const jourFr = (iso: string) => new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('fr-FR')

export const useLivraisonCarburantStore = defineStore('livraisonCarburant', () => {
  const voyagesStore = () => useVoyagesStore()
  const commandesStore = () => useCommandesStore()
  const vehicules = () => useVehiculeStore()
  const contraintes = () => useContraintesLivraisonStore()
  const auth = () => useAuthStore()
  const par = () => auth().user?.nom ?? ''
  const maintenantIso = () => maintenant().toISOString()

  const habilite = () => useParametresPlanificationStore().peutPiloter(auth().role)
  const MOTIF_NON_HABILITE = "Votre rôle n'est pas habilité à composer, valider ou modifier une tournée de carburant."
  /** Le dépôt confirme lui-même l'enlèvement quand il dispose d'un accès : rôles qui déclarent le chargement. */
  const peutConfirmerEnlevement = () => useParametresPlanificationStore().peutDeclarerChargement(auth().role)

  /* ── Référentiels ── */
  const produit = (nom?: string) => useProduitsStore().resoudre(nom)
  const depots = computed(() => useSitesStore().actifs.filter(s => /d[ée]p[ôo]t/i.test(s.type)))
  const regions = computed(() => [...new Set(useSitesStore().actifs.map(s => s.region).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b, 'fr')))
  /** Région d'une commande : celle de la commande, sinon celle de son site, sinon celle du site le plus proche du lieu de livraison. */
  function regionCommande(c: Commande): string | undefined {
    if (c.region) return c.region
    const sites = useSitesStore()
    const site = c.siteId ? sites.getById(c.siteId) : undefined
    if (site?.region) return site.region
    const proche = sites.actifs.filter(x => x.region).sort((a, b) => distanceKm(c, a) - distanceKm(c, b))[0]
    return proche?.region
  }
  /** Commandes de carburant à planifier : livrées par camion, en attente d'une tournée. */
  const commandesAPlanifier = computed(() => commandesStore().carburantAPlanifier)
  const pompeExigee = (c: { pompeExigee?: boolean; destinataire?: string; siteId?: string }) =>
    !!c.pompeExigee || contraintes().contraintesPour(c.destinataire, c.siteId).some(x => x.pompeExigee)

  /* ── Camions : un véhicule motorisé et une citerne à compartiments ── */
  const typesVeh = () => useTypesVehiculesStore()
  const estCiterne = (id: string) => { const v = vehicules().parId(id); return !!v && typesVeh().aCompartiments(v.type) && !!v.compartiments?.length }
  const camionPompe = (vehiculeId: string, citerneId: string) => vehicules().aPompe(vehiculeId) || vehicules().aPompe(citerneId)
  function conducteurDe(vehiculeId: string): { id: string; nom: string } | null {
    const id = vehicules().affectationActive(vehiculeId)?.conducteurId
    return id ? { id, nom: usePersonnelStore().parId(id)?.nomComplet ?? id } : null
  }
  /** Permis de conduire du conducteur : numéro, catégorie et validité, repris de son dossier. */
  function permisDe(personnelId?: string) {
    if (!personnelId) return null
    const d = useDocumentsStore().parPersonnel(personnelId).filter(x => x.type === 'permis' && !x.archive).sort((a, b) => (b.dateDelivrance ?? '').localeCompare(a.dateDelivrance ?? ''))[0]
    return d ? { reference: d.reference ?? '', categorie: (d as { categorie?: string }).categorie ?? '', expiration: d.dateExpiration } : null
  }
  /** Transporteur : l'entreprise elle-même, avec ses propres moyens. */
  const transporteur = () => useParametresStore().societe.raisonSociale
  const capaciteCiterne = (citerneId: string) => (vehicules().parId(citerneId)?.compartiments ?? []).reduce((s, c) => s + c.volumeL, 0)

  /** Véhicules motorisés proposables : en état, en règle, non engagés, avec un conducteur affecté. */
  function tracteursDisponibles(ignorerVoyageId?: string) {
    const docs = useDocumentsVehiculeStore()
    return vehicules().tracteurs.filter(t => vehicules().estUtilisable(t) && docs.enRegle(t.id) && !voyagesStore().vehiculeOccupe(t.id, ignorerVoyageId))
  }
  /** Citernes proposables : en état, en règle, non engagées, libres de tout attelage à un autre tracteur. */
  function citernesDisponibles(ignorerVoyageId?: string, pourVehiculeId?: string) {
    const docs = useDocumentsVehiculeStore()
    return vehicules().semiRemorques.filter(c => estCiterne(c.id) && vehicules().estUtilisable(c) && docs.enRegle(c.id)
      && !voyagesStore().remorqueOccupee(c.id, ignorerVoyageId)
      && (!vehicules().attelageDe(c.id) || vehicules().attelageDe(c.id)!.tracteurId === pourVehiculeId))
  }
  /** Contrôle d'un camion pour une tournée : véhicule, citerne et conducteur. */
  function controlerCamion(vehiculeId: string, citerneId: string, dateISO: string, ignorerVoyageId?: string): Resultat & { camion?: CamionTournee } {
    const veh = vehicules().parId(vehiculeId), cit = vehicules().parId(citerneId)
    if (!veh) return { ok: false, motif: 'Choisissez le camion.' }
    if (!cit) return { ok: false, motif: 'Choisissez la citerne.' }
    if (!estCiterne(cit.id)) return { ok: false, motif: `${cit.immatriculation} n'a pas de compartiments.` }
    const docs = useDocumentsVehiculeStore()
    if (!vehicules().estUtilisable(veh)) return { ok: false, motif: `${veh.immatriculation} n'est pas en état de rouler.` }
    if (!docs.enRegle(veh.id)) return { ok: false, motif: `${veh.immatriculation} n'est pas en règle : une pièce administrative est expirée ou manquante.` }
    if (!vehicules().estUtilisable(cit)) return { ok: false, motif: `${cit.immatriculation} n'est pas en état de rouler.` }
    if (!docs.enRegle(cit.id)) return { ok: false, motif: `${cit.immatriculation} n'est pas en règle : une pièce administrative est expirée ou manquante.` }
    const occupe = voyagesStore().vehiculeOccupe(veh.id, ignorerVoyageId)
    if (occupe) return { ok: false, motif: `${veh.immatriculation} est déjà engagé sur l'ordre ${occupe.numeroOT || occupe.reference}.` }
    const occupee = voyagesStore().remorqueOccupee(cit.id, ignorerVoyageId)
    if (occupee) return { ok: false, motif: `${cit.immatriculation} est déjà engagée sur l'ordre ${occupee.numeroOT || occupee.reference}.` }
    const at = vehicules().attelageDe(cit.id)
    if (at && at.tracteurId !== veh.id) return { ok: false, motif: `${cit.immatriculation} est attelée à un autre tracteur.` }
    const cond = conducteurDe(veh.id)
    if (!cond) return { ok: false, motif: `${veh.immatriculation} n'a aucun conducteur affecté : affectez-lui un conducteur dans la Flotte.` }
    const indispo = voyagesStore().chauffeurIndisponible(cond.id, dateISO, ignorerVoyageId)
    if (indispo) return { ok: false, motif: `${cond.nom}, conducteur de ${veh.immatriculation}, n'est pas disponible (${indispo}).` }
    if (!useDocumentsStore().enRegle(cond.id)) return { ok: false, motif: `${cond.nom}, conducteur de ${veh.immatriculation}, n'est pas en règle : une pièce obligatoire est expirée ou manquante.` }
    return { ok: true, camion: { vehiculeId: veh.id, plaque: veh.immatriculation, citerneId: cit.id, citernePlaque: cit.immatriculation, chauffeurId: cond.id, chauffeurNom: cond.nom } }
  }

  /* ── Vérification de la répartition (volumes, compatibilité, pompe) ── */
  function verifier(commandes: Commande[], camions: { vehiculeId: string; citerneId: string }[]) {
    const volumeTotal = commandes.reduce((s, c) => s + (c.volumeL ?? 0), 0)
    const capaciteTotale = camions.reduce((s, c) => s + capaciteCiterne(c.citerneId), 0)
    const motifs: string[] = []
    if (camions.length && volumeTotal > capaciteTotale) motifs.push(`Volume à livrer (${fmtL(volumeTotal)}) supérieur à la capacité des camions (${fmtL(capaciteTotale)}).`)
    const prods = [...new Set(commandes.map(c => c.produit ?? c.contenu))]
    if (camions.length < 2) for (let i = 0; i < prods.length; i++) for (let j = i + 1; j < prods.length; j++) {
      const r = contraintes().compatibles(prods[i]!, prods[j]!)
      if (!r.ok) motifs.push(`Produit incompatible : ${r.motif}`)
    }
    if (camions.length) {
      for (const c of commandes.filter(pompeExigee)) if (!camions.some(x => camionPompe(x.vehiculeId, x.citerneId))) motifs.push(`Commande à pompe sans camion à pompe : la livraison à ${c.destinataire} exige un camion équipé d'une pompe.`)
      /* Un produit que la succession sans nettoyage interdit dans tous les compartiments libres. */
      for (const p of prods) {
        const possible = camions.some(x => (vehicules().parId(x.citerneId)?.compartiments ?? []).some(k => contraintes().successionAutorisee(k.produit, p).ok))
        if (!possible) motifs.push(`Produit incompatible : aucun compartiment ne peut recevoir ${p} sans nettoyage.`)
      }
    }
    return { volumeTotal, capaciteTotale, motifs, repartissable: !!commandes.length && !!camions.length && !motifs.length }
  }
  function verification(v: Voyage) {
    const t = v.carburant
    if (!t) return { volumeTotal: 0, capaciteTotale: 0, motifs: [], repartissable: false }
    return verifier(t.commandeIds.map(id => commandesStore().getById(id)).filter((c): c is Commande => !!c), t.camions)
  }

  /* ── Création de la tournée ── */
  const planVide = (camions: CamionTournee[]): CompartimentPlan[] => camions.flatMap(c =>
    (vehicules().parId(c.citerneId)?.compartiments ?? []).map(k => ({ vehiculeId: c.vehiculeId, citerneId: c.citerneId, numero: k.numero, capaciteL: k.volumeL })))
  function ligneDeCommande(c: Commande, idBase: string, ordre: number): EtapeVoyage {
    return {
      id: `${idBase}-${ordre}`, ordre, siteId: c.siteId, siteNom: c.adresseLivraison, destinataire: c.destinataire, adresseLivraison: c.adresseLivraison,
      lat: c.lat, lng: c.lng, role: 'livraison', intervalleMin: 0, franchi: false, poidsKg: c.poidsKg, canalNotification: c.canalNotification,
      commandeId: c.id, referenceExterne: c.referenceExterne, produit: c.produit, nombreUnites: c.volumeL, pompeExigee: pompeExigee(c) || undefined,
      contenuCommande: `${c.produit ?? c.contenu}, ${fmtL(c.volumeL)}`,
    }
  }
  function prochaineReference(prefixe: string, existants: string[]) {
    const annee = aujourdhuiISO().slice(0, 4)
    const max = existants.filter(x => x.startsWith(`${prefixe}-${annee}-`)).reduce((m, x) => Math.max(m, Number(x.split('-').pop()) || 0), 0)
    return `${prefixe}-${annee}-${String(max + 1).padStart(prefixe === 'TC' ? 3 : 4, '0')}`
  }
  const tousLesVoyages = () => voyagesStore().voyages

  function creerTournee(s: SaisieTournee): Resultat & { id?: string } {
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    const depot = useSitesStore().getById(s.depotId)
    if (!depot || !depots.value.some(d => d.id === depot.id)) return { ok: false, motif: 'Choisissez le dépôt de chargement.' }
    if (!s.datePlanifiee) return { ok: false, motif: 'Indiquez la date prévue.' }
    if (s.datePlanifiee.slice(0, 10) < aujourdhuiISO()) return { ok: false, motif: 'La date prévue est déjà passée.' }
    if (!s.dateValidite) return { ok: false, motif: 'Indiquez la date de validité.' }
    if (s.dateValidite < s.datePlanifiee.slice(0, 10)) return { ok: false, motif: 'La date de validité ne peut pas précéder la date prévue.' }
    if (!s.region) return { ok: false, motif: 'Choisissez la région.' }
    if (!s.commandeIds.length) return { ok: false, motif: 'Choisissez au moins une commande à livrer.' }
    if (!s.camions.length) return { ok: false, motif: 'Ajoutez au moins un camion.' }
    const cmds: Commande[] = []
    for (const id of s.commandeIds) {
      const c = commandesStore().getById(id)
      if (!c || !commandesAPlanifier.value.some(x => x.id === id)) return { ok: false, motif: `La commande ${c?.referenceExterne ?? id} n'est plus à planifier : elle a été prise ou retirée entre-temps.` }
      if (c.depotId && c.depotId !== depot.id) return { ok: false, motif: `La commande de ${c.destinataire} se charge à un autre dépôt.` }
      const region = regionCommande(c)
      if (region && region !== s.region) return { ok: false, motif: `La commande de ${c.destinataire} se livre en région ${region}, pas en région ${s.region}.` }
      cmds.push(c)
    }
    const camions: CamionTournee[] = []
    for (const x of s.camions) {
      if (camions.some(c => c.vehiculeId === x.vehiculeId)) return { ok: false, motif: 'Un même camion est choisi deux fois.' }
      if (camions.some(c => c.citerneId === x.citerneId)) return { ok: false, motif: 'Une même citerne est choisie deux fois.' }
      const r = controlerCamion(x.vehiculeId, x.citerneId, s.datePlanifiee)
      if (!r.ok) return r
      if (camions.some(c => c.chauffeurId === r.camion!.chauffeurId)) return { ok: false, motif: `${r.camion!.chauffeurNom} conduit déjà un autre camion de la tournée.` }
      camions.push(r.camion!)
    }
    const premier = camions[0]!
    const base = `TC-${maintenantMs()}`
    const lignes = cmds.map((c, i) => ligneDeCommande(c, base, i + 1))
    const id = voyagesStore().creer({
      statut: 'en_attente', clientNom: voyagesStore().resumeDestinataires(lignes), toleranceEcartPoidsPourcent: voyagesStore().tolerancePoids(undefined, cmds[0]?.produit),
      origine: depot.nom, destination: lignes[lignes.length - 1]?.siteNom ?? '-',
      vehiculeId: premier.vehiculeId, vehiculePlaque: premier.plaque, semiRemorqueId: premier.citerneId, semiRemorquePlaque: premier.citernePlaque,
      chauffeurId: premier.chauffeurId, chauffeurNom: premier.chauffeurNom,
      datePlanifiee: s.datePlanifiee, kmReference: 0, confirmationRequise: s.confirmationRequise, moyen: 'propres', modeTransport: 'Camion',
      marchandise: { typeProduit: 'Carburant', nombreCartons: 0, poidsChargeKg: cmds.reduce((t, c) => t + c.poidsKg, 0) },
      carburant: {
        reference: prochaineReference('TC', tousLesVoyages().map(v => v.carburant?.reference ?? '')),
        depotId: depot.id, depotNom: depot.nom, dateValidite: s.dateValidite, region: s.region,
        camions, commandeIds: cmds.map(c => c.id), plan: planVide(camions),
      },
      etapesPersonnalisees: lignes,
    })
    commandesStore().affecter(cmds.map(c => c.id), id)
    return { ok: true, id }
  }

  /* ── Plan de chargement ── */
  const tournee = (id: string) => { const v = voyagesStore().getById(id); return v?.carburant ? { v, t: v.carburant } : null }
  function modifiablePlan(id: string): Resultat & { v?: Voyage } {
    const x = tournee(id)
    if (!x) return { ok: false, motif: 'Tournée introuvable.' }
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (x.t.valideeLe || x.v.statut !== 'en_attente') return { ok: false, motif: 'La tournée est validée : le plan de chargement est figé. Passez par les opérations sur les bons.' }
    return { ok: true, v: x.v }
  }
  /** Volumes qui restent à charger, par produit. */
  function restants(v: Voyage): { produit: string; volumeL: number }[] {
    const t = v.carburant
    if (!t) return []
    const parProduit = new Map<string, number>()
    t.commandeIds.forEach(id => {
      const c = commandesStore().getById(id)
      if (!c) return
      const affecte = t.plan.filter(x => x.commandeId === id).reduce((s, x) => s + (x.volumeL ?? 0), 0)
      const reste = (c.volumeL ?? 0) - affecte
      if (reste > 0) parProduit.set(c.produit ?? c.contenu, (parProduit.get(c.produit ?? c.contenu) ?? 0) + reste)
    })
    return [...parProduit.entries()].map(([produit, volumeL]) => ({ produit, volumeL }))
  }
  const precedentDe = (citerneId: string, numero: number) => vehicules().parId(citerneId)?.compartiments?.find(k => k.numero === numero)?.produit

  function proposer(id: string): Resultat & { nonPlacees?: string[] } {
    const m = modifiablePlan(id); if (!m.ok) return m
    const t = m.v!.carburant!
    const cmds = t.commandeIds.map(x => commandesStore().getById(x)).filter((c): c is Commande => !!c)
    const p = proposerPlanCompartiments(
      cmds.map(c => ({ id: c.id, client: c.destinataire, produit: c.produit ?? c.contenu, volumeL: c.volumeL ?? 0, pompeExigee: pompeExigee(c) })),
      t.camions.map(c => ({ id: c.vehiculeId, libelle: c.plaque, pompe: camionPompe(c.vehiculeId, c.citerneId),
        compartiments: t.plan.filter(x => x.vehiculeId === c.vehiculeId).map(x => ({ numero: x.numero, capaciteL: x.capaciteL, precedent: precedentDe(x.citerneId, x.numero) })) })),
      { ensemble: (a, b) => contraintes().compatibles(a, b).ok, succession: (a, b) => contraintes().successionAutorisee(a, b).ok },
    )
    t.plan.forEach(x => { x.produit = undefined; x.volumeL = undefined; x.commandeId = undefined; x.client = undefined })
    p.affectations.forEach(a => {
      const x = t.plan.find(y => y.vehiculeId === a.camionId && y.numero === a.numero)
      if (x) Object.assign(x, { produit: a.produit, volumeL: a.volumeL, commandeId: a.commandeId, client: a.client })
    })
    return { ok: true, nonPlacees: p.nonPlacees.map(n => `${n.commande.client} : ${n.raison}`) }
  }
  function effacer(id: string): Resultat {
    const m = modifiablePlan(id); if (!m.ok) return m
    m.v!.carburant!.plan.forEach(x => { x.produit = undefined; x.volumeL = undefined; x.commandeId = undefined; x.client = undefined })
    return { ok: true }
  }
  /** Correction d'un compartiment : produit, volume et client, contrôlés face à la capacité et aux règles. */
  function corriger(id: string, vehiculeId: string, numero: number, s: { produit?: string; volumeL?: number | null; commandeId?: string }): Resultat {
    const m = modifiablePlan(id); if (!m.ok) return m
    const t = m.v!.carburant!
    const x = t.plan.find(y => y.vehiculeId === vehiculeId && y.numero === numero)
    if (!x) return { ok: false, motif: 'Compartiment introuvable.' }
    const camion = t.camions.find(c => c.vehiculeId === vehiculeId)!
    const vide = !s.produit && !s.commandeId && (s.volumeL == null || (s.volumeL as unknown) === '')
    if (vide) { Object.assign(x, { produit: undefined, volumeL: undefined, commandeId: undefined, client: undefined }); return { ok: true } }
    if (!s.produit) return { ok: false, motif: `Compartiment ${numero} : choisissez le produit.` }
    if (!s.commandeId) return { ok: false, motif: `Compartiment ${numero} : choisissez le client.` }
    const c = commandesStore().getById(s.commandeId)
    if (!c || !t.commandeIds.includes(c.id)) return { ok: false, motif: 'Ce client ne fait pas partie de la tournée.' }
    if ((c.produit ?? c.contenu) !== s.produit) return { ok: false, motif: `${c.destinataire} a commandé ${c.produit ?? c.contenu}, pas ${s.produit}.` }
    const vol = Number(s.volumeL)
    if (s.volumeL == null || (s.volumeL as unknown) === '' || !Number.isFinite(vol)) return { ok: false, motif: `Compartiment ${numero} : indiquez le volume.` }
    if (vol <= 0) return { ok: false, motif: `Compartiment ${numero} : le volume doit être positif.` }
    if (vol > x.capaciteL) return { ok: false, motif: `Capacité dépassée : le compartiment ${numero} de ${camion.citernePlaque} contient au plus ${fmtL(x.capaciteL)}.` }
    const succ = contraintes().successionAutorisee(precedentDe(x.citerneId, numero), s.produit)
    if (!succ.ok) return { ok: false, motif: `Compatibilité des produits : ${succ.motif}` }
    for (const autre of t.plan.filter(y => y.vehiculeId === vehiculeId && y.numero !== numero && y.produit && y.produit !== s.produit)) {
      const r = contraintes().compatibles(autre.produit!, s.produit)
      if (!r.ok) return { ok: false, motif: `Compatibilité des produits : ${r.motif}` }
    }
    if (pompeExigee(c) && !camionPompe(camion.vehiculeId, camion.citerneId)) return { ok: false, motif: `Pompe exigée : la livraison à ${c.destinataire} exige un camion équipé d'une pompe, ${camion.plaque} et ${camion.citernePlaque} n'en ont pas.` }
    const dejaPrevu = t.plan.filter(y => y.commandeId === c.id && !(y.vehiculeId === vehiculeId && y.numero === numero)).reduce((tot, y) => tot + (y.volumeL ?? 0), 0)
    if (dejaPrevu + vol > (c.volumeL ?? 0)) return { ok: false, motif: `La commande de ${c.destinataire} porte sur ${fmtL(c.volumeL)} : ${fmtL(dejaPrevu + vol)} dépasseraient la quantité commandée.` }
    Object.assign(x, { produit: s.produit, volumeL: vol, commandeId: c.id, client: c.destinataire })
    return { ok: true }
  }
  /** Reprogrammation d'une tournée en attente : nouvelle date prévue et nouvelle date de validité. */
  function reprogrammer(id: string, datePlanifiee: string, dateValidite: string): Resultat {
    const m = modifiablePlan(id); if (!m.ok) return m
    const v = m.v!, t = v.carburant!
    if (!datePlanifiee) return { ok: false, motif: 'Indiquez la date prévue.' }
    if (datePlanifiee.slice(0, 10) < aujourdhuiISO()) return { ok: false, motif: 'La date prévue est déjà passée.' }
    if (!dateValidite) return { ok: false, motif: 'Indiquez la date de validité.' }
    if (dateValidite < datePlanifiee.slice(0, 10)) return { ok: false, motif: 'La date de validité ne peut pas précéder la date prévue.' }
    if (datePlanifiee === v.datePlanifiee.slice(0, 16) && dateValidite === t.dateValidite) return { ok: false, motif: 'Les dates sont inchangées.' }
    /* Chaque conducteur doit être disponible à la nouvelle date. */
    for (const c of t.camions) {
      const r = controlerCamion(c.vehiculeId, c.citerneId, datePlanifiee, v.id)
      if (!r.ok) return r
    }
    v.datePlanifiee = datePlanifiee.length === 16 ? `${datePlanifiee}:00` : datePlanifiee
    t.dateValidite = dateValidite
    return { ok: true }
  }
  /** Retire une commande de la tournée en attente : elle redevient disponible. */
  function retirerCommande(id: string, commandeId: string): Resultat {
    const m = modifiablePlan(id); if (!m.ok) return m
    const v = m.v!, t = v.carburant!
    if (!t.commandeIds.includes(commandeId)) return { ok: false, motif: 'Cette commande ne fait pas partie de la tournée.' }
    t.plan.filter(x => x.commandeId === commandeId).forEach(x => Object.assign(x, { produit: undefined, volumeL: undefined, commandeId: undefined, client: undefined }))
    t.commandeIds = t.commandeIds.filter(x => x !== commandeId)
    v.etapes = v.etapes.filter(e => e.commandeId !== commandeId).sort((a, b) => a.ordre - b.ordre).map((e, i) => Object.assign(e, { ordre: i + 1 }))
    v.clientNom = voyagesStore().resumeDestinataires(v.etapes)
    v.marchandise.poidsChargeKg = v.etapes.reduce((s, e) => s + (e.poidsKg ?? 0), 0)
    commandesStore().remettreEnAttente(commandeId)
    return { ok: true }
  }

  /* ── Validation : plan figé, un ordre planifié par camion, bons générés ── */
  /** Tous les contrôles se font avant de toucher à la tournée : en cas d'échec, rien ne change. */
  function valider(id: string): Resultat & { ordres?: string[]; retires?: string[] } {
    const m = modifiablePlan(id); if (!m.ok) return m
    const v = m.v!, t = v.carburant!
    if (!t.commandeIds.length) return { ok: false, motif: 'Ajoutez au moins une commande à la tournée.' }
    const reste = restants(v)
    if (reste.length) return { ok: false, motif: `Il reste à charger : ${reste.map(r => `${r.produit} ${fmtL(r.volumeL)}`).join(', ')}. Corrigez le plan ou retirez la commande.` }
    const date = useControlesTransportStore().peutCharger(v)
    if (!date.ok) return date
    const utilises = t.camions.filter(c => t.plan.some(x => x.vehiculeId === c.vehiculeId && (x.volumeL ?? 0) > 0))
    const retires = t.camions.filter(c => !utilises.includes(c))
    const depot = useSitesStore().getById(t.depotId)
    /* Les livraisons de chaque camion, relevées avant de répartir la tournée en ordres. Une commande
       chargée sur plusieurs camions part en plusieurs parts : chaque camion livre la sienne, avec son volume. */
    const etapesTournee = [...v.etapes]
    const volumeSur = (commandeId: string, vehiculeId: string) => t.plan.filter(x => x.commandeId === commandeId && x.vehiculeId === vehiculeId).reduce((s2, x) => s2 + (x.volumeL ?? 0), 0)
    const preparations = utilises.map(camion => {
      const plan = t.plan.filter(x => x.vehiculeId === camion.vehiculeId)
      const idsCommandes = [...new Set(plan.map(x => x.commandeId).filter((x): x is string => !!x))]
      const lignesSource = etapesTournee.filter(e => e.commandeId && idsCommandes.includes(e.commandeId)).map(e => {
        const c = commandesStore().getById(e.commandeId!)
        const vol = volumeSur(e.commandeId!, camion.vehiculeId)
        if (!c?.volumeL || vol >= c.volumeL) return e
        return { ...e, poidsKg: Math.round(c.poidsKg * vol / c.volumeL), nombreUnites: vol, contenuCommande: `${c.produit ?? c.contenu}, ${fmtL(vol)}` }
      })
      /* Ordre de livraison : du dépôt, chaque fois vers le client restant le plus proche. */
      const ordonnees: EtapeVoyage[] = []
      let pos = depot ? { lat: depot.lat, lng: depot.lng } : lignesSource[0] ? { lat: lignesSource[0].lat, lng: lignesSource[0].lng } : { lat: 0, lng: 0 }
      const restantesL = [...lignesSource]
      while (restantesL.length) {
        restantesL.sort((a, b2) => distanceKm(pos, a) - distanceKm(pos, b2))
        const suivante = restantesL.shift()!
        ordonnees.push(suivante); pos = { lat: suivante.lat, lng: suivante.lng }
      }
      return { camion, plan, idsCommandes, ordonnees }
    })
    /* Contrôles de chaque camion : conducteur, pièces, pompe, charge et contraintes de livraison. */
    for (const { camion, plan, ordonnees } of preparations) {
      const r = controlerCamion(camion.vehiculeId, camion.citerneId, v.datePlanifiee, v.id)
      if (!r.ok) return r
      const cmdsCamion = plan.filter(x => x.commandeId).map(x => commandesStore().getById(x.commandeId!)).filter((c): c is Commande => !!c)
      const p = cmdsCamion.find(x => pompeExigee(x))
      if (p && !camionPompe(camion.vehiculeId, camion.citerneId)) return { ok: false, motif: `Pompe exigée : la livraison à ${p.destinataire} exige un camion équipé d'une pompe.` }
      const essai: Voyage = { ...v, vehiculeId: camion.vehiculeId, vehiculePlaque: camion.plaque, semiRemorqueId: camion.citerneId, semiRemorquePlaque: camion.citernePlaque,
        chauffeurId: camion.chauffeurId, chauffeurNom: camion.chauffeurNom, etapes: ordonnees, moyen: 'propres' }
      const charge = voyagesStore().controleCharge(essai)
      if (!charge.ok) return { ok: false, motif: `${camion.plaque} : ${charge.motif}` }
      const regles = voyagesStore().controleContraintes(essai)
      if (!regles.ok) return { ok: false, motif: `${camion.plaque} : ${regles.motif}` }
    }
    /* Parts des commandes réparties : la commande d'origine part avec le premier camion qui la porte,
       chaque autre camion reçoit sa propre part (même référence, son volume). */
    const dejaPortee = new Set<string>()
    preparations.forEach(prep => {
      prep.idsCommandes = prep.idsCommandes.map(cid => {
        if (!dejaPortee.has(cid)) { dejaPortee.add(cid); return cid }
        const partId = commandesStore().detacherPartCarburant(cid, volumeSur(cid, prep.camion.vehiculeId), v.id)
        if (!partId) return cid
        prep.plan = prep.plan.map(x => x.commandeId === cid ? { ...x, commandeId: partId } : x)
        prep.ordonnees = prep.ordonnees.map(e => e.commandeId === cid ? { ...e, id: `${e.id}-${partId}`, commandeId: partId } : e)
        return partId
      })
    })
    const valideeLe = maintenantIso()
    const ordres: string[] = []
    const numerosBE = tousLesVoyages().map(x => x.carburant?.bonEnlevement?.numero ?? '')
    const numerosBL = tousLesVoyages().flatMap(x => x.etapes.map(e => e.bonLivraison?.numero ?? ''))
    preparations.forEach(({ camion, plan, idsCommandes, ordonnees }, i) => {
      const lignes = ordonnees.map((e, k) => {
        const numero = prochaineReference('BL', numerosBL); numerosBL.push(numero)
        return { ...e, ordre: k + 1, bonLivraison: { numero, emisLe: valideeLe, statut: 'emis' as const } }
      })
      const numeroBE = prochaineReference('BE', numerosBE); numerosBE.push(numeroBE)
      const bon: BonEnlevement = { numero: numeroBE, statut: 'emis', emisLe: valideeLe, historique: [{ le: valideeLe, par: par(), action: 'Bon émis à la validation de la tournée' }] }
      const carburant = { ...t, camions: [camion], commandeIds: idsCommandes, plan: plan.map(x => ({ ...x })), valideeLe, valideePar: par(), bonEnlevement: bon,
        rangCamion: preparations.length > 1 ? i + 1 : undefined, nbCamions: preparations.length > 1 ? preparations.length : undefined }
      const champs = {
        vehiculeId: camion.vehiculeId, vehiculePlaque: camion.plaque, semiRemorqueId: camion.citerneId, semiRemorquePlaque: camion.citernePlaque,
        chauffeurId: camion.chauffeurId, chauffeurNom: camion.chauffeurNom, clientNom: voyagesStore().resumeDestinataires(lignes),
        origine: t.depotNom, destination: lignes[lignes.length - 1]?.siteNom ?? '-',
        marchandise: { typeProduit: 'Carburant', nombreCartons: 0, poidsChargeKg: lignes.reduce((s, e) => s + (e.poidsKg ?? 0), 0) },
      }
      if (i === 0) {
        Object.assign(v, champs, { etapes: lignes, carburant })
        ordres.push(v.id)
      } else {
        const nouvel = voyagesStore().creer({
          ...champs, statut: 'en_attente', toleranceEcartPoidsPourcent: v.toleranceEcartPoidsPourcent, datePlanifiee: v.datePlanifiee, kmReference: 0,
          confirmationRequise: v.confirmationRequise, moyen: 'propres', modeTransport: v.modeTransport, carburant, etapesPersonnalisees: lignes,
        })
        commandesStore().affecter(idsCommandes, nouvel)
        ordres.push(nouvel)
      }
    })
    for (const o of ordres) {
      const r = voyagesStore().planifier(o)
      if (!r.ok) return { ok: false, motif: r.motif, ordres }
    }
    return { ok: true, ordres, retires: retires.map(c => c.plaque) }
  }
  /** Ordres nés de la même tournée de carburant, dans l'ordre des camions. */
  function ordresDeLaTournee(v: Voyage): Voyage[] {
    const ref = v.carburant?.reference
    if (!ref) return []
    return tousLesVoyages().filter(x => x.carburant?.reference === ref).sort((a, b) => (a.carburant?.rangCamion ?? 0) - (b.carburant?.rangCamion ?? 0))
  }

  /* ── Bon d'enlèvement : transmission au dépôt et confirmation par le BSL ── */
  function bonDe(id: string): Resultat & { v?: Voyage; bon?: BonEnlevement } {
    const x = tournee(id)
    if (!x || !x.t.bonEnlevement) return { ok: false, motif: "Ce bon d'enlèvement n'existe pas encore : validez d'abord la tournée." }
    if (['annule', 'cloture'].includes(x.v.statut)) return { ok: false, motif: 'Cet ordre est annulé ou clôturé : son bon ne se modifie plus.' }
    return { ok: true, v: x.v, bon: x.t.bonEnlevement }
  }
  const statutBon = (v: Voyage): StatutBonEnlevement | null => v.carburant?.bonEnlevement ? (v.statut === 'annule' ? 'annule' : v.carburant.bonEnlevement.statut) : null
  /** Compartiments à charger : ceux du plan dont le bon de livraison reste valable. */
  const aCharger = (v: Voyage) => (v.carburant?.plan ?? []).filter(x => (x.volumeL ?? 0) > 0 && !x.nonCharge
    && v.etapes.some(e => e.commandeId === x.commandeId && dansLaTournee(e)))

  function transmettreBon(id: string, email: string): Resultat {
    const b = bonDe(id); if (!b.ok) return b
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    const adresse = email.trim()
    if (!adresse) return { ok: false, motif: "Indiquez l'adresse e-mail du dépôt." }
    if (!EMAIL.test(adresse)) return { ok: false, motif: `Adresse e-mail invalide : ${adresse}` }
    b.bon!.transmisLe = maintenantIso(); b.bon!.transmisA = adresse
    b.bon!.historique.push({ le: b.bon!.transmisLe, par: par(), action: `Transmis au dépôt ${b.v!.carburant!.depotNom} (${adresse})` })
    return { ok: true }
  }
  function confirmerEnlevement(id: string, numeroBsl: string, mesures: Partial<MesureCompartiment>[]): Resultat {
    const b = bonDe(id); if (!b.ok) return b
    const v = b.v!, bon = b.bon!
    if (!peutConfirmerEnlevement()) return { ok: false, motif: "Votre rôle n'est pas habilité à confirmer l'enlèvement." }
    if (bon.statut !== 'emis') return { ok: false, motif: "L'enlèvement est déjà confirmé." }
    if (v.statut !== 'confirme') return { ok: false, motif: "L'enlèvement se confirme une fois la tournée confirmée, avant le départ." }
    const date = useControlesTransportStore().peutCharger(v)
    if (!date.ok) return date
    const num = numeroBsl.trim()
    if (!num) return { ok: false, motif: 'Indiquez le numéro de BSL.' }
    if (tousLesVoyages().some(x => x.carburant?.bonEnlevement?.bsl?.numero.toLowerCase() === num.toLowerCase())) return { ok: false, motif: 'Ce numéro de BSL est déjà enregistré.' }
    const comps = aCharger(v)
    /* Les mesures sont facultatives : seules celles qui sont saisies sont contrôlées et gardées. */
    const retenues: MesureCompartiment[] = []
    for (const c of comps) {
      const m = mesures.find(x => x.numero === c.numero) ?? {}
      const err = controlerMesuresSaisies(m, `Compartiment ${c.numero}`)
      if (err) return { ok: false, motif: err }
      if (m.volumeL != null && m.volumeL > c.capaciteL) return { ok: false, motif: `Compartiment ${c.numero} : ${fmtL(m.volumeL)} dépassent sa capacité de ${fmtL(c.capaciteL)}.` }
      /* La valeur du BSL fait foi ; à défaut, le volume à 15 °C se calcule avec la méthode réglée. */
      const garde = useControlesTransportStore().volume15Retenu(mesuresSaisies(m, c.numero), c.produit)
      if (garde.volume15Calcule === undefined) delete garde.volume15Calcule
      if (Object.keys(garde).length > 1) retenues.push(garde)
    }
    const le = maintenantIso()
    const parDepot = auth().role === 'depot'
    bon.bsl = { numero: num, saisiLe: le, saisiPar: par(), parDepot, mesures: retenues }
    bon.statut = 'confirme'
    bon.historique.push({ le, par: par(), action: `Enlèvement confirmé ${parDepot ? 'par le dépôt' : 'à partir du BSL remis au conducteur'}, BSL ${num}` })
    /* Le chargement est déclaré : chaque livraison reçoit ce qui a été chargé pour elle. La quantité
       chargée de référence est le volume à 15 °C s'il est saisi pour chaque compartiment, sinon le
       volume saisi, sinon le volume prévu (l'écart ne pourra alors pas être contrôlé). */
    v.etapes.filter(dansLaTournee).forEach(e => {
      const ses = comps.filter(c => c.commandeId === e.commandeId)
      const mes = ses.map(c => retenues.find(r => r.numero === c.numero))
      const volumeDe = (c: CompartimentPlan) => retenues.find(r => r.numero === c.numero)?.volumeL ?? c.volumeL
      e.articles = ses.map(c => ({ id: `${e.id}-C${c.numero}`, libelle: `Compartiment ${c.numero} : ${c.produit}, ${fmtL(volumeDe(c))}` }))
      e.contenuCharge = e.articles.map(a => a.libelle).join(', ')
      if (mes.length && mes.every(x => x?.volume15 != null)) e.nombreUnites = totalA15(mes as MesureCompartiment[])
      else if (mes.length && mes.every(x => x?.volumeL != null)) e.nombreUnites = totalVolume(mes as MesureCompartiment[])
      else e.nombreUnites = ses.reduce((t, c) => t + (c.volumeL ?? 0), 0)
    })
    v.chargementEntrepotLe = le
    /* Le dernier produit chargé reste dans chaque compartiment, pour la règle de succession. */
    const cit = vehicules().parId(v.carburant!.camions[0]!.citerneId)
    comps.forEach(c => { const k = cit?.compartiments?.find(x => x.numero === c.numero); if (k) k.produit = c.produit })
    return { ok: true }
  }

  /* ── Contrôle du conducteur, compartiment par compartiment ── */
  function controlerCompartiment(id: string, numero: number, conforme: boolean, motif?: string): Resultat {
    const x = tournee(id)
    if (!x || x.v.statut !== 'confirme' || !x.v.chargementEntrepotLe) return { ok: false, motif: "Le dépôt n'a pas encore confirmé l'enlèvement." }
    const c = aCharger(x.v).find(k => k.numero === numero)
    if (!c) return { ok: false, motif: 'Compartiment introuvable ou sorti de la tournée.' }
    const e = x.v.etapes.find(l => l.commandeId === c.commandeId)!
    if (conforme) {
      c.conformeLe = maintenantIso(); c.nonConformeLe = undefined; c.motifNonConformite = undefined
      const tous = aCharger(x.v).filter(k => k.commandeId === c.commandeId).every(k => k.conformeLe)
      return tous ? voyagesStore().controlerLigneChargement(id, e.id, true) : { ok: true }
    }
    if (!motif?.trim()) return { ok: false, motif: 'Précisez ce qui ne correspond pas.' }
    c.nonConformeLe = maintenantIso(); c.motifNonConformite = motif.trim(); c.conformeLe = undefined
    return voyagesStore().controlerLigneChargement(id, e.id, false, `Compartiment ${numero} : ${motif.trim()}`)
  }
  function toutConforme(id: string): Resultat {
    const x = tournee(id)
    if (!x || x.v.statut !== 'confirme' || !x.v.chargementEntrepotLe) return { ok: false, motif: "Le dépôt n'a pas encore confirmé l'enlèvement." }
    const le = maintenantIso()
    aCharger(x.v).filter(k => !k.conformeLe).forEach(k => { k.conformeLe = le })
    return voyagesStore().validerChargementChauffeur(id)
  }

  /* ── Imprévus sur les bons ── */
  /** Notification au conducteur, y compris celui qui est retiré de la tournée. */
  function notifierConducteur(v: Voyage, message: string, chauffeurId = v.chauffeurId) {
    v.notificationsChauffeur = [...(v.notificationsChauffeur ?? []), { le: maintenantIso(), message, chauffeurId }]
  }
  function avantChargement(id: string): Resultat & { v?: Voyage; bon?: BonEnlevement } {
    const b = bonDe(id); if (!b.ok) return b
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    if (b.bon!.statut !== 'emis') return { ok: false, motif: "L'enlèvement est déjà confirmé : le camion et le dépôt ne se changent plus." }
    if (!['planifie', 'confirme'].includes(b.v!.statut)) return { ok: false, motif: 'Cet ordre ne se modifie plus ainsi.' }
    return b
  }
  function changerCamion(id: string, choix: { vehiculeId: string; citerneId: string }, motif: string): Resultat {
    const b = avantChargement(id); if (!b.ok) return b
    const v = b.v!, t = v.carburant!, actuel = t.camions[0]!
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du changement de camion.' }
    if (choix.vehiculeId === actuel.vehiculeId && choix.citerneId === actuel.citerneId) return { ok: false, motif: 'Choisissez un autre camion ou une autre citerne.' }
    const r = controlerCamion(choix.vehiculeId, choix.citerneId, v.datePlanifiee, v.id)
    if (!r.ok) return r
    const nouveau = r.camion!
    /* Le nouveau camion doit porter le même plan : compartiments, capacités, pompe. */
    const cit = vehicules().parId(nouveau.citerneId)!
    for (const x of t.plan.filter(k => (k.volumeL ?? 0) > 0 && !k.nonCharge)) {
      const k = cit.compartiments?.find(c => c.numero === x.numero)
      if (!k) return { ok: false, motif: `${cit.immatriculation} ne peut pas porter le même plan : elle n'a pas de compartiment ${x.numero}.` }
      if (k.volumeL < (x.volumeL ?? 0)) return { ok: false, motif: `${cit.immatriculation} ne peut pas porter le même plan : son compartiment ${x.numero} contient ${fmtL(k.volumeL)}, il en faut ${fmtL(x.volumeL)}.` }
      const s = contraintes().successionAutorisee(k.produit, x.produit!)
      if (!s.ok) return { ok: false, motif: `${cit.immatriculation} ne peut pas porter le même plan : ${s.motif}` }
    }
    const pompe = v.etapes.find(e => dansLaTournee(e) && e.pompeExigee)
    if (pompe && !camionPompe(nouveau.vehiculeId, nouveau.citerneId)) return { ok: false, motif: `Le nouveau camion ne peut pas porter le même plan : la livraison à ${pompe.destinataire} exige une pompe.` }
    const ancien = `${actuel.plaque} et ${actuel.citernePlaque}`
    const date = jourFr(v.datePlanifiee)
    const moyensAvant = voyagesStore().moyensDe(v)
    /* Chaque notification porte son conducteur : l'ancien garde les siennes. */
    ;(v.notificationsChauffeur ?? []).forEach(n => { if (!n.chauffeurId) n.chauffeurId = actuel.chauffeurId })
    if (actuel.chauffeurId && actuel.chauffeurId !== nouveau.chauffeurId)
      notifierConducteur(v, `La tournée ${v.numeroOT || v.reference} du ${date} vous est retirée : changement de camion (${motif.trim()}).`, actuel.chauffeurId)
    Object.assign(v, { vehiculeId: nouveau.vehiculeId, vehiculePlaque: nouveau.plaque, semiRemorqueId: nouveau.citerneId, semiRemorquePlaque: nouveau.citernePlaque,
      chauffeurId: nouveau.chauffeurId, chauffeurNom: nouveau.chauffeurNom })
    t.camions = [nouveau]
    t.plan.forEach(x => { x.vehiculeId = nouveau.vehiculeId; x.citerneId = nouveau.citerneId; x.capaciteL = cit.compartiments?.find(c => c.numero === x.numero)?.volumeL ?? x.capaciteL })
    /* Le nouveau conducteur reçoit sa notification, une seule fois. */
    const message = voyagesStore().messageTourneeConfiee(v)
    if (actuel.chauffeurId !== nouveau.chauffeurId && !(v.notificationsChauffeur ?? []).some(n => n.chauffeurId === nouveau.chauffeurId && n.message === message))
      notifierConducteur(v, message, nouveau.chauffeurId)
    b.bon!.historique.push({ le: maintenantIso(), par: par(), action: `Changement de camion : ${ancien} remplacés par ${nouveau.plaque} et ${nouveau.citernePlaque}`, motif: motif.trim() })
    voyagesStore().recalculerHeuresPrevues(v.id)
    /* Les destinataires reçoivent à nouveau leur notification, avec le nouveau camion et son conducteur. */
    voyagesStore().renotifierSiMoyensChanges(v.id, moyensAvant)
    return { ok: true }
  }
  function changerDepot(id: string, depotId: string, motif: string): Resultat {
    const b = avantChargement(id); if (!b.ok) return b
    const t = b.v!.carburant!
    const depot = depots.value.find(d => d.id === depotId)
    if (!depot) return { ok: false, motif: 'Choisissez le nouveau dépôt de chargement.' }
    if (depot.id === t.depotId) return { ok: false, motif: 'Ce dépôt est déjà celui du bon.' }
    if (!motif.trim()) return { ok: false, motif: 'Indiquez le motif du changement de dépôt.' }
    const ancien = t.depotNom
    t.depotId = depot.id; t.depotNom = depot.nom; b.v!.origine = depot.nom
    /* Le nouveau dépôt doit recevoir le bon à son tour. */
    b.bon!.transmisLe = undefined; b.bon!.transmisA = undefined
    b.bon!.historique.push({ le: maintenantIso(), par: par(), action: `Changement de dépôt : ${ancien} remplacé par ${depot.nom}`, motif: motif.trim() })
    return { ok: true }
  }
  function controlerIncident(i: SaisieIncident, typeMotifImpose?: string): string | null {
    const ctrl = useControlesTransportStore()
    if (!i.typeIncident || !ctrl.motifs('typesIncident').some(x => x.code === i.typeIncident)) return "Choisissez le type d'incident."
    const typeMotif = typeMotifImpose ?? i.typeMotif
    if (!typeMotif || !ctrl.motifs('typesMotif').some(x => x.code === typeMotif)) return 'Choisissez le type de motif.'
    if (!i.codeMotif || !ctrl.motifs('codesMotif', typeMotif).some(x => x.code === i.codeMotif)) return 'Choisissez le code motif.'
    return null
  }
  function incidentDe(i: SaisieIncident, typeMotif: string): IncidentBon {
    return { typeIncident: i.typeIncident, typeMotif, codeMotif: i.codeMotif, commentaire: i.commentaire?.trim() || undefined, le: maintenantIso(), par: par() }
  }
  /** Annulation d'un bon de livraison par un incident tracé : la commande redevient disponible.
   *  Quand tous les bons de l'ordre sont annulés : avant le chargement, l'ordre est annulé ;
   *  après, le retour du produit au dépôt est tracé et l'ordre attend sa clôture. */
  function annulerBon(id: string, etapeId: string, i: SaisieIncident): Resultat & { issue?: 'annule' | 'termine' } {
    const b = bonDe(id); if (!b.ok) return b
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    const v = b.v!
    if (!['planifie', 'confirme', 'pret', 'en_cours'].includes(v.statut)) return { ok: false, motif: 'Ce bon ne se modifie plus.' }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e?.bonLivraison || e.bonLivraison.statut !== 'emis' || !dansLaTournee(e) || e.franchi) return { ok: false, motif: 'Ce bon de livraison est déjà clos ou livré.' }
    if (i.typeMotif === TYPE_MOTIF_DEVIATION) return { ok: false, motif: 'Le type de motif « Déviation » est réservé à la déviation vers un autre client : choisissez un autre type de motif.' }
    const err = controlerIncident(i); if (err) return { ok: false, motif: err }
    const ctrl = useControlesTransportStore()
    const motif = `${ctrl.libelleMotif('codesMotif', i.codeMotif)}${i.commentaire?.trim() ? ` : ${i.commentaire.trim()}` : ''}`
    const avant = b.bon!.statut === 'emis'
    /* Avant le chargement, son compartiment n'est pas chargé ; après, le produit revient au dépôt. */
    if (avant) v.carburant!.plan.filter(x => x.commandeId === e.commandeId).forEach(x => { x.nonCharge = true })
    if (v.statut === 'en_cours') {
      const r = voyagesStore().annulerLigne(v.id, e.id, motif, false)
      if (!r.ok) return r
    } else {
      e.ligneAnnuleeLe = maintenantIso(); e.motifAnnulationLigne = motif; e.annuleeAvantDepart = true
      if (!avant) e.retourAttenduLe = e.ligneAnnuleeLe
    }
    e.incidentBon = incidentDe(i, i.typeMotif)
    e.bonLivraison.statut = 'annule'
    /* Le client apprend l'annulation avec le libellé du code motif, sans le commentaire interne. */
    voyagesStore().notifier(v, e, 'annulation', { motif: ctrl.libelleMotif('codesMotif', i.codeMotif) })
    if (e.commandeId) commandesStore().remettreEnAttente(e.commandeId)
    v.clientNom = voyagesStore().resumeDestinataires(v.etapes.filter(dansLaTournee))
    v.marchandise.poidsChargeKg = v.etapes.filter(dansLaTournee).reduce((s, x) => s + (x.poidsKg ?? 0), 0)
    b.bon!.historique.push({ le: maintenantIso(), par: par(), action: `Bon de livraison ${e.bonLivraison.numero} annulé (${e.destinataire})${avant ? ', compartiment non chargé' : ', produit à ramener au dépôt'}`, motif })
    /* Plus aucun bon à livrer sur cet ordre. */
    const restent = v.etapes.some(x => x.bonLivraison && dansLaTournee(x) && !x.franchi)
    const livrees = v.etapes.some(x => x.franchi)
    if (!restent && !livrees) {
      if (avant) {
        const r = voyagesStore().annuler(v.id, `Tous les bons de livraison sont annulés : ${motif}`)
        if (r.ok) return { ok: true, issue: 'annule' }
      } else {
        b.bon!.historique.push({ le: maintenantIso(), par: par(), action: 'Tous les bons de livraison sont annulés : le produit chargé revient au dépôt' })
        if (v.statut !== 'livre') { v.statut = 'livre'; v.dateArriveeReelle = maintenantIso() }
        return { ok: true, issue: 'termine' }
      }
    }
    if (v.statut === 'planifie') voyagesStore().reevaluerConfirmation(v)
    if (v.statut === 'confirme' && v.chargementEntrepotLe) voyagesStore().finaliserControle(v)
    return { ok: true }
  }
  /** Volume chargé pour une livraison : celui du BSL quand il est saisi, sinon le volume prévu au plan. */
  function volumeCharge(v: Voyage, e: EtapeVoyage) {
    const bsl = v.carburant?.bonEnlevement?.bsl?.mesures ?? []
    return (v.carburant?.plan ?? []).filter(x => x.commandeId === e.commandeId && !x.nonCharge).reduce((s, x) => s + (bsl.find(m => m.numero === x.numero)?.volumeL ?? x.volumeL ?? 0), 0)
  }
  /** Clients vers qui une livraison peut être déviée : même produit, volume couvert par le compartiment, même dépôt de chargement. */
  function ciblesDeviation(v: Voyage, e: EtapeVoyage) {
    const charge = volumeCharge(v, e)
    return commandesStore().commandes.filter(c => c.statut === 'en_attente' && commandesStore().estCarburant(c) && c.id !== e.commandeId && c.modeLivraison !== 'enlevement_client'
      && (c.produit ?? c.contenu) === e.produit && (c.volumeL ?? 0) <= charge && (!c.depotId || c.depotId === v.carburant?.depotId))
  }
  function devier(id: string, etapeId: string, commandeId: string, i: SaisieIncident): Resultat {
    const b = bonDe(id); if (!b.ok) return b
    if (!habilite()) return { ok: false, motif: MOTIF_NON_HABILITE }
    const v = b.v!
    if (b.bon!.statut !== 'confirme' || !['confirme', 'pret', 'en_cours'].includes(v.statut)) return { ok: false, motif: "La déviation porte sur un produit déjà chargé : l'enlèvement doit être confirmé." }
    const e = v.etapes.find(x => x.id === etapeId)
    if (!e?.bonLivraison || e.bonLivraison.statut !== 'emis' || !dansLaTournee(e) || e.franchi) return { ok: false, motif: 'Ce bon de livraison est déjà clos ou livré.' }
    const c = commandesStore().getById(commandeId)
    if (!c) return { ok: false, motif: 'Choisissez le client vers qui dévier la livraison.' }
    if (c.statut !== 'en_attente' || !commandesStore().estCarburant(c)) return { ok: false, motif: `La commande de ${c.destinataire} n'est plus en attente.` }
    if ((c.produit ?? c.contenu) !== e.produit) return { ok: false, motif: `${c.destinataire} attend ${c.produit ?? c.contenu} : la déviation n'est possible que vers un client qui attend le même produit (${e.produit}).` }
    const charge = volumeCharge(v, e)
    if ((c.volumeL ?? 0) > charge) return { ok: false, motif: `La commande de ${c.destinataire} porte sur ${fmtL(c.volumeL)} : le compartiment n'en contient que ${fmtL(charge)}.` }
    if (c.depotId && c.depotId !== v.carburant!.depotId) return { ok: false, motif: `La commande de ${c.destinataire} se charge à un autre dépôt.` }
    if (pompeExigee(c) && !camionPompe(v.vehiculeId ?? '', v.semiRemorqueId ?? '')) return { ok: false, motif: `Pompe exigée : la livraison à ${c.destinataire} exige un camion équipé d'une pompe, ${v.vehiculePlaque} et ${v.semiRemorquePlaque} n'en ont pas.` }
    const err = controlerIncident(i, TYPE_MOTIF_DEVIATION); if (err) return { ok: false, motif: err }
    const ctrl = useControlesTransportStore()
    const libelle = ctrl.libelleMotif('codesMotif', i.codeMotif)
    const le = maintenantIso()
    /* Le bon d'origine est clos par un incident « déviation » ; la commande d'origine redevient disponible. */
    e.ligneAnnuleeLe = le; e.motifAnnulationLigne = `Déviée vers ${c.destinataire} : ${libelle}${i.commentaire?.trim() ? `, ${i.commentaire.trim()}` : ''}`
    e.incidentBon = incidentDe(i, TYPE_MOTIF_DEVIATION); e.bonLivraison.statut = 'devie'; e.devieeVers = c.destinataire
    /* Le client d'origine est prévenu avec le libellé du motif, sans nommer l'autre client. */
    voyagesStore().notifier(v, e, 'annulation', { motif: libelle })
    if (e.commandeId) commandesStore().remettreEnAttente(e.commandeId)
    /* Nouveau bon de livraison pour le nouveau destinataire, qui est notifié. */
    const numero = prochaineReference('BL', tousLesVoyages().flatMap(x => x.etapes.map(y => y.bonLivraison?.numero ?? '')))
    const part = charge ? Math.min(1, (c.volumeL ?? 0) / charge) : 1
    const nouvelle: EtapeVoyage = {
      ...ligneDeCommande(c, `${v.id}-DEV-${maintenantMs()}`, e.ordre),
      ordre: e.ordre + 0.5, confirmeLe: le, heurePrevue: e.heurePrevue, chargementConformeLe: e.chargementConformeLe,
      contenuCharge: e.contenuCharge, articles: e.articles?.map(a => ({ id: `${a.id}-D`, libelle: a.libelle })),
      nombreUnites: e.nombreUnites != null ? Math.round(e.nombreUnites * part) : c.volumeL,
      bonLivraison: { numero, emisLe: le, statut: 'emis' }, devieeDe: e.destinataire,
    }
    v.etapes.push(nouvelle)
    v.etapes.sort((a, b2) => a.ordre - b2.ordre).forEach((x, k) => { x.ordre = k + 1 })
    /* Le compartiment garde sa commande d'origine, pour que le bon d'origine reste lisible et imprimable. */
    v.carburant!.plan.filter(x => x.commandeId === e.commandeId && !x.nonCharge).forEach(x => {
      x.commandeOrigineId = x.commandeOrigineId ?? x.commandeId; x.clientOrigine = x.clientOrigine ?? x.client
      x.commandeId = c.id; x.client = c.destinataire
    })
    v.carburant!.commandeIds = [...v.carburant!.commandeIds, c.id]
    commandesStore().affecter([c.id], v.id)
    voyagesStore().notifier(v, nouvelle, 'planification')
    v.clientNom = voyagesStore().resumeDestinataires(v.etapes.filter(dansLaTournee))
    b.bon!.historique.push({ le, par: par(), action: `Livraison de ${e.destinataire} déviée vers ${c.destinataire} (bon ${e.bonLivraison.numero} clos, nouveau bon ${numero})`, motif: libelle })
    return { ok: true }
  }

  return {
    habilite, peutConfirmerEnlevement, depots, regions, regionCommande, commandesAPlanifier, pompeExigee,
    tracteursDisponibles, citernesDisponibles, conducteurDe, permisDe, transporteur, camionPompe, capaciteCiterne, controlerCamion,
    verifier, verification, creerTournee, restants, proposer, effacer, corriger, reprogrammer, retirerCommande, valider, ordresDeLaTournee,
    statutBon, aCharger, transmettreBon, confirmerEnlevement, controlerCompartiment, toutConforme,
    changerCamion, changerDepot, annulerBon, devier, ciblesDeviation, volumeCharge,
  }
})
