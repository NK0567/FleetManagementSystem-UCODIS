import { useAlertesStore } from './alertes'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useVehiculeStore } from './vehicules'
import { useTypesDocumentsStore } from './typesDocuments'
import { useReglesDocumentsStore } from './reglesDocuments'
import { useMaintenanceStore } from './maintenance'
import { useCodificationIndispoStore } from './codificationIndispo'
import { etatEcheance } from '../utils/helpers'
import { dansNJours, aujourdhuiISO } from '../utils/horloge'
import type { PieceJointe, StatutSaisiDocument, EtatDocument } from '../types'

export interface DocumentVehicule {
  id: string
  vehiculeId: string
  /** Code du type, dans le référentiel des types de documents. */
  type: string
  nom?: string
  numero?: string
  dateEmission?: string
  /** Date de fin de validité ; absente pour un document à validité illimitée. */
  echeance?: string
  delaiNotificationJours?: number
  scan?: PieceJointe
  statutSaisi?: StatutSaisiDocument
  motifStatut?: string
  archive?: boolean
  remplacePar?: string
}

/**
 * Documents des véhicules (FMS-SC-01). L'état (valide, proche de
 * l'échéance, expiré) n'est jamais enregistré : il se calcule à partir des
 * dates, selon le délai de notification du document ou de son type. Seuls
 * « annulé » et « perdu » se saisissent. Un véhicule dont un document
 * obligatoire manque ou est expiré n'est pas en règle ; sans régularisation
 * dans le délai d'escalade, il devient indisponible pour cause réglementaire.
 */
