import { maintenant, aujourdhuiISO } from '../utils/horloge'
import { useReglesDocumentsStore } from './reglesDocuments'
import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useVehiculeStore } from './vehicules'
import { useMaintenanceStore } from './maintenance'
import { useVoyagesStore } from './voyages'
import { useCodificationIndispoStore } from './codificationIndispo'
import { useAuthStore } from './auth'
import { useInspectionsStore } from './inspections'
import type { StatutVehicule, Vehicule } from '../types'

/**
 * Statut des véhicules (FMS-DB-02). Il se déduit des faits enregistrés,
 * dans cet ordre de priorité :
 *   sorti du parc (statut administratif) > hors service (choisi à la main,
 *   avec un motif) > en maintenance (immobilisation portée par un ordre de
 *   travail) > immobilisé (immobilisation sans ordre de travail, par exemple
 *   un document expiré, ou une inspection périodique non conforme en attente
 *   de contre-visite, ou un entretien préventif dépassé) > en mission (voyage en cours) > affecté (conducteur
 *   ou attelage en cours) > disponible.
 * La cause d'une indisponibilité accompagne toujours le statut.
 */
export interface CauseStatut { libelle: string; code?: string; ordreTravail?: string; depuis?: string }

export const useStatutsVehiculesStore = defineStore('statutsVehicules', () => {
  const vehicules = useVehiculeStore()
  const maintenance = useMaintenanceStore()
  const voyages = useVoyagesStore()
  const codification = useCodificationIndispoStore()
  const inspections = useInspectionsStore()

  const ENGAGE = ['en_cours']
  function indispoOuverte(id: string) { return maintenance.indisponibilites.find(i => i.vehiculeId === id && !i.fin) ?? null }
  function voyageEnCours(v: Vehicule) {
    return voyages.voyages.find(x => ENGAGE.includes(x.statut) && (x.vehiculeId === v.id || x.semiRemorqueId === v.id)) ?? null
  }

  function calculer(v: Vehicule): { statut: StatutVehicule; cause?: CauseStatut } {
    if (v.sortie) return { statut: 'sorti', cause: { libelle: v.sortie.motif, depuis: v.sortie.date } }
    if (v.statutManuel?.statut === 'hors_service') return { statut: 'hors_service', cause: { libelle: v.statutManuel.motif, code: codification.codeAuto('horsService'), depuis: v.statutManuel.le } }
    const ind = indispoOuverte(v.id)
    if (ind) {
      const lib = codification.codes.find(c => c.code === ind.code)?.libelle ?? ind.code
      return {
        statut: ind.ordreTravailId ? 'en_maintenance' : 'immobilise',
        cause: { libelle: ind.commentaire ? `${lib} : ${ind.commentaire}` : lib, code: ind.code, ordreTravail: ind.ordreTravailId, depuis: ind.debut },
      }
    }
    /* Inspection périodique non conforme : pas apte à charger jusqu'à la contre-visite (FMS-MA-10). */
    const apt = inspections.aptitude(v.id)
    if (!apt.apte) return { statut: 'immobilise', cause: { libelle: apt.motif!, code: codification.codeAuto('inspectionNonConforme'), depuis: apt.inspection?.date } }
    /* Entretien préventif dépassé : indisponible jusqu'à l'intervention (FMS-MA-02). */
    const depassee = maintenance.echeancesDe(v).find(e => e.statut === 'depassee')
    if (depassee) return { statut: 'immobilise', cause: { libelle: `Entretien dépassé : ${depassee.operationLibelle}`, code: codification.codeAuto('entretienDepasse') } }
    const voy = voyageEnCours(v)
    if (voy) return { statut: 'en_mission', cause: { libelle: `Voyage ${voy.reference}` } }
    if (vehicules.affectationActive(v.id) || vehicules.attelageDe(v.id)) return { statut: 'affecte' }
    return { statut: 'disponible' }
  }

  const resultats = computed(() => Object.fromEntries(vehicules.liste.map(v => [v.id, calculer(v)])))
  const causeDe = (id: string) => resultats.value[id]?.cause
  /** Statut administratif, distinct du statut opérationnel. */
  const statutAdministratif = (v: Vehicule) => v.sortie ? 'Sorti du parc' : 'En service'

  /* Le statut enregistré sur le véhicule suit les faits. */
  watch(resultats, r => {
    vehicules.liste.forEach(v => {
      const calc = r[v.id]; if (!calc) return
      if (v.statut !== calc.statut) v.statut = calc.statut
      const motif = calc.statut === 'disponible' || calc.statut === 'affecte' || calc.statut === 'en_mission' ? undefined : calc.cause?.libelle
      if (v.motifIndisponibilite !== motif) v.motifIndisponibilite = motif
    })
  }, { immediate: true })

  /**
   * Choix du statut à la main, sous réserve des règles du statut visé :
   *  · hors service : un motif ;
   *  · immobilisé : un code d'indisponibilité, l'immobilisation est déclarée ;
   *  · en maintenance : la description de la panne, un ordre de travail est ouvert ;
   *  · disponible : seulement si aucun fait ne s'y oppose ;
   *  · affecté et en mission ne se choisissent pas, ils viennent d'une affectation ou d'un voyage.
   */
  function choisir(id: string, statut: StatutVehicule, d: { motif?: string; code?: string }): { ok: boolean; motif?: string } {
    const v = vehicules.parId(id); if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
    const par = useAuthStore().user?.nom ?? 'Utilisateur'
    if (v.sortie) return { ok: false, motif: 'Ce véhicule est sorti du parc.' }
    const actuel = calculer(v)
    switch (statut) {
      case 'hors_service':
        if (!d.motif?.trim()) return { ok: false, motif: 'Indiquez le motif de la mise hors service.' }
        if (voyageEnCours(v)) return { ok: false, motif: 'Un voyage est en cours avec ce véhicule.' }
        v.statutManuel = { statut: 'hors_service', motif: d.motif.trim(), par, le: maintenant().toISOString() }
        return { ok: true }
      case 'immobilise': {
        if (!d.code) return { ok: false, motif: "Choisissez la cause codifiée de l'immobilisation." }
        const r = maintenance.declarerIndispo({ vehiculeId: v.id, vehiculePlaque: v.immatriculation, code: d.code, debut: maintenant().toISOString(), commentaire: d.motif?.trim() || undefined })
        return r
      }
      case 'en_maintenance': {
        if (!d.motif?.trim()) return { ok: false, motif: 'Décrivez la panne ou l’intervention.' }
        if (actuel.statut === 'en_maintenance') return { ok: false, motif: `Le véhicule est déjà en maintenance (${actuel.cause?.ordreTravail}).` }
        maintenance.creerOT({ vehiculeId: v.id, vehiculePlaque: v.immatriculation, origine: 'constat_garage', declarePar: par, declareLe: maintenant().toISOString(),
          symptome: d.motif.trim(), gravite: 'majeure', typeMaintenance: 'correctif', kilometrage: v.kilometrage }, { codeIndispo: d.code })
        return { ok: true }
      }
      case 'disponible': {
        const ind = indispoOuverte(v.id)
        if (ind?.ordreTravailId) return { ok: false, motif: `L'ordre de travail ${ind.ordreTravailId} est ouvert : il se clôt dans la maintenance.` }
        if (ind && ind.code === useReglesDocumentsStore().parametres.codeIndispoReglementaire) return { ok: false, motif: 'Un document obligatoire est expiré : régularisez-le dans les documents.' }
        if (ind?.auto === 'entretienDepasse' && !ind.ordreTravailId) return { ok: false, motif: `${ind.commentaire ? `Entretien dépassé (${ind.commentaire})` : 'Entretien dépassé'} : créez l'ordre de travail depuis les échéances.` }
        if (ind?.auto === 'inspectionNonConforme' && !ind.ordreTravailId) return { ok: false, motif: `${ind.commentaire ?? 'Inspection non conforme'} : la contre-visite se réalise dans les inspections périodiques.` }
        const dep = maintenance.echeancesDe(v).find(e => e.statut === 'depassee')
        if (!ind && dep) return { ok: false, motif: `Entretien dépassé (${dep.operationLibelle}) : créez l'ordre de travail depuis les échéances.` }
        if (!ind && !inspections.aptitude(v.id).apte) return { ok: false, motif: `${inspections.aptitude(v.id).motif} : la contre-visite se réalise dans les inspections périodiques.` }
        if (ind) maintenance.leverIndispo(ind.id)
        v.statutManuel = undefined
        const apres = calculer(v)
        if (apres.statut === 'immobilise') return { ok: true, motif: `Le véhicule reste immobilisé : ${apres.cause?.libelle}.` }
        if (apres.statut !== 'disponible') return { ok: true, motif: `Le véhicule reste ${apres.statut === 'en_mission' ? 'en mission' : 'affecté'} : cela vient d'un fait enregistré.` }
        return { ok: true }
      }
      default:
        return { ok: false, motif: statut === 'en_mission' ? 'Le statut « en mission » vient d’un voyage en cours.' : 'Le statut « affecté » vient d’une affectation ou d’un attelage.' }
    }
  }

  /* ── Immobilisations posées par le système (FMS-MA-07) ─────── */
  type CauseAuto = 'entretienDepasse' | 'inspectionNonConforme'
  /** Situation qui immobilise le véhicule sans ordre de travail : inspection
   *  non conforme en attente de contre-visite, sinon entretien dépassé. */
  function situationAuto(v: Vehicule): { auto: CauseAuto; commentaire: string; date?: string } | null {
    if (v.sortie) return null
    const apt = inspections.aptitude(v.id)
    if (!apt.apte) return { auto: 'inspectionNonConforme', commentaire: apt.motif!, date: apt.inspection?.date }
    const dep = maintenance.echeancesDe(v).find(e => e.statut === 'depassee')
    if (dep) return { auto: 'entretienDepasse', commentaire: dep.operationLibelle, date: dep.dateProchaine }
    return null
  }
  /** Ouvre l'indisponibilité codifiée quand la situation apparaît et la lève
   *  (date de fin) quand elle disparaît. Un véhicule n'a qu'une
   *  indisponibilité ouverte : si une autre l'est déjà, rien n'est créé.
   *  Rattachée à un ordre de travail, elle se referme à la clôture de l'ordre. */
  function appliquerImmobilisationsAuto() {
    vehicules.liste.forEach(v => {
      const s = situationAuto(v)
      let ouverte = indispoOuverte(v.id)
      if (ouverte?.auto && !ouverte.ordreTravailId && ouverte.auto !== s?.auto) {
        maintenance.leverIndispo(ouverte.id, { systeme: true }); ouverte = null
      }
      if (!s || ouverte) return
      const jour = s.date?.slice(0, 10)
      const debut = jour && jour < aujourdhuiISO() ? `${jour}T08:00` : maintenant().toISOString()
      const r = maintenance.declarerIndispo({ vehiculeId: v.id, vehiculePlaque: v.immatriculation, code: codification.codeAuto(s.auto), debut, commentaire: s.commentaire })
      if (r.ok) { const ind = maintenance.indisponibilites.find(i => i.id === r.id); if (ind) ind.auto = s.auto }
    })
  }
  watch(() => vehicules.liste.map(v => `${v.id}:${situationAuto(v)?.auto ?? ''}:${indispoOuverte(v.id)?.id ?? ''}`).join('|'),
    appliquerImmobilisationsAuto, { immediate: true })

  return { calculer, causeDe, statutAdministratif, choisir, resultats }
})
