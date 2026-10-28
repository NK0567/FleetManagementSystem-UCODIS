import { defineStore } from 'pinia'
import { useVehiculeStore } from './vehicules'
import { useMaintenanceStore } from './maintenance'
import { useCarburantStore } from './carburant'
import { useVoyagesStore } from './voyages'
import { useInfractionsStore } from './infractions'
import { useEcartsStore } from './ecarts'
import { usePneusStore } from './pneus'
import { aujourdhuiISO } from '../utils/horloge'
import type { Vehicule } from '../types'

/**
 * Indicateurs du reporting (FMS-RA), calculés à partir des autres sous-modules,
 * jamais ressaisis. Une période est un intervalle de dates ISO inclusives ; un
 * site filtre les véhicules sur leur site de rattachement.
 */
export interface Periode { du: string; au: string }
export interface Perimetre { periode: Periode; site: string }

const JOUR = 86_400_000
export const dansPeriode = (date: string | undefined, p: Periode) => !!date && date.slice(0, 10) >= p.du && date.slice(0, 10) <= p.au
export const joursDe = (p: Periode) => Math.max(1, Math.round((+new Date(p.au) - +new Date(p.du)) / JOUR) + 1)
/** Période de même durée juste avant celle donnée. */
export function periodePrecedente(p: Periode): Periode {
  const n = joursDe(p)
  const au = new Date(+new Date(p.du) - JOUR).toISOString().slice(0, 10)
  const du = new Date(+new Date(au) - (n - 1) * JOUR).toISOString().slice(0, 10)
  return { du, au }
}
/** Trente derniers jours jusqu'à la date du jour de l'application. */
export function periodeParDefaut(): Periode {
  const au = aujourdhuiISO()
  return { du: new Date(+new Date(au) - 29 * JOUR).toISOString().slice(0, 10), au }
}
export const libellePeriode = (p: Periode) =>
  `du ${new Date(p.du).toLocaleDateString('fr-FR')} au ${new Date(p.au).toLocaleDateString('fr-FR')}`

