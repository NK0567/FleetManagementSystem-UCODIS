import { useAuthStore, LIBELLE_ROLE } from './auth'
import type { RoleUtilisateur } from '../types'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDocumentsVehiculeStore } from './documentsVehicule'
import { useDocumentsStore } from './documentsPersonnel'
import { useDocumentsEntrepriseStore } from './documentsEntreprise'
import { useCarburantStore } from './carburant'
import { useCartesCarburantStore } from './cartesCarburant'
import { usePneusStore } from './pneus'
import { useControlesStore } from './controles'
import { useInspectionsStore } from './inspections'
import { useMaintenanceStore } from './maintenance'
import { useInfractionsStore } from './infractions'
import { useFormationsStore } from './formations'
import { useDepartsStore } from './departs'
import { useVehiculeStore } from './vehicules'
import { usePersonnelStore } from './personnel'
import { useTypesDocumentsStore } from './typesDocuments'
import { useEcartsStore, LIB_TYPE_ECART } from './ecarts'
import { useTelematiqueStore } from './telematique'
import { dansNJours, maintenantMs, maintenant, isoJour } from '../utils/horloge'
import { etatEcheance } from '../utils/helpers'
import { useTypesEquipementsStore } from './typesEquipements'
import { useScoresConducteursStore } from './scoresConducteurs'
import { useReglesDocumentsStore } from './reglesDocuments'

/**
 * Alertes (FMS-SC-08, SC-09). Une alerte n'est pas un module : elle se déduit
 * de ce que les autres sous-modules enregistrent (document qui expire, plein
 * à qualifier, anomalie sur route…). Son traitement, lui, s'enregistre :
 * prise en charge, traitement, escalade au niveau supérieur sans traitement
 * dans le délai réglé, et l'historique est conservé pour mesurer l'utilité
 * des alertes.
 */
export type CategorieAlerte = 'document' | 'carburant' | 'carte' | 'pneu' | 'checklist' | 'infraction' | 'formation' | 'depart' | 'trajet' | 'conduite' | 'vehicule' | 'equipement' | 'inspection' | 'entretien'
export type GraviteAlerte = 'info' | 'avertissement' | 'critique'
export type StatutAlerte = 'nouvelle' | 'prise_en_charge' | 'traitee' | 'resolue'
export const LIB_CATEGORIE_ALERTE: Record<CategorieAlerte, string> = {
  document: 'Documents', carburant: 'Carburant', carte: 'Cartes carburant', pneu: 'Pneumatiques', checklist: 'Checklist sur route',
  infraction: 'Infractions', formation: 'Formations', depart: 'Départs',
  trajet: 'Écarts de trajet', conduite: 'Comportements de conduite', vehicule: 'Défauts et signal du véhicule', equipement: 'Équipements embarqués', inspection: 'Inspections périodiques', entretien: 'Entretien préventif',
}
export const LIB_STATUT_ALERTE: Record<StatutAlerte, { label: string; cls: string }> = {
  nouvelle: { label: 'Nouvelle', cls: 'bg-warning-bg text-warning' },
  prise_en_charge: { label: 'Prise en charge', cls: 'bg-info-bg text-info' },
  traitee: { label: 'Traitée', cls: 'bg-success-bg text-success' },
  resolue: { label: "Résolue d'elle-même", cls: 'bg-neutral-bg text-neutral' },
}
export interface Signal {
  cle: string
  categorie: CategorieAlerte
  gravite: GraviteAlerte
  titre: string
  message: string
  /** Début de la situation, d'où part le délai d'escalade. */
  depuis: string
  /** Écran où l'élément se traite, et l'élément à y ouvrir. */
  route: string
  query?: Record<string, string>
  vehiculeId?: string
}
export interface EtatAlerte {
  cle: string
  categorie: CategorieAlerte
  gravite: GraviteAlerte
  titre: string
  message: string
  route: string
  query?: Record<string, string>
  vehiculeId?: string
  depuis: string
  /** Première émission de l'alerte dans le système : point de départ du délai d'escalade. */
  emiseLe: string
  statut: StatutAlerte
  prisePar?: string
  priseLe?: string
  traiteePar?: string
  traiteeLe?: string
  commentaire?: string
  escaladeeLe?: string
  /** Niveau vers lequel l'alerte a été escaladée, tel qu'il était réglé à ce moment-là. */
  escaladeeVers?: string
  resolueLe?: string
}
/** Escalade : sans traitement dans le délai, l'alerte remonte au rôle choisi, qui la voit dès lors. */
export interface RegleEscalade { delaiHeures: number; niveau: RoleUtilisateur }
/**
 * Règle d'alerte (FMS-PA-06) : l'événement est la catégorie, le seuil reste
 * réglé là où l'événement se définit (préavis, tolérance, type d'écart) et
 * se lit ici ; la règle porte la gravité, les destinataires, les canaux et
 * l'escalade. Une règle désactivée ne produit plus d'alerte.
 */
