import { defineStore } from 'pinia'
import { usePersonnelStore } from './personnel'
import { useAbsenceStore } from './absences'
import { useVoyagesStore } from './voyages'
import { useVehiculeStore } from './vehicules'
import { useDocumentsStore, LIBELLE_TYPE_DOC } from './documentsPersonnel'
import { useDocumentsVehiculeStore } from './documentsVehicule'
import { aujourdhuiISO } from '../utils/horloge'
import { useConfigurationStore } from './configuration'

/** Dépassement d'un temps de conduite ou de repos sur un voyage, avec la règle en cause. */
export type RegleTemps = 'tcc' | 'pause' | 'tcj' | 'ttj' | 'repos' | 'hebdo' | 'bihebdo' | 'trh'
export interface DepassementTemps { voyageId: string; reference: string; date: string; regle: RegleTemps; motif: string }

/**
 * Disponibilité des conducteurs (FMS-DB-12) et éligibilité à une
 * affectation (FMS-DB-09, DB-11). La disponibilité repose sur des
 * propriétés de la personne : statut saisi à la main (en congé, suspendu),
 * absences approuvées, missions en cours ou déjà planifiées dans le TMS.
 */
export type EtatDisponibilite = 'disponible' | 'en_conge' | 'en_mission' | 'mission_planifiee' | 'indisponible'
export const LIB_DISPONIBILITE: Record<EtatDisponibilite, { label: string; cls: string }> = {
  disponible: { label: 'Disponible', cls: 'bg-success-bg text-success' },
  en_conge: { label: 'En congé', cls: 'bg-info-bg text-info' },
  en_mission: { label: 'En mission', cls: 'bg-primary/10 text-primary' },
  mission_planifiee: { label: 'Mission planifiée', cls: 'bg-warning-bg text-warning' },
  indisponible: { label: 'Indisponible', cls: 'bg-danger-bg text-danger' },
}
const ENGAGE_PLANIFIE = ['planifie', 'confirme', 'pret']
/** Motif d'indisponibilité saisi à la main qui vaut congé. */
export const MOTIF_CONGE = 'Congé'
export const estMotifConge = (m: string) => m.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'conge'

