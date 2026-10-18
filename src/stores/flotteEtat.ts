import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { LigneEtatFlotte, GroupeEtatFlotte, CodeEtatFlotte, Vehicule, Voyage } from '../types'
import { useVehiculeStore } from './vehicules'
import { useVoyagesStore } from './voyages'
import { usePersonnelStore } from './personnel'
import { useStatutsVehiculesStore } from './statutsVehicules'
import { useTelematiqueStore } from './telematique'
import { aujourdhuiISO, maintenant } from '../utils/horloge'

export interface DefinitionEtatFlotte { code: CodeEtatFlotte; groupe: GroupeEtatFlotte; libelle: string }

/** États de la flotte et leurs valeurs de départ (code et libellé), reprises des
 *  documents de référence ; code et libellé se paramètrent dans la configuration. */
export const ETATS_FLOTTE: DefinitionEtatFlotte[] = [
  { code: 'DISP', groupe: 'operationnel', libelle: 'Disponible, en attente de mission' },
  { code: 'DEP-PRV', groupe: 'operationnel', libelle: 'Départ prévu' },
  { code: 'DEP-REA', groupe: 'operationnel', libelle: 'Départ réalisé' },
  { code: 'RET-VID', groupe: 'operationnel', libelle: 'Retour à vide' },
  { code: 'RET-CHG', groupe: 'operationnel', libelle: 'Retour chargé' },
  { code: 'ANN-VYG', groupe: 'operationnel', libelle: 'Voyage annulé' },
  { code: 'TR-LIV', groupe: 'transit', libelle: 'En transit vers livraison' },
  { code: 'TR-CHG', groupe: 'transit', libelle: 'En transit vers chargement' },
  { code: 'TR-VID', groupe: 'transit', libelle: 'En transit à vide' },
  { code: 'TR-RET', groupe: 'transit', libelle: 'En transit retour base' },
  { code: 'ATT-CHG', groupe: 'attente', libelle: 'En attente de chargement' },
  { code: 'ATT-LIV', groupe: 'attente', libelle: 'En attente de livraison' },
  { code: 'ATT-DEP', groupe: 'attente', libelle: 'En attente de départ' },
  { code: 'ATT-ADM', groupe: 'attente', libelle: 'En attente administrative' },
  { code: 'IMMO', groupe: 'immobilise', libelle: 'Immobilisé' },
]
export const LIB_GROUPE_ETAT: Record<GroupeEtatFlotte, string> = {
  operationnel: 'Opérationnel', transit: 'En transit', attente: 'En attente', immobilise: 'Immobilisé',
}
/** Libellé et code affichés d'un état, selon le paramétrage. */
export function libelleEtat(c: CodeEtatFlotte) { return useFlotteEtatStore().reglagesEtats[c]?.libelle || (ETATS_FLOTTE.find(e => e.code === c)?.libelle ?? c) }
export function codeEtat(c: CodeEtatFlotte) { return useFlotteEtatStore().reglagesEtats[c]?.code || c }
export function groupeDeLEtat(c: CodeEtatFlotte) { return ETATS_FLOTTE.find(e => e.code === c)?.groupe ?? 'attente' }

export interface NoteDuJour { observation: string; remiseEnServicePrevue?: string; par: string; le: string }
export interface ArchiveEtatFlotte { date: string; archiveLe: string; par: string; lignes: LigneEtatFlotte[] }
export interface EnvoiEtatFlotte { date: string; le: string; par: string; destinataires: string[] }

const CLE_NOTES = 'fms-ucodis-etat-flotte-notes'
const CLE_ARCHIVES = 'fms-ucodis-etat-flotte-archives'
const CLE_ENVOIS = 'fms-ucodis-etat-flotte-envois'
const CLE_ETATS = 'fms-ucodis-etat-flotte-codes'
export interface ReglageEtat { code: string; libelle: string }
const reglagesDepart = (): Record<string, ReglageEtat> => Object.fromEntries(ETATS_FLOTTE.map(e => [e.code, { code: e.code, libelle: e.libelle }]))
const charger = <T>(cle: string, defaut: T): T => { try { const b = localStorage.getItem(cle); return b ? JSON.parse(b) as T : defaut } catch { return defaut } }
const persister = (cle: string, v: unknown) => { try { localStorage.setItem(cle, JSON.stringify(v)) } catch { /* ignoré */ } }