export type GraviteRegle = 'selon_cas' | GraviteAlerte
export interface RegleAlerte extends RegleEscalade {
  actif: boolean
  gravite: GraviteRegle
  /** Rôles qui reçoivent l'alerte ; l'administrateur les voit toutes. */
  destinataires: RoleUtilisateur[]
  email: boolean
  sms: boolean
}
export const LIB_GRAVITE_ALERTE: Record<GraviteRegle, string> = {
  selon_cas: 'Selon le cas', info: 'Information', avertissement: 'Avertissement', critique: 'Critique',
}

const CLE_ETATS = 'fms-ucodis-alertes'
const CLE_REGLES = 'fms-ucodis-regles-escalade'
const FLOTTE: RoleUtilisateur[] = ['responsable_flotte']
const ATELIER: RoleUtilisateur[] = ['responsable_flotte', 'maintenancier']
const r = (delaiHeures: number, _niveau: string, destinataires: RoleUtilisateur[], niveau: RoleUtilisateur = 'direction'): RegleAlerte =>
  ({ actif: true, gravite: 'selon_cas', destinataires, email: false, sms: false, delaiHeures, niveau })
const REGLES_DEFAUT: Record<CategorieAlerte, RegleAlerte> = {
  document: { ...r(72, 'Direction', ['responsable_flotte', 'maintenancier', 'direction']), email: true }, carburant: r(72, 'Direction', FLOTTE), carte: r(48, 'Direction', FLOTTE),
  pneu: r(48, 'Responsable maintenance', ATELIER), checklist: r(4, 'Responsable maintenance', ATELIER),
  infraction: r(168, 'Direction', FLOTTE), formation: r(336, 'Ressources humaines', FLOTTE), depart: r(1, 'Direction', FLOTTE),
  trajet: r(2, 'Responsable exploitation', FLOTTE), conduite: r(24, 'Responsable sécurité', FLOTTE), vehicule: r(4, 'Responsable maintenance', ATELIER),
  equipement: r(72, 'Responsable flotte', ATELIER), inspection: r(72, 'Responsable maintenance', ATELIER), entretien: r(72, 'Responsable maintenance', ATELIER),
}