export const useReportingStore = defineStore('reporting', () => {
  const vehicules = useVehiculeStore()

  /** Âge en années depuis la mise en circulation, à la date donnée. */
  function age(v: Vehicule, date = aujourdhuiISO()): number | null {
    const mec = v.dateMiseEnCirculation ?? (v.annee ? `${v.annee}-07-01` : undefined)
    return mec ? (+new Date(date) - +new Date(mec)) / (365.25 * JOUR) : null
  }
  function ageMoyen(liste: Vehicule[]): number | null {
    const ages = liste.map(v => age(v)).filter((a): a is number => a != null && a >= 0)
    return ages.length ? Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10 : null
  }

  const vehiculesDuSite = (site: string) => vehicules.auParc.filter(v => !site || v.site === site)
  const sitesDuParc = () => [...new Set(vehicules.auParc.map(v => v.site).filter(Boolean))].sort()

  /** Disponibilité instantanée du parc (FMS-RA-01). */
  function etatDuParc(site = '') {
    const liste = vehiculesDuSite(site)
    return {
      total: liste.length,
      disponibles: liste.filter(v => v.statut === 'disponible' || v.statut === 'affecte').length,
      enMission: liste.filter(v => v.statut === 'en_mission').length,
      immobilises: liste.filter(v => v.statut === 'en_maintenance' || v.statut === 'immobilise' || v.statut === 'hors_service'),
      ageMoyen: ageMoyen(liste),
    }
  }

  /** Indicateurs de synthèse sur un périmètre (FMS-RA-06). */
  function synthese(pr: Perimetre) {
    const m = useMaintenanceStore(); const c = useCarburantStore(); const vo = useVoyagesStore()
    const liste = vehiculesDuSite(pr.site)
    const ids = new Set(liste.map(v => v.id)); const plaques = new Set(liste.map(v => v.immatriculation))
    const n = joursDe(pr.periode)
    const fin = +new Date(pr.periode.au) + JOUR - 1
    const voyages = vo.voyages.filter(v => v.vehiculeId && ids.has(v.vehiculeId) && dansPeriode(v.dateDepartReel, pr.periode))
    const pleins = c.recharges.filter(r => plaques.has(r.vehiculePlaque) && dansPeriode(r.date, pr.periode))
    const ordres = m.ordres.filter(o => ids.has(o.vehiculeId) && o.statut !== 'annule' && dansPeriode(o.declareLe, pr.periode))
    const preventifs = ordres.filter(o => o.typeMaintenance === 'preventif').length
    const km = voyages.reduce((s, v) => s + (v.kmArrivee != null && v.kmDepart != null ? Math.max(0, v.kmArrivee - v.kmDepart) : v.kmReference ?? 0), 0)
    const litres = pleins.reduce((s, r) => s + r.litres, 0)
    /* Consommation selon la méthode plein-à-plein : intervalles entre deux pleins complets terminés dans la période. */
    const conso = c.periodesConso.filter(x => ids.has(x.vehiculeId) && dansPeriode(x.au, pr.periode)).reduce((acc, x) => ({ litres: acc.litres + x.litres, km: acc.km + x.km }), { litres: 0, km: 0 })
    const ecarts = useEcartsStore().ecarts.filter(e => e.nature === 'non_justifiee' && liste.some(v => v.immatriculation === e.vehiculePlaque) && dansPeriode(e.detecteLe, pr.periode)).length
    const infractions = useInfractionsStore().infractions.filter(i => i.vehiculeId && ids.has(i.vehiculeId) && dansPeriode(i.date, pr.periode)).length
    return {
      vehicules: liste.length,
      tauxDisponibilite: m.tauxDisponibilite(liste.length, n, fin, ids),
      joursImmobilisation: Math.round(m.joursPerdusSurPeriode(n, fin, ids)),
      voyages: voyages.length,
      km,
      litres,
      depenseCarburant: pleins.reduce((s, r) => s + r.montant, 0),
      consommation: conso.km > 0 ? Math.round((conso.litres / conso.km) * 1000) / 10 : null,
      interventions: ordres.length,
      partPreventive: ordres.length ? Math.round((preventifs / ordres.length) * 100) : null,
      coutMaintenance: ordres.reduce((s, o) => s + m.coutOT(o), 0),
      ecartsNonJustifies: ecarts,
      infractions,
      ageMoyen: ageMoyen(liste),
    }
  }

  /** Pneus par marque ou par fournisseur (FMS-RA-04) : coût au kilomètre et durée de vie des pneus retirés. */
  function comparaisonPneus(cle: 'marque' | 'fournisseur') {
    const p = usePneusStore()
    const acc = new Map<string, { nom: string; nb: number; cout: number; km: number; retires: number; kmRetires: number }>()
    p.pneus.forEach(x => {
      const nom = (x[cle] ?? '').trim() || 'Non renseigné'
      const e = acc.get(nom) ?? { nom, nb: 0, cout: 0, km: 0, retires: 0, kmRetires: 0 }
      const km = p.kmParcourus(x)
      e.nb += 1; e.cout += p.coutTotal(x); e.km += km
      if (x.statut === 'rebut') { e.retires += 1; e.kmRetires += km }
      acc.set(nom, e)
    })
    return [...acc.values()].map(e => ({
      ...e,
      coutKm: e.km ? Math.round((e.cout / e.km) * 10) / 10 : null,
      dureeVieKm: e.retires ? Math.round(e.kmRetires / e.retires) : null,
    })).sort((a, b) => (a.coutKm ?? Infinity) - (b.coutKm ?? Infinity))
  }

  return { age, ageMoyen, vehiculesDuSite, sitesDuParc, etatDuParc, synthese, comparaisonPneus }
})
