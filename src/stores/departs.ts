import { maintenant, decaler } from '../utils/horloge'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { AutorisationDepart, ControleConducteurDepart, ControleDepart, ResultatControleDepart } from '../types'
import { POINTS_CHECKLIST_ROUTE, useControlesStore } from './controles'
import { useDocumentsStore } from './documentsPersonnel'
import { useDocumentsVehiculeStore } from './documentsVehicule'
import { useVoyagesStore } from './voyages'
import { useVehiculeStore } from './vehicules'
import { useConfigurationStore } from './configuration'
import { LIBELLE_TYPE_DOC } from './documentsPersonnel'
import { useTypesEquipementsStore } from './typesEquipements'

export const LIB_CONTROLE_DEPART: Record<ControleDepart, string> = {
  checklist: 'Contrôle avant départ conforme',
  documents_chauffeur: 'Documents conducteur valides',
  documents_vehicule: 'Documents véhicule valides',
  repos: 'Temps de repos du conducteur respecté',
  vehicule: 'Véhicule disponible',
  conducteur: 'Contrôle du conducteur',
}
/** Libellé d'un contrôle : celui du contrôle paramétré pour le conducteur. */
export const libelleControleDepart = (c: ResultatControleDepart) => c.libelle ?? LIB_CONTROLE_DEPART[c.controle]
/** Un contrôle du conducteur non bloquant n'empêche pas le départ. */
export const controleBloque = (c: ResultatControleDepart) => !c.conforme && (c.controle !== 'conducteur' || c.bloquant !== false)

/** Contrôles du conducteur proposés au départ, modifiables dans Configuration > Sécurité. */
export const CONTROLES_CONDUCTEUR_DEFAUT: ControleConducteurDepart[] = [
  { code: 'ALC', libelle: 'Test alcool et drogue négatif', bloquant: true, actif: true },
  { code: 'BRF', libelle: 'Briefing sécurité réalisé', bloquant: true, actif: true },
]
const CLE_CONTROLES_CONDUCTEUR = 'fms-ucodis-controles-conducteur'
const CLE_AUTORISATIONS = 'fms-ucodis-autorisations-depart'
const conformesDemo = (par: string, le: string) => Object.fromEntries(CONTROLES_CONDUCTEUR_DEFAUT.map(c => [c.code, { conforme: true, par, le }]))
const resultatsDemo = (): ResultatControleDepart[] => CONTROLES_CONDUCTEUR_DEFAUT.map(c => ({ controle: 'conducteur', code: c.code, libelle: c.libelle, bloquant: c.bloquant, conforme: true, renseigne: true }))

/** Tournée de carburant en cours de démonstration (OT-2026-04452) : partie avec son départ accordé, comme tout voyage en cours. */
const AUTORISATION_CARBURANT_DEMO = (): AutorisationDepart => ({
  id: 'AUT-004', reference: 'AUT-2026-0214', voyageId: 'VOY-017', voyageRef: 'VOY-2026-0163',
  vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
  demandeeLe: decaler('2026-09-04T06:32:00'),
  /* Contrôles relevés au moment de la décision, comme pour tout départ accordé. */
  controles: [
    { controle: 'checklist', conforme: true },
    { controle: 'vehicule', conforme: true },
    { controle: 'documents_vehicule', conforme: true },
    { controle: 'documents_chauffeur', conforme: true },
    { controle: 'repos', conforme: true, detail: 'Aucun voyage récent avant ce départ.' },
    ...resultatsDemo(),
  ],
  saisiesConducteur: conformesDemo('Hery Andriamalala', decaler('2026-09-04T06:33:00')),
  accordee: true, decidePar: 'Hery Andriamalala', decideLe: decaler('2026-09-04T06:40:00'),
  suiviActiveLe: decaler('2026-09-04T06:41:00'),
  checklistDepart: Object.fromEntries(POINTS_CHECKLIST_ROUTE.map(p => [p.code, true])),
  checklistValideeLe: decaler('2026-09-04T06:34:00'),
})

/**
 * Autorisations de départ (FMS-SC-04) : contrôle avant départ, véhicule
 * disponible, pièces du véhicule et du chauffeur, temps de repos. Tous doivent
 * être conformes avant qu'un départ soit accordé ; la délivrance active le
 * suivi GPS et, s'il y en a une, la caméra du véhicule.
 */