export const useAlertesStore = defineStore('alertes', () => {
  const docsV = useDocumentsVehiculeStore()
  const docsP = useDocumentsStore()
  const docsE = useDocumentsEntrepriseStore()
  const carburant = useCarburantStore()
  const cartes = useCartesCarburantStore()
  const pneus = usePneusStore()
  const controles = useControlesStore()
  const inspections = useInspectionsStore()
  const maintenance = useMaintenanceStore()
  const infractions = useInfractionsStore()
  const formations = useFormationsStore()
  const departs = useDepartsStore()
  const vehicules = useVehiculeStore()
  const personnel = usePersonnelStore()
  const types = useTypesDocumentsStore()
  const ecarts = useEcartsStore()
  const telematique = useTelematiqueStore()
  const typesEq = useTypesEquipementsStore()
  /* Le score des conducteurs propose une formation sous le seuil : il doit tourner dès l'ouverture. */
  useScoresConducteursStore()
  const idParPlaque = (plaque?: string) => plaque ? vehicules.liste.find(v => v.immatriculation === plaque)?.id : undefined

  const regles = ref<Record<CategorieAlerte, RegleAlerte>>(JSON.parse(JSON.stringify(REGLES_DEFAUT)))
  try {
    const b = localStorage.getItem(CLE_REGLES)
    if (b) {
      const lu = JSON.parse(b) as Record<string, Partial<RegleAlerte>>
      ;(Object.keys(regles.value) as CategorieAlerte[]).forEach(c => {
        if (!lu[c]) return
        const niveau = lu[c]!.niveau && lu[c]!.niveau! in LIBELLE_ROLE ? lu[c]!.niveau! : regles.value[c].niveau
        regles.value[c] = { ...regles.value[c], ...lu[c], niveau }
      })
    }
  } catch { /* défaut */ }
  /* Les canaux e-mail et SMS des documents se réglaient à part : ils sont repris dans la règle Documents. */
  const ancienDocs = useReglesDocumentsStore().parametres
  if (typeof ancienDocs.envoiEmail === 'boolean' || typeof ancienDocs.envoiSms === 'boolean') {
    if (typeof ancienDocs.envoiEmail === 'boolean') regles.value.document.email = ancienDocs.envoiEmail
    if (typeof ancienDocs.envoiSms === 'boolean') regles.value.document.sms = ancienDocs.envoiSms
    try { localStorage.setItem(CLE_REGLES, JSON.stringify(regles.value)) } catch { /* ignoré */ }
    delete ancienDocs.envoiEmail; delete ancienDocs.envoiSms
  }
  watch(regles, v => { try { localStorage.setItem(CLE_REGLES, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  function reinitialiserRegles() { Object.assign(regles.value, JSON.parse(JSON.stringify(REGLES_DEFAUT))) }
  function basculerDestinataire(c: CategorieAlerte, role: RoleUtilisateur): { ok: boolean; motif?: string } {
    const d = regles.value[c].destinataires
    const i = d.indexOf(role)
    if (i >= 0) { if (d.length === 1) return { ok: false, motif: 'Une règle active garde au moins un destinataire.' }; d.splice(i, 1) }
    else d.push(role)
    return { ok: true }
  }

  /** Situations en cours, déduites des autres sous-modules. */
  const signaux = computed<Signal[]>(() => {
    const out: Signal[] = []
    /* Documents : la même règle pour les véhicules et les personnes, seuls les
       documents obligatoires à renouveler ou hors validité donnent une alerte. */
    const ETATS_ALERTE = ['proche', 'expire', 'annule', 'perdu']
    docsV.actifs.forEach(d => {
      const e = docsV.etat(d)
      if (!ETATS_ALERTE.includes(e) || !types.get(d.type)?.obligatoire) return
      const v = vehicules.parId(d.vehiculeId); if (!v || v.statut === 'sorti') return
      out.push({ cle: `doc-v-${d.id}-${e}`, categorie: 'document', gravite: e === 'proche' ? 'avertissement' : 'critique',
        titre: e === 'proche' ? 'Document à renouveler' : 'Document hors validité',
        message: `${v.immatriculation} · ${docsV.libelle(d)}${d.echeance ? ` (fin ${new Date(d.echeance).toLocaleDateString('fr-FR')})` : ''}`,
        depuis: (e === 'proche' ? docsV.notificationLe(d) : d.echeance) ?? maintenant().toISOString(), route: 'flotte-documents-vehicule', query: { document: `veh:${d.id}` }, vehiculeId: d.vehiculeId })
    })
    docsP.actifs.forEach(d => {
      const e = docsP.etat(d)
      if (!ETATS_ALERTE.includes(e) || !types.get(d.type)?.obligatoire) return
      const p = personnel.parId(d.personnelId); if (!p || p.statut === 'archive') return
      out.push({ cle: `doc-p-${d.id}-${e}`, categorie: 'document', gravite: e === 'proche' ? 'avertissement' : 'critique',
        titre: e === 'proche' ? 'Document à renouveler' : 'Document hors validité',
        message: `${p.nomComplet} · ${docsP.libelle(d)}${d.dateExpiration ? ` (fin ${new Date(d.dateExpiration).toLocaleDateString('fr-FR')})` : ''}`,
        depuis: (e === 'proche' ? docsP.notificationLe(d) : d.dateExpiration) ?? maintenant().toISOString(), route: 'flotte-documents-vehicule', query: { document: `per:${d.id}` } })
    })
    docsE.enAttente.forEach(d => out.push({ cle: `doc-e-${d.id}`, categorie: 'document', gravite: 'info', titre: 'Document à valider', message: `${d.nom} · déposé par ${d.deposePar}`, depuis: d.deposeLe, route: 'flotte-documents-entreprise', query: { document: d.id } }))
    carburant.anomalies.forEach(r => out.push({ cle: `plein-${r.id}`, categorie: 'carburant', gravite: 'avertissement', titre: 'Plein à qualifier',
      message: `${r.vehiculePlaque} · ${r.litres} L à ${r.lieu}`, depuis: r.date, route: 'flotte-carburant' }))
    carburant.ecartsAQualifier.forEach(p => out.push({ cle: `ecart-${p.id}`, categorie: 'carburant', gravite: 'avertissement', titre: 'Écart de consommation à qualifier',
      message: `${p.vehiculePlaque} · ${p.ecartPct > 0 ? '+' : ''}${p.ecartPct} % sur la référence`, depuis: p.au, route: 'flotte-carburant' }))
    cartes.enDepassement.forEach(t => out.push({ cle: `tx-${t.id}`, categorie: 'carte', gravite: 'critique', titre: 'Carte carburant : limite dépassée',
      message: `${t.station}, ${t.litres} L : ${cartes.depassements(t).join(', ')}`, depuis: t.date, route: 'flotte-cartes-carburant' }))
    pneus.alertes.forEach(({ pneu, motifs }) => out.push({ cle: `pneu-${pneu.id}-${motifs.join('|')}`, categorie: 'pneu', gravite: motifs.some(m => !m.startsWith('Rotation')) ? 'critique' : 'avertissement',
      titre: 'Alerte pneumatique', message: `${pneu.vehiculePlaque ?? ''} · ${pneu.numeroSerie} : ${motifs.join(', ')}`, depuis: pneu.releves.at(-1)?.date ?? maintenant().toISOString(), route: 'maintenance-pneumatiques' }))
    controles.checklists.forEach(c => c.releves.forEach(r => Object.entries(r.resultats).forEach(([code, res]) => {
      if (res !== 'anomalie' || r.ordresTravail?.[code]) return
      out.push({ cle: `ckl-${c.id}-${r.pause}-${code}`, categorie: 'checklist', gravite: 'critique', titre: 'Anomalie relevée sur route',
        message: `${c.tracteurPlaque} · ${controles.libellePoint(code, r)}, pause ${r.pause}${r.commentaires?.[code] ? ` : ${r.commentaires[code]}` : ''}`, depuis: r.horodatage, route: 'flotte-controles', query: { checklist: c.id }, vehiculeId: idParPlaque(c.tracteurPlaque) })
    })))
    infractions.infractions.filter(i => i.statut === 'nouvelle').forEach(i => out.push({ cle: `inf-${i.id}`, categorie: 'infraction', gravite: i.gravite === 'grave' ? 'critique' : 'avertissement',
      titre: 'Infraction à traiter', message: `${i.vehiculePlaque} · ${infractions.libelleType(i.type)}${i.conducteurNom ? `, ${i.conducteurNom}` : ''}`, depuis: i.date, route: 'flotte-infractions', query: { infraction: i.id }, vehiculeId: i.vehiculeId }))
    formations.aPlanifier.forEach(f => out.push({ cle: `for-${f.id}`, categorie: 'formation', gravite: 'info', titre: 'Formation à planifier',
      message: `${personnel.parId(f.conducteurId)?.nomComplet ?? f.conducteurId} · ${f.theme}`, depuis: f.declencheeLe, route: 'flotte-formations', query: { formation: f.id } }))
    departs.enAttente.forEach(a => out.push({ cle: `aut-${a.id}`, categorie: 'depart', gravite: 'avertissement', titre: 'Départ en attente de décision',
      message: `${a.vehiculePlaque} · ${a.chauffeurNom}`, depuis: a.demandeeLe, route: 'flotte-departs', query: { autorisation: a.id }, vehiculeId: a.vehiculeId }))
    /* Équipements embarqués arrivant à échéance (FMS-DB-05), selon le préavis de leur type. */
    vehicules.equipements.forEach(e => {
      if (e.etat !== 'operationnel' || !e.echeance) return
      const v = vehicules.parId(e.vehiculeId); if (!v || v.statut === 'sorti') return
      const etat = etatEcheance(e.echeance, typesEq.preavis(e.type))
      if (etat !== 'proche' && etat !== 'expire') return
      out.push({ cle: `eq-${e.id}-${etat}`, categorie: 'equipement', gravite: etat === 'expire' ? 'critique' : 'avertissement',
        titre: etat === 'expire' ? 'Équipement à remplacer' : 'Équipement bientôt à échéance', message: `${v.immatriculation} · ${typesEq.libelle(e.type)} (échéance ${new Date(e.echeance).toLocaleDateString('fr-FR')})`,
        depuis: e.echeance, route: 'flotte-vehicules', query: { vehicule: v.id }, vehiculeId: v.id })
    })
    /* Échéances d'entretien proches ou dépassées (FMS-MA-02). */
    vehicules.liste.filter(v => v.statut !== 'sorti').forEach(v => maintenance.echeancesDe(v).forEach(e => {
      if ((e.statut !== 'proche' && e.statut !== 'depassee') || maintenance.otPreventifOuvert(v.id, e.operationId)) return
      out.push({ cle: `ent-${v.id}-${e.operationId}-${e.statut}`, categorie: 'entretien', gravite: e.statut === 'depassee' ? 'critique' : 'avertissement',
        titre: e.statut === 'depassee' ? 'Entretien dépassé' : 'Entretien à prévoir',
        message: `${v.immatriculation} · ${e.operationLibelle}${e.kmRestants != null ? ` (${e.kmRestants < 0 ? 'dépassé de ' + Math.abs(e.kmRestants).toLocaleString('fr-FR') : 'dans ' + e.kmRestants.toLocaleString('fr-FR')} km)` : ''}`,
        depuis: isoJour(maintenant()), route: 'maintenance-echeances', vehiculeId: v.id })
    }))
    /* Inspection périodique non conforme : contre-visite à réaliser (FMS-MA-10). */
    inspections.enAttenteContreVisite.forEach(a => out.push({ cle: `ins-${a.id}`, categorie: 'inspection', gravite: 'critique', titre: 'Contre-visite à réaliser',
      message: `${a.tracteurPlaque} · ${a.reference}, prévue le ${a.contreVisiteLe ? new Date(a.contreVisiteLe).toLocaleDateString('fr-FR') : '-'}`, depuis: a.date,
      route: 'flotte-controles', query: { vue: 'inspections', inspection: a.id }, vehiculeId: a.vehiculeId }))
    /* Suivi GPS et télématique (FMS-GP-02 à GP-04). */
    ecarts.aQualifier.forEach(e => out.push({ cle: `trj-${e.id}`, categorie: 'trajet', gravite: e.gravite === 'critique' ? 'critique' : 'avertissement',
      titre: `${LIB_TYPE_ECART[e.type]} à qualifier`, message: `${e.vehiculePlaque} · ${e.voyageRef}${e.lieu ? `, ${e.lieu}` : ''}`, depuis: e.detecteLe,
      route: 'flotte-conformite', query: { ecart: e.id }, vehiculeId: e.vehiculeId ?? idParPlaque(e.vehiculePlaque) }))
    const depuis = dansNJours(-telematique.parametres.joursAlerteConduite)
    telematique.actifs.forEach(e => {
      const def = telematique.typeDe(e.code)
      if (!def?.alerte) return
      const gravite = def.gravite === 'critique' ? 'critique' : 'avertissement'
      const base = { route: 'flotte-telemetrie', query: { evenement: e.id }, vehiculeId: e.vehiculeId, depuis: e.date }
      if ((e.famille === 'comportement' || e.famille === 'camera') && !e.infractionId && e.date >= depuis)
        out.push({ cle: `tel-${e.id}`, categorie: 'conduite', gravite, titre: def.libelle, message: `${e.plaque}${e.conducteurNom ? ` · ${e.conducteurNom}` : ''}${e.lieu ? `, ${e.lieu}` : ''}`, ...base })
      else if (e.famille === 'defaut' && !e.ordreTravailRef && !e.acquitte)
        out.push({ cle: `tel-${e.id}`, categorie: 'vehicule', gravite, titre: `Défaut moteur ${e.codeObd ?? ''}`.trim(), message: `${e.plaque} · ${e.detail ?? def.libelle}`, ...base })
      else if (e.famille === 'signal' && !e.finLe && !e.acquitte)
        out.push({ cle: `tel-${e.id}`, categorie: 'vehicule', gravite, titre: def.libelle, message: `${e.plaque} · ${e.lieu ?? ''}`, ...base })
    })
    return out
  })

  /** Signaux retenus par les règles : catégorie active, gravité imposée le cas échéant. */
  const signauxRegles = computed<Signal[]>(() => signaux.value
    .filter(x => regles.value[x.categorie]?.actif !== false)
    .map(x => { const g = regles.value[x.categorie]?.gravite; return g && g !== 'selon_cas' ? { ...x, gravite: g } : x }))

  const etats = ref<Record<string, EtatAlerte>>({})
  try { const b = localStorage.getItem(CLE_ETATS); if (b) etats.value = JSON.parse(b) } catch { /* vide */ }
  watch(etats, v => { try { localStorage.setItem(CLE_ETATS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  /** Chaque signal devient une alerte conservée ; une situation qui disparaît sans
   *  traitement est marquée résolue d'elle-même ; l'escalade s'horodate une fois. */
  function synchroniser() {
    const actifs = new Set<string>()
    const instant = maintenantMs()
    signauxRegles.value.forEach(s => {
      actifs.add(s.cle)
      const e = etats.value[s.cle]
      if (!e) etats.value[s.cle] = { ...s, emiseLe: maintenant().toISOString(), statut: 'nouvelle' }
      else if (e.statut === 'resolue') { e.statut = 'nouvelle'; e.resolueLe = undefined; e.emiseLe = maintenant().toISOString(); e.escaladeeLe = undefined; e.escaladeeVers = undefined }
      else Object.assign(e, { titre: s.titre, message: s.message, gravite: s.gravite, query: s.query, vehiculeId: s.vehiculeId })
      const cible = etats.value[s.cle]!
      const regle = regles.value[s.categorie]
      cible.emiseLe ??= maintenant().toISOString()
      /* Le délai court depuis le début de la situation (échéance, détection), sinon depuis l'émission. */
      const debut = new Date(cible.depuis).getTime()
      const depart = Number.isFinite(debut) && debut <= instant ? debut : new Date(cible.emiseLe).getTime()
      if (cible.statut !== 'traitee' && !cible.escaladeeLe && regle && instant - depart > regle.delaiHeures * 3_600_000)
        { cible.escaladeeLe = new Date(depart + regle.delaiHeures * 3_600_000).toISOString(); cible.escaladeeVers = regle.niveau }
    })
    Object.values(etats.value).forEach(e => {
      if (!actifs.has(e.cle) && (e.statut === 'nouvelle' || e.statut === 'prise_en_charge')) { e.statut = 'resolue'; e.resolueLe = maintenant().toISOString() }
    })
  }
  watch(signauxRegles, synchroniser, { immediate: true })
  if (typeof window !== 'undefined') window.setInterval(synchroniser, 60_000)
  watch(regles, synchroniser, { deep: true })

  /** Chacun voit les alertes dont il est destinataire ; l'administrateur les voit toutes. */
  const auth = useAuthStore()
  const visible = (e: EtatAlerte) => !auth.role || auth.role === 'admin' || (regles.value[e.categorie]?.destinataires ?? []).includes(auth.role)
    || (!!e.escaladeeLe && e.escaladeeVers === auth.role)
  const toutes = computed(() => Object.values(etats.value).filter(visible).sort((a, b) => b.depuis.localeCompare(a.depuis)))
  const enCours = computed(() => toutes.value.filter(e => e.statut === 'nouvelle' || e.statut === 'prise_en_charge'))
  const escaladees = computed(() => enCours.value.filter(e => e.escaladeeLe))

  function prendreEnCharge(cle: string, par: string): { ok: boolean; motif?: string } {
    const e = etats.value[cle]; if (!e) return { ok: false, motif: 'Alerte introuvable.' }
    if (e.statut !== 'nouvelle') return { ok: false, motif: 'Cette alerte est déjà prise en charge ou traitée.' }
    e.statut = 'prise_en_charge'; e.prisePar = par; e.priseLe = maintenant().toISOString()
    return { ok: true }
  }
  function traiter(cle: string, par: string, commentaire: string): { ok: boolean; motif?: string } {
    const e = etats.value[cle]; if (!e) return { ok: false, motif: 'Alerte introuvable.' }
    if (e.statut === 'traitee' || e.statut === 'resolue') return { ok: false, motif: 'Cette alerte est déjà close.' }
    if (!commentaire.trim()) return { ok: false, motif: 'Indiquez ce qui a été fait.' }
    e.statut = 'traitee'; e.traiteePar = par; e.traiteeLe = maintenant().toISOString(); e.commentaire = commentaire.trim()
    e.prisePar ??= par; e.priseLe ??= e.traiteeLe
    return { ok: true }
  }

  /** Mesure de l'utilité : part traitée, délai moyen de traitement, part escaladée. */
  const statistiques = computed(() => {
    const closes = toutes.value.filter(e => e.statut === 'traitee')
    const delais = closes.map(e => (new Date(e.traiteeLe!).getTime() - new Date(e.emiseLe ?? e.depuis).getTime()) / 3_600_000).filter(h => h >= 0)
    return {
      total: toutes.value.length, traitees: closes.length, resolues: toutes.value.filter(e => e.statut === 'resolue').length,
      escaladees: toutes.value.filter(e => e.escaladeeLe).length,
      delaiMoyenH: delais.length ? Math.round(delais.reduce((s, x) => s + x, 0) / delais.length) : null,
    }
  })
  const enCoursDuVehicule = (vehiculeId: string) => enCours.value.filter(e => e.vehiculeId === vehiculeId)
  return { regles, reinitialiserRegles, basculerDestinataire, signaux, etats, toutes, enCours, escaladees, enCoursDuVehicule, prendreEnCharge, traiter, statistiques }
})