/**
 * État de flotte quotidien (FMS-RA-02), produit automatiquement à partir des
 * véhicules, statuts, voyages, affectations et positions : rien ne se
 * ressaisit, sauf l'observation du jour et la date de remise en service
 * prévue, que seul le gestionnaire connaît. L'état d'un jour peut être
 * archivé tel quel, exporté et envoyé par e-mail.
 */
export const useFlotteEtatStore = defineStore('flotteEtat', () => {
  const notes = ref<Record<string, Record<string, NoteDuJour>>>(charger(CLE_NOTES, {}))
  const archives = ref<Record<string, ArchiveEtatFlotte>>(charger(CLE_ARCHIVES, {}))
  const envois = ref<EnvoiEtatFlotte[]>(charger(CLE_ENVOIS, []))
  watch(notes, v => persister(CLE_NOTES, v), { deep: true })
  watch(archives, v => persister(CLE_ARCHIVES, v), { deep: true })
  watch(envois, v => persister(CLE_ENVOIS, v), { deep: true })
  /** Code et libellé affichés de chaque état, paramétrables (valeurs de départ ci-dessus). */
  const reglagesEtats = ref<Record<string, ReglageEtat>>({ ...reglagesDepart(), ...charger<Record<string, ReglageEtat>>(CLE_ETATS, {}) })
  watch(reglagesEtats, v => persister(CLE_ETATS, v), { deep: true })
  function modifierEtat(cle: CodeEtatFlotte, code: string, libelle: string): { ok: boolean; motif?: string } {
    const c = code.trim(); const l = libelle.trim()
    if (!c) return { ok: false, motif: "Le code d'un état ne peut pas être vide." }
    if (!l) return { ok: false, motif: "Le libellé d'un état ne peut pas être vide." }
    const autres = Object.entries(reglagesEtats.value).filter(([k]) => k !== cle)
    if (autres.some(([, r]) => r.code.toLowerCase() === c.toLowerCase())) return { ok: false, motif: `Le code ${c} est déjà utilisé par un autre état.` }
    if (autres.some(([, r]) => r.libelle.toLowerCase() === l.toLowerCase())) return { ok: false, motif: `Le libellé ${l} est déjà utilisé par un autre état.` }
    reglagesEtats.value[cle] = { code: c, libelle: l }
    return { ok: true }
  }
  function reinitialiserEtats() { reglagesEtats.value = reglagesDepart() }

  const dateDuJour = computed(() => aujourdhuiISO())

  function etatVoyage(v: Voyage): CodeEtatFlotte {
    if (v.statut === 'en_cours') {
      const restants = v.etapes.filter(e => !e.franchi)
      if (restants.some(e => e.role === 'chargement')) return 'TR-CHG'
      if (restants.some(e => e.role === 'livraison')) return 'TR-LIV'
      return 'TR-RET'
    }
    return 'DEP-PRV'
  }

  function ligneDe(v: Vehicule): LigneEtatFlotte {
    const veh = useVehiculeStore(); const vo = useVoyagesStore(); const pers = usePersonnelStore()
    const st = useStatutsVehiculesStore().calculer(v)
    const af = veh.affectationActive(v.id); const at = veh.attelageActif(v.id)
    const voyages = vo.voyages.filter(x => x.vehiculeId === v.id)
    const voyage = voyages.find(x => x.statut === 'en_cours') ?? voyages.filter(x => ['planifie', 'confirme', 'pret'].includes(x.statut)).sort((a, b) => a.datePlanifiee.localeCompare(b.datePlanifiee))[0]
    const immobilise = ['en_maintenance', 'immobilise', 'hors_service'].includes(st.statut)
    const pos = veh.positions[v.id]
    const note = notes.value[dateDuJour.value]?.[v.id]
    return {
      vehiculeId: v.id, vehiculePlaque: v.immatriculation,
      semiRemorquePlaque: at ? veh.parId(at.semiRemorqueId)?.immatriculation : undefined,
      chauffeurNom: af ? pers.parId(af.conducteurId)?.nomComplet : undefined,
      /* Sans voyage et non immobilisé : disponible, en attente de mission. */
      etat: immobilise ? 'IMMO' : voyage ? etatVoyage(voyage) : 'DISP',
      codeIndispo: immobilise ? st.cause?.code : undefined,
      motifIndispo: immobilise ? st.cause?.libelle ?? v.motifIndisponibilite : undefined,
      remiseEnServicePrevue: immobilise ? note?.remiseEnServicePrevue : undefined,
      voyageRef: !immobilise ? voyage?.reference : undefined,
      position: pos && veh.aBoitier(v.id) ? useTelematiqueStore().lieuDe(pos) : `${v.site} (sans boîtier)`,
      mission: !immobilise && voyage ? [voyage.marchandise?.typeProduit, voyage.clientNom, voyage.statut === 'en_cours' ? 'en route' : `départ le ${new Date(voyage.datePlanifiee).toLocaleDateString('fr-FR')}`].filter(Boolean).join(' · ') : undefined,
      observation: note?.observation,
    }
  }

  /** Lignes du jour : chaque véhicule motorisé du parc avec sa remorque attelée, puis chaque véhicule tracté non attelé. */
  const lignes = computed<LigneEtatFlotte[]>(() => {
    const veh = useVehiculeStore()
    return [...veh.tracteurs.map(ligneDe), ...veh.semiRemorques.filter(s => !veh.attelageDe(s.id)).map(ligneDe)]
  })

  const parGroupe = (g: GroupeEtatFlotte) => lignes.value.filter(l => groupeDeLEtat(l.etat) === g)
  const operationnels = computed(() => parGroupe('operationnel'))
  const enTransit = computed(() => parGroupe('transit'))
  const enAttente = computed(() => parGroupe('attente'))
  const immobilises = computed(() => parGroupe('immobilise'))

  function noter(vehiculeId: string, observation: string, remiseEnServicePrevue: string | undefined, par: string): { ok: boolean; motif?: string } {
    const obs = observation.trim()
    if (remiseEnServicePrevue && remiseEnServicePrevue < dateDuJour.value) return { ok: false, motif: 'La remise en service prévue ne peut pas être passée.' }
    if (obs.length > 500) return { ok: false, motif: 'Observation limitée à 500 caractères.' }
    const jour = (notes.value[dateDuJour.value] ??= {})
    if (!obs && !remiseEnServicePrevue) { delete jour[vehiculeId]; return { ok: true } }
    jour[vehiculeId] = { observation: obs, remiseEnServicePrevue: remiseEnServicePrevue || undefined, par, le: maintenant().toISOString() }
    return { ok: true }
  }

  /** Fige l'état du jour ; un nouvel archivage du même jour remplace le précédent. */
  function archiver(par: string): { ok: boolean; remplace: boolean } {
    const remplace = !!archives.value[dateDuJour.value]
    archives.value[dateDuJour.value] = { date: dateDuJour.value, archiveLe: maintenant().toISOString(), par, lignes: JSON.parse(JSON.stringify(lignes.value)) }
    return { ok: true, remplace }
  }
  const datesArchivees = computed(() => Object.keys(archives.value).sort().reverse())

  const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  function enregistrerEnvoi(destinataires: string[], par: string): { ok: boolean; motif?: string } {
    const d = [...new Set(destinataires.map(x => x.trim()).filter(Boolean))]
    if (!d.length) return { ok: false, motif: 'Indiquez au moins un destinataire.' }
    const invalide = d.find(x => !emailValide(x))
    if (invalide) return { ok: false, motif: `Adresse invalide : ${invalide}` }
    envois.value.unshift({ date: dateDuJour.value, le: maintenant().toISOString(), par, destinataires: d })
    return { ok: true }
  }

  return { reglagesEtats, modifierEtat, reinitialiserEtats, lignes, dateDuJour, operationnels, enTransit, enAttente, immobilises, parGroupe, notes, noter, archives, archiver, datesArchivees, envois, enregistrerEnvoi, emailValide }
})