export const useDocumentsVehiculeStore = defineStore('documentsVehicule', () => {
  const vehicules = useVehiculeStore()
  const types = useTypesDocumentsStore()
  const regles = useReglesDocumentsStore()

  const ORDRE = ['carte_grise', 'assurance', 'visite_technique', 'vignette', 'carte_fiscale']
  function seed(): DocumentVehicule[] {
    const out: DocumentVehicule[] = []
    let n = 1
    const echeances = [dansNJours(400), dansNJours(280), dansNJours(150), dansNJours(90), dansNJours(365), dansNJours(200), dansNJours(120), dansNJours(60), dansNJours(-6), dansNJours(18), dansNJours(500)]
    const PREFIXE: Record<string, string> = { carte_grise: 'CG', assurance: 'ARO', visite_technique: 'VT', vignette: 'VIG', carte_fiscale: 'CF' }
    let i = 0
    vehicules.liste.forEach(v => {
      ORDRE.forEach(code => {
        const echeance = echeances[i % echeances.length]!
        i++
        const def = types.get(code)
        if (!def || (def.appliqueA.length && !def.appliqueA.includes(v.type))) return
        if (code === 'carte_fiscale' && i % 3 !== 0) return
        const illimite = def.validite === 'illimitee'
        const dateEmission = illimite ? `${v.annee ?? 2022}-0${(n % 9) + 1}-10` : new Date(new Date(echeance).getTime() - (def.dureeMois ?? 12) * 30.4 * 86_400_000).toISOString().slice(0, 10)
        out.push({ id: `dv-${n}`, vehiculeId: v.id, type: code, echeance: illimite ? undefined : echeance, dateEmission, numero: `${PREFIXE[code]}-2026-${String(1000 + n).slice(-4)}`, scan: { nom: `${code}_${v.immatriculation.replace(/\s/g, '')}.pdf` } })
        n++
      })
    })
    return out
  }

  const liste = ref<DocumentVehicule[]>(seed())

  /** Délai du document, sinon celui de son type. */
  function delaiDe(doc: DocumentVehicule) { return doc.delaiNotificationJours ?? types.get(doc.type)?.delaiNotificationJours ?? 0 }
  function etat(doc: DocumentVehicule): EtatDocument {
    if (doc.statutSaisi) return doc.statutSaisi
    if (types.get(doc.type)?.validite === 'illimitee') return 'valide'
    return etatEcheance(doc.echeance, delaiDe(doc))
  }
  const libelle = (doc: DocumentVehicule) => doc.nom || types.libelle(doc.type)
  const actifs = computed(() => liste.value.filter(d => !d.archive && !d.remplacePar))

  let prochainId = liste.value.length + 1
  function verifier(saisie: Omit<DocumentVehicule, 'id'>): string | null {
    if (!saisie.vehiculeId) return 'Choisissez le véhicule.'
    const def = types.get(saisie.type)
    if (!def) return 'Choisissez le type de document.'
    if (def.validite === 'limitee' && !saisie.echeance) return 'Ce type de document a une validité limitée : indiquez sa date de fin.'
    if (saisie.dateEmission && saisie.echeance && saisie.echeance < saisie.dateEmission) return "La date de fin ne peut pas précéder la date d'émission."
    if (saisie.dateEmission && saisie.dateEmission > aujourdhuiISO()) return "La date d'émission ne peut pas être dans le futur."
    if (saisie.delaiNotificationJours != null && saisie.delaiNotificationJours < 0) return 'Le délai de notification ne peut pas être négatif.'
    return null
  }
  /** Un nouveau document remplace le précédent du même type pour le même véhicule. */
  function creer(saisie: Omit<DocumentVehicule, 'id'>): { ok: boolean; id?: string; motif?: string } {
    const motif = verifier(saisie); if (motif) return { ok: false, motif }
    const id = `dv-perso-${prochainId++}`
    actifs.value.filter(d => d.vehiculeId === saisie.vehiculeId && d.type === saisie.type).forEach(d => { d.remplacePar = id })
    liste.value.push({ ...saisie, id })
    return { ok: true, id }
  }
  function modifier(id: string, saisie: Partial<Omit<DocumentVehicule, 'id'>>): { ok: boolean; motif?: string } {
    const d = liste.value.find(x => x.id === id); if (!d) return { ok: false, motif: 'Document introuvable.' }
    const motif = verifier({ ...d, ...saisie }); if (motif) return { ok: false, motif }
    Object.assign(d, saisie)
    return { ok: true }
  }
  function marquer(id: string, statut: StatutSaisiDocument | undefined, motif?: string): { ok: boolean; motif?: string } {
    const d = liste.value.find(x => x.id === id); if (!d) return { ok: false, motif: 'Document introuvable.' }
    if (statut && !motif?.trim()) return { ok: false, motif: 'Indiquez le motif.' }
    d.statutSaisi = statut; d.motifStatut = statut ? motif!.trim() : undefined
    return { ok: true }
  }
  function supprimer(id: string) {
    const i = liste.value.findIndex(x => x.id === id)
    if (i < 0) return
    // Le document remplacé redevient le document en vigueur.
    liste.value.filter(d => d.remplacePar === id).forEach(d => { d.remplacePar = undefined })
    liste.value.splice(i, 1)
  }

  function documentsDe(vehiculeId: string) { return actifs.value.filter(d => d.vehiculeId === vehiculeId) }
  /** Types obligatoires pour ce véhicule sans document en cours de validité. */
  function manquants(vehiculeId: string) {
    const v = vehicules.parId(vehiculeId); if (!v) return []
    return types.obligatoires('vehicule', v.type).filter(t => !documentsDe(vehiculeId).some(d => d.type === t.code && ['valide', 'proche'].includes(etat(d))))
  }
  /** En règle : chaque document obligatoire est présent et en cours de validité. */
  function enRegle(vehiculeId: string) { return manquants(vehiculeId).length === 0 }
  const vehiculesNonConformes = computed(() => vehicules.liste.filter(v => v.statut !== 'sorti' && !enRegle(v.id)))

  const critiques = computed(() => actifs.value.filter(d => ['expire', 'annule', 'perdu'].includes(etat(d))))
  const avertissements = computed(() => actifs.value.filter(d => etat(d) === 'proche'))
  const alertesActives = computed(() => [...critiques.value, ...avertissements.value])

  /** Date à laquelle la notification part (e-mail, SMS), selon le délai du document. */
  function notificationLe(doc: DocumentVehicule) {
    if (!doc.echeance || types.get(doc.type)?.validite === 'illimitee') return null
    return new Date(new Date(doc.echeance).getTime() - delaiDe(doc) * 86_400_000).toISOString().slice(0, 10)
  }

  /* ── Escalade et indisponibilité réglementaire ─────────────── */
  /** Escalade de l'alerte d'un document expiré : le délai des règles d'alerte, compté depuis l'expiration. */
  function escaladeLe(doc: DocumentVehicule) {
    if (!doc.echeance || etat(doc) !== 'expire') return null
    return new Date(new Date(doc.echeance).getTime() + useAlertesStore().regles.document.delaiHeures * 3_600_000).toISOString().slice(0, 10)
  }
  /** Documents obligatoires hors validité : le véhicule devient indisponible dès l'expiration (FMS-MA-02, SC-01). */
  const escalades = computed(() => actifs.value.filter(d => !!types.get(d.type)?.obligatoire && ['expire', 'annule', 'perdu'].includes(etat(d))))
  /** Immobilisations ouvertes pour un document obligatoire hors validité, par véhicule. */
  const indisposAuto = ref<Record<string, string>>({})
  /** Mention portée par une autre indisponibilité déjà ouverte sur le véhicule. */
  const MENTION = ' · Document obligatoire hors validité : '
  const sansMention = (c?: string) => (c && c.includes(MENTION) ? c.slice(0, c.indexOf(MENTION)) : c)
  /** Un véhicule n'a qu'une indisponibilité ouverte. Si une autre cause l'est
   *  déjà, la cause réglementaire y est mentionnée, et son indisponibilité
   *  propre s'ouvre dès que l'autre se ferme. */
  function appliquerEscalades() {
    const maintenance = useMaintenanceStore()
    const codif = useCodificationIndispoStore()
    const code = codif.codes.find(c => c.code === regles.parametres.codeIndispoReglementaire)?.code
      ?? codif.codes.find(c => c.famille === 'reglementaire')?.code
    if (!code) return
    const ouverte = (vehiculeId: string) => maintenance.indisponibilites.find(i => i.vehiculeId === vehiculeId && !i.fin)
    const parVehicule = new Map<string, DocumentVehicule[]>()
    escalades.value.forEach(d => parVehicule.set(d.vehiculeId, [...(parVehicule.get(d.vehiculeId) ?? []), d]))
    // Une indisponibilité fermée (levée, ordre de travail clôturé) ne compte plus comme traitée.
    Object.entries(indisposAuto.value).forEach(([vehiculeId, indId]) => {
      if (!maintenance.indisponibilites.some(i => i.id === indId && !i.fin)) delete indisposAuto.value[vehiculeId]
    })
    parVehicule.forEach((docs, vehiculeId) => {
      if (indisposAuto.value[vehiculeId]) return
      const v = vehicules.parId(vehiculeId); if (!v || v.statut === 'sorti') return
      const libs = docs.map(libelle).join(', ')
      const enCours = ouverte(vehiculeId)
      if (enCours?.code === code && !enCours.ordreTravailId) { indisposAuto.value[vehiculeId] = enCours.id; return }
      if (enCours) {
        const texte = `${MENTION}${libs}`
        if (!enCours.commentaire?.endsWith(texte)) enCours.commentaire = `${sansMention(enCours.commentaire) ?? ''}${texte}`
        return
      }
      const r = maintenance.declarerIndispo({ vehiculeId, vehiculePlaque: v.immatriculation, code, debut: (docs[0]!.echeance && docs[0]!.echeance <= aujourdhuiISO() ? docs[0]!.echeance : aujourdhuiISO()) + 'T08:00',
        commentaire: `${libs} hors validité` })
      if (r.ok && r.id) indisposAuto.value[vehiculeId] = r.id
    })
    // Régularisation : l'immobilisation ouverte par l'escalade se lève, la mention disparaît.
    Object.entries(indisposAuto.value).forEach(([vehiculeId, indId]) => {
      if (!parVehicule.has(vehiculeId)) { maintenance.leverIndispo(indId, { systeme: true }); delete indisposAuto.value[vehiculeId] }
    })
    maintenance.indisponibilites.forEach(i => { if (!i.fin && i.commentaire?.includes(MENTION) && !parVehicule.has(i.vehiculeId)) i.commentaire = sansMention(i.commentaire) || undefined })
  }
  watch([escalades, () => regles.parametres.codeIndispoReglementaire,
    () => useMaintenanceStore().indisponibilites.filter(i => !i.fin).map(i => i.id).join(',')], appliquerEscalades, { immediate: true })

  return {
    liste, actifs, etat, libelle, delaiDe, critiques, avertissements, alertesActives, documentsDe, manquants, enRegle, vehiculesNonConformes,
    notificationLe, escaladeLe, escalades, indisposAuto, creer, modifier, marquer, supprimer,
  }
})