export const useDisponibilitesStore = defineStore('disponibilites', () => {
  function disponibilite(personnelId: string, date = aujourdhuiISO()): { etat: EtatDisponibilite; detail?: string; vehiculeId?: string } {
    const p = usePersonnelStore().parId(personnelId)
    if (!p) return { etat: 'indisponible', detail: 'Personne introuvable' }
    const jour = date.slice(0, 10)
    if (p.statut === 'archive') return { etat: 'indisponible', detail: 'Sorti des effectifs' }
    if (p.statut === 'fin_contrat') return { etat: 'indisponible', detail: 'Fin de contrat' }
    if (p.statut === 'suspendu') return { etat: 'indisponible', detail: 'Suspendu' }
    if (p.statut === 'conge') return { etat: 'en_conge', detail: 'Statut en congé' }
    const manuelle = p.indisponibilitesManuelles?.find(x => x.du <= jour && x.au >= jour)
    if (manuelle) {
      const fin = `jusqu'au ${new Date(manuelle.au).toLocaleDateString('fr-FR')}`
      /* Un congé saisi à la main s'affiche « En congé ». */
      if (estMotifConge(manuelle.motif)) return { etat: 'en_conge', detail: `Congé ${fin}` }
      return { etat: 'indisponible', detail: `${manuelle.motif} ${fin}` }
    }
    const absence = useAbsenceStore().absencesLe(jour).find(a => a.personnelId === personnelId)
    if (absence) return { etat: 'en_conge', detail: `${absence.type} jusqu'au ${new Date(absence.fin).toLocaleDateString('fr-FR')}` }
    const voyages = useVoyagesStore().voyages.filter(v => v.chauffeurId === personnelId)
    const enCours = voyages.find(v => v.statut === 'en_cours')
    if (enCours) return { etat: 'en_mission', detail: `Voyage ${enCours.reference}`, vehiculeId: enCours.vehiculeId }
    /* Une mission planifiée n'engage le conducteur qu'à sa date. */
    const planifie = voyages.find(v => ENGAGE_PLANIFIE.includes(v.statut) && v.datePlanifiee?.slice(0, 10) === jour)
    if (planifie) return { etat: 'mission_planifiee', detail: `Ordre ${planifie.numeroOT || planifie.reference}`, vehiculeId: planifie.vehiculeId }
    return { etat: 'disponible' }
  }

  /**
   * Un conducteur n'est affecté à un tracteur que s'il est actif, habilité,
   * que ses pièces obligatoires et celles du véhicule sont en règle, et qu'il
   * n'est ni en congé ni engagé sur une mission avec un autre véhicule.
   */
  function eligibilite(personnelId: string, vehiculeId?: string, date = aujourdhuiISO()): { ok: boolean; motif?: string } {
    const p = usePersonnelStore().parId(personnelId)
    if (!p) return { ok: false, motif: 'Conducteur introuvable.' }
    const pers = usePersonnelStore()
    if (!p.conduit && !pers.estConducteur(p) && !pers.estAide(p)) return { ok: false, motif: `${p.nomComplet} n'est ni conducteur ni aide conducteur.` }
    if (!p.habilite) return { ok: false, motif: `${p.nomComplet} n'est pas habilité à conduire${p.motifRetraitHabilitation ? ` (${p.motifRetraitHabilitation})` : ''}.` }
    const docs = useDocumentsStore()
    if (!docs.enRegle(personnelId)) {
      const manquants = docs.piecesManquantes(personnelId).map(c => LIBELLE_TYPE_DOC[c] ?? c)
      return { ok: false, motif: `Une pièce obligatoire de ${p.nomComplet} est expirée ou manquante${manquants.length ? ` (${manquants.join(', ')})` : ''}.` }
    }
    const d = disponibilite(personnelId, date)
    if (d.etat === 'indisponible') return { ok: false, motif: `${p.nomComplet} est indisponible (${d.detail?.toLowerCase()}).` }
    if (d.etat === 'en_conge') return { ok: false, motif: `${p.nomComplet} est en congé (${d.detail}).` }
    if ((d.etat === 'en_mission' || d.etat === 'mission_planifiee') && vehiculeId && d.vehiculeId && d.vehiculeId !== vehiculeId)
      return { ok: false, motif: `${p.nomComplet} est engagé avec un autre véhicule (${d.detail}).` }
    if (vehiculeId) {
      const v = useVehiculeStore().parId(vehiculeId)
      if (!v) return { ok: false, motif: 'Véhicule introuvable.' }
      const dv = useDocumentsVehiculeStore()
      if (!dv.enRegle(vehiculeId)) return { ok: false, motif: `${v.immatriculation} n'est pas en règle (${dv.manquants(vehiculeId).map(x => x.libelle).join(', ')}).` }
    }
    return { ok: true }
  }
  /**
   * Dépassements des temps de conduite et de repos d'une personne (FMS-PA-04),
   * mesurés sur ses voyages réalisés face aux seuils de la configuration.
   * Faute de détail des temps de conduite, la durée d'un voyage tient lieu de
   * conduite : conduite continue, pause entre deux voyages, conduite et
   * travail de la journée, repos avant un départ, plafond sur sept jours,
   * plafond facultatif sur deux semaines et repos hebdomadaire. Un voyage sans heure d'arrivée n'est pas mesuré. Le
   * même calcul alimente la fiche du voyage et celle du conducteur.
   */
  function depassementsTemps(personnelId: string): DepassementTemps[] {
    const c = useConfigurationStore().parametres
    const h = (min: number) => `${Math.floor(min / 60)} h${min % 60 ? ` ${String(Math.round(min % 60)).padStart(2, '0')}` : ''}`
    const faits = useVoyagesStore().voyages
      .filter(v => v.chauffeurId === personnelId && v.dateDepartReel && v.dateArriveeReelle)
      .map(v => ({ v, debut: +new Date(v.dateDepartReel!), fin: +new Date(v.dateArriveeReelle!), jour: v.dateDepartReel!.slice(0, 10) }))
      .filter(x => x.fin > x.debut)
      .sort((a, b) => a.debut - b.debut)
    const out: DepassementTemps[] = []
    const JOUR = 86_400_000
    const MIN = 60_000
    faits.forEach((x, i) => {
      const base = { voyageId: x.v.id, reference: x.v.reference, date: x.v.dateDepartReel! }
      const duree = (x.fin - x.debut) / MIN
      const prec = faits[i - 1]
      // Conduite continue : le voyage ne porte aucune pause enregistrée.
      if (c.tccMaxMin > 0 && duree > c.tccMaxMin) out.push({ ...base, regle: 'tcc', motif: `Conduite continue de ${h(duree)}, au-delà de ${h(c.tccMaxMin)}` })
      // Pause obligatoire : deux voyages rapprochés qui, ensemble, dépassent la conduite continue.
      if (prec && c.pauseApresTccMin > 0 && c.tccMaxMin > 0) {
        const pause = (x.debut - prec.fin) / MIN
        const enchaine = (prec.fin - prec.debut) / MIN + duree
        if (pause >= 0 && pause < c.pauseApresTccMin && enchaine > c.tccMaxMin)
          out.push({ ...base, regle: 'pause', motif: `Pause de ${h(pause)} entre deux voyages, au moins ${h(c.pauseApresTccMin)} exigées après ${h(c.tccMaxMin)} de conduite` })
      }
      // Conduite et travail de la journée.
      const jour = faits.filter(y => y.jour === x.jour && y.debut <= x.debut).reduce((s, y) => s + (y.fin - y.debut) / MIN, 0)
      if (c.tcjMaxMin > 0 && jour > c.tcjMaxMin && jour - duree <= c.tcjMaxMin)
        out.push({ ...base, regle: 'tcj', motif: `${h(jour)} de conduite dans la journée, au-delà de ${h(c.tcjMaxMin)}` })
      if (c.ttjMaxMin > 0 && duree > c.ttjMaxMin) out.push({ ...base, regle: 'ttj', motif: `Voyage de ${h(duree)}, au-delà du travail journalier de ${h(c.ttjMaxMin)}` })
      // Repos avant un nouveau départ.
      if (prec && c.reposMinAvantDepartH > 0) {
        const repos = (x.debut - prec.fin) / 3_600_000
        if (repos >= 0 && repos < c.reposMinAvantDepartH) out.push({ ...base, regle: 'repos', motif: `Repos de ${h(repos * 60)} avant le départ, minimum ${c.reposMinAvantDepartH} h` })
      }
      // Plafond sur sept jours.
      const fenetre = faits.filter(y => y.debut <= x.debut && y.fin > x.debut - 7 * JOUR)
      const sept = fenetre.reduce((s, y) => s + (Math.min(y.fin, x.fin) - Math.max(y.debut, x.debut - 7 * JOUR)) / MIN, 0)
      if (c.plafondHebdoH > 0 && sept > c.plafondHebdoH * 60) out.push({ ...base, regle: 'hebdo', motif: `${h(sept)} de voyage sur sept jours, plafond ${c.plafondHebdoH} h` })
      // Plafond facultatif sur deux semaines : vide, il n'est pas contrôlé.
      const bihebdo = Number(c.plafondBihebdoH)
      if (c.plafondBihebdoH != null && (c.plafondBihebdoH as unknown) !== '' && bihebdo > 0) {
        const quatorze = faits.filter(y => y.debut <= x.debut && y.fin > x.debut - 14 * JOUR)
          .reduce((s, y) => s + (Math.min(y.fin, x.fin) - Math.max(y.debut, x.debut - 14 * JOUR)) / MIN, 0)
        if (quatorze > bihebdo * 60) out.push({ ...base, regle: 'bihebdo', motif: `${h(quatorze)} de voyage sur deux semaines, plafond ${bihebdo} h` })
      }
      // Repos hebdomadaire : le plus long repos des sept jours qui précèdent le départ.
      if (c.trhMinH > 0) {
        let repere = x.debut - 7 * JOUR
        let plusLong = 0
        fenetre.forEach(y => { plusLong = Math.max(plusLong, y.debut - repere); repere = Math.max(repere, y.fin) })
        if (plusLong < c.trhMinH * 3_600_000)
          out.push({ ...base, regle: 'trh', motif: `Aucun repos de ${c.trhMinH} h sur les sept jours précédant le départ (le plus long : ${h(plusLong / MIN)})` })
      }
    })
    return out.reverse()
  }

  return { disponibilite, eligibilite, depassementsTemps }
})