export const useDepartsStore = defineStore('departs', () => {
  const autorisations = ref<AutorisationDepart[]>([
    {
      id: 'AUT-001', reference: 'AUT-2026-0213', voyageId: 'VOY-004', voyageRef: 'VOY-2026-0150',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA', chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      demandeeLe: decaler('2026-09-04T06:02:00'),
      controles: [
        { controle: 'checklist', conforme: true },
        { controle: 'documents_chauffeur', conforme: true },
        { controle: 'documents_vehicule', conforme: true },
      ],
      saisiesConducteur: conformesDemo('Hery Andriamalala', decaler('2026-09-04T06:00:00')),
      accordee: false,
    },
    {
      id: 'AUT-002', reference: 'AUT-2026-0212', voyageId: 'VOY-002', voyageRef: 'VOY-2026-0149',
      vehiculeId: 'v-tr-3', vehiculePlaque: '4023 TBA', chauffeurId: 'p-012', chauffeurNom: 'Tiana Rasolofoson',
      demandeeLe: decaler('2026-09-03T06:05:00'),
      controles: [
        { controle: 'checklist', conforme: true },
        { controle: 'documents_chauffeur', conforme: true },
        { controle: 'documents_vehicule', conforme: true },
        ...resultatsDemo(),
      ],
      saisiesConducteur: conformesDemo('Hery Andriamalala', decaler('2026-09-03T06:03:00')),
      accordee: true, decidePar: 'Hery Andriamalala', decideLe: decaler('2026-09-03T06:08:00'),
      suiviActiveLe: decaler('2026-09-03T06:10:00'),
      checklistDepart: Object.fromEntries(POINTS_CHECKLIST_ROUTE.map(p => [p.code, true])),
      checklistValideeLe: decaler('2026-09-03T06:04:00'),
    },
    {
      id: 'AUT-003', reference: 'AUT-2026-0211', voyageId: 'VOY-001', voyageRef: 'VOY-2026-0148',
      vehiculeId: 'v-tr-1', vehiculePlaque: '4021 TBA', chauffeurId: 'p-010', chauffeurNom: 'Solofo Rakotomanga',
      demandeeLe: decaler('2026-08-24T05:45:00'),
      controles: [
        { controle: 'checklist', conforme: false, detail: "Essuie-glace côté passager usé - poursuite acceptée avec réserve." },
        { controle: 'documents_chauffeur', conforme: false, detail: "Absence du duplicata de la visite médicale sur place." },
        { controle: 'documents_vehicule', conforme: true },
        ...resultatsDemo(),
      ],
      saisiesConducteur: conformesDemo('Hery Andriamalala', decaler('2026-08-24T05:46:00')),
      accordee: false, decidePar: 'Hery Andriamalala', decideLe: decaler('2026-08-24T05:48:00'),
      motifRefus: 'Deux contrôles non conformes : régularisation requise avant tout nouveau départ.',
    },
    AUTORISATION_CARBURANT_DEMO(),
  ])

  try { const b = localStorage.getItem(CLE_AUTORISATIONS); if (b) autorisations.value = JSON.parse(b) } catch { /* démonstration */ }
  /* Autorisations enregistrées avant la tournée de carburant en cours de démonstration. */
  if (!autorisations.value.some(a => a.id === 'AUT-004')) autorisations.value.push(AUTORISATION_CARBURANT_DEMO())
  watch(autorisations, v => { try { localStorage.setItem(CLE_AUTORISATIONS, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })

  /** Contrôles du conducteur paramétrés (libellé, bloquant, actif). */
  const controlesConducteur = ref<ControleConducteurDepart[]>(CONTROLES_CONDUCTEUR_DEFAUT.map(c => ({ ...c })))
  try { const b = localStorage.getItem(CLE_CONTROLES_CONDUCTEUR); if (b) controlesConducteur.value = JSON.parse(b) } catch { /* défaut */ }
  watch(controlesConducteur, v => { try { localStorage.setItem(CLE_CONTROLES_CONDUCTEUR, JSON.stringify(v)) } catch { /* ignoré */ } }, { deep: true })
  const controlesConducteurActifs = computed(() => controlesConducteur.value.filter(c => c.actif))
  const normaliser = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  function ajouterControleConducteur(libelle: string, bloquant: boolean): { ok: boolean; motif?: string } {
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Saisissez le libellé du contrôle.' }
    if (controlesConducteur.value.some(c => normaliser(c.libelle) === normaliser(l))) return { ok: false, motif: `Le contrôle « ${l} » existe déjà.` }
    let n = controlesConducteur.value.length + 1
    while (controlesConducteur.value.some(c => c.code === `C${n}`)) n++
    controlesConducteur.value.push({ code: `C${n}`, libelle: l, bloquant, actif: true })
    return { ok: true }
  }
  function renommerControleConducteur(code: string, libelle: string): { ok: boolean; motif?: string } {
    const c = controlesConducteur.value.find(x => x.code === code)
    if (!c) return { ok: false, motif: 'Contrôle introuvable.' }
    const l = libelle.trim()
    if (!l) return { ok: false, motif: 'Le libellé du contrôle ne peut pas être vide.' }
    if (controlesConducteur.value.some(x => x.code !== code && normaliser(x.libelle) === normaliser(l))) return { ok: false, motif: `Le contrôle « ${l} » existe déjà.` }
    c.libelle = l
    return { ok: true }
  }
  function reinitialiserControlesConducteur() { controlesConducteur.value = CONTROLES_CONDUCTEUR_DEFAUT.map(c => ({ ...c })) }

  const getById = (id: string) => autorisations.value.find(a => a.id === id)
  const docsP = useDocumentsStore()
  const docsV = useDocumentsVehiculeStore()
  const voyages = useVoyagesStore()
  const vehicules = useVehiculeStore()
  const config = useConfigurationStore()

  /** Contrôles calculés à l'instant : pièces du véhicule et du chauffeur, temps
   *  de repos. Une autorisation décidée garde ceux du moment de la décision. */
  function controlesEnDirect(a: AutorisationDepart) {
    const out: ResultatControleDepart[] = []
    const saisi = (c: ControleDepart) => a.controles.find(x => x.controle === c)
    const ck = saisi('checklist')
    /* Chaque point actif doit être noté : un point ajouté depuis la validation reste à renseigner. */
    const nonNotes = a.checklistValideeLe ? useControlesStore().pointsActifs.filter(p => typeof a.checklistDepart?.[p.code] !== 'boolean') : []
    out.push(!ck || !a.checklistValideeLe ? { controle: 'checklist', conforme: false, detail: 'Contrôle avant départ non réalisé.' }
      : nonNotes.length ? { controle: 'checklist', conforme: false, detail: `Points non renseignés : ${nonNotes.map(p => p.libelle).join(', ')}.` } : ck)
    /* Un véhicule en maintenance, immobilisé ou hors service ne part pas. */
    const veh = vehicules.parId(a.vehiculeId)
    out.push(veh && vehicules.estUtilisable(veh)
      ? { controle: 'vehicule', conforme: true }
      : { controle: 'vehicule', conforme: false, detail: veh ? `${vehicules.LIBELLES_STATUT[veh.statut]}${veh.motifIndisponibilite ? ` : ${veh.motifIndisponibilite}` : ''}.` : 'Véhicule introuvable.' })
    const manqV = docsV.manquants(a.vehiculeId)
    out.push({ controle: 'documents_vehicule', conforme: !manqV.length, detail: manqV.length ? `Non en règle : ${manqV.map(t => t.libelle).join(', ')}.` : undefined })
    if (a.chauffeurId) {
      const manq = docsP.piecesManquantes(a.chauffeurId).map(c => LIBELLE_TYPE_DOC[c] ?? c)
      out.push({ controle: 'documents_chauffeur', conforme: !manq.length, detail: manq.length ? `Non en règle : ${manq.join(', ')}.` : undefined })
    } else out.push({ controle: 'documents_chauffeur', conforme: false, detail: 'Aucun conducteur désigné.' })
    out.push(controleRepos(a))
    out.push(...controlesConducteurEnDirect(a))
    return out
  }
  /** Contrôles du conducteur actifs, tels que cochés sur la fiche. */
  function controlesConducteurEnDirect(a: AutorisationDepart): ResultatControleDepart[] {
    return controlesConducteurActifs.value.map(c => {
      const s = a.saisiesConducteur?.[c.code]
      const base = { controle: 'conducteur' as const, code: c.code, libelle: c.libelle, bloquant: c.bloquant }
      if (!s) return { ...base, conforme: false, renseigne: false, detail: 'Non renseigné.' }
      return { ...base, conforme: s.conforme, renseigne: true, detail: s.commentaire?.trim() || (s.conforme ? undefined : 'Non conforme.') }
    })
  }
  /** Repos avant le départ : repos depuis la dernière arrivée et repos
   *  hebdomadaire (une période continue sans voyage d'au moins le seuil
   *  réglé sur les sept jours qui précèdent le départ). */
  function controleRepos(a: AutorisationDepart): ResultatControleDepart {
    if (!a.chauffeurId) return { controle: 'repos', conforme: false, detail: 'Aucun conducteur désigné.' }
    const min = config.parametres.reposMinAvantDepartH
    const hebdo = config.parametres.trhMinH
    const depart = new Date(a.demandeeLe).getTime()
    const arrondi = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10
    const autres = voyages.voyages.filter(v => v.chauffeurId === a.chauffeurId && v.id !== a.voyageId && v.dateDepartReel && v.dateDepartReel <= a.demandeeLe)
    const motifs: string[] = []
    const details: string[] = []
    const arrivees = autres.filter(v => v.dateArriveeReelle && v.dateArriveeReelle <= a.demandeeLe).map(v => v.dateArriveeReelle!).sort()
    const derniere = arrivees[arrivees.length - 1]
    if (derniere && min > 0) {
      const h = arrondi(depart - new Date(derniere).getTime())
      ;(h >= min ? details : motifs).push(`${h} h de repos depuis la dernière arrivée, minimum ${min} h`)
    }
    if (hebdo > 0) {
      const debutFenetre = depart - 7 * 86_400_000
      /* Un voyage sans arrivée occupe le conducteur jusqu'au départ demandé. */
      const periodes = autres.map(v => ({ debut: new Date(v.dateDepartReel!).getTime(), fin: v.dateArriveeReelle ? Math.min(new Date(v.dateArriveeReelle).getTime(), depart) : depart }))
        .filter(x => x.fin > debutFenetre).sort((x, y) => x.debut - y.debut)
      let repere = debutFenetre
      let plusLong = 0
      periodes.forEach(x => { plusLong = Math.max(plusLong, x.debut - repere); repere = Math.max(repere, x.fin) })
      plusLong = Math.max(plusLong, depart - repere)
      const h = arrondi(plusLong)
      if (h >= hebdo) details.push(`repos hebdomadaire de ${h} h sur les sept jours précédant le départ, minimum ${hebdo} h`)
      else motifs.push(`aucun repos continu de ${hebdo} h sur les sept jours précédant le départ (le plus long : ${h} h)`)
    }
    if (motifs.length) return { controle: 'repos', conforme: false, detail: `${motifs.join(' ; ')}.`.replace(/^./, m => m.toUpperCase()) }
    return { controle: 'repos', conforme: true, detail: details.length ? `${details.join(' ; ')}.`.replace(/^./, m => m.toUpperCase()) : 'Aucun voyage récent avant ce départ.' }
  }
  const controlesDe = (a: AutorisationDepart) => a.decideLe ? a.controles : controlesEnDirect(a)

  /** Demande d'autorisation pour un voyage prêt à partir. */
  function demander(voyageId: string, par: string): { ok: boolean; id?: string; motif?: string } {
    const v = voyages.voyages.find(x => x.id === voyageId)
    if (!v) return { ok: false, motif: 'Voyage introuvable.' }
    if (!v.vehiculeId || !v.chauffeurId) return { ok: false, motif: 'Le voyage doit avoir un véhicule et un conducteur.' }
    if (autorisations.value.some(a => a.voyageId === voyageId && (!a.decideLe || a.accordee))) return { ok: false, motif: 'Une autorisation est déjà en cours ou accordée pour ce voyage.' }
    let n = autorisations.value.length + 1
    while (autorisations.value.some(a => a.id === `AUT-${String(n).padStart(3, '0')}`)) n++
    const id = `AUT-${String(n).padStart(3, '0')}`
    const annee = String(maintenant().getFullYear())
    const numero = Math.max(0, ...autorisations.value.filter(x => x.reference.startsWith(`AUT-${annee}-`)).map(x => Number(x.reference.split('-')[2]) || 0)) + 1
    autorisations.value.unshift({ id, reference: `AUT-${annee}-${String(numero).padStart(4, '0')}`, voyageId: v.id, voyageRef: v.reference,
      vehiculeId: v.vehiculeId, vehiculePlaque: v.vehiculePlaque ?? '', chauffeurId: v.chauffeurId, chauffeurNom: v.chauffeurNom ?? '',
      demandeeLe: maintenant().toISOString(), demandeePar: par, controles: [], accordee: false })
    return { ok: true, id }
  }
  /** Caméra : un équipement opérationnel dont le type porte la propriété « caméra ». */
  const typesEq = useTypesEquipementsStore()
  const aCamera = (vehiculeId: string) => vehicules.equipementsDe(vehiculeId).some(e => !!typesEq.get(e.type)?.camera && e.etat === 'operationnel')
  const enAttente = computed(() => autorisations.value.filter(a => !a.decideLe))
  const accordees = computed(() => autorisations.value.filter(a => !!a.decideLe && a.accordee))
  const refusees = computed(() => autorisations.value.filter(a => !!a.decideLe && !a.accordee))

  function nbConformes(a: AutorisationDepart) { return controlesDe(a).filter(c => c.conforme).length }

  /** Coche un contrôle du conducteur conforme ou non conforme, avec un commentaire éventuel. */
  function saisirControleConducteur(id: string, code: string, conforme: boolean, commentaire: string, par: string): { ok: boolean; motif?: string } {
    const a = getById(id)
    if (!a) return { ok: false, motif: 'Autorisation introuvable.' }
    if (a.decideLe) return { ok: false, motif: 'Autorisation déjà décidée : ses contrôles ne se modifient plus.' }
    const c = controlesConducteurActifs.value.find(x => x.code === code)
    if (!c) return { ok: false, motif: 'Ce contrôle n\'est plus actif.' }
    a.saisiesConducteur = { ...(a.saisiesConducteur ?? {}), [code]: { conforme, commentaire: commentaire.trim() || undefined, par, le: maintenant().toISOString() } }
    return { ok: true }
  }

  /** Valide le contrôle avant départ, chaque point noté « Conforme » ou
   *  « Anomalie » comme dans la checklist ; rien n'est présumé conforme.
   *  Le contrôle est conforme s'il n'y a aucune anomalie. */
  function validerChecklistDepart(id: string, saisie: Record<string, boolean | undefined>): { ok: boolean; motif?: string } {
    const a = getById(id)
    if (!a) return { ok: false, motif: 'Autorisation introuvable.' }
    if (a.decideLe) return { ok: false, motif: 'Autorisation déjà décidée : son contrôle ne se modifie plus.' }
    const points = useControlesStore().pointsActifs
    const manquants = points.filter(p => typeof saisie[p.code] !== 'boolean')
    if (manquants.length) return { ok: false, motif: `Notez chaque point : ${manquants.map(p => p.libelle).join(', ')}.` }
    const resultats: Record<string, boolean> = Object.fromEntries(points.map(p => [p.code, saisie[p.code] as boolean]))
    a.checklistDepart = resultats
    a.checklistValideeLe = maintenant().toISOString()
    const tousConformes = Object.values(resultats).every(v => v)
    const libelles = useControlesStore().pointsActifs
    const enDefaut = Object.entries(resultats).filter(([, v]) => !v).map(([k]) => libelles.find(p => p.code === k)?.libelle ?? k)
    a.controles = [...a.controles.filter(x => x.controle !== 'checklist'), { controle: 'checklist', conforme: tousConformes, detail: tousConformes ? undefined : `Anomalie : ${enDefaut.join(', ')}.` }]
    return { ok: true }
  }

  function accorder(id: string, par: string): { ok: boolean; motif?: string } {
    const a = getById(id)
    if (!a || a.decideLe) return { ok: false, motif: 'Autorisation déjà décidée.' }
    const ctrl = controlesEnDirect(a)
    const bloquants = ctrl.filter(controleBloque)
    if (bloquants.length) return { ok: false, motif: `Départ bloqué : ${bloquants.map(c => `${libelleControleDepart(c).toLowerCase()} (${(c.detail ?? 'non conforme').replace(/\.$/, '').replace(/^./, m => m.toLowerCase())})`).join(' ; ')}.` }
    a.controles = ctrl
    if (aCamera(a.vehiculeId)) a.cameraActiveeLe = maintenant().toISOString()
    a.accordee = true
    a.decidePar = par
    a.decideLe = maintenant().toISOString()
    a.suiviActiveLe = maintenant().toISOString()
    return { ok: true }
  }
  function refuser(id: string, par: string, motif: string) {
    const a = getById(id)
    if (!a || a.decideLe || !motif.trim()) return
    a.controles = controlesEnDirect(a)
    a.accordee = false
    a.decidePar = par
    a.decideLe = maintenant().toISOString()
    a.motifRefus = motif
  }

  function peutPartir(a: AutorisationDepart) { return !controlesDe(a).some(controleBloque) }

  return { autorisations, getById, enAttente, accordees, refusees, nbConformes, peutPartir, validerChecklistDepart, accorder, refuser, controlesDe, demander, aCamera,
    controlesConducteur, controlesConducteurActifs, ajouterControleConducteur, renommerControleConducteur, reinitialiserControlesConducteur, saisirControleConducteur }
})
